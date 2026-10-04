import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
  BatchUpdateCustomFieldItem,
  CreateCustomFieldPayload,
  CustomField,
  EffectiveCustomField,
  UpdateCustomFieldPayload,
} from '../types/custom-field';
import type { Task } from '../types/task';
import { useApi } from '../composables/useApi';
import { extractApiErrorMessage } from '../utils/error';

export const useCustomFieldsStore = defineStore('customFields', () => {
  const spaceFields = ref<Record<string, CustomField[]>>({});
  const listFields = ref<Record<string, EffectiveCustomField[]>>({});
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
    return (globalThis as unknown as { $fetch: typeof fetch }).$fetch;
  };

  async function fetchSpaceFields(spaceId: string): Promise<CustomField[]> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const data = await client<CustomField[]>(`/spaces/${spaceId}/custom-fields`);
      spaceFields.value = {
        ...spaceFields.value,
        [spaceId]: data,
      };
      return data;
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err);
      error.value = msg;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createSpaceField(
    spaceId: string,
    payload: CreateCustomFieldPayload,
  ): Promise<CustomField> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const created = await client<CustomField>(`/spaces/${spaceId}/custom-fields`, {
        method: 'POST',
        body: payload,
      });
      const current = spaceFields.value[spaceId] || [];
      spaceFields.value = {
        ...spaceFields.value,
        [spaceId]: [...current, created],
      };
      return created;
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err);
      error.value = msg;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchListFields(listId: string): Promise<EffectiveCustomField[]> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const raw = await client<Array<EffectiveCustomField & { id?: string }>>(`/lists/${listId}/custom-fields`);
      const data: EffectiveCustomField[] = (raw || []).map((f) => ({
        ...f,
        _id: f._id || f.id || '',
      }));
      listFields.value = {
        ...listFields.value,
        [listId]: data,
      };
      return data;
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err);
      error.value = msg;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createListField(
    listId: string,
    payload: CreateCustomFieldPayload,
  ): Promise<CustomField> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const created = await client<CustomField>(`/lists/${listId}/custom-fields`, {
        method: 'POST',
        body: payload,
      });
      const current = listFields.value[listId] || [];
      listFields.value = {
        ...listFields.value,
        [listId]: [...current, { ...created, inherited: false }],
      };
      return created;
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err);
      error.value = msg;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateField(
    fieldId: string,
    payload: UpdateCustomFieldPayload,
    options?: { spaceId?: string; listId?: string },
  ): Promise<CustomField> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const updated = await client<CustomField>(`/custom-fields/${fieldId}`, {
        method: 'PATCH',
        body: payload,
      });

      if (options?.spaceId && spaceFields.value[options.spaceId]) {
        spaceFields.value[options.spaceId] = spaceFields.value[options.spaceId].map((f) =>
          f._id === fieldId ? { ...f, ...updated } : f,
        );
      }

      if (options?.listId && listFields.value[options.listId]) {
        listFields.value[options.listId] = listFields.value[options.listId].map((f) =>
          f._id === fieldId ? { ...f, ...updated, inherited: f.inherited } : f,
        );
      }

      return updated;
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err);
      error.value = msg;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteField(
    fieldId: string,
    options?: { spaceId?: string; listId?: string },
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      await client<unknown>(`/custom-fields/${fieldId}`, {
        method: 'DELETE',
      });

      if (options?.spaceId && spaceFields.value[options.spaceId]) {
        spaceFields.value[options.spaceId] = spaceFields.value[options.spaceId].filter(
          (f) => f._id !== fieldId,
        );
      }

      if (options?.listId && listFields.value[options.listId]) {
        listFields.value[options.listId] = listFields.value[options.listId].filter(
          (f) => f._id !== fieldId,
        );
      }
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err);
      error.value = msg;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateTaskCustomFields(
    taskId: string,
    values: Record<string, unknown>,
  ): Promise<Task> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      return await client<Task>(`/tasks/${taskId}/custom-fields`, {
        method: 'PATCH',
        body: { customFieldValues: values },
      });
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err);
      error.value = msg;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function batchUpdateListCustomFields(
    listId: string,
    updates: BatchUpdateCustomFieldItem[],
  ): Promise<Task[]> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const res = await client<{ updatedCount: number; tasks: Task[] }>(
        `/lists/${listId}/tasks/custom-fields/batch`,
        {
          method: 'PATCH',
          body: { updates },
        },
      );
      return res.tasks || [];
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err);
      error.value = msg;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    spaceFields,
    listFields,
    loading,
    error,
    fetchSpaceFields,
    createSpaceField,
    fetchListFields,
    createListField,
    updateField,
    deleteField,
    updateTaskCustomFields,
    batchUpdateListCustomFields,
  };
});
