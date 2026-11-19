import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { McpToolsRegistryService } from '../mcp/mcp-tools-registry.service';
import { AiSessionsService } from './ai-sessions.service';
import {
  AiStreamContextDto,
  ImproveDescriptionAction,
  ImproveDescriptionDto,
  StreamChatDto,
  SuggestSubtasksDto,
} from './dto/ai.dto';
import {
  buildSlidingWindowHistory,
  convertMcpToolToGeminiFunction,
  InteractionStepLike,
  isMutatingMcpTool,
  summarizeToolExecution,
} from './utils/mcp-gemini-bridge.util';
import { ChatToolCallRecord } from './schemas/chat-session.schema';

export interface SseEventPayload {
  event: 'session' | 'tool_call' | 'tool_result' | 'token' | 'done' | 'error';
  data: Record<string, unknown>;
}

interface GeminiStep {
  type: string;
  id?: string;
  name?: string;
  arguments?: Record<string, unknown>;
  content?: Array<{ type: string; text?: string }>;
}

interface GeminiInteractionResult {
  steps?: GeminiStep[];
  output_text?: string | null;
}

interface ParsedSubtaskJson {
  title?: string;
  priority?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly genAiClient: GoogleGenAI | null = null;
  private readonly defaultModel: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly mcpToolsRegistry: McpToolsRegistryService,
    private readonly aiSessionsService: AiSessionsService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.defaultModel =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-3.8-flash';

