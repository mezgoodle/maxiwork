import { describe, it, expect } from 'vitest';
import {
  getMonthDays,
  getWeekDays,
  formatMonthYear,
  formatWeekRange,
  isTaskOverdue,
  groupTasksByDate,
  getTaskSpanPosition,
} from './calendar';
import type { Task } from '../types/task';
import type { StatusWorkflow } from '../types/hierarchy';

describe('calendar utils', () => {
  const mockWorkflow: StatusWorkflow = {
    id: 'workflow-1',
    name: 'Default Workflow',
    statuses: [
      { id: 'todo', name: 'To Do', color: '#94A3B8', category: 'to_do' },
      { id: 'in_progress', name: 'In Progress', color: '#38BDF8', category: 'in_progress' },
      { id: 'done', name: 'Done', color: '#22C55E', category: 'done' },
    ],
  };

  describe('getMonthDays', () => {
    it('generates 35 or 42 grid cells starting on Monday and ending on Sunday', () => {
      // October 2026: starts on Thursday Oct 1st.
      // Prior days: Sep 28 (Mon), Sep 29 (Tue), Sep 30 (Wed) -> 3 days padding.
      // Days in Oct: 31 days. Total so far: 34 days.
      // Remaining to reach 35 days: Nov 1 (Sun).
      const days = getMonthDays(2026, 9, new Date(2026, 9, 13)); // monthIndex 9 = October
      expect(days.length).toBe(35);
      expect(days[0].dateString).toBe('2026-09-28');
      expect(days[0].dayNumber).toBe(28);
      expect(days[0].isCurrentMonth).toBe(false);
      expect(days[3].dateString).toBe('2026-10-01');
      expect(days[3].isCurrentMonth).toBe(true);
      expect(days[33].dateString).toBe('2026-10-31');
      expect(days[33].isCurrentMonth).toBe(true);
      expect(days[34].dateString).toBe('2026-11-01');
      expect(days[34].isCurrentMonth).toBe(false);

      // Check today flag for Oct 13
      const oct13 = days.find((d) => d.dateString === '2026-10-13');
      expect(oct13).toBeDefined();
      expect(oct13?.isToday).toBe(true);
      expect(oct13?.isCurrentMonth).toBe(true);
    });

    it('generates 42 grid cells when a month spans across 6 calendar weeks', () => {
      // August 2026: Aug 1 is Saturday.
      // Padding Mon-Fri = 5 days (Jul 27..31).
      // 31 days in Aug -> 5 + 31 = 36 cells -> must pad to 42.
      const days = getMonthDays(2026, 7, new Date(2026, 7, 10)); // August
      expect(days.length).toBe(42);
      expect(days[0].dateString).toBe('2026-07-27');
      expect(days[0].isCurrentMonth).toBe(false);
      expect(days[41].dateString).toBe('2026-09-06');
      expect(days[41].isCurrentMonth).toBe(false);
    });

    it('handles February leap and non-leap years properly', () => {
      // Feb 2024 (leap year: 29 days)
      const leapDays = getMonthDays(2024, 1, new Date(2024, 1, 15));
      const currentMonthDaysLeap = leapDays.filter((d) => d.isCurrentMonth);
      expect(currentMonthDaysLeap.length).toBe(29);

      // Feb 2025 (non-leap year: 28 days)
      const nonLeapDays = getMonthDays(2025, 1, new Date(2025, 1, 15));
      const currentMonthDaysNonLeap = nonLeapDays.filter((d) => d.isCurrentMonth);
      expect(currentMonthDaysNonLeap.length).toBe(28);
    });
  });

  describe('getWeekDays', () => {
    it('returns exactly 7 days starting from Monday to Sunday for the target date', () => {
      // Base date: Wednesday Oct 14, 2026
      const baseDate = new Date(2026, 9, 14);
      const today = new Date(2026, 9, 14);
      const week = getWeekDays(baseDate, today);

      expect(week.length).toBe(7);
      expect(week[0].dateString).toBe('2026-10-12'); // Monday
      expect(week[0].isWeekend).toBe(false);
      expect(week[2].dateString).toBe('2026-10-14'); // Wednesday
      expect(week[2].isToday).toBe(true);
      expect(week[5].dateString).toBe('2026-10-17'); // Saturday
      expect(week[5].isWeekend).toBe(true);
      expect(week[6].dateString).toBe('2026-10-18'); // Sunday
      expect(week[6].isWeekend).toBe(true);
    });

    it('handles week spanning across month or year boundaries', () => {
      // Base date: Dec 31, 2026 (Thursday)
      const baseDate = new Date(2026, 11, 31);
      const week = getWeekDays(baseDate, baseDate);

      expect(week.length).toBe(7);
      expect(week[0].dateString).toBe('2026-12-28'); // Monday in 2026
      expect(week[3].dateString).toBe('2026-12-31'); // Thursday
      expect(week[4].dateString).toBe('2027-01-01'); // Friday in 2027
      expect(week[6].dateString).toBe('2027-01-03'); // Sunday in 2027
    });
  });

  describe('formatMonthYear', () => {
    it('formats Month and Year accurately', () => {
      expect(formatMonthYear(new Date(2026, 9, 15))).toBe('October 2026');
      expect(formatMonthYear(new Date(2027, 0, 1))).toBe('January 2027');
    });
  });

  describe('formatWeekRange', () => {
    it('formats a range within the same month', () => {
      const start = new Date(2026, 9, 12);
      const end = new Date(2026, 9, 18);
      expect(formatWeekRange(start, end)).toBe('Oct 12 – 18, 2026');
    });

    it('formats a range spanning across two different months in the same year', () => {
      const start = new Date(2026, 9, 26);
      const end = new Date(2026, 10, 1);
      expect(formatWeekRange(start, end)).toBe('Oct 26 – Nov 1, 2026');
    });

    it('formats a range spanning across year boundaries', () => {
      const start = new Date(2026, 11, 28);
      const end = new Date(2027, 0, 3);
      expect(formatWeekRange(start, end)).toBe('Dec 28, 2026 – Jan 3, 2027');
    });
  });

  describe('isTaskOverdue', () => {
    const today = new Date(2026, 9, 13); // Oct 13, 2026

    it('returns false if task has no due date', () => {
      const task = { _id: '1', title: 'Task 1', status: 'todo' } as Task;
      expect(isTaskOverdue(task, mockWorkflow, today)).toBe(false);
    });

    it('returns true if due date is strictly before today and task is not completed', () => {
      const task = {
        _id: '1',
        title: 'Overdue Task',
        status: 'todo',
        dueDate: '2026-10-12T00:00:00.000Z',
      } as Task;
      expect(isTaskOverdue(task, mockWorkflow, today)).toBe(true);
    });

    it('returns false if due date is today or in future', () => {
      const todayTask = {
        _id: '1',
        title: 'Today Task',
        status: 'todo',
        dueDate: '2026-10-13T10:00:00.000Z',
      } as Task;
      const futureTask = {
        _id: '2',
        title: 'Future Task',
        status: 'todo',
        dueDate: '2026-10-14T00:00:00.000Z',
      } as Task;
      expect(isTaskOverdue(todayTask, mockWorkflow, today)).toBe(false);
      expect(isTaskOverdue(futureTask, mockWorkflow, today)).toBe(false);
    });

    it('returns false if task is already completed or done, even if due date is past', () => {
      const doneTask = {
        _id: '1',
        title: 'Done Task',
        status: 'done',
        dueDate: '2026-10-01T00:00:00.000Z',
      } as Task;
      const completedTask = {
        _id: '2',
        title: 'Completed Task',
        status: 'todo',
        completed: true,
        dueDate: '2026-10-01T00:00:00.000Z',
      } as Task;
      expect(isTaskOverdue(doneTask, mockWorkflow, today)).toBe(false);
      expect(isTaskOverdue(completedTask, mockWorkflow, today)).toBe(false);
    });
  });

  describe('groupTasksByDate', () => {
    it('partitions tasks into scheduled date map and unscheduled list', () => {
      const tasks: Task[] = [
        { _id: '1', title: 'Task 1', dueDate: '2026-10-12T00:00:00.000Z' } as Task,
        { _id: '2', title: 'Task 2', dueDate: '2026-10-12T15:00:00.000Z' } as Task,
        { _id: '3', title: 'Task 3', dueDate: '2026-10-15T00:00:00.000Z' } as Task,
        { _id: '4', title: 'Unscheduled 1' } as Task,
        { _id: '5', title: 'Invalid date', dueDate: 'invalid-date' } as Task,
      ];

      const { scheduled, unscheduled } = groupTasksByDate(tasks);

      expect(scheduled.get('2026-10-12')?.length).toBe(2);
      expect(scheduled.get('2026-10-15')?.length).toBe(1);
      expect(scheduled.get('2026-10-13')).toBeUndefined();

      expect(unscheduled.length).toBe(2);
      expect(unscheduled.map((t) => t._id)).toEqual(['4', '5']);
    });

    it('spans task across every date from startDate to dueDate inclusive', () => {
      const taskWithRange: Task = {
        _id: '10',
        title: 'Multi-day Task',
        startDate: '2026-10-12T00:00:00.000Z',
        dueDate: '2026-10-15T00:00:00.000Z',
      } as Task;

      const { scheduled } = groupTasksByDate([taskWithRange]);

      expect(scheduled.get('2026-10-12')?.length).toBe(1);
      expect(scheduled.get('2026-10-13')?.length).toBe(1);
      expect(scheduled.get('2026-10-14')?.length).toBe(1);
      expect(scheduled.get('2026-10-15')?.length).toBe(1);
      expect(scheduled.get('2026-10-16')).toBeUndefined();
    });
  });

  describe('getTaskSpanPosition', () => {
    const multiDayTask: Task = {
      _id: '10',
      title: 'Multi-day Task',
      startDate: '2026-10-12T00:00:00.000Z',
      dueDate: '2026-10-15T00:00:00.000Z',
    } as Task;

    it('identifies start, middle, and end positions accurately', () => {
      expect(getTaskSpanPosition(multiDayTask, '2026-10-12')).toBe('start');
      expect(getTaskSpanPosition(multiDayTask, '2026-10-13')).toBe('middle');
      expect(getTaskSpanPosition(multiDayTask, '2026-10-14')).toBe('middle');
      expect(getTaskSpanPosition(multiDayTask, '2026-10-15')).toBe('end');
      expect(getTaskSpanPosition(multiDayTask, '2026-10-11')).toBe('single');
    });

    it('returns single for tasks without startDate or with single day duration', () => {
      const singleDayTask: Task = {
        _id: '11',
        title: 'Single Day Task',
        dueDate: '2026-10-12T00:00:00.000Z',
      } as Task;

      expect(getTaskSpanPosition(singleDayTask, '2026-10-12')).toBe('single');

      const sameDayTask: Task = {
        _id: '12',
        title: 'Same Day Task',
        startDate: '2026-10-12T00:00:00.000Z',
        dueDate: '2026-10-12T15:00:00.000Z',
      } as Task;

      expect(getTaskSpanPosition(sameDayTask, '2026-10-12')).toBe('single');
    });
  });
});
