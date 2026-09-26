import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Project } from '../../projects/schemas/project.schema';
import { User } from '../../users/schemas/user.schema';
import { TaskStatus } from '../enums/task-status.enum';
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
    enum: Object.values(TaskStatus),
    default: TaskStatus.TODO,
    required: true,
    index: true,
  })
  status: TaskStatus;

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
TaskSchema.index({ list: 1 });
TaskSchema.index({ list: 1, status: 1 });
TaskSchema.index({ list: 1, parentTaskId: 1 });
TaskSchema.index({ parentTaskId: 1, order: 1 });
