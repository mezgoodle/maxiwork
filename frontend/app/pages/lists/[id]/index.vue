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
          <button
            type="button"
            class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
            title="Delete List"
            @click="promptDeleteList"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        <div v-else-if="loading" class="h-8 w-48 bg-slate-800 rounded animate-pulse" />
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3">
        <!-- Statuses Workflow Settings -->
        <button
          type="button"
          class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer flex items-center gap-1.5"
          title="Configure custom status workflow"
          @click="isStatusWorkflowModalOpen = true"
        >
          <span>⚙️</span>
          <span>Statuses</span>
          <span v-if="isWorkflowInherited" class="text-[10px] text-slate-500 font-normal hidden sm:inline">(Space)</span>
          <span v-else-if="listWorkflow" class="text-[10px] text-indigo-400 font-medium hidden sm:inline">(Custom)</span>
        </button>

        <!-- Custom Fields Settings -->
        <button
          type="button"
          class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer flex items-center gap-1.5"
          title="Manage custom fields for this list"
          @click="isCustomFieldsModalOpen = true"
        >
          <span>📋</span>
          <span>Fields</span>
          <span
            v-if="effectiveFields.length > 0"
            class="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded-full font-mono"
          >
            {{ effectiveFields.length }}
          </span>
        </button>

        <button
          type="button"
          class="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
          @click="openCreateTaskModal()"
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

    <!-- Unified View Switcher & Filter Toolbar -->
    <div class="mb-4">
      <ViewToolbar
        :workflow="listWorkflow"
        :users="listUsers"
      >
        <template #actions>
          <!-- Subtasks Toggle (in List View) -->
          <button
            v-if="viewStore.activeView === 'list'"
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
            <span class="hidden sm:inline">{{ showSubtasks ? 'Subtasks: Shown' : 'Show Subtasks' }}</span>
          </button>
        </template>
      </ViewToolbar>
    </div>

    <!-- Content Area: Board, Calendar, or List View -->
    <div v-if="loading" class="flex-1 flex items-center justify-center py-16">
      <div class="text-slate-400 text-sm animate-pulse">Loading list items...</div>
    </div>

    <div v-else class="flex-1 flex flex-col">
      <!-- Empty state when no tasks in this list -->
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
          @click="openCreateTaskModal()"
        >
          + Add First Task
        </button>
      </div>

      <!-- Empty state when tasks exist but none match filters -->
      <div
        v-else-if="filteredTasks.length === 0"
        class="flex-1 flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-800/80 rounded-2xl p-8 text-center"
      >
        <span class="text-3xl mb-2">🔍</span>
        <h3 class="text-base font-bold text-white mb-1">No tasks match your filters</h3>
        <p class="text-xs text-slate-400 mb-4 max-w-sm">
          Try adjusting your search query, priority, or status filters.
        </p>
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition cursor-pointer"
          @click="viewStore.resetFilters"
        >
          Reset Filters
        </button>
      </div>

      <!-- Board View (Unified KanbanBoard Component) -->
      <div v-else-if="viewStore.activeView === 'board'" class="flex-1">
        <KanbanBoard
          :tasks="filteredTasks"
          :list-id="listId"
          :workflow="listWorkflow"
          :loading="loading"
          @task-drop="handleDrop"
          @create-task="openCreateTaskModal"
          @task-click="openTaskDetail"
          @delete-task="promptDeleteTask"
        />
      </div>

      <!-- Calendar View Placeholder (Phase 1) -->
      <div v-else-if="viewStore.activeView === 'calendar'" class="flex-1 flex flex-col">
        <CalendarPlaceholder @switch-view="viewStore.setActiveView" />
      </div>

      <!-- List View (Interactive ClickUp-Style Table View) -->
      <div v-else class="flex-1">
        <ListTableView
          :tasks="filteredTasks"
          :workflow="listWorkflow"
          :users="listUsers"
          :effective-fields="effectiveFields"
          :show-subtasks="showSubtasks"
          :subtasks-map="subtasksMap"
          :expanded-task-ids="expandedTaskIds"
          :loading-subtasks-map="loadingSubtasksMap"
          :group-by="viewStore.groupBy"
          @task-click="openTaskDetail"
          @task-update="handleInlineTaskUpdate"
          @task-create="handleGroupTaskCreate"
          @task-delete="promptDeleteTask"
          @toggle-expand="toggleTaskExpand"
          @toggle-done="toggleTaskDone"
          @custom-field-change="handleInlineCustomFieldChange"
        />
      </div>
    </div>

    <!-- Unified Task Creation/Edit Modal -->
    <TaskFormModal
      :is-open="isCreateModalOpen"
      :list-id="listId"
      :workflow="listWorkflow"
      :default-status="modalDefaultStatus"
      @close="isCreateModalOpen = false"
      @saved="handleTaskSaved"
    />

    <!-- Task Detail Drawer / Modal -->
    <TaskDetailDrawer
      :is-open="isDetailOpen"
      :list-id="listId"
      :task="selectedTask"
      :workflow="listWorkflow"
      @close="isDetailOpen = false"
      @updated="handleTaskUpdated"
      @deleted="handleTaskDeleted"
    />

    <!-- Status Workflow Modal -->
    <StatusWorkflowModal
      :is-open="isStatusWorkflowModalOpen"
      target-type="list"
      :target-id="listId"
      :target-name="listDetails?.name || 'List'"
      @close="isStatusWorkflowModalOpen = false"
      @saved="handleWorkflowSaved"
    />

    <!-- Custom Fields Modal for List -->
    <CustomFieldsModal
      :is-open="isCustomFieldsModalOpen"
      :list-id="listId"
      :space-id="currentSpace?._id"
      :entity-name="listDetails?.name"
      @close="isCustomFieldsModalOpen = false"
      @updated="loadCustomFields"
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

    <!-- Delete List Confirmation Dialog -->
    <ConfirmDialog
      :is-open="isConfirmDeleteListOpen"
      title="Delete List"
      :message="`Are you sure you want to delete '${listToDelete?.name || listDetails?.name || 'this list'}' and all associated tasks? This action cannot be undone.`"
      confirm-text="Delete List"
      :is-destructive="true"
      :loading="isDeletingList"
      @confirm="confirmDeleteList"
      @cancel="isConfirmDeleteListOpen = false; listToDelete = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHierarchyStore } from '../../../stores/hierarchy';
