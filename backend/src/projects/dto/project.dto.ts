import { IsString, IsOptional, IsArray } from 'class-validator';
import { Task } from '@/tasks/schemas/task.schema';

export class ProjectDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  tasks: Task[];
}
