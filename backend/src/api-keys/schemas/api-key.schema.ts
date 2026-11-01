import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ApiKeyDocument = HydratedDocument<ApiKey>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      if (ret._id) {
        ret.id = (ret._id as Types.ObjectId).toString();
      }
      delete ret.keyHash;
      delete ret.__v;
      return ret;
    },
  },
})
export class ApiKey {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  keyHash: string;

  @Prop({ required: true, trim: true })
  keyPrefix: string;

  @Prop({ type: Date, default: null })
  lastUsedAt?: Date | null;

  @Prop({ type: Date, default: null })
  expiresAt?: Date | null;

  @Prop({ type: Boolean, default: false, index: true })
  revoked: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);
ApiKeySchema.index({ userId: 1, createdAt: -1 });
