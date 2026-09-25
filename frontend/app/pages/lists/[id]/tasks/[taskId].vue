<template>
  <div class="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
    <!-- Breadcrumbs & Back link -->
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2 text-xs sm:text-sm text-slate-400">
        <NuxtLink
          :to="`/lists/${listId}`"
          class="hover:text-white transition flex items-center gap-1 font-medium"
        >
          &larr; Back to List
        </NuxtLink>
        <span>/</span>
        <span v-if="task" class="text-slate-200 font-mono font-semibold">
          {{ task.taskKey }}
        </span>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div
      v-if="loading && !task"
      class="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 animate-pulse space-y-6"
    >
      <div class="w-1/4 h-8 bg-slate-800 rounded" />
      <div class="w-3/4 h-12 bg-slate-800/60 rounded" />
      <div class="w-full h-32 bg-slate-800/40 rounded" />
    </div>

    <!-- Error State -->
    <div
      v-else-if="error && !task"
      class="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center"
    >
      <div class="text-3xl mb-3">⚠️</div>
      <h2 class="text-xl font-bold text-white mb-2">
        {{ error }}
      </h2>
      <NuxtLink
        :to="`/lists/${listId}`"
        class="inline-flex items-center px-4 py-2 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition cursor-pointer"
      >
        Return to List
      </NuxtLink>
    </div>

    <!-- Task Full Page Card -->
    <div
      v-else-if="task"
      class="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xs flex-1 flex flex-col"
    >
      <TaskDetailView
        :initial-task="task"
        :list-id="listId"
        :is-drawer="false"
        @deleted="handleTaskDeleted"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Task } from '../../../../types/task';
import { useApi } from '../../../../composables/useApi';
import { extractApiErrorMessage } from '../../../../utils/error';
import TaskDetailView from '../../../../components/task/TaskDetailView.vue';

definePageMeta({
  middleware: ['auth'],
});

const route = useRoute();
const router = useRouter();
const { apiFetch } = useApi();

const listId = computed(() => String(route.params.id || ''));
const taskId = computed(() => String(route.params.taskId || ''));

const task = ref<Task | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function loadTask() {
  if (!listId.value || !taskId.value) return;
  loading.value = true;
  error.value = null;

  try {
    const res = await apiFetch<Task>(
      `/lists/${listId.value}/tasks/${taskId.value}`,
      { method: 'GET' },
    );
    task.value = res;
  } catch (err: unknown) {
    error.value = extractApiErrorMessage(err, 'Failed to load task details');
  } finally {
    loading.value = false;
  }
}

function handleTaskDeleted() {
  router.push(`/lists/${listId.value}`);
}

onMounted(() => {
  loadTask();
});
</script>
