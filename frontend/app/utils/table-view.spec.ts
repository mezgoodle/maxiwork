import { describe, it, expect } from 'vitest';
import {
  getStatusOptions,
  getStatusBadgeStyle,
  getUserLabel,
  getAssigneeId,
  computeTableGroups,
  type UserOption,
} from './table-view';
import type { Task } from '../types/task';
import type { StatusWorkflow } from '../types/hierarchy';

describe('table-view utility', () => {
  const mockTasks: Task[] = [
    {
      _id: 't-1',
      title: 'Task 1',
      status: 'todo',
      priority: 'high',
      assignee: { _id: 'u-1', email: 'alice@example.com', firstName: 'Alice', lastName: 'Smith' },
      reporter: 'u-1',
      taskKey: 'MAX-1',
      project: 'proj-1',
    },
    {
      _id: 't-2',
      title: 'Task 2',
      status: 'in_progress',
      priority: 'critical',
      assignee: 'u-2',
      reporter: 'u-1',
      taskKey: 'MAX-2',
      project: 'proj-1',
    },
    {
      _id: 't-3',
      title: 'Task 3',
      status: 'done',
      priority: 'low',
      assignee: null,
      reporter: 'u-1',
      taskKey: 'MAX-3',
      project: 'proj-1',
    },
    {
      _id: 't-4',
      title: 'Task 4 with custom status',
      status: 'qa_testing',
      priority: 'medium',
      assignee: null,
      reporter: 'u-1',
      taskKey: 'MAX-4',
      project: 'proj-1',
    },
  ];

  const mockUsers: UserOption[] = [
    { _id: 'u-1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
    { _id: 'u-2', firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com' },
  ];

  const customWorkflow: StatusWorkflow = {
    _id: 'wf-1',
    name: 'Custom Workflow',
    targetType: 'list',
    targetId: 'list-1',
    isDefault: false,
    statuses: [
      { id: 'backlog', name: 'Backlog', color: '#64748B', category: 'to_do', order: 0 },
      { id: 'wip', name: 'Work in Progress', color: '#3B82F6', category: 'in_progress', order: 1 },
      { id: 'qa_testing', name: 'QA Testing', color: '#A855F7', category: 'in_progress', order: 2 },
      { id: 'closed', name: 'Closed', color: '#10B981', category: 'closed', order: 3 },
    ],
    defaultTodoStatusId: 'backlog',
    defaultDoneStatusId: 'closed',
  };

  describe('getStatusOptions', () => {
    it('returns default options when workflow is missing or empty', () => {
      const opts = getStatusOptions(null);
      expect(opts).toHaveLength(4);
      expect(opts.map((s) => s.id)).toEqual(['todo', 'in_progress', 'in_review', 'done']);
    });

    it('returns mapped statuses when custom workflow is provided', () => {
      const opts = getStatusOptions(customWorkflow);
      expect(opts).toHaveLength(4);
      expect(opts.map((s) => s.id)).toEqual(['backlog', 'wip', 'qa_testing', 'closed']);
    });
  });

  describe('getStatusBadgeStyle', () => {
    it('returns styles for standard status with default workflow', () => {
      const style = getStatusBadgeStyle('todo', null);
      expect(style.color).toBe('#94A3B8');
      expect(style.backgroundColor).toContain('15');
      expect(style.borderColor).toContain('50');
    });

    it('returns styles for custom workflow status', () => {
      const style = getStatusBadgeStyle('qa_testing', customWorkflow);
      expect(style.color).toBe('#A855F7');
    });

    it('falls back gracefully to slate color for unknown status', () => {
      const style = getStatusBadgeStyle('unknown_status', null);
      expect(style.color).toBe('#64748B');
    });
  });

  describe('getUserLabel', () => {
    it('formats full name when firstName and lastName are present', () => {
      expect(getUserLabel({ _id: '1', firstName: 'John', lastName: 'Doe', email: 'j@d.com' })).toBe('John Doe');
    });

    it('formats only firstName if lastName is absent', () => {
      expect(getUserLabel({ _id: '1', firstName: 'John', email: 'j@d.com' })).toBe('John');
    });

    it('falls back to email if name is empty', () => {
      expect(getUserLabel({ _id: '1', email: 'john@example.com' })).toBe('john@example.com');
    });
  });

  describe('getAssigneeId', () => {
    it('extracts id from user object', () => {
      expect(getAssigneeId({ _id: 'usr-99', email: 'test@example.com' })).toBe('usr-99');
    });

    it('extracts id when assignee is string', () => {
      expect(getAssigneeId('usr-100')).toBe('usr-100');
    });

    it('returns empty string when assignee is null or undefined', () => {
      expect(getAssigneeId(null)).toBe('');
      expect(getAssigneeId(undefined)).toBe('');
    });
  });

  describe('computeTableGroups', () => {
    it('groups by status with default workflow and creates an Other group for unmapped statuses', () => {
      const groups = computeTableGroups(mockTasks, 'status', null, mockUsers);
      expect(groups).toHaveLength(5); // todo, in_progress, in_review, done, and other
      const todoGroup = groups.find((g) => g.id === 'todo');
      expect(todoGroup?.tasks).toHaveLength(1);
      expect(todoGroup?.tasks[0]._id).toBe('t-1');
      expect(todoGroup?.prefillPayload).toEqual({ status: 'todo' });

      const otherGroup = groups.find((g) => g.id === 'other');
      expect(otherGroup?.tasks).toHaveLength(1);
      expect(otherGroup?.tasks[0]._id).toBe('t-4');
    });

    it('groups by status with custom workflow', () => {
      const groups = computeTableGroups(mockTasks, 'status', customWorkflow, mockUsers);
      // customWorkflow statuses: backlog, wip, qa_testing, closed + other (t-1, t-2, t-3)
      const qaGroup = groups.find((g) => g.id === 'qa_testing');
      expect(qaGroup?.tasks).toHaveLength(1);
      expect(qaGroup?.tasks[0]._id).toBe('t-4');
      expect(qaGroup?.prefillPayload).toEqual({ status: 'qa_testing' });
    });

    it('groups by priority into critical, high, medium, low', () => {
      const groups = computeTableGroups(mockTasks, 'priority', null, mockUsers);
      expect(groups).toHaveLength(4);
      expect(groups.map((g) => g.id)).toEqual(['critical', 'high', 'medium', 'low']);

      const criticalGroup = groups.find((g) => g.id === 'critical');
      expect(criticalGroup?.tasks).toHaveLength(1);
      expect(criticalGroup?.tasks[0]._id).toBe('t-2');
      expect(criticalGroup?.prefillPayload).toEqual({ priority: 'critical' });

      const highGroup = groups.find((g) => g.id === 'high');
      expect(highGroup?.tasks).toHaveLength(1);
      expect(highGroup?.tasks[0]._id).toBe('t-1');
    });

    it('groups by assignee into user groups plus unassigned', () => {
      const groups = computeTableGroups(mockTasks, 'assignee', null, mockUsers);
      expect(groups).toHaveLength(3); // u-1, u-2, unassigned

      const aliceGroup = groups.find((g) => g.id === 'u-1');
      expect(aliceGroup?.name).toBe('Alice Smith');
      expect(aliceGroup?.tasks).toHaveLength(1);
      expect(aliceGroup?.tasks[0]._id).toBe('t-1');
      expect(aliceGroup?.prefillPayload).toEqual({ assignee: 'u-1' });

      const bobGroup = groups.find((g) => g.id === 'u-2');
      expect(bobGroup?.tasks).toHaveLength(1);
      expect(bobGroup?.tasks[0]._id).toBe('t-2');
      expect(bobGroup?.prefillPayload).toEqual({ assignee: 'u-2' });

      const unassignedGroup = groups.find((g) => g.id === 'unassigned');
      expect(unassignedGroup?.tasks).toHaveLength(2); // t-3, t-4
      expect(unassignedGroup?.prefillPayload).toEqual({ assignee: undefined });
    });

    it('groups by none into a single All Tasks group', () => {
      const groups = computeTableGroups(mockTasks, 'none', null, mockUsers);
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toBe('all');
      expect(groups[0].name).toBe('All Tasks');
      expect(groups[0].tasks).toHaveLength(4);
      expect(groups[0].prefillPayload).toEqual({});
    });
  });
});
