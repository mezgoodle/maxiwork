import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Task } from '../../tasks/schemas/task.schema';
import { Workspace } from '../../hierarchy/schemas/workspace.schema';
import { Space } from '../../hierarchy/schemas/space.schema';
import { Folder } from '../../hierarchy/schemas/folder.schema';
import { List } from '../../hierarchy/schemas/list.schema';
import { Project } from '../../projects/schemas/project.schema';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { TasksService } from '../../tasks/tasks.service';
import { McpToolsRegistryService } from '../mcp-tools-registry.service';
import { McpToolsHelper } from './mcp-tools.helper';
import { HierarchyMcpToolsService } from './hierarchy-mcp.tools';

describe('HierarchyMcpToolsService (MAX-113)', () => {
  let registry: McpToolsRegistryService;
  let hierarchyToolsService: HierarchyMcpToolsService;
  let hierarchyService: {
    findAllWorkspaces: jest.Mock;
    findAllSpaces: jest.Mock;
    findAllLists: jest.Mock;
    findAllFolders: jest.Mock;
    createSpace: jest.Mock;
    createList: jest.Mock;
  };

  const userId = new Types.ObjectId().toString();
  const workspaceId = new Types.ObjectId().toString();
  const spaceId = new Types.ObjectId().toString();
  const listId = new Types.ObjectId().toString();

  beforeEach(async () => {
    hierarchyService = {
      findAllWorkspaces: jest.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId(workspaceId),
          name: 'MaxiWork HQ',
          slug: 'maxiwork-hq',
          owner: {
            _id: new Types.ObjectId(userId),
            firstName: 'Max',
            lastName: 'Dev',
            email: 'max@example.com',
          },
          members: [{ user: new Types.ObjectId(userId), role: 'owner' }],
        },
      ]),
      findAllSpaces: jest.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId(spaceId),
          workspaceId: new Types.ObjectId(workspaceId),
          name: 'Product Space',
          description: 'Core product tasks',
          icon: 'folder',
          color: '#4F46E5',
          isPrivate: false,
          order: 0,
        },
      ]),
      findAllLists: jest.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId(listId),
          spaceId: new Types.ObjectId(spaceId),
          name: 'Sprint 8',
          color: '#4F46E5',
          order: 0,
        },
      ]),
      findAllFolders: jest.fn().mockResolvedValue([]),
      createSpace: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(spaceId),
        workspaceId: new Types.ObjectId(workspaceId),
        name: 'AI Platform',
        description: 'MCP & Agents',
        icon: 'sparkles',
        color: '#10B981',
        isPrivate: false,
        order: 1,
      }),
      createList: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(listId),
        spaceId: new Types.ObjectId(spaceId),
        name: 'MCP Backlog',
        color: '#10B981',
        order: 1,
      }),
    };

    const emptyModel = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpToolsRegistryService,
        McpToolsHelper,
        HierarchyMcpToolsService,
        { provide: HierarchyService, useValue: hierarchyService },
        { provide: TasksService, useValue: {} },
        { provide: getModelToken(Task.name), useValue: emptyModel },
        { provide: getModelToken(Workspace.name), useValue: emptyModel },
        { provide: getModelToken(Space.name), useValue: emptyModel },
        { provide: getModelToken(Folder.name), useValue: emptyModel },
        { provide: getModelToken(List.name), useValue: emptyModel },
        { provide: getModelToken(Project.name), useValue: emptyModel },
      ],
    }).compile();

    registry = module.get(McpToolsRegistryService);
    hierarchyToolsService = module.get(HierarchyMcpToolsService);
    hierarchyToolsService.onModuleInit();
  });

  it('registers all 5 Hierarchy MCP tools', () => {
    const names = registry.listTools().map((t) => t.name);
    expect(names).toEqual([
      'list_workspaces',
      'list_spaces',
      'list_lists',
      'create_space',
      'create_list',
    ]);
  });

  it('list_workspaces returns formatted workspaces for user', async () => {
    const res = await registry.executeTool('list_workspaces', {}, userId);
    expect(res.isError).toBeUndefined();
    const parsed = JSON.parse(res.content[0].text) as {
      total: number;
      workspaces: Array<{ id: string; name: string; slug: string }>;
    };
    expect(parsed.total).toBe(1);
    expect(parsed.workspaces[0]).toMatchObject({
      id: workspaceId,
      name: 'MaxiWork HQ',
      slug: 'maxiwork-hq',
    });
  });

  it('list_spaces and list_lists return space and list hierarchies', async () => {
    const spacesRes = await registry.executeTool(
      'list_spaces',
      { workspaceId },
      userId,
    );
    expect(spacesRes.isError).toBeUndefined();
    const spacesData = JSON.parse(spacesRes.content[0].text) as {
      total: number;
      spaces: Array<{ id: string; name: string }>;
    };
    expect(spacesData.total).toBe(1);
    expect(spacesData.spaces[0].name).toBe('Product Space');

    const listsRes = await registry.executeTool(
      'list_lists',
      { spaceId },
      userId,
    );
    expect(listsRes.isError).toBeUndefined();
    const listsData = JSON.parse(listsRes.content[0].text) as {
      total: number;
      lists: Array<{ id: string; name: string }>;
    };
    expect(listsData.total).toBe(1);
    expect(listsData.lists[0].name).toBe('Sprint 8');
  });

  it('create_space and create_list create hierarchy nodes', async () => {
    const spaceRes = await registry.executeTool(
      'create_space',
      {
        workspaceId,
        name: 'AI Platform',
        color: '#10B981',
      },
      userId,
    );
    expect(spaceRes.isError).toBeUndefined();
    expect(hierarchyService.createSpace).toHaveBeenCalledWith(
      workspaceId,
      expect.objectContaining({ name: 'AI Platform', color: '#10B981' }),
      userId,
    );

    const listRes = await registry.executeTool(
      'create_list',
      {
        spaceId,
        name: 'MCP Backlog',
      },
      userId,
    );
    expect(listRes.isError).toBeUndefined();
    expect(hierarchyService.createList).toHaveBeenCalledWith(
      spaceId,
      expect.objectContaining({ name: 'MCP Backlog' }),
      userId,
    );
  });
});
