<template>
  <div
    draggable="true"
    class="bg-slate-800/90 border border-slate-700/80 hover:border-slate-500/80 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group select-none backdrop-blur-xs"
    :class="{ 'opacity-50 ring-2 ring-emerald-500': isDragging }"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
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

    <NuxtLink
      :to="`/projects/${projectId}/tasks/${task._id}`"
      class="block text-sm font-semibold text-slate-100 hover:text-emerald-400 transition mb-2.5 line-clamp-2"
    >
      {{ task.title }}
    </NuxtLink>

    <p
      v-if="task.description"
      class="text-xs text-slate-400 line-clamp-2 mb-3"
    >
      {{ task.description }}
    </p>

    <!-- Due Date & Assignee row -->
    <div class="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/50 mt-auto">
      <div v-if="task.dueDate" class="flex items-center gap-1 font-mono text-[11px]" :class="dueDateClass">
        <span>📅</span>
        <span>{{ formattedDueDate }}</span>
      </div>
      <div v-else />

      <div class="flex items-center gap-1.5">
        <span
          class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-200 border border-slate-600"
          :title="assigneeName"
        >
          {{ assigneeInitials }}
        </span>

        <button
          type="button"
          class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition cursor-pointer"
          title="Edit Task"
          @click.stop="$emit('edit', task)"
        >
          ✎
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { Task } from '../../types/task';

interface Props {
  task: Task;
  projectId: string;
}

interface Emits {
  (e: 'dragstart', event: DragEvent, task: Task): void;
  (e: 'edit', task: Task): void;
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
</script>
