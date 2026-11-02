import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Task,
  TaskComment,
  TaskDocument,
  extractPlainCustomFieldValues,
} from '../../tasks/schemas/task.schema';
import {
  Workspace,
  WorkspaceDocument,
} from '../../hierarchy/schemas/workspace.schema';
import { Space, SpaceDocument } from '../../hierarchy/schemas/space.schema';
import { Folder, FolderDocument } from '../../hierarchy/schemas/folder.schema';
import { List, ListDocument } from '../../hierarchy/schemas/list.schema';
import {
  Project,
  ProjectDocument,
} from '../../projects/schemas/project.schema';
import { WorkspaceRole } from '../../hierarchy/enums/workspace-role.enum';
import { StatusCategory } from '../../hierarchy/enums/status-category.enum';
import {
  StatusWorkflow,
  createDefaultStatusWorkflow,
} from '../../hierarchy/schemas/status-workflow.schema';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { TasksService } from '../../tasks/tasks.service';
import { McpToolExecutionResult } from '../mcp-tools-registry.service';

export interface ResolvedAccessibleTask {
  task: TaskDocument;
  listId?: string;
  projectId?: string;
  list?: ListDocument;
  space?: SpaceDocument;
  workflow: StatusWorkflow;
}

export interface AccessibleScope {
  workspaces: WorkspaceDocument[];
  spaces: SpaceDocument[];
  lists: ListDocument[];
  projects: ProjectDocument[];
  workspaceIds: Types.ObjectId[];
  spaceIds: Types.ObjectId[];
  listIds: Types.ObjectId[];
  projectIds: Types.ObjectId[];
  spaceById: Map<string, SpaceDocument>;
  listById: Map<string, ListDocument>;
}

