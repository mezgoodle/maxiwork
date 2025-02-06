import { IsString, IsOptional, IsMongoId } from 'class-validator';
import { Expose } from 'class-transformer';
import { ObjectId } from 'mongoose';

export class ProjectDto {
  @Expose()
  @IsMongoId()
  _id: ObjectId;

  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<ProjectDto>) {
    Object.assign(this, partial);
  }
}
