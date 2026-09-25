<template>
  <Teleport to="body">
    <div
      v-if="isOpen && task"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        @click="handleClose"
      />

      <!-- Drawer / Modal Container -->
      <div
        class="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 z-10 max-h-[90vh] flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-800 mb-6 shrink-0">
          <div class="flex items-center gap-3">
            <span class="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {{ task.taskKey || 'TASK' }}
            </span>

            <!-- Status dropdown -->
            <select
              :value="task.status"
              class="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 capitalize"
              @change="updateField({ status: ($event.target as HTMLSelectElement).value as TaskStatus })"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
            </select>

            <!-- Priority dropdown -->
            <select
              :value="task.priority"
              class="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 capitalize"
              @change="updateField({ priority: ($event.target as HTMLSelectElement).value as TaskPriority })"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer text-xs"
              title="Delete Task"
              @click="isDeleteDialogOpen = true"
            >
              🗑️
            </button>
            <button
              type="button"
              class="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer text-lg leading-none"
              @click="handleClose"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Scrollable Body -->
        <div class="flex-1 overflow-y-auto space-y-6 pr-1">
          <!-- Title Input -->
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Title
            </label>
            <input
              v-model="editableTitle"
              type="text"
              class="w-full text-lg font-bold bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              @blur="saveTitle"
              @keydown.enter.prevent="saveTitle"
            >
          </div>

          <!-- Description -->
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              v-model="editableDescription"
              rows="3"
              placeholder="Add more details to this task..."
              class="w-full text-sm bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              @blur="saveDescription"
            />
          </div>

          <!-- Assignee & Dates Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-800/40 border border-slate-800 rounded-xl p-4">
            <!-- Assignee -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-xs font-semibold text-slate-400">
                  Assignee
                </label>
                <button
                  v-if="currentUserId && taskAssigneeId !== currentUserId"
                  type="button"
                  class="text-[11px] text-indigo-400 hover:text-indigo-300 transition cursor-pointer hover:underline"
                  @click="assignToMe"
                >
                  ⚡ Assign to me
                </button>
              </div>
              <select
                :value="taskAssigneeId"
                class="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                @change="updateField({ assignee: ($event.target as HTMLSelectElement).value || null })"
              >
                <option value="">Unassigned</option>
                <option
                  v-for="user in assignableUsers"
                  :key="user._id"
                  :value="user._id"
                >
                  {{ user.name }}
                </option>
              </select>
            </div>

            <!-- Start Date -->
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">
                Start Date
              </label>
              <DatePickerMenu
                :model-value="formatDateForInput(task.startDate)"
                placeholder="Start date"
                @update:model-value="(val) => updateField({ startDate: val ? new Date(val).toISOString() : null })"
              />
            </div>

            <!-- Due Date -->
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">
                Due Date
              </label>
              <DatePickerMenu
                :model-value="formatDateForInput(task.dueDate)"
                placeholder="Due date"
                :min-date="formatDateForInput(task.startDate)"
                @update:model-value="(val) => updateField({ dueDate: val ? new Date(val).toISOString() : null })"
              />
            </div>
          </div>

          <!-- Unified Subtasks Section -->
          <div class="pt-2">
            <SubtaskList
              :list-id="listId"
              :project-id="projectId"
              :parent-task="task"
              @updated="handleSubtaskUpdated"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Created {{ formatCreatedDate(task.createdAt) }}</span>
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
            @click="handleClose"
          >
            Close
          </button>
        </div>
      </div>

      <!-- Delete Confirmation Dialog -->
      <ConfirmDialog
        :is-open="isDeleteDialogOpen"
        title="Delete Task"
        :message="`Are you sure you want to delete task ${task.taskKey}? This action cannot be undone.`"
        confirm-text="Delete Task"
        is-destructive
        @confirm="handleConfirmDelete"
        @cancel="isDeleteDialogOpen = false"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Task, TaskPriority, TaskStatus, UpdateTaskPayload } from '../../types/task';
import { useApi } from '../../composables/useApi';
import { useToast } from '../../composables/useToast';
import { useAuthStore } from '../../stores/auth';
import { useHierarchyStore } from '../../stores/hierarchy';
import { useProjectsStore } from '../../stores/projects';
import { useTasksStore } from '../../stores/tasks';
import { extractApiErrorMessage } from '../../utils/error';
import DatePickerMenu from '../ui/DatePickerMenu.vue';
import ConfirmDialog from '../ui/ConfirmDialog.vue';
import SubtaskList from './SubtaskList.vue';

