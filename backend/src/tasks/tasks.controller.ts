import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ApiTags } from '@nestjs/swagger';
import { ObjectIdPipe } from '@/pipes/objectId.pipe';
import { plainToInstance } from 'class-transformer';
import { TaskDto } from './dto/task.dto';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Body() createTaskDto: CreateTaskDto): Promise<TaskDto> {
    const response = await this.tasksService.create(createTaskDto);
    if (response.error) {
      throw new HttpException(response.error.message, response.error.status);
    }
    const task = response.data.toObject();
    return plainToInstance(TaskDto, task);
  }

  @Get()
  async findAll(): Promise<TaskDto[]> {
    const tasks = await this.tasksService.findAll();
    return tasks.map((task) => plainToInstance(TaskDto, task.toObject()));
  }

  @Get(':id')
  async findOne(@Param('id', ObjectIdPipe) id: string): Promise<TaskDto> {
    const task = await this.tasksService.findOne(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const taskObject = task.toObject();
    return plainToInstance(TaskDto, taskObject);
  }

  @Patch(':id')
  async update(
    @Param('id', ObjectIdPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<TaskDto> {
    const updatedTask = await this.tasksService.update(id, updateTaskDto);
    if (!updatedTask) {
      throw new NotFoundException('Task not found');
    }
    const taskObject = updatedTask.toObject();
    return plainToInstance(TaskDto, taskObject);
  }

  @Delete(':id')
  async remove(@Param('id', ObjectIdPipe) id: string) {
    const response = await this.tasksService.remove(id);
    if (response.error) {
      throw new HttpException(response.error.message, response.error.status);
    }
    return;
  }
}
