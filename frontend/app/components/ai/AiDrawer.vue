<template>
  <div v-if="aiStore.isOpen" class="fixed inset-0 z-50 overflow-hidden">
    <!-- Backdrop for mobile/tablet screens -->
    <div
      class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity lg:hidden"
      @click="aiStore.closeDrawer()"
    />

    <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
      <div
        class="w-screen max-w-md sm:max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100"
      >
        <!-- Header -->
        <div
          class="p-4 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-900/90 backdrop-blur"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="text-xl">✨</span>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="text-sm font-bold text-white truncate">
                  MaxiWork AI
                </h2>
                <span
                  class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold"
                >
                  Gemini
                </span>
              </div>
              <!-- Session Dropdown -->
              <div class="flex items-center gap-1.5 mt-0.5">
                <select
                  v-if="aiStore.sessions.length > 0"
                  :value="aiStore.activeSessionId"
                  class="bg-slate-800 border border-slate-700/80 rounded px-2 py-0.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 max-w-[180px] sm:max-w-[240px] truncate cursor-pointer"
                  @change="handleSelectSession(($event.target as HTMLSelectElement).value)"
                >
                  <option
                    v-for="s in aiStore.sessions"
                    :key="s.id"
                    :value="s.id"
                  >
                    {{ s.title }}
                  </option>
                </select>
                <span v-else class="text-xs text-slate-500">No sessions</span>

                <!-- New Chat Button -->
                <button
                  type="button"
                  class="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer text-xs"
                  title="Start New Chat"
                  @click="handleNewChat"
                >
                  +
                </button>

                <!-- Delete Session Button -->
                <button
                  v-if="aiStore.activeSessionId"
                  type="button"
                  class="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition cursor-pointer text-xs"
                  title="Delete current chat session"
                  @click="isConfirmDeleteOpen = true"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>

          <!-- Close Button -->
          <div class="flex items-center gap-1">
            <kbd class="hidden sm:inline-block text-[10px] text-slate-500 border border-slate-800 rounded px-1.5 py-0.5">
              Ctrl+J
            </kbd>
            <button
              type="button"
              class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer text-base leading-none ml-1"
              title="Close drawer"
              @click="aiStore.closeDrawer()"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Current Context Bar (if inside list/space/task) -->
        <div
          v-if="activeContextLabel"
          class="px-4 py-1.5 bg-slate-800/40 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 shrink-0"
        >
          <span class="truncate flex items-center gap-1.5">
            <span class="text-slate-500">Context:</span>
            <span class="text-slate-200 font-medium truncate">{{ activeContextLabel }}</span>
          </span>
          <span class="text-[10px] text-emerald-400 flex items-center gap-1 shrink-0 font-mono">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected
          </span>
        </div>

        <!-- Chat History -->
        <div
          ref="messagesContainerRef"
          class="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
        >
          <!-- Empty State -->
          <div
            v-if="aiStore.messages.length === 0 && !aiStore.loadingMessages"
            class="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 text-slate-400"
          >
            <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl">
              ⚡
            </div>
            <div>
              <h3 class="text-sm font-bold text-white mb-1">How can I help you today?</h3>
              <p class="text-xs max-w-xs text-slate-400 leading-relaxed">
                Ask me to create tasks, organize your workspace, look up project status, or draft work items.
              </p>
            </div>

            <!-- Starter Prompts -->
            <div class="w-full space-y-2 pt-2 text-left">
              <button
                v-for="prompt in starterPrompts"
                :key="prompt"
                type="button"
                class="w-full p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 hover:text-white transition cursor-pointer text-left flex items-center gap-2 group"
                @click="submitPrompt(prompt)"
              >
                <span class="text-indigo-400 group-hover:translate-x-0.5 transition-transform">→</span>
                <span class="truncate">{{ prompt }}</span>
              </button>
            </div>
          </div>

          <!-- Messages List -->
          <div
            v-for="(msg, index) in aiStore.messages"
            :key="index"
            class="space-y-2"
          >
            <!-- User Message Bubble -->
            <div
              v-if="msg.role === 'user'"
              class="flex justify-end"
            >
              <div
                class="max-w-[85%] rounded-2xl rounded-tr-xs bg-indigo-600 px-4 py-2.5 text-xs text-white shadow-sm leading-relaxed whitespace-pre-wrap break-words"
              >
                {{ msg.content }}
              </div>
            </div>

            <!-- Assistant Message Bubble -->
            <div
              v-else
              class="flex justify-start gap-2.5"
            >
              <div class="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs shrink-0 select-none">
                ✨
              </div>
              <div class="max-w-[88%] space-y-2 min-w-0">
                <!-- Tool Call Badges -->
                <div
                  v-if="msg.toolCalls && msg.toolCalls.length > 0"
                  class="space-y-1"
                >
                  <div
                    v-for="tool in msg.toolCalls"
                    :key="tool.id"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border max-w-full truncate"
                    :class="
                      tool.inProgress
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        : tool.isError
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    "
                  >
                    <span v-if="tool.inProgress" class="animate-spin text-xs">⚙️</span>
                    <span v-else-if="tool.isError">❌</span>
                    <span v-else>✅</span>
                    <span class="truncate font-sans font-medium">{{ tool.summary || tool.name }}</span>
                  </div>
                </div>

                <!-- Markdown Content -->
                <div
                  class="rounded-2xl rounded-tl-xs bg-slate-800/80 border border-slate-700/60 p-3.5 text-xs text-slate-200 shadow-sm leading-relaxed"
                >
                  <MarkdownViewer
                    :content="msg.content"
                    :interactive-checklists="false"
                    :linkify-tasks="true"
                    empty-placeholder="Thinking..."
                    @task-click="handleTaskClick"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Streaming Typing Indicator -->
          <div
            v-if="aiStore.isStreaming && (!aiStore.messages.length || aiStore.messages[aiStore.messages.length - 1].role === 'user')"
            class="flex items-center gap-2 text-xs text-slate-400 pl-9"
          >
            <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>AI is thinking...</span>
          </div>
        </div>

        <!-- Input Section -->
        <div class="p-3.5 border-t border-slate-800 bg-slate-900 shrink-0 space-y-2">
          <form
            class="flex items-end gap-2"
            @submit.prevent="handleSubmit"
          >
            <div class="relative flex-1">
              <textarea
                ref="textareaRef"
                v-model="inputPrompt"
                rows="1"
                class="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none max-h-32 transition leading-relaxed"
                placeholder="Ask MaxiWork AI... (Shift+Enter for newline)"
                :disabled="aiStore.isStreaming"
                @input="adjustTextareaHeight"
                @keydown.enter="handleEnterKey"
              />
            </div>

            <button
              type="submit"
              class="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center shrink-0 disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/20"
              :disabled="!inputPrompt.trim() || aiStore.isStreaming"
              title="Send message (Enter)"
            >
              <span v-if="aiStore.isStreaming">...</span>
              <span v-else>Send</span>
            </button>
          </form>

          <div class="flex items-center justify-between text-[10px] text-slate-500 px-1">
            <span>Powered by Google Gemini 3.8 Flash</span>
            <span>Enter to send</span>
          </div>
        </div>

        <!-- Delete Session Confirmation Dialog -->
        <ConfirmDialog
          :is-open="isConfirmDeleteOpen"
          title="Delete Chat Session"
          message="Are you sure you want to delete this chat session? All conversation messages will be permanently removed."
          confirm-text="Delete Session"
          is-destructive
          @confirm="confirmDeleteSession"
          @cancel="isConfirmDeleteOpen = false"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAiStore } from '../../stores/ai';
