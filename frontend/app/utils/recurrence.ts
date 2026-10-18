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

export function formatRecurrenceLabel(settings?: RecurrenceSettings | null): string {
  if (!settings) return '';

  const interval = Math.max(1, settings.interval || 1);
  let base: string;

  switch (settings.frequency) {
    case 'daily':
      base = interval === 1 ? 'Daily' : `Every ${interval} days`;
      break;
    case 'weekly': {
      const selectedDays = (settings.daysOfWeek || [])
        .map((d) => {
          const match = WEEKDAYS.find((w) => w.value === d);
          return match ? match.shortLabel : '';
        })
        .filter(Boolean);

      const daysPart = selectedDays.length > 0 ? ` on ${selectedDays.join(', ')}` : '';
      base = interval === 1 ? `Weekly${daysPart}` : `Every ${interval} weeks${daysPart}`;
      break;
    }
    case 'monthly':
      base = interval === 1 ? 'Monthly' : `Every ${interval} months`;
      break;
    case 'custom':
      base = `Every ${interval} days`;
      break;
    default:
      base = 'Recurring';
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
