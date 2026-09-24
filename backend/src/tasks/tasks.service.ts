import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto';

export interface PaginatedTasksResult {
  data: TaskDocument[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
  ) {}

  private extractId(ref: unknown): string {
    if (!ref) return '';
    if (typeof ref === 'object') {
      if ('_id' in (ref as Record<string, unknown>)) {
        return String((ref as { _id: unknown })._id);
      }
      if (typeof (ref as { toString?: unknown }).toString === 'function') {
        return (ref as { toString(): string }).toString();
      }
    }
    return typeof ref === 'string' ? ref : '';
  }

  private assertAssigneeInProject(
    project: ProjectDocument,
    assigneeId: string,
  ): void {
    const ids = [project.owner, ...(project.members || [])].map((r) =>
      this.extractId(r),
    );
    if (!ids.includes(assigneeId.toString())) {
      throw new BadRequestException('Assignee must be a member of the project');
    }
  }

  async checkProjectAccess(
    projectId: string,
    userId: string,
  ): Promise<ProjectDocument> {
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const ownerId = this.extractId(project.owner);
    const isMember = (project.members || []).some(
      (member) => this.extractId(member) === userId.toString(),
    );

    if (ownerId !== userId.toString() && !isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  async create(
    projectId: string,
    createTaskDto: CreateTaskDto,
    userId: string,
  ): Promise<TaskDocument> {
    const project = await this.checkProjectAccess(projectId, userId);

    if (createTaskDto.assignee) {
      this.assertAssigneeInProject(project, createTaskDto.assignee);
    }

    if (typeof project.taskCounter !== 'number') {
      const existingTasks = await this.taskModel
        .find({ project: projectId })
        .select('taskKey')
        .lean()
        .exec();

      const escapedPrefix = project.prefix.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );
      const prefixPattern = new RegExp(`^${escapedPrefix}-(\\d+)$`);
      let maxNum = 0;
      for (const t of existingTasks) {
        const match = t.taskKey.match(prefixPattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
      await this.projectModel
        .updateOne({ _id: projectId }, { $set: { taskCounter: maxNum } })
        .exec();
    }

    const counter = await this.projectModel
      .findByIdAndUpdate(
        projectId,
        { $inc: { taskCounter: 1 } },
        { new: true, projection: { prefix: 1, taskCounter: 1 } },
      )
      .exec();

    if (!counter) {
      throw new NotFoundException('Project not found');
    }

    const taskKey = `${counter.prefix}-${counter.taskCounter}`;

    const createdTask = new this.taskModel({
      ...createTaskDto,
      project: projectId,
      reporter: userId,
      taskKey,
      assignee: createTaskDto.assignee
        ? new Types.ObjectId(createTaskDto.assignee)
        : undefined,
      startDate: createTaskDto.startDate
        ? new Date(createTaskDto.startDate)
        : undefined,
      dueDate: createTaskDto.dueDate
        ? new Date(createTaskDto.dueDate)
        : undefined,
    });

    const saved = await createdTask.save();
    return await saved.populate([
      { path: 'reporter', select: 'firstName lastName email avatarUrl' },
      { path: 'assignee', select: 'firstName lastName email avatarUrl' },
    ]);
  }

  async findAll(
    projectId: string,
    query: GetTasksQueryDto,
    userId: string,
  ): Promise<PaginatedTasksResult> {
    await this.checkProjectAccess(projectId, userId);

    const filter: Record<string, unknown> = { project: projectId };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.priority) {
      filter.priority = query.priority;
    }

    if (query.assignee) {
      filter.assignee = new Types.ObjectId(query.assignee);
    }

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = { $regex: escaped, $options: 'i' };
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const total = await this.taskModel.countDocuments(filter).exec();
    const totalPages = Math.ceil(total / limit) || 1;

    const data = await this.taskModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reporter', 'firstName lastName email avatarUrl')
      .populate('assignee', 'firstName lastName email avatarUrl')
      .exec();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskDocument> {
    await this.checkProjectAccess(projectId, userId);

    const task = await this.taskModel
      .findOne({ _id: taskId, project: projectId })
      .populate('reporter', 'firstName lastName email avatarUrl')
      .populate('assignee', 'firstName lastName email avatarUrl')
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(
    projectId: string,
    taskId: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
  ): Promise<TaskDocument> {
    const project = await this.checkProjectAccess(projectId, userId);

    const task = await this.taskModel
      .findOne({ _id: taskId, project: projectId })
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (updateTaskDto.title !== undefined) {
      task.title = updateTaskDto.title;
    }

    if (updateTaskDto.description !== undefined) {
      task.description = updateTaskDto.description;
    }

    if (updateTaskDto.status !== undefined) {
      task.status = updateTaskDto.status;
    }

    if (updateTaskDto.priority !== undefined) {
      task.priority = updateTaskDto.priority;
    }

    if (updateTaskDto.assignee !== undefined) {
      if (updateTaskDto.assignee) {
        this.assertAssigneeInProject(project, updateTaskDto.assignee);
      }
      task.assignee = updateTaskDto.assignee
        ? new Types.ObjectId(updateTaskDto.assignee)
        : undefined;
    }

    if (updateTaskDto.startDate !== undefined) {
      task.startDate = updateTaskDto.startDate
        ? new Date(updateTaskDto.startDate)
        : undefined;
    }

    if (updateTaskDto.dueDate !== undefined) {
      task.dueDate = updateTaskDto.dueDate
        ? new Date(updateTaskDto.dueDate)
        : undefined;
    }

    const updated = await task.save();
    return await updated.populate([
      { path: 'reporter', select: 'firstName lastName email avatarUrl' },
      { path: 'assignee', select: 'firstName lastName email avatarUrl' },
    ]);
  }

  async updateStatus(
    projectId: string,
    taskId: string,
    updateTaskStatusDto: UpdateTaskStatusDto,
    userId: string,
  ): Promise<TaskDocument> {
    await this.checkProjectAccess(projectId, userId);

    const task = await this.taskModel
      .findOne({ _id: taskId, project: projectId })
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    task.status = updateTaskStatusDto.status;
    const updated = await task.save();
    return await updated.populate([
      { path: 'reporter', select: 'firstName lastName email avatarUrl' },
      { path: 'assignee', select: 'firstName lastName email avatarUrl' },
    ]);
  }

  async remove(
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<{ message: string; id: string }> {
    await this.checkProjectAccess(projectId, userId);

    const deleted = await this.taskModel
      .findOneAndDelete({ _id: taskId, project: projectId })
      .exec();

    if (!deleted) {
      throw new NotFoundException('Task not found');
    }

    return { message: 'Task deleted successfully', id: taskId };
  }
}
