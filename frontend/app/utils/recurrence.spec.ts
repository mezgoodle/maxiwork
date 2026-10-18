import { describe, expect, it } from 'vitest';
import {
  formatRecurrenceLabel,
  getDefaultRecurrenceSettings,
  WEEKDAYS,
} from './recurrence';
import type { RecurrenceSettings } from '../types/task';

describe('recurrence utils', () => {
  it('returns default recurrence settings', () => {
    const defaults = getDefaultRecurrenceSettings();
    expect(defaults.frequency).toBe('daily');
    expect(defaults.interval).toBe(1);
    expect(defaults.daysOfWeek).toEqual([]);
    expect(defaults.endType).toBe('never');
    expect(defaults.currentOccurrence).toBe(1);
  });

  it('formats daily recurrence', () => {
    expect(formatRecurrenceLabel({ frequency: 'daily', interval: 1, endType: 'never', currentOccurrence: 1 })).toBe('Daily');
    expect(formatRecurrenceLabel({ frequency: 'daily', interval: 3, endType: 'never', currentOccurrence: 1 })).toBe('Every 3 days');
  });

  it('formats weekly recurrence with days', () => {
    const settings: RecurrenceSettings = {
      frequency: 'weekly',
      interval: 1,
      daysOfWeek: [1, 5],
      endType: 'never',
      currentOccurrence: 1,
    };
    expect(formatRecurrenceLabel(settings)).toBe('Weekly on Mon, Fri');

    const biweekly: RecurrenceSettings = {
      frequency: 'weekly',
      interval: 2,
      daysOfWeek: [2, 4],
      endType: 'never',
      currentOccurrence: 1,
    };
    expect(formatRecurrenceLabel(biweekly)).toBe('Every 2 weeks on Tue, Thu');
  });

  it('formats monthly and custom recurrence', () => {
    expect(formatRecurrenceLabel({ frequency: 'monthly', interval: 1, endType: 'never', currentOccurrence: 1 })).toBe('Monthly');
    expect(formatRecurrenceLabel({ frequency: 'monthly', interval: 2, endType: 'never', currentOccurrence: 1 })).toBe('Every 2 months');
    expect(formatRecurrenceLabel({ frequency: 'custom', interval: 10, endType: 'never', currentOccurrence: 1 })).toBe('Every 10 days');
  });

  it('formats end conditions and cycle counters', () => {
    const countSettings: RecurrenceSettings = {
      frequency: 'daily',
      interval: 1,
      endType: 'after_occurrences',
      occurrences: 5,
      currentOccurrence: 2,
    };
    expect(formatRecurrenceLabel(countSettings)).toBe('Daily (Cycle 2 of 5)');

    const dateSettings: RecurrenceSettings = {
      frequency: 'weekly',
      interval: 1,
      daysOfWeek: [],
      endType: 'on_date',
      endDate: '2026-12-31T00:00:00.000Z',
      currentOccurrence: 1,
    };
    expect(formatRecurrenceLabel(dateSettings)).toBe('Weekly (until 2026-12-31)');

    const cycleSettings: RecurrenceSettings = {
      frequency: 'monthly',
      interval: 1,
      endType: 'never',
      currentOccurrence: 4,
    };
    expect(formatRecurrenceLabel(cycleSettings)).toBe('Monthly (Cycle #4)');
  });

  it('handles null/undefined gracefully', () => {
    expect(formatRecurrenceLabel(null)).toBe('');
    expect(formatRecurrenceLabel(undefined)).toBe('');
  });

  it('has 7 days defined in order', () => {
    expect(WEEKDAYS).toHaveLength(7);
  });
});
