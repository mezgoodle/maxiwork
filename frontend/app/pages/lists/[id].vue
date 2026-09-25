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
        <!-- Subtasks Toggle (in List View) -->
        <button
          v-if="activeView === 'list'"
          type="button"
          class="px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5"
          :class="
            showSubtasks
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-xs'
              : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-white'
          "
          :title="showSubtasks ? 'Hide subtasks in list' : 'Show subtasks under parent tasks'"
          @click="toggleShowSubtasks"
        >
          <span>↳</span>
          <span>{{ showSubtasks ? 'Subtasks: Shown' : 'Show Subtasks' }}</span>
        </button>

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
          @delete-task="promptDeleteTask"
        />
      </div>

      <!-- List View (Detailed Task Rows + Expandable Subtasks) -->
      <div v-else class="space-y-2">
        <div
          v-for="task in tasks"
          :key="task._id"
          class="space-y-1"
        >
          <!-- Parent Task Row -->
          <div
            class="p-3.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-500/80 rounded-xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer shadow-sm group"
            @click="openTaskDetail(task)"
          >
            <!-- Left: Expand Arrow + Done Checkbox + Key + Title + Subtasks count -->
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <!-- Expand / Collapse arrow button for subtasks -->
              <button
                v-if="task.subtasksCount && task.subtasksCount > 0"
                type="button"
                class="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/60 transition cursor-pointer shrink-0 text-xs"
                :title="isTaskExpanded(task._id) ? 'Collapse subtasks' : 'Expand subtasks'"
                @click.stop="toggleTaskExpand(task._id)"
              >
                <span
                  class="transition-transform duration-200"
                  :class="isTaskExpanded(task._id) ? 'rotate-90' : ''"
                >
                  ▶
                </span>
              </button>
              <div v-else class="w-5 shrink-0" />

              <!-- Quick Done toggle button -->
              <button
                type="button"
                class="w-6 h-6 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0"
                :class="
                  task.status === 'done'
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950 hover:bg-emerald-400 shadow-xs shadow-emerald-500/30'
                    : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/50'
                "
                :title="task.status === 'done' ? 'Reopen task (To Do)' : 'Mark task as Done'"
                @click.stop="toggleTaskDone(task)"
              >
                <span class="text-xs font-bold leading-none">✓</span>
              </button>

              <!-- Key Badge -->
              <span class="text-xs font-mono font-bold text-indigo-400 shrink-0">
                {{ task.taskKey || 'TASK' }}
              </span>

              <!-- Title -->
              <span
                class="text-sm font-medium truncate transition"
                :class="task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-100 group-hover:text-indigo-300'"
              >
                {{ task.title }}
              </span>

              <!-- Description snippet if present -->
              <span
                v-if="task.description"
                class="text-xs text-slate-500 truncate max-w-xs hidden lg:inline"
              >
                — {{ task.description }}
              </span>

              <!-- Subtasks pill -->
              <span
                v-if="task.subtasksCount && task.subtasksCount > 0"
                class="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-900/60 border border-slate-700/60 shrink-0 hidden sm:inline cursor-pointer hover:border-indigo-500/50"
                :class="task.completedSubtasksCount === task.subtasksCount ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-400'"
                title="Click to toggle subtasks"
                @click.stop="toggleTaskExpand(task._id)"
              >
                ↳ {{ task.completedSubtasksCount || 0 }}/{{ task.subtasksCount }}
              </span>
            </div>

            <!-- Right: Detailed fields (Dates, Assignee, Priority, Status) -->
            <div class="flex items-center gap-3 shrink-0 self-end sm:self-auto" @click.stop>
              <!-- Due Date badge -->
              <div
                v-if="task.dueDate"
                class="flex items-center gap-1 font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-900/70 border shrink-0"
                :class="getDateBadgeClass(task.dueDate, task.status)"
                :title="`Due date: ${formatDate(task.dueDate)}`"
              >
                <span>📅</span>
                <span>{{ formatDate(task.dueDate) }}</span>
              </div>

              <!-- Priority badge -->
              <span
                class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shrink-0"
                :class="getPriorityClass(task.priority)"
              >
                {{ task.priority || 'medium' }}
              </span>

              <!-- Assignee avatar + name -->
              <div
                v-if="task.assignee"
                class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/60 border border-slate-700/60 shrink-0"
                :title="getUserDisplayName(task.assignee)"
              >
                <span
                  class="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center text-[10px] font-bold"
                >
                  {{ getUserInitials(task.assignee) }}
                </span>
                <span class="text-xs text-slate-300 max-w-[120px] truncate hidden md:inline">
                  {{ getUserDisplayName(task.assignee) }}
                </span>
              </div>
              <div
                v-else
                class="text-xs text-slate-500 italic shrink-0 hidden sm:inline px-1"
              >
                Unassigned
              </div>

              <!-- Status selector -->
              <select
                :value="task.status"
                class="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none capitalize cursor-pointer shrink-0"
                @change="handleStatusChange(task._id, ($event.target as HTMLSelectElement).value as TaskStatus)"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <!-- Indented Subtasks Section under Parent Task -->
          <div
            v-if="isTaskExpanded(task._id) && subtasksMap[task._id]?.length"
            class="pl-7 sm:pl-10 space-y-1.5 pt-0.5 pb-1"
          >
            <div
              v-for="sub in subtasksMap[task._id]"
              :key="sub._id"
              class="p-2.5 bg-slate-900/70 hover:bg-slate-850 border border-slate-800/80 hover:border-slate-700 rounded-xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group/sub shadow-xs"
              @click="openTaskDetail(sub)"
            >
              <!-- Left: Checkbox + Subtask Key + Title -->
              <div class="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  type="button"
                  class="w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  :class="
                    sub.status === 'done'
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 hover:bg-emerald-400'
                      : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-emerald-400'
                  "
                  :title="sub.status === 'done' ? 'Reopen subtask' : 'Mark subtask as Done'"
                  @click.stop="toggleTaskDone(sub)"
                >
                  <span class="text-[10px] font-bold leading-none">✓</span>
                </button>

                <span class="text-slate-500 font-mono text-xs font-semibold shrink-0">↳</span>
                <span class="text-[11px] font-mono font-bold text-slate-400 shrink-0">
                  {{ sub.taskKey }}
                </span>

                <span
                  class="text-xs font-medium truncate transition"
                  :class="sub.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200 group-hover/sub:text-indigo-300'"
                >
                  {{ sub.title }}
                </span>
              </div>

              <!-- Right: Subtask Fields (Date, Priority, Assignee, Status) -->
              <div class="flex items-center gap-2.5 shrink-0 self-end sm:self-auto" @click.stop>
                <span
                  v-if="sub.dueDate"
                  class="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-900 border"
                  :class="getDateBadgeClass(sub.dueDate, sub.status)"
                >
                  📅 {{ formatDate(sub.dueDate) }}
                </span>

                <span
                  class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shrink-0"
                  :class="getPriorityClass(sub.priority)"
                >
                  {{ sub.priority || 'medium' }}
                </span>

                <span
                  v-if="sub.assignee"
                  class="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center text-[10px] font-bold"
                  :title="getUserDisplayName(sub.assignee)"
                >
                  {{ getUserInitials(sub.assignee) }}
                </span>

                <select
                  :value="sub.status"
                  class="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2 py-0.5 text-slate-200 focus:outline-none capitalize cursor-pointer shrink-0"
                  @change="handleStatusChange(sub._id, ($event.target as HTMLSelectElement).value as TaskStatus)"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
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

    <!-- Delete Task Confirmation Dialog -->
    <ConfirmDialog
      :is-open="isConfirmDeleteDialogOpen"
      title="Delete Task"
      :message="`Are you sure you want to delete task ${taskToDelete?.taskKey || ''}? This action cannot be undone.`"
      confirm-text="Delete Task"
      :is-destructive="true"
      :loading="isDeletingTask"
      @confirm="confirmDeleteTask"
      @cancel="isConfirmDeleteDialogOpen = false"
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
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue';

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

