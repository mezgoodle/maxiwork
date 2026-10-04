import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { StatusCategory } from '../enums/status-category.enum';

@Schema({ _id: false })
export class CustomStatusItem {
  @Prop({ required: true, trim: true })
  id: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  color: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(StatusCategory),
  })
  category: StatusCategory;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: Boolean, default: false })
  isDefault?: boolean;
}

export const CustomStatusItemSchema =
  SchemaFactory.createForClass(CustomStatusItem);

export function createDefaultStatusWorkflow(): StatusWorkflow {
  return {
    statuses: [
      {
        id: 'todo',
        name: 'TO DO',
        color: '#64748B',
        category: StatusCategory.TO_DO,
        order: 0,
        isDefault: true,
      },
      {
        id: 'in_progress',
        name: 'IN PROGRESS',
        color: '#3B82F6',
        category: StatusCategory.IN_PROGRESS,
        order: 1,
        isDefault: false,
      },
      {
        id: 'done',
        name: 'COMPLETE',
        color: '#10B981',
        category: StatusCategory.DONE,
        order: 2,
        isDefault: true,
      },
      {
        id: 'closed',
        name: 'CLOSED',
        color: '#475569',
        category: StatusCategory.CLOSED,
        order: 3,
        isDefault: false,
      },
    ],
    defaultTodoStatusId: 'todo',
    defaultDoneStatusId: 'done',
  };
}

@Schema({ _id: false })
export class StatusWorkflow {
  @Prop({
    type: [CustomStatusItemSchema],
    default: () => createDefaultStatusWorkflow().statuses,
  })
  statuses: CustomStatusItem[];

  @Prop({ type: String, default: 'todo', trim: true })
  defaultTodoStatusId: string;

  @Prop({ type: String, default: 'done', trim: true })
  defaultDoneStatusId: string;
}

export const StatusWorkflowSchema =
  SchemaFactory.createForClass(StatusWorkflow);

export function isStatusDone(
  statusId: string,
  workflow?: StatusWorkflow | null,
): boolean {
  if (!statusId) return false;
  const normalizedId = statusId.trim().toLowerCase();

  if (workflow?.statuses?.length) {
    const item = workflow.statuses.find(
      (s) => s.id.toLowerCase() === normalizedId,
    );
    if (item) {
      return (
        item.category === StatusCategory.DONE ||
        item.category === StatusCategory.CLOSED
      );
    }
  }

  // Fallback for default or legacy status keys
  return (
    normalizedId === 'done' ||
    normalizedId === 'closed' ||
    normalizedId === 'complete'
  );
}
