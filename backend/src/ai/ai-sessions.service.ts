import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChatMessage,
  ChatSession,
  ChatSessionDocument,
  ChatToolCallRecord,
} from './schemas/chat-session.schema';

export interface SanitizedChatSessionHeader {
  id: string;
  title: string;
  messagesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SanitizedChatMessage {
  id?: string;
  role: 'user' | 'model';
  content: string;
  toolCalls: ChatToolCallRecord[];
  timestamp: Date;
}

@Injectable()
export class AiSessionsService {
  constructor(
    @InjectModel(ChatSession.name)
    private readonly chatSessionModel: Model<ChatSessionDocument>,
  ) {}

  async findAllByUser(userId: string): Promise<SanitizedChatSessionHeader[]> {
    const userObjId = new Types.ObjectId(userId);
    const sessions = await this.chatSessionModel
      .find({ userId: userObjId })
      .sort({ updatedAt: -1 })
      .select('_id title messages createdAt updatedAt')
      .lean()
      .exec();

    return sessions.map((s) => ({
      id: s._id.toString(),
      title: s.title,
      messagesCount: Array.isArray(s.messages) ? s.messages.length : 0,
      createdAt: s.createdAt || new Date(),
      updatedAt: s.updatedAt || new Date(),
    }));
  }

  async createSession(
    userId: string,
    title?: string,
  ): Promise<SanitizedChatSessionHeader> {
    const userObjId = new Types.ObjectId(userId);
    const newSession = new this.chatSessionModel({
      userId: userObjId,
      title: title && title.trim() ? title.trim() : 'New Chat',
      messages: [],
    });

    const saved = await newSession.save();
    return {
      id: saved._id.toString(),
      title: saved.title,
      messagesCount: 0,
      createdAt: saved.createdAt || new Date(),
      updatedAt: saved.updatedAt || new Date(),
    };
  }

  async getSession(
    sessionId: string,
    userId: string,
  ): Promise<ChatSessionDocument> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new NotFoundException('Chat session not found');
    }

    const session = await this.chatSessionModel.findById(sessionId).exec();
    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    if (session.userId.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have access to this chat session',
      );
    }

    return session;
  }

  async getSessionMessages(
    sessionId: string,
    userId: string,
  ): Promise<SanitizedChatMessage[]> {
    const session = await this.getSession(sessionId, userId);
    return session.messages.map((m) => ({
      id: m._id ? m._id.toString() : undefined,
      role: m.role,
      content: m.content,
      toolCalls: m.toolCalls || [],
      timestamp: m.timestamp || new Date(),
    }));
  }

  async appendTurn(
    sessionId: string,
    userId: string,
    userText: string,
    modelText: string,
    toolCalls: ChatToolCallRecord[],
  ): Promise<ChatSessionDocument> {
    const session = await this.getSession(sessionId, userId);

    const userMessage: ChatMessage = {
      role: 'user',
      content: userText,
      toolCalls: [],
      timestamp: new Date(),
    };

    const modelMessage: ChatMessage = {
      role: 'model',
      content: modelText,
      toolCalls,
      timestamp: new Date(),
    };

    session.messages.push(userMessage);
    session.messages.push(modelMessage);

    // Auto-generate a title from the first prompt if it is still "New Chat"
    if (session.title === 'New Chat' || !session.title.trim()) {
      const trimmedPrompt = userText.trim();
      const firstLine = trimmedPrompt.split('\n')[0].trim();
      session.title =
        firstLine.length > 40 ? `${firstLine.substring(0, 37)}...` : firstLine;
    }

    return await session.save();
  }

  async deleteSession(
    sessionId: string,
    userId: string,
  ): Promise<{ success: boolean; id: string }> {
    const session = await this.getSession(sessionId, userId);
    await this.chatSessionModel.deleteOne({ _id: session._id }).exec();
    return { success: true, id: sessionId };
  }
}
