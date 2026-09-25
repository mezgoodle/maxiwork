import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Space } from './space.schema';
import { Folder } from './folder.schema';

export type ListDocument = HydratedDocument<List>;

@Schema({
  timestamps: true,
})
export class List {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Space.name,
    required: true,
    index: true,
  })
  spaceId: Types.ObjectId | Space;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Folder.name,
    index: true,
  })
  folderId?: Types.ObjectId | Folder;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: String, trim: true })
  color?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ListSchema = SchemaFactory.createForClass(List);
ListSchema.index({ spaceId: 1, order: 1 });
ListSchema.index({ folderId: 1, order: 1 });
ListSchema.index({ spaceId: 1, folderId: 1 });
