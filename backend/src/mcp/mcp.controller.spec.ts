import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { ApiKeyAuthGuard } from '../api-keys/guards/api-key-auth.guard';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

describe('McpController', () => {
  let controller: McpController;
  const mockMcpService = {
    handleGet: jest.fn(),
    handlePost: jest.fn(),
    handleDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpController],
      providers: [
        {
          provide: McpService,
          useValue: mockMcpService,
        },
        ApiKeyAuthGuard,
        {
          provide: ApiKeysService,
          useValue: { validateRawKey: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<McpController>(McpController);
  });

  const principal = { userId: 'user-123', apiKeyId: 'key-456' };
  const req = {} as unknown as Request;
  const res = {} as unknown as Response;

  it('delegates GET /api/mcp to McpService.handleGet', async () => {
    await controller.handleGet(principal, req, res);
    expect(mockMcpService.handleGet).toHaveBeenCalledWith('user-123', req, res);
  });

  it('delegates POST /api/mcp to McpService.handlePost', async () => {
    const body = { jsonrpc: '2.0', method: 'tools/list', id: 1 };
    await controller.handlePost(principal, req, res, body, 'sess-1');
    expect(mockMcpService.handlePost).toHaveBeenCalledWith(
      'user-123',
      req,
      res,
      body,
      'sess-1',
    );
  });

  it('delegates DELETE /api/mcp to McpService.handleDelete', async () => {
    await controller.handleDelete(principal, req, res, 'sess-1');
    expect(mockMcpService.handleDelete).toHaveBeenCalledWith(
      'user-123',
      req,
      res,
      'sess-1',
    );
  });
});
