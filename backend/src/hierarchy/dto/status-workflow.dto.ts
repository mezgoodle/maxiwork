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
  fromStatusId: string;

  @IsString()
  @IsNotEmpty({ message: 'toStatusId is required for migration' })
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
  defaultTodoStatusId?: string;

  @IsOptional()
  @IsString()
  defaultDoneStatusId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatusMigrationDto)
  migrations?: StatusMigrationDto[];
}
