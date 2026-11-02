import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from '../../tasks/schemas/task.schema';
import { TaskPriority } from '../../tasks/enums/task-priority.enum';
import { TasksService } from '../../tasks/tasks.service';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { isStatusDone } from '../../hierarchy/schemas/status-workflow.schema';
import { McpToolsRegistryService } from '../mcp-tools-registry.service';
import { McpToolsHelper } from './mcp-tools.helper';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class TaskMcpToolsService implements OnModuleInit {
  constructor(
    private readonly registry: McpToolsRegistryService,
    private readonly helper: McpToolsHelper,
    private readonly hierarchyService: HierarchyService,
    private readonly tasksService: TasksService,
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
  ) {}

  onModuleInit(): void {
    this.registerCreateTask();
    this.registerUpdateTask();
    this.registerGetTask();
    this.registerSearchTasks();
    this.registerDeleteTask();
    this.registerSetTaskStatus();
  }

  private registerCreateTask(): void {
    this.registry.registerTool({
      name: 'create_task',
      description:
        'Create a new task or subtask inside a MaxiWork list. Supports smart status matching by status ID, name, or category.',
      annotations: {
        title: 'Create Task',
        readOnlyHint: false,
        destructiveHint: false,
      },
      inputSchema: {
        type: 'object',
        properties: {
          listId: {
            type: 'string',
            description: 'ID of the target list where the task will be created',
          },
          title: {
            type: 'string',
            description: 'Title of the task',
          },
          description: {
            type: 'string',
            description: 'Detailed description of the task',
          },
          priority: {
            type: 'string',
            enum: Object.values(TaskPriority),
            description: 'Task priority (low, medium, high, urgent)',
          },
          status: {
            type: 'string',
            description:
              'Optional status ID, status name, or category (to_do, in_progress, done, closed)',
          },
          startDate: {
            type: 'string',
            description: 'Optional start date in ISO 8601 format',
          },
          dueDate: {
            type: 'string',
            description: 'Optional due date in ISO 8601 format',
          },
          assigneeId: {
            type: 'string',
            description: 'Optional User ID of the assignee',
          },
          parentTaskId: {
            type: 'string',
            description:
              'Optional parent task ID or taskKey (e.g. "GEN-1") to create this task as a subtask',
          },
        },
        required: ['listId', 'title'],
      },
      handler: async (args, userId) => {
        const listId = String(args.listId).trim();
        const title = String(args.title).trim();
        const description =
          typeof args.description === 'string' ? args.description : undefined;
        const priority =
          typeof args.priority === 'string'
            ? (args.priority as TaskPriority)
            : undefined;
        const statusInput =
          typeof args.status === 'string' ? args.status.trim() : undefined;
        const startDate =
          typeof args.startDate === 'string' ? args.startDate : undefined;
        const dueDate =
          typeof args.dueDate === 'string' ? args.dueDate : undefined;
        const assigneeId =
          typeof args.assigneeId === 'string'
            ? args.assigneeId.trim()
            : undefined;
        const parentTaskIdInput =
          typeof args.parentTaskId === 'string'
            ? args.parentTaskId.trim()
            : undefined;

        const { list, space } = await this.hierarchyService.checkListAccess(
          listId,
          userId,
        );
        const workflow = this.helper.getEffectiveWorkflow(list, space);
        const resolvedStatus = statusInput
          ? this.helper.resolveWorkflowStatus(statusInput, workflow)
          : undefined;

        if (parentTaskIdInput) {
          const parentResolved = await this.helper.resolveAccessibleTask(
            parentTaskIdInput,
            userId,
          );
          if (parentResolved.listId !== listId) {
            throw new BadRequestException(
              `Parent task '${parentTaskIdInput}' does not belong to list '${listId}'`,
            );
          }
          const parentId = this.helper.extractId(parentResolved.task._id);
          let subtask = await this.hierarchyService.createListSubtask(
            listId,
            parentId,
            {
              title,
              description,
              priority,
              assignee: assigneeId,
              startDate,
              dueDate,
            },
            userId,
          );

          if (resolvedStatus && resolvedStatus !== subtask.status) {
            subtask = await this.hierarchyService.updateListTask(
              listId,
              this.helper.extractId(subtask._id),
              { status: resolvedStatus },
              userId,
            );
          }

          return this.helper.toMcpJsonResult(
            this.helper.formatTaskForMcp(subtask),
          );
        }

        const created = await this.hierarchyService.createListTask(
          listId,
          {
            title,
            description,
            priority,
            status: resolvedStatus,
            assignee: assigneeId,
            startDate,
            dueDate,
          },
          userId,
        );

        return this.helper.toMcpJsonResult(
          this.helper.formatTaskForMcp(created),
        );
      },
    });
  }

  private registerUpdateTask(): void {
    this.registry.registerTool({
      name: 'update_task',
      description:
        'Update fields on an existing task identified by its MongoDB ObjectId or taskKey (e.g. "GEN-1").',
      annotations: {
        title: 'Update Task',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'Task MongoDB ObjectId or taskKey (e.g. "GEN-1")',
          },
          title: {
            type: 'string',
            description: 'Updated task title',
          },
          description: {
            type: 'string',
            description: 'Updated task description',
          },
          priority: {
            type: 'string',
            enum: Object.values(TaskPriority),
            description: 'Updated task priority (low, medium, high, urgent)',
          },
          status: {
            type: 'string',
            description:
              'Updated status ID, status name, or category (to_do, in_progress, done, closed)',
          },
          startDate: {
            type: 'string',
            description: 'Updated start date in ISO 8601 format',
          },
          dueDate: {
            type: 'string',
            description: 'Updated due date in ISO 8601 format',
          },
          assigneeId: {
            type: 'string',
            description: 'Updated assignee User ID',
          },
          customFieldValues: {
            type: 'object',
            description: 'Custom field key-value updates',
          },
        },
        required: ['taskId'],
      },
      handler: async (args, userId) => {
        const taskIdInput = String(args.taskId).trim();
        const resolved = await this.helper.resolveAccessibleTask(
          taskIdInput,
          userId,
        );
        const actualTaskId = this.helper.extractId(resolved.task._id);

        const resolvedStatus =
          typeof args.status === 'string' && args.status.trim()
            ? this.helper.resolveWorkflowStatus(args.status, resolved.workflow)
            : undefined;

        const updateDto = {
          ...(typeof args.title === 'string' ? { title: args.title } : {}),
          ...(typeof args.description === 'string'
            ? { description: args.description }
            : {}),
          ...(typeof args.priority === 'string'
            ? { priority: args.priority as TaskPriority }
            : {}),
          ...(resolvedStatus !== undefined ? { status: resolvedStatus } : {}),
          ...(typeof args.startDate === 'string'
            ? { startDate: args.startDate }
            : {}),
          ...(typeof args.dueDate === 'string'
            ? { dueDate: args.dueDate }
            : {}),
          ...(typeof args.assigneeId === 'string'
            ? { assignee: args.assigneeId }
            : {}),
          ...(args.customFieldValues &&
          typeof args.customFieldValues === 'object' &&
          !Array.isArray(args.customFieldValues)
            ? {
                customFieldValues: args.customFieldValues as Record<
                  string,
                  unknown
                >,
              }
            : {}),
        };

        if (resolved.listId) {
          const updated = await this.hierarchyService.updateListTask(
            resolved.listId,
            actualTaskId,
            updateDto,
            userId,
          );
          return this.helper.toMcpJsonResult(
            this.helper.formatTaskForMcp(updated),
          );
        }

        if (resolved.projectId) {
          const updated = await this.tasksService.update(
            resolved.projectId,
            actualTaskId,
            updateDto,
            userId,
          );
          return this.helper.toMcpJsonResult(
            this.helper.formatTaskForMcp(updated),
          );
        }

        throw new BadRequestException('Task has no associated list or project');
      },
    });
  }

  private registerGetTask(): void {
    this.registry.registerTool({
      name: 'get_task',
      description:
        'Retrieve full details of a task (by ID or taskKey), including subtasks, comments, custom fields, and available workflow statuses.',
      annotations: {
        title: 'Get Task Details',
        readOnlyHint: true,
        destructiveHint: false,
      },
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'Task MongoDB ObjectId or taskKey (e.g. "GEN-1")',
          },
        },
        required: ['taskId'],
      },
      handler: async (args, userId) => {
        const taskIdInput = String(args.taskId).trim();
        const resolved = await this.helper.resolveAccessibleTask(
          taskIdInput,
          userId,
        );

        const subtasks = await this.taskModel
          .find({ parentTaskId: resolved.task._id })
          .sort({ order: 1, createdAt: 1 })
          .populate('reporter', 'firstName lastName email avatarUrl')
          .populate('assignee', 'firstName lastName email avatarUrl')
          .exec();

        return this.helper.toMcpJsonResult(
          this.helper.formatTaskForMcp(resolved.task, {
            subtasks: subtasks.map((st) => this.helper.formatTaskForMcp(st)),
            workflowStatuses: resolved.workflow.statuses.map((s) => ({
              id: s.id,
              name: s.name,
              category: s.category,
              color: s.color,
            })),
          }),
        );
      },
    });
  }

  private registerSearchTasks(): void {
    this.registry.registerTool({
      name: 'search_tasks',
      description:
        'Search and filter tasks across accessible workspaces, spaces, and lists by text query, status, priority, or assignee.',
      annotations: {
        title: 'Search Tasks',
        readOnlyHint: true,
        destructiveHint: false,
      },
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Optional search text matched against title, description, or taskKey',
          },
          workspaceId: {
            type: 'string',
            description: 'Optional Workspace ID to scope the search',
          },
          spaceId: {
            type: 'string',
            description: 'Optional Space ID to scope the search',
          },
          listId: {
            type: 'string',
            description: 'Optional List ID to scope the search',
          },
          status: {
            type: 'string',
            description:
              'Optional status filter (status ID, status name, or category: to_do, in_progress, done, closed)',
          },
          priority: {
            type: 'string',
            enum: Object.values(TaskPriority),
            description: 'Optional priority filter (low, medium, high, urgent)',
          },
          assigneeId: {
            type: 'string',
            description: 'Optional User ID of the assignee',
          },
          limit: {
            type: 'integer',
            description:
              'Maximum number of tasks to return (default 20, max 100)',
          },
        },
      },
      handler: async (args, userId) => {
        const queryText =
          typeof args.query === 'string' ? args.query.trim() : undefined;
        const workspaceId =
          typeof args.workspaceId === 'string'
            ? args.workspaceId.trim()
            : undefined;
        const spaceId =
          typeof args.spaceId === 'string' ? args.spaceId.trim() : undefined;
        const listId =
          typeof args.listId === 'string' ? args.listId.trim() : undefined;
        const statusFilter =
          typeof args.status === 'string' ? args.status.trim() : undefined;
        const priorityFilter =
          typeof args.priority === 'string' ? args.priority.trim() : undefined;
        const assigneeId =
          typeof args.assigneeId === 'string'
            ? args.assigneeId.trim()
            : undefined;
        const rawLimit = typeof args.limit === 'number' ? args.limit : 20;
        const limit = Math.min(Math.max(1, rawLimit), 100);

        const scope = await this.helper.getAccessibleScope(userId, workspaceId);

        let targetListIds = scope.listIds;
        let includeProjects = !workspaceId && !spaceId && !listId;

        if (spaceId) {
          await this.hierarchyService.checkSpaceAccess(spaceId, userId);
          targetListIds = scope.lists
            .filter((l) => this.helper.extractId(l.spaceId) === spaceId)
            .map((l) => l._id);
          includeProjects = false;
        }

        if (listId) {
          const { list } = await this.hierarchyService.checkListAccess(
            listId,
            userId,
          );
          targetListIds = [list._id];
          includeProjects = false;
        }

        const scopeClauses: Record<string, unknown>[] = [];
        if (targetListIds.length > 0) {
          scopeClauses.push({ list: { $in: targetListIds } });
        }
        if (includeProjects && scope.projectIds.length > 0) {
          scopeClauses.push({ project: { $in: scope.projectIds } });
        }

        if (scopeClauses.length === 0) {
          return this.helper.toMcpJsonResult({ total: 0, tasks: [] });
        }

        const andClauses: Record<string, unknown>[] = [{ $or: scopeClauses }];

        if (priorityFilter) {
          andClauses.push({ priority: priorityFilter });
        }

        if (assigneeId) {
          andClauses.push({
            assignee: Types.ObjectId.isValid(assigneeId)
              ? new Types.ObjectId(assigneeId)
              : assigneeId,
          });
        }

        if (queryText) {
          const escaped = escapeRegex(queryText);
          const regex = { $regex: escaped, $options: 'i' };
          andClauses.push({
            $or: [{ title: regex }, { description: regex }, { taskKey: regex }],
          });
        }

        const tasks = await this.taskModel
          .find(andClauses.length === 1 ? andClauses[0] : { $and: andClauses })
          .sort({ updatedAt: -1, createdAt: -1 })
          .limit(statusFilter ? Math.max(limit * 3, 100) : limit)
          .populate('reporter', 'firstName lastName email avatarUrl')
          .populate('assignee', 'firstName lastName email avatarUrl')
          .exec();

        let filtered = tasks;
        if (statusFilter) {
          const lowerFilter = statusFilter.toLowerCase();
          const normCategory = lowerFilter.replace(/[\s-]+/g, '_');
          filtered = tasks.filter((task) => {
            const taskListId = task.list
              ? this.helper.extractId(task.list)
              : undefined;
            const listDoc = taskListId
              ? scope.listById.get(taskListId)
              : undefined;
            const spaceDoc = listDoc
              ? scope.spaceById.get(this.helper.extractId(listDoc.spaceId))
              : undefined;
            const workflow = this.helper.getEffectiveWorkflow(
              listDoc,
              spaceDoc,
            );

            if ((task.status || '').toLowerCase() === lowerFilter) {
              return true;
            }
            const wfStatus = workflow.statuses.find(
              (s) => s.id.toLowerCase() === (task.status || '').toLowerCase(),
            );
            if (wfStatus && wfStatus.name.toLowerCase() === lowerFilter) {
              return true;
            }
            const cat = this.helper.getStatusCategory(task.status, workflow);
            if (
              String(cat) === normCategory ||
              (normCategory === 'todo' && String(cat) === 'to_do')
            ) {
              return true;
            }
            return false;
          });
        }

        const sliced = filtered.slice(0, limit);
        return this.helper.toMcpJsonResult({
          total: sliced.length,
          tasks: sliced.map((t) => this.helper.formatTaskForMcp(t)),
        });
      },
    });
  }

  private registerDeleteTask(): void {
    this.registry.registerTool({
      name: 'delete_task',
      description:
        'Delete a task (by MongoDB ObjectId or taskKey) and all of its nested subtasks.',
      annotations: {
        title: 'Delete Task',
        readOnlyHint: false,
        destructiveHint: true,
      },
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'Task MongoDB ObjectId or taskKey (e.g. "GEN-1")',
          },
        },
        required: ['taskId'],
      },
      handler: async (args, userId) => {
        const taskIdInput = String(args.taskId).trim();
        const resolved = await this.helper.resolveAccessibleTask(
          taskIdInput,
          userId,
        );
        const task = resolved.task;
        const actualId = this.helper.extractId(task._id);

        if (task.parentTaskId) {
          const isDone = isStatusDone(task.status, resolved.workflow);
          const parentId = this.helper.extractId(task.parentTaskId);
          await this.taskModel
            .updateOne(
              {
                _id: Types.ObjectId.isValid(parentId)
                  ? new Types.ObjectId(parentId)
                  : parentId,
              },
              {
                $inc: {
                  subtasksCount: -1,
                  completedSubtasksCount: isDone ? -1 : 0,
                },
              },
            )
            .exec();
        }

        const deleteDescendants = async (
          parentIds: Types.ObjectId[],
        ): Promise<void> => {
          if (parentIds.length === 0) return;
          const children = await this.taskModel
            .find({ parentTaskId: { $in: parentIds } })
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

        return this.helper.toMcpJsonResult({
          deleted: true,
          id: actualId,
          taskKey: task.taskKey,
          title: task.title,
        });
      },
    });
  }

  private registerSetTaskStatus(): void {
    this.registry.registerTool({
      name: 'set_task_status',
      description:
        'Transition a task (by ID or taskKey) to a new status using smart workflow matching (status ID, status name, or category: to_do, in_progress, done, closed).',
      annotations: {
        title: 'Set Task Status',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'Task MongoDB ObjectId or taskKey (e.g. "GEN-1")',
          },
          status: {
            type: 'string',
            description:
              'Target status ID, status name (e.g. "In Progress"), or category (to_do, in_progress, done, closed)',
          },
        },
        required: ['taskId', 'status'],
      },
      handler: async (args, userId) => {
        const taskIdInput = String(args.taskId).trim();
        const statusInput = String(args.status).trim();

        const resolved = await this.helper.resolveAccessibleTask(
          taskIdInput,
          userId,
        );
        const actualId = this.helper.extractId(resolved.task._id);
        const targetStatusId = this.helper.resolveWorkflowStatus(
          statusInput,
          resolved.workflow,
        );

        if (resolved.listId) {
          const updated = await this.hierarchyService.updateListTask(
            resolved.listId,
            actualId,
            { status: targetStatusId },
            userId,
          );
          return this.helper.toMcpJsonResult(
            this.helper.formatTaskForMcp(updated),
          );
        }

        if (resolved.projectId) {
          const updated = await this.tasksService.updateStatus(
            resolved.projectId,
            actualId,
            { status: targetStatusId },
            userId,
          );
          return this.helper.toMcpJsonResult(
            this.helper.formatTaskForMcp(updated),
          );
        }

        throw new BadRequestException('Task has no associated list or project');
      },
    });
  }
}
