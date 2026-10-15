<template>
  <div class="flex-1 flex flex-col min-h-0 bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden">
    <!-- Calendar Sub-Header / Controls -->
    <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/70 border-b border-slate-800/80">
      <!-- Left: Navigation (< Today >) and Current Period Display -->
      <div class="flex items-center gap-2">
        <div class="flex items-center bg-slate-800/80 rounded-xl p-0.5 border border-slate-700/60 shadow-xs">
          <button
            type="button"
            class="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition cursor-pointer"
            title="Previous"
            @click="navigatePrevious"
          >
            ‹
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700/60 rounded-lg transition cursor-pointer"
            title="Jump to Today"
            @click="jumpToToday"
          >
            Today
          </button>
          <button
            type="button"
            class="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition cursor-pointer"
            title="Next"
            @click="navigateNext"
          >
            ›
          </button>
        </div>

        <h2 class="text-sm md:text-base font-bold text-white px-2 tracking-tight">
          {{ periodTitle }}
        </h2>
      </div>

      <!-- Right: View Mode Toggle (Month / Week) & Unscheduled Drawer Toggle -->
      <div class="flex items-center gap-2">
        <!-- Month / Week Toggle -->
        <div class="flex items-center bg-slate-800/80 rounded-xl p-0.5 border border-slate-700/60 shadow-xs">
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
            :class="
              viewMode === 'month'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            "
            @click="viewMode = 'month'"
          >
            <span>🗓️</span>
            <span>Month</span>
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
            :class="
              viewMode === 'week'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            "
            @click="viewMode = 'week'"
          >
            <span>📅</span>
            <span>Week</span>
          </button>
        </div>

        <!-- Unscheduled Tasks Side Drawer Toggle -->
        <button
          type="button"
          class="px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          :class="
            isDrawerOpen
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
              : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-white'
          "
          :title="isDrawerOpen ? 'Hide unscheduled tasks sidebar' : 'Show unscheduled tasks sidebar'"
          @click="isDrawerOpen = !isDrawerOpen"
        >
          <span>📦</span>
          <span>Unscheduled</span>
          <span
            v-if="unscheduledTasks.length > 0"
            class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
            :class="isDrawerOpen ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'"
          >
            {{ unscheduledTasks.length }}
          </span>
        </button>
      </div>
    </div>

    <!-- Main Content Area: Calendar Grid + Optional Unscheduled Drawer -->
    <div class="flex-1 flex min-h-0 overflow-hidden relative">
      <!-- Calendar Grid Container -->
      <div class="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <!-- Weekday Headers (Mon to Sun) -->
        <div class="grid grid-cols-7 border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10 text-center select-none">
          <div
            v-for="dayName in weekdayHeaders"
            :key="dayName"
            class="py-2 text-[11px] font-bold tracking-wider uppercase text-slate-400 border-r border-slate-800/60 last:border-r-0"
          >
            {{ dayName }}
          </div>
        </div>

        <!-- Days Grid -->
        <div
          class="grid grid-cols-7 flex-1"
          :class="viewMode === 'month' ? 'auto-rows-fr' : 'min-h-[480px]'"
        >
          <div
            v-for="day in displayedDays"
            :key="day.dateString"
            class="group border-r border-b border-slate-800/60 last:border-r-0 p-1.5 md:p-2 flex flex-col transition-colors relative"
            :class="[
              viewMode === 'month' ? 'min-h-[110px]' : 'min-h-[380px]',
              day.isCurrentMonth ? 'bg-slate-900/20' : 'bg-slate-950/40 text-slate-600',
              day.isToday ? 'bg-indigo-950/20 ring-1 ring-inset ring-indigo-500/30' : '',
              dragOverDate === day.dateString ? 'bg-indigo-600/15 ring-2 ring-inset ring-indigo-500' : '',
            ]"
            @dragover.prevent="handleDragOver(day.dateString)"
            @dragenter.prevent="handleDragOver(day.dateString)"
            @dragleave="handleDragLeave(day.dateString)"
            @drop.prevent="handleDrop(day.dateString)"
          >
            <!-- Day Cell Header: Day Number + Add Task Button -->
            <div class="flex items-center justify-between mb-1 select-none">
              <span
                class="text-xs font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1 transition"
                :class="[
                  day.isToday
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : day.isCurrentMonth
                      ? 'text-slate-300'
                      : 'text-slate-500',
                ]"
              >
                {{ day.dayNumber }}
              </span>

              <!-- Quick Add Task Button for this Date -->
              <button
                type="button"
                class="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
                title="Add task on this date"
                @click.stop="emit('create-task', day.dateString)"
              >
                +
              </button>
            </div>

            <!-- Task Pills Container -->
            <div class="flex-1 flex flex-col gap-1 overflow-y-auto max-h-full pr-0.5 scrollbar-thin">
              <div
                v-for="task in getTasksForDate(day.dateString)"
                :key="task._id"
                draggable="true"
                class="group/pill select-none transition cursor-grab active:cursor-grabbing backdrop-blur-xs flex shadow-xs"
                :class="[
                  getSpanClasses(task, day.dateString, day.date.getDay()),
                  isMultiDayTask(task)
                    ? 'items-center gap-1.5 py-1 px-2 text-[11px] font-medium border my-0.5'
                    : 'rounded-lg p-1.5 text-xs border flex-col gap-1 hover:border-slate-500',
                  isTaskDone(task)
                    ? 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-75'
                    : getTaskBadgeStyleClass(task),
                  draggingTaskId === task._id ? 'opacity-40 ring-2 ring-indigo-500' : '',
                ]"
                @dragstart="handleDragStart($event, task)"
                @dragend="handleDragEnd"
                @click.stop="emit('task-click', task)"
              >
                <!-- A: Multi-day Ribbon Bar (ClickUp / Google Calendar Style) -->
                <template v-if="isMultiDayTask(task)">
                  <!-- Status Indicator Dot -->
                  <span
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    :style="{ backgroundColor: getStatusColor(task.status) }"
                    :title="getStatusName(task.status)"
                  />

                  <!-- Start segment: Key + Title -->
                  <template v-if="getSpanPosition(task, day.dateString, day.date.getDay()) === 'start'">
                    <span class="font-mono text-[10px] text-slate-400 font-semibold truncate shrink-0">
                      {{ task.taskKey }}
                    </span>
                    <span
                      class="truncate text-slate-200 group-hover/pill:text-indigo-300 font-medium"
                      :class="isTaskDone(task) ? 'line-through text-slate-500' : ''"
                    >
                      {{ task.title }}
                    </span>
                    <span class="ml-auto text-[9px] text-slate-400 shrink-0 font-normal">
                      &rarr;
                    </span>
                  </template>

                  <!-- Middle segment: Continued connection line with subtle title -->
                  <template v-else-if="getSpanPosition(task, day.dateString, day.date.getDay()) === 'middle'">
                    <span
                      class="truncate text-slate-400 group-hover/pill:text-slate-200 text-[10px]"
                      :class="isTaskDone(task) ? 'line-through text-slate-500' : ''"
                    >
                      {{ task.title }}
                    </span>
                  </template>

                  <!-- End segment: Due tag & completion check -->
                  <template v-else-if="getSpanPosition(task, day.dateString, day.date.getDay()) === 'end'">
                    <!-- Done Checkbox -->
                    <button
                      type="button"
                      class="w-3 h-3 rounded border flex items-center justify-center transition cursor-pointer shrink-0"
                      :class="
                        isTaskDone(task)
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-emerald-400'
                      "
                      :title="isTaskDone(task) ? 'Reopen task' : 'Mark as Done'"
                      @click.stop="emit('toggle-done', task)"
                    >
                      <span class="text-[7px] font-bold leading-none">✓</span>
                    </button>
                    <span
                      class="truncate text-slate-200 group-hover/pill:text-indigo-300"
                      :class="isTaskDone(task) ? 'line-through text-slate-500' : ''"
                    >
                      {{ task.title }}
                    </span>
                    <span class="ml-auto px-1 py-0.2 rounded text-[8px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                      Due
                    </span>
                  </template>
                </template>

                <!-- B: Single Day Task Card -->
                <template v-else>
                  <!-- Header: Completion Checkbox, Status Pill, Priority / Overdue Badge -->
                  <div class="flex items-center justify-between gap-1.5 min-w-0">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <!-- Done Checkbox -->
                      <button
                        type="button"
                        class="w-3.5 h-3.5 rounded border flex items-center justify-center transition cursor-pointer shrink-0"
                        :class="
                          isTaskDone(task)
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-emerald-400'
                        "
                        :title="isTaskDone(task) ? 'Reopen task' : 'Mark as Done'"
                        @click.stop="emit('toggle-done', task)"
                      >
                        <span class="text-[8px] font-bold leading-none">✓</span>
                      </button>

                      <!-- Status Indicator Dot / Pill -->
                      <span
                        class="w-2 h-2 rounded-full shrink-0"
                        :style="{ backgroundColor: getStatusColor(task.status) }"
                        :title="getStatusName(task.status)"
                      />

                      <!-- Task Key (Monospace) -->
                      <span class="font-mono text-[10px] text-slate-400 truncate">
                        {{ task.taskKey }}
                      </span>
                    </div>

                    <!-- Overdue Indicator -->
                    <span
                      v-if="checkOverdue(task)"
                      class="px-1 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0"
                      title="Overdue"
                    >
                      !
                    </span>
                  </div>

                  <!-- Task Title -->
                  <div
                    class="font-medium text-xs truncate leading-snug"
                    :class="isTaskDone(task) ? 'line-through text-slate-500' : 'text-slate-100 group-hover/pill:text-indigo-300'"
                  >
                    {{ task.title }}
                  </div>

                  <!-- Footer: Priority & Assignee Avatar -->
                  <div class="flex items-center justify-between gap-1 mt-0.5 text-[10px]">
                    <span
                      class="px-1.5 py-0.2 rounded text-[9px] font-medium border capitalize truncate"
                      :class="getPriorityClass(task.priority)"
                    >
                      {{ task.priority }}
                    </span>

                    <!-- Assignee Avatar / Initials -->
                    <div
                      v-if="task.assignee"
                      class="w-4 h-4 rounded-full bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 flex items-center justify-center font-bold text-[8px] shrink-0"
                      :title="getAssigneeName(task.assignee)"
                    >
                      {{ getAssigneeInitials(task.assignee) }}
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Collapsible Unscheduled Tasks Sidebar -->
      <aside
        v-if="isDrawerOpen"
        class="w-72 md:w-80 bg-slate-900/90 border-l border-slate-800 flex flex-col min-h-0 z-20 shadow-xl backdrop-blur-md transition-all"
      >
        <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-sm">📦</span>
            <h3 class="text-xs font-bold text-white uppercase tracking-wider">
              Unscheduled Tasks
            </h3>
            <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700/60">
              {{ unscheduledTasks.length }}
            </span>
          </div>

          <button
            type="button"
            class="text-slate-400 hover:text-white text-xs p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Close sidebar"
            @click="isDrawerOpen = false"
          >
            ✕
          </button>
        </div>

        <div class="p-3 text-xs text-slate-400 bg-slate-950/40 border-b border-slate-800/80">
          💡 Drag tasks from this list and drop them directly onto any calendar date to set their due date.
        </div>

        <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          <div
            v-if="unscheduledTasks.length === 0"
            class="py-12 text-center text-slate-500 text-xs italic"
          >
            All tasks currently have scheduled due dates!
          </div>

          <div
            v-for="task in unscheduledTasks"
            :key="task._id"
            draggable="true"
            class="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-xl p-3 shadow-xs transition cursor-grab active:cursor-grabbing select-none flex flex-col gap-2"
            :class="{ 'opacity-40 ring-2 ring-indigo-500': draggingTaskId === task._id }"
            @dragstart="handleDragStart($event, task)"
            @dragend="handleDragEnd"
            @click="emit('task-click', task)"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  :style="{ backgroundColor: getStatusColor(task.status) }"
                />
                <span class="font-mono text-[10px] text-slate-400 truncate">
                  {{ task.taskKey }}
                </span>
              </div>

              <span
                class="px-1.5 py-0.5 rounded text-[9px] font-medium border capitalize"
                :class="getPriorityClass(task.priority)"
              >
                {{ task.priority }}
              </span>
            </div>

            <div
              class="text-xs font-semibold text-slate-100 group-hover:text-indigo-300 transition line-clamp-2"
              :class="isTaskDone(task) ? 'line-through text-slate-500' : ''"
            >
              {{ task.title }}
            </div>

            <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/50">
              <span class="capitalize">{{ getStatusName(task.status) }}</span>
              <div
                v-if="task.assignee"
                class="flex items-center gap-1 text-slate-300"
              >
                <div class="w-3.5 h-3.5 rounded-full bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 flex items-center justify-center font-bold text-[8px]">
                  {{ getAssigneeInitials(task.assignee) }}
                </div>
                <span class="truncate max-w-[80px]">{{ getAssigneeName(task.assignee) }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Task } from '../../types/task';
