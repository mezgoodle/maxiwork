import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import type {
  RecurrenceEndType,
  RecurrenceFrequency,
} from '../schemas/recurrence.schema';

export class RecurrenceSettingsDto {
  @IsEnum(['daily', 'weekly', 'monthly', 'custom'])
  frequency: RecurrenceFrequency;

  @IsInt()
  @Min(1)
  interval: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @IsEnum(['never', 'after_occurrences', 'on_date'])
  endType: RecurrenceEndType;

  @ValidateIf((o: RecurrenceSettingsDto) => o.endType === 'after_occurrences')
  @IsInt()
  @Min(1)
  occurrences?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  currentOccurrence?: number;

  @ValidateIf((o: RecurrenceSettingsDto) => o.endType === 'on_date')
  @IsDateString()
  endDate?: string;
}