@Injectable()
export class McpToolsHelper {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(Workspace.name)
    private readonly workspaceModel: Model<WorkspaceDocument>,
    @InjectModel(Space.name)
    private readonly spaceModel: Model<SpaceDocument>,
    @InjectModel(Folder.name)
    private readonly folderModel: Model<FolderDocument>,
    @InjectModel(List.name)
    private readonly listModel: Model<ListDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    private readonly hierarchyService: HierarchyService,
    private readonly tasksService: TasksService,
  ) {}

  extractId(ref: unknown): string {
    if (!ref) return '';
    if (typeof ref === 'object') {
      if ('_id' in (ref as Record<string, unknown>)) {
        return String((ref as { _id: unknown })._id);
      }
      if ('id' in (ref as Record<string, unknown>)) {
        return String((ref as { id: unknown }).id);
      }
      if (typeof (ref as { toString?: unknown }).toString === 'function') {
        return (ref as { toString(): string }).toString();
      }
    }
    return typeof ref === 'string' ? ref : '';
  }

  formatUserRef(ref: unknown): Record<string, unknown> | string | null {
    if (!ref) return null;
    if (typeof ref === 'object' && ref !== null) {
      const rec = ref as Record<string, unknown>;
      if ('email' in rec || 'firstName' in rec || 'lastName' in rec) {
        const id = this.extractId(rec);
        const firstName =
          typeof rec.firstName === 'string' ? rec.firstName : '';
        const lastName = typeof rec.lastName === 'string' ? rec.lastName : '';
        const fullName = `${firstName} ${lastName}`.trim();
        return {
          id,
          ...(fullName ? { name: fullName } : {}),
          ...(typeof rec.firstName === 'string'
            ? { firstName: rec.firstName }
            : {}),
          ...(typeof rec.lastName === 'string'
            ? { lastName: rec.lastName }
            : {}),
          ...(typeof rec.email === 'string' ? { email: rec.email } : {}),
        };
      }
    }
    const id = this.extractId(ref);
    return id || null;
  }

  formatComment(comment: TaskComment): Record<string, unknown> {
    return {
      id: this.extractId(comment._id),
      author: this.formatUserRef(comment.author),
      content: comment.content,
      createdAt:
        comment.createdAt instanceof Date
          ? comment.createdAt.toISOString()
          : comment.createdAt,
    };
  }

  formatTaskForMcp(
    task: TaskDocument | (Task & { _id?: unknown }),
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const raw =
      typeof (task as { toObject?: unknown }).toObject === 'function'
        ? ((task as TaskDocument).toObject() as unknown as Record<
            string,
            unknown
          >)
        : (task as unknown as Record<string, unknown>);

    const id = this.extractId(raw._id ?? raw.id);
    const listId = raw.list ? this.extractId(raw.list) : null;
    const projectId = raw.project ? this.extractId(raw.project) : null;
    const parentTaskId = raw.parentTaskId
      ? this.extractId(raw.parentTaskId)
      : null;

    const rawComments = Array.isArray(raw.comments)
      ? (raw.comments as TaskComment[])
      : [];

    return {
      id,
      taskKey: raw.taskKey,
      title: raw.title,
      description: raw.description ?? '',
      status: raw.status,
      priority: raw.priority,
      listId,
      projectId,
      parentTaskId,
      subtasksCount: raw.subtasksCount ?? 0,
      completedSubtasksCount: raw.completedSubtasksCount ?? 0,
      startDate:
        raw.startDate instanceof Date
          ? raw.startDate.toISOString()
          : (raw.startDate ?? null),
      dueDate:
        raw.dueDate instanceof Date
          ? raw.dueDate.toISOString()
          : (raw.dueDate ?? null),
      assignee: this.formatUserRef(raw.assignee),
      reporter: this.formatUserRef(raw.reporter),
      isRecurring: Boolean(raw.isRecurring),
      recurrence: raw.recurrence ?? null,
      customFieldValues: extractPlainCustomFieldValues(raw.customFieldValues),
      comments: rawComments.map((c) => this.formatComment(c)),
      createdAt:
        raw.createdAt instanceof Date
          ? raw.createdAt.toISOString()
          : (raw.createdAt ?? null),
      updatedAt:
        raw.updatedAt instanceof Date
          ? raw.updatedAt.toISOString()
          : (raw.updatedAt ?? null),
      ...extra,
    };
  }

  toMcpJsonResult(data: unknown): McpToolExecutionResult {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  getEffectiveWorkflow(
    list?: ListDocument | List | null,
    space?: SpaceDocument | Space | null,
  ): StatusWorkflow {
    if (list?.statusWorkflow?.statuses?.length) {
      return list.statusWorkflow;
    }
    if (space?.statusWorkflow?.statuses?.length) {
      return space.statusWorkflow;
    }
    return createDefaultStatusWorkflow();
  }

  resolveWorkflowStatus(inputStatus: string, workflow: StatusWorkflow): string {
    const trimmed = inputStatus.trim();
    const statuses = workflow?.statuses?.length
      ? workflow.statuses
      : createDefaultStatusWorkflow().statuses;

    // 1. Exact status.id match (case-insensitive)
    const byId = statuses.find(
      (s) => s.id.toLowerCase() === trimmed.toLowerCase(),
    );
    if (byId) return byId.id;

    // 2. Exact status.name match (case-insensitive)
    const byName = statuses.find(
      (s) => s.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (byName) return byName.id;

    // 3. Category alias match (e.g., "todo", "to_do", "in_progress", "done", "closed")
    const normalizedCategory = trimmed.toLowerCase().replace(/[\s-]+/g, '_');
    if (normalizedCategory === 'todo' || normalizedCategory === 'to_do') {
      if (workflow.defaultTodoStatusId) {
        const defTodo = statuses.find(
          (s) =>
            s.id.toLowerCase() === workflow.defaultTodoStatusId.toLowerCase(),
        );
        if (defTodo) return defTodo.id;
      }
      const firstTodo = statuses.find(
        (s) => s.category === StatusCategory.TO_DO,
      );
      if (firstTodo) return firstTodo.id;
    }

    if (normalizedCategory === 'in_progress') {
      const firstInProgress = statuses.find(
        (s) => s.category === StatusCategory.IN_PROGRESS,
      );
      if (firstInProgress) return firstInProgress.id;
    }

    if (normalizedCategory === 'done') {
      if (workflow.defaultDoneStatusId) {
        const defDone = statuses.find(
          (s) =>
            s.id.toLowerCase() === workflow.defaultDoneStatusId.toLowerCase(),
        );
        if (defDone) return defDone.id;
      }
      const firstDone = statuses.find(
        (s) =>
          s.category === StatusCategory.DONE ||
          s.category === StatusCategory.CLOSED,
      );
      if (firstDone) return firstDone.id;
    }

    if (normalizedCategory === 'closed') {
      const firstClosed = statuses.find(
        (s) => s.category === StatusCategory.CLOSED,
      );
      if (firstClosed) return firstClosed.id;
      if (workflow.defaultDoneStatusId) {
        const defDone = statuses.find(
          (s) =>
            s.id.toLowerCase() === workflow.defaultDoneStatusId.toLowerCase(),
        );
        if (defDone) return defDone.id;
      }
    }

    const validChoices = statuses
      .map((s) => `${s.id} ("${s.name}", category: ${s.category})`)
      .join(', ');
    throw new BadRequestException(
      `Invalid status '${inputStatus}'. Valid workflow statuses are: ${validChoices}`,
    );
  }

  getStatusCategory(
    statusId: string,
    workflow: StatusWorkflow,
  ): StatusCategory {
    const normalized = (statusId || '').trim().toLowerCase();
    const statuses = workflow?.statuses?.length
      ? workflow.statuses
      : createDefaultStatusWorkflow().statuses;

    const match = statuses.find(
      (s) =>
        s.id.toLowerCase() === normalized ||
        s.name.trim().toLowerCase() === normalized,
    );
    if (match) return match.category;

    if (normalized === 'done' || normalized === 'completed') {
      return StatusCategory.DONE;
    }
    if (normalized === 'closed') {
      return StatusCategory.CLOSED;
    }
    if (normalized === 'in_progress' || normalized === 'in-progress') {
      return StatusCategory.IN_PROGRESS;
    }
    return StatusCategory.TO_DO;
  }

  async getAccessibleScope(
    userId: string,
    filterWorkspaceId?: string,
  ): Promise<AccessibleScope> {
    const userObjId = Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : userId;

    let workspaces: WorkspaceDocument[];
    if (filterWorkspaceId) {
      const { workspace } = await this.hierarchyService.checkWorkspaceAccess(
        filterWorkspaceId,
        userId,
      );
      workspaces = [workspace];
    } else {
      workspaces = await this.workspaceModel
        .find({
          $or: [{ owner: userObjId }, { 'members.user': userObjId }],
        })
        .exec();
    }

    const workspaceIds = workspaces.map((w) => w._id);
    const adminWorkspaceIds = new Set<string>();
    for (const ws of workspaces) {
      const ownerId = this.extractId(ws.owner);
      if (ownerId === userId.toString()) {
        adminWorkspaceIds.add(this.extractId(ws._id));
        continue;
      }
      const member = (ws.members || []).find(
        (m) => this.extractId(m.user) === userId.toString(),
      );
      if (
        member &&
        (member.role === WorkspaceRole.OWNER ||
          member.role === WorkspaceRole.ADMIN)
      ) {
        adminWorkspaceIds.add(this.extractId(ws._id));
      }
    }

    const allSpaces =
      workspaceIds.length > 0
        ? await this.spaceModel
            .find({ workspaceId: { $in: workspaceIds } })
            .sort({ order: 1, createdAt: 1 })
            .exec()
        : [];

    const spaces = allSpaces.filter((sp) => {
      if (!sp.isPrivate) return true;
      const wsId = this.extractId(sp.workspaceId);
      if (adminWorkspaceIds.has(wsId)) return true;
      return (sp.members || []).some(
        (m) => this.extractId(m) === userId.toString(),
      );
    });

    const spaceIds = spaces.map((s) => s._id);
    const spaceById = new Map<string, SpaceDocument>();
    for (const sp of spaces) {
      spaceById.set(this.extractId(sp._id), sp);
    }

    const lists =
      spaceIds.length > 0
        ? await this.listModel
            .find({ spaceId: { $in: spaceIds } })
            .sort({ order: 1, createdAt: 1 })
            .exec()
        : [];

    const listIds = lists.map((l) => l._id);
    const listById = new Map<string, ListDocument>();
    for (const l of lists) {
      listById.set(this.extractId(l._id), l);
    }

    const projects = filterWorkspaceId
      ? []
      : await this.projectModel
          .find({
            $or: [{ owner: userObjId }, { members: userObjId }],
          })
          .exec();

    const projectIds = projects.map((p) => p._id);

    return {
      workspaces,
      spaces,
      lists,
      projects,
      workspaceIds,
      spaceIds,
      listIds,
      projectIds,
      spaceById,
      listById,
    };
  }

  async resolveAccessibleTask(
    taskIdOrKey: string,
    userId: string,
  ): Promise<ResolvedAccessibleTask> {
    const trimmed = taskIdOrKey.trim();
    if (!trimmed) {
      throw new BadRequestException('Task ID or taskKey is required');
    }

    let task: TaskDocument | null = null;

    if (Types.ObjectId.isValid(trimmed)) {
      task = await this.taskModel
        .findById(trimmed)
        .populate('reporter', 'firstName lastName email avatarUrl')
        .populate('assignee', 'firstName lastName email avatarUrl')
        .populate('comments.author', 'firstName lastName email avatarUrl')
        .exec();
    }

    if (!task) {
      const scope = await this.getAccessibleScope(userId);
      const orClauses: Record<string, unknown>[] = [];
      if (scope.listIds.length > 0) {
        orClauses.push({ list: { $in: scope.listIds } });
      }
      if (scope.projectIds.length > 0) {
        orClauses.push({ project: { $in: scope.projectIds } });
      }
      if (orClauses.length === 0) {
        throw new NotFoundException(`Task '${trimmed}' not found`);
      }

      task = await this.taskModel
        .findOne({
          taskKey: trimmed.toUpperCase(),
          $or: orClauses,
        })
        .populate('reporter', 'firstName lastName email avatarUrl')
        .populate('assignee', 'firstName lastName email avatarUrl')
        .populate('comments.author', 'firstName lastName email avatarUrl')
        .exec();
    }

    if (!task) {
      throw new NotFoundException(`Task '${trimmed}' not found`);
    }

    const listId = task.list ? this.extractId(task.list) : undefined;
    const projectId = task.project ? this.extractId(task.project) : undefined;

    if (listId) {
      const { list, space } = await this.hierarchyService.checkListAccess(
        listId,
        userId,
      );
      const workflow = this.getEffectiveWorkflow(list, space);
      return { task, listId, projectId, list, space, workflow };
    }

    if (projectId) {
      await this.tasksService.checkProjectAccess(projectId, userId);
      return {
        task,
        projectId,
        workflow: createDefaultStatusWorkflow(),
      };
    }

    throw new ForbiddenException(
      'Task does not belong to an accessible list or project',
    );
  }
}
