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
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { MoveSubtaskDto } from './dto/move-subtask.dto';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';

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

  private toObjectId(id: unknown): Types.ObjectId | string {
    const str = this.extractId(id);
    return Types.ObjectId.isValid(str) ? new Types.ObjectId(str) : str;
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
      list: createTaskDto.list
        ? new Types.ObjectId(createTaskDto.list)
        : undefined,
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

    if (query.rootOnly) {
      filter.parentTaskId = null;
    }

    if (query.listId) {
      filter.list = new Types.ObjectId(query.listId);
    }

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

    if (
      updateTaskDto.status !== undefined &&
      updateTaskDto.status !== task.status
    ) {
      const prevStatus = task.status;
      const newStatus = updateTaskDto.status;
      task.status = newStatus;

      if (task.parentTaskId) {
        let inc = 0;
        if (prevStatus !== TaskStatus.DONE && newStatus === TaskStatus.DONE) {
          inc = 1;
        } else if (
          prevStatus === TaskStatus.DONE &&
          newStatus !== TaskStatus.DONE
        ) {
          inc = -1;
        }
        if (inc !== 0) {
          await this.taskModel
            .updateOne(
              { _id: this.extractId(task.parentTaskId) },
              { $inc: { completedSubtasksCount: inc } },
            )
            .exec();
        }
      }
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

    if (updateTaskDto.list !== undefined) {
      task.list = updateTaskDto.list
        ? new Types.ObjectId(updateTaskDto.list)
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

    const prevStatus = task.status;
    const newStatus = updateTaskStatusDto.status;

    if (prevStatus !== newStatus) {
      task.status = newStatus;
      if (task.parentTaskId) {
        let inc = 0;
        if (prevStatus !== TaskStatus.DONE && newStatus === TaskStatus.DONE) {
          inc = 1;
        } else if (
          prevStatus === TaskStatus.DONE &&
          newStatus !== TaskStatus.DONE
        ) {
          inc = -1;
        }
        if (inc !== 0) {
          await this.taskModel
            .updateOne(
              { _id: this.extractId(task.parentTaskId) },
              { $inc: { completedSubtasksCount: inc } },
            )
            .exec();
        }
      }
    }

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

    const task = await this.taskModel
      .findOne({ _id: taskId, project: projectId })
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Rollup decrement on parent if this task is a subtask
    if (task.parentTaskId) {
      const isDone = task.status === TaskStatus.DONE;
      await this.taskModel
        .updateOne(
          { _id: this.toObjectId(task.parentTaskId) },
          {
            $inc: {
              subtasksCount: -1,
              completedSubtasksCount: isDone ? -1 : 0,
            },
          },
        )
        .exec();
    }

    // Cascade delete all descendants
    const deleteDescendants = async (
      parentIds: (Types.ObjectId | string)[],
    ): Promise<void> => {
      if (parentIds.length === 0) return;
      const children = await this.taskModel
        .find({ project: projectId, parentTaskId: { $in: parentIds } })
        .select('_id')
        .lean()
        .exec();
      if (children.length > 0) {
        const childIds = children.map((c) => c._id);
        await deleteDescendants(childIds);
        await this.taskModel.deleteMany({ _id: { $in: childIds } }).exec();
      }
    };

    await deleteDescendants([task._id]);
    await this.taskModel.deleteOne({ _id: task._id }).exec();

    return { message: 'Task deleted successfully', id: taskId };
  }

  async createSubtask(
    projectId: string,
    parentTaskId: string,
    createSubtaskDto: CreateSubtaskDto,
    userId: string,
  ): Promise<TaskDocument> {
    const project = await this.checkProjectAccess(projectId, userId);

    const parent = await this.taskModel
      .findOne({ _id: parentTaskId, project: projectId })
      .exec();

    if (!parent) {
      throw new NotFoundException('Parent task not found');
    }

    if (createSubtaskDto.assignee) {
      this.assertAssigneeInProject(project, createSubtaskDto.assignee);
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

    const order =
      createSubtaskDto.order !== undefined
        ? createSubtaskDto.order
        : parent.subtasksCount || 0;

    const subtask = new this.taskModel({
      ...createSubtaskDto,
      project: projectId,
      list: parent.list,
      parentTaskId: new Types.ObjectId(parentTaskId),
      reporter: userId,
      taskKey,
      status: TaskStatus.TODO,
      priority: createSubtaskDto.priority || TaskPriority.MEDIUM,
      order,
      subtasksCount: 0,
      completedSubtasksCount: 0,
      assignee: createSubtaskDto.assignee
        ? new Types.ObjectId(createSubtaskDto.assignee)
        : undefined,
      startDate: createSubtaskDto.startDate
        ? new Date(createSubtaskDto.startDate)
        : undefined,
      dueDate: createSubtaskDto.dueDate
        ? new Date(createSubtaskDto.dueDate)
        : undefined,
    });

    const saved = await subtask.save();

    await this.taskModel
      .updateOne({ _id: parentTaskId }, { $inc: { subtasksCount: 1 } })
      .exec();

    return await saved.populate([
      { path: 'reporter', select: 'firstName lastName email avatarUrl' },
      { path: 'assignee', select: 'firstName lastName email avatarUrl' },
    ]);
  }

  async findSubtasks(
    projectId: string,
    parentTaskId: string,
    userId: string,
  ): Promise<TaskDocument[]> {
    await this.checkProjectAccess(projectId, userId);

    const parent = await this.taskModel
      .findOne({ _id: parentTaskId, project: projectId })
      .exec();

    if (!parent) {
      throw new NotFoundException('Parent task not found');
    }

    return await this.taskModel
      .find({
        project: projectId,
        parentTaskId: new Types.ObjectId(parentTaskId),
      })
      .sort({ order: 1, createdAt: 1 })
      .populate('reporter', 'firstName lastName email avatarUrl')
      .populate('assignee', 'firstName lastName email avatarUrl')
      .exec();
  }

  async getTaskTree(
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<Record<string, unknown>> {
    await this.checkProjectAccess(projectId, userId);

    const rootTask = await this.taskModel
      .findOne({ _id: taskId, project: projectId })
      .populate('reporter', 'firstName lastName email avatarUrl')
      .populate('assignee', 'firstName lastName email avatarUrl')
      .lean()
      .exec();

    if (!rootTask) {
      throw new NotFoundException('Task not found');
    }

    const buildTree = async (
      node: Record<string, unknown>,
    ): Promise<Record<string, unknown>> => {
      const parentId = this.toObjectId(node._id);
      const subtasks = await this.taskModel
        .find({
          project: projectId,
          parentTaskId: parentId,
        })
        .sort({ order: 1, createdAt: 1 })
        .populate('reporter', 'firstName lastName email avatarUrl')
        .populate('assignee', 'firstName lastName email avatarUrl')
        .lean()
        .exec();

      const children = await Promise.all(
        subtasks.map((child) =>
          buildTree(child as unknown as Record<string, unknown>),
        ),
      );

      return {
        ...node,
        subtasks: children,
      };
    };

    return await buildTree(rootTask as unknown as Record<string, unknown>);
  }

  async moveSubtask(
    projectId: string,
    taskId: string,
    moveSubtaskDto: MoveSubtaskDto,
    userId: string,
  ): Promise<TaskDocument> {
    await this.checkProjectAccess(projectId, userId);

    const task = await this.taskModel
      .findOne({ _id: taskId, project: projectId })
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (moveSubtaskDto.order !== undefined) {
      task.order = moveSubtaskDto.order;
    }

    if (moveSubtaskDto.newParentTaskId !== undefined) {
      const oldParentId = task.parentTaskId
        ? this.extractId(task.parentTaskId)
        : null;
      const newParentId = moveSubtaskDto.newParentTaskId
        ? moveSubtaskDto.newParentTaskId.toString()
        : null;

      if (oldParentId !== newParentId) {
        const isDone = task.status === TaskStatus.DONE;

        if (newParentId !== null) {
          if (newParentId === taskId) {
            throw new BadRequestException('A task cannot be its own parent');
          }

          let curr: TaskDocument | null = await this.taskModel
            .findOne({ _id: newParentId, project: projectId })
            .exec();

          if (!curr) {
            throw new NotFoundException('New parent task not found');
          }

          task.list = curr.list;

          // Prevent circular reference
          while (curr) {
            if (this.extractId(curr._id) === taskId) {
              throw new BadRequestException(
                'Cannot move a task into its own descendant',
              );
            }
            if (!curr.parentTaskId) break;
            curr = await this.taskModel.findById(curr.parentTaskId).exec();
          }

          // Adjust old parent counters
          if (oldParentId) {
            await this.taskModel
              .updateOne(
                { _id: oldParentId },
                {
                  $inc: {
                    subtasksCount: -1,
                    completedSubtasksCount: isDone ? -1 : 0,
                  },
                },
              )
              .exec();
          }

          // Adjust new parent counters
          await this.taskModel
            .updateOne(
              { _id: newParentId },
              {
                $inc: {
                  subtasksCount: 1,
                  completedSubtasksCount: isDone ? 1 : 0,
                },
              },
            )
            .exec();

          task.parentTaskId = new Types.ObjectId(newParentId);
        } else {
          // Becoming a root task
          if (oldParentId) {
            await this.taskModel
              .updateOne(
                { _id: oldParentId },
                {
                  $inc: {
                    subtasksCount: -1,
                    completedSubtasksCount: isDone ? -1 : 0,
                  },
                },
              )
              .exec();
          }

          task.parentTaskId = undefined;
        }
      }
    }

    const updated = await task.save();
    return await updated.populate([
      { path: 'reporter', select: 'firstName lastName email avatarUrl' },
      { path: 'assignee', select: 'firstName lastName email avatarUrl' },
    ]);
  }
}
