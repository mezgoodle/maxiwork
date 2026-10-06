<template>
  <div class="w-full space-y-6">
    <!-- Empty State when group list has 0 tasks -->
    <div
      v-if="tasks.length === 0"
      class="flex-1 flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-800 rounded-3xl p-8 text-center bg-slate-900/30"
    >
      <span class="text-4xl mb-3">📋</span>
      <h3 class="text-lg font-bold text-white mb-1">No tasks in this view</h3>
      <p class="text-xs text-slate-400 max-w-sm mb-4">
        Create a new task or adjust your active filters to display items.
      </p>
    </div>

    <!-- Group Sections -->
    <div
      v-for="group in groups"
      :key="group.id"
      class="space-y-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-xs"
    >
      <!-- Group Header Bar -->
      <div
        class="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-slate-800/40 transition cursor-pointer select-none group/header"
        @click="toggleGroup(group.id)"
      >
        <div class="flex items-center gap-2.5">
          <!-- Collapse/Expand Arrow -->
          <span
            class="text-xs text-slate-400 transition-transform duration-200"
            :class="isGroupCollapsed(group.id) ? '-rotate-90' : 'rotate-0'"
          >
            ▼
          </span>

          <!-- Group Accent Dot / Pill -->
          <span
            class="w-3 h-3 rounded-full shrink-0 shadow-xs"
            :style="{ backgroundColor: group.color || '#6366F1' }"
          />

          <!-- Group Name -->
          <h3 class="text-sm font-bold text-white tracking-wide">
            {{ group.name }}
          </h3>

          <!-- Task Count Badge -->
          <span
            class="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700/60"
          >
            {{ group.tasks.length }}
          </span>
        </div>

        <div class="flex items-center gap-2" @click.stop>
          <button
            type="button"
            class="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-750 transition cursor-pointer flex items-center gap-1 opacity-0 group-hover/header:opacity-100 focus:opacity-100"
            title="Add task to this group"
            @click="focusGroupInput(group.id)"
          >
            <span>+</span>
            <span class="hidden sm:inline">Add Task</span>
          </button>
        </div>
      </div>

      <!-- Group Content (when expanded) -->
      <div v-if="!isGroupCollapsed(group.id)" class="space-y-1.5 pt-1">
        <!-- Table Column Headers Bar (Desktop) -->
        <div
          v-if="group.tasks.length > 0"
          class="hidden lg:flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80"
        >
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <span class="w-5 shrink-0" />
            <span class="w-6 shrink-0" />
            <span class="w-14 shrink-0">Key</span>
            <span>Task Title</span>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <!-- Dynamic Custom Field Header Columns -->
            <div
              v-for="field in effectiveFields"
              :key="field._id"
              class="w-28 truncate text-left font-semibold text-slate-400"
              :title="field.name"
            >
              {{ field.name }}
            </div>
            <span class="w-24 text-center">Due Date</span>
            <span class="w-20 text-center">Priority</span>
            <span class="w-24 text-center">Assignee</span>
            <span class="w-28 text-center">Status</span>
            <span class="w-6 shrink-0" />
          </div>
        </div>

        <!-- Task Rows inside Group -->
        <div
          v-for="task in group.tasks"
          :key="task._id"
          class="space-y-1"
        >
          <!-- Parent Task Row -->
          <div
            class="p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-500/80 rounded-xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs group/row"
          >
            <!-- Left Section: Subtask Arrow + Done Checkbox + Key + Title (Inline Editable) -->
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <!-- Subtask toggle arrow -->
              <button
                v-if="task.subtasksCount && task.subtasksCount > 0"
                type="button"
                class="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/60 transition cursor-pointer shrink-0 text-xs"
                :title="isTaskExpanded(task._id) ? 'Collapse subtasks' : 'Expand subtasks'"
                @click.stop="$emit('toggle-expand', task._id)"
              >
                <span
                  class="transition-transform duration-200"
                  :class="isTaskExpanded(task._id) ? 'rotate-90' : ''"
                >
                  ▶
                </span>
              </button>
              <span v-else class="w-5 shrink-0" />

              <!-- Done Toggle Checkbox -->
              <button
                type="button"
                class="w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer shrink-0"
                :class="
                  isTaskDone(task)
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950 hover:bg-emerald-400'
                    : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-emerald-400'
                "
                :title="isTaskDone(task) ? 'Reopen task' : 'Mark task as Done'"
                @click.stop="$emit('toggle-done', task)"
              >
                <span class="text-[10px] font-bold leading-none">✓</span>
              </button>

              <!-- Task Key Badge (Clicking opens TaskDetailDrawer) -->
              <button
                type="button"
                class="font-mono text-xs font-bold text-slate-400 hover:text-indigo-400 px-1.5 py-0.5 rounded hover:bg-indigo-500/10 transition cursor-pointer shrink-0"
                :title="`Open details for ${task.taskKey}`"
                @click.stop="$emit('task-click', task)"
              >
                {{ task.taskKey }}
              </button>

              <!-- Inline Editable Title -->
              <div class="flex-1 min-w-0 mr-2">
                <input
                  v-if="editingTaskId === task._id"
                  ref="editTitleInputRef"
                  v-model="editingTitleText"
                  type="text"
                  class="w-full bg-slate-900 border border-indigo-500 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-medium"
                  @keydown.enter.prevent="saveInlineTitle(task)"
                  @keydown.esc.prevent="cancelInlineTitle"
                  @blur="saveInlineTitle(task)"
                >
                <div
                  v-else
                  class="flex items-center gap-2 group/title cursor-text py-0.5 px-1 rounded hover:bg-slate-700/40 transition"
                  title="Click to edit task title"
                  @click="startInlineTitleEdit(task)"
                >
                  <span
                    class="text-xs font-medium truncate"
                    :class="isTaskDone(task) ? 'line-through text-slate-500' : 'text-slate-100 group-hover/title:text-indigo-300'"
                  >
                    {{ task.title }}
                  </span>
                  <span class="text-[10px] text-slate-500 opacity-0 group-hover/title:opacity-100 transition shrink-0">
                    ✏️
                  </span>
                  <span
                    v-if="task.subtasksCount && task.subtasksCount > 0"
                    class="text-[10px] bg-slate-700/80 text-slate-300 px-1.5 py-0.2 rounded-full font-mono shrink-0 ml-1"
                  >
                    ↳ {{ task.completedSubtasksCount || 0 }}/{{ task.subtasksCount }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Right Section: Custom Fields, Due Date, Priority, Assignee, Status, Delete -->
            <div class="flex items-center gap-2.5 shrink-0 self-end sm:self-auto flex-wrap">
              <!-- Custom Fields -->
              <div
                v-for="field in effectiveFields"
                :key="field._id"
                class="w-28 shrink-0 hidden lg:block"
                @click.stop
              >
                <CustomFieldInput
                  :model-value="task.customFieldValues?.[field._id]"
                  :field="field"
                  compact
                  @change="(val) => $emit('custom-field-change', task, field._id, val)"
                />
              </div>

              <!-- Inline Due Date Picker -->
              <div class="relative w-24 shrink-0 flex items-center justify-center" @click.stop>
                <input
                  type="date"
                  :value="formatInputDate(task.dueDate)"
                  class="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                  title="Change due date"
                  @change="(e) => handleDateChange(task, (e.target as HTMLInputElement).value)"
                >
                <span
                  class="font-mono text-[11px] px-2 py-0.5 rounded-md border w-full text-center truncate pointer-events-none"
                  :class="getDateBadgeClass(task.dueDate, task.status)"
                >
                  {{ task.dueDate ? `📅 ${formatDisplayDate(task.dueDate)}` : '📅 No date' }}
                </span>
              </div>

              <!-- Inline Priority Dropdown -->
              <div class="relative w-20 shrink-0" @click.stop>
                <select
                  :value="task.priority || 'medium'"
                  class="w-full text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border cursor-pointer focus:outline-none appearance-none text-center"
                  :class="getPriorityClass(task.priority)"
                  @change="(e) => handlePriorityChange(task, (e.target as HTMLSelectElement).value as TaskPriority)"
                >
                  <option value="critical" class="bg-slate-900 text-rose-400">Critical</option>
                  <option value="high" class="bg-slate-900 text-orange-400">High</option>
                  <option value="medium" class="bg-slate-900 text-yellow-400">Medium</option>
                  <option value="low" class="bg-slate-900 text-blue-400">Low</option>
                </select>
              </div>

              <!-- Inline Assignee Dropdown -->
              <div class="relative w-24 shrink-0" @click.stop>
                <select
                  :value="getAssigneeId(task.assignee)"
                  class="w-full text-xs bg-slate-900/80 border border-slate-700/80 rounded-lg px-1.5 py-1 text-slate-200 cursor-pointer focus:outline-none truncate"
                  @change="(e) => handleAssigneeChange(task, (e.target as HTMLSelectElement).value)"
                >
                  <option value="" class="bg-slate-900 text-slate-400">Unassigned</option>
                  <option
                    v-for="user in availableUsers"
                    :key="user._id"
                    :value="user._id"
                    class="bg-slate-900 text-white"
                  >
                    {{ getUserLabel(user) }}
                  </option>
                </select>
              </div>

              <!-- Inline Status Dropdown -->
              <div class="relative w-28 shrink-0" @click.stop>
                <select
                  :value="task.status || 'todo'"
                  class="w-full text-xs font-semibold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none appearance-none text-center transition"
                  :style="getStatusBadgeStyle(task.status)"
                  @change="(e) => handleStatusChange(task, (e.target as HTMLSelectElement).value as TaskStatus)"
                >
                  <option
                    v-for="st in statusOptions"
                    :key="st.id"
                    :value="st.id"
                    class="bg-slate-900 text-white font-normal"
                  >
                    {{ st.name }}
                  </option>
                </select>
              </div>

              <!-- Delete Task Button -->
              <button
                type="button"
                class="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer opacity-0 group-hover/row:opacity-100 focus:opacity-100"
                title="Delete task"
                @click.stop="$emit('task-delete', task)"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Indented Subtasks Section under Parent Task -->
          <div
            v-if="isTaskExpanded(task._id) && subtasksMap[task._id]?.length"
            class="pl-7 sm:pl-10 space-y-1.5 pt-0.5 pb-1"
          >
            <div
              v-for="sub in subtasksMap[task._id]"
              :key="sub._id"
              class="p-2.5 bg-slate-900/70 hover:bg-slate-850 border border-slate-800/80 hover:border-slate-700 rounded-xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs group/sub"
            >
              <!-- Subtask Left Section -->
              <div class="flex items-center gap-2.5 min-w-0 flex-1">
                <!-- Subtask Done Checkbox -->
                <button
                  type="button"
                  class="w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer shrink-0"
                  :class="
                    isTaskDone(sub)
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 hover:bg-emerald-400'
                      : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-emerald-400'
                  "
                  :title="isTaskDone(sub) ? 'Reopen subtask' : 'Mark subtask as Done'"
                  @click.stop="$emit('toggle-done', sub)"
                >
                  <span class="text-[10px] font-bold leading-none">✓</span>
                </button>

                <span class="text-slate-500 font-mono text-xs font-semibold shrink-0">↳</span>

                <!-- Subtask Key -->
                <button
                  type="button"
                  class="text-[11px] font-mono font-bold text-slate-400 hover:text-indigo-400 px-1 py-0.5 rounded transition cursor-pointer shrink-0"
                  @click.stop="$emit('task-click', sub)"
                >
                  {{ sub.taskKey }}
                </button>

                <!-- Subtask Inline Editable Title -->
                <div class="flex-1 min-w-0 mr-2">
                  <input
                    v-if="editingTaskId === sub._id"
                    ref="editTitleInputRef"
                    v-model="editingTitleText"
                    type="text"
                    class="w-full bg-slate-900 border border-indigo-500 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-medium"
                    @keydown.enter.prevent="saveInlineTitle(sub)"
                    @keydown.esc.prevent="cancelInlineTitle"
                    @blur="saveInlineTitle(sub)"
                  >
                  <div
                    v-else
                    class="flex items-center gap-1.5 group/subtitle cursor-text py-0.5 px-1 rounded hover:bg-slate-800 transition"
                    title="Click to edit subtask title"
                    @click="startInlineTitleEdit(sub)"
                  >
                    <span
                      class="text-xs font-medium truncate"
                      :class="isTaskDone(sub) ? 'line-through text-slate-500' : 'text-slate-200 group-hover/subtitle:text-indigo-300'"
                    >
                      {{ sub.title }}
                    </span>
                    <span class="text-[10px] text-slate-500 opacity-0 group-hover/subtitle:opacity-100 transition shrink-0">
                      ✏️
                    </span>
                  </div>
                </div>
              </div>

              <!-- Subtask Right Section -->
              <div class="flex items-center gap-2.5 shrink-0 self-end sm:self-auto flex-wrap" @click.stop>
                <!-- Subtask Dynamic Custom Field Cells -->
                <div
                  v-for="field in effectiveFields"
                  :key="field._id"
                  class="w-28 shrink-0 hidden lg:block"
                  @click.stop
                >
                  <CustomFieldInput
                    :model-value="sub.customFieldValues?.[field._id]"
                    :field="field"
                    compact
                    @change="(val) => $emit('custom-field-change', sub, field._id, val)"
                  />
                </div>

                <!-- Subtask Due Date -->
                <div class="relative w-24 shrink-0 flex items-center justify-center" @click.stop>
                  <input
                    type="date"
                    :value="formatInputDate(sub.dueDate)"
                    class="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                    title="Change due date"
                    @change="(e) => handleDateChange(sub, (e.target as HTMLInputElement).value)"
                  >
                  <span
                    class="font-mono text-[11px] px-2 py-0.5 rounded-md border w-full text-center truncate pointer-events-none"
                    :class="getDateBadgeClass(sub.dueDate, sub.status)"
                  >
                    {{ sub.dueDate ? `📅 ${formatDisplayDate(sub.dueDate)}` : '📅 No date' }}
                  </span>
                </div>

                <!-- Subtask Priority -->
                <div class="relative w-20 shrink-0" @click.stop>
                  <select
                    :value="sub.priority || 'medium'"
                    class="w-full text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border cursor-pointer focus:outline-none appearance-none text-center"
                    :class="getPriorityClass(sub.priority)"
                    @change="(e) => handlePriorityChange(sub, (e.target as HTMLSelectElement).value as TaskPriority)"
                  >
                    <option value="critical" class="bg-slate-900 text-rose-400">Critical</option>
                    <option value="high" class="bg-slate-900 text-orange-400">High</option>
                    <option value="medium" class="bg-slate-900 text-yellow-400">Medium</option>
                    <option value="low" class="bg-slate-900 text-blue-400">Low</option>
                  </select>
                </div>

                <!-- Subtask Status -->
                <div class="relative w-28 shrink-0" @click.stop>
                  <select
                    :value="sub.status || 'todo'"
                    class="w-full text-xs font-semibold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none appearance-none text-center transition"
                    :style="getStatusBadgeStyle(sub.status)"
                    @change="(e) => handleStatusChange(sub, (e.target as HTMLSelectElement).value as TaskStatus)"
                  >
                    <option
                      v-for="st in statusOptions"
                      :key="st.id"
                      :value="st.id"
                      class="bg-slate-900 text-white font-normal"
                    >
                      {{ st.name }}
                    </option>
                  </select>
                </div>

                <!-- Subtask Delete -->
                <button
                  type="button"
                  class="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer opacity-0 group-hover/sub:opacity-100 focus:opacity-100"
                  title="Delete subtask"
                  @click.stop="$emit('task-delete', sub)"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Inline "+ Add Task" Row for Group -->
        <div class="pt-1">
          <form
            class="flex items-center gap-2 bg-slate-900/50 hover:bg-slate-900/80 border border-dashed border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 transition"
            @submit.prevent="submitGroupAdd(group)"
          >
            <span class="text-slate-500 font-bold text-xs">+</span>
            <input
              :ref="(el) => setGroupInputRef(group.id, el)"
              v-model="groupAddInputs[group.id]"
              type="text"
              :placeholder="`Add task to ${group.name}... (press Enter)`"
              class="flex-1 bg-transparent border-none text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
            >
            <button
              type="submit"
              :disabled="!groupAddInputs[group.id]?.trim()"
              class="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, nextTick } from 'vue';
import type { Task, TaskPriority, TaskStatus, CreateTaskPayload, UpdateTaskPayload } from '../../types/task';
import type { StatusWorkflow } from '../../types/hierarchy';
import type { EffectiveCustomField } from '../../types/custom-field';
import type { GroupByOption } from '../../types/view';
import { getPriorityBadgeClass } from '../../utils/task';
import {
  computeTableGroups,
  getStatusOptions,
  getStatusBadgeStyle as getStatusBadgeStyleHelper,
  type UserOption,
  type TableGroup,
} from '../../utils/table-view';
import CustomFieldInput from '../custom-fields/CustomFieldInput.vue';

interface Props {
  tasks: Task[];
  workflow?: StatusWorkflow | null;
  effectiveFields?: EffectiveCustomField[];
  groupBy?: GroupByOption;
  users?: UserOption[];
  showSubtasks?: boolean;
  expandedTaskIds?: Set<string>;
  subtasksMap?: Record<string, Task[]>;
  loadingSubtasksMap?: Record<string, boolean>;
}

const props = withDefaults(defineProps<Props>(), {
  workflow: null,
  effectiveFields: () => [],
  groupBy: 'status',
  users: () => [],
  showSubtasks: false,
  expandedTaskIds: () => new Set(),
  subtasksMap: () => ({}),
  loadingSubtasksMap: () => ({}),
});

const emit = defineEmits<{
  (e: 'task-click' | 'task-delete' | 'toggle-done', task: Task): void;
  (e: 'task-update', taskId: string, payload: UpdateTaskPayload): void;
  (e: 'task-create', payload: CreateTaskPayload): void;
  (e: 'toggle-expand', taskId: string): void;
  (e: 'custom-field-change', task: Task, fieldId: string, val: unknown): void;
}>();

// Group Collapse State
const collapsedGroups = ref<Set<string>>(new Set());

function isGroupCollapsed(groupId: string): boolean {
  return collapsedGroups.value.has(groupId);
}

function toggleGroup(groupId: string) {
  if (collapsedGroups.value.has(groupId)) {
    collapsedGroups.value.delete(groupId);
  } else {
    collapsedGroups.value.add(groupId);
  }
}

// Inline Title Editing State
const editingTaskId = ref<string | null>(null);
const editingTitleText = ref('');
const editTitleInputRef = ref<HTMLInputElement[] | null>(null);

function startInlineTitleEdit(task: Task) {
  editingTaskId.value = task._id;
  editingTitleText.value = task.title;
  nextTick(() => {
    if (editTitleInputRef.value && editTitleInputRef.value[0]) {
      editTitleInputRef.value[0].focus();
    }
  });
}

function cancelInlineTitle() {
  editingTaskId.value = null;
  editingTitleText.value = '';
}

function saveInlineTitle(task: Task) {
  if (editingTaskId.value !== task._id) return;
  const trimmed = editingTitleText.value.trim();
  if (trimmed && trimmed !== task.title) {
    emit('task-update', task._id, { title: trimmed });
  }
  editingTaskId.value = null;
}

// Inline Group Add Inputs & Refs
const groupAddInputs = reactive<Record<string, string>>({});
const groupInputRefs = new Map<string, HTMLInputElement>();

function setGroupInputRef(groupId: string, el: unknown) {
  if (el instanceof HTMLInputElement) {
    groupInputRefs.set(groupId, el);
  } else {
    groupInputRefs.delete(groupId);
  }
}

function focusGroupInput(groupId: string) {
  if (collapsedGroups.value.has(groupId)) {
    collapsedGroups.value.delete(groupId);
  }
  nextTick(() => {
    const input = groupInputRefs.get(groupId);
    if (input) {
      input.focus();
    }
  });
}

function submitGroupAdd(group: TableGroup) {
  const text = groupAddInputs[group.id]?.trim();
  if (!text) return;

  const payload: CreateTaskPayload = {
    title: text,
    ...group.prefillPayload,
  };

  emit('task-create', payload);
  groupAddInputs[group.id] = '';
}

// Handlers for cell selectors
function handleDateChange(task: Task, val: string) {
  const newDate = val ? new Date(val).toISOString() : null;
  emit('task-update', task._id, { dueDate: newDate });
}

function handlePriorityChange(task: Task, priority: TaskPriority) {
  emit('task-update', task._id, { priority });
}

function handleAssigneeChange(task: Task, assigneeId: string) {
  emit('task-update', task._id, { assignee: assigneeId ? assigneeId : null });
}

function handleStatusChange(task: Task, status: TaskStatus) {
  emit('task-update', task._id, { status });
}

// Status Options
const statusOptions = computed(() => getStatusOptions(props.workflow));

function getStatusBadgeStyle(status?: TaskStatus) {
  return getStatusBadgeStyleHelper(status, props.workflow);
}

// Groups Calculation
const groups = computed<TableGroup[]>(() => {
  return computeTableGroups(props.tasks, props.groupBy, props.workflow, props.users);
});

// Utilities
function isTaskExpanded(taskId: string): boolean {
  return props.expandedTaskIds.has(taskId);
}

function isTaskDone(task: Task): boolean {
  if (task.completed) return true;
  if (task.status === 'done') return true;
  if (!props.workflow?.statuses) return false;
  const st = props.workflow.statuses.find((s) => s.id === task.status);
  return st ? st.category === 'done' || st.category === 'closed' : false;
}

function getPriorityClass(priority?: TaskPriority): string {
  return getPriorityBadgeClass(priority);
}

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatInputDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function getDateBadgeClass(dueDate?: string, status?: TaskStatus): string {
  if (!dueDate) return 'text-slate-500 border-slate-700/60 bg-slate-900/60';
  if (isTaskDone({ status } as Task)) return 'text-slate-400 border-slate-700/60 bg-slate-900/60';
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  if (due < now) {
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10 font-semibold';
  }
  return 'text-slate-300 border-slate-700/60 bg-slate-900/60';
}
</script>
