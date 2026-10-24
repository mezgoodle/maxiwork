import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';
export type RecurrenceEndType = 'never' | 'after_occurrences' | 'on_date';

@Schema({ _id: false })
export class RecurrenceSettings {
  @Prop({
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    default: 'daily',
    required: true,
  })
  frequency: RecurrenceFrequency;

  @Prop({ type: Number, default: 1, min: 1, required: true })
  interval: number;

  @Prop({ type: [Number], default: [] })
  daysOfWeek?: number[]; // 0–6 for Sunday–Saturday

  @Prop({
    type: String,
    enum: ['never', 'after_occurrences', 'on_date'],
    default: 'never',
    required: true,
  })
  endType: RecurrenceEndType;

  @Prop({ type: Number, min: 1 })
  occurrences?: number;

  @Prop({ type: Number, default: 1, min: 1 })
  currentOccurrence: number;

  @Prop({ type: Date })
  endDate?: Date;
}

export const RecurrenceSettingsSchema =
  SchemaFactory.createForClass(RecurrenceSettings);
