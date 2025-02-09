import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsStrongPassword } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @ApiProperty({
    description: 'The email of the user',
    nullable: false,
    default: 'user@example.com',
  })
  email: string;

  @IsString()
  @ApiProperty({
    description: 'The username of the user',
    nullable: false,
    default: 'JohnDoe',
  })
  username: string;

  @IsStrongPassword()
  @ApiProperty({
    description: 'The password of the user',
    nullable: false,
    default: 'P@ssw0rd!',
  })
  password: string;
}
