import { setActivePinia, createPinia } from 'pinia';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { useHierarchyStore } from './hierarchy';

describe('useHierarchyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('initializes with default state', () => {
    const store = useHierarchyStore();
    expect(store.workspaces).toEqual([]);
    expect(store.currentWorkspace).toBeNull();
    expect(store.tree).toEqual([]);
    expect(store.isSidebarCollapsed).toBe(false);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('toggles sidebar collapse state', () => {
    const store = useHierarchyStore();
    expect(store.isSidebarCollapsed).toBe(false);
    store.toggleSidebar();
    expect(store.isSidebarCollapsed).toBe(true);
    store.toggleSidebar();
    expect(store.isSidebarCollapsed).toBe(false);
  });

  it('toggles tree node collapsed state', () => {
    const store = useHierarchyStore();
    expect(store.isNodeCollapsed('node-1')).toBe(false);
    store.toggleNode('node-1');
    expect(store.isNodeCollapsed('node-1')).toBe(true);
    store.toggleNode('node-1');
    expect(store.isNodeCollapsed('node-1')).toBe(false);
  });

  it('fetchWorkspaces populates state and selects first workspace', async () => {
    const store = useHierarchyStore();
    const mockWorkspaces = [
      {
        _id: 'ws-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        owner: { _id: 'u-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        members: [],
        settings: { defaultTimezone: 'UTC', allowGuestInvites: true },
        createdAt: '2026-09-25T00:00:00.000Z',
        updatedAt: '2026-09-25T00:00:00.000Z',
      },
    ];

    const mockTree = {
      workspace: {
        id: 'ws-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        owner: 'u-1',
        userRole: 'owner',
      },
      spaces: [
        {
          id: 'sp-1',
          name: 'Engineering',
          icon: 'folder',
          color: '#4F46E5',
          isPrivate: false,
          order: 0,
          workspaceId: 'ws-1',
          folders: [],
          lists: [{ id: 'l-1', name: 'Backlog', order: 0, spaceId: 'sp-1' }],
        },
      ],
    };

    global.$fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/tree')) return Promise.resolve(mockTree);
      if (url.includes('/workspaces')) return Promise.resolve(mockWorkspaces);
      return Promise.resolve({});
    });

    const res = await store.fetchWorkspaces();
    expect(res).toHaveLength(1);
    expect(store.currentWorkspace?._id).toBe('ws-1');
    expect(store.tree).toHaveLength(1);
    expect(store.tree[0].name).toBe('Engineering');
  });

  it('createWorkspace adds new workspace and selects it', async () => {
    const store = useHierarchyStore();
    const newWs = {
      _id: 'ws-2',
      name: 'New Org',
      slug: 'new-org',
      owner: { _id: 'u-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      members: [],
      settings: { defaultTimezone: 'UTC', allowGuestInvites: true },
      createdAt: '2026-09-25T00:00:00.000Z',
      updatedAt: '2026-09-25T00:00:00.000Z',
    };

    global.$fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/tree')) {
        return Promise.resolve({
          workspace: { id: 'ws-2', name: 'New Org' },
          spaces: [],
        });
      }
      if (url.includes('/workspaces')) return Promise.resolve(newWs);
      return Promise.resolve({});
    });

    const created = await store.createWorkspace({ name: 'New Org' });
    expect(created._id).toBe('ws-2');
    expect(store.currentWorkspace?._id).toBe('ws-2');
  });

  it('deleteList calls DELETE /lists/:listId and refreshes tree', async () => {
    const store = useHierarchyStore();
    store.currentWorkspace = {
      _id: 'ws-1',
      name: 'Acme Corp',
      slug: 'acme-corp',
      owner: { _id: 'u-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      members: [],
      settings: { defaultTimezone: 'UTC', allowGuestInvites: true },
      createdAt: '2026-09-25T00:00:00.000Z',
      updatedAt: '2026-09-25T00:00:00.000Z',
    };

    let deleteCalled = false;
    let treeRefreshed = false;

    global.$fetch = vi.fn().mockImplementation((url: string, opts?: { method?: string }) => {
      if (url.includes('/lists/list-123') && opts?.method === 'DELETE') {
        deleteCalled = true;
        return Promise.resolve({ success: true });
      }
      if (url.includes('/tree')) {
        treeRefreshed = true;
        return Promise.resolve({
          workspace: { id: 'ws-1', name: 'Acme Corp' },
          spaces: [],
        });
      }
      return Promise.resolve({});
    });

    await store.deleteList('list-123');
    expect(deleteCalled).toBe(true);
    expect(treeRefreshed).toBe(true);
  });

  it('deleteList succeeds even if subsequent fetchTree fails', async () => {
    const store = useHierarchyStore();
    store.currentWorkspace = {
      _id: 'ws-1',
      name: 'Acme Corp',
      slug: 'acme-corp',
      owner: { _id: 'u-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      members: [],
      settings: { defaultTimezone: 'UTC', allowGuestInvites: true },
      createdAt: '2026-09-25T00:00:00.000Z',
      updatedAt: '2026-09-25T00:00:00.000Z',
    };

    global.$fetch = vi.fn().mockImplementation((url: string, opts?: { method?: string }) => {
      if (url.includes('/lists/list-123') && opts?.method === 'DELETE') {
        return Promise.resolve({ success: true });
      }
      if (url.includes('/tree')) {
        return Promise.reject(new Error('Network error during tree refresh'));
      }
      return Promise.resolve({});
    });

    await expect(store.deleteList('list-123')).resolves.not.toThrow();
  });

  it('fetchSpaceStatusWorkflow calls GET /spaces/:spaceId/status-workflow', async () => {
    const store = useHierarchyStore();
    const mockWorkflow = {
      defaultTodoStatusId: 'todo',
      defaultDoneStatusId: 'done',
      statuses: [
        { id: 'todo', name: 'To Do', category: 'to_do', color: '#94A3B8', order: 0 },
        { id: 'done', name: 'Done', category: 'done', color: '#22C55E', order: 1 },
      ],
    };

    global.$fetch = vi.fn().mockImplementation((url: string, opts?: { method?: string }) => {
      if (url.includes('/spaces/sp-1/status-workflow') && opts?.method === 'GET') {
        return Promise.resolve(mockWorkflow);
      }
      return Promise.resolve({});
    });

    const res = await store.fetchSpaceStatusWorkflow('sp-1');
    expect(res).toEqual(mockWorkflow);
  });

  it('updateSpaceStatusWorkflow calls PATCH /spaces/:spaceId/status-workflow with payload', async () => {
    const store = useHierarchyStore();
    const payload = {
      defaultTodoStatusId: 'backlog',
      defaultDoneStatusId: 'completed',
      statuses: [
        { id: 'backlog', name: 'Backlog', category: 'to_do' as const, color: '#94A3B8', order: 0 },
        { id: 'completed', name: 'Completed', category: 'done' as const, color: '#22C55E', order: 1 },
      ],
    };

    let capturedBody: unknown = null;
    global.$fetch = vi.fn().mockImplementation((url: string, opts?: { method?: string; body?: unknown }) => {
      if (url.includes('/spaces/sp-1/status-workflow') && opts?.method === 'PATCH') {
        capturedBody = opts.body;
        return Promise.resolve(payload);
      }
      return Promise.resolve({});
    });

    const res = await store.updateSpaceStatusWorkflow('sp-1', payload);
    expect(res).toEqual(payload);
    expect(capturedBody).toEqual(payload);
  });

  it('fetchListStatusWorkflow calls GET /lists/:listId/status-workflow', async () => {
    const store = useHierarchyStore();
    const mockResponse = {
      workflow: {
        defaultTodoStatusId: 'todo',
        defaultDoneStatusId: 'done',
        statuses: [
          { id: 'todo', name: 'To Do', category: 'to_do' as const, color: '#94A3B8', order: 0 },
          { id: 'done', name: 'Done', category: 'done' as const, color: '#22C55E', order: 1 },
        ],
      },
      isInherited: true,
    };

    global.$fetch = vi.fn().mockImplementation((url: string, opts?: { method?: string }) => {
      if (url.includes('/lists/list-1/status-workflow') && opts?.method === 'GET') {
        return Promise.resolve(mockResponse);
      }
      return Promise.resolve({});
    });

    const res = await store.fetchListStatusWorkflow('list-1');
    expect(res.isInherited).toBe(true);
    expect(res.workflow.statuses).toHaveLength(2);
  });

  it('updateListStatusWorkflow calls PATCH /lists/:listId/status-workflow with payload and migrations', async () => {
    const store = useHierarchyStore();
    const payload = {
      defaultTodoStatusId: 'todo',
      defaultDoneStatusId: 'finished',
      statuses: [
        { id: 'todo', name: 'To Do', category: 'to_do' as const, color: '#94A3B8', order: 0 },
        { id: 'finished', name: 'Finished', category: 'done' as const, color: '#10B981', order: 1 },
      ],
      migrations: [{ fromStatusId: 'done', toStatusId: 'finished' }],
    };

    let capturedBody: unknown = null;
    global.$fetch = vi.fn().mockImplementation((url: string, opts?: { method?: string; body?: unknown }) => {
      if (url.includes('/lists/list-1/status-workflow') && opts?.method === 'PATCH') {
        capturedBody = opts.body;
        return Promise.resolve(payload);
      }
      return Promise.resolve({});
    });

    const res = await store.updateListStatusWorkflow('list-1', payload);
    expect(res).toEqual(payload);
    expect(capturedBody).toEqual(payload);
  });

  it('resetListStatusWorkflow calls DELETE /lists/:listId/status-workflow', async () => {
    const store = useHierarchyStore();
    const mockWorkflowResponse = {
      workflow: {
        defaultTodoStatusId: 'todo',
        defaultDoneStatusId: 'done',
        statuses: [
          { id: 'todo', name: 'To Do', category: 'to_do' as const, color: '#94A3B8', order: 0 },
          { id: 'done', name: 'Done', category: 'done' as const, color: '#22C55E', order: 1 },
        ],
      },
      isInherited: true,
    };

    let resetCalled = false;
    global.$fetch = vi.fn().mockImplementation((url: string, opts?: { method?: string }) => {
      if (url.includes('/lists/list-1/status-workflow') && opts?.method === 'DELETE') {
        resetCalled = true;
        return Promise.resolve(mockWorkflowResponse);
      }
      return Promise.resolve({});
    });

    const res = await store.resetListStatusWorkflow('list-1');
    expect(resetCalled).toBe(true);
    expect(res).toEqual(mockWorkflowResponse);
  });
});
