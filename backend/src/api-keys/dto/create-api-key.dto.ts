import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty({ message: 'API key name is required' })
  @MaxLength(100, { message: 'API key name cannot exceed 100 characters' })
  name: string;

  @IsOptional()
  @IsISO8601({}, { message: 'expiresAt must be a valid ISO 8601 date string' })
  expiresAt?: string;
}
