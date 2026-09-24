<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        @click="handleClose"
      />

      <!-- Modal Panel -->
      <div
        class="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 z-10"
      >
        <div class="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <h2 class="text-xl font-bold text-white">
            {{ isEditing ? 'Edit Task' : 'Create New Task' }}
          </h2>
          <button
            type="button"
            class="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
            @click="handleClose"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div
            v-if="errorMessage"
            class="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm"
          >
            {{ errorMessage }}
          </div>

          <div class="space-y-4">
            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-1.5">
                Task Title <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="form.title"
                type="text"
                required
                maxlength="255"
                placeholder="e.g. Implement user login API"
                class="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm transition"
              >
              <p v-if="titleError" class="text-xs text-rose-400 mt-1">
                {{ titleError }}
              </p>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-1.5">
                Description
              </label>
              <textarea
                v-model="form.description"
                rows="3"
                maxlength="5000"
                placeholder="Provide task details or acceptance criteria..."
                class="w-full px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm transition"
              />
            </div>

            <!-- Status and Priority (Grid) -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">
                  Status
                </label>
                <select
                  v-model="form.status"
                  class="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">
                  Priority
                </label>
                <select
                  v-model="form.priority"
                  class="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <!-- Assignee -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-sm font-medium text-slate-300">
                  Assignee
                </label>
                <button
                  v-if="currentUserId"
                  type="button"
                  class="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer flex items-center gap-1 hover:underline"
                  @click="assignToMe"
                >
                  <span>⚡ Assign to me</span>
                </button>
              </div>
              <select
                v-model="form.assignee"
                class="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
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

            <!-- Start Date & Due Date (Grid) -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">
                  Start Date
                </label>
                <DatePickerMenu
                  v-model="form.startDate"
                  placeholder="Select start date"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">
                  Due Date
                </label>
                <DatePickerMenu
                  v-model="form.dueDate"
                  placeholder="Select due date"
                  :min-date="form.startDate"
                />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              class="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              @click="handleClose"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-5 py-2 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span
                v-if="loading"
                class="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"
              />
              <span>{{ isEditing ? 'Save Changes' : 'Create Task' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';
import type { Task, TaskPriority, TaskStatus } from '../../types/task';
import { useTasksStore } from '../../stores/tasks';
import { useProjectsStore } from '../../stores/projects';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../composables/useToast';
import DatePickerMenu from '../ui/DatePickerMenu.vue';

interface Props {
  isOpen: boolean;
  projectId: string;
  task?: Task | null;
  defaultStatus?: TaskStatus;
}

interface Emits {
  (e: 'close'): void;
  (e: 'saved', task: Task): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const tasksStore = useTasksStore();
const projectsStore = useProjectsStore();
const authStore = useAuthStore();
const { showToast } = useToast();

const currentUserId = computed(() => authStore.user?._id || '');

function assignToMe() {
  if (currentUserId.value) {
    form.assignee = currentUserId.value;
  }
}

const loading = ref(false);
const errorMessage = ref('');
const titleError = ref('');

const isEditing = computed(() => !!props.task);

const form = reactive({
  title: '',
  description: '',
  status: 'todo' as TaskStatus,
  priority: 'medium' as TaskPriority,
  assignee: '',
  startDate: '',
  dueDate: '',
});

function formatDateForInput(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

watch(
  [() => props.isOpen, () => props.defaultStatus, () => props.task],
  ([open, defaultStatus, task]) => {
    if (open) {
      errorMessage.value = '';
      titleError.value = '';

      if (task) {
        form.title = task.title;
        form.description = task.description || '';
        form.status = task.status;
        form.priority = task.priority;
        form.assignee =
          typeof task.assignee === 'object' && task.assignee
            ? task.assignee._id
            : (task.assignee as string) || '';
        form.startDate = formatDateForInput(task.startDate);
        form.dueDate = formatDateForInput(task.dueDate);
      } else {
        form.title = '';
        form.description = '';
        form.status = defaultStatus || 'todo';
        form.priority = 'medium';
        form.assignee = '';
        form.startDate = '';
        form.dueDate = '';
      }
    }
  },
  { immediate: true },
);

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
      if (typeof member === 'object' && member && member._id !== (typeof project.owner === 'object' ? project.owner._id : project.owner)) {
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

function handleClose() {
  emit('close');
}

async function handleSubmit() {
  errorMessage.value = '';
  titleError.value = '';

  const trimmedTitle = form.title.trim();
  if (!trimmedTitle) {
    titleError.value = 'Title is required';
    return;
  }

  loading.value = true;
  try {
    const payload = {
      title: trimmedTitle,
      description: form.description.trim() || undefined,
      status: form.status,
      priority: form.priority,
      assignee: form.assignee || null,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
    };

    let result: Task;
    if (isEditing.value && props.task) {
      result = await tasksStore.updateTask(
        props.projectId,
        props.task._id,
        payload,
      );
      showToast('Task updated successfully', 'success');
    } else {
      result = await tasksStore.createTask(props.projectId, {
        title: payload.title,
        description: payload.description,
        status: payload.status,
        priority: payload.priority,
        assignee: payload.assignee || undefined,
        startDate: payload.startDate || undefined,
        dueDate: payload.dueDate || undefined,
      });
      showToast(`Created task ${result.taskKey}`, 'success');
    }

    emit('saved', result);
    handleClose();
  } catch (err: unknown) {
    errorMessage.value =
      (err as { data?: { message?: string }; message?: string })?.data
        ?.message ||
      (err as { message?: string })?.message ||
      'Failed to save task';
  } finally {
    loading.value = false;
  }
}
</script>
