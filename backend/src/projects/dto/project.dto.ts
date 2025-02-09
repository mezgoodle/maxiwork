import { IsString, IsOptional, IsMongoId } from 'class-validator';
import { Expose } from 'class-transformer';
import { ObjectId } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export class ProjectDto {
  @Expose()
  @IsMongoId()
  @ApiProperty({ description: 'The id of the project', nullable: false })
  _id: ObjectId;

  @Expose()
  @IsString()
  @ApiProperty({ description: 'The title of the project', nullable: false })
  title: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The description of the project',
    nullable: true,
  })
  description?: string;

  @Expose()
  @ApiProperty({
    description: 'The creation date of the project',
    nullable: false,
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    description: 'The update date of the project',
    nullable: false,
  })
  updatedAt: Date;

  constructor(partial: Partial<ProjectDto>) {
    Object.assign(this, partial);
  }
}
