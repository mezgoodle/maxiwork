<template>
  <div
    draggable="true"
    class="bg-slate-800/90 border border-slate-700/80 hover:border-slate-500/80 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group select-none backdrop-blur-xs"
    :class="{ 'opacity-50 ring-2 ring-indigo-500': isDragging }"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @click="handleCardClick"
  >
    <div class="flex items-center justify-between gap-2 mb-2">
      <div class="flex items-center gap-2 min-w-0">
        <!-- Quick Completion Checkbox -->
        <button
          type="button"
          class="w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer shrink-0"
          :class="
            isTaskDone
              ? 'bg-emerald-500 border-emerald-400 text-slate-950 hover:bg-emerald-400'
              : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-emerald-400'
          "
          :title="isTaskDone ? 'Reopen task' : 'Mark as Done'"
          @click.stop="emit('toggle-done', task)"
        >
          <span class="text-[9px] font-bold leading-none">✓</span>
        </button>

        <span
          class="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900/60 text-slate-300 border border-slate-700/50 truncate"
        >
          {{ task.taskKey }}
        </span>

        <span
          v-if="task.isRecurring"
          class="text-xs px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center shrink-0"
          title="Recurring task"
        >
          🔁
        </span>
      </div>

      <span
        class="text-xs font-medium px-2 py-0.5 rounded-full border capitalize shrink-0"
        :class="priorityBadgeClass"
      >
        {{ task.priority }}
      </span>
    </div>

    <div
      class="block text-sm font-semibold transition mb-2.5 line-clamp-2 cursor-pointer"
      :class="isTaskDone ? 'line-through text-slate-500' : 'text-slate-100 hover:text-indigo-400'"
      @click.stop="handleTitleClick"
    >
      {{ task.title }}
    </div>

    <div
      v-if="task.description"
      class="text-xs text-slate-400 line-clamp-2 mb-3 break-words overflow-hidden"
    >
      <MarkdownViewer
        :content="task.description"
        :interactive-checklists="false"
        compact
      />
    </div>

    <!-- Due Date & Assignee row -->
    <div class="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/50 mt-auto">
      <div class="flex items-center gap-2">
        <div v-if="task.dueDate" class="flex items-center gap-1 font-mono text-[11px]" :class="dueDateClass">
          <span>📅</span>
          <span>{{ formattedDueDate }}</span>
        </div>

        <div
          v-if="task.subtasksCount && task.subtasksCount > 0"
          class="flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-slate-900/60 border border-slate-700/60"
          :class="task.completedSubtasksCount === task.subtasksCount ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-400'"
          title="Subtasks completed"
        >
          <span>↳</span>
          <span>{{ task.completedSubtasksCount || 0 }}/{{ task.subtasksCount }}</span>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <div v-if="resolvedAssignee || task.assignee" class="flex items-center">
          <img
            v-if="resolvedAssignee?.avatarUrl"
            :src="resolvedAssignee.avatarUrl"
            :alt="assigneeName"
            :title="assigneeName"
            class="w-6 h-6 rounded-full object-cover border border-slate-600"
          >
          <span
            v-else
            class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-200 border border-slate-600"
            :title="assigneeName"
          >
            {{ assigneeInitials }}
          </span>
        </div>

        <button
          type="button"
          class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-500/10 transition cursor-pointer text-xs"
          title="Delete Task"
          @click.stop="$emit('delete', task._id)"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { Task } from '../../types/task';
import type { StatusWorkflow } from '../../types/hierarchy';
import { getPriorityBadgeClass, getUserDisplayName, getUserInitials, toDateString } from '../../utils/task';
import { isTaskCompleted, resolveTaskAssignee, getUserLabel, type UserOption } from '../../utils/table-view';
import MarkdownViewer from '../ui/MarkdownViewer.vue';

interface Props {
  task: Task;
  projectId?: string;
  listId?: string;
  workflow?: StatusWorkflow | null;
  users?: UserOption[];
}

interface Emits {
  (e: 'dragstart', event: DragEvent, task: Task): void;
  (e: 'click' | 'toggle-done', task: Task): void;
  (e: 'delete', taskId: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  projectId: undefined,
  listId: undefined,
  workflow: null,
  users: () => [],
});

const emit = defineEmits<Emits>();

const isDragging = ref(false);

const isTaskDone = computed(() => isTaskCompleted(props.task, props.workflow));

const priorityBadgeClass = computed(() =>
  getPriorityBadgeClass(props.task.priority),
);

const resolvedAssignee = computed(() => resolveTaskAssignee(props.task.assignee, props.users));

const assigneeName = computed(() => {
  if (resolvedAssignee.value) {
    return getUserLabel(resolvedAssignee.value);
  }
  return getUserDisplayName(props.task.assignee);
});

const assigneeInitials = computed(() => {
  if (resolvedAssignee.value) {
    return getUserInitials(resolvedAssignee.value);
  }
  return getUserInitials(props.task.assignee);
});

const formattedDueDate = computed(() => {
  if (!props.task.dueDate) return '';
  const d = new Date(props.task.dueDate);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
});

const dueDateClass = computed(() => {
  if (!props.task.dueDate) return '';
  if (isTaskDone.value) {
    return 'text-slate-500';
  }
  const dueDay = toDateString(new Date(props.task.dueDate));
  const today = toDateString(new Date());
  if (dueDay < today) {
    return 'text-rose-400 font-semibold';
  }
  return 'text-slate-300';
});

function handleDragStart(e: DragEvent) {
  isDragging.value = true;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', props.task._id);
  }
  emit('dragstart', e, props.task);
}

function handleDragEnd() {
  isDragging.value = false;
}

function handleCardClick() {
  emit('click', props.task);
}

function handleTitleClick() {
  emit('click', props.task);
  if (props.projectId && !props.listId) {
    navigateTo(`/projects/${props.projectId}/tasks/${props.task._id}`);
  }
}
</script>