import type { StatusWorkflow } from '../../types/hierarchy';
import type { UserOption } from '../../utils/table-view';
import {
  getMonthDays,
  getWeekDays,
  formatMonthYear,
  formatWeekRange,
  isTaskOverdue,
  groupTasksByDate,
  getTaskSpanPosition,
  type CalendarViewMode,
  type TaskSpanPosition,
} from '../../utils/calendar';
import {
  isTaskCompleted,
  getStatusOptions,
  resolveTaskAssignee,
  getUserLabel,
} from '../../utils/table-view';
import {
  getPriorityBadgeClass,
  getUserDisplayName,
  getUserInitials,
} from '../../utils/task';

interface Props {
  tasks: Task[];
  workflow?: StatusWorkflow | null;
  users?: UserOption[];
  loading?: boolean;
}

interface Emits {
  (e: 'task-click' | 'toggle-done', task: Task): void;
  (e: 'task-date-change', taskId: string, newDueDate: string): void;
  (e: 'create-task', defaultDate?: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  workflow: null,
  users: () => [],
  loading: false,
});

const emit = defineEmits<Emits>();

// Active state
const viewMode = ref<CalendarViewMode>('month');
const currentDate = ref(new Date());
const isDrawerOpen = ref(false);

// Drag and drop state
const draggingTaskId = ref<string | null>(null);
const dragOverDate = ref<string | null>(null);

const weekdayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Navigation controls
const navigatePrevious = () => {
  const d = new Date(currentDate.value);
  if (viewMode.value === 'month') {
    d.setMonth(d.getMonth() - 1);
  } else {
    d.setDate(d.getDate() - 7);
  }
  currentDate.value = d;
};

const navigateNext = () => {
  const d = new Date(currentDate.value);
  if (viewMode.value === 'month') {
    d.setMonth(d.getMonth() + 1);
  } else {
    d.setDate(d.getDate() + 7);
  }
  currentDate.value = d;
};

const jumpToToday = () => {
  currentDate.value = new Date();
};

// Days computation
const displayedDays = computed(() => {
  if (viewMode.value === 'month') {
    return getMonthDays(currentDate.value.getFullYear(), currentDate.value.getMonth());
  }
  return getWeekDays(currentDate.value);
});

// Period title display
const periodTitle = computed(() => {
  if (viewMode.value === 'month') {
    return formatMonthYear(currentDate.value);
  }
  const days = displayedDays.value;
  if (!days.length) return '';
  return formatWeekRange(days[0].date, days[days.length - 1].date);
});

// Tasks partitioning
const partitionedTasks = computed(() => groupTasksByDate(props.tasks));

const getTasksForDate = (dateString: string): Task[] => {
  return partitionedTasks.value.scheduled.get(dateString) || [];
};

