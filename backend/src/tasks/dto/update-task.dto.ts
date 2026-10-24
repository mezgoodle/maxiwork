import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsObject,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TaskPriority } from '../enums/task-priority.enum';
import { RecurrenceSettingsDto } from './recurrence.dto';

export class UpdateTaskDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  title?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(5000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  description?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  status?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ValidateIf(
    (_, value) => value !== undefined && value !== null && value !== '',
  )
  @IsMongoId()
  assignee?: string | null;

  @ValidateIf(
    (_, value) => value !== undefined && value !== null && value !== '',
  )
  @IsMongoId()
  list?: string | null;

  @ValidateIf(
    (_, value) => value !== undefined && value !== null && value !== '',
  )
  @IsDateString()
  startDate?: string | null;

  @ValidateIf(
    (_, value) => value !== undefined && value !== null && value !== '',
  )
  @IsDateString()
  dueDate?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsObject()
  customFieldValues?: Record<string, unknown>;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isRecurring?: boolean;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @ValidateNested()
  @Type(() => RecurrenceSettingsDto)
  recurrence?: RecurrenceSettingsDto | null;
}
