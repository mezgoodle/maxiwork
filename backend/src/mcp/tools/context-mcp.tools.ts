import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from '../../tasks/schemas/task.schema';
import { StatusCategory } from '../../hierarchy/enums/status-category.enum';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { McpToolsRegistryService } from '../mcp-tools-registry.service';
import { McpToolsHelper } from './mcp-tools.helper';

@Injectable()
export class ContextMcpToolsService implements OnModuleInit {
  constructor(
    private readonly registry: McpToolsRegistryService,
    private readonly helper: McpToolsHelper,
    private readonly hierarchyService: HierarchyService,
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
  ) {}

  onModuleInit(): void {
    this.registerGetMyTasks();
    this.registerGetWorkspaceSummary();
    this.registerAddTaskComment();
  }

  private registerGetMyTasks(): void {
    this.registry.registerTool({
      name: 'get_my_tasks',
      description:
        'Retrieve tasks assigned to the authenticated user across all accessible workspaces, lists, and projects, optionally filtered by statusCategory.',
      annotations: {
        title: 'Get My Assigned Tasks',
        readOnlyHint: true,
        destructiveHint: false,
      },
      inputSchema: {
        type: 'object',
        properties: {
          statusCategory: {
            type: 'string',
            enum: Object.values(StatusCategory),
            description:
              'Optional workflow status category filter (to_do, in_progress, done, closed)',
          },
          workspaceId: {
            type: 'string',
            description: 'Optional Workspace ID to scope assigned tasks',
          },
          limit: {
            type: 'integer',
            description:
              'Maximum number of tasks to return (default 50, max 100)',
          },
        },
      },
      handler: async (args, userId) => {
        const statusCategoryFilter =
          typeof args.statusCategory === 'string' && args.statusCategory.trim()
            ? (args.statusCategory.trim() as StatusCategory)
            : undefined;
        const workspaceId =
          typeof args.workspaceId === 'string' && args.workspaceId.trim()
            ? args.workspaceId.trim()
            : undefined;
        const rawLimit = typeof args.limit === 'number' ? args.limit : 50;
        const limit = Math.min(Math.max(1, rawLimit), 100);

        const scope = await this.helper.getAccessibleScope(userId, workspaceId);

        const scopeClauses: Record<string, unknown>[] = [];
        if (scope.listIds.length > 0) {
          scopeClauses.push({ list: { $in: scope.listIds } });
        }
        if (!workspaceId && scope.projectIds.length > 0) {
          scopeClauses.push({ project: { $in: scope.projectIds } });
        }

        if (scopeClauses.length === 0) {
          return this.helper.toMcpJsonResult({ total: 0, tasks: [] });
        }

        const userObjId = Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;

        const assignedTasks = await this.taskModel
          .find({
            assignee: userObjId,
            $or: scopeClauses,
          })
          .sort({ dueDate: 1, updatedAt: -1 })
          .populate('reporter', 'firstName lastName email avatarUrl')
          .populate('assignee', 'firstName lastName email avatarUrl')
          .exec();

        const enriched = assignedTasks
          .map((task) => {
            const listId = task.list
              ? this.helper.extractId(task.list)
              : undefined;
            const listDoc = listId ? scope.listById.get(listId) : undefined;
            const spaceDoc = listDoc
              ? scope.spaceById.get(this.helper.extractId(listDoc.spaceId))
              : undefined;
            const workflow = this.helper.getEffectiveWorkflow(
              listDoc,
              spaceDoc,
            );
            const category = this.helper.getStatusCategory(
              task.status,
              workflow,
            );
            return { task, category, listDoc, spaceDoc };
          })
          .filter((item) =>
            statusCategoryFilter
              ? item.category === statusCategoryFilter
              : true,
          )
          .slice(0, limit);

        return this.helper.toMcpJsonResult({
          total: enriched.length,
          tasks: enriched.map(({ task, category, listDoc, spaceDoc }) =>
            this.helper.formatTaskForMcp(task, {
              statusCategory: category,
              listName: listDoc?.name ?? null,
              spaceName: spaceDoc?.name ?? null,
            }),
          ),
        });
      },
    });
  }

