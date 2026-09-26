import {
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateListDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'List name cannot be empty' })
  @MaxLength(50, { message: 'List name cannot exceed 50 characters' })
  name?: string;

  @IsOptional()
  @ValidateIf((_, val) => val !== null && val !== undefined)
  @IsMongoId({ message: 'folderId must be a valid MongoDB ObjectId or null' })
  folderId?: string | null;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsString()
  color?: string;
}
