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
        class="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 z-10 max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div class="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
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

        <form class="flex-1 flex flex-col min-h-0" @submit.prevent="handleSubmit">
          <div
            v-if="errorMessage"
            class="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm shrink-0"
          >
            {{ errorMessage }}
          </div>

          <div class="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">
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
              <MarkdownEditor
                v-model="form.description"
                placeholder="Provide task details or acceptance criteria in Markdown..."
                :min-rows="3"
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
                  class="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 capitalize"
                >
                  <option
                    v-for="st in statusOptions"
                    :key="st.id"
                    :value="st.id"
                  >
                    {{ st.name }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">
                  Priority
                </label>
                <select
                  v-model="form.priority"
                  class="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 capitalize"
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
                  class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition cursor-pointer flex items-center gap-1 hover:underline"
                  @click="assignToMe"
                >
                  <span>⚡ Assign to me</span>
                </button>
              </div>
              <select
                v-model="form.assignee"
                class="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
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

            <!-- Custom Fields Section -->
            <div
              v-if="availableCustomFields.length > 0"
              class="pt-4 border-t border-slate-800 space-y-3"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Custom Fields
                </span>
              </div>

              <div class="space-y-3">
                <div
                  v-for="field in availableCustomFields"
                  :key="field._id"
                >
                  <label class="block text-xs font-medium text-slate-300 mb-1">
                    {{ field.name }}
                    <span v-if="field.required" class="text-rose-400">*</span>
                    <span v-if="field.inherited" class="text-[10px] text-cyan-400/80 ml-1">
                      (Space)
                    </span>
                  </label>
                  <CustomFieldInput
                    v-model="form.customFieldValues[field._id]"
                    :field="field"
                  />
                  <p v-if="field.description" class="text-[11px] text-slate-500 mt-0.5">
                    {{ field.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-4 flex items-center justify-end gap-3 pt-4 border-t border-slate-800 shrink-0">
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
              class="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-600/20"
            >
              <span
                v-if="loading"
                class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
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
import { type StatusWorkflow, STATUS_CATEGORY_RANK } from '../../types/hierarchy';
import type { EffectiveCustomField } from '../../types/custom-field';
import { useTasksStore } from '../../stores/tasks';
import { useProjectsStore } from '../../stores/projects';
import { useHierarchyStore } from '../../stores/hierarchy';
import { useCustomFieldsStore } from '../../stores/custom-fields';
import { useAuthStore } from '../../stores/auth';
import { useApi } from '../../composables/useApi';
import { useToast } from '../../composables/useToast';
import { extractApiErrorMessage } from '../../utils/error';
import DatePickerMenu from '../ui/DatePickerMenu.vue';
import CustomFieldInput from '../custom-fields/CustomFieldInput.vue';
import MarkdownEditor from '../ui/MarkdownEditor.vue';

interface Props {
  isOpen: boolean;
  projectId?: string;
  listId?: string;
  task?: Task | null;
  defaultStatus?: TaskStatus;
  workflow?: StatusWorkflow | null;
}

interface Emits {
  (e: 'close'): void;
  (e: 'saved', task: Task): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const statusOptions = computed(() => {
  if (props.workflow?.statuses?.length) {
    return [...props.workflow.statuses].sort((a, b) => {
      const rA = a.category ? (STATUS_CATEGORY_RANK[a.category] || 99) : 99;
      const rB = b.category ? (STATUS_CATEGORY_RANK[b.category] || 99) : 99;
      if (rA !== rB) return rA - rB;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }
  return [
    { id: 'todo', name: 'To Do' },
    { id: 'in_progress', name: 'In Progress' },
    { id: 'in_review', name: 'In Review' },
    { id: 'done', name: 'Done' },
  ];
});

const tasksStore = useTasksStore();
const projectsStore = useProjectsStore();
const hierarchyStore = useHierarchyStore();
const customFieldsStore = useCustomFieldsStore();
const authStore = useAuthStore();
const { apiFetch } = useApi();
const { showToast } = useToast();

const availableCustomFields = ref<EffectiveCustomField[]>([]);

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
  customFieldValues: {} as Record<string, unknown>,
});

function formatDateForInput(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

watch(
  [() => props.isOpen, () => props.defaultStatus, () => props.task],
  async ([open, defaultStatus, task]) => {
    if (open) {
      errorMessage.value = '';
      titleError.value = '';

      const targetListId = props.listId || (task && typeof task.list === 'string' ? task.list : undefined);
      if (targetListId) {
        try {
          const fields = await customFieldsStore.fetchListFields(targetListId);
          availableCustomFields.value = fields;
        } catch {
          availableCustomFields.value = [];
        }
      } else {
        availableCustomFields.value = [];
      }

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
        form.customFieldValues = { ...(task.customFieldValues || {}) };
      } else {
        form.title = '';
        form.description = '';
        form.status = defaultStatus || 'todo';
        form.priority = 'medium';
        form.assignee = '';
        form.startDate = '';
        form.dueDate = '';
        const initialCustomValues: Record<string, unknown> = {};
        for (const f of availableCustomFields.value) {
          if (f.defaultValue !== undefined && f.defaultValue !== null) {
            initialCustomValues[f._id] = f.defaultValue;
          }
        }
        form.customFieldValues = initialCustomValues;
      }
    }
  },
  { immediate: true },
);

const assignableUsers = computed(() => {
  const users: { _id: string; name: string }[] = [];

  if (authStore.user) {
    const name =
      [authStore.user.firstName, authStore.user.lastName]
        .filter(Boolean)
        .join(' ') || authStore.user.email;
    users.push({
      _id: authStore.user._id,
      name: `${name} (You)`,
    });
  }

  // Workspace members
  const ws = hierarchyStore.currentWorkspace;
  if (ws && Array.isArray(ws.members)) {
    for (const m of ws.members) {
      const u =
        typeof m.user === 'object' && m.user
          ? (m.user as { _id?: string; firstName?: string; lastName?: string; email?: string })
          : null;
      if (u && u._id && !users.some((x) => x._id === u._id)) {
        const name =
          [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Member';
        users.push({ _id: u._id, name });
      }
    }
  }

  // Project members if in project
  const project = projectsStore.currentProject;
  if (props.projectId && project) {
    if (typeof project.owner === 'object' && project.owner && !users.some((x) => x._id === project.owner._id)) {
      const name =
        [project.owner.firstName, project.owner.lastName]
          .filter(Boolean)
          .join(' ') || project.owner.email;
      users.push({ _id: project.owner._id, name: `${name} (Owner)` });
    }

    if (Array.isArray(project.members)) {
      for (const member of project.members) {
        if (typeof member === 'object' && member && !users.some((x) => x._id === member._id)) {
          const name =
            [member.firstName, member.lastName].filter(Boolean).join(' ') ||
            member.email;
          users.push({ _id: member._id, name });
        }
      }
    }
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

  // Validate required custom fields
  for (const field of availableCustomFields.value) {
    if (field.required) {
      const val = form.customFieldValues[field._id];
      if (val === null || val === undefined || val === '') {
        errorMessage.value = `${field.name} is required`;
        return;
      }
    }
  }

  loading.value = true;
  try {
    const payload = {
      title: trimmedTitle,
      description: form.description.trim() || undefined,
      status: form.status,
      priority: form.priority,
      assignee: form.assignee || undefined,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      customFieldValues:
        Object.keys(form.customFieldValues).length > 0
          ? form.customFieldValues
          : undefined,
    };

    let result: Task;

    if (props.listId) {
      if (isEditing.value && props.task) {
        result = await apiFetch<Task>(`/lists/${props.listId}/tasks/${props.task._id}`, {
          method: 'PATCH',
          body: payload,
        });
        showToast('Task updated successfully', 'success');
      } else {
        result = await apiFetch<Task>(`/lists/${props.listId}/tasks`, {
          method: 'POST',
          body: payload,
        });
        showToast(`Created task ${result.taskKey}`, 'success');
      }
    } else if (props.projectId) {
      if (isEditing.value && props.task) {
        result = await tasksStore.updateTask(
          props.projectId,
          props.task._id,
          payload,
        );
        showToast('Task updated successfully', 'success');
      } else {
        result = await tasksStore.createTask(props.projectId, payload);
        showToast(`Created task ${result.taskKey}`, 'success');
      }
    } else {
      throw new Error('Either listId or projectId must be provided');
    }

    emit('saved', result);
    handleClose();
  } catch (err: unknown) {
    errorMessage.value = extractApiErrorMessage(err, 'Failed to save task');
  } finally {
    loading.value = false;
  }
}
</script>
