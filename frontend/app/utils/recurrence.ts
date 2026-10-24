import type { RecurrenceSettings } from '../types/task';

export interface WeekdayOption {
  value: number; // 0–6 for Sunday–Saturday
  label: string;
  shortLabel: string;
}

export const WEEKDAYS: WeekdayOption[] = [
  { value: 1, label: 'Monday', shortLabel: 'Mon' },
  { value: 2, label: 'Tuesday', shortLabel: 'Tue' },
  { value: 3, label: 'Wednesday', shortLabel: 'Wed' },
  { value: 4, label: 'Thursday', shortLabel: 'Thu' },
  { value: 5, label: 'Friday', shortLabel: 'Fri' },
  { value: 6, label: 'Saturday', shortLabel: 'Sat' },
  { value: 0, label: 'Sunday', shortLabel: 'Sun' },
];

export function getDefaultRecurrenceSettings(): RecurrenceSettings {
  return {
    frequency: 'daily',
    interval: 1,
    daysOfWeek: [],
    endType: 'never',
    currentOccurrence: 1,
  };
}

export function validateRecurrenceSettings(
  settings: RecurrenceSettings,
): string | null {
  if (settings.endType === 'after_occurrences') {
    const count = Number(settings.occurrences);
    if (!Number.isInteger(count) || count < 1) {
      return 'Please specify a valid number of occurrences (at least 1)';
    }
  } else if (settings.endType === 'on_date' && !settings.endDate) {
    return 'Please select an end date for the recurrence schedule';
  }
  return null;
}

export function buildRecurrencePayload(
  settings: RecurrenceSettings,
  currentOccurrenceFallback = 1,
): RecurrenceSettings {
  return {
    frequency: settings.frequency || 'daily',
    interval: Math.max(1, Number(settings.interval) || 1),
    daysOfWeek:
      settings.frequency === 'weekly' ? [...(settings.daysOfWeek || [])] : [],
    endType: settings.endType || 'never',
    occurrences:
      settings.endType === 'after_occurrences'
        ? Number(settings.occurrences)
        : undefined,
    currentOccurrence: settings.currentOccurrence || currentOccurrenceFallback,
    endDate:
      settings.endType === 'on_date' && settings.endDate
        ? new Date(settings.endDate).toISOString()
        : undefined,
  };
}

export function formatRecurrenceLabel(settings?: RecurrenceSettings | null): string {
  if (!settings) return '';

  const interval = Math.max(1, settings.interval || 1);
  let base: string;

  switch (settings.frequency) {
    case 'daily':
      base = interval === 1 ? 'Repeats daily' : `Repeats every ${interval} days`;
      break;
    case 'weekly': {
      const selectedDays = (settings.daysOfWeek || [])
        .map((d) => {
          const match = WEEKDAYS.find((w) => w.value === d);
          return match ? match.shortLabel : '';
        })
        .filter(Boolean);

      const daysPart = selectedDays.length > 0 ? ` on ${selectedDays.join(', ')}` : '';
      base =
        interval === 1
          ? `Repeats weekly${daysPart}`
          : `Repeats every ${interval} weeks${daysPart}`;
      break;
    }
    case 'monthly':
      base = interval === 1 ? 'Repeats monthly' : `Repeats every ${interval} months`;
      break;
    case 'custom':
      base = `Repeats every ${interval} days`;
      break;
    default:
      base = 'Repeats';
  }

  if (settings.endType === 'after_occurrences' && settings.occurrences) {
    const cur = settings.currentOccurrence || 1;
    base += ` (Cycle ${cur} of ${settings.occurrences})`;
  } else if (settings.endType === 'on_date' && settings.endDate) {
    const dateStr = settings.endDate.split('T')[0];
    base += ` (until ${dateStr})`;
  } else if (settings.currentOccurrence && settings.currentOccurrence > 1) {
    base += ` (Cycle #${settings.currentOccurrence})`;
  }

  return base;
}
