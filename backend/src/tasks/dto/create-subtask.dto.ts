import {
  IsEnum,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TaskPriority } from '../enums/task-priority.enum';

export class CreateSubtaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(1, { message: 'Title cannot be empty' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Description cannot exceed 5000 characters' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority, {
    message: 'Priority must be one of: low, medium, high, urgent',
  })
  priority?: TaskPriority;

  @IsOptional()
  @IsMongoId({ message: 'Assignee must be a valid user ID' })
  assignee?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Start date must be a valid ISO 8601 date string' })
  startDate?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Due date must be a valid ISO 8601 date string' })
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  order?: number;
}
