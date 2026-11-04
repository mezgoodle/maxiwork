import { Injectable, OnModuleInit } from '@nestjs/common';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { McpToolsRegistryService } from '../mcp-tools-registry.service';
import { McpToolsHelper } from './mcp-tools.helper';

@Injectable()
export class HierarchyMcpToolsService implements OnModuleInit {
  constructor(
    private readonly registry: McpToolsRegistryService,
    private readonly helper: McpToolsHelper,
    private readonly hierarchyService: HierarchyService,
  ) {}

  onModuleInit(): void {
    this.registerListWorkspaces();
    this.registerListSpaces();
    this.registerListLists();
    this.registerCreateSpace();
    this.registerCreateList();
  }

  private registerListWorkspaces(): void {
    this.registry.registerTool({
      name: 'list_workspaces',
      description:
        'List all MaxiWork workspaces accessible to the authenticated user. Creates a default workspace if the user has none.',
      annotations: {
        title: 'List Workspaces',
        readOnlyHint: false,
        destructiveHint: false,
      },
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (_args, userId) => {
        const workspaces =
          await this.hierarchyService.findAllWorkspaces(userId);
        const formatted = workspaces.map((ws) => ({
          id: this.helper.extractId(ws._id),
          name: ws.name,
          slug: ws.slug,
          owner: this.helper.formatUserRef(ws.owner),
          membersCount: Array.isArray(ws.members) ? ws.members.length : 0,
          avatarUrl: ws.avatarUrl ?? null,
          settings: ws.settings ?? null,
        }));

        return this.helper.toMcpJsonResult({
          total: formatted.length,
          workspaces: formatted,
        });
      },
    });
  }

  private registerListSpaces(): void {
    this.registry.registerTool({
      name: 'list_spaces',
      description:
        'List all accessible spaces within a given MaxiWork workspace.',
      annotations: {
        title: 'List Spaces',
        readOnlyHint: true,
        destructiveHint: false,
      },
      inputSchema: {
        type: 'object',
        properties: {
          workspaceId: {
            type: 'string',
            description: 'Workspace ID to list spaces from',
          },
        },
        required: ['workspaceId'],
      },
      handler: async (args, userId) => {
        const workspaceId = String(args.workspaceId).trim();
        const spaces = await this.hierarchyService.findAllSpaces(
          workspaceId,
          userId,
        );
        const formatted = spaces.map((sp) => ({
          id: this.helper.extractId(sp._id),
          workspaceId: this.helper.extractId(sp.workspaceId),
          name: sp.name,
          description: sp.description ?? '',
          icon: sp.icon,
          color: sp.color,
          isPrivate: Boolean(sp.isPrivate),
          order: sp.order,
          statusWorkflow: sp.statusWorkflow ?? null,
        }));

        return this.helper.toMcpJsonResult({
          workspaceId,
          total: formatted.length,
          spaces: formatted,
        });
      },
    });
  }

  private registerListLists(): void {
    this.registry.registerTool({
      name: 'list_lists',
      description:
        'List all task lists (and folders) inside a given Space, optionally filtered by folderId.',
      annotations: {
        title: 'List Lists',
        readOnlyHint: true,
        destructiveHint: false,
      },
      inputSchema: {
        type: 'object',
        properties: {
          spaceId: {
            type: 'string',
            description: 'Space ID to list task lists from',
          },
          folderId: {
            type: 'string',
            description: 'Optional Folder ID to filter lists within the space',
          },
        },
        required: ['spaceId'],
      },
      handler: async (args, userId) => {
        const spaceId = String(args.spaceId).trim();
        const folderIdFilter =
          typeof args.folderId === 'string' && args.folderId.trim()
            ? args.folderId.trim()
            : undefined;

        const [lists, folders] = await Promise.all([
          this.hierarchyService.findAllLists(spaceId, userId),
          this.hierarchyService.findAllFolders(spaceId, userId),
        ]);

        const filteredLists = folderIdFilter
          ? lists.filter(
              (l) =>
                l.folderId &&
                this.helper.extractId(l.folderId) === folderIdFilter,
            )
          : lists;

        return this.helper.toMcpJsonResult({
          spaceId,
          ...(folderIdFilter ? { folderId: folderIdFilter } : {}),
          total: filteredLists.length,
          folders: folders.map((f) => ({
            id: this.helper.extractId(f._id),
            name: f.name,
            order: f.order,
            isHidden: Boolean(f.isHidden),
          })),
          lists: filteredLists.map((l) => ({
            id: this.helper.extractId(l._id),
            spaceId: this.helper.extractId(l.spaceId),
            folderId: l.folderId ? this.helper.extractId(l.folderId) : null,
            name: l.name,
            color: l.color ?? null,
            order: l.order,
            statusWorkflow: l.statusWorkflow ?? null,
          })),
        });
      },
    });
  }