const showSubtasks = ref(false);
const expandedTaskIds = ref<Set<string>>(new Set());
const subtasksMap = ref<Record<string, Task[]>>({});
const loadingSubtasksMap = ref<Record<string, boolean>>({});

const isCreateModalOpen = ref(false);
const modalDefaultStatus = ref<TaskStatus>('todo');

const selectedTask = ref<Task | null>(null);
const isDetailOpen = ref(false);

const isConfirmDeleteDialogOpen = ref(false);
const taskToDelete = ref<Task | null>(null);
const isDeletingTask = ref(false);

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

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getDateBadgeClass(dueDate?: string, status?: TaskStatus): string {
  if (!dueDate) return 'text-slate-400 border-slate-700/60';
  if (status === 'done') return 'text-slate-400 border-slate-700/60';
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  if (due < now) {
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10 font-semibold';
  }
  return 'text-slate-300 border-slate-700/60';
}

function isTaskExpanded(taskId: string): boolean {
  return showSubtasks.value || expandedTaskIds.value.has(taskId);
}

async function loadSubtasksForTask(taskId: string) {
  if (!listId.value || loadingSubtasksMap.value[taskId]) return;
  loadingSubtasksMap.value[taskId] = true;
  try {
    const list = await apiFetch<Task[]>(
      `/lists/${listId.value}/tasks/${taskId}/subtasks`,
      { method: 'GET' },
    );
    subtasksMap.value[taskId] = Array.isArray(list) ? list : [];
  } catch {
    subtasksMap.value[taskId] = [];
  } finally {
    loadingSubtasksMap.value[taskId] = false;
  }
}

