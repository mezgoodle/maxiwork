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
});
