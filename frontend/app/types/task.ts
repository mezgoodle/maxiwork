import type { User } from './auth';

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | (string & {});

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';
export type RecurrenceEndType = 'never' | 'after_occurrences' | 'on_date';

export interface RecurrenceSettings {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number[];
  endType: RecurrenceEndType;
  occurrences?: number;
  currentOccurrence?: number;
  endDate?: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  completed?: boolean;
  priority: TaskPriority;
  startDate?: string;
  dueDate?: string;
  project: string | { _id: string; name?: string; prefix?: string };
  list?: string;
  assignee?: User | string | null;
  reporter: User | string;
  taskKey: string;
  parentTaskId?: string | Task | null;
  subtasksCount?: number;
  completedSubtasksCount?: number;
  order?: number;
  subtasks?: Task[];
  customFieldValues?: Record<string, unknown>;
  isRecurring?: boolean;
  recurrence?: RecurrenceSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  startDate?: string;
  dueDate?: string;
  list?: string;
  customFieldValues?: Record<string, unknown>;
  isRecurring?: boolean;
  recurrence?: RecurrenceSettings;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  list?: string | null;
  customFieldValues?: Record<string, unknown>;
  isRecurring?: boolean;
  recurrence?: RecurrenceSettings | null;
}

export interface CreateSubtaskPayload {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignee?: string;
  startDate?: string;
  dueDate?: string;
  order?: number;
}

export interface MoveSubtaskPayload {
  newParentTaskId?: string | null;
  order?: number;
}

export interface GetTasksQuery {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  search?: string;
  rootOnly?: boolean;
  listId?: string;
}

export interface TasksPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedTasksResponse {
  data: Task[];
  meta: TasksPaginationMeta;
}