    if (apiKey && apiKey.trim() && apiKey !== 'your_gemini_api_key_here') {
      this.genAiClient = new GoogleGenAI({ apiKey });
      this.logger.log(
        `Gemini AI Client initialized with model ${this.defaultModel}`,
      );
    } else {
      this.logger.warn(
        'GEMINI_API_KEY is not configured or placeholder. AI calls will fall back to simulated responses.',
      );
    }
  }

  private buildSystemInstruction(context?: AiStreamContextDto): string {
    const contextLines: string[] = [];
    if (context?.workspaceId) {
      contextLines.push(`- Current Workspace ID: ${context.workspaceId}`);
    }
    if (context?.spaceId) {
      contextLines.push(`- Current Space ID: ${context.spaceId}`);
    }
    if (context?.listId) {
      contextLines.push(`- Current List ID: ${context.listId}`);
    }
    if (context?.taskId) {
      contextLines.push(`- Current Task ID: ${context.taskId}`);
    }

    const contextSection =
      contextLines.length > 0
        ? `\nActive Screen / Workspace Context:\n${contextLines.join('\n')}\n`
        : '';

    return `You are MaxiWork Assistant, an intelligent, helpful in-app AI partner embedded directly into the MaxiWork project and task management system.

Your capabilities:
1. You can inspect workspaces, spaces, lists, and tasks using your provided MCP tools.
2. You can create, update, and prioritize tasks and subtasks for the user.
3. You can set workflow statuses on tasks using smart status matching.

CRITICAL BEHAVIORAL RULES:
- Safe Destructive Actions: Before calling the destructive 'delete_task' tool, you MUST ALWAYS ask for explicit confirmation in chat and specify the exact taskKey or title that will be deleted. Only invoke 'delete_task' if the user explicitly confirmed deletion.
- Task Keys: When referencing tasks, always include their taskKey (e.g. 'GEN-1', 'MAX-12') so the user interface can format them into interactive pills.
- Concise and professional: Format your output in clean GitHub-Flavored Markdown. Use bullet points and bold text where appropriate.${contextSection}`;
  }

  async streamChat(
    userId: string,
    dto: StreamChatDto,
    sendEvent: (event: SseEventPayload) => void,
  ): Promise<void> {
    let session = dto.sessionId
      ? await this.aiSessionsService.getSession(dto.sessionId, userId)
      : null;

    if (!session) {
      const created = await this.aiSessionsService.createSession(
        userId,
        dto.message,
      );
      session = await this.aiSessionsService.getSession(created.id, userId);
    }

    const sessionId = session._id.toString();
    sendEvent({
      event: 'session',
      data: { sessionId, title: session.title },
    });

    const mcpTools = this.mcpToolsRegistry.listTools();
    const geminiTools = mcpTools.map((t) => convertMcpToolToGeminiFunction(t));

    const historySteps = buildSlidingWindowHistory(session.messages, 20);
    const userPromptStep: InteractionStepLike = {
      type: 'user_input',
      content: [{ type: 'text', text: dto.message }],
    };
    const conversationInput: InteractionStepLike[] = [
      ...historySteps,
      userPromptStep,
    ];

    const systemInstruction = this.buildSystemInstruction(dto.context);
    const toolCallRecords: ChatToolCallRecord[] = [];
    let accumulatedModelText = '';
    let hasMutatingAction = false;
    const MAX_TURNS = 5;

    try {
      if (!this.genAiClient) {
        // Fallback simulation when GEMINI_API_KEY is not configured
        const fallbackText = `I received your message: "${dto.message}". (Note: GEMINI_API_KEY is not configured in .env, so I am running in local fallback mode).`;
        for (const word of fallbackText.split(' ')) {
          sendEvent({
            event: 'token',
            data: { text: `${word} ` },
          });
        }
        accumulatedModelText = fallbackText;
      } else {
        let turn = 0;
        let continueLoop = true;

        while (continueLoop && turn < MAX_TURNS) {
          turn++;

          const interaction = (await this.genAiClient.interactions.create({
            model: this.defaultModel,
            input: conversationInput as unknown as string,
            tools: geminiTools,
            system_instruction: systemInstruction,
          })) as unknown as GeminiInteractionResult;

          const steps = Array.isArray(interaction.steps)
            ? interaction.steps
            : [];
          const functionCalls = steps.filter((s) => s.type === 'function_call');

          if (functionCalls.length > 0) {
            for (const step of steps) {
              conversationInput.push({
                type: step.type as InteractionStepLike['type'],
                name: step.name,
                call_id: step.id,
                arguments: step.arguments,
                content: step.content as
                  | Array<{ type: 'text'; text: string }>
                  | undefined,
              });
            }

            for (const call of functionCalls) {
              const callId = call.id || `call_${Date.now()}`;
              const toolName = call.name || '';
              const callArgs = call.arguments || {};

              sendEvent({
                event: 'tool_call',
                data: {
                  id: callId,
                  name: toolName,
                  args: callArgs,
                },
              });

              // Execute tool via MCP registry with authenticated user ID
              const result = await this.mcpToolsRegistry.executeTool(
                toolName,
                callArgs,
                userId,
              );

              const resultText =
                Array.isArray(result.content) && result.content[0]
                  ? result.content[0].text
                  : JSON.stringify(result);

              const summary = summarizeToolExecution(
                toolName,
                callArgs,
                resultText,
              );
              const isMutating = isMutatingMcpTool(toolName) && !result.isError;
              if (isMutating) {
                hasMutatingAction = true;
              }

              const toolRecord: ChatToolCallRecord = {
                id: callId,
                name: toolName,
                title: toolName,
                args: callArgs,
                isError: !!result.isError,
                summary,
              };
              toolCallRecords.push(toolRecord);

              sendEvent({
                event: 'tool_result',
                data: {
                  id: callId,
                  name: toolName,
                  isError: !!result.isError,
                  summary,
                  mutated: isMutating,
                },
              });

              conversationInput.push({
                type: 'function_result',
                name: toolName,
                call_id: callId,
                result: resultText,
              });
            }
          } else {
            continueLoop = false;
            const outputText = interaction.output_text || '';
            accumulatedModelText = outputText;

            if (outputText) {
              const chunks = outputText.match(/.{1,16}/gs) || [outputText];
              for (const chunk of chunks) {
                sendEvent({
                  event: 'token',
                  data: { text: chunk },
                });
              }
            }
          }
        }
      }

      await this.aiSessionsService.appendTurn(
        sessionId,
        userId,
        dto.message,
        accumulatedModelText,
        toolCallRecords,
      );

      sendEvent({
        event: 'done',
        data: {
          sessionId,
          mutated: hasMutatingAction,
        },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown AI streaming error';
      this.logger.error(`Error in streamChat: ${message}`, err);
      sendEvent({
        event: 'error',
        data: { message },
      });
    }
  }

  async suggestSubtasks(
    _userId: string,
    dto: SuggestSubtasksDto,
  ): Promise<{
    subtasks: Array<{
      title: string;
      description?: string;
      priority: 'low' | 'medium' | 'high';
    }>;
  }> {
    const desiredCount = dto.count || 4;

    if (!this.genAiClient) {
      return {
        subtasks: [
          {
            title: `Plan implementation for ${dto.title}`,
            priority: 'medium',
          },
          {
            title: `Write unit tests for ${dto.title}`,
            priority: 'medium',
          },
          {
            title: `Verify edge cases and user flows`,
            priority: 'low',
          },
        ],
      };
    }

    try {
      const prompt = `You are a technical project manager. Break down the following task into ${desiredCount} distinct, actionable subtasks.
Task Title: ${dto.title}
Task Description: ${dto.description || 'No description provided'}

Return ONLY a valid JSON array of objects with the exact schema:
[
  { "title": "Subtask title", "priority": "low" | "medium" | "high" }
]
Do not wrap in markdown quotes or extra text. Return raw JSON.`;

      const response = (await this.genAiClient.interactions.create({
        model: this.defaultModel,
        input: prompt,
      })) as unknown as GeminiInteractionResult;

      const rawText = response.output_text || '[]';
      const cleaned = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(cleaned) as ParsedSubtaskJson[];

      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          subtasks: parsed.map((item) => ({
            title: String(item.title || 'Subtask').trim(),
            priority:
              item.priority === 'low' ||
              item.priority === 'medium' ||
              item.priority === 'high'
                ? item.priority
                : 'medium',
          })),
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to parse AI subtasks response: ${msg}`);
    }

    return {
      subtasks: [
        {
          title: `Analyze requirements for ${dto.title}`,
          priority: 'medium',
        },
        {
          title: `Implement core logic for ${dto.title}`,
          priority: 'high',
        },
        {
          title: `Test and verify changes`,
          priority: 'medium',
        },
      ],
    };
  }

  async improveDescription(
    _userId: string,
    dto: ImproveDescriptionDto,
  ): Promise<{ description: string }> {
    const currentDesc = dto.description || '';

    if (!this.genAiClient) {
      if (dto.action === ImproveDescriptionAction.ACCEPTANCE_CRITERIA) {
        return {
          description: `${currentDesc}\n\n### Acceptance Criteria\n- [ ] Core functionality implemented according to specifications\n- [ ] Edge cases handled with appropriate error messages\n- [ ] Automated tests pass with 100% success rate`,
        };
      }
      return {
        description: `## Overview\n${currentDesc || dto.title}\n\n### Key Considerations\n- Clear task objectives\n- Comprehensive verification`,
      };
    }

    let instruction = '';
    switch (dto.action) {
      case ImproveDescriptionAction.EXPAND:
        instruction =
          'Expand these initial task notes into a structured, comprehensive task specification with Overview, Technical Details, and Verification Notes. Use clean Markdown.';
        break;
      case ImproveDescriptionAction.POLISH:
        instruction =
          'Polish and rewrite this task description for professional clarity, fix any grammar or spelling mistakes, and structure with neat Markdown headings and bullet points.';
        break;
      case ImproveDescriptionAction.ACCEPTANCE_CRITERIA:
        instruction =
          'Preserve the existing description and append a clear "### Acceptance Criteria" section with 3 to 6 testable Markdown checklist items (- [ ] ...).';
        break;
    }

    try {
      const prompt = `Task Title: ${dto.title}
Current Description:
${currentDesc || 'None'}

Instruction: ${instruction}
Return ONLY the revised Markdown text without introductory or concluding conversational chatter.`;

      const response = (await this.genAiClient.interactions.create({
        model: this.defaultModel,
        input: prompt,
      })) as unknown as GeminiInteractionResult;

      const output = response.output_text || currentDesc;
      return { description: output.trim() };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to improve description: ${msg}`);
      return { description: currentDesc };
    }
  }
}
