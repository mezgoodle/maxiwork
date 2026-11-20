export interface AiToolCallBadge {
  id: string;
  name: string;
  args?: Record<string, unknown>;
  isError?: boolean;
  summary?: string;
  inProgress?: boolean;
}

export interface AiChatMessage {
  id?: string;
  role: 'user' | 'model';
  content: string;
  toolCalls?: AiToolCallBadge[];
  timestamp: string;
}

export interface AiChatSessionHeader {
  id: string;
  title: string;
  messagesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiStreamContext {
  workspaceId?: string;
  spaceId?: string;
  listId?: string;
  taskId?: string;
}

export interface SuggestedSubtaskItem {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
}

export type ImproveDescriptionAction = 'expand' | 'polish' | 'acceptance_criteria';
