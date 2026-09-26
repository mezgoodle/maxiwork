import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';

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
  @IsEnum(TaskStatus)
  status?: TaskStatus;

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
}
