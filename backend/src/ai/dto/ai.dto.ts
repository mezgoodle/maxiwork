import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChatSessionDto {
  @IsOptional()
  @IsString()
  title?: string;
}

export class AiStreamContextDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  spaceId?: string;

  @IsOptional()
  @IsString()
  listId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;
}

export class StreamChatDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiStreamContextDto)
  context?: AiStreamContextDto;
}

export class SuggestSubtasksDto {
  @IsOptional()
  @IsString()
  taskId?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  count?: number;
}

export enum ImproveDescriptionAction {
  EXPAND = 'expand',
  POLISH = 'polish',
  ACCEPTANCE_CRITERIA = 'acceptance_criteria',
}

export class ImproveDescriptionDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(ImproveDescriptionAction)
  action: ImproveDescriptionAction;
}
