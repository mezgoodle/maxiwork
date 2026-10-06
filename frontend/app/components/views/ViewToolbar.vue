<template>
  <div class="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-2.5 sm:p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
    <!-- Left Section: View Tabs + Search Input -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 min-w-0">
      <!-- View Switcher Tabs -->
      <div class="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-xl p-1 text-xs font-semibold text-slate-300 shrink-0">
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
          :class="viewStore.activeView === 'list' ? 'bg-indigo-600 text-white shadow-xs' : 'hover:text-white'"
          title="Switch to List View"
          @click="viewStore.setActiveView('list')"
        >
          <span>📋</span>
          <span>List</span>
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
          :class="viewStore.activeView === 'board' ? 'bg-indigo-600 text-white shadow-xs' : 'hover:text-white'"
          title="Switch to Kanban Board View"
          @click="viewStore.setActiveView('board')"
        >
          <span>📊</span>
          <span>Board</span>
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
          :class="viewStore.activeView === 'calendar' ? 'bg-indigo-600 text-white shadow-xs' : 'hover:text-white'"
          title="Switch to Calendar View"
          @click="viewStore.setActiveView('calendar')"
        >
          <span>📅</span>
          <span>Calendar</span>
        </button>
      </div>

      <!-- Search Input with 300ms Debounce -->
      <div class="relative flex-1 min-w-[200px] max-w-md">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
          🔍
        </span>
        <input
          v-model="searchInput"
          type="text"
          placeholder="Search tasks by title or key..."
          class="w-full pl-8 pr-8 py-1.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
        >
        <button
          v-if="searchInput"
          type="button"
          class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white cursor-pointer text-xs"
          title="Clear search"
          @click="clearSearch"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Right Section: Filters, Sort, Group By, Clear -->
    <div class="flex items-center flex-wrap gap-2 shrink-0">
      <!-- Filter Popover -->
      <div ref="filterContainerRef" class="relative">
        <button
          type="button"
          class="px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5"
          :class="
            isFilterOpen || viewStore.hasActiveFilters
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-xs'
              : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:text-white hover:bg-slate-750'
          "
          @click="isFilterOpen = !isFilterOpen"
        >
          <span>⚙️</span>
          <span>Filter</span>
          <span
            v-if="viewStore.activeFiltersCount > 0"
            class="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500 text-white font-mono font-bold"
          >
            {{ viewStore.activeFiltersCount }}
          </span>
          <span class="text-[10px] text-slate-400 ml-0.5 transition-transform" :class="{ 'rotate-180': isFilterOpen }">
            ▼
          </span>
        </button>

        <!-- Filter Dropdown Panel -->
        <div
          v-if="isFilterOpen"
          class="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 backdrop-blur-md space-y-4"
        >
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-white uppercase tracking-wider">Filter Tasks</span>
            <button
              v-if="viewStore.hasActiveFilters"
              type="button"
              class="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
              @click="viewStore.resetFilters"
            >
              Reset all
            </button>
          </div>

          <!-- Status Filter -->
          <div>
            <div class="text-[11px] font-semibold text-slate-400 mb-1.5">Status</div>
            <div class="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
              <button
                v-for="st in availableStatuses"
                :key="st.id"
                type="button"
                class="px-2 py-1 rounded-lg text-left text-xs transition border flex items-center gap-1.5 cursor-pointer truncate"
                :class="
                  viewStore.filters.statuses.includes(st.id)
                    ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500/50 font-semibold'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                "
                @click="viewStore.toggleStatus(st.id)"
              >
                <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: st.color || '#64748B' }" />
                <span class="truncate">{{ st.name }}</span>
              </button>
            </div>
          </div>

          <!-- Priority Filter -->
          <div>
            <div class="text-[11px] font-semibold text-slate-400 mb-1.5">Priority</div>
            <div class="grid grid-cols-2 gap-1.5">
              <button
                v-for="p in priorityOptions"
                :key="p.value"
                type="button"
                class="px-2 py-1 rounded-lg text-xs transition border flex items-center gap-1.5 cursor-pointer truncate"
                :class="
                  viewStore.filters.priorities.includes(p.value)
                    ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500/50 font-semibold'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                "
                @click="viewStore.togglePriority(p.value)"
              >
                <span>{{ p.icon }}</span>
                <span>{{ p.label }}</span>
              </button>
            </div>
          </div>

          <!-- Due Date Filter -->
          <div>
            <div class="text-[11px] font-semibold text-slate-400 mb-1.5">Due Date</div>
            <select
              :value="viewStore.filters.dueDate"
              class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              @change="(e) => viewStore.setDueDateFilter((e.target as HTMLSelectElement).value as DueDateFilter)"
            >
              <option value="all">All Dates</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due Today</option>
              <option value="this_week">Due This Week</option>
              <option value="no_date">No Due Date</option>
            </select>
          </div>

          <!-- Assignee Filter -->
          <div>
            <div class="text-[11px] font-semibold text-slate-400 mb-1.5">Assignee</div>
            <select
              :value="viewStore.filters.assigneeId ?? ''"
              class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              @change="(e) => {
                const val = (e.target as HTMLSelectElement).value;
                viewStore.setAssignee(val === '' ? null : val);
              }"
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              <option v-for="user in availableUsers" :key="user._id" :value="user._id">
                {{ user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Sort Selector Dropdown -->
      <div ref="sortContainerRef" class="relative">
        <button
          type="button"
          class="px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 bg-slate-800/80 text-slate-300 border-slate-700/80 hover:text-white hover:bg-slate-750"
          :class="isSortOpen ? 'border-indigo-500/40 text-white' : ''"
          @click="isSortOpen = !isSortOpen"
        >
          <span>⇅</span>
          <span>Sort: {{ currentSortLabel }}</span>
          <span class="text-[10px] text-slate-400 ml-0.5 transition-transform" :class="{ 'rotate-180': isSortOpen }">
            ▼
          </span>
        </button>

        <div
          v-if="isSortOpen"
          class="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 backdrop-blur-md space-y-2.5"
        >
          <div class="text-xs font-bold text-white uppercase tracking-wider pb-1 border-b border-slate-800">
            Sort Tasks By
          </div>

          <div class="space-y-1">
            <button
              v-for="opt in sortOptions"
              :key="opt.field"
              type="button"
              class="w-full px-2.5 py-1.5 rounded-lg text-left text-xs transition flex items-center justify-between cursor-pointer"
              :class="
                viewStore.sort.field === opt.field
                  ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              "
              @click="selectSortField(opt.field)"
            >
              <span>{{ opt.label }}</span>
              <span v-if="viewStore.sort.field === opt.field" class="text-indigo-400">✓</span>
            </button>
          </div>

          <div class="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span class="text-[11px] text-slate-400 font-medium">Order:</span>
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer flex items-center gap-1"
              @click="viewStore.toggleSortDirection"
            >
              <span>{{ viewStore.sort.direction === 'asc' ? '↑ Ascending' : '↓ Descending' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Group By Selector -->
      <div class="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs text-slate-300">
        <span class="text-slate-400 text-[11px] font-medium hidden sm:inline">Group:</span>
        <select
          :value="viewStore.groupBy"
          class="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
          @change="(e) => viewStore.setGroupBy((e.target as HTMLSelectElement).value as GroupByOption)"
        >
          <option value="status" class="bg-slate-900 text-white">Status</option>
          <option value="priority" class="bg-slate-900 text-white">Priority</option>
          <option value="assignee" class="bg-slate-900 text-white">Assignee</option>
          <option value="none" class="bg-slate-900 text-white">None</option>
        </select>
      </div>

      <!-- Quick Reset Button (Visible if active filters) -->
      <button
        v-if="viewStore.hasActiveFilters"
        type="button"
        class="px-2 py-1 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
        title="Clear all active filters"
        @click="viewStore.resetFilters"
      >
        ✕ Clear
      </button>

      <!-- Extra Action Slot (e.g. Subtasks toggle or custom list buttons) -->
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useViewStore } from '../../stores/view';
import type { StatusWorkflow } from '../../types/hierarchy';
import type { TaskPriority, TaskStatus } from '../../types/task';
import type { DueDateFilter, GroupByOption, SortField } from '../../types/view';

interface UserOption {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatarUrl?: string;
}

interface StatusOption {
  id: TaskStatus;
  name: string;
  color?: string;
}

interface Props {
  workflow?: StatusWorkflow | null;
  users?: UserOption[];
}

const props = withDefaults(defineProps<Props>(), {
  workflow: null,
  users: () => [],
});

const viewStore = useViewStore();

const searchInput = ref(viewStore.filters.search);
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

watch(searchInput, (val) => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = setTimeout(() => {
    viewStore.setSearch(val);
  }, 300);
});

watch(
  () => viewStore.filters.search,
  (storeVal) => {
    if (storeVal !== searchInput.value) {
      searchInput.value = storeVal;
    }
  },
);

function clearSearch() {
  searchInput.value = '';
  viewStore.setSearch('');
}

// Filter Popover state
const isFilterOpen = ref(false);
const filterContainerRef = ref<HTMLElement | null>(null);

// Sort Popover state
const isSortOpen = ref(false);
const sortContainerRef = ref<HTMLElement | null>(null);

const availableStatuses = computed<StatusOption[]>(() => {
  if (props.workflow?.statuses?.length) {
    return props.workflow.statuses.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
    }));
  }
  return [
    { id: 'todo', name: 'To Do', color: '#94A3B8' },
    { id: 'in_progress', name: 'In Progress', color: '#38BDF8' },
    { id: 'in_review', name: 'In Review', color: '#A855F7' },
    { id: 'done', name: 'Done', color: '#22C55E' },
  ];
});

