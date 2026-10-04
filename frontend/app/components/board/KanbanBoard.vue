<template>
  <div class="w-full">
    <!-- Loading skeleton -->
    <div v-if="isLoading && allTasks.length === 0" class="flex gap-6 overflow-x-auto pb-6">
      <div
        v-for="i in 4"
        :key="i"
        class="flex-shrink-0 w-80 h-96 bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse p-4"
      >
        <div class="h-6 bg-slate-800 rounded w-1/3 mb-4" />
        <div class="space-y-3">
          <div class="h-24 bg-slate-800/60 rounded-xl" />
          <div class="h-24 bg-slate-800/60 rounded-xl" />
        </div>
      </div>
    </div>

    <!-- Active Kanban Board -->
    <div
      v-else
      class="flex gap-6 overflow-x-auto pb-6 items-start scrollbar-thin scrollbar-thumb-slate-700"
    >
      <KanbanColumn
        v-for="col in columnDefinitions"
        :key="col.id"
        :status="col.id"
        :title="col.name"
        :color="col.color"
        :tasks="groupedTasks[col.id] || []"
        :project-id="projectId"
        :list-id="listId"
        @task-drop="handleTaskDrop"
        @create-task="(status) => emit('create-task', status)"
        @task-click="(task) => emit('task-click', task)"
        @delete-task="(taskId) => emit('delete-task', taskId)"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { Task, TaskStatus } from '../../types/task';
import type { StatusWorkflow } from '../../types/hierarchy';
import { useTasksStore } from '../../stores/tasks';
import { useToast } from '../../composables/useToast';
import KanbanColumn from './KanbanColumn.vue';

interface Props {
  tasks?: Task[];
  projectId?: string;
  listId?: string;
  loading?: boolean;
  workflow?: StatusWorkflow | null;
}

interface Emits {
  (e: 'task-drop', taskId: string, newStatus: TaskStatus): void;
  (e: 'create-task', status?: TaskStatus): void;
  (e: 'task-click', task: Task): void;
  (e: 'delete-task', taskId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const tasksStore = useTasksStore();
const { showToast } = useToast();

const defaultColumns = [
  { id: 'todo', name: 'To Do', color: '#94a3b8' },
  { id: 'in_progress', name: 'In Progress', color: '#3b82f6' },
  { id: 'in_review', name: 'In Review', color: '#6366f1' },
  { id: 'done', name: 'Done', color: '#10b981' },
];

const columnDefinitions = computed(() => {
  if (props.workflow?.statuses?.length) {
    return props.workflow.statuses.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
    }));
  }
  return defaultColumns;
});

const allTasks = computed<Task[]>(() => {
  return props.tasks !== undefined ? props.tasks : tasksStore.tasks;
});

const isLoading = computed(() => {
  return props.loading !== undefined ? props.loading : tasksStore.loading;
});

const groupedTasks = computed(() => {
  const map: Record<string, Task[]> = {};
  for (const col of columnDefinitions.value) {
    map[col.id] = [];
  }
  const defaultColId = columnDefinitions.value[0]?.id || 'todo';

  for (const t of allTasks.value) {
    const statusKey = t.status || defaultColId;
    if (map[statusKey]) {
      map[statusKey].push(t);
    } else {
      if (!map[defaultColId]) {
        map[defaultColId] = [];
      }
      map[defaultColId].push(t);
    }
  }
  return map;
});

async function handleTaskDrop(taskId: string, newStatus: TaskStatus) {
  emit('task-drop', taskId, newStatus);

  // If using projectId and tasksStore, update status via store automatically
  if (props.projectId && !props.listId) {
    const current = tasksStore.tasks.find((t) => t._id === taskId);
    if (!current || current.status === newStatus) return;

    try {
      await tasksStore.updateTaskStatus(props.projectId, taskId, newStatus);
      showToast(`Task status updated to ${newStatus.replace('_', ' ')}`, 'success');
    } catch (err: unknown) {
      const errorMsg =
        (err as { data?: { message?: string }; message?: string })?.data
          ?.message ||
        (err as { message?: string })?.message ||
        'Failed to update task status';
      showToast(errorMsg, 'error');
    }
  }
}
</script>
