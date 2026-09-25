import {
  IsArray,
  IsBoolean,
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
  @IsString({ each: true })
  members?: string[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SpaceFeaturesDto)
  features?: SpaceFeaturesDto;

  @IsOptional()
  @IsNumber()
  order?: number;
}
