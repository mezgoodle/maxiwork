import type { User } from '../types/auth';
import type { TaskPriority } from '../types/task';

/**
 * Returns a human-friendly display name for an assignee, reporter, or project member.
 */
export function getUserDisplayName(
  user?: User | string | null,
  fallback = 'Unassigned',
): string {
  if (!user) return fallback;
  if (typeof user === 'string') return user;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return fullName || user.email || fallback;
}

/**
 * Returns user initials (e.g. "JD" for John Doe) or first letter of email/string.
 */
export function getUserInitials(
  user?: User | string | null,
  fallback = '?',
): string {
  if (!user) return fallback;
  if (typeof user === 'string') {
    return user.slice(0, 2).toUpperCase() || fallback;
  }
  const first = user.firstName?.[0] || '';
  const last = user.lastName?.[0] || '';
  const initials = (first + last).toUpperCase();
  return initials || (user.email?.[0] || fallback).toUpperCase();
}

/**
 * Returns Tailwind CSS classes for priority badges.
 */
export function getPriorityBadgeClass(priority?: TaskPriority | string): string {
  switch (priority) {
    case 'low':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'medium':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'high':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'critical':
      return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    default:
      return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  }
}

/**
 * Converts a date to YYYY-MM-DD string format safely without timezone off-by-one errors.
 */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date or ISO string into YYYY-MM-DD for standard date input fields.
 */
export function formatDateForInput(date?: string | Date | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return toDateString(d);
}

/**
 * Formats an ISO date string into a clean human-readable date (e.g. "Sep 24, 2026").
 */
export function formatTaskDate(isoString?: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
