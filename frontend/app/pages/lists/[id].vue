<template>
  <div class="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
    <!-- Top Header Bar -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <span>{{ hierarchyStore.currentWorkspace?.name || 'Workspace' }}</span>
          <span>/</span>
          <span v-if="currentSpace" class="text-slate-300">
            {{ currentSpace.name }}
          </span>
          <span v-if="currentSpace">/</span>
          <span v-if="listDetails" class="text-indigo-400 font-medium">
            {{ listDetails.name }}
          </span>
        </div>

        <div v-if="listDetails" class="flex items-center gap-3">
          <span
            class="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
            :style="{ backgroundColor: listDetails.color || '#4F46E5' }"
          />
          <h1 class="text-2xl font-extrabold text-white">
            {{ listDetails.name }}
          </h1>
        </div>
        <div v-else-if="loading" class="h-8 w-48 bg-slate-800 rounded animate-pulse" />
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3">
        <!-- View Toggle -->
        <div class="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-xl p-1 text-xs font-medium text-slate-300">
          <button
            type="button"
            class="px-3 py-1 rounded-lg transition cursor-pointer"
            :class="activeView === 'board' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:text-white'"
            @click="activeView = 'board'"
          >
            Board
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded-lg transition cursor-pointer"
            :class="activeView === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:text-white'"
            @click="activeView = 'list'"
          >
            List
          </button>
        </div>

        <button
          type="button"
          class="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
          @click="openCreateTaskModal('todo')"
        >
          <span>+</span>
          <span>New Task</span>
        </button>
      </div>
    </div>

    <!-- Error Banner -->
    <div
      v-if="error"
      class="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between"
    >
      <span>{{ error }}</span>
      <button
        type="button"
        class="text-xs underline hover:text-white cursor-pointer"
        @click="loadList"
      >
        Retry
      </button>
    </div>

    <!-- Quick Inline Add Task -->
    <div class="mb-6">
      <form
        class="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-2 sm:p-2.5"
        @submit.prevent="handleQuickAdd"
      >
        <span class="pl-3 text-slate-500 text-sm font-bold">+</span>
        <input
          v-model="quickTitle"
          type="text"
          placeholder="Add a new task to this list... (press Enter)"
          class="flex-1 bg-transparent border-none text-sm text-slate-100 placeholder-slate-500 focus:outline-none px-2"
          :disabled="isQuickAdding"
        >
        <button
          type="submit"
          :disabled="!quickTitle.trim() || isQuickAdding"
          class="px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer disabled:opacity-40"
        >
          {{ isQuickAdding ? 'Adding...' : 'Add Task' }}
        </button>
      </form>
    </div>

    <!-- Content Area: Board or List View -->
    <div v-if="loading" class="flex-1 flex items-center justify-center py-16">
      <div class="text-slate-400 text-sm animate-pulse">Loading list items...</div>
    </div>

    <div v-else class="flex-1 flex flex-col">
      <!-- Empty state when no tasks -->
      <div
        v-if="tasks.length === 0"
        class="flex-1 flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center"
      >
        <span class="text-4xl mb-3">📋</span>
        <h3 class="text-lg font-bold text-white mb-1">This list is empty</h3>
        <p class="text-sm text-slate-400 mb-6 max-w-sm">
          Get started by adding actionable tasks to this list.
        </p>
        <button
          type="button"
          class="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer shadow-lg shadow-indigo-600/20"
          @click="openCreateTaskModal('todo')"
        >
          + Add First Task
        </button>
      </div>

      <!-- Board View (Unified KanbanBoard Component) -->
      <div v-else-if="activeView === 'board'" class="flex-1">
        <KanbanBoard
          :tasks="tasks"
          :list-id="listId"
          :loading="loading"
          @task-drop="handleDrop"
          @create-task="openCreateTaskModal"
          @task-click="openTaskDetail"
          @delete-task="handleDeleteTask"
        />
      </div>

      <!-- List View (Table / Rows) -->
      <div v-else class="space-y-2">
        <div
          v-for="task in tasks"
          :key="task._id"
          class="p-4 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-500 rounded-xl transition flex items-center justify-between gap-4 cursor-pointer"
          @click="openTaskDetail(task)"
        >
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <span class="text-xs font-mono font-bold text-indigo-400 shrink-0">
              {{ task.taskKey || 'TASK' }}
            </span>
            <span class="text-sm font-medium text-slate-100 truncate">
              {{ task.title }}
            </span>
            <span
              v-if="task.subtasksCount && task.subtasksCount > 0"
              class="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-900/60 border border-slate-700/60 shrink-0"
              :class="task.completedSubtasksCount === task.subtasksCount ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-400'"
              title="Subtasks"
            >
              ↳ {{ task.completedSubtasksCount || 0 }}/{{ task.subtasksCount }}
            </span>
          </div>

          <div class="flex items-center gap-3 shrink-0" @click.stop>
            <span
              class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full"
              :class="getPriorityClass(task.priority)"
            >
              {{ task.priority || 'medium' }}
            </span>

            <!-- Assignee avatar -->
            <span
              v-if="task.assignee"
              class="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center text-xs font-bold"
              :title="getUserDisplayName(task.assignee)"
            >
              {{ getUserInitials(task.assignee) }}
            </span>

            <select
              :value="task.status"
              class="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none capitalize cursor-pointer"
              @change="handleStatusChange(task._id, ($event.target as HTMLSelectElement).value as TaskStatus)"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
            </select>

            <button
              type="button"
              class="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700/50 transition cursor-pointer text-xs"
              title="Delete task"
              @click.stop="handleDeleteTask(task._id)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Unified Task Creation/Edit Modal -->
    <TaskFormModal
      :is-open="isCreateModalOpen"
      :list-id="listId"
      :default-status="modalDefaultStatus"
      @close="isCreateModalOpen = false"
      @saved="handleTaskSaved"
    />

    <!-- Task Detail Drawer / Modal -->
    <TaskDetailDrawer
      :is-open="isDetailOpen"
      :list-id="listId"
      :task="selectedTask"
      @close="isDetailOpen = false"
      @updated="handleTaskUpdated"
      @deleted="handleTaskDeleted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useHierarchyStore } from '../../stores/hierarchy';
