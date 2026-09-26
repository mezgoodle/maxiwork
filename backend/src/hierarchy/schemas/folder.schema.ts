import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Space } from './space.schema';

export type FolderDocument = HydratedDocument<Folder>;

@Schema({
  timestamps: true,
})
export class Folder {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Space.name,
    required: true,
    index: true,
  })
  spaceId: Types.ObjectId | Space;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: Boolean, default: false })
  isHidden: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const FolderSchema = SchemaFactory.createForClass(Folder);
FolderSchema.index({ spaceId: 1, order: 1 });
FolderSchema.index({ spaceId: 1, name: 1 });