import { useCustomFieldsStore } from '../../../stores/custom-fields';
import { useViewStore } from '../../../stores/view';
import { useApi } from '../../../composables/useApi';
import { useToast } from '../../../composables/useToast';
import { extractApiErrorMessage } from '../../../utils/error';
import type { List, Space, StatusWorkflow } from '../../../types/hierarchy';
import type { Task, TaskStatus, CreateTaskPayload, UpdateTaskPayload } from '../../../types/task';
import type { EffectiveCustomField } from '../../../types/custom-field';
import KanbanBoard from '../../../components/board/KanbanBoard.vue';
import ViewToolbar from '../../../components/views/ViewToolbar.vue';
import CalendarPlaceholder from '../../../components/views/CalendarPlaceholder.vue';
import ListTableView from '../../../components/views/ListTableView.vue';
import TaskFormModal from '../../../components/task/TaskFormModal.vue';
import TaskDetailDrawer from '../../../components/task/TaskDetailDrawer.vue';
import StatusWorkflowModal from '../../../components/hierarchy/StatusWorkflowModal.vue';
import CustomFieldsModal from '../../../components/custom-fields/CustomFieldsModal.vue';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.vue';

definePageMeta({
  middleware: ['auth'],
});

const route = useRoute();
const router = useRouter();
const listId = computed(() => String(route.params.id || ''));

const hierarchyStore = useHierarchyStore();
const customFieldsStore = useCustomFieldsStore();
const viewStore = useViewStore();
const { apiFetch } = useApi();
const { showToast } = useToast();

const loading = ref(false);
const error = ref<string | null>(null);
const listDetails = ref<List | null>(null);
const tasks = ref<Task[]>([]);
const listWorkflow = ref<StatusWorkflow | null>(null);
const isWorkflowInherited = ref(false);
const isStatusWorkflowModalOpen = ref(false);
const isCustomFieldsModalOpen = ref(false);
const effectiveFields = ref<EffectiveCustomField[]>([]);

let isSyncingFromRoute = false;

onMounted(() => {
  isSyncingFromRoute = true;
  viewStore.syncFromQuery(route.query);
  isSyncingFromRoute = false;
});

watch(
  () => route.query,
  (newQuery) => {
    isSyncingFromRoute = true;
    viewStore.syncFromQuery(newQuery);
    isSyncingFromRoute = false;
  },
  { deep: true },
);

