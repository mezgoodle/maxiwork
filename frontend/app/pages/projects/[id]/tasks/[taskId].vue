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
          <div>
            <span
              class="inline-block px-2.5 py-1 text-xs font-mono font-bold tracking-wider rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3"
            >
              {{ task.taskKey }}
            </span>
            <h1 class="text-2xl font-bold text-white">
              {{ task.title }}
            </h1>
          </div>

          <!-- Status Dropdown -->
          <div class="flex items-center gap-3 shrink-0">
            <label class="text-xs text-slate-400">Status:</label>
            <select
              :value="task.status"
              class="px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 capitalize"
              @change="handleStatusChange(($event.target as HTMLSelectElement).value as TaskStatus)"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        <!-- Description -->
        <div class="mb-8">
          <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Description
          </h3>
          <p
            v-if="task.description"
            class="text-sm text-slate-300 whitespace-pre-line leading-relaxed"
          >
            {{ task.description }}
          </p>
          <p v-else class="text-sm text-slate-500 italic">
            No description provided.
          </p>
        </div>

        <!-- Metadata Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-700/60 text-sm">
          <!-- Priority -->
          <div>
            <span class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Priority
            </span>
            <span
              class="inline-block px-2.5 py-1 text-xs font-semibold rounded-full border capitalize"
              :class="priorityBadgeClass"
            >
              {{ task.priority }}
            </span>
          </div>

          <!-- Assignee -->
          <div>
            <span class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Assignee
            </span>
            <div class="flex items-center gap-2 text-slate-200">
              <span class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold border border-slate-600">
                {{ assigneeInitials }}
              </span>
              <span>{{ assigneeName }}</span>
            </div>
          </div>

          <!-- Reporter -->
          <div>
            <span class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Reporter
            </span>
            <div class="flex items-center gap-2 text-slate-200">
              <span class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold border border-slate-600">
                {{ reporterInitials }}
              </span>
              <span>{{ reporterName }}</span>
            </div>
          </div>

          <!-- Start Date -->
          <div>
            <span class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Start Date
            </span>
            <span class="text-slate-300">
              {{ formatDate(task.startDate) || 'Not set' }}
            </span>
          </div>

          <!-- Due Date -->
          <div>
            <span class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Due Date
            </span>
            <span :class="dueDateClass">
              {{ formatDate(task.dueDate) || 'Not set' }}
            </span>
          </div>

          <!-- Created At -->
          <div>
            <span class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Created
            </span>
            <span class="text-slate-400">
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
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { TaskPriority, TaskStatus } from '../../../../types/task';
import { useProjectsStore } from '../../../../stores/projects';
import { useTasksStore } from '../../../../stores/tasks';
import { useToast } from '../../../../composables/useToast';
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
const { showToast } = useToast();

const isEditModalOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const isDeleting = ref(false);

const task = computed(() => tasksStore.currentTask);

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

const assigneeName = computed(() => {
  if (!task.value?.assignee) return 'Unassigned';
  if (typeof task.value.assignee === 'object') {
    const { firstName, lastName, email } = task.value.assignee;
    return (
      [firstName, lastName].filter(Boolean).join(' ') || email || 'Assignee'
    );
  }
  return 'Assignee';
});

const assigneeInitials = computed(() => {
  if (!task.value?.assignee) return '?';
  if (typeof task.value.assignee === 'object') {
    const { firstName, lastName, email } = task.value.assignee;
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName.slice(0, 2).toUpperCase();
    if (email) return email.slice(0, 2).toUpperCase();
  }
  return 'U';
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

const dueDateClass = computed(() => {
  if (!task.value?.dueDate) return 'text-slate-400';
  const due = new Date(task.value.dueDate).getTime();
  const now = Date.now();
  if (task.value.status === 'done') {
    return 'text-slate-300';
  }
  if (due < now) {
    return 'text-rose-400 font-bold';
  }
  return 'text-slate-300';
});

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
