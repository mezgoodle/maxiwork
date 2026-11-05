import type {
  McpClientTab,
  McpExpirationPreset,
  McpToolCatalogItem,
  McpToolCategoryGroup,
} from '../types/mcp';

export const resolveMcpEndpointUrl = (apiBase: string): string => {
  const clean = (apiBase || '').trim().replace(/\/+$/, '');
  return `${clean}/mcp`;
};

export const computeExpirationIso = (
  preset: McpExpirationPreset,
  baseDate: Date = new Date(),
): string | undefined => {
  if (preset === 'never') return undefined;

  const daysMap: Record<Exclude<McpExpirationPreset, 'never'>, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '365d': 365,
  };

  const days = daysMap[preset] ?? 30;
  const target = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
  return target.toISOString();
};

export const isApiKeyExpired = (
  expiresAt: string | null | undefined,
  now: Date = new Date(),
): boolean => {
  if (!expiresAt) return false;
  const expDate = new Date(expiresAt);
  return !Number.isNaN(expDate.getTime()) && expDate.getTime() <= now.getTime();
};

export interface McpClientSnippetResult {
  title: string;
  configPath: string;
  description: string;
  json: string;
}

export const buildMcpClientSnippet = (
  client: McpClientTab,
  endpointUrl: string,
  rawSecret?: string | null,
  revealSecret = false,
): McpClientSnippetResult => {
  const secretPlaceholder = 'mxw_live_YOUR_TOKEN_HERE';
  const effectiveSecret =
    rawSecret && revealSecret ? rawSecret : rawSecret ? `${rawSecret.substring(0, 16)}...` : secretPlaceholder;

  switch (client) {
    case 'claude':
      return {
        title: 'Claude Desktop',
        configPath: 'claude_desktop_config.json',
        description: 'Add to your Claude Desktop configuration file to interact with MaxiWork through Claude.',
        json: JSON.stringify(
          {
            mcpServers: {
              maxiwork: {
                url: endpointUrl,
                headers: {
                  Authorization: `Bearer ${effectiveSecret}`,
                },
              },
            },
          },
          null,
          2,
        ),
      };
    case 'cursor':
      return {
        title: 'Cursor IDE',
        configPath: '.cursor/mcp.json',
        description: 'Add to your project root or global Cursor MCP configuration to allow Cursor Composer to manage tasks.',
        json: JSON.stringify(
          {
            mcpServers: {
              maxiwork: {
                url: endpointUrl,
                headers: {
                  Authorization: `Bearer ${effectiveSecret}`,
                },
              },
            },
          },
          null,
          2,
        ),
      };
    case 'antigravity':
      return {
        title: 'Google Antigravity',
        configPath: 'mcp_config.json',
        description: 'Add to your Antigravity agent settings or workspace MCP manifest for pair-programming and tool access.',
        json: JSON.stringify(
          {
            mcpServers: {
              maxiwork: {
                url: endpointUrl,
                headers: {
                  Authorization: `Bearer ${effectiveSecret}`,
                },
              },
            },
          },
          null,
          2,
        ),
      };
  }
};

export const MCP_TOOLS_CATALOG: McpToolCatalogItem[] = [
  // Tasks (6)
  {
    name: 'create_task',
    category: 'Tasks',
    description: 'Create a root task or nested subtask inside a specified list with smart status matching.',
    badge: 'Write',
    badgeColor: 'emerald',
  },
  {
    name: 'update_task',
    category: 'Tasks',
    description: 'Update task properties, status, priorities, assignees, or custom fields by ID or taskKey.',
    badge: 'Write',
    badgeColor: 'emerald',
  },
  {
    name: 'get_task',
    category: 'Tasks',
    description: 'Retrieve full task details, nested subtasks, comments, custom fields, and workflow statuses.',
    badge: 'Read-only',
    badgeColor: 'sky',
  },
  {
    name: 'search_tasks',
    category: 'Tasks',
    description: 'Search and filter tasks across accessible workspaces, spaces, and lists by query or criteria.',
    badge: 'Read-only',
    badgeColor: 'sky',
  },
  {
    name: 'delete_task',
    category: 'Tasks',
    description: 'Delete a task and cascade delete its descendant subtasks with rollup counter recalculation.',
    badge: 'Destructive',
    badgeColor: 'rose',
  },
  {
    name: 'set_task_status',
    category: 'Tasks',
    description: 'Transition a task to any workflow status using smart status matching and recurrence triggers.',
    badge: 'Write',
    badgeColor: 'emerald',
  },

  // Hierarchy (5)
  {
    name: 'list_workspaces',
    category: 'Hierarchy',
    description: 'List all workspaces accessible to the authenticated user.',
    badge: 'Read-only',
    badgeColor: 'sky',
  },
  {
    name: 'list_spaces',
    category: 'Hierarchy',
    description: 'List all spaces within a specific workspace.',
    badge: 'Read-only',
    badgeColor: 'sky',
  },
  {
    name: 'list_lists',
    category: 'Hierarchy',
    description: 'List all task lists and folders in a space, optionally filtered by folderId.',
    badge: 'Read-only',
    badgeColor: 'sky',
  },
  {
    name: 'create_space',
    category: 'Hierarchy',
    description: 'Create a new space (with an auto-generated default list) in a workspace.',
    badge: 'Write',
    badgeColor: 'emerald',
  },
  {
    name: 'create_list',
    category: 'Hierarchy',
    description: 'Create a new task list inside a space or folder.',
    badge: 'Write',
    badgeColor: 'emerald',
  },

  // Context & Activity (3)
  {
    name: 'get_my_tasks',
    category: 'Context & Activity',
    description: 'Retrieve tasks assigned to the current user, optionally filtered by statusCategory.',
    badge: 'Read-only',
    badgeColor: 'sky',
  },
  {
    name: 'get_workspace_summary',
    category: 'Context & Activity',
    description: 'Aggregate workspace health: task counts by category, overdue/upcoming tasks, and space breakdown.',
    badge: 'Read-only',
    badgeColor: 'sky',
  },
  {
    name: 'add_task_comment',
    category: 'Context & Activity',
    description: 'Append an embedded progress comment or activity note to a task by ID or taskKey.',
    badge: 'Write',
    badgeColor: 'emerald',
  },
];

export const getMcpToolsByCategories = (): McpToolCategoryGroup[] => {
  const categories: McpToolCategoryGroup[] = [
    { category: 'Tasks', count: 0, tools: [] },
    { category: 'Hierarchy', count: 0, tools: [] },
    { category: 'Context & Activity', count: 0, tools: [] },
  ];

  for (const tool of MCP_TOOLS_CATALOG) {
    const group = categories.find((g) => g.category === tool.category);
    if (group) {
      group.tools.push(tool);
      group.count++;
    }
  }

  return categories;
};
