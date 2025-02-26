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
  HttpStatus,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ObjectIdPipe } from '@/pipes/objectId.pipe';
import { plainToInstance } from 'class-transformer';
import { TaskDto } from './dto/task.dto';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiParam({
    name: 'createTaskDto',
    type: CreateTaskDto,
    required: true,
    description: 'The task to create',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The task has been successfully created',
    type: TaskDto,
  })
  async create(@Body() createTaskDto: CreateTaskDto): Promise<TaskDto> {
    const response = await this.tasksService.create(createTaskDto);
    if (response.error) {
      throw new HttpException(response.error.message, response.error.status);
    }
    const task = response.data.toObject();
    return plainToInstance(TaskDto, task);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns an array of tasks',
    type: [TaskDto],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search title for task',
    example: 'title',
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
  ): Promise<TaskDto[]> {
    const tasks = await this.tasksService.findAll(page, limit, search);
    return tasks.map((task) => plainToInstance(TaskDto, task.toObject()));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by id' })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'The id of the task',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the task',
    type: TaskDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
  async findOne(@Param('id', ObjectIdPipe) id: string): Promise<TaskDto> {
    const task = await this.tasksService.findOne(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const taskObject = task.toObject();
    return plainToInstance(TaskDto, taskObject);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task by id' })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'The id of the task',
  })
  @ApiParam({
    name: 'updateTaskDto',
    type: UpdateTaskDto,
    required: true,
    description: 'The task to update',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The task has been successfully updated',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
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

  @Patch(':id/reassign')
  @ApiOperation({ summary: 'Reassign a task to a new user' })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'The id of the task',
  })
  @ApiQuery({
    name: 'newUserId',
    type: String,
    required: true,
    description: 'The id of the new user to reassign the task to',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The task has been successfully updated',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
  async reassign(
    @Param('id', ObjectIdPipe) id: string,
    @Query('newUserId', ObjectIdPipe) newUserId: string,
  ): Promise<TaskDto> {
    const response = await this.tasksService.reassign(id, newUserId);
    if (response.error) {
      throw new HttpException(response.error.message, response.error.status);
    }
    const taskObject = response.data.toObject();
    return plainToInstance(TaskDto, taskObject);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task by id' })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'The id of the task',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The task has been successfully deleted',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
  async remove(@Param('id', ObjectIdPipe) id: string) {
    const response = await this.tasksService.remove(id);
    if (response.error) {
      throw new HttpException(response.error.message, response.error.status);
    }
    return;
  }
}
