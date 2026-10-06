import type { TaskPriority, TaskStatus } from './task';

export type ViewType = 'list' | 'board' | 'calendar';

export type SortField = 'createdAt' | 'dueDate' | 'priority' | 'title';
export type SortDirection = 'asc' | 'desc';

export type DueDateFilter = 'all' | 'overdue' | 'today' | 'this_week' | 'no_date';

export type GroupByOption = 'status' | 'priority' | 'assignee' | 'none';

export interface ViewFilterState {
  search: string;
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  assigneeId: string | null;
  dueDate: DueDateFilter;
}

export interface ViewSortState {
  field: SortField;
  direction: SortDirection;
}

export interface ViewState {
  activeView: ViewType;
  filters: ViewFilterState;
  sort: ViewSortState;
  groupBy: GroupByOption;
}
