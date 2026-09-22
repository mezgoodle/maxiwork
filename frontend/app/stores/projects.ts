import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
} from '../types/project';
import { useAuthStore } from './auth';

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([]);
  const currentProject = ref<Project | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const authStore = useAuthStore();

  const getApiBase = () => {
    if (typeof useRuntimeConfig === 'function') {
      try {
        const config = useRuntimeConfig();
        if (config?.public?.apiBase) {
          return config.public.apiBase as string;
        }
      } catch {
        // Fallback if called outside Nuxt context
      }
    }
    return 'http://localhost:3000/api';
  };

  const getHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authStore.accessToken) {
      headers.Authorization = `Bearer ${authStore.accessToken}`;
    }
    return headers;
  };

  async function fetchProjects(): Promise<Project[]> {
    loading.value = true;
    error.value = null;
    try {
      const apiBase = getApiBase();
      const res = await $fetch<Project[]>(`${apiBase}/projects`, {
        method: 'GET',
        headers: getHeaders(),
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
      const apiBase = getApiBase();
      const res = await $fetch<Project>(`${apiBase}/projects/${id}`, {
        method: 'GET',
        headers: getHeaders(),
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
      const apiBase = getApiBase();
      const created = await $fetch<Project>(`${apiBase}/projects`, {
        method: 'POST',
        headers: getHeaders(),
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
      const apiBase = getApiBase();
      const updated = await $fetch<Project>(`${apiBase}/projects/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
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
      const apiBase = getApiBase();
      await $fetch(`${apiBase}/projects/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
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
