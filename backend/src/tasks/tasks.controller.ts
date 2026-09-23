import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto';

interface AuthenticatedUser {
  _id: Types.ObjectId | string;
  email: string;
  [key: string]: unknown;
}

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('projectId', ParseObjectIdPipe) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.create(projectId, createTaskDto, String(user._id));
  }

  @Get()
  async findAll(
    @Param('projectId', ParseObjectIdPipe) projectId: string,
    @Query() query: GetTasksQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.findAll(projectId, query, String(user._id));
  }

  @Get(':taskId')
  async findOne(
    @Param('projectId', ParseObjectIdPipe) projectId: string,
    @Param('taskId', ParseObjectIdPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.findOne(projectId, taskId, String(user._id));
  }

  @Patch(':taskId')
  async update(
    @Param('projectId', ParseObjectIdPipe) projectId: string,
    @Param('taskId', ParseObjectIdPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(
      projectId,
      taskId,
      updateTaskDto,
      String(user._id),
    );
  }

  @Patch(':taskId/status')
  async updateStatus(
    @Param('projectId', ParseObjectIdPipe) projectId: string,
    @Param('taskId', ParseObjectIdPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateTaskStatusDto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateStatus(
      projectId,
      taskId,
      updateTaskStatusDto,
      String(user._id),
    );
  }

  @Delete(':taskId')
  async remove(
    @Param('projectId', ParseObjectIdPipe) projectId: string,
    @Param('taskId', ParseObjectIdPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.remove(projectId, taskId, String(user._id));
  }
}
