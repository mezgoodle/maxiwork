import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ValidatedApiKeyPrincipal } from '../api-keys/api-keys.service';
import { ApiKeyAuthGuard } from '../api-keys/guards/api-key-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { McpService } from './mcp.service';

@UseGuards(ApiKeyAuthGuard)
@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Get()
  async handleGet(
    @CurrentUser() principal: ValidatedApiKeyPrincipal,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.mcpService.handleGet(principal.userId, req, res);
  }

  @Post()
  async handlePost(
    @CurrentUser() principal: ValidatedApiKeyPrincipal,
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: unknown,
    @Query('sessionId') sessionId?: string,
  ): Promise<void> {
    await this.mcpService.handlePost(
      principal.userId,
      req,
      res,
      body,
      sessionId,
    );
  }

  @Delete()
  async handleDelete(
    @CurrentUser() principal: ValidatedApiKeyPrincipal,
    @Req() req: Request,
    @Res() res: Response,
    @Query('sessionId') sessionId?: string,
  ): Promise<void> {
    await this.mcpService.handleDelete(principal.userId, req, res, sessionId);
  }
}
