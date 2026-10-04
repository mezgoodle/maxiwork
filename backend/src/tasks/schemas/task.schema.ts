import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Project } from '../../projects/schemas/project.schema';
import { User } from '../../users/schemas/user.schema';
import { TaskPriority } from '../enums/task-priority.enum';

export type TaskDocument = HydratedDocument<Task>;

@Schema({
  timestamps: true,
})
export class Task {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true, default: '' })
  description?: string;

  @Prop({
    type: String,
    default: 'todo',
    required: true,
    trim: true,
    index: true,
  })
  status: string;

  @Prop({
    type: String,
    enum: Object.values(TaskPriority),
    default: TaskPriority.MEDIUM,
    required: true,
  })
  priority: TaskPriority;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date, index: true })
  dueDate?: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Project.name,
    required: false,
    index: true,
  })
  project?: Types.ObjectId | Project;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'List',
    index: true,
  })
  list?: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    index: true,
  })
  assignee?: Types.ObjectId | User;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  reporter: Types.ObjectId | User;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Task',
    index: true,
  })
  parentTaskId?: Types.ObjectId | Task;

  @Prop({ type: Number, default: 0 })
  subtasksCount: number;

  @Prop({ type: Number, default: 0 })
  completedSubtasksCount: number;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({
    required: true,
    uppercase: true,
    trim: true,
  })
  taskKey: string;

  @Prop({
    type: MongooseSchema.Types.Map,
    of: MongooseSchema.Types.Mixed,
    default: {},
  })
  customFieldValues?: Record<string, unknown>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ project: 1, taskKey: 1 }, { unique: true, sparse: true });
TaskSchema.index({ list: 1, taskKey: 1 }, { unique: true, sparse: true });
TaskSchema.index({ project: 1, status: 1 });
TaskSchema.index({ project: 1, assignee: 1 });
TaskSchema.index({ project: 1, dueDate: 1 });
TaskSchema.index({ project: 1, parentTaskId: 1 });
TaskSchema.index({ list: 1, status: 1 });
TaskSchema.index({ list: 1, parentTaskId: 1 });
TaskSchema.index({ parentTaskId: 1, order: 1 });

export function extractPlainCustomFieldValues(
  values?: unknown,
): Record<string, unknown> {
  if (!values) {
    return {};
  }
  if (values instanceof Map) {
    const plain: Record<string, unknown> = {};
    for (const [key, val] of values.entries()) {
      if (typeof key === 'string' && !key.startsWith('$')) {
        plain[key] = val;
      }
    }
    return plain;
  }
  if (
    typeof values === 'object' &&
    values !== null &&
    'toJSON' in values &&
    typeof (values as { toJSON: () => unknown }).toJSON === 'function'
  ) {
    const json = (values as { toJSON: () => unknown }).toJSON();
    if (typeof json === 'object' && json !== null) {
      return json as Record<string, unknown>;
    }
  }
  if (typeof values === 'object' && values !== null) {
    const plain: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values as Record<string, unknown>)) {
      if (!k.startsWith('$')) {
        plain[k] = v;
      }
    }
    return plain;
  }
  return {};
}

export function mergeCustomFieldValues(
  currentValues: unknown,
  newValues: Record<string, unknown>,
): Record<string, unknown> {
  const merged = extractPlainCustomFieldValues(currentValues);
  for (const [key, value] of Object.entries(newValues)) {
    if (value === null || value === undefined) {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  }
  return merged;
}
