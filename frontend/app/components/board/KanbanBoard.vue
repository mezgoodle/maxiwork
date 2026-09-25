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
        status="todo"
        title="To Do"
        :tasks="groupedTasks.todo"
        :project-id="projectId"
        :list-id="listId"
        @task-drop="handleTaskDrop"
        @create-task="(status) => emit('create-task', status)"
        @task-click="(task) => emit('task-click', task)"
        @delete-task="(taskId) => emit('delete-task', taskId)"
      />

      <KanbanColumn
        status="in_progress"
        title="In Progress"
        :tasks="groupedTasks.in_progress"
        :project-id="projectId"
        :list-id="listId"
        @task-drop="handleTaskDrop"
        @create-task="(status) => emit('create-task', status)"
        @task-click="(task) => emit('task-click', task)"
        @delete-task="(taskId) => emit('delete-task', taskId)"
      />

      <KanbanColumn
        status="in_review"
        title="In Review"
        :tasks="groupedTasks.in_review"
        :project-id="projectId"
        :list-id="listId"
        @task-drop="handleTaskDrop"
        @create-task="(status) => emit('create-task', status)"
        @task-click="(task) => emit('task-click', task)"
        @delete-task="(taskId) => emit('delete-task', taskId)"
      />

      <KanbanColumn
        status="done"
        title="Done"
        :tasks="groupedTasks.done"
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
import { useTasksStore } from '../../stores/tasks';
import { useToast } from '../../composables/useToast';
import KanbanColumn from './KanbanColumn.vue';

interface Props {
  tasks?: Task[];
  projectId?: string;
  listId?: string;
  loading?: boolean;
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

const allTasks = computed<Task[]>(() => {
  return props.tasks !== undefined ? props.tasks : tasksStore.tasks;
});

const isLoading = computed(() => {
  return props.loading !== undefined ? props.loading : tasksStore.loading;
});

const groupedTasks = computed(() => {
  const map: Record<TaskStatus, Task[]> = {
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
  };
  for (const t of allTasks.value) {
    if (map[t.status]) {
      map[t.status].push(t);
    } else {
      map.todo.push(t);
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
