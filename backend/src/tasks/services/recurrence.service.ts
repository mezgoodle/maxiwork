import { Injectable } from '@nestjs/common';
import { RecurrenceSettings } from '../schemas/recurrence.schema';
import { RecurrenceSettingsDto } from '../dto/recurrence.dto';
import { StatusWorkflow } from '../../hierarchy/schemas/status-workflow.schema';

export interface NextOccurrenceResult {
  nextStartDate?: Date;
  nextDueDate?: Date;
  nextOccurrence: number;
  shouldEnd: boolean;
}

@Injectable()
export class RecurrenceService {
  toRecurrenceSettings(
    dto?: RecurrenceSettingsDto | null,
    existingCurrentOccurrence?: number,
  ): RecurrenceSettings | undefined {
    if (!dto) return undefined;
    return {
      ...dto,
      currentOccurrence:
        existingCurrentOccurrence ?? dto.currentOccurrence ?? 1,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    };
  }

  applyNextRecurrenceToTask<
    T extends {
      isRecurring?: boolean;
      recurrence?: RecurrenceSettings;
      startDate?: Date;
      dueDate?: Date;
      status: string;
    },
  >(task: T, workflow?: StatusWorkflow): T {
    if (!task.isRecurring || !task.recurrence) {
      return task;
    }

    const { nextStartDate, nextDueDate, nextOccurrence, shouldEnd } =
      this.computeNextOccurrence(task.startDate, task.dueDate, task.recurrence);

    if (shouldEnd) {
      task.isRecurring = false;
    } else {
      task.startDate = nextStartDate;
      task.dueDate = nextDueDate;
      if (task.recurrence) {
        task.recurrence.currentOccurrence = nextOccurrence;
      }
      task.status = workflow?.defaultTodoStatusId || 'todo';
    }

    return task;
  }

  computeNextDates(
    startDate?: Date | null,
    dueDate?: Date | null,
    recurrence?: RecurrenceSettings | null,
  ): NextOccurrenceResult {
    return this.computeNextOccurrence(startDate, dueDate, recurrence);
  }

  computeNextOccurrence(
    startDate?: Date | null,
    dueDate?: Date | null,
    recurrence?: RecurrenceSettings | null,
  ): NextOccurrenceResult {
    const curOccurrence = recurrence?.currentOccurrence || 1;
    const nextOccurrence = curOccurrence + 1;

    if (!recurrence) {
      return {
        nextStartDate: startDate ? new Date(startDate) : undefined,
        nextDueDate: dueDate ? new Date(dueDate) : undefined,
        nextOccurrence,
        shouldEnd: true,
      };
    }

    // Check after_occurrences end condition
    if (
      recurrence.endType === 'after_occurrences' &&
      recurrence.occurrences &&
      nextOccurrence > recurrence.occurrences
    ) {
      return {
        nextStartDate: startDate ? new Date(startDate) : undefined,
        nextDueDate: dueDate ? new Date(dueDate) : undefined,
        nextOccurrence,
        shouldEnd: true,
      };
    }

    const interval = Math.max(1, recurrence.interval || 1);
    const frequency = recurrence.frequency || 'daily';

    let nextDueDate: Date | undefined;
    let nextStartDate: Date | undefined;

    if (dueDate) {
      nextDueDate = this.advanceDate(
        new Date(dueDate),
        frequency,
        interval,
        recurrence.daysOfWeek,
      );

      if (startDate) {
        const durationMs =
          new Date(dueDate).getTime() - new Date(startDate).getTime();
        nextStartDate = new Date(nextDueDate.getTime() - durationMs);
      }
    } else if (startDate) {
      nextStartDate = this.advanceDate(
        new Date(startDate),
        frequency,
        interval,
        recurrence.daysOfWeek,
      );
    } else {
      // If neither date was set, baseline from now
      nextDueDate = this.advanceDate(
        new Date(),
        frequency,
        interval,
        recurrence.daysOfWeek,
      );
    }

    // Check on_date end condition
    if (recurrence.endType === 'on_date' && recurrence.endDate) {
      const cutoff = new Date(recurrence.endDate);
      const comparisonDate = nextDueDate || nextStartDate;
      if (comparisonDate && comparisonDate.getTime() > cutoff.getTime()) {
        return {
          nextStartDate: startDate ? new Date(startDate) : undefined,
          nextDueDate: dueDate ? new Date(dueDate) : undefined,
          nextOccurrence,
          shouldEnd: true,
        };
      }
    }

    return {
      nextStartDate,
      nextDueDate,
      nextOccurrence,
      shouldEnd: false,
    };
  }

  private advanceDate(
    date: Date,
    frequency: string,
    interval: number,
    daysOfWeek?: number[],
  ): Date {
    const result = new Date(date);

    switch (frequency) {
      case 'daily':
        result.setUTCDate(result.getUTCDate() + interval);
        break;

      case 'weekly': {
        const validDays = Array.isArray(daysOfWeek)
          ? [...new Set(daysOfWeek)]
              .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
              .sort((a, b) => a - b)
          : [];

        if (validDays.length > 0) {
          const currentDay = result.getUTCDay();
          const nextDayInWeek = validDays.find((d) => d > currentDay);

          if (nextDayInWeek !== undefined) {
            result.setUTCDate(
              result.getUTCDate() + (nextDayInWeek - currentDay),
            );
          } else {
            const firstDay = validDays[0];
            const daysToFirstDay =
              7 - currentDay + firstDay + (interval - 1) * 7;
            result.setUTCDate(result.getUTCDate() + daysToFirstDay);
          }
        } else {
          result.setUTCDate(result.getUTCDate() + interval * 7);
        }
        break;
      }

      case 'monthly': {
        const originalDay = result.getUTCDate();
        result.setUTCMonth(result.getUTCMonth() + interval);
        // Handle month-overflow (e.g. Jan 31 + 1 month -> Feb 28/29)
        if (result.getUTCDate() < originalDay) {
          result.setUTCDate(0); // set to last day of previous month
        }
        break;
      }

      case 'custom':
      default:
        result.setUTCDate(result.getUTCDate() + interval);
        break;
    }

    return result;
  }
}
