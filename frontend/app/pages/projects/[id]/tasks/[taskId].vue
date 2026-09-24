<template>
  <div class="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
    <!-- Back Navigation & Breadcrumbs -->
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2 text-xs sm:text-sm text-slate-400">
        <NuxtLink :to="`/projects/${projectId}/board`" class="hover:text-white transition flex items-center gap-1">
          &larr; Back to Board
        </NuxtLink>
        <span>/</span>
        <span v-if="task" class="text-slate-200 font-mono font-semibold">
          {{ task.taskKey }}
        </span>
      </div>

      <div v-if="task" class="flex items-center gap-2">
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
          @click="isEditModalOpen = true"
        >
          Edit
        </button>
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
          @click="isDeleteDialogOpen = true"
        >
          Delete
        </button>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div
      v-if="tasksStore.loading && !task"
      class="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-8 animate-pulse space-y-6"
    >
      <div class="w-1/4 h-8 bg-slate-700/60 rounded" />
      <div class="w-3/4 h-12 bg-slate-700/40 rounded" />
      <div class="w-full h-32 bg-slate-700/40 rounded" />
    </div>

    <!-- Error State -->
    <div
      v-else-if="tasksStore.error && !task"
      class="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-8 text-center"
    >
      <div class="text-3xl mb-3">⚠️</div>
      <h2 class="text-xl font-bold text-white mb-2">
        {{ tasksStore.error }}
      </h2>
      <NuxtLink
        :to="`/projects/${projectId}/board`"
        class="inline-flex items-center px-4 py-2 mt-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition cursor-pointer"
      >
        Return to Board
      </NuxtLink>
    </div>

    <!-- Task Details View -->
    <div v-else-if="task" class="space-y-6">
      <!-- Main Content Card -->
      <div class="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
        <!-- Key, Title & Status Selector -->
        <div class="pb-6 border-b border-slate-700/60 mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div class="flex-1 min-w-0 pr-4">
            <span
              class="inline-block px-2.5 py-1 text-xs font-mono font-bold tracking-wider rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2"
            >
              {{ task.taskKey }}
            </span>
            <div>
              <input
                v-model="titleInput"
                type="text"
                class="w-full text-2xl sm:text-3xl font-bold text-white bg-transparent border border-transparent hover:border-slate-700/80 focus:border-emerald-500 focus:bg-slate-900/60 rounded-xl px-2.5 py-1 -ml-2.5 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                placeholder="Task title..."
                @blur="saveTitle"
                @keydown.enter="($event.target as HTMLElement).blur()"
              >
            </div>
          </div>

          <!-- Status Dropdown & Close/Done Toggle Button (ClickUp style) -->
          <div class="flex items-center gap-2.5 shrink-0">
            <label class="text-xs text-slate-400">Status:</label>
            <div class="flex items-center gap-2">
              <select
                :value="task.status"
                class="px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 capitalize cursor-pointer transition"
                @change="handleStatusChange(($event.target as HTMLSelectElement).value as TaskStatus)"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </select>

              <!-- Quick Close / Done Button -->
              <button
                type="button"
                class="w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer text-sm"
                :class="
                  task.status === 'done'
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-emerald-400 hover:border-emerald-500 hover:bg-emerald-500/10'
                "
                :title="task.status === 'done' ? 'Reopen task (To Do)' : 'Close task (Mark as Done)'"
                @click="toggleComplete"
              >
                <svg
                  class="w-4 h-4 stroke-[2.5]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Description (Inline Editable) -->
        <div class="mb-8">
          <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Description
          </h3>
          <textarea
            v-model="descriptionInput"
            rows="4"
            placeholder="Add description or notes..."
            class="w-full text-sm text-slate-200 bg-slate-900/40 hover:bg-slate-900/70 border border-slate-700/70 hover:border-slate-600 focus:border-emerald-500 focus:bg-slate-900 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition placeholder-slate-500 leading-relaxed resize-y"
            @blur="saveDescription"
          />
        </div>

        <!-- Metadata Grid (Inline Editable) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-700/60 text-sm">
          <!-- Priority (Inline Editable) -->
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Priority
            </label>
            <select
              :value="task.priority"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              :class="priorityBadgeClass"
              @change="handlePriorityChange(($event.target as HTMLSelectElement).value as TaskPriority)"
            >
              <option value="low" class="bg-slate-900 text-emerald-400">Low</option>
              <option value="medium" class="bg-slate-900 text-amber-400">Medium</option>
              <option value="high" class="bg-slate-900 text-orange-400">High</option>
              <option value="critical" class="bg-slate-900 text-rose-400">Critical</option>
            </select>
          </div>

          <!-- Assignee (Inline Editable) -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Assignee
              </label>
              <button
                v-if="currentUserId && taskAssigneeId !== currentUserId"
                type="button"
                class="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer hover:underline"
                @click="assignToMe"
              >
                Assign to me
              </button>
            </div>
            <select
              :value="taskAssigneeId"
              class="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition cursor-pointer"
              @change="handleAssigneeChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="">Unassigned</option>
              <option
                v-for="user in assignableUsers"
                :key="user._id"
                :value="user._id"
              >
                {{ user.name }} ({{ user.email }})
              </option>
            </select>
          </div>

          <!-- Reporter (Read-only) -->
          <div>
            <span class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Reporter
            </span>
            <div class="flex items-center gap-2 text-slate-200 py-1">
              <span class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold border border-slate-600">
                {{ reporterInitials }}
              </span>
              <span class="text-xs">{{ reporterName }}</span>
            </div>
          </div>

          <!-- Start Date (Inline Editable via DatePickerMenu) -->
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Start Date
            </label>
            <DatePickerMenu
              :model-value="formatDateForInput(task.startDate)"
              placeholder="Set start date"
              @update:model-value="handleStartDateChange"
            />
          </div>

          <!-- Due Date (Inline Editable via DatePickerMenu) -->
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Due Date
            </label>
            <DatePickerMenu
              :model-value="formatDateForInput(task.dueDate)"
              :min-date="formatDateForInput(task.startDate)"
              placeholder="Set due date"
              @update:model-value="handleDueDateChange"
            />
          </div>

          <!-- Created At (Read-only) -->
          <div>
            <span class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Created
            </span>
            <span class="text-xs text-slate-400 py-1 inline-block">
              {{ formatDate(task.createdAt) || 'Unknown' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <TaskFormModal
      :is-open="isEditModalOpen"
      :project-id="projectId"
      :task="task"
      @close="isEditModalOpen = false"
      @saved="handleTaskUpdated"
    />

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      :is-open="isDeleteDialogOpen"
      title="Delete Task"
      :message="`Are you sure you want to delete task ${task?.taskKey}? This action cannot be undone.`"
      confirm-text="Delete Task"
      :is-destructive="true"
      :loading="isDeleting"
      @confirm="handleDeleteTask"
      @cancel="isDeleteDialogOpen = false"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { TaskPriority, TaskStatus, UpdateTaskPayload } from '../../../../types/task';
import { useProjectsStore } from '../../../../stores/projects';
import { useTasksStore } from '../../../../stores/tasks';
import { useAuthStore } from '../../../../stores/auth';
import { useToast } from '../../../../composables/useToast';
import DatePickerMenu from '../../../../components/ui/DatePickerMenu.vue';
import TaskFormModal from '../../../../components/task/TaskFormModal.vue';
import ConfirmDialog from '../../../../components/ui/ConfirmDialog.vue';

definePageMeta({
  middleware: ['auth'],
});

const route = useRoute();
const router = useRouter();

const projectId = computed(() => route.params.id as string);
const taskId = computed(() => route.params.taskId as string);

const projectsStore = useProjectsStore();
const tasksStore = useTasksStore();
const authStore = useAuthStore();
const { showToast } = useToast();

const isEditModalOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const isDeleting = ref(false);

const task = computed(() => tasksStore.currentTask);

const titleInput = ref('');
const descriptionInput = ref('');

watch(
  () => task.value?.title,
  (newTitle) => {
    if (newTitle !== undefined) {
      titleInput.value = newTitle;
    }
  },
  { immediate: true },
);

watch(
  () => task.value?.description,
  (newDesc) => {
    descriptionInput.value = newDesc || '';
  },
  { immediate: true },
);

const currentUserId = computed(() => authStore.user?._id || '');

const taskAssigneeId = computed(() => {
  if (!task.value?.assignee) return '';
  return typeof task.value.assignee === 'object'
    ? task.value.assignee._id
    : (task.value.assignee as string);
});

const assignableUsers = computed(() => {
  const users: { _id: string; name: string; email: string }[] = [];
  const project = projectsStore.currentProject;
  if (!project) return users;

  if (typeof project.owner === 'object' && project.owner) {
    const name =
      [project.owner.firstName, project.owner.lastName]
        .filter(Boolean)
        .join(' ') || project.owner.email;
    users.push({
      _id: project.owner._id,
      name: `${name} (Owner)`,
      email: project.owner.email,
    });
  }

  if (Array.isArray(project.members)) {
    for (const member of project.members) {
      if (
        typeof member === 'object' &&
        member &&
        member._id !==
          (typeof project.owner === 'object' ? project.owner._id : project.owner)
      ) {
        const name =
          [member.firstName, member.lastName].filter(Boolean).join(' ') ||
          member.email;
        users.push({
          _id: member._id,
          name,
          email: member.email,
        });
      }
    }
  }

  if (authStore.user && !users.some((u) => u._id === authStore.user?._id)) {
    const name =
      [authStore.user.firstName, authStore.user.lastName]
        .filter(Boolean)
        .join(' ') || authStore.user.email;
    users.push({
      _id: authStore.user._id,
      name,
      email: authStore.user.email,
    });
  }

  return users;
});

const priorityBadgeClass = computed(() => {
  if (!task.value) return '';
  const map: Record<TaskPriority, string> = {
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    critical: 'bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold',
  };
  return map[task.value.priority] || map.medium;
});

const reporterName = computed(() => {
  if (!task.value?.reporter) return 'Unknown';
  if (typeof task.value.reporter === 'object') {
    const { firstName, lastName, email } = task.value.reporter;
    return (
      [firstName, lastName].filter(Boolean).join(' ') || email || 'Reporter'
    );
  }
  return 'Reporter';
});

const reporterInitials = computed(() => {
  if (!task.value?.reporter) return '?';
  if (typeof task.value.reporter === 'object') {
    const { firstName, lastName, email } = task.value.reporter;
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName.slice(0, 2).toUpperCase();
    if (email) return email.slice(0, 2).toUpperCase();
  }
  return 'R';
});

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateForInput(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

async function updateTaskField(payload: UpdateTaskPayload, successMessage?: string) {
  if (!task.value) return;
  try {
    await tasksStore.updateTask(projectId.value, taskId.value, payload);
    if (successMessage) {
      showToast(successMessage, 'success');
    }
  } catch (err: unknown) {
    const errorMsg =
      (err as { data?: { message?: string }; message?: string })?.data
        ?.message ||
      (err as { message?: string })?.message ||
      'Failed to update task';
    showToast(errorMsg, 'error');
  }
}

async function saveTitle() {
  const trimmed = titleInput.value.trim();
  if (!task.value || !trimmed || trimmed === task.value.title) {
    if (task.value && !trimmed) {
      titleInput.value = task.value.title;
    }
    return;
  }
  await updateTaskField({ title: trimmed }, 'Title updated');
}

async function saveDescription() {
  if (!task.value) return;
  const trimmed = descriptionInput.value.trim();
  const current = (task.value.description || '').trim();
  if (trimmed === current) return;
  await updateTaskField({ description: trimmed }, 'Description updated');
}

async function handlePriorityChange(newPriority: TaskPriority) {
  if (!task.value || task.value.priority === newPriority) return;
  await updateTaskField({ priority: newPriority }, 'Priority updated');
}

async function handleAssigneeChange(newAssigneeId: string) {
  if (!task.value) return;
  const val = newAssigneeId || null;
  await updateTaskField({ assignee: val }, 'Assignee updated');
}

async function assignToMe() {
  if (currentUserId.value) {
    await updateTaskField({ assignee: currentUserId.value }, 'Assigned to you');
  }
}

async function handleStartDateChange(newDate: string) {
  if (!task.value) return;
  const iso = newDate ? new Date(newDate).toISOString() : null;
  await updateTaskField({ startDate: iso }, 'Start date updated');
}

async function handleDueDateChange(newDate: string) {
  if (!task.value) return;
  const iso = newDate ? new Date(newDate).toISOString() : null;
  await updateTaskField({ dueDate: iso }, 'Due date updated');
}

async function handleStatusChange(newStatus: TaskStatus) {
  if (!task.value || task.value.status === newStatus) return;
  try {
    await tasksStore.updateTaskStatus(projectId.value, taskId.value, newStatus);
    showToast(`Status updated to ${newStatus.replace('_', ' ')}`, 'success');
  } catch (err: unknown) {
    const errorMsg =
      (err as { data?: { message?: string }; message?: string })?.data
        ?.message ||
      (err as { message?: string })?.message ||
      'Failed to update status';
    showToast(errorMsg, 'error');
  }
}

async function toggleComplete() {
  if (!task.value) return;
  const newStatus: TaskStatus = task.value.status === 'done' ? 'todo' : 'done';
  await handleStatusChange(newStatus);
}

function handleTaskUpdated() {
  tasksStore.fetchTask(projectId.value, taskId.value);
}

async function handleDeleteTask() {
  isDeleting.value = true;
  try {
    await tasksStore.deleteTask(projectId.value, taskId.value);
    showToast('Task deleted successfully', 'success');
    isDeleteDialogOpen.value = false;
    router.push(`/projects/${projectId.value}/board`);
  } catch (err: unknown) {
    const errorMsg =
      (err as { data?: { message?: string }; message?: string })?.data
        ?.message ||
      (err as { message?: string })?.message ||
      'Failed to delete task';
    showToast(errorMsg, 'error');
  } finally {
    isDeleting.value = false;
  }
}

onMounted(async () => {
  if (projectId.value && taskId.value) {
    await Promise.allSettled([
      projectsStore.fetchProject(projectId.value),
      tasksStore.fetchTask(projectId.value, taskId.value),
    ]);
  }
});
</script>
