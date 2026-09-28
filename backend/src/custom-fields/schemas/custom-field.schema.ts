import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { CustomFieldType } from '../enums/custom-field-type.enum';

export type CustomFieldDocument = HydratedDocument<CustomField>;

export type CustomFieldEntityType = 'space' | 'list';

@Schema({ timestamps: true })
export class CustomField {
  @Prop({ required: true, trim: true, maxlength: 50 })
  name: string;

  @Prop({
    type: String,
    enum: Object.values(CustomFieldType),
    required: true,
  })
  type: CustomFieldType;

  @Prop({ type: [String], default: [] })
  options: string[];

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  defaultValue?: unknown;

  @Prop({ type: Boolean, default: false })
  required: boolean;

  @Prop({
    type: String,
    enum: ['space', 'list'],
    required: true,
    index: true,
  })
  entityType: CustomFieldEntityType;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    index: true,
  })
  entityId: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ trim: true, default: '' })
  description?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CustomFieldSchema = SchemaFactory.createForClass(CustomField);
CustomFieldSchema.index({ entityType: 1, entityId: 1, order: 1 });
CustomFieldSchema.index(
  { entityType: 1, entityId: 1, name: 1 },
  { unique: true },
);
