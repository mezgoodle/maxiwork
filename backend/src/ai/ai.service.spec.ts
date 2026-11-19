import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { AiService } from './ai.service';
import { McpToolsRegistryService } from '../mcp/mcp-tools-registry.service';
import { AiSessionsService } from './ai-sessions.service';
import { ImproveDescriptionAction } from './dto/ai.dto';

describe('AiService', () => {
  let service: AiService;
  let mockMcpToolsRegistry: any;
  let mockAiSessionsService: any;
  let mockConfigService: any;

  const userId = new Types.ObjectId().toString();
  const sessionId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') return '';
        if (key === 'GEMINI_MODEL') return 'gemini-3.8-flash';
        return null;
      }),
    };

    mockMcpToolsRegistry = {
      listTools: jest.fn().mockReturnValue([
        {
          name: 'create_task',
          description: 'Create a task',
          inputSchema: { type: 'object', properties: {} },
        },
      ]),
      executeTool: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"taskKey":"GEN-1"}' }],
      }),
    };

    mockAiSessionsService = {
      getSession: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(sessionId),
        title: 'New Chat',
        messages: [],
      }),
      createSession: jest.fn().mockResolvedValue({
        id: sessionId,
        title: 'New Chat',
      }),
      appendTurn: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: McpToolsRegistryService,
          useValue: mockMcpToolsRegistry,
        },
        { provide: AiSessionsService, useValue: mockAiSessionsService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('streamChat in fallback mode', () => {
    it('should stream tokens and emit session and done events', async () => {
      const events: any[] = [];
      const sendEvent = (payload: any) => events.push(payload);

      await service.streamChat(
        userId,
        { message: 'Hello MaxiWork' },
        sendEvent,
      );

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].event).toBe('session');
      expect(events[0].data.sessionId).toBe(sessionId);
      expect(events.some((e) => e.event === 'token')).toBe(true);
      expect(events[events.length - 1].event).toBe('done');
      expect(mockAiSessionsService.appendTurn).toHaveBeenCalled();
    });
  });

  describe('suggestSubtasks', () => {
    it('should return fallback subtasks when api key is not set', async () => {
      const result = await service.suggestSubtasks(userId, {
        title: 'Build login page',
      });
      expect(result.subtasks.length).toBeGreaterThanOrEqual(1);
      expect(result.subtasks[0].title).toContain('Build login page');
    });
  });

  describe('improveDescription', () => {
    it('should return improved description for Polish action', async () => {
      const result = await service.improveDescription(userId, {
        title: 'Auth Bug',
        description: 'Login fails on mobile',
        action: ImproveDescriptionAction.POLISH,
      });
      expect(result.description).toBeDefined();
    });

    it('should append Acceptance Criteria section for ACCEPTANCE_CRITERIA action', async () => {
      const result = await service.improveDescription(userId, {
        title: 'User Profile',
        description: 'Profile editing',
        action: ImproveDescriptionAction.ACCEPTANCE_CRITERIA,
      });
      expect(result.description).toContain('### Acceptance Criteria');
    });
  });
});
