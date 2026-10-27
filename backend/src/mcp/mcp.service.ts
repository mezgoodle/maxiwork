import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  isInitializeRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { McpToolsRegistryService } from './mcp-tools-registry.service';

export interface ActiveSseSession {
  sessionId: string;
  userId: string;
  transport: SSEServerTransport;
  server: Server;
  createdAt: Date;
}

export interface ActiveStreamableSession {
  sessionId: string;
  userId: string;
  transport: StreamableHTTPServerTransport;
  server: Server;
  createdAt: Date;
}

@Injectable()
export class McpService implements OnModuleDestroy {
  private readonly sseSessions = new Map<string, ActiveSseSession>();
  private readonly streamableSessions = new Map<
    string,
    ActiveStreamableSession
  >();

  constructor(private readonly toolsRegistry: McpToolsRegistryService) {}

  async onModuleDestroy(): Promise<void> {
    for (const session of this.sseSessions.values()) {
      await session.transport.close().catch(() => undefined);
    }
    this.sseSessions.clear();

    for (const session of this.streamableSessions.values()) {
      await session.transport.close().catch(() => undefined);
    }
    this.streamableSessions.clear();
  }

  createMcpServerForUser(userId: string): Server {
    const server = new Server(
      {
        name: 'maxiwork-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    server.setRequestHandler(ListToolsRequestSchema, () => {
      return {
        tools: this.toolsRegistry.listTools(),
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const toolArgs = request.params.arguments ?? {};
      return await this.toolsRegistry.executeTool(toolName, toolArgs, userId);
    });

    return server;
  }

  private ensureStreamableAcceptHeader(req: Request): void {
    const accept = req.headers.accept || '';
    if (
      !accept.includes('application/json') ||
      !accept.includes('text/event-stream')
    ) {
      req.headers.accept = 'application/json, text/event-stream';
    }
  }

  private isInitMessage(body: unknown): boolean {
    if (Array.isArray(body)) {
      return body.some((item) => isInitializeRequest(item));
    }
    return isInitializeRequest(body);
  }

  async handleGet(userId: string, req: Request, res: Response): Promise<void> {
    const mcpSessionIdHeader = req.headers['mcp-session-id'];
    const sessionId =
      typeof mcpSessionIdHeader === 'string'
        ? mcpSessionIdHeader.trim()
        : undefined;

    if (sessionId) {
      const streamableSession = this.streamableSessions.get(sessionId);
      if (!streamableSession) {
        res.status(404).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'MCP session not found' },
          id: null,
        });
        return;
      }
      if (streamableSession.userId !== userId) {
        res.status(403).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Forbidden: session belongs to another user',
          },
          id: null,
        });
        return;
      }

      if (!req.headers.accept?.includes('text/event-stream')) {
        req.headers.accept = 'text/event-stream';
      }
      await streamableSession.transport.handleRequest(req, res);
      return;
    }

    // Legacy HTTP+SSE handshake: GET /api/mcp -> sends `event: endpoint` with `/api/mcp?sessionId=<id>`
    const transport = new SSEServerTransport('/api/mcp', res);
    const server = this.createMcpServerForUser(userId);
    const sseSessionId = transport.sessionId;

    this.sseSessions.set(sseSessionId, {
      sessionId: sseSessionId,
      userId,
      transport,
      server,
      createdAt: new Date(),
    });

    transport.onclose = () => {
      this.sseSessions.delete(sseSessionId);
    };

    await server.connect(transport);
  }

  async handlePost(
    userId: string,
    req: Request,
    res: Response,
    body: unknown,
    querySessionId?: string,
  ): Promise<void> {
    // 1. Check if this POST belongs to an active SSE transport session via ?sessionId=...
    const trimmedQuerySessionId = querySessionId?.trim();
    if (trimmedQuerySessionId) {
      const sseSession = this.sseSessions.get(trimmedQuerySessionId);
      if (!sseSession) {
        res.status(404).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'SSE session not found' },
          id: null,
        });
        return;
      }
      if (sseSession.userId !== userId) {
        res.status(403).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Forbidden: session belongs to another user',
          },
          id: null,
        });
        return;
      }
      await sseSession.transport.handlePostMessage(req, res, body);
      return;
    }

    // 2. Streamable HTTP transport
    this.ensureStreamableAcceptHeader(req);
    if (!req.headers['content-type']) {
      req.headers['content-type'] = 'application/json';
    }

    const headerSessionIdRaw = req.headers['mcp-session-id'];
    const headerSessionId =
      typeof headerSessionIdRaw === 'string'
        ? headerSessionIdRaw.trim()
        : undefined;

    if (headerSessionId) {
      const existing = this.streamableSessions.get(headerSessionId);
      if (!existing) {
        res.status(404).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'MCP session not found' },
          id: null,
        });
        return;
      }
      if (existing.userId !== userId) {
        res.status(403).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Forbidden: session belongs to another user',
          },
          id: null,
        });
        return;
      }
      await existing.transport.handleRequest(req, res, body);
      return;
    }

    if (this.isInitMessage(body)) {
      const server = this.createMcpServerForUser(userId);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: (sid: string) => {
          this.streamableSessions.set(sid, {
            sessionId: sid,
            userId,
            transport,
            server,
            createdAt: new Date(),
          });
        },
        onsessionclosed: (sid: string) => {
          this.streamableSessions.delete(sid);
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          this.streamableSessions.delete(transport.sessionId);
        }
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, body);
      return;
    }

    // Stateless fallback for direct single-shot JSON-RPC calls (e.g., tools/list, tools/call, ping)
    const statelessServer = this.createMcpServerForUser(userId);
    const statelessTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await statelessServer.connect(statelessTransport);
    try {
      await statelessTransport.handleRequest(req, res, body);
    } finally {
      await statelessTransport.close().catch(() => undefined);
    }
  }

  async handleDelete(
    userId: string,
    req: Request,
    res: Response,
    querySessionId?: string,
  ): Promise<void> {
    const headerSessionIdRaw = req.headers['mcp-session-id'];
    const sessionId =
      (typeof headerSessionIdRaw === 'string'
        ? headerSessionIdRaw.trim()
        : undefined) || querySessionId?.trim();

    if (!sessionId) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Missing MCP session ID' },
        id: null,
      });
      return;
    }

    const streamable = this.streamableSessions.get(sessionId);
    if (streamable) {
      if (streamable.userId !== userId) {
        res.status(403).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Forbidden: session belongs to another user',
          },
          id: null,
        });
        return;
      }
      await streamable.transport.close().catch(() => undefined);
      this.streamableSessions.delete(sessionId);
      res.status(200).json({ message: 'MCP session terminated', sessionId });
      return;
    }

    const sse = this.sseSessions.get(sessionId);
    if (sse) {
      if (sse.userId !== userId) {
        res.status(403).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Forbidden: session belongs to another user',
          },
          id: null,
        });
        return;
      }
      await sse.transport.close().catch(() => undefined);
      this.sseSessions.delete(sessionId);
      res.status(200).json({ message: 'SSE session terminated', sessionId });
      return;
    }

    res.status(404).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'MCP session not found' },
      id: null,
    });
  }

  getActiveSessionCount(): { sse: number; streamable: number } {
    return {
      sse: this.sseSessions.size,
      streamable: this.streamableSessions.size,
    };
  }
}
