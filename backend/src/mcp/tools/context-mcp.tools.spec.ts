import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Task } from '../../tasks/schemas/task.schema';
import { Workspace } from '../../hierarchy/schemas/workspace.schema';
import { Space } from '../../hierarchy/schemas/space.schema';
import { Folder } from '../../hierarchy/schemas/folder.schema';
import { List } from '../../hierarchy/schemas/list.schema';
import { Project } from '../../projects/schemas/project.schema';
import { TaskPriority } from '../../tasks/enums/task-priority.enum';
import { createDefaultStatusWorkflow } from '../../hierarchy/schemas/status-workflow.schema';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { TasksService } from '../../tasks/tasks.service';
import { McpToolsRegistryService } from '../mcp-tools-registry.service';
import { McpToolsHelper } from './mcp-tools.helper';
import { ContextMcpToolsService } from './context-mcp.tools';

describe('ContextMcpToolsService (MAX-114)', () => {
  let registry: McpToolsRegistryService;
  let contextToolsService: ContextMcpToolsService;
  let taskModel: {
    find: jest.Mock;
    findById: jest.Mock;
    findOne: jest.Mock;
  };

  const userId = new Types.ObjectId().toString();
  const workspaceId = new Types.ObjectId().toString();
  const spaceId = new Types.ObjectId().toString();
  const listId = new Types.ObjectId().toString();
  const taskId = new Types.ObjectId();

  const defaultWorkflow = createDefaultStatusWorkflow();

  function mockPopulateChain(result: unknown) {
    const chain: Record<string, jest.Mock> = {};
    chain.populate = jest.fn().mockReturnValue(chain);
    chain.sort = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockReturnValue(chain);
    chain.select = jest.fn().mockReturnValue(chain);
    chain.lean = jest.fn().mockReturnValue(chain);
    chain.exec = jest.fn().mockResolvedValue(result);
    return chain;
  }

  const overdueTask = {
    _id: taskId,
    taskKey: 'GEN-10',
    title: 'Fix overdue bug',
    status: 'in_progress',
    priority: TaskPriority.CRITICAL,
    list: new Types.ObjectId(listId),
    assignee: new Types.ObjectId(userId),
    reporter: new Types.ObjectId(userId),
    dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    comments: [],
    save: jest.fn().mockResolvedValue(undefined),
  };

  const completedTask = {
    _id: new Types.ObjectId(),
    taskKey: 'GEN-11',
    title: 'Shipped feature',
    status: 'done',
    priority: TaskPriority.MEDIUM,
    list: new Types.ObjectId(listId),
    assignee: new Types.ObjectId(userId),
    reporter: new Types.ObjectId(userId),
    dueDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
    comments: [],
  };

  beforeEach(async () => {
    overdueTask.comments = [];
    overdueTask.save.mockClear();

    const hierarchyServiceMock = {
      checkWorkspaceAccess: jest.fn().mockResolvedValue({
        workspace: {
          _id: new Types.ObjectId(workspaceId),
          name: 'MaxiWork Workspace',
          slug: 'maxiwork-ws',
          owner: new Types.ObjectId(userId),
          members: [],
        },
        role: 'owner',
      }),
      checkListAccess: jest.fn().mockResolvedValue({
        list: {
          _id: new Types.ObjectId(listId),
          spaceId: new Types.ObjectId(spaceId),
          name: 'Sprint List',
          statusWorkflow: defaultWorkflow,
        },
        space: {
          _id: new Types.ObjectId(spaceId),
          workspaceId: new Types.ObjectId(workspaceId),
          name: 'Engineering',
          statusWorkflow: defaultWorkflow,
        },
      }),
    };

    taskModel = {
      find: jest
        .fn()
        .mockReturnValue(mockPopulateChain([overdueTask, completedTask])),
      findById: jest.fn().mockReturnValue(mockPopulateChain(overdueTask)),
      findOne: jest.fn().mockReturnValue(mockPopulateChain(overdueTask)),
    };

    const workspaceModelMock = {
      find: jest.fn().mockReturnValue(
        mockPopulateChain([
          {
            _id: new Types.ObjectId(workspaceId),
            name: 'MaxiWork Workspace',
            slug: 'maxiwork-ws',
            owner: new Types.ObjectId(userId),
            members: [],
          },
        ]),
      ),
    };

    const spaceModelMock = {
      find: jest.fn().mockReturnValue(
        mockPopulateChain([
          {
            _id: new Types.ObjectId(spaceId),
            workspaceId: new Types.ObjectId(workspaceId),
            name: 'Engineering',
            isPrivate: false,
            statusWorkflow: defaultWorkflow,
          },
        ]),
      ),
    };

    const listModelMock = {
      find: jest.fn().mockReturnValue(
        mockPopulateChain([
          {
            _id: new Types.ObjectId(listId),
            spaceId: new Types.ObjectId(spaceId),
            name: 'Sprint List',
            statusWorkflow: defaultWorkflow,
          },
        ]),
      ),
    };

    const emptyModelMock = {
      find: jest.fn().mockReturnValue(mockPopulateChain([])),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpToolsRegistryService,
        McpToolsHelper,
        ContextMcpToolsService,
        { provide: HierarchyService, useValue: hierarchyServiceMock },
        { provide: TasksService, useValue: {} },
        { provide: getModelToken(Task.name), useValue: taskModel },
        {
          provide: getModelToken(Workspace.name),
          useValue: workspaceModelMock,
        },
        { provide: getModelToken(Space.name), useValue: spaceModelMock },
        { provide: getModelToken(Folder.name), useValue: emptyModelMock },
        { provide: getModelToken(List.name), useValue: listModelMock },
        { provide: getModelToken(Project.name), useValue: emptyModelMock },
      ],
    }).compile();

    registry = module.get(McpToolsRegistryService);
    contextToolsService = module.get(ContextMcpToolsService);
    contextToolsService.onModuleInit();
  });

  it('registers all 3 Context & Activity MCP tools', () => {
    const names = registry.listTools().map((t) => t.name);
    expect(names).toEqual([
      'get_my_tasks',
      'get_workspace_summary',
      'add_task_comment',
    ]);
  });

  it('get_my_tasks filters assigned tasks by statusCategory', async () => {
    const res = await registry.executeTool(
      'get_my_tasks',
      { statusCategory: 'in_progress' },
      userId,
    );

    expect(res.isError).toBeUndefined();
    const parsed = JSON.parse(res.content[0].text) as {
      total: number;
      tasks: Array<{ taskKey: string; statusCategory: string }>;
    };
    expect(parsed.total).toBe(1);
    expect(parsed.tasks[0].taskKey).toBe('GEN-10');
    expect(parsed.tasks[0].statusCategory).toBe('in_progress');
  });

  it('get_workspace_summary aggregates status categories, priorities, and overdue metrics', async () => {
    const res = await registry.executeTool(
      'get_workspace_summary',
      { workspaceId },
      userId,
    );

    expect(res.isError).toBeUndefined();
    const parsed = JSON.parse(res.content[0].text) as {
      counts: {
        totalTasks: number;
        openTasks: number;
        completedTasks: number;
        overdueTasksCount: number;
      };
      byStatusCategory: Record<string, number>;
      byPriority: Record<string, number>;
      spacesBreakdown: Array<{ spaceName: string; overdueTasks: number }>;
    };
    expect(parsed.counts.totalTasks).toBe(2);
    expect(parsed.counts.openTasks).toBe(1);
    expect(parsed.counts.completedTasks).toBe(1);
    expect(parsed.counts.overdueTasksCount).toBe(1);
    expect(parsed.byStatusCategory.in_progress).toBe(1);
    expect(parsed.byStatusCategory.done).toBe(1);
    expect(parsed.byPriority.critical).toBe(1);
    expect(parsed.byPriority.medium).toBe(1);
    expect(parsed.byPriority.low).toBe(0);
    expect(parsed.byPriority.high).toBe(0);
    expect(parsed.byPriority.urgent).toBeUndefined();
    expect(parsed.spacesBreakdown[0].overdueTasks).toBe(1);
  });

  it('add_task_comment appends an embedded comment to the task', async () => {
    const res = await registry.executeTool(
      'add_task_comment',
      {
        taskId: 'GEN-10',
        content: 'Investigated root cause and opened a fix PR.',
      },
      userId,
    );

    expect(res.isError).toBeUndefined();
    expect(overdueTask.save).toHaveBeenCalled();
    const parsed = JSON.parse(res.content[0].text) as {
      taskKey: string;
      commentsCount: number;
      comment: { content: string };
    };
    expect(parsed.taskKey).toBe('GEN-10');
    expect(parsed.commentsCount).toBe(1);
    expect(parsed.comment.content).toBe(
      'Investigated root cause and opened a fix PR.',
    );
  });
});
