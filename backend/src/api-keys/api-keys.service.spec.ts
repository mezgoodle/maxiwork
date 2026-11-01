import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { API_KEY_PREFIX, ApiKeysService } from './api-keys.service';
import { ApiKey } from './schemas/api-key.schema';

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  const userId = new Types.ObjectId().toString();
  const keyId = new Types.ObjectId().toString();

  const mockSave = jest.fn();
  const mockFind = jest.fn();
  const mockFindOne = jest.fn();
  const mockFindOneAndDelete = jest.fn();
  const mockUpdateOne = jest.fn();

  class MockApiKeyModel {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    name: string;
    keyHash: string;
    keyPrefix: string;
    lastUsedAt: Date | null;
    expiresAt: Date | null;
    revoked: boolean;
    createdAt: Date;
    updatedAt: Date;

    constructor(data: Record<string, unknown>) {
      this._id = new Types.ObjectId(keyId);
      this.userId = data.userId as Types.ObjectId;
      this.name = data.name as string;
      this.keyHash = data.keyHash as string;
      this.keyPrefix = data.keyPrefix as string;
      this.lastUsedAt = (data.lastUsedAt as Date | null) ?? null;
      this.expiresAt = (data.expiresAt as Date | null) ?? null;
      this.revoked = Boolean(data.revoked);
      this.createdAt = new Date();
      this.updatedAt = new Date();
    }

    save = mockSave;
    static find = mockFind;
    static findOne = mockFindOne;
    static findOneAndDelete = mockFindOneAndDelete;
    static updateOne = mockUpdateOne;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        {
          provide: getModelToken(ApiKey.name),
          useValue: MockApiKeyModel,
        },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
  });

  describe('createKey', () => {
    it('generates a secure mxw_live_ key, stores SHA256 hash, and returns secret once', async () => {
      mockSave.mockImplementation(function (this: MockApiKeyModel) {
        return Promise.resolve(this);
      });

      const result = await service.createKey(userId, {
        name: 'Cursor MCP Key',
      });

      expect(result.secret).toMatch(/^mxw_live_[a-f0-9]{32}$/);
      expect(result.name).toBe('Cursor MCP Key');
      expect(result.userId).toBe(userId);
      expect(result.keyPrefix).toBe(`${result.secret.substring(0, 16)}...`);
      expect(result.revoked).toBe(false);
      expect(
        (result as unknown as Record<string, unknown>).keyHash,
      ).toBeUndefined();
    });

    it('rejects past expiration dates', async () => {
      const pastDate = new Date(Date.now() - 60_000).toISOString();

      await expect(
        service.createKey(userId, {
          name: 'Expired Key',
          expiresAt: pastDate,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllByUser', () => {
    it('returns sanitized API keys sorted by createdAt descending', async () => {
      const storedDoc = {
        _id: new Types.ObjectId(keyId),
        userId: new Types.ObjectId(userId),
        name: 'Claude Desktop',
        keyHash: 'secret-hash',
        keyPrefix: 'mxw_live_1234567...',
        lastUsedAt: null,
        expiresAt: null,
        revoked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([storedDoc]),
          }),
        }),
      });

      const list = await service.findAllByUser(userId);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(keyId);
      expect(list[0].name).toBe('Claude Desktop');
      expect(
        (list[0] as unknown as Record<string, unknown>).keyHash,
      ).toBeUndefined();
    });
  });

  describe('removeKey', () => {
    it('deletes an owned API key and returns confirmation', async () => {
      mockFindOneAndDelete.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: new Types.ObjectId(keyId),
          }),
        }),
      });

      const res = await service.removeKey(userId, keyId);
      expect(res).toEqual({
        id: keyId,
        message: 'API key deleted successfully',
      });
    });

    it('throws NotFoundException when key does not exist or belongs to another user', async () => {
      mockFindOneAndDelete.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.removeKey(userId, keyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateRawKey', () => {
    const rawKey = `${API_KEY_PREFIX}${'a'.repeat(32)}`;

    it('validates a valid active key and updates lastUsedAt when missing or older than 60s', async () => {
      const expectedHash = service.hashKey(rawKey);
      mockFindOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(keyId),
          userId: new Types.ObjectId(userId),
          keyHash: expectedHash,
          revoked: false,
          expiresAt: null,
          lastUsedAt: null,
        }),
      });
      mockUpdateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      const principal = await service.validateRawKey(rawKey);
      expect(principal).toEqual({ userId, apiKeyId: keyId });
      expect(mockFindOne).toHaveBeenCalledWith({ keyHash: expectedHash });
      expect(mockUpdateOne).toHaveBeenCalled();
    });

    it('throttles lastUsedAt DB writes when lastUsedAt was updated within 60 seconds', async () => {
      const expectedHash = service.hashKey(rawKey);
      mockFindOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(keyId),
          userId: new Types.ObjectId(userId),
          keyHash: expectedHash,
          revoked: false,
          expiresAt: null,
          lastUsedAt: new Date(Date.now() - 10_000),
        }),
      });

      const principal = await service.validateRawKey(rawKey);
      expect(principal).toEqual({ userId, apiKeyId: keyId });
      expect(mockUpdateOne).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException for invalid prefix', async () => {
      await expect(service.validateRawKey('invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when key is revoked', async () => {
      mockFindOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(keyId),
          userId: new Types.ObjectId(userId),
          revoked: true,
          expiresAt: null,
        }),
      });

      await expect(service.validateRawKey(rawKey)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when key is expired', async () => {
      mockFindOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(keyId),
          userId: new Types.ObjectId(userId),
          revoked: false,
          expiresAt: new Date(Date.now() - 10_000),
        }),
      });

      await expect(service.validateRawKey(rawKey)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