  private registerCreateSpace(): void {
    this.registry.registerTool({
      name: 'create_space',
      description:
        'Create a new Space inside a Workspace (automatically initializes a default List).',
      annotations: {
        title: 'Create Space',
        readOnlyHint: false,
        destructiveHint: false,
      },
      inputSchema: {
        type: 'object',
        properties: {
          workspaceId: {
            type: 'string',
            description: 'Workspace ID where the space will be created',
          },
          name: {
            type: 'string',
            description: 'Name of the new space',
          },
          description: {
            type: 'string',
            description: 'Optional description of the space',
          },
          color: {
            type: 'string',
            description: 'Optional hex color (e.g. "#4F46E5")',
          },
          icon: {
            type: 'string',
            description: 'Optional icon identifier (e.g. "folder")',
          },
          isPrivate: {
            type: 'boolean',
            description: 'Whether the space is private',
          },
        },
        required: ['workspaceId', 'name'],
      },
      handler: async (args, userId) => {
        const workspaceId = String(args.workspaceId).trim();
        const name = String(args.name).trim();
        const description =
          typeof args.description === 'string' ? args.description : undefined;
        const color = typeof args.color === 'string' ? args.color : undefined;
        const icon = typeof args.icon === 'string' ? args.icon : undefined;
        const isPrivate =
          typeof args.isPrivate === 'boolean' ? args.isPrivate : undefined;

        const space = await this.hierarchyService.createSpace(
          workspaceId,
          { name, description, color, icon, isPrivate },
          userId,
        );

        const spaceId = this.helper.extractId(space._id);
        const lists = await this.hierarchyService.findAllLists(spaceId, userId);

        return this.helper.toMcpJsonResult({
          id: spaceId,
          workspaceId: this.helper.extractId(space.workspaceId),
          name: space.name,
          description: space.description ?? '',
          icon: space.icon,
          color: space.color,
          isPrivate: Boolean(space.isPrivate),
          order: space.order,
          lists: lists.map((l) => ({
            id: this.helper.extractId(l._id),
            name: l.name,
            color: l.color ?? null,
          })),
        });
      },
    });
  }

  private registerCreateList(): void {
    this.registry.registerTool({
      name: 'create_list',
      description:
        'Create a new task List inside a Space (and optionally inside a Folder).',
      annotations: {
        title: 'Create List',
        readOnlyHint: false,
        destructiveHint: false,
      },
      inputSchema: {
        type: 'object',
        properties: {
          spaceId: {
            type: 'string',
            description: 'Space ID where the list will be created',
          },
          name: {
            type: 'string',
            description: 'Name of the new list',
          },
          folderId: {
            type: 'string',
            description: 'Optional Folder ID inside the space',
          },
          color: {
            type: 'string',
            description: 'Optional hex color (e.g. "#4F46E5")',
          },
        },
        required: ['spaceId', 'name'],
      },
      handler: async (args, userId) => {
        const spaceId = String(args.spaceId).trim();
        const name = String(args.name).trim();
        const folderId =
          typeof args.folderId === 'string' && args.folderId.trim()
            ? args.folderId.trim()
            : undefined;
        const color = typeof args.color === 'string' ? args.color : undefined;

        const list = await this.hierarchyService.createList(
          spaceId,
          { name, folderId, color },
          userId,
        );

        return this.helper.toMcpJsonResult({
          id: this.helper.extractId(list._id),
          spaceId: this.helper.extractId(list.spaceId),
          folderId: list.folderId ? this.helper.extractId(list.folderId) : null,
          name: list.name,
          color: list.color ?? null,
          order: list.order,
        });
      },
    });
  }
}