  private registerGetWorkspaceSummary(): void {
    this.registry.registerTool({
      name: 'get_workspace_summary',
      description:
        'Generate an aggregated analytics summary of a Workspace: task counts by status category (to_do, in_progress, done, closed), priority breakdown, overdue tasks, upcoming due tasks, and per-space statistics.',
      annotations: {
        title: 'Get Workspace Summary',
        readOnlyHint: true,
        destructiveHint: false,
      },
      inputSchema: {
        type: 'object',
        properties: {
          workspaceId: {
            type: 'string',
            description: 'Workspace ID to summarize',
          },
        },
        required: ['workspaceId'],
      },
      handler: async (args, userId) => {
        const workspaceId = String(args.workspaceId).trim();
        const { workspace, role } =
          await this.hierarchyService.checkWorkspaceAccess(workspaceId, userId);

        const scope = await this.helper.getAccessibleScope(userId, workspaceId);

        const tasks =
          scope.listIds.length > 0
            ? await this.taskModel.find({ list: { $in: scope.listIds } }).exec()
            : [];

        const now = new Date();
        const sevenDaysFromNow = new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000,
        );

        const byStatusCategory: Record<StatusCategory, number> = {
          [StatusCategory.TO_DO]: 0,
          [StatusCategory.IN_PROGRESS]: 0,
          [StatusCategory.DONE]: 0,
          [StatusCategory.CLOSED]: 0,
        };

        const byPriority: Record<string, number> = {
          low: 0,
          medium: 0,
          high: 0,
          urgent: 0,
        };

        let overdueTasksCount = 0;
        let dueSoonTasksCount = 0;
        let unassignedTasksCount = 0;

        const spaceStatsMap = new Map<
          string,
          {
            spaceId: string;
            spaceName: string;
            totalTasks: number;
            openTasks: number;
            completedTasks: number;
            overdueTasks: number;
          }
        >();

        for (const sp of scope.spaces) {
          const spId = this.helper.extractId(sp._id);
          spaceStatsMap.set(spId, {
            spaceId: spId,
            spaceName: sp.name,
            totalTasks: 0,
            openTasks: 0,
            completedTasks: 0,
            overdueTasks: 0,
          });
        }

        for (const task of tasks) {
          const listId = task.list
            ? this.helper.extractId(task.list)
            : undefined;
          const listDoc = listId ? scope.listById.get(listId) : undefined;
          const spaceId = listDoc
            ? this.helper.extractId(listDoc.spaceId)
            : undefined;
          const spaceDoc = spaceId ? scope.spaceById.get(spaceId) : undefined;
          const workflow = this.helper.getEffectiveWorkflow(listDoc, spaceDoc);

          const category = this.helper.getStatusCategory(task.status, workflow);
          byStatusCategory[category] = (byStatusCategory[category] ?? 0) + 1;

          const prio = task.priority || 'medium';
          byPriority[prio] = (byPriority[prio] ?? 0) + 1;

          const isCompleted =
            category === StatusCategory.DONE ||
            category === StatusCategory.CLOSED;

          if (!task.assignee) {
            unassignedTasksCount++;
          }

          let isOverdue = false;
          if (task.dueDate && !isCompleted) {
            const due = new Date(task.dueDate);
            if (due < now) {
              overdueTasksCount++;
              isOverdue = true;
            } else if (due <= sevenDaysFromNow) {
              dueSoonTasksCount++;
            }
          }

          if (spaceId && spaceStatsMap.has(spaceId)) {
            const st = spaceStatsMap.get(spaceId)!;
            st.totalTasks++;
            if (isCompleted) {
              st.completedTasks++;
            } else {
              st.openTasks++;
            }
            if (isOverdue) {
              st.overdueTasks++;
            }
          }
        }

        return this.helper.toMcpJsonResult({
          workspace: {
            id: this.helper.extractId(workspace._id),
            name: workspace.name,
            slug: workspace.slug,
            userRole: role,
          },
          counts: {
            spacesCount: scope.spaces.length,
            listsCount: scope.lists.length,
            totalTasks: tasks.length,
            openTasks:
              byStatusCategory[StatusCategory.TO_DO] +
              byStatusCategory[StatusCategory.IN_PROGRESS],
            completedTasks:
              byStatusCategory[StatusCategory.DONE] +
              byStatusCategory[StatusCategory.CLOSED],
            overdueTasksCount,
            dueSoonTasksCount,
            unassignedTasksCount,
          },
          byStatusCategory,
          byPriority,
          spacesBreakdown: Array.from(spaceStatsMap.values()),
        });
      },
    });
  }

  private registerAddTaskComment(): void {
    this.registry.registerTool({
      name: 'add_task_comment',
      description:
        'Add a progress comment or activity note to a task (by MongoDB ObjectId or taskKey).',
      annotations: {
        title: 'Add Task Comment',
        readOnlyHint: false,
        destructiveHint: false,
      },
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'Task MongoDB ObjectId or taskKey (e.g. "GEN-1")',
          },
          content: {
            type: 'string',
            description: 'Markdown or plain-text comment body',
          },
        },
        required: ['taskId', 'content'],
      },
      handler: async (args, userId) => {
        const taskIdInput = String(args.taskId).trim();
        const content = String(args.content).trim();
        if (!content) {
          throw new BadRequestException('Comment content cannot be empty');
        }

        const resolved = await this.helper.resolveAccessibleTask(
          taskIdInput,
          userId,
        );
        const task = resolved.task;

        const commentId = new Types.ObjectId();
        const createdAt = new Date();
        const authorObjId = Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : (userId as unknown as Types.ObjectId);

        if (!Array.isArray(task.comments)) {
          task.comments = [];
        }
        task.comments.push({
          _id: commentId,
          author: authorObjId,
          content,
          createdAt,
        });

        await task.save();

        const populated = await this.taskModel
          .findById(task._id)
          .populate('comments.author', 'firstName lastName email avatarUrl')
          .exec();

        const savedComments = populated?.comments ?? task.comments;
        const addedComment =
          savedComments.find(
            (c) => this.helper.extractId(c._id) === commentId.toString(),
          ) ?? savedComments[savedComments.length - 1];

        return this.helper.toMcpJsonResult({
          taskId: this.helper.extractId(task._id),
          taskKey: task.taskKey,
          commentsCount: savedComments.length,
          comment: this.helper.formatComment(addedComment),
        });
      },
    });
  }
}