import { useHierarchyStore } from '../../stores/hierarchy';
import type { AiStreamContext } from '../../types/ai';
import MarkdownViewer from '../ui/MarkdownViewer.vue';
import ConfirmDialog from '../ui/ConfirmDialog.vue';

const aiStore = useAiStore();
const hierarchyStore = useHierarchyStore();
const route = useRoute();

const inputPrompt = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const messagesContainerRef = ref<HTMLElement | null>(null);
const isConfirmDeleteOpen = ref(false);

const starterPrompts = [
  'What tasks are assigned to me?',
  'Summarize the current workspace status',
  'Create a high-priority task for fixing the login page',
];

const activeContextLabel = computed(() => {
  const parts: string[] = [];
  if (hierarchyStore.currentWorkspace?.name) {
    parts.push(hierarchyStore.currentWorkspace.name);
  }
  return parts.join(' / ');
});

function getActiveStreamContext(): AiStreamContext {
  const listId = route.params.id && route.path.startsWith('/lists/')
    ? String(route.params.id)
    : undefined;
  const taskId = route.params.taskId ? String(route.params.taskId) : undefined;
  const workspaceId = hierarchyStore.currentWorkspace?._id || undefined;

  return {
    workspaceId,
    listId,
    taskId,
  };
}

function adjustTextareaHeight() {
  if (!textareaRef.value) return;
  textareaRef.value.style.height = 'auto';
  textareaRef.value.style.height = `${Math.min(textareaRef.value.scrollHeight, 128)}px`;
}

function handleEnterKey(e: KeyboardEvent) {
  if (!e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
}

async function handleSubmit() {
  const prompt = inputPrompt.value.trim();
  if (!prompt || aiStore.isStreaming) return;

  inputPrompt.value = '';
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
  }

  const context = getActiveStreamContext();
  await aiStore.sendMessage(prompt, context);
  scrollToBottom();
}

async function submitPrompt(prompt: string) {
  inputPrompt.value = prompt;
  await handleSubmit();
}

function handleSelectSession(sessionId: string) {
  if (sessionId && sessionId !== aiStore.activeSessionId) {
    void aiStore.selectSession(sessionId);
  }
}

async function handleNewChat() {
  await aiStore.createNewSession();
}

async function confirmDeleteSession() {
  if (aiStore.activeSessionId) {
    await aiStore.deleteSession(aiStore.activeSessionId);
  }
  isConfirmDeleteOpen.value = false;
}

function handleTaskClick(taskKey: string) {
  // Try to find and open task or navigate
  if (taskKey) {
    // If inside a list view, could open task or search
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop =
        messagesContainerRef.value.scrollHeight;
    }
  });
}

watch(
  () => [aiStore.messages.length, aiStore.messages[aiStore.messages.length - 1]?.content],
  () => {
    scrollToBottom();
  },
  { deep: true },
);

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
    e.preventDefault();
    aiStore.toggleDrawer();
  } else if (e.key === 'Escape' && aiStore.isOpen && !isConfirmDeleteOpen.value) {
    aiStore.closeDrawer();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>
