import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';

export enum TaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The title of the task',
    nullable: false,
    default: 'Test task',
  })
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @ApiProperty({
    description: 'The description of the task',
    nullable: false,
    maxLength: 500,
    default: 'This is a test task',
  })
  description: string;

  @IsEnum(TaskStatus)
  @IsNotEmpty()
  @ApiProperty({
    description: 'The status of the task',
    nullable: false,
    enum: TaskStatus,
    default: TaskStatus.OPEN,
  })
  status: TaskStatus;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The id of the user',
    nullable: false,
    default: '620b8d2f2c5f3e5f9fbf7e7d',
  })
  userId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The id of the project',
    nullable: false,
    default: '620b8d2f2c5f3e5f9fbf7e7e',
  })
  projectId: string;
}