const unscheduledTasks = computed(() => partitionedTasks.value.unscheduled);

// Task metadata helpers
const isTaskDone = (task: Task) => isTaskCompleted(task, props.workflow);

const checkOverdue = (task: Task) => isTaskOverdue(task, props.workflow);

const statusOptions = computed(() => getStatusOptions(props.workflow));

const getStatusColor = (status?: string): string => {
  const found = statusOptions.value.find((s) => s.id === status);
  return found?.color || '#94A3B8';
};

const getStatusName = (status?: string): string => {
  const found = statusOptions.value.find((s) => s.id === status);
  return found?.name || status || 'To Do';
};

const getPriorityClass = (priority?: string): string => getPriorityBadgeClass(priority);

const getAssigneeName = (assignee: unknown): string => {
  const resolved = resolveTaskAssignee(assignee, props.users);
  if (resolved) return getUserLabel(resolved);
  return getUserDisplayName(assignee);
};

const getAssigneeInitials = (assignee: unknown): string => {
  const resolved = resolveTaskAssignee(assignee, props.users);
  if (resolved) return getUserInitials(resolved);
  return getUserInitials(assignee);
};

const isMultiDayTask = (task: Task): boolean => {
  return getTaskSpanPosition(task, '') !== 'single' || (
    !!task.startDate && !!task.dueDate && task.startDate.split('T')[0] < task.dueDate.split('T')[0]
  );
};

