import { Test, TestingModule } from '@nestjs/testing';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Request, Response } from 'express';
import { McpToolsRegistryService } from './mcp-tools-registry.service';
import { McpService } from './mcp.service';

jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: {
    EVERY_5_MINUTES: '0 */5 * * * *',
  },
}));

describe('McpToolsRegistryService & McpService', () => {
  let registry: McpToolsRegistryService;
  let mcpService: McpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [McpToolsRegistryService, McpService],
    }).compile();

    registry = module.get<McpToolsRegistryService>(McpToolsRegistryService);
    mcpService = module.get<McpService>(McpService);
  });

  afterEach(async () => {
    await mcpService.onModuleDestroy();
  });

  describe('McpToolsRegistryService', () => {
    it('registers, lists with annotations, validates required fields and property types, and executes tools', async () => {
      registry.registerTool({
        name: 'echo_task',
        description: 'Echoes a task title for the user',
        annotations: {
          readOnlyHint: true,
        },
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            limit: { type: 'number' },
          },
          required: ['title'],
        },
        handler: (args, userId) =>
          Promise.resolve({
            content: [
              {
                type: 'text',
                text: `User ${userId}: ${String(args.title)}`,
              },
            ],
          }),
      });

      expect(registry.hasTool('echo_task')).toBe(true);
      expect(registry.listTools()).toEqual([
        {
          name: 'echo_task',
          description: 'Echoes a task title for the user',
          annotations: {
            readOnlyHint: true,
          },
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              limit: { type: 'number' },
            },
            required: ['title'],
          },
        },
      ]);

      const missingRes = await registry.executeTool('echo_task', {}, 'u-1');
      expect(missingRes.isError).toBe(true);
      expect(missingRes.content[0].text).toContain(
        "Missing required parameter 'title'",
      );

      const badTypeRes = await registry.executeTool(
        'echo_task',
        { title: 'Valid', limit: 'not-a-number' },
        'u-1',
      );
      expect(badTypeRes.isError).toBe(true);
      expect(badTypeRes.content[0].text).toContain(
        "Parameter 'limit' must be of type number",
      );

      const okRes = await registry.executeTool(
        'echo_task',
        { title: 'Ship MCP', limit: 5 },
        'u-1',
      );
      expect(okRes.isError).toBeUndefined();
      expect(okRes.content[0].text).toBe('User u-1: Ship MCP');
    });

    it('returns an MCP error result when calling an unknown tool or throwing handler', async () => {
      const unknownRes = await registry.executeTool(
        'non_existent',
        {},
        'user-1',
      );
      expect(unknownRes.isError).toBe(true);
      expect(unknownRes.content[0].text).toContain('not registered');

      registry.registerTool({
        name: 'failing_tool',
        description: 'Throws error',
        inputSchema: { type: 'object', properties: {} },
        handler: () => Promise.reject(new Error('Database timeout')),
      });

      const errRes = await registry.executeTool('failing_tool', {}, 'user-1');
      expect(errRes.isError).toBe(true);
      expect(errRes.content[0].text).toContain('Database timeout');
    });
  });

  describe('McpService protocol handshake & tool execution', () => {
    it('handles initialize, ping, tools/list, and tools/call over MCP protocol', async () => {
      registry.registerTool({
        name: 'whoami',
        description: 'Returns authenticated userId',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: (_args, userId) =>
          Promise.resolve({
            content: [{ type: 'text', text: `Authenticated as ${userId}` }],
          }),
      });

      const server = mcpService.createMcpServerForUser('user-42');
      const client = new Client({
        name: 'test-mcp-client',
        version: '1.0.0',
      });

      const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();

      await Promise.all([
        server.connect(serverTransport),
        client.connect(clientTransport),
      ]);

      const pingRes = await client.ping();
      expect(pingRes).toBeDefined();

      const toolsList = await client.listTools();
      expect(toolsList.tools).toHaveLength(1);
      expect(toolsList.tools[0].name).toBe('whoami');

      const callRes = await client.callTool({
        name: 'whoami',
        arguments: {},
      });
      expect(callRes.content).toEqual([
        { type: 'text', text: 'Authenticated as user-42' },
      ]);

      await client.close();
      await server.close();
    });

    it('returns 404 for unknown sessionId on POST, GET, and DELETE', async () => {
      const statusMock = jest.fn().mockReturnThis();
      const jsonMock = jest.fn().mockReturnThis();
      const res = {
        status: statusMock,
        json: jsonMock,
      } as unknown as Response;

      await mcpService.handlePost(
        'u-1',
        { headers: {} } as unknown as Request,
        res,
        { jsonrpc: '2.0', method: 'ping', id: 1 },
        'missing-sse-session',
      );
      expect(statusMock).toHaveBeenCalledWith(404);

      statusMock.mockClear();
      await mcpService.handleGet(
        'u-1',
        {
          headers: { 'mcp-session-id': 'missing-streamable-session' },
        } as unknown as Request,
        res,
      );
      expect(statusMock).toHaveBeenCalledWith(404);

      statusMock.mockClear();
      await mcpService.handleDelete(
        'u-1',
        {
          headers: { 'mcp-session-id': 'missing-streamable-session' },
        } as unknown as Request,
        res,
      );
      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('expires idle sessions via cleanupExpiredSessions', async () => {
      const closeSpy = jest.fn().mockResolvedValue(undefined);
      const internalStreamable = (
        mcpService as unknown as {
          streamableSessions: Map<string, Record<string, unknown>>;
        }
      ).streamableSessions;

      internalStreamable.set('idle-1', {
        sessionId: 'idle-1',
        userId: 'u-1',
        transport: { close: closeSpy },
        server: {},
        createdAt: new Date(Date.now() - 60_000),
        lastActiveAt: new Date(Date.now() - 60_000),
      });

      const evicted = await mcpService.cleanupExpiredSessions(10_000);
      expect(evicted).toBe(1);
      expect(closeSpy).toHaveBeenCalled();
      expect(mcpService.getActiveSessionCount().streamable).toBe(0);
    });
  });
});
