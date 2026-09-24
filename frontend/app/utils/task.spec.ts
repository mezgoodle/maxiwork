import { describe, it, expect } from 'vitest';
import {
  getUserDisplayName,
  getUserInitials,
  getPriorityBadgeClass,
  toDateString,
  formatDateForInput,
  formatTaskDate,
} from './task';

describe('task utils', () => {
  describe('getUserDisplayName', () => {
    it('returns Unassigned for null or undefined', () => {
      expect(getUserDisplayName(null)).toBe('Unassigned');
      expect(getUserDisplayName(undefined, 'None')).toBe('None');
    });

    it('returns string user as is', () => {
      expect(getUserDisplayName('John Doe')).toBe('John Doe');
    });

    it('formats user with first and last name', () => {
      const user = {
        _id: '123',
        firstName: 'Maksym',
        lastName: 'Zavalniuk',
        email: 'max@example.com',
      };
      expect(getUserDisplayName(user)).toBe('Maksym Zavalniuk');
    });

    it('falls back to email if names are empty', () => {
      const user = {
        _id: '123',
        firstName: '',
        lastName: '',
        email: 'max@example.com',
      };
      expect(getUserDisplayName(user)).toBe('max@example.com');
    });
  });

  describe('getUserInitials', () => {
    it('returns initials from first and last name', () => {
      const user = {
        _id: '123',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      };
      expect(getUserInitials(user)).toBe('JD');
    });

    it('falls back to first letter of email', () => {
      const user = {
        _id: '123',
        firstName: '',
        lastName: '',
        email: 'alex@example.com',
      };
      expect(getUserInitials(user)).toBe('A');
    });

    it('returns fallback for null/undefined', () => {
      expect(getUserInitials(null)).toBe('?');
    });
  });

  describe('getPriorityBadgeClass', () => {
    it('returns appropriate class for low, medium, high, critical', () => {
      expect(getPriorityBadgeClass('low')).toContain('text-emerald-400');
      expect(getPriorityBadgeClass('medium')).toContain('text-amber-400');
      expect(getPriorityBadgeClass('high')).toContain('text-orange-400');
      expect(getPriorityBadgeClass('critical')).toContain('text-rose-400');
    });

    it('returns default class for unknown priority', () => {
      expect(getPriorityBadgeClass('unknown')).toContain('text-slate-400');
    });
  });

  describe('toDateString and formatDateForInput', () => {
    it('formats Date to YYYY-MM-DD', () => {
      const d = new Date(2026, 4, 15); // May 15, 2026
      expect(toDateString(d)).toBe('2026-05-15');
      expect(formatDateForInput(d)).toBe('2026-05-15');
    });

    it('returns empty string for null or invalid date', () => {
      expect(formatDateForInput(null)).toBe('');
      expect(formatDateForInput('invalid-date')).toBe('');
    });
  });

  describe('formatTaskDate', () => {
    it('formats ISO string to human date', () => {
      const result = formatTaskDate('2026-05-15T00:00:00.000Z');
      expect(result).toContain('2026');
      expect(result).toContain('May');
    });

    it('returns empty string for null or empty string', () => {
      expect(formatTaskDate(null)).toBe('');
      expect(formatTaskDate('')).toBe('');
      expect(formatTaskDate('invalid')).toBe('');
    });
  });
});
