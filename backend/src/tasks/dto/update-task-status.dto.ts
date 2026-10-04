import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTaskStatusDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsString({ message: 'Status must be a string' })
  status: string;
}
