import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  IsOptional,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class CreatePostDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  @ApiProperty({ required: false })
  content?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false })
  published?: boolean = false;
  @ApiProperty({ required: false })
  authorId: number;
}
