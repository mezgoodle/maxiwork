import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ChatSessionDocument = HydratedDocument<ChatSession>;

@Schema({ _id: false })
export class ChatToolCallRecord {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  title: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  args: Record<string, unknown>;

  @Prop({ default: false })
  isError: boolean;

  @Prop({ default: '' })
  summary: string;
}

export const ChatToolCallRecordSchema =
  SchemaFactory.createForClass(ChatToolCallRecord);

@Schema({ _id: true, timestamps: false })
export class ChatMessage {
  _id?: Types.ObjectId;

  @Prop({ required: true, enum: ['user', 'model'] })
  role: 'user' | 'model';

  @Prop({ required: true })
  content: string;

  @Prop({ type: [ChatToolCallRecordSchema], default: [] })
  toolCalls: ChatToolCallRecord[];

  @Prop({ type: Date, default: () => new Date() })
  timestamp: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

@Schema({ timestamps: true })
export class ChatSession {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, default: 'New Chat' })
  title: string;

  @Prop({ type: [ChatMessageSchema], default: [] })
  messages: ChatMessage[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);
ChatSessionSchema.index({ userId: 1, updatedAt: -1 });