interface Props {
  isOpen: boolean;
  listId?: string;
  projectId?: string;
  task: Task | null;
}

interface Emits {
  (e: 'close'): void;
  (e: 'updated', task: Task): void;
  (e: 'deleted', taskId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { apiFetch } = useApi();
const { showToast } = useToast();
const authStore = useAuthStore();
const hierarchyStore = useHierarchyStore();
const projectsStore = useProjectsStore();
const tasksStore = useTasksStore();

const editableTitle = ref('');
const editableDescription = ref('');
const isDeleteDialogOpen = ref(false);

const currentUserId = computed(() => authStore.user?._id || '');

const taskAssigneeId = computed(() => {
  if (!props.task?.assignee) return '';
  return typeof props.task.assignee === 'object'
    ? props.task.assignee._id
    : String(props.task.assignee);
});

const assignableUsers = computed(() => {
  const users: { _id: string; name: string }[] = [];
  if (authStore.user) {
    const name =
      [authStore.user.firstName, authStore.user.lastName].filter(Boolean).join(' ') ||
      authStore.user.email;
    users.push({ _id: authStore.user._id, name: `${name} (You)` });
  }

  const ws = hierarchyStore.currentWorkspace;
  if (ws && Array.isArray(ws.members)) {
    for (const m of ws.members) {
      const u =
        typeof m.user === 'object' && m.user
          ? (m.user as { _id?: string; firstName?: string; lastName?: string; email?: string })
          : null;
      if (u && u._id && u._id !== authStore.user?._id) {
        const name =
          [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Member';
        users.push({ _id: u._id, name });
      }
    }
  }

  // Also include project members if in project context
  const project = projectsStore.currentProject;
  if (props.projectId && project && Array.isArray(project.members)) {
    for (const m of project.members) {
      if (typeof m === 'object' && m && m._id && !users.some((u) => u._id === m._id)) {
        const name = [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email;
        users.push({ _id: m._id, name });
      }
    }
  }

  return users;
});

function formatDateForInput(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function formatCreatedDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

function handleClose() {
  emit('close');
}

watch(
  () => props.task,
  (newTask) => {
    if (newTask) {
      editableTitle.value = newTask.title || '';
      editableDescription.value = newTask.description || '';
    }
  },
  { immediate: true },
);

async function updateField(payload: UpdateTaskPayload) {
  if (!props.task) return;
  try {
    let updated: Task;
    if (props.listId) {
      updated = await apiFetch<Task>(
        `/lists/${props.listId}/tasks/${props.task._id}`,
        {
          method: 'PATCH',
          body: payload,
        },
      );
    } else if (props.projectId) {
      updated = await tasksStore.updateTask(
        props.projectId,
        props.task._id,
        payload,
      );
    } else {
      return;
    }
    emit('updated', updated);
    showToast('Task updated', 'success');
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to update task'), 'error');
  }
}

async function saveTitle() {
  const trimmed = editableTitle.value.trim();
  if (!trimmed || trimmed === props.task?.title) {
    if (props.task && !trimmed) {
      editableTitle.value = props.task.title;
    }
    return;
  }
  await updateField({ title: trimmed });
}

async function saveDescription() {
  const trimmed = editableDescription.value.trim();
  if (trimmed === (props.task?.description || '').trim()) return;
  await updateField({ description: trimmed });
}

async function assignToMe() {
  if (currentUserId.value) {
    await updateField({ assignee: currentUserId.value });
  }
}

function handleSubtaskUpdated() {
  if (props.task) {
    emit('updated', props.task);
  }
}

async function handleConfirmDelete() {
  if (!props.task) return;
  try {
    if (props.listId) {
      await apiFetch(`/lists/${props.listId}/tasks/${props.task._id}`, {
        method: 'DELETE',
      });
    } else if (props.projectId) {
      await tasksStore.deleteTask(props.projectId, props.task._id);
    }
    showToast('Task deleted successfully', 'success');
    emit('deleted', props.task._id);
    isDeleteDialogOpen.value = false;
    handleClose();
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to delete task'), 'error');
  }
}
</script>