async function toggleTaskExpand(taskId: string) {
  if (expandedTaskIds.value.has(taskId)) {
    expandedTaskIds.value.delete(taskId);
  } else {
    expandedTaskIds.value.add(taskId);
    if (!subtasksMap.value[taskId]) {
      await loadSubtasksForTask(taskId);
    }
  }
}

async function toggleShowSubtasks() {
  showSubtasks.value = !showSubtasks.value;
  if (showSubtasks.value) {
    const promises = tasks.value
      .filter((t) => t.subtasksCount && t.subtasksCount > 0)
      .map((t) => loadSubtasksForTask(t._id));
    await Promise.allSettled(promises);
  }
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

      if (showSubtasks.value) {
        const promises = tasks.value
          .filter((t) => t.subtasksCount && t.subtasksCount > 0)
          .map((t) => loadSubtasksForTask(t._id));
        await Promise.allSettled(promises);
      }
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

  // Update in subtasksMap if it is a subtask
  for (const parentId of Object.keys(subtasksMap.value)) {
    const subIdx = subtasksMap.value[parentId].findIndex((s) => s._id === updated._id);
    if (subIdx !== -1) {
      subtasksMap.value[parentId][subIdx] = updated;
    }
  }
}

function handleTaskDeleted(taskId: string) {
  tasks.value = tasks.value.filter((t) => t._id !== taskId);
  for (const parentId of Object.keys(subtasksMap.value)) {
    subtasksMap.value[parentId] = subtasksMap.value[parentId].filter(
      (s) => s._id !== taskId,
    );
  }
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

async function toggleTaskDone(task: Task) {
  const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
  await handleStatusChange(task._id, newStatus);
}

function promptDeleteTask(taskId: string) {
  const target = tasks.value.find((t) => t._id === taskId);
  if (target) {
    taskToDelete.value = target;
    isConfirmDeleteDialogOpen.value = true;
  }
}

async function confirmDeleteTask() {
  if (!taskToDelete.value || !listId.value) return;
  isDeletingTask.value = true;
  try {
    await apiFetch(`/lists/${listId.value}/tasks/${taskToDelete.value._id}`, {
      method: 'DELETE',
    });
    handleTaskDeleted(taskToDelete.value._id);
    showToast('Task deleted successfully', 'success');
    isConfirmDeleteDialogOpen.value = false;
    taskToDelete.value = null;
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to delete task'), 'error');
  } finally {
    isDeletingTask.value = false;
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
