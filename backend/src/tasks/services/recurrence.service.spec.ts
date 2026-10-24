import { Test, TestingModule } from '@nestjs/testing';
import { RecurrenceService } from './recurrence.service';
import { RecurrenceSettings } from '../schemas/recurrence.schema';

describe('RecurrenceService', () => {
  let service: RecurrenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecurrenceService],
    }).compile();

    service = module.get<RecurrenceService>(RecurrenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('daily recurrence', () => {
    it('advances dueDate by interval days', () => {
      const baseDue = new Date('2026-10-01T10:00:00.000Z');
      const recurrence: RecurrenceSettings = {
        frequency: 'daily',
        interval: 1,
        endType: 'never',
        currentOccurrence: 1,
      };

      const result = service.computeNextOccurrence(null, baseDue, recurrence);
      expect(result.shouldEnd).toBe(false);
      expect(result.nextOccurrence).toBe(2);
      expect(result.nextDueDate?.toISOString()).toBe(
        '2026-10-02T10:00:00.000Z',
      );
    });

    it('advances both startDate and dueDate preserving duration', () => {
      const baseStart = new Date('2026-10-01T10:00:00.000Z');
      const baseDue = new Date('2026-10-03T10:00:00.000Z');
      const recurrence: RecurrenceSettings = {
        frequency: 'daily',
        interval: 3,
        endType: 'never',
        currentOccurrence: 1,
      };

      const result = service.computeNextOccurrence(
        baseStart,
        baseDue,
        recurrence,
      );
      expect(result.shouldEnd).toBe(false);
      expect(result.nextDueDate?.toISOString()).toBe(
        '2026-10-06T10:00:00.000Z',
      );
      expect(result.nextStartDate?.toISOString()).toBe(
        '2026-10-04T10:00:00.000Z',
      );
    });
  });

  describe('weekly recurrence', () => {
    it('advances by 7 * interval days when no daysOfWeek specified', () => {
      const baseDue = new Date('2026-10-05T10:00:00.000Z'); // Monday
      const recurrence: RecurrenceSettings = {
        frequency: 'weekly',
        interval: 2,
        daysOfWeek: [],
        endType: 'never',
        currentOccurrence: 1,
      };

      const result = service.computeNextOccurrence(null, baseDue, recurrence);
      expect(result.shouldEnd).toBe(false);
      expect(result.nextDueDate?.toISOString()).toBe(
        '2026-10-19T10:00:00.000Z',
      );
    });

    it('advances to the next day in daysOfWeek within the same week', () => {
      // 2026-10-05 is Monday (day 1)
      const baseDue = new Date('2026-10-05T10:00:00.000Z');
      const recurrence: RecurrenceSettings = {
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        endType: 'never',
        currentOccurrence: 1,
      };

      const result = service.computeNextOccurrence(null, baseDue, recurrence);
      expect(result.shouldEnd).toBe(false);
      // Next day should be Wednesday (2026-10-07)
      expect(result.nextDueDate?.toISOString()).toBe(
        '2026-10-07T10:00:00.000Z',
      );
    });

    it('wraps around to the first day of next cycle when on the last day of week', () => {
      // 2026-10-09 is Friday (day 5)
      const baseDue = new Date('2026-10-09T10:00:00.000Z');
      const recurrence: RecurrenceSettings = {
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [1, 5], // Mon, Fri
        endType: 'never',
        currentOccurrence: 1,
      };

      const result = service.computeNextOccurrence(null, baseDue, recurrence);
      expect(result.shouldEnd).toBe(false);
      // Next day should be next Monday (2026-10-12)
      expect(result.nextDueDate?.toISOString()).toBe(
        '2026-10-12T10:00:00.000Z',
      );
    });
  });

  describe('monthly and custom recurrence', () => {
    it('advances monthly with interval', () => {
      const baseDue = new Date('2026-10-15T10:00:00.000Z');
      const recurrence: RecurrenceSettings = {
        frequency: 'monthly',
        interval: 1,
        endType: 'never',
        currentOccurrence: 1,
      };

      const result = service.computeNextOccurrence(null, baseDue, recurrence);
      expect(result.shouldEnd).toBe(false);
      expect(result.nextDueDate?.toISOString()).toBe(
        '2026-11-15T10:00:00.000Z',
      );
    });

    it('advances custom frequency by interval days', () => {
      const baseDue = new Date('2026-10-01T10:00:00.000Z');
      const recurrence: RecurrenceSettings = {
        frequency: 'custom',
        interval: 14,
        endType: 'never',
        currentOccurrence: 1,
      };

      const result = service.computeNextOccurrence(null, baseDue, recurrence);
      expect(result.shouldEnd).toBe(false);
      expect(result.nextDueDate?.toISOString()).toBe(
        '2026-10-15T10:00:00.000Z',
      );
    });
  });

  describe('end conditions', () => {
    it('stops recurrence after reaching maximum occurrences', () => {
      const baseDue = new Date('2026-10-01T10:00:00.000Z');
      const recurrence: RecurrenceSettings = {
        frequency: 'daily',
        interval: 1,
        endType: 'after_occurrences',
        occurrences: 3,
        currentOccurrence: 3, // next is 4 > 3
      };

      const result = service.computeNextOccurrence(null, baseDue, recurrence);
      expect(result.shouldEnd).toBe(true);
      expect(result.nextOccurrence).toBe(4);
    });

    it('stops recurrence if next date exceeds endDate', () => {
      const baseDue = new Date('2026-10-10T10:00:00.000Z');
      const recurrence: RecurrenceSettings = {
        frequency: 'daily',
        interval: 2,
        endType: 'on_date',
        endDate: new Date('2026-10-11T23:59:59.999Z'),
        currentOccurrence: 1,
      };

      // 10 + 2 = 12 > 11
      const result = service.computeNextOccurrence(null, baseDue, recurrence);
      expect(result.shouldEnd).toBe(true);
    });
  });
});
