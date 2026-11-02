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
import { TaskMcpToolsService } from './task-mcp.tools';

describe('TaskMcpToolsService (MAX-112)', () => {
  let registry: McpToolsRegistryService;
  let taskToolsService: TaskMcpToolsService;
  let hierarchyService: {
    checkListAccess: jest.Mock;
    checkSpaceAccess: jest.Mock;
    checkWorkspaceAccess: jest.Mock;
    createListTask: jest.Mock;
    createListSubtask: jest.Mock;
    updateListTask: jest.Mock;
  };
  let tasksService: {
    checkProjectAccess: jest.Mock;
    update: jest.Mock;
    updateStatus: jest.Mock;
  };
  let taskModel: {
    findById: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    updateOne: jest.Mock;
    deleteMany: jest.Mock;
    deleteOne: jest.Mock;
  };

  const userId = new Types.ObjectId().toString();
  const listId = new Types.ObjectId().toString();
  const spaceId = new Types.ObjectId().toString();
  const workspaceId = new Types.ObjectId().toString();
  const taskId = new Types.ObjectId();

  const defaultWorkflow = createDefaultStatusWorkflow();

  const sampleTask = {
    _id: taskId,
    taskKey: 'GEN-1',
    title: 'Implement MCP tools',
    description: 'Build 14 MCP tools',
    status: 'todo',
    priority: TaskPriority.HIGH,
    list: new Types.ObjectId(listId),
    reporter: {
      _id: new Types.ObjectId(userId),
      firstName: 'Max',
      lastName: 'Dev',
      email: 'max@example.com',
    },
    assignee: {
      _id: new Types.ObjectId(userId),
      firstName: 'Max',
      lastName: 'Dev',
      email: 'max@example.com',
    },
    subtasksCount: 1,
    completedSubtasksCount: 0,
    comments: [],
    createdAt: new Date('2026-10-27T10:00:00.000Z'),
    updatedAt: new Date('2026-10-27T10:00:00.000Z'),
  };

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

  beforeEach(async () => {
    hierarchyService = {
      checkListAccess: jest.fn().mockResolvedValue({
        list: {
          _id: new Types.ObjectId(listId),
          spaceId: new Types.ObjectId(spaceId),
          name: 'Sprint Backlog',
          statusWorkflow: defaultWorkflow,
        },
        space: {
          _id: new Types.ObjectId(spaceId),
          workspaceId: new Types.ObjectId(workspaceId),
          name: 'Engineering',
          statusWorkflow: defaultWorkflow,
        },
        workspace: {
          _id: new Types.ObjectId(workspaceId),
          owner: new Types.ObjectId(userId),
          members: [],
        },
        role: 'owner',
      }),
      checkSpaceAccess: jest.fn().mockResolvedValue({}),
      checkWorkspaceAccess: jest.fn().mockResolvedValue({}),
      createListTask: jest.fn().mockResolvedValue(sampleTask),
      createListSubtask: jest.fn().mockResolvedValue({
        ...sampleTask,
        _id: new Types.ObjectId(),
        taskKey: 'GEN-1-1',
        parentTaskId: taskId,
      }),
      updateListTask: jest.fn().mockImplementation((_lId, _tId, dto) =>
        Promise.resolve({
          ...sampleTask,
          ...dto,
        }),
      ),
    };

    tasksService = {
      checkProjectAccess: jest.fn().mockResolvedValue({}),
      update: jest.fn(),
      updateStatus: jest.fn(),
    };

    taskModel = {
      findById: jest.fn().mockReturnValue(mockPopulateChain(sampleTask)),
      findOne: jest.fn().mockReturnValue(mockPopulateChain(sampleTask)),
      find: jest.fn().mockReturnValue(mockPopulateChain([sampleTask])),
      updateOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      deleteMany: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      deleteOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    };

    const workspaceModelMock = {
      find: jest.fn().mockReturnValue(
        mockPopulateChain([
          {
            _id: new Types.ObjectId(workspaceId),
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
            name: 'Sprint Backlog',
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
        TaskMcpToolsService,
        { provide: HierarchyService, useValue: hierarchyService },
        { provide: TasksService, useValue: tasksService },
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
    taskToolsService = module.get(TaskMcpToolsService);
    taskToolsService.onModuleInit();
  });

  it('registers all 6 Task MCP tools', () => {
    const names = registry.listTools().map((t) => t.name);
    expect(names).toEqual([
      'create_task',
      'update_task',
      'get_task',
      'search_tasks',
      'delete_task',
      'set_task_status',
    ]);
  });

  it('create_task creates a root task and resolves status by name or category', async () => {
    const res = await registry.executeTool(
      'create_task',
      {
        listId,
        title: 'Implement MCP tools',
        priority: 'high',
        status: 'In Progress',
      },
      userId,
    );

    expect(res.isError).toBeUndefined();
    expect(hierarchyService.createListTask).toHaveBeenCalledWith(
      listId,
      expect.objectContaining({
        title: 'Implement MCP tools',
        priority: 'high',
        status: 'in_progress',
      }),
      userId,
    );
    const parsed = JSON.parse(res.content[0].text) as Record<string, unknown>;
    expect(parsed.taskKey).toBe('GEN-1');
  });

  it('create_task creates a subtask when parentTaskId is passed as taskKey', async () => {
    taskModel.findById.mockReturnValueOnce(mockPopulateChain(null));
    taskModel.findOne.mockReturnValueOnce(mockPopulateChain(sampleTask));

    const res = await registry.executeTool(
      'create_task',
      {
        listId,
        title: 'Subtask via taskKey',
        parentTaskId: 'gen-1',
      },
      userId,
    );

    expect(res.isError).toBeUndefined();
    expect(hierarchyService.createListSubtask).toHaveBeenCalledWith(
      listId,
      taskId.toString(),
      expect.objectContaining({ title: 'Subtask via taskKey' }),
      userId,
    );
    const parsed = JSON.parse(res.content[0].text) as Record<string, unknown>;
    expect(parsed.taskKey).toBe('GEN-1-1');
  });

  it('get_task resolves by taskKey and returns subtasks and workflowStatuses', async () => {
    const res = await registry.executeTool(
      'get_task',
      { taskId: 'GEN-1' },
      userId,
    );

    expect(res.isError).toBeUndefined();
    const parsed = JSON.parse(res.content[0].text) as {
      id: string;
      taskKey: string;
      subtasks: unknown[];
      workflowStatuses: unknown[];
    };
    expect(parsed.id).toBe(taskId.toString());
    expect(parsed.taskKey).toBe('GEN-1');
    expect(Array.isArray(parsed.subtasks)).toBe(true);
    expect(parsed.workflowStatuses.length).toBeGreaterThan(0);
  });

  it('update_task updates fields and resolves smart status category', async () => {
    const res = await registry.executeTool(
      'update_task',
      {
        taskId: taskId.toString(),
        title: 'Updated MCP title',
        status: 'done',
      },
      userId,
    );

    expect(res.isError).toBeUndefined();
    expect(hierarchyService.updateListTask).toHaveBeenCalledWith(
      listId,
      taskId.toString(),
      expect.objectContaining({
        title: 'Updated MCP title',
        status: 'done',
      }),
      userId,
    );
  });

  it('set_task_status transitions status and returns helpful error on invalid status', async () => {
    const okRes = await registry.executeTool(
      'set_task_status',
      {
        taskId: 'GEN-1',
        status: 'In Progress',
      },
      userId,
    );
    expect(okRes.isError).toBeUndefined();
    expect(hierarchyService.updateListTask).toHaveBeenCalledWith(
      listId,
      taskId.toString(),
      { status: 'in_progress' },
      userId,
    );

    const badRes = await registry.executeTool(
      'set_task_status',
      {
        taskId: 'GEN-1',
        status: 'non_existent_status',
      },
      userId,
    );
    expect(badRes.isError).toBe(true);
    expect(badRes.content[0].text).toContain('Valid workflow statuses are');
  });

  it('search_tasks filters by query and status category', async () => {
    const res = await registry.executeTool(
      'search_tasks',
      {
        query: 'MCP',
        status: 'to_do',
        limit: 10,
      },
      userId,
    );

    expect(res.isError).toBeUndefined();
    const parsed = JSON.parse(res.content[0].text) as {
      total: number;
      tasks: Array<{ taskKey: string }>;
    };
    expect(parsed.total).toBe(1);
    expect(parsed.tasks[0].taskKey).toBe('GEN-1');
  });

  it('delete_task deletes descendants and task document', async () => {
    taskModel.find.mockReturnValueOnce(mockPopulateChain([]));

    const res = await registry.executeTool(
      'delete_task',
      { taskId: 'GEN-1' },
      userId,
    );

    expect(res.isError).toBeUndefined();
    expect(taskModel.deleteOne).toHaveBeenCalledWith({ _id: taskId });
    const parsed = JSON.parse(res.content[0].text) as {
      deleted: boolean;
      taskKey: string;
    };
    expect(parsed.deleted).toBe(true);
    expect(parsed.taskKey).toBe('GEN-1');
  });
});
