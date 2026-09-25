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
            Create New Task
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
                class="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm transition"
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
                class="w-full px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm transition"
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
                  class="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
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
                  class="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
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
              class="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-600/20"
            >
              <span
                v-if="loading"
                class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
              />
              <span>Create Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { reactive, ref, watch } from 'vue';
import type { Task, TaskPriority, TaskStatus } from '../../types/task';
import { useApi } from '../../composables/useApi';
import { useToast } from '../../composables/useToast';
import { extractApiErrorMessage } from '../../utils/error';
import DatePickerMenu from '../ui/DatePickerMenu.vue';

interface Props {
  isOpen: boolean;
  listId: string;
  defaultStatus?: TaskStatus;
}

interface Emits {
  (e: 'close'): void;
  (e: 'saved', task: Task): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { apiFetch } = useApi();
const { showToast } = useToast();

const loading = ref(false);
const errorMessage = ref('');
const titleError = ref('');

const form = reactive({
  title: '',
  description: '',
  status: 'todo' as TaskStatus,
  priority: 'medium' as TaskPriority,
  startDate: '',
  dueDate: '',
});

watch(
  [() => props.isOpen, () => props.defaultStatus],
  ([open, defaultStatus]) => {
    if (open) {
      errorMessage.value = '';
      titleError.value = '';
      form.title = '';
      form.description = '';
      form.status = defaultStatus || 'todo';
      form.priority = 'medium';
      form.startDate = '';
      form.dueDate = '';
    }
  },
  { immediate: true },
);

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
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
    };

    const result = await apiFetch<Task>(`/lists/${props.listId}/tasks`, {
      method: 'POST',
      body: payload,
    });

    showToast(`Created task ${result.taskKey}`, 'success');
    emit('saved', result);
    handleClose();
  } catch (err: unknown) {
    errorMessage.value = extractApiErrorMessage(err, 'Failed to create task');
  } finally {
    loading.value = false;
  }
}
</script>
