import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StatusCategory } from '../enums/status-category.enum';

export class CustomStatusItemDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,64}$/, {
    message:
      'Status ID must be 1-64 alphanumeric characters, underscores, or hyphens',
  })
  id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Status name is required' })
  @MinLength(1, { message: 'Status name cannot be empty' })
  @MaxLength(50, { message: 'Status name cannot exceed 50 characters' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Status color is required' })
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Color must be a valid hex color code (e.g. #3B82F6)',
  })
  color: string;

  @IsEnum(StatusCategory, {
    message: 'Category must be one of: to_do, in_progress, done, closed',
  })
  category: StatusCategory;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class StatusMigrationDto {
  @IsString()
  @IsNotEmpty({ message: 'fromStatusId is required for migration' })
  @Matches(/^[A-Za-z0-9_-]{1,64}$/, {
    message:
      'fromStatusId must be 1-64 alphanumeric characters, underscores, or hyphens',
  })
  fromStatusId: string;

  @IsString()
  @IsNotEmpty({ message: 'toStatusId is required for migration' })
  @Matches(/^[A-Za-z0-9_-]{1,64}$/, {
    message:
      'toStatusId must be 1-64 alphanumeric characters, underscores, or hyphens',
  })
  toStatusId: string;
}

export class UpdateStatusWorkflowDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Workflow must have at least one status' })
  @ValidateNested({ each: true })
  @Type(() => CustomStatusItemDto)
  statuses: CustomStatusItemDto[];

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,64}$/, {
    message:
      'defaultTodoStatusId must be 1-64 alphanumeric characters, underscores, or hyphens',
  })
  defaultTodoStatusId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,64}$/, {
    message:
      'defaultDoneStatusId must be 1-64 alphanumeric characters, underscores, or hyphens',
  })
  defaultDoneStatusId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatusMigrationDto)
  migrations?: StatusMigrationDto[];
}

export class ResetStatusWorkflowDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatusMigrationDto)
  migrations?: StatusMigrationDto[];
}
