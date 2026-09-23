import { IsEnum, IsNotEmpty } from 'class-validator';
import { TaskStatus } from '../enums/task-status.enum';

export class UpdateTaskStatusDto {
  @IsNotEmpty()
  @IsEnum(TaskStatus)
  status: TaskStatus;
}