const priorityOptions: Array<{ value: TaskPriority; label: string; icon: string }> = [
  { value: 'critical', label: 'Critical', icon: '🔴' },
  { value: 'high', label: 'High', icon: '🟠' },
  { value: 'medium', label: 'Medium', icon: '🟡' },
  { value: 'low', label: 'Low', icon: '🔵' },
];

const availableUsers = computed(() => props.users || []);

const sortOptions: Array<{ field: SortField; label: string }> = [
  { field: 'createdAt', label: 'Created Date' },
  { field: 'dueDate', label: 'Due Date' },
  { field: 'priority', label: 'Priority' },
  { field: 'title', label: 'Title' },
];

const currentSortLabel = computed(() => {
  const opt = sortOptions.find((o) => o.field === viewStore.sort.field);
  const directionIcon = viewStore.sort.direction === 'asc' ? '↑' : '↓';
  return opt ? `${opt.label} ${directionIcon}` : 'Custom';
});

function selectSortField(field: SortField) {
  viewStore.setSort(field);
  isSortOpen.value = false;
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Node;
  if (filterContainerRef.value && !filterContainerRef.value.contains(target)) {
    isFilterOpen.value = false;
  }
  if (sortContainerRef.value && !sortContainerRef.value.contains(target)) {
    isSortOpen.value = false;
  }
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isFilterOpen.value = false;
    isSortOpen.value = false;
  }
}

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeydown);
  }
});

onBeforeUnmount(() => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  if (import.meta.client) {
    document.removeEventListener('click', handleDocumentClick);
    document.removeEventListener('keydown', handleDocumentKeydown);
  }
});
</script>
