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
      <span
        class="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900/60 text-slate-300 border border-slate-700/50"
      >
        {{ task.taskKey }}
      </span>

      <span
        class="text-xs font-medium px-2 py-0.5 rounded-full border capitalize"
        :class="priorityBadgeClass"
      >
        {{ task.priority }}
      </span>
    </div>

    <div
      class="block text-sm font-semibold text-slate-100 hover:text-indigo-400 transition mb-2.5 line-clamp-2 cursor-pointer"
      @click.stop="handleTitleClick"
    >
      {{ task.title }}
    </div>

    <p
      v-if="task.description"
      class="text-xs text-slate-400 line-clamp-2 mb-3"
    >
      {{ task.description }}
    </p>

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
        <span
          v-if="task.assignee"
          class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-200 border border-slate-600"
          :title="assigneeName"
        >
          {{ assigneeInitials }}
        </span>

        <button
          type="button"
          class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition cursor-pointer text-xs"
          title="Edit Task"
          @click.stop="$emit('edit', task)"
        >
          ✎
        </button>

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
import { getPriorityBadgeClass, getUserDisplayName, getUserInitials } from '../../utils/task';

interface Props {
  task: Task;
  projectId?: string;
  listId?: string;
}

interface Emits {
  (e: 'dragstart', event: DragEvent, task: Task): void;
  (e: 'click' | 'edit', task: Task): void;
  (e: 'delete', taskId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isDragging = ref(false);

const priorityBadgeClass = computed(() =>
  getPriorityBadgeClass(props.task.priority),
);

const assigneeName = computed(() => getUserDisplayName(props.task.assignee));

const assigneeInitials = computed(() => getUserInitials(props.task.assignee));

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
  const due = new Date(props.task.dueDate).getTime();
  const now = Date.now();
  if (props.task.status === 'done') {
    return 'text-slate-400';
  }
  if (due < now) {
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
