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
 * and an array of unscheduled tasks (tasks without dueDate).
 */
export function groupTasksByDate(tasks: Task[]): TaskCalendarPartition {
  const scheduled = new Map<string, Task[]>();
  const unscheduled: Task[] = [];

  for (const task of tasks) {
    if (!task.dueDate) {
      unscheduled.push(task);
      continue;
    }

    const d = new Date(task.dueDate);
    if (Number.isNaN(d.getTime())) {
      unscheduled.push(task);
      continue;
    }

    const key = toDateString(d);
    const existing = scheduled.get(key) || [];
    existing.push(task);
    scheduled.set(key, existing);
  }

  return { scheduled, unscheduled };
}