import { useApi } from '../../composables/useApi';
import { useToast } from '../../composables/useToast';
import { extractApiErrorMessage } from '../../utils/error';
import { getPriorityBadgeClass, getUserDisplayName, getUserInitials } from '../../utils/task';
import type { List, Space } from '../../types/hierarchy';
import type { Task, TaskPriority, TaskStatus } from '../../types/task';
import KanbanBoard from '../../components/board/KanbanBoard.vue';
import TaskFormModal from '../../components/task/TaskFormModal.vue';
import TaskDetailDrawer from '../../components/task/TaskDetailDrawer.vue';

definePageMeta({
  middleware: ['auth'],
});

const route = useRoute();
const listId = computed(() => String(route.params.id || ''));

const hierarchyStore = useHierarchyStore();
const { apiFetch } = useApi();
const { showToast } = useToast();

const activeView = ref<'board' | 'list'>('board');
const loading = ref(false);
const error = ref<string | null>(null);
const listDetails = ref<List | null>(null);
const tasks = ref<Task[]>([]);

const isCreateModalOpen = ref(false);
const modalDefaultStatus = ref<TaskStatus>('todo');

const selectedTask = ref<Task | null>(null);
const isDetailOpen = ref(false);

const quickTitle = ref('');
const isQuickAdding = ref(false);

const currentSpace = computed<Space | null>(() => {
  if (!listDetails.value) return null;
  const sp = hierarchyStore.tree.find((s) => s.id === listDetails.value?.spaceId);
  if (!sp) return null;
  return {
    _id: sp.id,
    workspaceId: sp.workspaceId,
    name: sp.name,
    description: sp.description,
    icon: sp.icon,
    color: sp.color,
    isPrivate: sp.isPrivate,
    order: sp.order,
    features: { customStatuses: true, customFields: true, calendarView: true },
    createdAt: '',
    updatedAt: '',
  };
});

function getPriorityClass(priority?: TaskPriority): string {
  return getPriorityBadgeClass(priority);
}

async function loadList() {
  if (!listId.value) return;

  loading.value = true;
  error.value = null;

  try {
    const res = await apiFetch<List>(`/lists/${listId.value}`, { method: 'GET' });
    listDetails.value = res;

    try {
      const taskRes = await apiFetch<Task[]>(
        `/lists/${listId.value}/tasks`,
        { method: 'GET' },
      );
      tasks.value = Array.isArray(taskRes) ? taskRes : [];
    } catch {
      tasks.value = [];
    }
  } catch (err: unknown) {
    error.value = extractApiErrorMessage(err, 'Failed to load list details');
  } finally {
    loading.value = false;
  }
}

function openCreateTaskModal(status?: TaskStatus) {
  modalDefaultStatus.value = status || 'todo';
  isCreateModalOpen.value = true;
}

function openTaskDetail(task: Task) {
  selectedTask.value = task;
  isDetailOpen.value = true;
}

function handleTaskSaved(task: Task) {
  const existingIdx = tasks.value.findIndex((t) => t._id === task._id);
  if (existingIdx !== -1) {
    tasks.value[existingIdx] = task;
  } else {
    tasks.value.unshift(task);
  }
}

function handleTaskUpdated(updated: Task) {
  const idx = tasks.value.findIndex((t) => t._id === updated._id);
  if (idx !== -1) {
    tasks.value[idx] = updated;
  }
  if (selectedTask.value?._id === updated._id) {
    selectedTask.value = updated;
  }
}

function handleTaskDeleted(taskId: string) {
  tasks.value = tasks.value.filter((t) => t._id !== taskId);
}

async function handleQuickAdd() {
  const title = quickTitle.value.trim();
  if (!title || !listId.value) return;

  isQuickAdding.value = true;
  try {
    const created = await apiFetch<Task>(`/lists/${listId.value}/tasks`, {
      method: 'POST',
      body: { title, status: 'todo' },
    });
    tasks.value.unshift(created);
    quickTitle.value = '';
    showToast(`Created task ${created.taskKey}`, 'success');
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to add task'), 'error');
  } finally {
    isQuickAdding.value = false;
  }
}

async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
  try {
    const updated = await apiFetch<Task>(`/lists/${listId.value}/tasks/${taskId}`, {
      method: 'PATCH',
      body: { status: newStatus },
    });
    handleTaskUpdated(updated);
    showToast(`Status updated to ${newStatus.replace('_', ' ')}`, 'success');
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to update status'), 'error');
  }
}

async function handleDeleteTask(taskId: string) {
  try {
    await apiFetch(`/lists/${listId.value}/tasks/${taskId}`, {
      method: 'DELETE',
    });
    handleTaskDeleted(taskId);
    showToast('Task deleted', 'success');
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to delete task'), 'error');
  }
}

async function handleDrop(taskId: string, newStatus: TaskStatus) {
  const targetTask = tasks.value.find((t) => t._id === taskId);
  if (!targetTask || targetTask.status === newStatus) return;
  await handleStatusChange(taskId, newStatus);
}

onMounted(() => {
  loadList();
});

watch(listId, () => {
  loadList();
});
</script>
