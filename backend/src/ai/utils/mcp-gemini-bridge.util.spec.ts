import {
  buildSlidingWindowHistory,
  convertMcpToolToGeminiFunction,
  isMutatingMcpTool,
  summarizeToolExecution,
} from './mcp-gemini-bridge.util';
import { ChatMessage } from '../schemas/chat-session.schema';

describe('mcp-gemini-bridge.util', () => {
  describe('convertMcpToolToGeminiFunction', () => {
    it('should correctly map MCP tool definition to Gemini function declaration', () => {
      const tool = {
        name: 'create_task',
        description: 'Creates a task',
        inputSchema: {
          type: 'object' as const,
          properties: {
            title: { type: 'string' as const, description: 'Task title' },
            priority: {
              type: 'string' as const,
              enum: ['low', 'medium', 'high'],
            },
          },
          required: ['title'],
        },
      };

      const result = convertMcpToolToGeminiFunction(tool);
      expect(result.type).toBe('function');
      expect(result.name).toBe('create_task');
      expect(result.description).toBe('Creates a task');
      expect(result.parameters.properties.title).toEqual({
        type: 'string',
        description: 'Task title',
      });
      expect(result.parameters.required).toEqual(['title']);
    });
  });

  describe('isMutatingMcpTool', () => {
    it('should identify mutating and non-mutating tools', () => {
      expect(isMutatingMcpTool('create_task')).toBe(true);
      expect(isMutatingMcpTool('delete_task')).toBe(true);
      expect(isMutatingMcpTool('update_task')).toBe(true);
      expect(isMutatingMcpTool('set_task_status')).toBe(true);
      expect(isMutatingMcpTool('search_tasks')).toBe(false);
      expect(isMutatingMcpTool('get_task')).toBe(false);
    });
  });

  describe('summarizeToolExecution', () => {
    it('should summarize create_task with key and title', () => {
      const summary = summarizeToolExecution(
        'create_task',
        { title: 'My Task' },
        JSON.stringify({ taskKey: 'GEN-5', title: 'My Task' }),
      );
      expect(summary).toBe('Created task GEN-5: My Task');
    });

    it('should summarize search_tasks count', () => {
      const summary = summarizeToolExecution(
        'search_tasks',
        {},
        JSON.stringify({ total: 3 }),
      );
      expect(summary).toBe('Found 3 tasks');
    });

    it('should handle invalid json gracefully', () => {
      const summary = summarizeToolExecution('some_tool', {}, 'not json');
      expect(summary).toBe('Executed some_tool');
    });
  });

  describe('buildSlidingWindowHistory', () => {
    it('should take at most windowSize messages and format them as steps', () => {
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: 'Hello 1',
          toolCalls: [],
          timestamp: new Date(),
        },
        {
          role: 'model',
          content: 'Hi 1',
          toolCalls: [],
          timestamp: new Date(),
        },
        {
          role: 'user',
          content: 'Hello 2',
          toolCalls: [],
          timestamp: new Date(),
        },
        {
          role: 'model',
          content: 'Hi 2',
          toolCalls: [],
          timestamp: new Date(),
        },
      ];

      const steps = buildSlidingWindowHistory(messages, 2);
      expect(steps.length).toBe(2);
      expect(steps[0].type).toBe('user_input');
      expect(steps[0].content?.[0].text).toBe('Hello 2');
      expect(steps[1].type).toBe('model_output');
      expect(steps[1].content?.[0].text).toBe('Hi 2');
    });
  });
});
