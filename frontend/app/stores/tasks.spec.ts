import { setActivePinia, createPinia } from 'pinia';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { useTasksStore } from './tasks';
import type { Task, PaginatedTasksResponse } from '../types/task';

describe('useTasksStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  const sampleTasks: Task[] = [
    {
      _id: 't1',
      title: 'Task 1',
      status: 'todo',
      priority: 'medium',
      project: 'p1',
      reporter: 'u1',
      taskKey: 'TEST-1',
    },
    {
      _id: 't2',
      title: 'Task 2',
      status: 'in_progress',
      priority: 'high',
      project: 'p1',
      reporter: 'u1',
      taskKey: 'TEST-2',
    },
    {
      _id: 't3',
      title: 'Task 3',
      status: 'done',
      priority: 'low',
      project: 'p1',
      reporter: 'u1',
      taskKey: 'TEST-3',
    },
  ];

  it('initializes with empty state', () => {
    const store = useTasksStore();
    expect(store.tasks).toEqual([]);
    expect(store.currentTask).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(store.meta).toBeNull();
  });

  it('tasksByStatus groups tasks properly into 4 columns', () => {
    const store = useTasksStore();
    store.tasks = [...sampleTasks];

    const grouped = store.tasksByStatus;
    expect(grouped.todo).toHaveLength(1);
    expect(grouped.in_progress).toHaveLength(1);
    expect(grouped.in_review).toHaveLength(0);
    expect(grouped.done).toHaveLength(1);
    expect(grouped.todo[0]._id).toBe('t1');
  });

  it('fetchTasks loads tasks and pagination meta', async () => {
    const store = useTasksStore();
    const mockResponse: PaginatedTasksResponse = {
      data: sampleTasks,
      meta: {
        total: 3,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    };

    global.$fetch = vi.fn().mockResolvedValue(mockResponse);

    const res = await store.fetchTasks('p1');
    expect(res).toEqual(mockResponse);
    expect(store.tasks).toEqual(sampleTasks);
    expect(store.meta).toEqual(mockResponse.meta);
    expect(store.loading).toBe(false);
  });

  it('createTask adds new task to beginning of list', async () => {
    const store = useTasksStore();
    store.tasks = [sampleTasks[0]];

    const newTask: Task = {
      _id: 't4',
      title: 'New Task',
      status: 'todo',
      priority: 'critical',
      project: 'p1',
      reporter: 'u1',
      taskKey: 'TEST-4',
    };

    global.$fetch = vi.fn().mockResolvedValue(newTask);

    const created = await store.createTask('p1', {
      title: 'New Task',
      priority: 'critical',
    });

    expect(created).toEqual(newTask);
    expect(store.tasks).toHaveLength(2);
    expect(store.tasks[0]._id).toBe('t4');
  });

  it('updateTask updates task in list and currentTask', async () => {
    const store = useTasksStore();
    store.tasks = [{ ...sampleTasks[0] }];
    store.currentTask = { ...sampleTasks[0] };

    const updatedTask: Task = {
      ...sampleTasks[0],
      title: 'Updated Title',
      priority: 'high',
    };

    global.$fetch = vi.fn().mockResolvedValue(updatedTask);

    const res = await store.updateTask('p1', 't1', {
      title: 'Updated Title',
      priority: 'high',
    });

    expect(res).toEqual(updatedTask);
    expect(store.tasks[0].title).toBe('Updated Title');
    expect(store.currentTask?.title).toBe('Updated Title');
  });

  it('updateTaskStatus optimistically updates and settles on success', async () => {
    const store = useTasksStore();
    store.tasks = [{ ...sampleTasks[0] }]; // status: 'todo'

    const updatedServerTask: Task = {
      ...sampleTasks[0],
      status: 'in_progress',
    };

    global.$fetch = vi.fn().mockResolvedValue(updatedServerTask);

    const promise = store.updateTaskStatus('p1', 't1', 'in_progress');

    // Instant check: status updated optimistically before resolve
    expect(store.tasks[0].status).toBe('in_progress');

    const res = await promise;
    expect(res.status).toBe('in_progress');
    expect(store.tasks[0].status).toBe('in_progress');
  });

  it('updateTaskStatus rolls back status on server failure', async () => {
    const store = useTasksStore();
    store.tasks = [{ ...sampleTasks[0] }]; // status: 'todo'

    global.$fetch = vi.fn().mockRejectedValue({
      data: { message: 'Internal Server Error' },
    });

    await expect(
      store.updateTaskStatus('p1', 't1', 'done'),
    ).rejects.toBeDefined();

    // Reverted back to 'todo'
    expect(store.tasks[0].status).toBe('todo');
    expect(store.error).toBe('Internal Server Error');
  });

  it('deleteTask removes task from state and clears currentTask', async () => {
    const store = useTasksStore();
    store.tasks = [{ ...sampleTasks[0] }, { ...sampleTasks[1] }];
    store.currentTask = { ...sampleTasks[0] };

    global.$fetch = vi.fn().mockResolvedValue({ message: 'Deleted' });

    await store.deleteTask('p1', 't1');

    expect(store.tasks).toHaveLength(1);
    expect(store.tasks[0]._id).toBe('t2');
    expect(store.currentTask).toBeNull();
  });
});
