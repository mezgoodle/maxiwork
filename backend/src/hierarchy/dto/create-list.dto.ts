import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateStatusWorkflowDto } from './status-workflow.dto';

export class CreateListDto {
  @IsString()
  @IsNotEmpty({ message: 'List name is required' })
  @MinLength(1, { message: 'List name cannot be empty' })
  @MaxLength(50, { message: 'List name cannot exceed 50 characters' })
  name: string;

  @IsOptional()
  @IsMongoId({ message: 'folderId must be a valid MongoDB ObjectId' })
  folderId?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateStatusWorkflowDto)
  statusWorkflow?: UpdateStatusWorkflowDto;
}
