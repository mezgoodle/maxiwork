import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
  Workspace,
  HierarchyTreeNodeSpace,
  HierarchyTreeResponse,
  CreateWorkspacePayload,
  UpdateWorkspacePayload,
  CreateSpacePayload,
  UpdateSpacePayload,
  CreateFolderPayload,
  UpdateFolderPayload,
  CreateListPayload,
  UpdateListPayload,
} from '../types/hierarchy';
import { useApi } from '../composables/useApi';

export const useHierarchyStore = defineStore('hierarchy', () => {
  const workspaces = ref<Workspace[]>([]);
  const currentWorkspace = ref<Workspace | null>(null);
  const tree = ref<HierarchyTreeNodeSpace[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isSidebarCollapsed = ref(false);
  const collapsedNodes = ref<Record<string, boolean>>({});

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

  function initPersistedState() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedCollapsed = localStorage.getItem('mw_sidebar_collapsed');
        if (savedCollapsed !== null) {
          isSidebarCollapsed.value = savedCollapsed === 'true';
        }
        const savedNodes = localStorage.getItem('mw_collapsed_nodes');
        if (savedNodes) {
          collapsedNodes.value = JSON.parse(savedNodes) as Record<string, boolean>;
        }
      } catch {
        // Ignore storage access errors
      }
    }
  }

  function toggleSidebar() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('mw_sidebar_collapsed', String(isSidebarCollapsed.value));
    }
  }

  function toggleNode(nodeId: string) {
    collapsedNodes.value = {
      ...collapsedNodes.value,
      [nodeId]: !collapsedNodes.value[nodeId],
    };
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('mw_collapsed_nodes', JSON.stringify(collapsedNodes.value));
    }
  }

  function isNodeCollapsed(nodeId: string): boolean {
    return !!collapsedNodes.value[nodeId];
  }

  async function fetchWorkspaces(): Promise<Workspace[]> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const res = await client<Workspace[]>('/workspaces', { method: 'GET' });
      workspaces.value = res;
      if (res.length > 0 && !currentWorkspace.value) {
        currentWorkspace.value = res[0];
        await fetchTree(res[0]._id);
      }
      return res;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to fetch workspaces';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function selectWorkspace(workspaceId: string): Promise<void> {
    const ws = workspaces.value.find((w) => w._id === workspaceId);
    if (ws) {
      currentWorkspace.value = ws;
      await fetchTree(workspaceId);
    }
  }

  async function fetchTree(workspaceId?: string): Promise<HierarchyTreeNodeSpace[]> {
    const targetId = workspaceId || currentWorkspace.value?._id;
    if (!targetId) return [];

    try {
      const client = getClient();
      const res = await client<HierarchyTreeResponse>(`/workspaces/${targetId}/tree`, {
        method: 'GET',
      });
      tree.value = res.spaces;
      return res.spaces;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to fetch hierarchy tree';
      throw err;
    }
  }

  async function createWorkspace(payload: CreateWorkspacePayload): Promise<Workspace> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const res = await client<Workspace>('/workspaces', {
        method: 'POST',
        body: payload,
      });
      workspaces.value.push(res);
      currentWorkspace.value = res;
      await fetchTree(res._id);
      return res;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to create workspace';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateWorkspace(
    workspaceId: string,
    payload: UpdateWorkspacePayload,
  ): Promise<Workspace> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      const res = await client<Workspace>(`/workspaces/${workspaceId}`, {
        method: 'PATCH',
        body: payload,
      });
      const idx = workspaces.value.findIndex((w) => w._id === workspaceId);
      if (idx !== -1) {
        workspaces.value[idx] = res;
      }
      if (currentWorkspace.value?._id === workspaceId) {
        currentWorkspace.value = res;
      }
      return res;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to update workspace';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteWorkspace(workspaceId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      await client(`/workspaces/${workspaceId}`, { method: 'DELETE' });
      workspaces.value = workspaces.value.filter((w) => w._id !== workspaceId);
      if (currentWorkspace.value?._id === workspaceId) {
        currentWorkspace.value = workspaces.value[0] || null;
        if (currentWorkspace.value) {
          await fetchTree(currentWorkspace.value._id);
        } else {
          tree.value = [];
        }
      }
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to delete workspace';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createSpace(
    workspaceId: string,
    payload: CreateSpacePayload,
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      await client(`/workspaces/${workspaceId}/spaces`, {
        method: 'POST',
        body: payload,
      });
      await fetchTree(workspaceId);
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to create space';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateSpace(spaceId: string, payload: UpdateSpacePayload): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      await client(`/spaces/${spaceId}`, {
        method: 'PATCH',
        body: payload,
      });
      await fetchTree();
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to update space';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteSpace(spaceId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      await client(`/spaces/${spaceId}`, { method: 'DELETE' });
      await fetchTree();
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to delete space';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createFolder(
    spaceId: string,
    payload: CreateFolderPayload,
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      await client(`/spaces/${spaceId}/folders`, {
        method: 'POST',
        body: payload,
      });
      await fetchTree();
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to create folder';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateFolder(
    folderId: string,
    payload: UpdateFolderPayload,
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      await client(`/folders/${folderId}`, {
        method: 'PATCH',
        body: payload,
      });
      await fetchTree();
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to update folder';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteFolder(folderId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      await client(`/folders/${folderId}`, { method: 'DELETE' });
      await fetchTree();
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to delete folder';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createList(
    spaceId: string,
    payload: CreateListPayload,
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      await client(`/spaces/${spaceId}/lists`, {
        method: 'POST',
        body: payload,
      });
      await fetchTree();
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to create list';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateList(listId: string, payload: UpdateListPayload): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      await client(`/lists/${listId}`, {
        method: 'PATCH',
        body: payload,
      });
      await fetchTree();
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to update list';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteList(listId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const client = getClient();
      await client(`/lists/${listId}`, { method: 'DELETE' });
      await fetchTree();
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string }; message?: string };
      error.value =
        fetchErr?.data?.message || fetchErr?.message || 'Failed to delete list';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    workspaces,
    currentWorkspace,
    tree,
    loading,
    error,
    isSidebarCollapsed,
    collapsedNodes,
    initPersistedState,
    toggleSidebar,
    toggleNode,
    isNodeCollapsed,
    fetchWorkspaces,
    selectWorkspace,
    fetchTree,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    createSpace,
    updateSpace,
    deleteSpace,
    createFolder,
    updateFolder,
    deleteFolder,
    createList,
    updateList,
    deleteList,
  };
});
