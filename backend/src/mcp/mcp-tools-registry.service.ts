import { Injectable } from '@nestjs/common';

export interface McpToolInputSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface McpToolContentBlock {
  type: 'text';
  text: string;
  [key: string]: unknown;
}

export interface McpToolExecutionResult {
  content: McpToolContentBlock[];
  isError?: boolean;
  [key: string]: unknown;
}

export type McpToolHandler = (
  args: Record<string, unknown>,
  userId: string,
) => Promise<McpToolExecutionResult>;

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: McpToolInputSchema;
  handler: McpToolHandler;
}

@Injectable()
export class McpToolsRegistryService {
  private readonly tools = new Map<string, McpToolDefinition>();

  registerTool(definition: McpToolDefinition): void {
    this.tools.set(definition.name, definition);
  }

  getTool(name: string): McpToolDefinition | undefined {
    return this.tools.get(name);
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  listTools(): Array<{
    name: string;
    description: string;
    inputSchema: McpToolInputSchema;
  }> {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  async executeTool(
    name: string,
    args: Record<string, unknown> | undefined,
    userId: string,
  ): Promise<McpToolExecutionResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error: Tool '${name}' is not registered on this MCP server.`,
          },
        ],
      };
    }

    const safeArgs: Record<string, unknown> =
      args && typeof args === 'object' ? args : {};

    if (Array.isArray(tool.inputSchema.required)) {
      for (const reqField of tool.inputSchema.required) {
        const val = safeArgs[reqField];
        if (
          val === undefined ||
          val === null ||
          (typeof val === 'string' && val.trim() === '')
        ) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Validation Error: Missing required parameter '${reqField}' for tool '${name}'.`,
              },
            ],
          };
        }
      }
    }

    try {
      return await tool.handler(safeArgs, userId);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unexpected tool error';
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error executing '${name}': ${message}`,
          },
        ],
      };
    }
  }
}
