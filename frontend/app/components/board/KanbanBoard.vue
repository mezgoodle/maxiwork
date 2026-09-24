<template>
  <div class="w-full">
    <!-- Loading skeleton -->
    <div v-if="tasksStore.loading && tasksStore.tasks.length === 0" class="flex gap-6 overflow-x-auto pb-6">
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
        :tasks="tasksStore.tasksByStatus.todo"
        :project-id="projectId"
        @task-drop="handleTaskDrop"
        @create-task="(status) => emit('create-task', status)"
        @edit-task="(task) => emit('edit-task', task)"
      />

      <KanbanColumn
        status="in_progress"
        title="In Progress"
        :tasks="tasksStore.tasksByStatus.in_progress"
        :project-id="projectId"
        @task-drop="handleTaskDrop"
        @create-task="(status) => emit('create-task', status)"
        @edit-task="(task) => emit('edit-task', task)"
      />

      <KanbanColumn
        status="in_review"
        title="In Review"
        :tasks="tasksStore.tasksByStatus.in_review"
        :project-id="projectId"
        @task-drop="handleTaskDrop"
        @create-task="(status) => emit('create-task', status)"
        @edit-task="(task) => emit('edit-task', task)"
      />

      <KanbanColumn
        status="done"
        title="Done"
        :tasks="tasksStore.tasksByStatus.done"
        :project-id="projectId"
        @task-drop="handleTaskDrop"
        @create-task="(status) => emit('create-task', status)"
        @edit-task="(task) => emit('edit-task', task)"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Task, TaskStatus } from '../../types/task';
import { useTasksStore } from '../../stores/tasks';
import { useToast } from '../../composables/useToast';
import KanbanColumn from './KanbanColumn.vue';

interface Props {
  projectId: string;
}

interface Emits {
  (e: 'create-task', status?: TaskStatus): void;
  (e: 'edit-task', task: Task): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const tasksStore = useTasksStore();
const { showToast } = useToast();

async function handleTaskDrop(taskId: string, newStatus: TaskStatus) {
  const current = tasksStore.tasks.find((t) => t._id === taskId);
  if (!current || current.status === newStatus) {
    return;
  }

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
</script>
