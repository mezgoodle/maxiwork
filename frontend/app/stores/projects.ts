import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
} from '../types/project';
import { useApi } from '../composables/useApi';

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([]);
  const currentProject = ref<Project | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const getClient = () => {
    if (typeof useApi === 'function') {
      try {
        const { apiFetch } = useApi();
        if (typeof apiFetch === 'function') {
          return apiFetch;
        }
      } catch {
        // Fallback if called outside Nuxt context
      }
    }
    return $fetch;
  };

  async function fetchProjects(): Promise<Project[]> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const res = await client<Project[]>('/projects', {
        method: 'GET',
      });
      projects.value = res;
      return res;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message ||
        fetchErr?.message ||
        'Failed to fetch projects';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchProject(id: string): Promise<Project> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const res = await client<Project>(`/projects/${id}`, {
        method: 'GET',
      });
      currentProject.value = res;
      return res;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message ||
        fetchErr?.message ||
        'Failed to fetch project';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createProject(
    payload: CreateProjectPayload,
  ): Promise<Project> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const created = await client<Project>('/projects', {
        method: 'POST',
        body: payload,
      });
      projects.value.unshift(created);
      return created;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message ||
        fetchErr?.message ||
        'Failed to create project';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateProject(
    id: string,
    payload: UpdateProjectPayload,
  ): Promise<Project> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const updated = await client<Project>(`/projects/${id}`, {
        method: 'PATCH',
        body: payload,
      });
      const index = projects.value.findIndex((p) => p._id === id);
      if (index !== -1) {
        projects.value[index] = updated;
      }
      if (currentProject.value?._id === id) {
        currentProject.value = updated;
      }
      return updated;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message ||
        fetchErr?.message ||
        'Failed to update project';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteProject(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      await client(`/projects/${id}`, {
        method: 'DELETE',
      });
      projects.value = projects.value.filter((p) => p._id !== id);
      if (currentProject.value?._id === id) {
        currentProject.value = null;
      }
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message ||
        fetchErr?.message ||
        'Failed to delete project';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    projects,
    currentProject,
    loading,
    error,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
  };
});
