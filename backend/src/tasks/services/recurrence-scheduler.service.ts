import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from '../schemas/task.schema';
import { RecurrenceService } from './recurrence.service';
import { List, ListDocument } from '../../hierarchy/schemas/list.schema';
import { Space, SpaceDocument } from '../../hierarchy/schemas/space.schema';
import {
  StatusWorkflow,
  isStatusDone,
} from '../../hierarchy/schemas/status-workflow.schema';

@Injectable()
export class RecurrenceSchedulerService {
  private readonly logger = new Logger(RecurrenceSchedulerService.name);

  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    private readonly recurrenceService: RecurrenceService,
    @Optional()
    @InjectModel(List.name)
    private readonly listModel?: Model<ListDocument>,
    @Optional()
    @InjectModel(Space.name)
    private readonly spaceModel?: Model<SpaceDocument>,
  ) {}

  private extractId(ref: unknown): string {
    if (!ref) return '';
    if (typeof ref === 'object') {
      if ('_id' in (ref as Record<string, unknown>)) {
        const idVal = (ref as Record<string, unknown>)._id;
        return typeof idVal === 'string'
          ? idVal
          : typeof (idVal as { toString?: () => string })?.toString ===
              'function'
            ? (idVal as { toString: () => string }).toString()
            : '';
      }
      if (typeof (ref as { toString?: () => string }).toString === 'function') {
        return (ref as { toString(): string }).toString();
      }
    }
    return typeof ref === 'string' ? ref : '';
  }

  private async getEffectiveWorkflowForList(
    listRef: unknown,
  ): Promise<StatusWorkflow | undefined> {
    if (!listRef || !this.listModel) return undefined;
    try {
      const listId = this.extractId(listRef);
      if (!listId) return undefined;
      const list = await this.listModel.findById(listId).lean().exec();
      if (!list) return undefined;
      if (list.statusWorkflow?.statuses?.length) {
        return list.statusWorkflow;
      }
      if (list.spaceId && this.spaceModel) {
        const space = await this.spaceModel
          .findById(list.spaceId)
          .lean()
          .exec();
        if (space?.statusWorkflow?.statuses?.length) {
          return space.statusWorkflow;
        }
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleRecurringTasksScan(): Promise<number> {
    this.logger.debug(
      'Scanning for recurring tasks needing date progression...',
    );

    const recurringTasks = await this.taskModel
      .find({
        isRecurring: true,
        recurrence: { $ne: null },
      })
      .exec();

    let advancedCount = 0;

    for (const task of recurringTasks) {
      const workflow = await this.getEffectiveWorkflowForList(task.list);
      const isDone = isStatusDone(task.status, workflow);

      // If a recurring task is in done/closed status, advance it
      if (isDone) {
        const { nextStartDate, nextDueDate, nextOccurrence, shouldEnd } =
          this.recurrenceService.computeNextOccurrence(
            task.startDate,
            task.dueDate,
            task.recurrence,
          );

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

        await task.save();
        advancedCount++;
      }
    }

    if (advancedCount > 0) {
      this.logger.log(
        `Advanced ${advancedCount} recurring task(s) to their next cycle.`,
      );
    }

    return advancedCount;
  }
}
