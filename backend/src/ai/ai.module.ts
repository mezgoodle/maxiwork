import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { McpModule } from '../mcp/mcp.module';
import { ChatSession, ChatSessionSchema } from './schemas/chat-session.schema';
import { AiSessionsService } from './ai-sessions.service';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    McpModule,
    MongooseModule.forFeature([
      { name: ChatSession.name, schema: ChatSessionSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiSessionsService, AiService],
  exports: [AiSessionsService, AiService],
})
export class AiModule {}
