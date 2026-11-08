import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AiSessionsService } from './ai-sessions.service';
import { ChatSession } from './schemas/chat-session.schema';

describe('AiSessionsService', () => {
  let service: AiSessionsService;
  let mockChatSessionModel: any;

  const userId = new Types.ObjectId().toString();
  const sessionId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockChatSessionModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: new Types.ObjectId(),
      save: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        title: dto.title || 'New Chat',
        userId: dto.userId,
        messages: dto.messages || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    }));

    mockChatSessionModel.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              {
                _id: new Types.ObjectId(sessionId),
                title: 'Sprint Planning',
                messages: [{ role: 'user', content: 'test' }],
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      }),
    });

    mockChatSessionModel.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(sessionId),
        userId: new Types.ObjectId(userId),
        title: 'Sprint Planning',
        messages: [],
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(sessionId),
          userId: new Types.ObjectId(userId),
          title: 'Sprint Planning',
          messages: [],
        }),
      }),
    });

    mockChatSessionModel.deleteOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSessionsService,
        {
          provide: getModelToken(ChatSession.name),
          useValue: mockChatSessionModel,
        },
      ],
    }).compile();

    service = module.get<AiSessionsService>(AiSessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllByUser', () => {
    it('should return sanitized sessions list', async () => {
      const result = await service.findAllByUser(userId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(sessionId);
      expect(result[0].title).toBe('Sprint Planning');
      expect(result[0].messagesCount).toBe(1);
    });
  });

  describe('createSession', () => {
    it('should create and return a new chat session', async () => {
      const result = await service.createSession(userId, 'Custom Title');
      expect(result.title).toBe('Custom Title');
      expect(result.messagesCount).toBe(0);
    });
  });

  describe('getSession', () => {
    it('should throw NotFoundException for invalid id format', async () => {
      await expect(service.getSession('invalid-id', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not own session', async () => {
      mockChatSessionModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(sessionId),
          userId: new Types.ObjectId(), // different user
        }),
      });

      await expect(service.getSession(sessionId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deleteSession', () => {
    it('should delete session if user owns it', async () => {
      const result = await service.deleteSession(sessionId, userId);
      expect(result.success).toBe(true);
      expect(result.id).toBe(sessionId);
    });
  });
});
