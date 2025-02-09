import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The title of the project',
    nullable: false,
    default: 'New Project',
  })
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  @ApiProperty({
    description: 'The description of the project',
    nullable: true,
    maxLength: 200,
    default: 'This is a description of the project',
  })
  description: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The id of the user',
    nullable: false,
    default: '620b8d2f2c5f3e5f9fbf7e7d',
  })
  userId: string;
}
