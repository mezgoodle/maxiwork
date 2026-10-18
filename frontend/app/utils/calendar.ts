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
 * Safely extracts the YYYY-MM-DD date key from a Date or ISO string,
 * avoiding timezone offset shifts when working with date-only values.
 */
export function toTaskDateKey(val: string | Date | null | undefined): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = new Date(val);
    if (!Number.isNaN(parsed.getTime())) return toDateString(parsed);
    return '';
  }
  return toDateString(val);
}

/**
 * Classifies a task based on Rule of 4 States:
 * 1. range: has both startDate and dueDate, and startDate < dueDate (different days).
 * 2. milestone: has only dueDate (or startDate === dueDate).
 * 3. event: has only startDate.
 * 4. unscheduled: neither startDate nor dueDate is set.
 */
export function classifyTaskDateState(task: Task): TaskDateState {
  const startStr = toTaskDateKey(task.startDate);
  const dueStr = toTaskDateKey(task.dueDate);

  if (!startStr && !dueStr) return 'unscheduled';
  if (startStr && dueStr) {
    return startStr < dueStr ? 'range' : 'milestone';
  }
  if (dueStr) return 'milestone';
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

    const startStr = toTaskDateKey(task.startDate);
    const dueStr = toTaskDateKey(task.dueDate);

    if (state === 'range') {
      const [sY, sM, sD] = startStr.split('-').map(Number);
      const [dY, dM, dD] = dueStr.split('-').map(Number);
      const current = new Date(sY, sM - 1, sD);
      const end = new Date(dY, dM - 1, dD);

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
      const existing = scheduled.get(startStr) || [];
      existing.push(task);
      scheduled.set(startStr, existing);
      continue;
    }

    // state === 'milestone'
    const existing = scheduled.get(dueStr) || [];
    existing.push(task);
    scheduled.set(dueStr, existing);
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
  rowSlot: number; // 1-based vertical track/row slot in the week
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
 * Calculates continuous task segments with persistent rowSlot packing across week boundaries.
 * Tasks spanning across multiple weeks maintain their exact vertical track (rowSlot) from Sunday to Monday!
 */
export function getWeeksWithTaskSegments(
  weeks: CalendarDay[][],
  tasks: Task[],
): CalendarWeek[] {
  const result: CalendarWeek[] = [];
  let prevSundaySlots = new Map<string, number>();

  for (const weekDays of weeks) {
    if (weekDays.length !== 7) {
      result.push({ days: weekDays, segments: [] });
      continue;
    }

    const weekStartStr = weekDays[0].dateString;
    const weekEndStr = weekDays[6].dateString;

    interface RawSegment {
      task: Task;
      startCol: number;
      span: number;
      isStartOfTask: boolean;
      isEndOfTask: boolean;
    }

    const rawSegments: RawSegment[] = [];

    for (const task of tasks) {
      let startStr = toTaskDateKey(task.startDate);
      let dueStr = toTaskDateKey(task.dueDate);

      if (!startStr && !dueStr) continue;

      // If only one date is present, or startDate > dueDate: single day task
      if (startStr && !dueStr) {
        dueStr = startStr;
      } else if (dueStr && !startStr) {
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

      rawSegments.push({
        task,
        startCol,
        span,
        isStartOfTask: startStr === clampedStartStr,
        isEndOfTask: dueStr === clampedEndStr,
      });
    }

    // Grid of occupied tracks: trackOccupied[row][col] (row >= 1, col: 1..7)
    const trackOccupied: boolean[][] = [];

    const isTrackFree = (row: number, startCol: number, span: number): boolean => {
      if (!trackOccupied[row]) return true;
      for (let c = startCol; c < startCol + span; c++) {
        if (trackOccupied[row][c]) return false;
      }
      return true;
    };

    const occupyTrack = (row: number, startCol: number, span: number) => {
      if (!trackOccupied[row]) {
        trackOccupied[row] = [];
      }
      for (let c = startCol; c < startCol + span; c++) {
        trackOccupied[row][c] = true;
      }
    };

    const assignedSegments: CalendarTaskSegment[] = [];
    const unassignedRaw: RawSegment[] = [];

    // Step 1: Preserve rowSlot for tasks continuing from the previous week's Sunday
    for (const raw of rawSegments) {
      if (!raw.isStartOfTask && prevSundaySlots.has(raw.task._id)) {
        const preferredRow = prevSundaySlots.get(raw.task._id)!;
        if (isTrackFree(preferredRow, raw.startCol, raw.span)) {
          occupyTrack(preferredRow, raw.startCol, raw.span);
          assignedSegments.push({
            ...raw,
            rowSlot: preferredRow,
          });
          continue;
        }
      }
      unassignedRaw.push(raw);
    }

    // Step 2: Sort remaining unassigned segments by span descending, then startCol
    unassignedRaw.sort((a, b) => {
      if (b.span !== a.span) return b.span - a.span;
      return a.startCol - b.startCol;
    });

    // Step 3: Assign the lowest available track for each unassigned segment
    for (const raw of unassignedRaw) {
      let r = 1;
      while (!isTrackFree(r, raw.startCol, raw.span)) {
        r++;
      }
      occupyTrack(r, raw.startCol, raw.span);
      assignedSegments.push({
        ...raw,
        rowSlot: r,
      });
    }

    // Step 4: Record Sunday slots for tasks continuing into next week
    const currentSundaySlots = new Map<string, number>();
    for (const seg of assignedSegments) {
      if (seg.startCol + seg.span - 1 === 7 && !seg.isEndOfTask) {
        currentSundaySlots.set(seg.task._id, seg.rowSlot);
      }
    }
    prevSundaySlots = currentSundaySlots;

    // Step 5: Sort segments in DOM order (rowSlot asc, then startCol asc)
    assignedSegments.sort((a, b) => {
      if (a.rowSlot !== b.rowSlot) return a.rowSlot - b.rowSlot;
      return a.startCol - b.startCol;
    });

    result.push({
      days: weekDays,
      segments: assignedSegments,
    });
  }

  return result;
}

/**
 * Calculates continuous task segments for a single 7-day week row.
 */
export function getWeekTaskSegments(weekDays: CalendarDay[], tasks: Task[]): CalendarTaskSegment[] {
  const [week] = getWeeksWithTaskSegments([weekDays], tasks);
  return week ? week.segments : [];
}

export interface RescheduledTaskDates {
  startDate?: string;
  dueDate?: string;
}

/**
 * Calculates updated startDate and/or dueDate when a task is dropped onto a calendar date,
 * conforming strictly to the Rule of 4 States and timezone-safe UTC calendar-day arithmetic:
 * - Event (only startDate): updates startDate to targetDateStr.
 * - Milestone (only dueDate or single-day): updates dueDate to targetDateStr.
 * - Range (startDate < dueDate): anchors new startDate at targetDateStr and maintains exact duration in days.
 * - Unscheduled: sets dueDate to targetDateStr.
 */
export function calculateRescheduledDates(
  task: Task,
  targetDateStr: string,
): RescheduledTaskDates {
  const state = classifyTaskDateState(task);

  if (state === 'event') {
    return { startDate: targetDateStr };
  }

  if (state === 'milestone') {
    return { dueDate: targetDateStr };
  }

  if (state === 'range') {
    const sStr = toTaskDateKey(task.startDate);
    const dStr = toTaskDateKey(task.dueDate);
    const [sY, sM, sD] = sStr.split('-').map(Number);
    const [dY, dM, dD] = dStr.split('-').map(Number);
    const sUtc = Date.UTC(sY, sM - 1, sD);
    const dUtc = Date.UTC(dY, dM - 1, dD);
    const diffDays = Math.max(1, Math.round((dUtc - sUtc) / (1000 * 60 * 60 * 24)));

    const [tY, tM, tD] = targetDateStr.split('-').map(Number);
    const newEndUtc = new Date(Date.UTC(tY, tM - 1, tD + diffDays));
    const newEndStr = toDateString(newEndUtc);

    return {
      startDate: targetDateStr,
      dueDate: newEndStr,
    };
  }

  // unscheduled
  return { dueDate: targetDateStr };
}
