import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ProjectDocument = HydratedDocument<Project>;

@Schema({
  timestamps: true,
})
export class Project {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true, default: '' })
  description?: string;

  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 5,
  })
  prefix: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  owner: Types.ObjectId | User;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: User.name }],
    default: [],
  })
  members: (Types.ObjectId | User)[];

  @Prop({ type: Number, default: 0 })
  taskCounter?: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
ProjectSchema.index({ prefix: 1 }, { unique: true });
ProjectSchema.index({ owner: 1 });
