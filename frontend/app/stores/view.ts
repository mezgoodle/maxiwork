import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Task, TaskPriority, TaskStatus } from '../types/task';
import type { StatusWorkflow } from '../types/hierarchy';
import type {
  DueDateFilter,
  GroupByOption,
  SortDirection,
  SortField,
  ViewFilterState,
  ViewSortState,
  ViewType,
} from '../types/view';

const VALID_PRIORITIES: TaskPriority[] = ['critical', 'high', 'medium', 'low'];
const PRIORITY_RANKS: Record<TaskPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const VALID_SORT_FIELDS: SortField[] = ['createdAt', 'dueDate', 'priority', 'title'];
const VALID_DUE_DATES: DueDateFilter[] = ['all', 'overdue', 'today', 'this_week', 'no_date'];
const VALID_GROUP_BY: GroupByOption[] = ['status', 'priority', 'assignee', 'none'];
const VALID_VIEWS: ViewType[] = ['list', 'board', 'calendar'];

export const useViewStore = defineStore('view', () => {
  const activeView = ref<ViewType>('list');

  const filters = ref<ViewFilterState>({
    search: '',
    statuses: [],
    priorities: [],
    assigneeId: null,
    dueDate: 'all',
  });

  const sort = ref<ViewSortState>({
    field: 'createdAt',
    direction: 'desc',
  });

  const groupBy = ref<GroupByOption>('status');

  const activeFiltersCount = computed(() => {
    let count = 0;
    if (filters.value.search.trim().length > 0) count++;
    count += filters.value.statuses.length;
    count += filters.value.priorities.length;
    if (filters.value.assigneeId !== null) count++;
    if (filters.value.dueDate !== 'all') count++;
    return count;
  });

  const hasActiveFilters = computed(() => activeFiltersCount.value > 0);

  function setActiveView(view: ViewType) {
    if (VALID_VIEWS.includes(view)) {
      activeView.value = view;
    }
  }

  function setSearch(query: string) {
    filters.value.search = query;
  }

  function toggleStatus(status: TaskStatus) {
    const idx = filters.value.statuses.indexOf(status);
    if (idx === -1) {
      filters.value.statuses.push(status);
    } else {
      filters.value.statuses.splice(idx, 1);
    }
  }

  function togglePriority(priority: TaskPriority) {
    const idx = filters.value.priorities.indexOf(priority);
    if (idx === -1) {
      filters.value.priorities.push(priority);
    } else {
      filters.value.priorities.splice(idx, 1);
    }
  }

  function setAssignee(assigneeId: string | null) {
    filters.value.assigneeId = assigneeId;
  }

  function setDueDateFilter(filter: DueDateFilter) {
    if (VALID_DUE_DATES.includes(filter)) {
      filters.value.dueDate = filter;
    }
  }

  function setSort(field: SortField, direction?: SortDirection) {
    if (VALID_SORT_FIELDS.includes(field)) {
      sort.value.field = field;
      if (direction) {
        sort.value.direction = direction;
      }
    }
  }

  function toggleSortDirection() {
    sort.value.direction = sort.value.direction === 'asc' ? 'desc' : 'asc';
  }

  function setGroupBy(group: GroupByOption) {
    if (VALID_GROUP_BY.includes(group)) {
      groupBy.value = group;
    }
  }

  function resetFilters() {
    filters.value.search = '';
    filters.value.statuses = [];
    filters.value.priorities = [];
    filters.value.assigneeId = null;
    filters.value.dueDate = 'all';
  }

  function resetAll() {
    activeView.value = 'list';
    resetFilters();
    sort.value = { field: 'createdAt', direction: 'desc' };
    groupBy.value = 'status';
  }

  function syncFromQuery(query: Record<string, unknown>) {
    activeView.value = 'list';
    resetFilters();
    sort.value = { field: 'createdAt', direction: 'desc' };
    groupBy.value = 'status';

    if (typeof query.view === 'string' && VALID_VIEWS.includes(query.view as ViewType)) {
      activeView.value = query.view as ViewType;
    }

    if (typeof query.q === 'string') {
      filters.value.search = query.q;
    } else if (typeof query.search === 'string') {
      filters.value.search = query.search;
    }

    if (typeof query.status === 'string') {
      filters.value.statuses = query.status.split(',').filter(Boolean);
    } else if (Array.isArray(query.status)) {
      filters.value.statuses = query.status.filter((s): s is string => typeof s === 'string');
    }

    if (typeof query.priority === 'string') {
      filters.value.priorities = query.priority
        .split(',')
        .filter((p): p is TaskPriority => VALID_PRIORITIES.includes(p as TaskPriority));
    } else if (Array.isArray(query.priority)) {
      filters.value.priorities = query.priority.filter((p): p is TaskPriority =>
        VALID_PRIORITIES.includes(p as TaskPriority),
      );
    }

    if (typeof query.assignee === 'string' && query.assignee.length > 0) {
      filters.value.assigneeId = query.assignee;
    } else if (query.assignee === null || query.assignee === '') {
      filters.value.assigneeId = null;
    }

    if (typeof query.due === 'string' && VALID_DUE_DATES.includes(query.due as DueDateFilter)) {
      filters.value.dueDate = query.due as DueDateFilter;
    }

    if (typeof query.sort === 'string') {
      const parts = query.sort.split(':');
      const field = parts[0] as SortField;
      const direction = (parts[1] || 'asc') as SortDirection;
      if (VALID_SORT_FIELDS.includes(field)) {
        sort.value.field = field;
        sort.value.direction = direction === 'desc' ? 'desc' : 'asc';
      }
    }

    if (typeof query.group === 'string' && VALID_GROUP_BY.includes(query.group as GroupByOption)) {
      groupBy.value = query.group as GroupByOption;
    }
  }

  function toQuery(): Record<string, string> {
    const q: Record<string, string> = {};

    if (activeView.value !== 'list') {
      q.view = activeView.value;
    }

    const trimmedSearch = filters.value.search.trim();
    if (trimmedSearch) {
      q.q = filters.value.search;
    }

    if (filters.value.statuses.length > 0) {
      q.status = filters.value.statuses.join(',');
    }

    if (filters.value.priorities.length > 0) {
      q.priority = filters.value.priorities.join(',');
    }

    if (filters.value.assigneeId !== null) {
      q.assignee = filters.value.assigneeId;
    }

    if (filters.value.dueDate !== 'all') {
      q.due = filters.value.dueDate;
    }

    if (sort.value.field !== 'createdAt' || sort.value.direction !== 'desc') {
      q.sort = `${sort.value.field}:${sort.value.direction}`;
    }

    if (groupBy.value !== 'status') {
      q.group = groupBy.value;
    }

    return q;
  }

  function isTaskDone(task: Task, workflow?: StatusWorkflow | null): boolean {
    if (task.completed) return true;
    if (task.status === 'done') return true;
    if (!workflow?.statuses) return false;
    const st = workflow.statuses.find((s) => s.id === task.status);
    return st ? st.category === 'done' || st.category === 'closed' : false;
  }

  function filterAndSortTasks(tasks: Task[], workflow?: StatusWorkflow | null): Task[] {
    if (!Array.isArray(tasks)) return [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 86400000 - 1;

    // Start of week (Monday)
    const dayOfWeek = (now.getDay() + 6) % 7; // 0 for Monday, 6 for Sunday
    const startOfWeek = startOfToday - dayOfWeek * 86400000;
    const endOfWeek = startOfWeek + 7 * 86400000 - 1;

    const searchTerm = filters.value.search.trim().toLowerCase();

    // 1. Filtering
    const filtered = tasks.filter((task) => {
      // Search
      if (searchTerm) {
        const titleMatch = (task.title || '').toLowerCase().includes(searchTerm);
        const keyMatch = (task.taskKey || '').toLowerCase().includes(searchTerm);
        if (!titleMatch && !keyMatch) return false;
      }

      // Status
      if (filters.value.statuses.length > 0) {
        if (!filters.value.statuses.includes(task.status)) return false;
      }

      // Priority
      if (filters.value.priorities.length > 0) {
        if (!filters.value.priorities.includes(task.priority)) return false;
      }

      // Assignee
      if (filters.value.assigneeId !== null) {
        if (filters.value.assigneeId === 'unassigned') {
          if (task.assignee) return false;
        } else {
          const taskAssigneeId =
            typeof task.assignee === 'object' && task.assignee !== null
              ? task.assignee._id
              : typeof task.assignee === 'string'
                ? task.assignee
                : null;
          if (taskAssigneeId !== filters.value.assigneeId) return false;
        }
      }

      // Due date
      if (filters.value.dueDate !== 'all') {
        if (filters.value.dueDate === 'no_date') {
          if (task.dueDate) return false;
        } else if (!task.dueDate) {
          return false;
        } else {
          const dueTime = new Date(task.dueDate).getTime();
          if (isNaN(dueTime)) return false;

          if (filters.value.dueDate === 'overdue') {
            if (dueTime >= startOfToday || isTaskDone(task, workflow)) {
              return false;
            }
          } else if (filters.value.dueDate === 'today') {
            if (dueTime < startOfToday || dueTime > endOfToday) {
              return false;
            }
          } else if (filters.value.dueDate === 'this_week') {
            if (dueTime < startOfWeek || dueTime > endOfWeek) {
              return false;
            }
          }
        }
      }

      return true;
    });

    // 2. Sorting
    const { field, direction } = sort.value;
    const dirMultiplier = direction === 'asc' ? 1 : -1;

    return filtered.sort((a, b) => {
      if (field === 'title') {
        return (a.title || '').localeCompare(b.title || '') * dirMultiplier;
      }

      if (field === 'priority') {
        const rankA = PRIORITY_RANKS[a.priority] || 0;
        const rankB = PRIORITY_RANKS[b.priority] || 0;
        if (rankA !== rankB) {
          return (rankA - rankB) * dirMultiplier;
        }
        return (a.title || '').localeCompare(b.title || '');
      }

      if (field === 'dueDate') {
        const timeA = a.dueDate ? new Date(a.dueDate).getTime() : null;
        const timeB = b.dueDate ? new Date(b.dueDate).getTime() : null;

        if (timeA === null && timeB === null) return 0;
        if (timeA === null) return 1; // tasks without due date go to the end
        if (timeB === null) return -1;
        return (timeA - timeB) * dirMultiplier;
      }

      // field === 'createdAt' default
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (timeA - timeB) * dirMultiplier;
    });
  }

  return {
    activeView,
    filters,
    sort,
    groupBy,
    activeFiltersCount,
    hasActiveFilters,
    setActiveView,
    setSearch,
    toggleStatus,
    togglePriority,
    setAssignee,
    setDueDateFilter,
    setSort,
    toggleSortDirection,
    setGroupBy,
    resetFilters,
    resetAll,
    syncFromQuery,
    toQuery,
    filterAndSortTasks,
  };
});
