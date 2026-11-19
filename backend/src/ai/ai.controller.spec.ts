import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { Types } from 'mongoose';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiSessionsService } from './ai-sessions.service';
import { ImproveDescriptionAction } from './dto/ai.dto';

describe('AiController', () => {
  let controller: AiController;
  let mockAiService: any;
  let mockAiSessionsService: any;

  const mockUser = {
    _id: new Types.ObjectId(),
    email: 'test@example.com',
  };

  beforeEach(async () => {
    mockAiService = {
      streamChat: jest.fn().mockImplementation((_userId, _dto, sendEvent) => {
        sendEvent({ event: 'session', data: { sessionId: 's1' } });
        sendEvent({ event: 'token', data: { text: 'Hello' } });
        sendEvent({ event: 'done', data: { sessionId: 's1', mutated: false } });
      }),
      suggestSubtasks: jest.fn().mockResolvedValue({
        subtasks: [{ title: 'Subtask 1', priority: 'medium' }],
      }),
      improveDescription: jest.fn().mockResolvedValue({
        description: 'Improved text',
      }),
    };

    mockAiSessionsService = {
      findAllByUser: jest
        .fn()
        .mockResolvedValue([
          { id: 's1', title: 'Session 1', messagesCount: 0 },
        ]),
      createSession: jest.fn().mockResolvedValue({
        id: 's1',
        title: 'New Session',
        messagesCount: 0,
      }),
      getSessionMessages: jest.fn().mockResolvedValue([]),
      deleteSession: jest.fn().mockResolvedValue({ success: true, id: 's1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        { provide: AiService, useValue: mockAiService },
        { provide: AiSessionsService, useValue: mockAiSessionsService },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAllSessions', () => {
    it('should call aiSessionsService.findAllByUser', async () => {
      const res = await controller.findAllSessions(mockUser);
      expect(res).toHaveLength(1);
      expect(mockAiSessionsService.findAllByUser).toHaveBeenCalledWith(
        String(mockUser._id),
      );
    });
  });

  describe('createSession', () => {
    it('should call aiSessionsService.createSession', async () => {
      const res = await controller.createSession(mockUser, {
        title: 'New Chat',
      });
      expect(res.id).toBe('s1');
      expect(mockAiSessionsService.createSession).toHaveBeenCalledWith(
        String(mockUser._id),
        'New Chat',
      );
    });
  });

  describe('deleteSession', () => {
    it('should call aiSessionsService.deleteSession', async () => {
      const res = await controller.deleteSession('s1', mockUser);
      expect(res.success).toBe(true);
      expect(mockAiSessionsService.deleteSession).toHaveBeenCalledWith(
        's1',
        String(mockUser._id),
      );
    });
  });

  describe('suggestSubtasks', () => {
    it('should call aiService.suggestSubtasks', async () => {
      const res = await controller.suggestSubtasks(mockUser, {
        title: 'Task A',
      });
      expect(res.subtasks).toHaveLength(1);
      expect(mockAiService.suggestSubtasks).toHaveBeenCalledWith(
        String(mockUser._id),
        { title: 'Task A' },
      );
    });
  });

  describe('improveDescription', () => {
    it('should call aiService.improveDescription', async () => {
      const res = await controller.improveDescription(mockUser, {
        title: 'Task A',
        action: ImproveDescriptionAction.POLISH,
      });
      expect(res.description).toBe('Improved text');
    });
  });

  describe('streamChat', () => {
    it('should set headers and stream events to response', async () => {
      const setHeaderSpy = jest.fn();
      const flushHeadersSpy = jest.fn();
      const writeSpy = jest.fn();
      const endSpy = jest.fn();

      const mockRes = {
        setHeader: (name: string, value: string) => setHeaderSpy(name, value),
        flushHeaders: () => flushHeadersSpy(),
        write: (chunk: string) => writeSpy(chunk),
        end: () => endSpy(),
      } as unknown as Response;

      await controller.streamChat(mockUser, { message: 'Hello' }, mockRes);

      expect(setHeaderSpy).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream',
      );
      expect(writeSpy).toHaveBeenCalled();
      expect(endSpy).toHaveBeenCalled();
    });
  });
});
