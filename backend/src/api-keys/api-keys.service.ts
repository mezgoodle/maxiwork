import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKey, ApiKeyDocument } from './schemas/api-key.schema';

export const API_KEY_PREFIX = 'mxw_live_';

export interface SanitizedApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revoked: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreatedApiKeyResult extends SanitizedApiKey {
  secret: string;
}

export interface ValidatedApiKeyPrincipal {
  userId: string;
  apiKeyId: string;
}

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectModel(ApiKey.name)
    private readonly apiKeyModel: Model<ApiKeyDocument>,
  ) {}

  hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  private sanitize(
    doc: ApiKeyDocument | (ApiKey & { _id: Types.ObjectId }),
  ): SanitizedApiKey {
    return {
      id: String(doc._id),
      userId: String(doc.userId),
      name: doc.name,
      keyPrefix: doc.keyPrefix,
      lastUsedAt: doc.lastUsedAt ?? null,
      expiresAt: doc.expiresAt ?? null,
      revoked: Boolean(doc.revoked),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async createKey(
    userId: string,
    dto: CreateApiKeyDto,
  ): Promise<CreatedApiKeyResult> {
    let expiresAt: Date | null = null;
    if (dto.expiresAt) {
      const parsedDate = new Date(dto.expiresAt);
      if (isNaN(parsedDate.getTime()) || parsedDate.getTime() <= Date.now()) {
        throw new BadRequestException('Expiration date must be in the future');
      }
      expiresAt = parsedDate;
    }

    const randomPart = randomBytes(16).toString('hex');
    const rawKey = `${API_KEY_PREFIX}${randomPart}`;
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = `${rawKey.substring(0, 16)}...`;

    const created = new this.apiKeyModel({
      userId: new Types.ObjectId(userId),
      name: dto.name.trim(),
      keyHash,
      keyPrefix,
      lastUsedAt: null,
      expiresAt,
      revoked: false,
    });

    const saved = await created.save();

    return {
      ...this.sanitize(saved),
      secret: rawKey,
    };
  }

  async findAllByUser(userId: string): Promise<SanitizedApiKey[]> {
    const keys = await this.apiKeyModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return keys.map((k) =>
      this.sanitize(k as unknown as ApiKey & { _id: Types.ObjectId }),
    );
  }

  async removeKey(
    userId: string,
    keyId: string,
  ): Promise<{ id: string; message: string }> {
    const deleted = await this.apiKeyModel
      .findOneAndDelete({
        _id: new Types.ObjectId(keyId),
        userId: new Types.ObjectId(userId),
      })
      .lean()
      .exec();

    if (!deleted) {
      throw new NotFoundException('API key not found');
    }

    return {
      id: String(deleted._id),
      message: 'API key deleted successfully',
    };
  }

  async validateRawKey(rawKey: string): Promise<ValidatedApiKeyPrincipal> {
    const trimmed = rawKey?.trim() || '';
    if (!trimmed.startsWith(API_KEY_PREFIX)) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const keyHash = this.hashKey(trimmed);
    const keyDoc = await this.apiKeyModel.findOne({ keyHash }).exec();

    if (!keyDoc) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (keyDoc.revoked) {
      throw new UnauthorizedException('API key has been revoked');
    }

    if (
      keyDoc.expiresAt &&
      new Date(keyDoc.expiresAt).getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('API key has expired');
    }

    const now = new Date();
    keyDoc.lastUsedAt = now;
    await this.apiKeyModel
      .updateOne({ _id: keyDoc._id }, { $set: { lastUsedAt: now } })
      .exec();

    return {
      userId: String(keyDoc.userId),
      apiKeyId: String(keyDoc._id),
    };
  }
}
