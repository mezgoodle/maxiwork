import { IsString, IsMongoId } from 'class-validator';
import { Expose } from 'class-transformer';
import { ObjectId } from 'mongoose';

export class TaskDto {
  @Expose()
  @IsMongoId()
  id: ObjectId;

  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsString()
  description: string;

  @Expose()
  @IsString()
  status: string;

  @Expose()
  @IsMongoId()
  user: ObjectId;

  @Expose()
  @IsMongoId()
  project: ObjectId;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<TaskDto>) {
    Object.assign(this, partial);
  }
}
