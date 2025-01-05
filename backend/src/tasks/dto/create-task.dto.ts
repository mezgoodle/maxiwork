import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

enum TaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(TaskStatus)
  @IsNotEmpty()
  status: TaskStatus;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsBoolean()
  @Transform(({ value }) => (value !== undefined ? value : false))
  isFinished: boolean;
}
