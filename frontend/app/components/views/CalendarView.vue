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
        <div class="grid grid-cols-7 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-20 text-center select-none backdrop-blur-xs">
          <div
            v-for="dayName in weekdayHeaders"
            :key="dayName"
            class="py-2 text-[11px] font-bold tracking-wider uppercase text-slate-400 border-r border-slate-800/60 last:border-r-0"
          >
            {{ dayName }}
          </div>
        </div>

        <!-- Week Rows Container -->
        <div
          class="flex-1 flex flex-col divide-y divide-slate-800/60"
          :class="viewMode === 'month' ? '' : 'min-h-[480px]'"
        >
          <div
            v-for="(week, wIdx) in weekRows"
            :key="wIdx"
            class="relative flex-1 flex flex-col border-b border-slate-800/60 last:border-b-0"
            :class="viewMode === 'month' ? 'min-h-[110px]' : 'min-h-[420px]'"
          >
            <!-- Layer 1: Background Day Cells (Grid 7 columns) -->
            <div class="grid grid-cols-7 absolute inset-0 z-0">
              <div
                v-for="day in week.days"
                :key="day.dateString"
                class="group border-r border-slate-800/60 last:border-r-0 p-1.5 md:p-2 flex flex-col transition-colors cursor-pointer select-none"
                :class="[
                  day.isCurrentMonth ? 'bg-slate-900/20' : 'bg-slate-950/40 text-slate-600',
                  day.isToday ? 'bg-indigo-950/20 ring-1 ring-inset ring-indigo-500/30' : '',
                  dragOverDate === day.dateString ? 'bg-indigo-600/15 ring-2 ring-inset ring-indigo-500' : '',
                ]"
                @dragover.prevent="handleDragOver(day.dateString)"
                @dragenter.prevent="handleDragOver(day.dateString)"
                @dragleave="handleDragLeave(day.dateString)"
                @drop.prevent="handleDrop(day.dateString)"
                @click="emit('create-task', day.dateString)"
              >
                <!-- Day Cell Header: Day Number + Add Task Button -->
                <div class="flex items-center justify-between mb-1">
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
              </div>
            </div>

            <!-- Layer 2: Foreground Task Segments (CSS Grid 7 columns) -->
            <div
              class="relative z-10 grid grid-cols-7 gap-y-1 pt-8 pb-2 px-1 pointer-events-none auto-rows-[26px]"
            >
              <div
                v-for="seg in week.segments"
                :key="`${seg.task._id}-${seg.startCol}-${seg.span}`"
                :style="[
                  { gridColumn: `${seg.startCol} / span ${seg.span}`, gridRow: `${seg.rowSlot}` },
                  getSegmentInlineStyles(seg),
                ]"
                class="group/bar h-6.5 max-h-[26px] flex items-center px-2 text-xs transition cursor-grab active:cursor-grabbing select-none shadow-xs border overflow-hidden whitespace-nowrap"
                :class="[
                  draggingTaskId ? 'pointer-events-none' : 'pointer-events-auto',
                  getSegmentBorderRadius(seg),
                  getSegmentStyleClasses(seg),
                  draggingTaskId === seg.task._id ? 'opacity-40 ring-2 ring-indigo-500' : '',
                ]"
                draggable="true"
                @dragstart="handleDragStart($event, seg.task)"
                @dragend="handleDragEnd"
                @click.stop="emit('task-click', seg.task)"
              >
                <!-- Done Checkbox -->
                <button
                  type="button"
                  class="w-3.5 h-3.5 rounded border flex items-center justify-center transition cursor-pointer shrink-0 mr-1.5"
                  :class="
                    isTaskDone(seg.task)
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                      : 'bg-slate-900/80 border-slate-600 text-slate-400 hover:text-emerald-400'
                  "
                  :title="isTaskDone(seg.task) ? 'Reopen task' : 'Mark as Done'"
                  @click.stop="emit('toggle-done', seg.task)"
                >
                  <span class="text-[8px] font-bold leading-none">✓</span>
                </button>

                <!-- Left continuation indicator (if starting before this week) -->
                <span
                  v-if="!seg.isStartOfTask"
                  class="text-[10px] text-slate-400 font-bold shrink-0 mr-1"
                  title="Continued from previous week"
                >
                  &larr;
                </span>

                <!-- Status icon or state icon -->
                <template v-if="getTaskState(seg.task) === 'milestone'">
                  <span class="text-[10px] shrink-0 mr-1" title="Milestone (Due date)">🚩</span>
                </template>
                <template v-else-if="getTaskState(seg.task) === 'event'">
                  <span class="text-[9px] shrink-0 mr-1 text-sky-400" title="Event (Start date)">▶</span>
                </template>
                <template v-else>
                  <!-- Range dot -->
                  <span
                    class="w-2 h-2 rounded-full shrink-0 mr-1.5"
                    :style="{ backgroundColor: getStatusColor(seg.task.status) }"
                    :title="getStatusName(seg.task.status)"
                  />
                </template>

                <!-- Task Key -->
                <span class="font-mono text-[10px] text-slate-300 font-semibold mr-1 shrink-0">
                  {{ seg.task.taskKey }}
                </span>

                <!-- Recurrence Indicator -->
                <span
                  v-if="seg.task.isRecurring"
                  class="text-[9px] mr-1 shrink-0 select-none"
                  title="Recurring task"
                >
                  🔁
                </span>

                <!-- Task Title (Rendered exactly once, truncated) -->
                <span
                  class="truncate font-medium text-slate-100 group-hover/bar:text-indigo-200 min-w-0 flex-1"
                  :class="isTaskDone(seg.task) ? 'line-through text-slate-400' : ''"
                >
                  {{ seg.task.title }}
                </span>

                <!-- Right continuation indicator (if continuing into next week) -->
                <span
                  v-if="!seg.isEndOfTask"
                  class="text-[10px] text-slate-400 font-bold shrink-0 ml-1"
                  title="Continues into next week"
                >
                  &rarr;
                </span>

                <!-- Assignee avatar if span >= 3 -->
                <div
                  v-if="seg.span >= 3 && seg.task.assignee"
                  class="w-4 h-4 rounded-full bg-indigo-600/50 text-indigo-200 border border-indigo-500/50 flex items-center justify-center font-bold text-[8px] shrink-0 ml-1.5"
                  :title="getAssigneeName(seg.task.assignee)"
                >
                  {{ getAssigneeInitials(seg.task.assignee) }}
                </div>

                <!-- Priority badge when span >= 3 or on single-day point cards -->
                <span
                  v-if="(seg.span >= 3 || seg.span === 1) && seg.task.priority"
                  class="px-1 py-0.2 rounded text-[8px] font-medium border capitalize shrink-0 ml-1"
                  :class="getPriorityClass(seg.task.priority)"
                >
                  {{ seg.task.priority }}
                </span>

                <!-- Overdue tag -->
                <span
                  v-if="checkOverdue(seg.task) && !isTaskDone(seg.task)"
                  class="px-1 py-0.2 rounded text-[8px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0 ml-1"
                  title="Overdue"
                >
                  !
                </span>
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
                <span
                  v-if="task.isRecurring"
                  class="text-[9px] shrink-0"
                  title="Recurring task"
                >
                  🔁
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
  getMonthWeeks,
  getWeeksWithTaskSegments,
  formatMonthYear,
  formatWeekRange,
  isTaskOverdue,
  groupTasksByDate,
  classifyTaskDateState,
  type CalendarDay,
  type CalendarViewMode,
  type CalendarTaskSegment,
  type TaskDateState,
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

