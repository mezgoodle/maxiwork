import type { Task } from '../types/task';
import type { StatusWorkflow } from '../types/hierarchy';
import { toDateString } from './task';
import { isTaskCompleted } from './table-view';

export interface CalendarDay {
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export type CalendarViewMode = 'month' | 'week';

export type TaskDateState = 'range' | 'milestone' | 'event' | 'unscheduled';

/**
 * Classifies a task based on Rule of 4 States:
 * 1. range: has both startDate and dueDate, and startDate < dueDate (different days).
 * 2. milestone: has only dueDate (or startDate === dueDate).
 * 3. event: has only startDate.
 * 4. unscheduled: neither startDate nor dueDate is set.
 */
export function classifyTaskDateState(task: Task): TaskDateState {
  const hasStart = !!task.startDate && !Number.isNaN(new Date(task.startDate).getTime());
  const hasDue = !!task.dueDate && !Number.isNaN(new Date(task.dueDate).getTime());

  if (!hasStart && !hasDue) return 'unscheduled';
  if (hasStart && hasDue) {
    const sStr = toDateString(new Date(task.startDate!));
    const dStr = toDateString(new Date(task.dueDate!));
    return sStr < dStr ? 'range' : 'milestone';
  }
  if (hasDue) return 'milestone';
  return 'event';
}

/**
 * Returns an array of calendar days for a 35 or 42 grid cell month view.
 * The week always starts on Monday (ISO 8601).
 */
export function getMonthDays(year: number, monthIndex: number, referenceToday: Date = new Date()): CalendarDay[] {
  const todayStr = toDateString(referenceToday);
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

  // ISO day: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // In Monday-first calendar: Mon = 0, Tue = 1, ..., Sun = 6
  let firstDayWeekday = firstDayOfMonth.getDay() - 1;
  if (firstDayWeekday === -1) firstDayWeekday = 6;

  const totalDaysInMonth = lastDayOfMonth.getDate();
  const days: CalendarDay[] = [];

  // Previous month padding
  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const dayNumber = prevMonthLastDay - i;
    const d = new Date(year, monthIndex - 1, dayNumber);
    const dateString = toDateString(d);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    days.push({
      date: d,
      dateString,
      dayNumber,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      isWeekend,
    });
  }

  // Current month days
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const dateString = toDateString(d);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    days.push({
      date: d,
      dateString,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateString === todayStr,
      isWeekend,
    });
  }

  // Next month padding to fill out 35 or 42 cells (5 or 6 weeks)
  const remainingCells = (7 - (days.length % 7)) % 7;
  // If the total is 35 or less and we need a consistent grid, or if it fits exactly
  const targetTotal = days.length + remainingCells <= 35 ? 35 : 42;
  const paddingNeeded = targetTotal - days.length;

  for (let day = 1; day <= paddingNeeded; day++) {
    const d = new Date(year, monthIndex + 1, day);
    const dateString = toDateString(d);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    days.push({
      date: d,
      dateString,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      isWeekend,
    });
  }

  return days;
}

/**
 * Returns an array of 7 calendar days (Monday to Sunday) for the week containing `baseDate`.
 */
export function getWeekDays(baseDate: Date, referenceToday: Date = new Date()): CalendarDay[] {
  const todayStr = toDateString(referenceToday);
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  let weekday = d.getDay() - 1; // 0 = Mon, 6 = Sun
  if (weekday === -1) weekday = 6;

  // Monday of this week
  const monday = new Date(d);
  monday.setDate(d.getDate() - weekday);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const dateString = toDateString(current);
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;

    days.push({
      date: current,
      dateString,
      dayNumber: current.getDate(),
      isCurrentMonth: current.getMonth() === baseDate.getMonth(),
      isToday: dateString === todayStr,
      isWeekend,
    });
  }

  return days;
}

/**
 * Formats a date into a localized "Month YYYY" string (e.g. "October 2026").
 */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formats a week range into a string (e.g. "Oct 12 – Oct 18, 2026" or "Dec 28, 2026 – Jan 3, 2027").
 */
export function formatWeekRange(startDate: Date, endDate: Date): string {
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (startYear !== endYear) {
    return `${startMonth} ${startDate.getDate()}, ${startYear} – ${endMonth} ${endDate.getDate()}, ${endYear}`;
  }

  if (startMonth !== endMonth) {
    return `${startMonth} ${startDate.getDate()} – ${endMonth} ${endDate.getDate()}, ${startYear}`;
  }

  return `${startMonth} ${startDate.getDate()} – ${endDate.getDate()}, ${startYear}`;
}

/**
 * Checks if a task is overdue (dueDate is in the past calendar day and task is not completed).
 */
export function isTaskOverdue(
  task: Task,
  workflow?: StatusWorkflow | null,
  referenceToday: Date = new Date(),
): boolean {
  if (!task.dueDate) return false;
  if (isTaskCompleted(task, workflow)) return false;

  const taskDate = new Date(task.dueDate);
  if (Number.isNaN(taskDate.getTime())) return false;

  const taskDateStr = toDateString(taskDate);
  const todayStr = toDateString(referenceToday);

  return taskDateStr < todayStr;
}

