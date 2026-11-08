import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { AiService, SseEventPayload } from './ai.service';
import { AiSessionsService } from './ai-sessions.service';
import {
  CreateChatSessionDto,
  ImproveDescriptionDto,
  StreamChatDto,
  SuggestSubtasksDto,
} from './dto/ai.dto';

interface AuthenticatedUser {
  _id: Types.ObjectId | string;
  email: string;
  [key: string]: unknown;
}

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiSessionsService: AiSessionsService,
  ) {}

  @Get('sessions')
  async findAllSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.aiSessionsService.findAllByUser(String(user._id));
  }

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateChatSessionDto,
  ) {
    return this.aiSessionsService.createSession(String(user._id), dto.title);
  }

  @Get('sessions/:sessionId/messages')
  async getSessionMessages(
    @Param('sessionId', ParseObjectIdPipe) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiSessionsService.getSessionMessages(
      sessionId,
      String(user._id),
    );
  }

  @Delete('sessions/:sessionId')
  async deleteSession(
    @Param('sessionId', ParseObjectIdPipe) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiSessionsService.deleteSession(sessionId, String(user._id));
  }

  @Post('chat/stream')
  async streamChat(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StreamChatDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const sendEvent = (payload: SseEventPayload) => {
      res.write(`event: ${payload.event}\n`);
      res.write(`data: ${JSON.stringify(payload.data)}\n\n`);
    };

    await this.aiService.streamChat(String(user._id), dto, sendEvent);
    res.end();
  }

  @Post('tasks/suggest-subtasks')
  async suggestSubtasks(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SuggestSubtasksDto,
  ) {
    return this.aiService.suggestSubtasks(String(user._id), dto);
  }

  @Post('tasks/improve-description')
  async improveDescription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ImproveDescriptionDto,
  ) {
    return this.aiService.improveDescription(String(user._id), dto);
  }
}
