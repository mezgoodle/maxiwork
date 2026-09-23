import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type {
  Task,
  TaskStatus,
  CreateTaskPayload,
  UpdateTaskPayload,
  GetTasksQuery,
  PaginatedTasksResponse,
  TasksPaginationMeta,
} from '../types/task';
import { useApi } from '../composables/useApi';

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([]);
  const currentTask = ref<Task | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const meta = ref<TasksPaginationMeta | null>(null);

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

  const tasksByStatus = computed(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };

    for (const task of tasks.value) {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      } else {
        grouped.todo.push(task);
      }
    }

    return grouped;
  });

  async function fetchTasks(
    projectId: string,
    query?: GetTasksQuery,
  ): Promise<PaginatedTasksResponse> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const res = await client<PaginatedTasksResponse>(
        `/projects/${projectId}/tasks`,
        {
          method: 'GET',
          params: query,
        },
      );
      tasks.value = res.data;
      meta.value = res.meta;
      return res;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to fetch tasks';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchTask(projectId: string, taskId: string): Promise<Task> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const res = await client<Task>(
        `/projects/${projectId}/tasks/${taskId}`,
        {
          method: 'GET',
        },
      );
      currentTask.value = res;
      return res;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to fetch task';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createTask(
    projectId: string,
    payload: CreateTaskPayload,
  ): Promise<Task> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const created = await client<Task>(
        `/projects/${projectId}/tasks`,
        {
          method: 'POST',
          body: payload,
        },
      );
      tasks.value.unshift(created);
      return created;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to create task';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateTask(
    projectId: string,
    taskId: string,
    payload: UpdateTaskPayload,
  ): Promise<Task> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const updated = await client<Task>(
        `/projects/${projectId}/tasks/${taskId}`,
        {
          method: 'PATCH',
          body: payload,
        },
      );
      const index = tasks.value.findIndex((t) => t._id === taskId);
      if (index !== -1) {
        tasks.value[index] = updated;
      }
      if (currentTask.value?._id === taskId) {
        currentTask.value = updated;
      }
      return updated;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to update task';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateTaskStatus(
    projectId: string,
    taskId: string,
    newStatus: TaskStatus,
  ): Promise<Task> {
    const taskIndex = tasks.value.findIndex((t) => t._id === taskId);
    const existingTask = taskIndex !== -1 ? tasks.value[taskIndex] : null;
    const previousStatus = existingTask?.status;

    // Optimistic update
    if (existingTask) {
      existingTask.status = newStatus;
    }
    if (currentTask.value?._id === taskId) {
      currentTask.value.status = newStatus;
    }

    try {
      const client = getClient();
      const updated = await client<Task>(
        `/projects/${projectId}/tasks/${taskId}/status`,
        {
          method: 'PATCH',
          body: { status: newStatus },
        },
      );
      if (taskIndex !== -1) {
        tasks.value[taskIndex] = updated;
      }
      if (currentTask.value?._id === taskId) {
        currentTask.value = updated;
      }
      return updated;
    } catch (err: unknown) {
      // Rollback on failure
      if (existingTask && previousStatus) {
        existingTask.status = previousStatus;
      }
      if (currentTask.value?._id === taskId && previousStatus) {
        currentTask.value.status = previousStatus;
      }
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message ||
        fetchErr?.message ||
        'Failed to update task status';
      throw err;
    }
  }

  async function deleteTask(projectId: string, taskId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      await client(`/projects/${projectId}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      tasks.value = tasks.value.filter((t) => t._id !== taskId);
      if (currentTask.value?._id === taskId) {
        currentTask.value = null;
      }
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to delete task';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    tasks,
    currentTask,
    loading,
    error,
    meta,
    tasksByStatus,
    fetchTasks,
    fetchTask,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
  };
});
