import { IsEmail, IsString, IsStrongPassword } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;
  @IsString()
  username: string;
  @IsStrongPassword()
  password: string;
}
