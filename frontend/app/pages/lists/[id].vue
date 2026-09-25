<template>
  <div class="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
    <!-- Top Header Bar -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <span>{{ hierarchyStore.currentWorkspace?.name || 'Workspace' }}</span>
          <span>/</span>
          <span v-if="currentSpace" class="text-slate-300">
            {{ currentSpace.name }}
          </span>
          <span v-if="currentSpace">/</span>
          <span v-if="listDetails" class="text-indigo-400 font-medium">
            {{ listDetails.name }}
          </span>
        </div>

        <div v-if="listDetails" class="flex items-center gap-3">
          <span
            class="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
            :style="{ backgroundColor: listDetails.color || '#4F46E5' }"
          />
          <h1 class="text-2xl font-extrabold text-white">
            {{ listDetails.name }}
          </h1>
        </div>
        <div v-else-if="loading" class="h-8 w-48 bg-slate-800 rounded animate-pulse" />
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3">
        <!-- View Toggle -->
        <div class="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-xl p-1 text-xs font-medium text-slate-300">
          <button
            type="button"
            class="px-3 py-1 rounded-lg transition cursor-pointer"
            :class="activeView === 'board' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:text-white'"
            @click="activeView = 'board'"
          >
            Board
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded-lg transition cursor-pointer"
            :class="activeView === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:text-white'"
            @click="activeView = 'list'"
          >
            List
          </button>
        </div>

        <button
          type="button"
          class="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
          @click="openCreateTaskModal"
        >
          <span>+</span>
          <span>New Task</span>
        </button>
      </div>
    </div>

    <!-- Error Banner -->
    <div
      v-if="error"
      class="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between"
    >
      <span>{{ error }}</span>
      <button
        type="button"
        class="text-xs underline hover:text-white cursor-pointer"
        @click="loadList"
      >
        Retry
      </button>
    </div>

    <!-- Content Area: Board or List View -->
    <div v-if="loading" class="flex-1 flex items-center justify-center py-16">
      <div class="text-slate-400 text-sm animate-pulse">Loading list items...</div>
    </div>

    <div v-else class="flex-1 flex flex-col">
      <!-- Empty state when no tasks -->
      <div
        v-if="tasks.length === 0"
        class="flex-1 flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center"
      >
        <span class="text-4xl mb-3">📋</span>
        <h3 class="text-lg font-bold text-white mb-1">This list is empty</h3>
        <p class="text-sm text-slate-400 mb-6 max-w-sm">
          Get started by adding actionable tasks to this list.
        </p>
        <button
          type="button"
          class="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer shadow-lg shadow-indigo-600/20"
          @click="openCreateTaskModal"
        >
          + Add First Task
        </button>
      </div>

      <!-- Tasks Render -->
      <div v-else class="space-y-2">
        <div
          v-for="task in tasks"
          :key="task._id"
          class="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl hover:border-slate-600 transition flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <span class="text-xs font-mono font-bold text-indigo-400">{{ task.taskKey || 'TASK' }}</span>
            <span class="text-sm font-medium text-slate-100">{{ task.title }}</span>
            <span
              v-if="task.subtasksCount && task.subtasksCount > 0"
              class="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-900/60 border border-slate-700/60"
              :class="task.completedSubtasksCount === task.subtasksCount ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-400'"
              title="Subtasks"
            >
              ↳ {{ task.completedSubtasksCount || 0 }}/{{ task.subtasksCount }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 text-xs rounded-full bg-slate-700 text-slate-300 capitalize">
              {{ task.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useHierarchyStore } from '../../stores/hierarchy';
import { useApi } from '../../composables/useApi';
import type { List, Space } from '../../types/hierarchy';

definePageMeta({
  middleware: ['auth'],
});

const route = useRoute();
const listId = computed(() => String(route.params.id || ''));

const hierarchyStore = useHierarchyStore();
const activeView = ref<'board' | 'list'>('board');

const loading = ref(false);
const error = ref<string | null>(null);
const listDetails = ref<List | null>(null);
const tasks = ref<
  Array<{
    _id: string;
    title: string;
    taskKey?: string;
    status: string;
    subtasksCount?: number;
    completedSubtasksCount?: number;
  }>
>([]);

const currentSpace = computed<Space | null>(() => {
  if (!listDetails.value) return null;
  const sp = hierarchyStore.tree.find((s) => s.id === listDetails.value?.spaceId);
  if (!sp) return null;
  return {
    _id: sp.id,
    workspaceId: sp.workspaceId,
    name: sp.name,
    description: sp.description,
    icon: sp.icon,
    color: sp.color,
    isPrivate: sp.isPrivate,
    order: sp.order,
    features: { customStatuses: true, customFields: true, calendarView: true },
    createdAt: '',
    updatedAt: '',
  };
});

async function loadList() {
  if (!listId.value) return;

  loading.value = true;
  error.value = null;

  try {
    const { apiFetch } = useApi();
    const res = await apiFetch<List>(`/lists/${listId.value}`, { method: 'GET' });
    listDetails.value = res;

    // Fetch tasks if available
    try {
      const taskRes = await apiFetch<Array<{ _id: string; title: string; taskKey?: string; status: string }>>(
        `/tasks?list=${listId.value}`,
        { method: 'GET' },
      );
      tasks.value = Array.isArray(taskRes) ? taskRes : [];
    } catch {
      // Endpoint fallback
      tasks.value = [];
    }
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string }; message?: string };
    error.value = fetchErr?.data?.message || fetchErr?.message || 'Failed to load list details';
  } finally {
    loading.value = false;
  }
}

function openCreateTaskModal() {
  // Navigation or modal trigger
}

onMounted(() => {
  loadList();
});

watch(listId, () => {
  loadList();
});
</script>
