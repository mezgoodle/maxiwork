<template>
  <div class="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
    <!-- Top Bar: Navigation & Project Header -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <NuxtLink to="/projects" class="hover:text-white transition">
            &larr; Projects
          </NuxtLink>
          <span>/</span>
          <span v-if="project" class="text-slate-300 font-medium">
            {{ project.name }}
          </span>
        </div>

        <div v-if="project" class="flex items-center gap-3">
          <span
            class="px-2.5 py-1 text-xs font-bold tracking-wider rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono uppercase"
          >
            {{ project.prefix }}
          </span>
          <h1 class="text-2xl font-extrabold text-white">
            {{ project.name }}
          </h1>
        </div>
        <div v-else class="h-8 w-48 bg-slate-800 rounded animate-pulse" />
      </div>

      <div class="flex items-center gap-3">
        <NuxtLink
          v-if="project"
          :to="`/projects/${projectId}/settings`"
          class="px-3.5 py-2 rounded-xl text-sm font-medium bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
        >
          <span>⚙</span>
          <span>Settings</span>
        </NuxtLink>

        <button
          type="button"
          class="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
          @click="openCreateModal()"
        >
          <span>+</span>
          <span>New Task</span>
        </button>
      </div>
    </div>

    <!-- Filter Toolbar -->
    <div class="mb-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
      <!-- Search Input -->
      <div class="relative w-full sm:w-80">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-sm">
          🔍
        </span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search tasks..."
          class="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
        >
      </div>

      <!-- Priority Filter -->
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <label class="text-xs text-slate-400 whitespace-nowrap">Priority:</label>
          <select
            v-model="selectedPriority"
            class="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
          >
            <option value="">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <button
          v-if="searchQuery || selectedPriority"
          type="button"
          class="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer whitespace-nowrap"
          @click="clearFilters"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Kanban Board Section -->
    <div class="flex-1">
      <KanbanBoard
        :project-id="projectId"
        @create-task="(status) => openCreateModal(status)"
        @task-click="openEditModal"
      />
    </div>

    <!-- Task Create/Edit Modal -->
    <TaskFormModal
      :is-open="isModalOpen"
      :project-id="projectId"
      :task="modalTask"
      :default-status="modalDefaultStatus"
      @close="closeModal"
      @saved="handleTaskSaved"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { Task, TaskPriority, TaskStatus } from '../../../types/task';
import { useProjectsStore } from '../../../stores/projects';
import { useTasksStore } from '../../../stores/tasks';
import KanbanBoard from '../../../components/board/KanbanBoard.vue';
import TaskFormModal from '../../../components/task/TaskFormModal.vue';

definePageMeta({
  middleware: ['auth'],
});

const route = useRoute();
const projectId = computed(() => route.params.id as string);

const projectsStore = useProjectsStore();
const tasksStore = useTasksStore();

const project = computed(() => projectsStore.currentProject);

const searchQuery = ref('');
const selectedPriority = ref<TaskPriority | ''>('');

const isModalOpen = ref(false);
const modalTask = ref<Task | null>(null);
const modalDefaultStatus = ref<TaskStatus>('todo');

let searchDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

async function loadData() {
  if (projectId.value) {
    await Promise.allSettled([
      projectsStore.fetchProject(projectId.value),
      fetchTasksWithFilters(),
    ]);
  }
}

async function fetchTasksWithFilters() {
  const query: { search?: string; priority?: TaskPriority } = {};
  if (searchQuery.value.trim()) {
    query.search = searchQuery.value.trim();
  }
  if (selectedPriority.value) {
    query.priority = selectedPriority.value;
  }
  await tasksStore.fetchTasks(projectId.value, query);
}

watch(searchQuery, () => {
  if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    fetchTasksWithFilters();
  }, 300);
});

watch(selectedPriority, () => {
  fetchTasksWithFilters();
});

function clearFilters() {
  searchQuery.value = '';
  selectedPriority.value = '';
  fetchTasksWithFilters();
}

function openCreateModal(status?: TaskStatus) {
  modalTask.value = null;
  modalDefaultStatus.value = status || 'todo';
  isModalOpen.value = true;
}

function openEditModal(task: Task) {
  modalTask.value = task;
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  modalTask.value = null;
}

function handleTaskSaved() {
  fetchTasksWithFilters();
}

onMounted(() => {
  loadData();
});
</script>