watch(
  [
    () => viewStore.activeView,
    () => viewStore.filters.search,
    () => viewStore.filters.statuses,
    () => viewStore.filters.priorities,
    () => viewStore.filters.assigneeId,
    () => viewStore.filters.dueDate,
    () => viewStore.sort.field,
    () => viewStore.sort.direction,
    () => viewStore.groupBy,
  ],
  () => {
    if (isSyncingFromRoute) return;
    const nextQuery = viewStore.toQuery();
    const currentKeys = Object.keys(route.query);
    const nextKeys = Object.keys(nextQuery);
    const isDifferent =
      currentKeys.length !== nextKeys.length ||
      nextKeys.some((k) => String(route.query[k] ?? '') !== String(nextQuery[k] ?? ''));

    if (isDifferent) {
      router.replace({ query: nextQuery });
    }
  },
  { deep: true },
);

const filteredTasks = computed(() => {
  return viewStore.filterAndSortTasks(tasks.value, listWorkflow.value);
});

const listUsers = computed(() => {
  const map = new Map<
    string,
    { _id: string; firstName?: string; lastName?: string; email: string; avatarUrl?: string }
  >();
  for (const t of tasks.value) {
    if (t.assignee && typeof t.assignee === 'object') {
      map.set(t.assignee._id, {
        _id: t.assignee._id,
        firstName: t.assignee.firstName,
        lastName: t.assignee.lastName,
        email: t.assignee.email,
        avatarUrl: t.assignee.avatarUrl,
      });
    }
  }
  return Array.from(map.values());
});

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

const isConfirmDeleteListOpen = ref(false);
const listToDelete = ref<{ id: string; name: string } | null>(null);
const isDeletingList = ref(false);

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

function isStatusDoneOrClosed(status?: TaskStatus): boolean {
  if (!status) return false;
  if (status === 'done') return true;
  if (!listWorkflow.value) return false;
  const st = listWorkflow.value.statuses.find((s) => s.id === status);
  return st ? (st.category === 'done' || st.category === 'closed') : false;
}

function isTaskDone(task: Task): boolean {
  if (task.completed) return true;
  return isStatusDoneOrClosed(task.status);
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
  const tasksWithSubtasks = tasks.value.filter((t) => (t.subtasksCount || 0) > 0);
  showSubtasks.value =
    tasksWithSubtasks.length > 0 &&
    tasksWithSubtasks.every((t) => expandedTaskIds.value.has(t._id));
}

async function toggleShowSubtasks() {
  const tasksWithSubtasks = tasks.value.filter((t) => (t.subtasksCount || 0) > 0);
  if (showSubtasks.value) {
    showSubtasks.value = false;
    expandedTaskIds.value.clear();
  } else {
    showSubtasks.value = true;
    for (const t of tasksWithSubtasks) {
      expandedTaskIds.value.add(t._id);
    }
    const promises = tasksWithSubtasks.map((t) => loadSubtasksForTask(t._id));
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
      const wfRes = await hierarchyStore.fetchListStatusWorkflow(listId.value);
      listWorkflow.value = wfRes.workflow;
      isWorkflowInherited.value = wfRes.isInherited;
    } catch {
      listWorkflow.value = null;
      isWorkflowInherited.value = false;
    }

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

    await loadCustomFields();
  } catch (err: unknown) {
    error.value = extractApiErrorMessage(err, 'Failed to load list details');
  } finally {
    loading.value = false;
  }
}

async function loadCustomFields() {
  if (!listId.value) return;
  try {
    effectiveFields.value = await customFieldsStore.fetchListFields(listId.value);
  } catch {
    effectiveFields.value = [];
  }
}

async function handleInlineCustomFieldChange(
  task: Task,
  fieldId: string,
  val: unknown,
) {
  const originalValues = { ...(task.customFieldValues || {}) };
  try {
    let updatedValues: Record<string, unknown>;
    if (val === null || val === undefined || val === '') {
      const { [fieldId]: _omitted, ...rest } = originalValues;
      updatedValues = rest;
    } else {
      updatedValues = { ...originalValues, [fieldId]: val };
    }
    task.customFieldValues = updatedValues;

    await customFieldsStore.updateTaskCustomFields(task._id, { [fieldId]: val });
    showToast('Field updated', 'success');
  } catch (err: unknown) {
    task.customFieldValues = originalValues;
    showToast(extractApiErrorMessage(err, 'Failed to update field'), 'error');
  }
}

