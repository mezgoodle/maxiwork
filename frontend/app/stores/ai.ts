import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
  AiChatMessage,
  AiChatSessionHeader,
  AiStreamContext,
  AiToolCallBadge,
  ImproveDescriptionAction,
  SuggestedSubtaskItem,
} from '../types/ai';
import { useApi } from '../composables/useApi';
import { useAuthStore } from './auth';

export const useAiStore = defineStore('ai', () => {
  const { apiFetch } = useApi();
  const authStore = useAuthStore();

  const getApiBase = (): string => {
    if (typeof useRuntimeConfig === 'function') {
      try {
        const config = useRuntimeConfig();
        return (config.public?.apiBase as string) || 'http://localhost:3000/api';
      } catch {
        return 'http://localhost:3000/api';
      }
    }
    return 'http://localhost:3000/api';
  };

  const isOpen = ref(false);
  const isStreaming = ref(false);
  const loadingSessions = ref(false);
  const loadingMessages = ref(false);
  const activeSessionId = ref<string | null>(null);
  const sessions = ref<AiChatSessionHeader[]>([]);
  const messages = ref<AiChatMessage[]>([]);
  const mutationVersion = ref(0);

  function toggleDrawer() {
    isOpen.value = !isOpen.value;
    if (isOpen.value && sessions.value.length === 0) {
      void fetchSessions();
    }
  }

  function openDrawer() {
    isOpen.value = true;
    if (sessions.value.length === 0) {
      void fetchSessions();
    }
  }

  function closeDrawer() {
    isOpen.value = false;
  }

  async function fetchSessions(): Promise<void> {
    loadingSessions.value = true;
    try {
      const res = await apiFetch<AiChatSessionHeader[]>('/ai/sessions');
      sessions.value = Array.isArray(res) ? res : [];
      if (!activeSessionId.value && sessions.value.length > 0) {
        await selectSession(sessions.value[0].id);
      }
    } catch {
      sessions.value = [];
    } finally {
      loadingSessions.value = false;
    }
  }

  async function selectSession(sessionId: string): Promise<void> {
    activeSessionId.value = sessionId;
    loadingMessages.value = true;
    try {
      const res = await apiFetch<AiChatMessage[]>(
        `/ai/sessions/${sessionId}/messages`,
      );
      messages.value = Array.isArray(res) ? res : [];
    } catch {
      messages.value = [];
    } finally {
      loadingMessages.value = false;
    }
  }

  async function createNewSession(): Promise<string> {
    try {
      const created = await apiFetch<AiChatSessionHeader>('/ai/sessions', {
        method: 'POST',
        body: { title: 'New Chat' },
      });
      sessions.value.unshift(created);
      activeSessionId.value = created.id;
      messages.value = [];
      return created.id;
    } catch {
      activeSessionId.value = null;
      messages.value = [];
      return '';
    }
  }

  async function deleteSession(sessionId: string): Promise<void> {
    await apiFetch(`/ai/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    sessions.value = sessions.value.filter((s) => s.id !== sessionId);
    if (activeSessionId.value === sessionId) {
      if (sessions.value.length > 0) {
        await selectSession(sessions.value[0].id);
      } else {
        activeSessionId.value = null;
        messages.value = [];
      }
    }
  }

  async function sendMessage(
    prompt: string,
    context?: AiStreamContext,
  ): Promise<void> {
    const trimmed = prompt.trim();
    if (!trimmed || isStreaming.value) return;

    const userMessage: AiChatMessage = {
      role: 'user',
      content: trimmed,
      toolCalls: [],
      timestamp: new Date().toISOString(),
    };
    messages.value.push(userMessage);

    const assistantMessage: AiChatMessage = {
      role: 'model',
      content: '',
      toolCalls: [],
      timestamp: new Date().toISOString(),
    };
    messages.value.push(assistantMessage);

    isStreaming.value = true;

    try {
      const apiBase = getApiBase();
      let token = authStore.accessToken;

      const makeRequest = async (authToken: string) => {
        return fetch(`${apiBase}/ai/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            sessionId: activeSessionId.value || undefined,
            message: trimmed,
            context,
          }),
        });
      };

      let response = await makeRequest(token);

      // Handle 401 token refresh retry
      if (response.status === 401) {
        const refreshed = await authStore.refreshTokens();
        if (refreshed) {
          token = authStore.accessToken;
          response = await makeRequest(token);
        } else {
          throw new Error('Unauthorized');
        }
      }

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('event:')) {
            currentEvent = trimmedLine.replace('event:', '').trim();
          } else if (trimmedLine.startsWith('data:')) {
            const rawData = trimmedLine.replace('data:', '').trim();
            if (!rawData) continue;

            try {
              const data = JSON.parse(rawData);

              if (currentEvent === 'session' && data.sessionId) {
                if (!activeSessionId.value) {
                  activeSessionId.value = data.sessionId;
                  sessions.value.unshift({
                    id: data.sessionId,
                    title: data.title || 'New Chat',
                    messagesCount: 2,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                }
              } else if (currentEvent === 'token' && data.text) {
                assistantMessage.content += data.text;
              } else if (currentEvent === 'tool_call') {
                const badge: AiToolCallBadge = {
                  id: data.id,
                  name: data.name,
                  args: data.args,
                  inProgress: true,
                  summary: `Executing ${data.name}...`,
                };
                if (!assistantMessage.toolCalls) {
                  assistantMessage.toolCalls = [];
                }
                assistantMessage.toolCalls.push(badge);
              } else if (currentEvent === 'tool_result') {
                const badge = assistantMessage.toolCalls?.find(
                  (b) => b.id === data.id,
                );
                if (badge) {
                  badge.inProgress = false;
                  badge.isError = !!data.isError;
                  badge.summary = data.summary;
                }
                if (data.mutated) {
                  mutationVersion.value++;
                }
              } else if (currentEvent === 'done') {
                if (data.mutated) {
                  mutationVersion.value++;
                }
              }
            } catch {
              // Ignore non-json SSE lines
            }
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chat error';
      assistantMessage.content += `\n\n*(Error: ${msg})*`;
    } finally {
      isStreaming.value = false;
    }
  }

  async function suggestSubtasks(payload: {
    taskId?: string;
    title: string;
    description?: string;
    count?: number;
  }): Promise<SuggestedSubtaskItem[]> {
    const res = await apiFetch<{ subtasks: SuggestedSubtaskItem[] }>(
      '/ai/tasks/suggest-subtasks',
      {
        method: 'POST',
        body: payload,
      },
    );
    return Array.isArray(res?.subtasks) ? res.subtasks : [];
  }

  async function improveDescription(payload: {
    title: string;
    description?: string;
    action: ImproveDescriptionAction;
  }): Promise<string> {
    const res = await apiFetch<{ description: string }>(
      '/ai/tasks/improve-description',
      {
        method: 'POST',
        body: payload,
      },
    );
    return res?.description || '';
  }

  return {
    isOpen,
    isStreaming,
    loadingSessions,
    loadingMessages,
    activeSessionId,
    sessions,
    messages,
    mutationVersion,
    toggleDrawer,
    openDrawer,
    closeDrawer,
    fetchSessions,
    selectSession,
    createNewSession,
    deleteSession,
    sendMessage,
    suggestSubtasks,
    improveDescription,
  };
});
