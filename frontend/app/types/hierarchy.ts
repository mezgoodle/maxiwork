export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest';

export interface WorkspaceMember {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
  role: WorkspaceRole;
  joinedAt: string;
}

export interface WorkspaceSettings {
  defaultTimezone: string;
  allowGuestInvites: boolean;
}

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  owner: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
  members: WorkspaceMember[];
  avatarUrl?: string;
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceFeatures {
  customStatuses: boolean;
  customFields: boolean;
  calendarView: boolean;
}

export interface Space {
  _id: string;
  workspaceId: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  isPrivate: boolean;
  order: number;
  features: SpaceFeatures;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  _id: string;
  spaceId: string;
  name: string;
  order: number;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  _id: string;
  spaceId: string;
  folderId?: string;
  name: string;
  order: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HierarchyTreeNodeList {
  id: string;
  name: string;
  order: number;
  color?: string;
  folderId?: string;
  spaceId: string;
}

export interface HierarchyTreeNodeFolder {
  id: string;
  name: string;
  order: number;
  isHidden: boolean;
  spaceId: string;
  lists: HierarchyTreeNodeList[];
}

export interface HierarchyTreeNodeSpace {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  isPrivate: boolean;
  order: number;
  workspaceId: string;
  folders: HierarchyTreeNodeFolder[];
  lists: HierarchyTreeNodeList[];
}

export interface HierarchyTreeResponse {
  workspace: {
    id: string;
    name: string;
    slug: string;
    owner: string;
    avatarUrl?: string;
    userRole: WorkspaceRole;
  };
  spaces: HierarchyTreeNodeSpace[];
}

export interface CreateWorkspacePayload {
  name: string;
  slug?: string;
  avatarUrl?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface UpdateWorkspacePayload {
  name?: string;
  slug?: string;
  avatarUrl?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface CreateSpacePayload {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isPrivate?: boolean;
  members?: string[];
  features?: Partial<SpaceFeatures>;
  order?: number;
}

export interface UpdateSpacePayload {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  isPrivate?: boolean;
  members?: string[];
  features?: Partial<SpaceFeatures>;
  order?: number;
}

export interface CreateFolderPayload {
  name: string;
  order?: number;
  isHidden?: boolean;
}

export interface UpdateFolderPayload {
  name?: string;
  order?: number;
  isHidden?: boolean;
}

export interface CreateListPayload {
  name: string;
  folderId?: string;
  order?: number;
  color?: string;
}

export interface UpdateListPayload {
  name?: string;
  folderId?: string | null;
  order?: number;
  color?: string;
}
