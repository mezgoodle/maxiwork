import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateFolderDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Folder name cannot be empty' })
  @MaxLength(50, { message: 'Folder name cannot exceed 50 characters' })
  name?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}
