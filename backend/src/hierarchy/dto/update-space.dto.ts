import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SpaceFeaturesDto } from './create-space.dto';
import { UpdateStatusWorkflowDto } from './status-workflow.dto';

export class UpdateSpaceDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Space name cannot be empty' })
  @MaxLength(50, { message: 'Space name cannot exceed 50 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsArray()
  @IsMongoId({
    each: true,
    message: 'Each member must be a valid MongoDB ObjectId',
  })
  members?: string[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SpaceFeaturesDto)
  features?: SpaceFeaturesDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateStatusWorkflowDto)
  statusWorkflow?: UpdateStatusWorkflowDto;

  @IsOptional()
  @IsNumber()
  order?: number;
}
