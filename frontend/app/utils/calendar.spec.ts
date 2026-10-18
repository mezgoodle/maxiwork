import { describe, it, expect } from 'vitest';
import {
  getMonthDays,
  getWeekDays,
  getMonthWeeks,
  getWeeksWithTaskSegments,
  getWeekTaskSegments,
  formatMonthYear,
  formatWeekRange,
  isTaskOverdue,
  groupTasksByDate,
  classifyTaskDateState,
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

  describe('getMonthWeeks', () => {
    it('groups 35 or 42 days into 5 or 6 rows of 7 days each', () => {
      const weeks35 = getMonthWeeks(2026, 9); // Oct 2026 -> 35 cells
      expect(weeks35.length).toBe(5);
      expect(weeks35[0].length).toBe(7);
      expect(weeks35[4].length).toBe(7);

      const weeks42 = getMonthWeeks(2026, 7); // Aug 2026 -> 42 cells
      expect(weeks42.length).toBe(6);
      expect(weeks42[5].length).toBe(7);
    });
  });

  describe('getWeekTaskSegments', () => {
    it('creates single continuous segments with grid-column startCol and span', () => {
      const weekDays = getWeekDays(new Date(2026, 9, 14)); // Oct 12 (Mon) to Oct 18 (Sun)
      const tasks: Task[] = [
        {
          _id: 't1',
          title: 'Single Day',
          dueDate: '2026-10-14', // Wed (col 3)
        } as Task,
        {
          _id: 't2',
          title: 'Multi-Day',
          startDate: '2026-10-13', // Tue (col 2)
          dueDate: '2026-10-16', // Fri (col 5)
        } as Task,
      ];

      const segments = getWeekTaskSegments(weekDays, tasks);
      expect(segments.length).toBe(2);

      const multiSeg = segments.find((s) => s.task._id === 't2');
      expect(multiSeg).toBeDefined();
      expect(multiSeg?.startCol).toBe(2); // Tuesday
      expect(multiSeg?.span).toBe(4); // Tue, Wed, Thu, Fri -> 4 days
      expect(multiSeg?.isStartOfTask).toBe(true);
      expect(multiSeg?.isEndOfTask).toBe(true);

      const singleSeg = segments.find((s) => s.task._id === 't1');
      expect(singleSeg).toBeDefined();
      expect(singleSeg?.startCol).toBe(3); // Wednesday
      expect(singleSeg?.span).toBe(1);
    });

    it('clamps multi-day tasks crossing week boundaries and marks start/end accurately', () => {
      // Oct 12 (Mon) to Oct 18 (Sun)
      const week1 = getWeekDays(new Date(2026, 9, 14));
      // Task spans from Oct 13 (Tue) to Oct 20 (Tue of next week)
      const spanningTask: Task = {
        _id: 't-cross',
        title: 'Crossing Task',
        startDate: '2026-10-13',
        dueDate: '2026-10-20',
      } as Task;

      const week1Segs = getWeekTaskSegments(week1, [spanningTask]);
      expect(week1Segs.length).toBe(1);
      expect(week1Segs[0].startCol).toBe(2); // Tuesday
      expect(week1Segs[0].span).toBe(6); // Tue to Sun
      expect(week1Segs[0].isStartOfTask).toBe(true);
      expect(week1Segs[0].isEndOfTask).toBe(false);

      // Week 2: Oct 19 (Mon) to Oct 25 (Sun)
      const week2 = getWeekDays(new Date(2026, 9, 21));
      const week2Segs = getWeekTaskSegments(week2, [spanningTask]);
      expect(week2Segs.length).toBe(1);
      expect(week2Segs[0].startCol).toBe(1); // Monday
      expect(week2Segs[0].span).toBe(2); // Mon to Tue
      expect(week2Segs[0].isStartOfTask).toBe(false);
      expect(week2Segs[0].isEndOfTask).toBe(true);
    });

    it('preserves vertical rowSlot consistently across week transitions (Sunday to Monday)', () => {
      // Oct 12 to Oct 18 (Week 1)
      const week1 = getWeekDays(new Date(2026, 9, 14));
      // Oct 19 to Oct 25 (Week 2)
      const week2 = getWeekDays(new Date(2026, 9, 21));

      // Task A: Oct 13 to Oct 21 (crosses week boundary, spans 6 days in W1, 3 days in W2)
      const taskA: Task = {
        _id: 'task-a',
        title: 'Task A',
        startDate: '2026-10-13',
        dueDate: '2026-10-21',
      } as Task;

      // Task B: Oct 18 to Oct 25 (starts on Sunday of W1, spans all 7 days of W2)
      const taskB: Task = {
        _id: 'task-b',
        title: 'Task B',
        startDate: '2026-10-18',
        dueDate: '2026-10-25',
      } as Task;

      // Process both weeks together via getWeeksWithTaskSegments
      const weeks = getWeeksWithTaskSegments([week1, week2], [taskA, taskB]);
      expect(weeks.length).toBe(2);

      const [w1, w2] = weeks;

      // In Week 1: Task A started first (span 6), Task B on Sunday (span 1)
      const w1SegA = w1.segments.find((s) => s.task._id === 'task-a')!;
      const w1SegB = w1.segments.find((s) => s.task._id === 'task-b')!;
      expect(w1SegA.rowSlot).toBe(1);
      expect(w1SegB.rowSlot).toBe(2);

      // In Week 2: Even though Task B has longer span (7 days vs 3 days),
      // both tasks MUST retain their rowSlot from Sunday so lines do not swap!
      const w2SegA = w2.segments.find((s) => s.task._id === 'task-a')!;
      const w2SegB = w2.segments.find((s) => s.task._id === 'task-b')!;
      expect(w2SegA.rowSlot).toBe(1);
      expect(w2SegB.rowSlot).toBe(2);
    });
  });

  describe('classifyTaskDateState', () => {
    it('classifies task as range when startDate and dueDate are distinct', () => {
      const task = {
        _id: '1',
        startDate: '2026-10-12',
        dueDate: '2026-10-15',
      } as Task;
      expect(classifyTaskDateState(task)).toBe('range');
    });

    it('classifies task as milestone when only dueDate is set or startDate equals dueDate', () => {
      const taskDueOnly = {
        _id: '2',
        dueDate: '2026-10-15',
      } as Task;
      expect(classifyTaskDateState(taskDueOnly)).toBe('milestone');

      const taskSameDay = {
        _id: '3',
        startDate: '2026-10-15T09:00:00',
        dueDate: '2026-10-15T18:00:00',
      } as Task;
      expect(classifyTaskDateState(taskSameDay)).toBe('milestone');
    });

    it('classifies task as event when only startDate is set', () => {
      const taskStartOnly = {
        _id: '4',
        startDate: '2026-10-12',
      } as Task;
      expect(classifyTaskDateState(taskStartOnly)).toBe('event');
    });

    it('classifies task as unscheduled when no dates are set', () => {
      const taskNoDates = { _id: '5' } as Task;
      expect(classifyTaskDateState(taskNoDates)).toBe('unscheduled');
    });
  });
});
