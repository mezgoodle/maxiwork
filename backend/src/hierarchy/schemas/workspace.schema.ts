import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { WorkspaceRole } from '../enums/workspace-role.enum';

export type WorkspaceDocument = HydratedDocument<Workspace>;

@Schema({ _id: false })
export class WorkspaceMember {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user: Types.ObjectId | User;

  @Prop({
    type: String,
    enum: Object.values(WorkspaceRole),
    default: WorkspaceRole.MEMBER,
    required: true,
  })
  role: WorkspaceRole;

  @Prop({ type: Date, default: () => new Date() })
  joinedAt: Date;
}

export const WorkspaceMemberSchema =
  SchemaFactory.createForClass(WorkspaceMember);

@Schema({ _id: false })
export class WorkspaceSettings {
  @Prop({ type: String, default: 'UTC' })
  defaultTimezone: string;

  @Prop({ type: Boolean, default: true })
  allowGuestInvites: boolean;
}

export const WorkspaceSettingsSchema =
  SchemaFactory.createForClass(WorkspaceSettings);

@Schema({
  timestamps: true,
})
export class Workspace {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  slug: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  owner: Types.ObjectId | User;

  @Prop({
    type: [WorkspaceMemberSchema],
    default: [],
  })
  members: WorkspaceMember[];

  @Prop({ type: String, trim: true })
  avatarUrl?: string;

  @Prop({
    type: WorkspaceSettingsSchema,
    default: () => ({ defaultTimezone: 'UTC', allowGuestInvites: true }),
  })
  settings: WorkspaceSettings;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
WorkspaceSchema.index({ slug: 1 }, { unique: true });
WorkspaceSchema.index({ owner: 1 });
WorkspaceSchema.index({ 'members.user': 1 });
