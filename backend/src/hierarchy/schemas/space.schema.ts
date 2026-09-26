import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Workspace } from './workspace.schema';
import { User } from '../../users/schemas/user.schema';

export type SpaceDocument = HydratedDocument<Space>;

@Schema({ _id: false })
export class SpaceFeatures {
  @Prop({ type: Boolean, default: true })
  customStatuses: boolean;

  @Prop({ type: Boolean, default: true })
  customFields: boolean;

  @Prop({ type: Boolean, default: true })
  calendarView: boolean;
}

export const SpaceFeaturesSchema = SchemaFactory.createForClass(SpaceFeatures);

@Schema({
  timestamps: true,
})
export class Space {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Workspace.name,
    required: true,
    index: true,
  })
  workspaceId: Types.ObjectId | Workspace;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true, default: '' })
  description?: string;

  @Prop({ type: String, default: 'folder', trim: true })
  icon: string;

  @Prop({ type: String, default: '#4F46E5', trim: true })
  color: string;

  @Prop({ type: Boolean, default: false })
  isPrivate: boolean;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: User.name }],
    default: [],
  })
  members: (Types.ObjectId | User)[];

  @Prop({
    type: SpaceFeaturesSchema,
    default: () => ({
      customStatuses: true,
      customFields: true,
      calendarView: true,
    }),
  })
  features: SpaceFeatures;

  @Prop({ type: Number, default: 0 })
  order: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SpaceSchema = SchemaFactory.createForClass(Space);
SpaceSchema.index({ workspaceId: 1, order: 1 });
SpaceSchema.index({ workspaceId: 1, name: 1 });