export interface TaskCalendarPartition {
  scheduled: Map<string, Task[]>;
  unscheduled: Task[];
}

/**
 * Partitions tasks into a Map keyed by YYYY-MM-DD for scheduled tasks,
 * and an array of unscheduled tasks based on the Rule of 4 States:
 * 1. Range (startDate < dueDate): populated across every date in [startDate, dueDate].
 * 2. Milestone (only dueDate or startDate === dueDate): placed only on dueDate.
 * 3. Event (only startDate): placed only on startDate.
 * 4. Unscheduled (no dates): placed into unscheduled array.
 */
export function groupTasksByDate(tasks: Task[]): TaskCalendarPartition {
  const scheduled = new Map<string, Task[]>();
  const unscheduled: Task[] = [];

  for (const task of tasks) {
    const state = classifyTaskDateState(task);

    if (state === 'unscheduled') {
      unscheduled.push(task);
      continue;
    }

    if (state === 'range') {
      const startD = new Date(task.startDate!);
      const dueD = new Date(task.dueDate!);
      const current = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate());
      const end = new Date(dueD.getFullYear(), dueD.getMonth(), dueD.getDate());

      while (current <= end) {
        const key = toDateString(current);
        const existing = scheduled.get(key) || [];
        existing.push(task);
        scheduled.set(key, existing);
        current.setDate(current.getDate() + 1);
      }
      continue;
    }

    if (state === 'event') {
      const startD = new Date(task.startDate!);
      const key = toDateString(startD);
      const existing = scheduled.get(key) || [];
      existing.push(task);
      scheduled.set(key, existing);
      continue;
    }

    // state === 'milestone'
    const dueD = new Date(task.dueDate!);
    const key = toDateString(dueD);
    const existing = scheduled.get(key) || [];
    existing.push(task);
    scheduled.set(key, existing);
  }

  return { scheduled, unscheduled };
}

export interface CalendarWeek {
  days: CalendarDay[];
  segments: CalendarTaskSegment[];
}

export interface CalendarTaskSegment {
  task: Task;
  startCol: number; // 1 to 7 (Mon=1, Sun=7)
  span: number; // 1 to 7
  isStartOfTask: boolean;
  isEndOfTask: boolean;
}

/**
 * Returns month days grouped into weeks of 7 days each.
 */
export function getMonthWeeks(year: number, monthIndex: number, referenceToday: Date = new Date()): CalendarDay[][] {
  const days = getMonthDays(year, monthIndex, referenceToday);
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

/**
 * Calculates continuous task segments for a given 7-day week row.
 * Tasks spanning across multiple days in this week get a single segment with grid-column start and span!
 */
export function getWeekTaskSegments(weekDays: CalendarDay[], tasks: Task[]): CalendarTaskSegment[] {
  if (weekDays.length !== 7) return [];

  const weekStartStr = weekDays[0].dateString;
  const weekEndStr = weekDays[6].dateString;

  const segments: CalendarTaskSegment[] = [];

  for (const task of tasks) {
    const hasStart = !!task.startDate && !Number.isNaN(new Date(task.startDate).getTime());
    const hasDue = !!task.dueDate && !Number.isNaN(new Date(task.dueDate).getTime());

    if (!hasStart && !hasDue) continue;

    let startStr = hasStart ? toDateString(new Date(task.startDate!)) : '';
    let dueStr = hasDue ? toDateString(new Date(task.dueDate!)) : '';

    // If only one date is present, or startDate > dueDate: single day task
    if (hasStart && !hasDue) {
      dueStr = startStr;
    } else if (hasDue && !hasStart) {
      startStr = dueStr;
    } else if (startStr > dueStr) {
      // Inconsistent: fallback to due date
      startStr = dueStr;
    }

    // Check if task overlaps with this week [weekStartStr, weekEndStr]
    if (dueStr < weekStartStr || startStr > weekEndStr) {
      continue;
    }

    // Determine segment bounds clamped to this week
    const clampedStartStr = startStr < weekStartStr ? weekStartStr : startStr;
    const clampedEndStr = dueStr > weekEndStr ? weekEndStr : dueStr;

    // Find 1-based column indices (1 to 7)
    const startIndex = weekDays.findIndex((d) => d.dateString === clampedStartStr);
    const endIndex = weekDays.findIndex((d) => d.dateString === clampedEndStr);

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) continue;

    const startCol = startIndex + 1;
    const span = endIndex - startIndex + 1;

    segments.push({
      task,
      startCol,
      span,
      isStartOfTask: startStr === clampedStartStr,
      isEndOfTask: dueStr === clampedEndStr,
    });
  }

  // Sort multi-day segments first (longer spans first, then by taskKey)
  segments.sort((a, b) => {
    if (b.span !== a.span) return b.span - a.span;
    return a.startCol - b.startCol;
  });

  return segments;
}