// Week rows computation
const weekRows = computed<{ days: CalendarDay[]; segments: CalendarTaskSegment[] }[]>(() => {
  if (viewMode.value === 'month') {
    const rawWeeks = getMonthWeeks(currentDate.value.getFullYear(), currentDate.value.getMonth());
    return getWeeksWithTaskSegments(rawWeeks, props.tasks);
  }
  const weekDays = getWeekDays(currentDate.value);
  return getWeeksWithTaskSegments([weekDays], props.tasks);
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

const unscheduledTasks = computed(() => partitionedTasks.value.unscheduled);

// Task metadata helpers
const isTaskDone = (task: Task) => isTaskCompleted(task, props.workflow);

const checkOverdue = (task: Task) => isTaskOverdue(task, props.workflow);

const getTaskState = (task: Task): TaskDateState => classifyTaskDateState(task);

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

// Returns segment rounding classes based on whether it starts or ends within the week
const getSegmentBorderRadius = (seg: CalendarTaskSegment): string => {
  const isMulti = seg.span > 1 || !seg.isStartOfTask || !seg.isEndOfTask;
  if (!isMulti) return 'rounded-md';

  if (seg.isStartOfTask && seg.isEndOfTask) {
    return 'rounded-md';
  }
  if (seg.isStartOfTask) {
    return 'rounded-l-md rounded-r-none';
  }
  if (seg.isEndOfTask) {
    return 'rounded-r-md rounded-l-none';
  }
  return 'rounded-none';
};

// Returns visual styling based on task date state, completion, and overdue status
const getSegmentStyleClasses = (seg: CalendarTaskSegment): string => {
  if (isTaskDone(seg.task)) {
    return 'bg-slate-900/90 border-slate-700/60 text-slate-500 opacity-70';
  }
  if (checkOverdue(seg.task)) {
    return 'bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/50 text-rose-100 shadow-sm';
  }
  const state = getTaskState(seg.task);
  if (state === 'milestone') {
    return 'bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/50 text-amber-100 shadow-sm';
  }
  if (state === 'event') {
    return 'bg-sky-950/50 hover:bg-sky-900/60 border border-sky-500/50 text-sky-100 shadow-sm';
  }
  // Range (start + due)
  return 'bg-indigo-950/80 hover:bg-indigo-900/90 border border-indigo-500/40 hover:border-indigo-400/60 text-indigo-100 shadow-sm backdrop-blur-xs';
};

// Returns dynamic inline styles such as status-colored left border accent
const getSegmentInlineStyles = (seg: CalendarTaskSegment) => {
  if (isTaskDone(seg.task)) {
    return {};
  }
  const statusColor = getStatusColor(seg.task.status);
  if (seg.isStartOfTask) {
    return {
      borderLeftWidth: '3px',
      borderLeftColor: statusColor,
    };
  }
  return {};
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