async function handleWorkflowSaved() {
  await loadList();
}

function openCreateTaskModal(status?: TaskStatus) {
  modalDefaultStatus.value = status || (listWorkflow.value?.defaultTodoStatusId as TaskStatus) || 'todo';
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

async function handleInlineTaskUpdate(taskId: string, payload: UpdateTaskPayload) {
  let targetTask = tasks.value.find((t) => t._id === taskId);

  if (!targetTask) {
    for (const list of Object.values(subtasksMap.value)) {
      const found = list.find((s) => s._id === taskId);
      if (found) {
        targetTask = found;
        break;
      }
    }
  }

  if (!targetTask) return;

  const previousSnapshot = { ...targetTask };
  Object.assign(targetTask, payload);

  try {
    const updated = await apiFetch<Task>(`/lists/${listId.value}/tasks/${taskId}`, {
      method: 'PATCH',
      body: payload,
    });
    handleTaskUpdated(updated);
  } catch (err: unknown) {
    Object.assign(targetTask, previousSnapshot);
    showToast(extractApiErrorMessage(err, 'Failed to update task'), 'error');
  }
}

async function handleGroupTaskCreate(payload: CreateTaskPayload) {
  if (!listId.value || !payload.title?.trim()) return;

  const defaultStatus = (listWorkflow.value?.defaultTodoStatusId || 'todo') as TaskStatus;
  const taskPayload = {
    ...payload,
    title: payload.title.trim(),
    status: payload.status || defaultStatus,
  };

  try {
    const created = await apiFetch<Task>(`/lists/${listId.value}/tasks`, {
      method: 'POST',
      body: taskPayload,
    });
    handleTaskSaved(created);
    showToast(`Created task ${created.taskKey}`, 'success');
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to create task'), 'error');
  }
}

async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
  const originalTask = tasks.value.find((t) => t._id === taskId);
  const oldStatus = originalTask?.status;
  if (originalTask) {
    originalTask.status = newStatus;
  }
  let foundSubtask: Task | undefined;
  for (const list of Object.values(subtasksMap.value)) {
    foundSubtask = list.find((s) => s._id === taskId);
    if (foundSubtask) {
      foundSubtask.status = newStatus;
      break;
    }
  }

  try {
    const updated = await apiFetch<Task>(`/lists/${listId.value}/tasks/${taskId}`, {
      method: 'PATCH',
      body: { status: newStatus },
    });
    handleTaskUpdated(updated);
    showToast(`Status updated to ${newStatus.replace('_', ' ')}`, 'success');
  } catch (err: unknown) {
    if (originalTask && oldStatus) {
      originalTask.status = oldStatus;
    }
    if (foundSubtask && oldStatus) {
      foundSubtask.status = oldStatus;
    }
    showToast(extractApiErrorMessage(err, 'Failed to update status'), 'error');
  }
}

async function toggleTaskDone(task: Task) {
  const done = isTaskDone(task);
  let newStatus: TaskStatus;
  if (done) {
    newStatus = (listWorkflow.value?.defaultTodoStatusId || 'todo') as TaskStatus;
  } else {
    newStatus = (listWorkflow.value?.defaultDoneStatusId || 'done') as TaskStatus;
  }
  await handleStatusChange(task._id, newStatus);
}

function promptDeleteTask(taskOrId: Task | string) {
  if (typeof taskOrId === 'object' && taskOrId !== null) {
    taskToDelete.value = taskOrId;
    isConfirmDeleteDialogOpen.value = true;
    return;
  }
  const target = tasks.value.find((t) => t._id === taskOrId);
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

function promptDeleteList() {
  if (!listId.value || !listDetails.value) return;
  listToDelete.value = {
    id: listId.value,
    name: listDetails.value.name,
  };
  isConfirmDeleteListOpen.value = true;
}

async function confirmDeleteList() {
  if (!listToDelete.value?.id) return;
  const targetId = listToDelete.value.id;
  isDeletingList.value = true;
  try {
    await hierarchyStore.deleteList(targetId);
    showToast('List deleted successfully', 'success');
    isConfirmDeleteListOpen.value = false;
    listToDelete.value = null;
    await navigateTo('/dashboard');
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to delete list'), 'error');
  } finally {
    isDeletingList.value = false;
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
  isConfirmDeleteListOpen.value = false;
  listToDelete.value = null;
  loadList();
});
</script>
