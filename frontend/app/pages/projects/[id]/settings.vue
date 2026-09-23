<template>
  <div class="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
    <!-- Breadcrumbs / Navigation -->
    <div class="mb-6 flex items-center justify-between text-sm text-slate-400">
      <NuxtLink to="/projects" class="hover:text-white transition">
        &larr; Back to Projects
      </NuxtLink>
      <NuxtLink
        v-if="project"
        :to="`/projects/${project._id}/board`"
        class="text-emerald-400 hover:text-emerald-300 font-medium transition cursor-pointer"
      >
        Open Board &rarr;
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div
      v-if="status === 'pending' && !project"
      class="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-8 animate-pulse space-y-6"
    >
      <div class="w-1/3 h-8 bg-slate-700/60 rounded" />
      <div class="space-y-4">
        <div class="w-full h-10 bg-slate-700/40 rounded" />
        <div class="w-full h-10 bg-slate-700/40 rounded" />
        <div class="w-full h-24 bg-slate-700/40 rounded" />
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="errorState"
      class="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-8 text-center"
    >
      <div class="text-3xl mb-3">⚠️</div>
      <h2 class="text-xl font-bold text-white mb-2">{{ errorState }}</h2>
      <NuxtLink
        to="/projects"
        class="inline-flex items-center px-4 py-2 mt-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition cursor-pointer"
      >
        Return to Projects
      </NuxtLink>
    </div>

    <!-- Project Settings Content -->
    <div v-else-if="project" class="space-y-8">
      <!-- General Settings Card -->
      <div
        class="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl"
      >
        <div class="pb-6 border-b border-slate-700/60 mb-6">
          <div class="flex items-center gap-3">
            <span
              class="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono uppercase"
            >
              {{ project.prefix }}
            </span>
            <h1 class="text-2xl font-bold text-white tracking-tight">
              Project Settings
            </h1>
          </div>
          <p class="text-sm text-slate-400 mt-1">
            Update project name, key prefix, and description.
          </p>
        </div>

        <EditProjectForm :project="project" @saved="handleProjectSaved" />
      </div>

      <!-- Danger Zone Card (Delete Project) -->
      <div
        class="bg-rose-950/20 border border-rose-800/40 rounded-2xl p-6 sm:p-8 shadow-xl"
      >
        <div class="pb-4 border-b border-rose-800/30 mb-6">
          <h2 class="text-xl font-bold text-rose-300">Danger Zone</h2>
          <p class="text-sm text-slate-400 mt-1">
            Irreversible actions for this project.
          </p>
        </div>

        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h3 class="text-base font-semibold text-white">Delete this project</h3>
            <p class="text-sm text-slate-400 mt-0.5">
              Once deleted, all issues, comments, and settings will be permanently removed.
            </p>
          </div>

          <button
            type="button"
            class="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm transition cursor-pointer self-start sm:self-auto shrink-0 shadow-lg shadow-rose-900/20"
            @click="isConfirmOpen = true"
          >
            Delete Project
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Deletion Dialog -->
    <ConfirmDialog
      :is-open="isConfirmOpen"
      title="Delete Project"
      :message="`Are you sure you want to permanently delete '${project?.name}' (${project?.prefix})? This action cannot be undone.`"
      confirm-text="Yes, Delete Project"
      cancel-text="Cancel"
      :is-destructive="true"
      :loading="isDeleting"
      @confirm="handleDeleteProject"
      @cancel="isConfirmOpen = false"
      @close="isConfirmOpen = false"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useProjectsStore } from '../../../stores/projects';
import { useAuthStore } from '../../../stores/auth';
import { useToast } from '../../../composables/useToast';
import EditProjectForm from '../../../components/project/EditProjectForm.vue';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.vue';
import type { Project } from '../../../types/project';

definePageMeta({
  middleware: 'auth',
});

const route = useRoute();
const projectsStore = useProjectsStore();
const authStore = useAuthStore();
const toast = useToast();

const isConfirmOpen = ref(false);
const isDeleting = ref(false);
const errorState = useState(
  () => `project-settings-error-${String(route.params.id || '')}`,
  () => '',
);

const { data: project, status } = await useAsyncData(
  () => `project-${String(route.params.id || '')}`,
  async () => {
    const id = String(route.params.id || '');
    if (!id) return null;

    try {
      errorState.value = '';
      const proj = await projectsStore.fetchProject(id);

      // Verify owner authorization
      const currentUserId = String(authStore.user?._id || '');
      const ownerId =
        typeof proj.owner === 'object'
          ? String(proj.owner?._id || '')
          : String(proj.owner || '');

      if (currentUserId && ownerId && currentUserId !== ownerId) {
        toast.error('Only the project owner can manage project settings.');
        await navigateTo('/projects');
        return null;
      }

      return proj;
    } catch (err: unknown) {
      const fetchErr = err as {
        statusCode?: number;
        data?: { message?: string };
        message?: string;
      };
      if (fetchErr?.statusCode === 404) {
        errorState.value = 'Project not found';
      } else if (fetchErr?.statusCode === 403) {
        errorState.value = 'You do not have access to this project';
      } else {
        errorState.value =
          fetchErr?.data?.message ||
          fetchErr?.message ||
          'Failed to load project details';
      }
      return null;
    }
  },
  {
    watch: [() => route.params.id],
  },
);

function handleProjectSaved(updated: Project) {
  project.value = updated;
}

async function handleDeleteProject() {
  const targetId = project.value?._id;
  if (!targetId) return;

  isDeleting.value = true;
  try {
    await projectsStore.deleteProject(targetId);
    toast.success('Project was successfully deleted.');
    isConfirmOpen.value = false;
    await navigateTo('/projects');
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string }; message?: string };
    const msg =
      fetchErr?.data?.message ||
      fetchErr?.message ||
      'Failed to delete project';
    toast.error(msg);
  } finally {
    isDeleting.value = false;
  }
}
</script>
