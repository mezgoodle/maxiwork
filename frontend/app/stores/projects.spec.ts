import { setActivePinia, createPinia } from 'pinia';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { useProjectsStore } from './projects';
import { useAuthStore } from './auth';

describe('useProjectsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('initializes with empty projects state', () => {
    const store = useProjectsStore();
    expect(store.projects).toEqual([]);
    expect(store.currentProject).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('fetchProjects loads projects into state', async () => {
    const store = useProjectsStore();
    const mockList = [
      {
        _id: 'p1',
        name: 'Project 1',
        prefix: 'P1',
        owner: 'u1',
        members: [],
      },
      {
        _id: 'p2',
        name: 'Project 2',
        prefix: 'P2',
        owner: 'u1',
        members: [],
      },
    ];

    global.$fetch = vi.fn().mockResolvedValue(mockList);

    const result = await store.fetchProjects();

    expect(result).toEqual(mockList);
    expect(store.projects).toEqual(mockList);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('fetchProjects handles error correctly', async () => {
    const store = useProjectsStore();
    global.$fetch = vi.fn().mockRejectedValue({
      data: { message: 'Failed to fetch projects from server' },
    });

    await expect(store.fetchProjects()).rejects.toBeDefined();
    expect(store.error).toBe('Failed to fetch projects from server');
    expect(store.loading).toBe(false);
  });

  it('fetchProject loads single project into currentProject', async () => {
    const store = useProjectsStore();
    const mockProject = {
      _id: 'p1',
      name: 'Project 1',
      prefix: 'P1',
      owner: 'u1',
      members: [],
    };

    global.$fetch = vi.fn().mockResolvedValue(mockProject);

    const result = await store.fetchProject('p1');

    expect(result).toEqual(mockProject);
    expect(store.currentProject).toEqual(mockProject);
    expect(store.loading).toBe(false);
  });

  it('createProject adds new project to beginning of list', async () => {
    const store = useProjectsStore();
    store.projects = [
      {
        _id: 'p1',
        name: 'Existing Project',
        prefix: 'EP',
        owner: 'u1',
        members: [],
      },
    ];

    const newProject = {
      _id: 'p2',
      name: 'New Project',
      prefix: 'NP',
      owner: 'u1',
      members: [],
    };

    global.$fetch = vi.fn().mockResolvedValue(newProject);

    const result = await store.createProject({
      name: 'New Project',
      prefix: 'NP',
    });

    expect(result).toEqual(newProject);
    expect(store.projects).toHaveLength(2);
    expect(store.projects[0]).toEqual(newProject);
  });

  it('updateProject updates project in list and currentProject', async () => {
    const store = useProjectsStore();
    store.projects = [
      {
        _id: 'p1',
        name: 'Old Name',
        prefix: 'OLD',
        owner: 'u1',
        members: [],
      },
    ];
    store.currentProject = {
      _id: 'p1',
      name: 'Old Name',
      prefix: 'OLD',
      owner: 'u1',
      members: [],
    };

    const updated = {
      _id: 'p1',
      name: 'Updated Name',
      prefix: 'NEW',
      owner: 'u1',
      members: [],
    };

    global.$fetch = vi.fn().mockResolvedValue(updated);

    const result = await store.updateProject('p1', {
      name: 'Updated Name',
      prefix: 'NEW',
    });

    expect(result).toEqual(updated);
    expect(store.projects[0].name).toBe('Updated Name');
    expect(store.projects[0].prefix).toBe('NEW');
    expect(store.currentProject?.name).toBe('Updated Name');
  });

  it('deleteProject removes project from list and resets currentProject', async () => {
    const store = useProjectsStore();
    store.projects = [
      {
        _id: 'p1',
        name: 'Project 1',
        prefix: 'P1',
        owner: 'u1',
        members: [],
      },
      {
        _id: 'p2',
        name: 'Project 2',
        prefix: 'P2',
        owner: 'u1',
        members: [],
      },
    ];
    store.currentProject = {
      _id: 'p1',
      name: 'Project 1',
      prefix: 'P1',
      owner: 'u1',
      members: [],
    };

    global.$fetch = vi.fn().mockResolvedValue({ message: 'Deleted' });

    await store.deleteProject('p1');

    expect(store.projects).toHaveLength(1);
    expect(store.projects[0]._id).toBe('p2');
    expect(store.currentProject).toBeNull();
  });

  it('attaches authorization header when auth accessToken exists', async () => {
    const authStore = useAuthStore();
    authStore.setTokens({
      access_token: 'valid-token',
      refresh_token: 'refresh-token',
    });

    const store = useProjectsStore();
    global.$fetch = vi.fn().mockResolvedValue([]);

    await store.fetchProjects();

    expect(global.$fetch).toHaveBeenCalledWith(
      expect.stringContaining('/projects'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-token',
        }),
      }),
    );
  });
});