const getTaskBadgeStyleClass = (task: Task): string => {
  if (isMultiDayTask(task)) {
    return 'bg-indigo-950/70 border-indigo-700/60 text-indigo-100 hover:bg-indigo-900/80';
  }
  return 'bg-slate-800/90 border-slate-700/80 text-slate-200 hover:bg-slate-800';
};

const getSpanPosition = (task: Task, dateString: string, dayOfWeek?: number): TaskSpanPosition => {
  return getTaskSpanPosition(task, dateString, dayOfWeek);
};

const getSpanClasses = (task: Task, dateString: string, dayOfWeek?: number): string => {
  if (!isMultiDayTask(task)) {
    return 'rounded-lg';
  }

  const pos = getTaskSpanPosition(task, dateString, dayOfWeek);
  if (pos === 'start') {
    return 'rounded-l-md rounded-r-none border-r-0 mr-[-6px] md:mr-[-9px] z-[2] pr-1.5 shadow-sm';
  }
  if (pos === 'middle') {
    return 'rounded-none border-x-0 mx-[-6px] md:mx-[-9px] z-[1] px-1 shadow-none';
  }
  if (pos === 'end') {
    return 'rounded-r-md rounded-l-none border-l-0 ml-[-6px] md:ml-[-9px] z-[2] pl-1.5 shadow-sm';
  }
  return 'rounded-md';
};

// Drag and Drop handlers
const handleDragStart = (e: DragEvent, task: Task) => {
  draggingTaskId.value = task._id;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task._id);
  }
};

const handleDragEnd = () => {
  draggingTaskId.value = null;
  dragOverDate.value = null;
};

const handleDragOver = (dateString: string) => {
  dragOverDate.value = dateString;
};

const handleDragLeave = (dateString: string) => {
  if (dragOverDate.value === dateString) {
    dragOverDate.value = null;
  }
};

const handleDrop = (dateString: string) => {
  const taskId = draggingTaskId.value;
  dragOverDate.value = null;
  draggingTaskId.value = null;

  if (taskId) {
    emit('task-date-change', taskId, dateString);
  }
};
</script>
