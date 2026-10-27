import { Injectable } from '@nestjs/common';

export interface McpToolPropertySchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: unknown[];
  [key: string]: unknown;
}

export interface McpToolInputSchema {
  type: 'object';
  properties: Record<string, McpToolPropertySchema>;
  required?: string[];
  [key: string]: unknown;
}

export interface McpToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
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
  annotations?: McpToolAnnotations;
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
    annotations?: McpToolAnnotations;
  }> {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      ...(tool.annotations ? { annotations: tool.annotations } : {}),
    }));
  }

  private validatePropertyType(
    field: string,
    value: unknown,
    propSchema: McpToolPropertySchema,
  ): string | null {
    if (value === undefined || value === null) return null;
    const expectedType = propSchema.type;
    if (!expectedType) return null;

    if (expectedType === 'string' && typeof value !== 'string') {
      return `Parameter '${field}' must be of type string`;
    }
    if (
      (expectedType === 'number' || expectedType === 'integer') &&
      (typeof value !== 'number' || Number.isNaN(value))
    ) {
      return `Parameter '${field}' must be of type ${expectedType}`;
    }
    if (expectedType === 'boolean' && typeof value !== 'boolean') {
      return `Parameter '${field}' must be of type boolean`;
    }
    if (expectedType === 'array' && !Array.isArray(value)) {
      return `Parameter '${field}' must be of type array`;
    }
    if (
      expectedType === 'object' &&
      (typeof value !== 'object' || Array.isArray(value))
    ) {
      return `Parameter '${field}' must be of type object`;
    }
    if (
      Array.isArray(propSchema.enum) &&
      propSchema.enum.length > 0 &&
      !propSchema.enum.includes(value)
    ) {
      return `Parameter '${field}' must be one of: ${propSchema.enum.join(', ')}`;
    }
    return null;
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

    if (
      tool.inputSchema.properties &&
      typeof tool.inputSchema.properties === 'object'
    ) {
      for (const [field, propDef] of Object.entries(
        tool.inputSchema.properties,
      )) {
        if (field in safeArgs && propDef && typeof propDef === 'object') {
          const typeError = this.validatePropertyType(
            field,
            safeArgs[field],
            propDef,
          );
          if (typeError) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Validation Error in '${name}': ${typeError}.`,
                },
              ],
            };
          }
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
