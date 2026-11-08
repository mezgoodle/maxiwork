import { McpToolInputSchema } from '../../mcp/mcp-tools-registry.service';
import { ChatMessage } from '../schemas/chat-session.schema';

export interface GeminiFunctionDeclaration {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const MUTATING_MCP_TOOLS = new Set<string>([
  'create_task',
  'update_task',
  'delete_task',
  'set_task_status',
  'create_space',
  'create_list',
  'add_task_comment',
]);

export function isMutatingMcpTool(toolName: string): boolean {
  return MUTATING_MCP_TOOLS.has(toolName);
}

export function convertMcpToolToGeminiFunction(tool: {
  name: string;
  description: string;
  inputSchema: McpToolInputSchema;
}): GeminiFunctionDeclaration {
  const properties: Record<string, unknown> = {};
  if (tool.inputSchema.properties) {
    for (const [key, value] of Object.entries(tool.inputSchema.properties)) {
      properties[key] = {
        type: value.type || 'string',
        description: value.description,
        ...(Array.isArray(value.enum) ? { enum: value.enum } : {}),
      };
    }
  }

  return {
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties,
      ...(Array.isArray(tool.inputSchema.required) &&
      tool.inputSchema.required.length > 0
        ? { required: tool.inputSchema.required }
        : {}),
    },
  };
}

function stringifyValue(val: unknown, fallback: string): string {
  if (typeof val === 'string' && val.trim()) {
    return val.trim();
  }
  return fallback;
}

export function summarizeToolExecution(
  toolName: string,
  args: Record<string, unknown>,
  resultText: string,
): string {
  try {
    const parsed = JSON.parse(resultText) as Record<string, unknown>;
    if (parsed.isError) {
      return `Failed: ${toolName}`;
    }

    switch (toolName) {
      case 'create_task': {
        const key = stringifyValue(parsed.taskKey, 'Task');
        const title = stringifyValue(
          parsed.title,
          stringifyValue(args.title, ''),
        );
        return `Created task ${key}${title ? `: ${title}` : ''}`;
      }
      case 'update_task': {
        const key = stringifyValue(
          parsed.taskKey,
          stringifyValue(args.taskId, 'Task'),
        );
        return `Updated task ${key}`;
      }
      case 'set_task_status': {
        const key = stringifyValue(
          parsed.taskKey,
          stringifyValue(args.taskId, 'Task'),
        );
        const st = stringifyValue(
          parsed.status,
          stringifyValue(args.status, ''),
        );
        return `Updated status of ${key} to ${st}`;
      }
      case 'delete_task': {
        const key = stringifyValue(
          parsed.taskKey,
          stringifyValue(args.taskId, 'Task'),
        );
        return `Deleted task ${key}`;
      }
      case 'search_tasks': {
        const total = typeof parsed.total === 'number' ? parsed.total : 0;
        return `Found ${total} task${total === 1 ? '' : 's'}`;
      }
      case 'get_task': {
        const key = stringifyValue(
          parsed.taskKey,
          stringifyValue(args.taskId, 'Task'),
        );
        return `Retrieved details for ${key}`;
      }
      case 'get_my_tasks': {
        const total = typeof parsed.total === 'number' ? parsed.total : 0;
        return `Found ${total} assigned task${total === 1 ? '' : 's'}`;
      }
      case 'get_workspace_summary': {
        return `Retrieved workspace summary`;
      }
      case 'list_workspaces': {
        const total = typeof parsed.total === 'number' ? parsed.total : 0;
        return `Listed ${total} workspace${total === 1 ? '' : 's'}`;
      }
      case 'list_spaces': {
        const total = typeof parsed.total === 'number' ? parsed.total : 0;
        return `Listed ${total} space${total === 1 ? '' : 's'}`;
      }
      case 'list_lists': {
        const total = typeof parsed.total === 'number' ? parsed.total : 0;
        return `Listed ${total} list${total === 1 ? '' : 's'}`;
      }
      case 'create_space': {
        const name = stringifyValue(
          parsed.name,
          stringifyValue(args.name, 'Space'),
        );
        return `Created space ${name}`;
      }
      case 'create_list': {
        const name = stringifyValue(
          parsed.name,
          stringifyValue(args.name, 'List'),
        );
        return `Created list ${name}`;
      }
      case 'add_task_comment': {
        const key = stringifyValue(
          parsed.taskKey,
          stringifyValue(args.taskId, 'Task'),
        );
        return `Added comment to ${key}`;
      }
      default:
        return `Executed ${toolName}`;
    }
  } catch {
    return `Executed ${toolName}`;
  }
}

export interface InteractionStepLike {
  type: 'user_input' | 'model_output' | 'function_call' | 'function_result';
  content?: Array<{ type: 'text'; text: string }>;
  name?: string;
  call_id?: string;
  result?: string;
  arguments?: Record<string, unknown>;
  id?: string;
}

export function buildSlidingWindowHistory(
  messages: ChatMessage[],
  windowSize = 20,
): InteractionStepLike[] {
  const windowed = messages.slice(-windowSize);
  const steps: InteractionStepLike[] = [];

  for (const msg of windowed) {
    if (msg.role === 'user') {
      steps.push({
        type: 'user_input',
        content: [{ type: 'text', text: msg.content }],
      });
    } else {
      steps.push({
        type: 'model_output',
        content: [{ type: 'text', text: msg.content }],
      });
    }
  }

  return steps;
}
