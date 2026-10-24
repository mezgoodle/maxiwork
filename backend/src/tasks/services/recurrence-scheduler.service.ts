import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
    cache?: Map<string, StatusWorkflow | undefined>,
  ): Promise<StatusWorkflow | undefined> {
    if (!listRef || !this.listModel) return undefined;
    const listId = this.extractId(listRef);
    if (!listId || !Types.ObjectId.isValid(listId)) return undefined;

    if (cache && cache.has(listId)) {
      return cache.get(listId);
    }

    let resolved: StatusWorkflow | undefined;
    try {
      const list = await this.listModel.findById(listId).lean().exec();
      if (list) {
        if (list.statusWorkflow?.statuses?.length) {
          resolved = list.statusWorkflow;
        } else if (list.spaceId && this.spaceModel) {
          const space = await this.spaceModel
            .findById(list.spaceId)
            .lean()
            .exec();
          if (space?.statusWorkflow?.statuses?.length) {
            resolved = space.statusWorkflow;
          }
        }
      }
    } catch {
      resolved = undefined;
    }

    if (cache) {
      cache.set(listId, resolved);
    }
    return resolved;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleRecurringTasksScan(): Promise<number> {
    this.logger.debug(
      'Scanning for recurring tasks needing date progression...',
    );

    const workflowCache = new Map<string, StatusWorkflow | undefined>();
    const batchSize = 100;
    let lastId: Types.ObjectId | undefined;
    let advancedCount = 0;

    while (true) {
      const query: Record<string, unknown> = {
        isRecurring: true,
        recurrence: { $ne: null },
        ...(lastId ? { _id: { $gt: lastId } } : {}),
      };

      const recurringTasks = await this.taskModel
        .find(query)
        .sort({ _id: 1 })
        .select(
          '_id status startDate dueDate list parentTaskId isRecurring recurrence',
        )
        .limit(batchSize)
        .lean()
        .exec();

      if (!recurringTasks || recurringTasks.length === 0) {
        break;
      }

      lastId = recurringTasks[recurringTasks.length - 1]._id;

      for (const task of recurringTasks) {
        const workflow = await this.getEffectiveWorkflowForList(
          task.list,
          workflowCache,
        );
        const isDone = isStatusDone(task.status, workflow);

        if (isDone && task.recurrence) {
          const curOccurrence = task.recurrence.currentOccurrence || 1;
          const { nextStartDate, nextDueDate, nextOccurrence, shouldEnd } =
            this.recurrenceService.computeNextOccurrence(
              task.startDate,
              task.dueDate,
              task.recurrence,
            );

          const filter: Record<string, unknown> = {
            _id: task._id,
            status: task.status,
            isRecurring: true,
            $or: [
              { 'recurrence.currentOccurrence': curOccurrence },
              ...(curOccurrence === 1
                ? [{ 'recurrence.currentOccurrence': { $exists: false } }]
                : []),
            ],
          };

          const updatePayload = shouldEnd
            ? { $set: { isRecurring: false } }
            : {
                $set: {
                  startDate: nextStartDate,
                  dueDate: nextDueDate,
                  'recurrence.currentOccurrence': nextOccurrence,
                  status: workflow?.defaultTodoStatusId || 'todo',
                },
              };

          const updateResult = await this.taskModel
            .updateOne(filter, updatePayload)
            .exec();

          if (updateResult.modifiedCount === 1) {
            advancedCount++;
            if (!shouldEnd && task.parentTaskId) {
              const parentId = this.extractId(task.parentTaskId);
              if (parentId && Types.ObjectId.isValid(parentId)) {
                await this.taskModel
                  .updateOne(
                    {
                      _id: new Types.ObjectId(parentId),
                      completedSubtasksCount: { $gt: 0 },
                    },
                    { $inc: { completedSubtasksCount: -1 } },
                  )
                  .exec();
              }
            }
          }
        }
      }

      if (recurringTasks.length < batchSize) {
        break;
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
