import { IsString, IsEmail, IsMongoId } from 'class-validator';
import { Expose, Exclude } from 'class-transformer';
import { ObjectId } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @Expose()
  @ApiProperty({ description: 'The id of the user', nullable: false })
  @IsMongoId()
  id: ObjectId;

  @Expose()
  @IsString()
  @ApiProperty({ description: 'The username of the user', nullable: false })
  username: string;

  @Expose()
  @IsEmail()
  @ApiProperty({ description: 'The email of the user', nullable: false })
  email: string;

  @Expose()
  @ApiProperty({
    description: 'The creation date of the user',
    nullable: false,
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: 'The update date of the user', nullable: false })
  updatedAt: Date;

  @Exclude()
  password: string;

  constructor(partial: Partial<UserDto>) {
    Object.assign(this, partial);
  }
}
