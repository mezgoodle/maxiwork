import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

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
}
