<template>
  <div class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
    >
      <div>
        <h1 class="text-3xl font-bold text-white tracking-tight">Projects</h1>
        <p class="text-sm text-slate-400 mt-1">
          Manage your workspaces, track tasks, and collaborate
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition cursor-pointer shadow-lg shadow-emerald-900/20 self-start sm:self-auto"
        @click="isCreateModalOpen = true"
      >
        <span class="text-base font-bold">+</span>
        Create Project
      </button>
    </div>

    <!-- Error Banner -->
    <div
      v-if="fetchError"
      class="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between"
    >
      <span>{{ fetchError }}</span>
      <button
        type="button"
        class="text-xs text-rose-400 underline hover:text-rose-300 cursor-pointer"
        @click="refreshProjects"
      >
        Retry
      </button>
    </div>

    <!-- Loading Skeleton -->
    <div
      v-if="status === 'pending' && projects.length === 0"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <div
        v-for="i in 6"
        :key="i"
        class="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 animate-pulse"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-6 bg-slate-700/60 rounded-md" />
          <div class="w-24 h-4 bg-slate-700/60 rounded" />
        </div>
        <div class="w-full h-12 bg-slate-700/40 rounded mb-4" />
        <div class="w-1/2 h-4 bg-slate-700/40 rounded" />
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="projects.length === 0"
      class="bg-slate-800/30 border border-dashed border-slate-700 rounded-2xl p-12 text-center"
    >
      <div
        class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl text-slate-400"
      >
        📁
      </div>
      <h3 class="text-lg font-semibold text-white mb-1">No projects yet</h3>
      <p class="text-sm text-slate-400 max-w-sm mx-auto mb-6">
        Create your first project to start organizing tasks and collaborating with your team.
      </p>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition cursor-pointer"
        @click="isCreateModalOpen = true"
      >
        + Create Project
      </button>
    </div>

    <!-- Projects Grid -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <ProjectCard
        v-for="project in projects"
        :key="project._id"
        :project="project"
      />
    </div>

    <!-- Create Project Modal -->
    <CreateProjectModal
      :is-open="isCreateModalOpen"
      @close="isCreateModalOpen = false"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useProjectsStore } from '../../stores/projects';
import ProjectCard from '../../components/project/ProjectCard.vue';
import CreateProjectModal from '../../components/project/CreateProjectModal.vue';

definePageMeta({
  middleware: 'auth',
});

const projectsStore = useProjectsStore();
const isCreateModalOpen = ref(false);
const fetchError = useState('projects-list-error', () => '');

const projects = computed(() => projectsStore.projects);

const { status, refresh } = await useAsyncData('projects', async () => {
  try {
    fetchError.value = '';
    return await projectsStore.fetchProjects();
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string }; message?: string };
    fetchError.value =
      fetchErr?.data?.message ||
      fetchErr?.message ||
      'Failed to load projects';
    return [];
  }
});

async function refreshProjects() {
  await refresh();
}
</script>
