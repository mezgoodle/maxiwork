import { IsString, IsMongoId } from 'class-validator';
import { Expose } from 'class-transformer';
import { ObjectId } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export class TaskDto {
  @Expose()
  @IsMongoId()
  @ApiProperty({ description: 'The id of the task', nullable: false })
  id: ObjectId;

  @Expose()
  @IsString()
  @ApiProperty({ description: 'The title of the task', nullable: false })
  title: string;

  @Expose()
  @IsString()
  @ApiProperty({ description: 'The description of the task', nullable: false })
  description: string;

  @Expose()
  @IsString()
  @ApiProperty({ description: 'The status of the task', nullable: false })
  status: string;

  @Expose()
  @IsMongoId()
  @ApiProperty({ description: 'The id of the user', nullable: false })
  user: ObjectId;

  @Expose()
  @IsMongoId()
  @ApiProperty({ description: 'The id of the project', nullable: false })
  project: ObjectId;

  @Expose()
  @ApiProperty({
    description: 'The creation date of the task',
    nullable: false,
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: 'The update date of the task', nullable: false })
  updatedAt: Date;

  constructor(partial: Partial<TaskDto>) {
    Object.assign(this, partial);
  }
}
