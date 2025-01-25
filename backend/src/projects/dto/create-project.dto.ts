import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  description: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
