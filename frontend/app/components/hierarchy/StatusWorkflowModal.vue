<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
        @click="handleClose"
      />

      <!-- Modal panel -->
      <div
        class="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 z-10 my-8 max-h-[90vh] flex flex-col"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div class="flex items-center gap-3">
            <span class="text-xl">⚙️</span>
            <div>
              <h2 class="text-lg font-bold text-white flex items-center gap-2">
                <span>Status Workflow</span>
                <span v-if="targetName" class="text-indigo-400 font-semibold">— {{ targetName }}</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">
                Customize statuses, categories, colors, and defaults for this {{ targetType }}.
              </p>
            </div>
          </div>

          <button
            type="button"
            class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            @click="handleClose"
          >
            ✕
          </button>
        </div>

        <!-- Inheritance Banner (For Lists) -->
        <div
          v-if="targetType === 'list'"
          class="mt-4 px-4 py-3 rounded-xl border text-xs flex items-center justify-between gap-3 shrink-0"
          :class="
            isInherited
              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          "
        >
          <div class="flex items-center gap-2">
            <span class="text-base">{{ isInherited ? '🔗' : '✏️' }}</span>
            <span v-if="isInherited">
              This list currently <strong>inherits statuses from its Space</strong>. Any custom changes saved here will create a list-specific override.
            </span>
            <span v-else>
              This list has <strong>custom statuses</strong> that override its Space.
            </span>
          </div>

          <button
            v-if="!isInherited"
            type="button"
            class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium border border-slate-700 hover:border-slate-600 transition cursor-pointer shrink-0"
            @click="isConfirmResetOpen = true"
          >
            Reset to Space Workflow
          </button>
        </div>

        <!-- Error Banner -->
        <div
          v-if="errorMessage"
          class="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs shrink-0 flex items-center justify-between"
        >
          <span>{{ errorMessage }}</span>
          <button
            type="button"
            class="text-slate-400 hover:text-white text-xs underline cursor-pointer ml-3"
            @click="errorMessage = ''"
          >
            Dismiss
          </button>
        </div>

        <!-- Loading Skeleton -->
        <div v-if="loading" class="flex-1 py-12 flex flex-col items-center justify-center gap-3">
          <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span class="text-xs text-slate-400 animate-pulse">Loading status workflow...</span>
        </div>

        <!-- Categories & Status Lists (Scrollable Area) -->
        <div v-else class="flex-1 overflow-y-auto pr-1 my-4 space-y-4">
          <!-- Category Group Block -->
          <div
            v-for="cat in categoryDefinitions"
            :key="cat.key"
            class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 transition-all"
            :class="cat.borderColorClass"
          >
            <!-- Category Title Row -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: cat.badgeColor }" />
                <h3 class="text-xs font-bold text-slate-200 tracking-wider uppercase">
                  {{ cat.title }}
                </h3>
                <span class="text-[11px] text-slate-500">
                  ({{ getStatusesForCategory(cat.key).length }})
                </span>
                <span class="text-[11px] text-slate-500 hidden sm:inline">— {{ cat.description }}</span>
              </div>

              <!-- Add status button for this category -->
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer flex items-center gap-1"
                @click="openAddStatusInput(cat.key)"
              >
                <span>+</span>
                <span>Add Status</span>
              </button>
            </div>

            <!-- Inline Add Status Form -->
            <div
              v-if="addingCategory === cat.key"
              class="mb-3 p-3 bg-slate-900 border border-indigo-500/40 rounded-xl flex flex-wrap items-center gap-3 animate-fade-in"
            >
              <div class="flex items-center gap-2 flex-1 min-w-[200px]">
                <!-- Color Picker Trigger -->
                <div class="relative">
                  <button
                    type="button"
                    class="w-6 h-6 rounded-full border-2 border-white shadow-xs transition hover:scale-110 cursor-pointer"
                    :style="{ backgroundColor: newStatusColor }"
                    title="Change color"
                    @click="isColorPickerOpenForNew = !isColorPickerOpenForNew"
                  />
                  <!-- Color Swatches Palette Dropdown -->
                  <div
                    v-if="isColorPickerOpenForNew"
                    class="absolute top-8 left-0 z-50 p-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl flex flex-wrap gap-1.5 w-44"
                  >
                    <button
                      v-for="color in presetColors"
                      :key="color"
                      type="button"
                      class="w-5 h-5 rounded-full border border-slate-600 transition hover:scale-125 cursor-pointer"
                      :style="{ backgroundColor: color }"
                      @click="selectNewStatusColor(color)"
                    />
                  </div>
                </div>

                <input
                  v-model="newStatusName"
                  type="text"
                  placeholder="e.g. Code Review, Testing, Ready"
                  maxlength="40"
                  class="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  @keydown.enter.prevent="saveNewStatus(cat.key)"
                  @keydown.esc.prevent="cancelAddStatus"
                >
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  :disabled="!newStatusName.trim()"
                  class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-40"
                  @click="saveNewStatus(cat.key)"
                >
                  Add
                </button>
                <button
                  type="button"
                  class="px-2.5 py-1.5 text-slate-400 hover:text-white rounded-lg text-xs transition cursor-pointer"
                  @click="cancelAddStatus"
                >
                  Cancel
                </button>
              </div>
            </div>

            <!-- Status Items List -->
            <div
              v-if="getStatusesForCategory(cat.key).length === 0"
              class="p-3 border border-dashed border-slate-800 rounded-lg text-center text-xs text-slate-500 italic"
            >
              No statuses in {{ cat.title }} yet.
            </div>

            <div v-else class="space-y-1.5">
              <div
                v-for="(status, index) in getStatusesForCategory(cat.key)"
                :key="status.id"
                class="flex items-center justify-between p-2.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl transition group"
              >
                <!-- Left: Color badge + Name + Defaults -->
                <div class="flex items-center gap-2.5 flex-1 min-w-0">
                  <!-- Color Swatch & Palette -->
                  <div class="relative">
                    <button
                      type="button"
                      class="w-5 h-5 rounded-full border border-slate-600 shrink-0 transition hover:scale-110 cursor-pointer"
                      :style="{ backgroundColor: status.color || cat.badgeColor }"
                      title="Change color"
                      @click="toggleColorPickerForStatus(status.id)"
                    />
                    <div
                      v-if="activeColorPickerStatusId === status.id"
                      class="absolute top-7 left-0 z-50 p-2 bg-slate-850 border border-slate-700 rounded-xl shadow-xl flex flex-wrap gap-1.5 w-44 bg-slate-900"
                    >
                      <button
                        v-for="color in presetColors"
                        :key="color"
                        type="button"
                        class="w-5 h-5 rounded-full border border-slate-600 transition hover:scale-125 cursor-pointer"
                        :style="{ backgroundColor: color }"
                        @click="changeStatusColor(status.id, color)"
                      />
                    </div>
                  </div>

                  <!-- Name or Inline Edit -->
                  <div v-if="editingStatusId === status.id" class="flex items-center gap-1.5 flex-1">
                    <input
                      v-model="editingStatusName"
                      type="text"
                      maxlength="40"
                      class="px-2 py-1 bg-slate-800 border border-indigo-500 rounded-lg text-xs text-white focus:outline-none"
                      @keydown.enter.prevent="saveStatusRename(status.id)"
                      @keydown.esc.prevent="cancelStatusRename"
                    >
                    <button
                      type="button"
                      class="text-xs text-emerald-400 hover:text-emerald-300 font-bold px-1"
                      @click="saveStatusRename(status.id)"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      class="text-xs text-slate-400 hover:text-white px-1"
                      @click="cancelStatusRename"
                    >
                      ✕
                    </button>
                  </div>

                  <span
                    v-else
                    class="text-xs font-semibold text-slate-100 truncate cursor-pointer hover:text-indigo-300 transition"
                    title="Click to rename"
                    @click="startStatusRename(status)"
                  >
                    {{ status.name }}
                  </span>

                  <!-- Default Status Pills / Toggles -->
                  <div class="flex items-center gap-1.5 shrink-0 ml-2">
                    <!-- Default for New Tasks (To Do only) -->
                    <button
                      v-if="cat.key === 'to_do'"
                      type="button"
                      class="px-2 py-0.5 rounded-full text-[10px] font-semibold border transition cursor-pointer"
                      :class="
                        defaultTodoStatusId === status.id
                          ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 shadow-xs'
                          : 'bg-slate-800/40 text-slate-500 border-transparent hover:text-slate-300'
                      "
                      :title="defaultTodoStatusId === status.id ? 'Default status for newly created tasks' : 'Click to make default for new tasks'"
                      @click="defaultTodoStatusId = status.id"
                    >
                      {{ defaultTodoStatusId === status.id ? '★ Default (New)' : 'Make Default' }}
                    </button>

                    <!-- Default for Done/Completed (Done or Closed only) -->
                    <button
                      v-if="cat.key === 'done' || cat.key === 'closed'"
                      type="button"
                      class="px-2 py-0.5 rounded-full text-[10px] font-semibold border transition cursor-pointer"
                      :class="
                        defaultDoneStatusId === status.id
                          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 shadow-xs'
                          : 'bg-slate-800/40 text-slate-500 border-transparent hover:text-slate-300'
                      "
                      :title="defaultDoneStatusId === status.id ? 'Default status when marking a task as done' : 'Click to make default for completed tasks'"
                      @click="defaultDoneStatusId = status.id"
                    >
                      {{ defaultDoneStatusId === status.id ? '★ Default (Done)' : 'Make Default' }}
                    </button>
                  </div>
                </div>

                <!-- Right: Reordering arrows + Category move + Delete -->
                <div class="flex items-center gap-1.5 shrink-0 ml-3">
                  <!-- Move Up -->
                  <button
                    type="button"
                    :disabled="index === 0"
                    class="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer disabled:opacity-20 text-[10px]"
                    title="Move up"
                    @click="moveStatus(status.id, 'up')"
                  >
                    ▲
                  </button>

                  <!-- Move Down -->
                  <button
                    type="button"
                    :disabled="index === getStatusesForCategory(cat.key).length - 1"
                    class="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer disabled:opacity-20 text-[10px]"
                    title="Move down"
                    @click="moveStatus(status.id, 'down')"
                  >
                    ▼
                  </button>

                  <!-- Category Switcher Dropdown -->
                  <select
                    :value="status.category"
                    class="bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-slate-300 px-2 py-0.5 focus:outline-none cursor-pointer"
                    title="Change category"
                    @change="changeStatusCategory(status.id, ($event.target as HTMLSelectElement).value as StatusCategory)"
                  >
                    <option value="to_do">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="closed">Closed</option>
                  </select>

                  <!-- Delete Status Button -->
                  <button
                    type="button"
                    class="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-500/10 transition cursor-pointer text-xs ml-1"
                    title="Delete status"
                    @click="promptDeleteStatus(status)"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Task Migration Prompt (Shown when a status with tasks is deleted or required by backend) -->
        <div
          v-if="migrationPendingStatus"
          class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl my-2 shrink-0 animate-fade-in"
        >
          <div class="flex items-center gap-2 text-amber-300 font-semibold text-xs mb-1">
            <span>⚠️</span>
            <span>Task Migration Required for "{{ migrationPendingStatus.name }}"</span>
          </div>
          <p class="text-xs text-slate-300 mb-3">
            Tasks currently in <strong>{{ migrationPendingStatus.name }}</strong> must be safely reassigned before saving this workflow.
          </p>
          <div class="flex items-center gap-3">
            <label class="text-xs text-slate-400">Reassign tasks to:</label>
            <select
              v-model="migrationTargetStatusId"
              class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option
                v-for="st in availableMigrationTargets"
                :key="st.id"
                :value="st.id"
              >
                {{ st.name }} ({{ st.category }})
              </option>
            </select>
            <button
              type="button"
              class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
              @click="confirmMigrationAssignment"
            >
              Confirm Migration
            </button>
          </div>
        </div>

        <!-- Modal Footer Actions -->
        <div class="pt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div class="text-xs text-slate-500">
            Total {{ localStatuses.length }} status(es) across 4 categories
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              :disabled="saving"
              class="px-4 py-2 text-sm font-medium rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              @click="handleClose"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="saving || localStatuses.length === 0"
              class="px-5 py-2 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              @click="handleSaveWorkflow"
            >
              <span v-if="saving" class="animate-spin text-xs">⏳</span>
              <span>{{ saving ? 'Saving...' : 'Save Workflow' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Reset Dialog -->
    <ConfirmDialog
      :is-open="isConfirmResetOpen"
      title="Reset to Space Workflow"
      message="Are you sure you want to reset this list's statuses to inherit from the parent Space? Any list-specific status customizations will be lost."
      confirm-text="Reset Workflow"
      :is-destructive="true"
      @confirm="handleResetToSpace"
      @cancel="isConfirmResetOpen = false"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useHierarchyStore } from '../../stores/hierarchy';
import { useToast } from '../../composables/useToast';
import { extractApiErrorMessage } from '../../utils/error';
import type {
  CustomStatusItem,
  StatusCategory,
  StatusWorkflow,
  StatusMigration,
} from '../../types/hierarchy';
import ConfirmDialog from '../ui/ConfirmDialog.vue';

interface Props {
  isOpen: boolean;
  targetType: 'space' | 'list';
  targetId: string;
  targetName?: string;
}

interface Emits {
  (e: 'close'): void;
  (e: 'saved', workflow: StatusWorkflow): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const hierarchyStore = useHierarchyStore();
const { showToast } = useToast();

const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const isInherited = ref(false);
const isConfirmResetOpen = ref(false);

const localStatuses = ref<CustomStatusItem[]>([]);
const defaultTodoStatusId = ref('todo');
const defaultDoneStatusId = ref('done');

// Addition state
const addingCategory = ref<StatusCategory | null>(null);
const newStatusName = ref('');
const newStatusColor = ref('#3b82f6');
const isColorPickerOpenForNew = ref(false);

// Inline edit state
const editingStatusId = ref<string | null>(null);
const editingStatusName = ref('');
const activeColorPickerStatusId = ref<string | null>(null);

// Migration state
const migrationPendingStatus = ref<CustomStatusItem | null>(null);
const migrationTargetStatusId = ref<string>('');
const configuredMigrations = ref<StatusMigration[]>([]);

const presetColors = [
  '#94a3b8', // slate
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#14b8a6', // teal
  '#ef4444', // red
  '#64748b', // dark slate
];

const categoryDefinitions = [
  {
    key: 'to_do' as StatusCategory,
    title: 'To Do',
    description: 'Work that has not started yet',
    badgeColor: '#94a3b8',
    borderColorClass: 'border-slate-800 focus-within:border-slate-700',
  },
  {
    key: 'in_progress' as StatusCategory,
    title: 'In Progress',
    description: 'Work actively being performed',
    badgeColor: '#3b82f6',
    borderColorClass: 'border-blue-900/40 focus-within:border-blue-700/60',
  },
  {
    key: 'done' as StatusCategory,
    title: 'Done',
    description: 'Work completed successfully',
    badgeColor: '#10b981',
    borderColorClass: 'border-emerald-900/40 focus-within:border-emerald-700/60',
  },
  {
    key: 'closed' as StatusCategory,
    title: 'Closed',
    description: 'Cancelled, abandoned, or archived',
    badgeColor: '#64748b',
    borderColorClass: 'border-slate-800/80 focus-within:border-slate-700',
  },
];

function getStatusesForCategory(category: StatusCategory): CustomStatusItem[] {
  return localStatuses.value
    .filter((s) => s.category === category)
    .sort((a, b) => a.order - b.order);
}

const availableMigrationTargets = computed(() => {
  if (!migrationPendingStatus.value) return localStatuses.value;
  return localStatuses.value.filter((s) => s.id !== migrationPendingStatus.value?.id);
});

watch(
  () => [props.isOpen, props.targetId],
  async ([open, id]) => {
    if (open && id) {
      await loadWorkflow();
    }
  },
  { immediate: true },
);

async function loadWorkflow() {
  if (!props.targetId) return;
  loading.value = true;
  errorMessage.value = '';
  configuredMigrations.value = [];
  migrationPendingStatus.value = null;

  try {
    if (props.targetType === 'space') {
      const wf = await hierarchyStore.fetchSpaceStatusWorkflow(props.targetId);
      isInherited.value = false;
      applyWorkflowToLocal(wf);
    } else {
      const res = await hierarchyStore.fetchListStatusWorkflow(props.targetId);
      isInherited.value = res.isInherited;
      applyWorkflowToLocal(res.workflow);
    }
  } catch (err: unknown) {
    errorMessage.value = extractApiErrorMessage(err, 'Failed to load status workflow');
  } finally {
    loading.value = false;
  }
}

function applyWorkflowToLocal(workflow: StatusWorkflow) {
  localStatuses.value = (workflow.statuses || []).map((s, idx) => ({
    ...s,
    order: s.order !== undefined ? s.order : idx,
  }));
  defaultTodoStatusId.value = workflow.defaultTodoStatusId || 'todo';
  defaultDoneStatusId.value = workflow.defaultDoneStatusId || 'done';
}

function openAddStatusInput(category: StatusCategory) {
  addingCategory.value = category;
  newStatusName.value = '';
  const def = categoryDefinitions.find((c) => c.key === category);
  newStatusColor.value = def ? def.badgeColor : '#3b82f6';
  isColorPickerOpenForNew.value = false;
}

function cancelAddStatus() {
  addingCategory.value = null;
  newStatusName.value = '';
  isColorPickerOpenForNew.value = false;
}

function selectNewStatusColor(color: string) {
  newStatusColor.value = color;
  isColorPickerOpenForNew.value = false;
}

function saveNewStatus(category: StatusCategory) {
  const name = newStatusName.value.trim();
  if (!name) return;

  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30) || `status_${Date.now()}`;
  const existingWithId = localStatuses.value.find((s) => s.id === id);
  const finalId = existingWithId ? `${id}_${Date.now().toString().slice(-4)}` : id;

  const maxOrder = localStatuses.value.reduce((acc, s) => Math.max(acc, s.order || 0), -1);

  const newStatus: CustomStatusItem = {
    id: finalId,
    name,
    color: newStatusColor.value,
    category,
    order: maxOrder + 1,
  };

  localStatuses.value.push(newStatus);
  cancelAddStatus();
}

function startStatusRename(status: CustomStatusItem) {
  editingStatusId.value = status.id;
  editingStatusName.value = status.name;
}

function cancelStatusRename() {
  editingStatusId.value = null;
  editingStatusName.value = '';
}

function saveStatusRename(statusId: string) {
  const name = editingStatusName.value.trim();
  if (!name) return;
  const target = localStatuses.value.find((s) => s.id === statusId);
  if (target) {
    target.name = name;
  }
  cancelStatusRename();
}

function toggleColorPickerForStatus(statusId: string) {
  if (activeColorPickerStatusId.value === statusId) {
    activeColorPickerStatusId.value = null;
  } else {
    activeColorPickerStatusId.value = statusId;
  }
}

function changeStatusColor(statusId: string, color: string) {
  const target = localStatuses.value.find((s) => s.id === statusId);
  if (target) {
    target.color = color;
  }
  activeColorPickerStatusId.value = null;
}

function changeStatusCategory(statusId: string, newCategory: StatusCategory) {
  const target = localStatuses.value.find((s) => s.id === statusId);
  if (!target) return;

  target.category = newCategory;

  // Adjust defaults if necessary
  if (defaultTodoStatusId.value === statusId && newCategory !== 'to_do') {
    const firstOtherTodo = localStatuses.value.find((s) => s.id !== statusId && s.category === 'to_do');
    if (firstOtherTodo) {
      defaultTodoStatusId.value = firstOtherTodo.id;
    }
  }

  if (defaultDoneStatusId.value === statusId && newCategory !== 'done' && newCategory !== 'closed') {
    const firstOtherDone = localStatuses.value.find((s) => s.id !== statusId && (s.category === 'done' || s.category === 'closed'));
    if (firstOtherDone) {
      defaultDoneStatusId.value = firstOtherDone.id;
    }
  }
}

function moveStatus(statusId: string, direction: 'up' | 'down') {
  const target = localStatuses.value.find((s) => s.id === statusId);
  if (!target) return;

  const categoryStatuses = getStatusesForCategory(target.category);
  const currentIndex = categoryStatuses.findIndex((s) => s.id === statusId);
  if (currentIndex === -1) return;

  const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (swapIndex < 0 || swapIndex >= categoryStatuses.length) return;

  const other = categoryStatuses[swapIndex];
  const tempOrder = target.order;
  target.order = other.order;
  other.order = tempOrder;
}

function promptDeleteStatus(status: CustomStatusItem) {
  // Validate category minimums
  const todoStatuses = localStatuses.value.filter((s) => s.category === 'to_do');
  if (status.category === 'to_do' && todoStatuses.length <= 1) {
    errorMessage.value = 'A workflow must have at least one status in the "To Do" category.';
    return;
  }

  const doneClosedStatuses = localStatuses.value.filter((s) => s.category === 'done' || s.category === 'closed');
  if ((status.category === 'done' || status.category === 'closed') && doneClosedStatuses.length <= 1) {
    errorMessage.value = 'A workflow must have at least one status in the "Done" or "Closed" category.';
    return;
  }

  // Check if target might need migration
  migrationPendingStatus.value = status;
  const remaining = localStatuses.value.filter((s) => s.id !== status.id);
  migrationTargetStatusId.value = remaining[0]?.id || 'todo';
}

function confirmMigrationAssignment() {
  if (!migrationPendingStatus.value || !migrationTargetStatusId.value) return;

  configuredMigrations.value.push({
    fromStatusId: migrationPendingStatus.value.id,
    toStatusId: migrationTargetStatusId.value,
  });

  // Remove the status from local state
  localStatuses.value = localStatuses.value.filter((s) => s.id !== migrationPendingStatus.value!.id);

  // If deleted status was default, assign new default
  if (defaultTodoStatusId.value === migrationPendingStatus.value.id) {
    const firstTodo = localStatuses.value.find((s) => s.category === 'to_do');
    defaultTodoStatusId.value = firstTodo ? firstTodo.id : localStatuses.value[0]?.id || 'todo';
  }

  if (defaultDoneStatusId.value === migrationPendingStatus.value.id) {
    const firstDone = localStatuses.value.find((s) => s.category === 'done' || s.category === 'closed');
    defaultDoneStatusId.value = firstDone ? firstDone.id : localStatuses.value[localStatuses.value.length - 1]?.id || 'done';
  }

  migrationPendingStatus.value = null;
}

async function handleSaveWorkflow() {
  errorMessage.value = '';

  const hasTodo = localStatuses.value.some((s) => s.category === 'to_do');
  if (!hasTodo) {
    errorMessage.value = 'Status workflow must have at least one status in the "To Do" category.';
    return;
  }

  const hasDoneOrClosed = localStatuses.value.some((s) => s.category === 'done' || s.category === 'closed');
  if (!hasDoneOrClosed) {
    errorMessage.value = 'Status workflow must have at least one status in the "Done" or "Closed" category.';
    return;
  }

  saving.value = true;

  try {
    const payload = {
      statuses: localStatuses.value.map((s, idx) => ({
        id: s.id,
        name: s.name.trim(),
        color: s.color,
        category: s.category,
        order: idx,
      })),
      defaultTodoStatusId: defaultTodoStatusId.value,
      defaultDoneStatusId: defaultDoneStatusId.value,
      migrations: configuredMigrations.value.length > 0 ? configuredMigrations.value : undefined,
    };

    let result: StatusWorkflow;
    if (props.targetType === 'space') {
      result = await hierarchyStore.updateSpaceStatusWorkflow(props.targetId, payload);
    } else {
      result = await hierarchyStore.updateListStatusWorkflow(props.targetId, payload);
      isInherited.value = false;
    }

    showToast('Status workflow updated successfully', 'success');
    emit('saved', result);
    handleClose();
  } catch (err: unknown) {
    const msg = extractApiErrorMessage(err, 'Failed to save status workflow');
    errorMessage.value = msg;

    // If backend reports migration needed for a specific status, prompt user
    const match = msg.match(/Status '([^']+)' cannot be deleted because it is assigned/);
    if (match && match[1]) {
      const problematicStatusName = match[1];
      const foundInOriginal = localStatuses.value.find((s) => s.name === problematicStatusName);
      if (foundInOriginal) {
        promptDeleteStatus(foundInOriginal);
      }
    }
  } finally {
    saving.value = false;
  }
}

async function handleResetToSpace() {
  isConfirmResetOpen.value = false;
  saving.value = true;
  errorMessage.value = '';

  try {
    const res = await hierarchyStore.resetListStatusWorkflow(props.targetId);
    isInherited.value = true;
    applyWorkflowToLocal(res.workflow);
    showToast('Reset to Space status workflow', 'success');
    emit('saved', res.workflow);
  } catch (err: unknown) {
    errorMessage.value = extractApiErrorMessage(err, 'Failed to reset workflow');
  } finally {
    saving.value = false;
  }
}

function handleClose() {
  errorMessage.value = '';
  editingStatusId.value = null;
  addingCategory.value = null;
  activeColorPickerStatusId.value = null;
  emit('close');
}
</script>
