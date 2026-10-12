import type { Task, TaskPriority, TaskStatus, CreateTaskPayload } from '../types/task';
import type { StatusWorkflow } from '../types/hierarchy';
import type { GroupByOption } from '../types/view';

export interface UserOption {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatarUrl?: string;
}

export interface TableGroup {
  id: string;
  name: string;
  color?: string;
  tasks: Task[];
  prefillPayload: Partial<CreateTaskPayload>;
}

export interface StatusOption {
  id: string;
  name: string;
  color: string;
  category: string;
}

export function getStatusOptions(workflow?: StatusWorkflow | null): StatusOption[] {
  if (workflow?.statuses?.length) {
    return workflow.statuses.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      category: s.category,
    }));
  }
  return [
    { id: 'todo', name: 'To Do', color: '#94A3B8', category: 'to_do' },
    { id: 'in_progress', name: 'In Progress', color: '#38BDF8', category: 'in_progress' },
    { id: 'in_review', name: 'In Review', color: '#A855F7', category: 'in_progress' },
    { id: 'done', name: 'Done', color: '#22C55E', category: 'done' },
  ];
}

export function getStatusBadgeStyle(
  status?: TaskStatus,
  workflow?: StatusWorkflow | null,
): { backgroundColor: string; borderColor: string; color: string } {
  const options = getStatusOptions(workflow);
  const st = options.find((s) => s.id === status);
  const color = st?.color || '#64748B';
  return {
    backgroundColor: `${color}15`,
    borderColor: `${color}50`,
    color,
  };
}

export function getUserLabel(user: UserOption): string {
  if (user.firstName) {
    return `${user.firstName} ${user.lastName || ''}`.trim();
  }
  return user.email;
}

export function getAssigneeId(assignee: unknown): string {
  if (!assignee) return '';
  if (typeof assignee === 'object' && assignee !== null && '_id' in assignee) {
    return String((assignee as { _id: string })._id);
  }
  if (typeof assignee === 'string') {
    return assignee;
  }
  return '';
}

export function collectAssignableUsers(options: {
  users?: UserOption[];
  currentUser?: unknown;
  workspace?: {
    owner?: unknown;
    members?: Array<{ user?: unknown }>;
  } | null;
  tasks?: Task[];
}): UserOption[] {
  const map = new Map<string, UserOption>();

  const addRawUser = (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return;
    const obj = raw as {
      _id?: string;
      id?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      avatarUrl?: string;
    };
    const uid = obj._id || obj.id;
    if (!uid || map.has(String(uid))) return;
    map.set(String(uid), {
      _id: String(uid),
      firstName: obj.firstName,
      lastName: obj.lastName,
      email: obj.email || '',
      avatarUrl: obj.avatarUrl,
    });
  };

  if (options.users) {
    for (const u of options.users) {
      addRawUser(u);
    }
  }

  if (options.currentUser) {
    addRawUser(options.currentUser);
  }

  if (options.workspace) {
    addRawUser(options.workspace.owner);
    if (Array.isArray(options.workspace.members)) {
      for (const m of options.workspace.members) {
        addRawUser(m?.user);
      }
    }
  }

  if (options.tasks) {
    for (const t of options.tasks) {
      addRawUser(t.assignee);
    }
  }

  return Array.from(map.values());
}

export function isTaskCompleted(
  task: Pick<Task, 'status' | 'completed'>,
  workflow?: StatusWorkflow | null,
): boolean {
  if (task.completed) return true;
  if (task.status === 'done') return true;
  if (!workflow?.statuses) return false;
  const st = workflow.statuses.find((s) => s.id === task.status);
  return st ? st.category === 'done' || st.category === 'closed' : false;
}

export function computeTableGroups(
  tasks: Task[],
  groupBy: GroupByOption = 'status',
  workflow?: StatusWorkflow | null,
  users: UserOption[] = [],
): TableGroup[] {
  // 1. Group By Status
  if (groupBy === 'status') {
    const statusOpts = getStatusOptions(workflow);
    const list: TableGroup[] = statusOpts.map((st) => ({
      id: st.id,
      name: st.name,
      color: st.color,
      tasks: tasks.filter((t) => (t.status || 'todo') === st.id),
      prefillPayload: { status: st.id },
    }));

    const knownIds = new Set(statusOpts.map((s) => s.id));
    const otherTasks = tasks.filter((t) => !knownIds.has(t.status || 'todo'));
    if (otherTasks.length > 0) {
      list.push({
        id: 'other',
        name: 'Other',
        color: '#64748B',
        tasks: otherTasks,
        prefillPayload: { status: 'todo' },
      });
    }
    return list;
  }

  // 2. Group By Priority
  if (groupBy === 'priority') {
    const priorityDefs: Array<{ id: TaskPriority; name: string; color: string }> = [
      { id: 'critical', name: 'Critical', color: '#F43F5E' },
      { id: 'high', name: 'High', color: '#F97316' },
      { id: 'medium', name: 'Medium', color: '#EAB308' },
      { id: 'low', name: 'Low', color: '#3B82F6' },
    ];

    return priorityDefs.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      tasks: tasks.filter((t) => (t.priority || 'medium') === p.id),
      prefillPayload: { priority: p.id },
    }));
  }

  // 3. Group By Assignee
  if (groupBy === 'assignee') {
    const list: TableGroup[] = [];
    const knownUserIds = new Set(users.map((u) => u._id));

    // Assigned Users
    for (const u of users) {
      const userTasks = tasks.filter((t) => getAssigneeId(t.assignee) === u._id);
      list.push({
        id: u._id,
        name: getUserLabel(u),
        color: '#6366F1',
        tasks: userTasks,
        prefillPayload: { assignee: u._id },
      });
    }

    // Unassigned Group (includes tasks with no assignee or an unresolvable assignee ID)
    const unassignedTasks = tasks.filter((t) => {
      const aId = getAssigneeId(t.assignee);
      return !aId || !knownUserIds.has(aId);
    });
    list.push({
      id: 'unassigned',
      name: 'Unassigned',
      color: '#64748B',
      tasks: unassignedTasks,
      prefillPayload: { assignee: undefined },
    });

    return list;
  }

  // 4. Group By None
  return [
    {
      id: 'all',
      name: 'All Tasks',
      color: '#4F46E5',
      tasks,
      prefillPayload: {},
    },
  ];
}
