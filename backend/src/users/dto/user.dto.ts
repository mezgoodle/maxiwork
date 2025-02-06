import { IsString, IsEmail, IsMongoId } from 'class-validator';
import { Expose, Exclude } from 'class-transformer';
import { ObjectId } from 'mongoose';

export class UserDto {
  @Expose()
  @IsMongoId()
  id: ObjectId;

  @Expose()
  @IsString()
  username: string;

  @Expose()
  @IsEmail()
  email: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Exclude()
  password?: string;

  constructor(partial: Partial<UserDto>) {
    Object.assign(this, partial);
  }
}
