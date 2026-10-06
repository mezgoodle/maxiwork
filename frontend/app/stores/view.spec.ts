import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useViewStore } from './view';
import type { Task } from '../types/task';

describe('useViewStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with default values', () => {
    const store = useViewStore();
    expect(store.activeView).toBe('list');
    expect(store.filters.search).toBe('');
    expect(store.filters.statuses).toEqual([]);
    expect(store.filters.priorities).toEqual([]);
    expect(store.filters.assigneeId).toBeNull();
    expect(store.filters.dueDate).toBe('all');
    expect(store.sort).toEqual({ field: 'createdAt', direction: 'desc' });
    expect(store.groupBy).toBe('status');
    expect(store.activeFiltersCount).toBe(0);
    expect(store.hasActiveFilters).toBe(false);
  });

  it('sets active view correctly', () => {
    const store = useViewStore();
    store.setActiveView('board');
    expect(store.activeView).toBe('board');
    store.setActiveView('calendar');
    expect(store.activeView).toBe('calendar');
  });

  it('manages filter values and activeFiltersCount correctly', () => {
    const store = useViewStore();
    store.setSearch('test query');
    expect(store.filters.search).toBe('test query');
    expect(store.activeFiltersCount).toBe(1);

    store.toggleStatus('todo');
    expect(store.filters.statuses).toContain('todo');
    expect(store.activeFiltersCount).toBe(2);

    store.toggleStatus('todo');
    expect(store.filters.statuses).not.toContain('todo');
    expect(store.activeFiltersCount).toBe(1);

    store.togglePriority('high');
    store.togglePriority('critical');
    expect(store.filters.priorities).toEqual(['high', 'critical']);
    expect(store.activeFiltersCount).toBe(3);

    store.setAssignee('user-123');
    expect(store.filters.assigneeId).toBe('user-123');
    expect(store.activeFiltersCount).toBe(4);

    store.setDueDateFilter('overdue');
    expect(store.filters.dueDate).toBe('overdue');
    expect(store.activeFiltersCount).toBe(5);

    store.resetFilters();
    expect(store.filters.search).toBe('');
    expect(store.filters.statuses).toEqual([]);
    expect(store.filters.priorities).toEqual([]);
    expect(store.filters.assigneeId).toBeNull();
    expect(store.filters.dueDate).toBe('all');
    expect(store.activeFiltersCount).toBe(0);
  });

  it('handles sort and sort toggle direction', () => {
    const store = useViewStore();
    store.setSort('priority', 'asc');
    expect(store.sort).toEqual({ field: 'priority', direction: 'asc' });

    store.toggleSortDirection();
    expect(store.sort.direction).toBe('desc');
  });

  it('handles group by updates', () => {
    const store = useViewStore();
    store.setGroupBy('priority');
    expect(store.groupBy).toBe('priority');

    store.setGroupBy('none');
    expect(store.groupBy).toBe('none');
  });

  it('serializes store state to URL query parameters', () => {
    const store = useViewStore();
    expect(store.toQuery()).toEqual({});

    store.setActiveView('board');
    store.setSearch('bug');
    store.toggleStatus('in_progress');
    store.togglePriority('critical');
    store.setAssignee('user-1');
    store.setDueDateFilter('today');
    store.setSort('dueDate', 'asc');
    store.setGroupBy('priority');

    expect(store.toQuery()).toEqual({
      view: 'board',
      q: 'bug',
      status: 'in_progress',
      priority: 'critical',
      assignee: 'user-1',
      due: 'today',
      sort: 'dueDate:asc',
      group: 'priority',
    });
  });

  it('deserializes and synchronizes from URL query parameters', () => {
    const store = useViewStore();
    store.syncFromQuery({
      view: 'calendar',
      q: 'feature',
      status: 'todo,done',
      priority: 'high,critical',
      assignee: 'unassigned',
      due: 'this_week',
      sort: 'title:asc',
      group: 'assignee',
    });

    expect(store.activeView).toBe('calendar');
    expect(store.filters.search).toBe('feature');
    expect(store.filters.statuses).toEqual(['todo', 'done']);
    expect(store.filters.priorities).toEqual(['high', 'critical']);
    expect(store.filters.assigneeId).toBe('unassigned');
    expect(store.filters.dueDate).toBe('this_week');
    expect(store.sort).toEqual({ field: 'title', direction: 'asc' });
    expect(store.groupBy).toBe('assignee');
  });

  describe('filterAndSortTasks', () => {
    const mockTasks: Task[] = [
      {
        _id: '1',
        title: 'Backend API Auth',
        taskKey: 'PROJ-1',
        status: 'todo',
        priority: 'critical',
        project: 'p1',
        reporter: 'u1',
        assignee: { _id: 'u1', email: 'u1@test.com', firstName: 'John', lastName: 'Doe', role: 'admin' },
        createdAt: '2026-09-01T10:00:00Z',
        dueDate: '2026-10-01T10:00:00Z', // past / overdue
      },
      {
        _id: '2',
        title: 'Frontend Button Design',
        taskKey: 'PROJ-2',
        status: 'in_progress',
        priority: 'low',
        project: 'p1',
        reporter: 'u1',
        assignee: null,
        createdAt: '2026-09-02T10:00:00Z',
        dueDate: undefined,
      },
      {
        _id: '3',
        title: 'Database Schema Migration',
        taskKey: 'PROJ-3',
        status: 'done',
        priority: 'high',
        project: 'p1',
        reporter: 'u1',
        assignee: { _id: 'u2', email: 'u2@test.com', firstName: 'Jane', lastName: 'Smith', role: 'member' },
        createdAt: '2026-09-03T10:00:00Z',
        dueDate: new Date().toISOString(), // today
      },
    ];

    it('filters tasks by search title or key', () => {
      const store = useViewStore();
      store.setSearch('frontend');
      const res = store.filterAndSortTasks(mockTasks);
      expect(res).toHaveLength(1);
      expect(res[0]._id).toBe('2');

      store.setSearch('proj-3');
      const resKey = store.filterAndSortTasks(mockTasks);
      expect(resKey).toHaveLength(1);
      expect(resKey[0]._id).toBe('3');
    });

    it('filters tasks by status', () => {
      const store = useViewStore();
      store.toggleStatus('in_progress');
      const res = store.filterAndSortTasks(mockTasks);
      expect(res).toHaveLength(1);
      expect(res[0]._id).toBe('2');
    });

    it('filters tasks by priority', () => {
      const store = useViewStore();
      store.togglePriority('critical');
      store.togglePriority('high');
      const res = store.filterAndSortTasks(mockTasks);
      expect(res).toHaveLength(2);
      expect(res.map((t) => t._id)).toContain('1');
      expect(res.map((t) => t._id)).toContain('3');
    });

    it('filters tasks by assignee (unassigned and specific ID)', () => {
      const store = useViewStore();
      store.setAssignee('unassigned');
      expect(store.filterAndSortTasks(mockTasks)).toHaveLength(1);
      expect(store.filterAndSortTasks(mockTasks)[0]._id).toBe('2');

      store.setAssignee('u2');
      expect(store.filterAndSortTasks(mockTasks)).toHaveLength(1);
      expect(store.filterAndSortTasks(mockTasks)[0]._id).toBe('3');
    });

    it('filters tasks by due date (no_date)', () => {
      const store = useViewStore();
      store.setDueDateFilter('no_date');
      const res = store.filterAndSortTasks(mockTasks);
      expect(res).toHaveLength(1);
      expect(res[0]._id).toBe('2');
    });

    it('filters tasks by due date (overdue)', () => {
      const store = useViewStore();
      store.setDueDateFilter('overdue');
      const res = store.filterAndSortTasks(mockTasks);
      // PROJ-1 has past due date and status 'todo'
      expect(res).toHaveLength(1);
      expect(res[0]._id).toBe('1');
    });

    it('sorts tasks by title asc and desc', () => {
      const store = useViewStore();
      store.setSort('title', 'asc');
      const asc = store.filterAndSortTasks(mockTasks);
      expect(asc[0].title).toBe('Backend API Auth');
      expect(asc[2].title).toBe('Frontend Button Design');

      store.setSort('title', 'desc');
      const desc = store.filterAndSortTasks(mockTasks);
      expect(desc[0].title).toBe('Frontend Button Design');
      expect(desc[2].title).toBe('Backend API Auth');
    });

    it('sorts tasks by priority (critical > high > medium > low)', () => {
      const store = useViewStore();
      store.setSort('priority', 'desc');
      const desc = store.filterAndSortTasks(mockTasks);
      expect(desc[0].priority).toBe('critical'); // 1
      expect(desc[1].priority).toBe('high');     // 3
      expect(desc[2].priority).toBe('low');      // 2
    });
  });
});
