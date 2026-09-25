import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Workspace, WorkspaceDocument } from './schemas/workspace.schema';
import { Space, SpaceDocument } from './schemas/space.schema';
import { Folder, FolderDocument } from './schemas/folder.schema';
import { List, ListDocument } from './schemas/list.schema';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { WorkspaceRole } from './enums/workspace-role.enum';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { CreateTaskDto } from '../tasks/dto/create-task.dto';
import { CreateSubtaskDto } from '../tasks/dto/create-subtask.dto';
import { UpdateTaskDto } from '../tasks/dto/update-task.dto';
import { TaskStatus } from '../tasks/enums/task-status.enum';
import { TaskPriority } from '../tasks/enums/task-priority.enum';

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

@Injectable()
export class HierarchyService implements OnModuleInit {
  constructor(
    @InjectModel(Workspace.name)
    private readonly workspaceModel: Model<WorkspaceDocument>,
    @InjectModel(Space.name)
    private readonly spaceModel: Model<SpaceDocument>,
    @InjectModel(Folder.name)
    private readonly folderModel: Model<FolderDocument>,
    @InjectModel(List.name)
    private readonly listModel: Model<ListDocument>,
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.migrateLegacyProjects();
  }

  private extractId(ref: unknown): string {
    if (!ref) return '';
    if (typeof ref === 'object') {
      if ('_id' in (ref as Record<string, unknown>)) {
        return String((ref as { _id: unknown })._id);
      }
      if (typeof (ref as { toString?: unknown }).toString === 'function') {
        return (ref as { toString(): string }).toString();
      }
    }
    return typeof ref === 'string' ? ref : '';
  }

  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${baseSlug || 'workspace'}-${randomSuffix}`;
  }

  // ----------------------------------------------------
  // Access Control Helpers
  // ----------------------------------------------------

  async checkWorkspaceAccess(
    workspaceId: string,
    userId: string,
    allowedRoles?: WorkspaceRole[],
  ): Promise<{ workspace: WorkspaceDocument; role: WorkspaceRole }> {
    const workspace = await this.workspaceModel.findById(workspaceId).exec();
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const ownerId = this.extractId(workspace.owner);
    const isOwner = ownerId === userId.toString();

    let userRole: WorkspaceRole | null = isOwner ? WorkspaceRole.OWNER : null;

    if (!isOwner) {
      const memberRecord = workspace.members.find(
        (m) => this.extractId(m.user) === userId.toString(),
      );
      if (memberRecord) {
        userRole = memberRecord.role;
      }
    }

    if (!userRole) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    if (allowedRoles && allowedRoles.length > 0) {
      if (
        userRole !== WorkspaceRole.OWNER &&
        !allowedRoles.includes(userRole)
      ) {
        throw new ForbiddenException(
          'Insufficient permissions for this operation',
        );
      }
    }

    return { workspace, role: userRole };
  }

  async checkSpaceAccess(
    spaceId: string,
    userId: string,
  ): Promise<{
    space: SpaceDocument;
    workspace: WorkspaceDocument;
    role: WorkspaceRole;
  }> {
    const space = await this.spaceModel.findById(spaceId).exec();
    if (!space) {
      throw new NotFoundException('Space not found');
    }

    const workspaceId = this.extractId(space.workspaceId);
    const { workspace, role } = await this.checkWorkspaceAccess(
      workspaceId,
      userId,
    );

    if (
      space.isPrivate &&
      role !== WorkspaceRole.OWNER &&
      role !== WorkspaceRole.ADMIN
    ) {
      const isMember = (space.members || []).some(
        (m) => this.extractId(m) === userId.toString(),
      );
      if (!isMember) {
        throw new ForbiddenException(
          'You do not have access to this private space',
        );
      }
    }

    return { space, workspace, role };
  }

  async checkFolderAccess(
    folderId: string,
    userId: string,
  ): Promise<{
    folder: FolderDocument;
    space: SpaceDocument;
    workspace: WorkspaceDocument;
    role: WorkspaceRole;
  }> {
    const folder = await this.folderModel.findById(folderId).exec();
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const spaceId = this.extractId(folder.spaceId);
    const { space, workspace, role } = await this.checkSpaceAccess(
      spaceId,
      userId,
    );

    return { folder, space, workspace, role };
  }

  async checkListAccess(
    listId: string,
    userId: string,
  ): Promise<{
    list: ListDocument;
    space: SpaceDocument;
    workspace: WorkspaceDocument;
    role: WorkspaceRole;
  }> {
    const list = await this.listModel.findById(listId).exec();
    if (!list) {
      throw new NotFoundException('List not found');
    }

    const spaceId = this.extractId(list.spaceId);
    const { space, workspace, role } = await this.checkSpaceAccess(
      spaceId,
      userId,
    );

    return { list, space, workspace, role };
  }

  // ----------------------------------------------------
  // Workspaces CRUD
  // ----------------------------------------------------

  async createWorkspace(
    dto: CreateWorkspaceDto,
    userId: string,
  ): Promise<WorkspaceDocument> {
    let slug = dto.slug;
    if (!slug) {
      slug = this.generateSlug(dto.name);
    }

    const existingSlug = await this.workspaceModel.findOne({ slug }).exec();
    if (existingSlug) {
      slug = this.generateSlug(dto.name);
    }

    const workspace = new this.workspaceModel({
      name: dto.name,
      slug,
      owner: new Types.ObjectId(userId),
      members: [
        {
          user: new Types.ObjectId(userId),
          role: WorkspaceRole.OWNER,
          joinedAt: new Date(),
        },
      ],
      avatarUrl: dto.avatarUrl,
      settings: dto.settings || {
        defaultTimezone: 'UTC',
        allowGuestInvites: true,
      },
    });

    const saved = await workspace.save();

    // Create a default Space & List inside the new Workspace
    const defaultSpace = new this.spaceModel({
      workspaceId: saved._id,
      name: 'General',
      icon: 'folder',
      color: '#4F46E5',
      order: 0,
    });
    const savedSpace = await defaultSpace.save();

    const defaultList = new this.listModel({
      spaceId: savedSpace._id,
      name: 'Tasks',
      order: 0,
      color: '#4F46E5',
    });
    await defaultList.save();

    return saved.populate([
      { path: 'owner', select: 'firstName lastName email avatarUrl' },
      { path: 'members.user', select: 'firstName lastName email avatarUrl' },
    ]);
  }

  async findAllWorkspaces(userId: string): Promise<WorkspaceDocument[]> {
    const userObjectId = new Types.ObjectId(userId);
    const workspaces = await this.workspaceModel
      .find({
        $or: [{ owner: userObjectId }, { 'members.user': userObjectId }],
      })
      .sort({ createdAt: 1 })
      .populate('owner', 'firstName lastName email avatarUrl')
      .populate('members.user', 'firstName lastName email avatarUrl')
      .exec();

    if (workspaces.length === 0) {
      const defaultWs = await this.createWorkspace(
        { name: 'My Workspace' },
        userId,
      );
      return [defaultWs];
    }

    return workspaces;
  }

  async findOneWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceDocument> {
    const { workspace } = await this.checkWorkspaceAccess(workspaceId, userId);
    return workspace.populate([
      { path: 'owner', select: 'firstName lastName email avatarUrl' },
      { path: 'members.user', select: 'firstName lastName email avatarUrl' },
    ]);
  }

  async updateWorkspace(
    workspaceId: string,
    dto: UpdateWorkspaceDto,
    userId: string,
  ): Promise<WorkspaceDocument> {
    const { workspace } = await this.checkWorkspaceAccess(workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    if (dto.name !== undefined) {
      workspace.name = dto.name;
    }

    if (dto.slug !== undefined) {
      const existingSlug = await this.workspaceModel
        .findOne({ slug: dto.slug, _id: { $ne: workspaceId } })
        .exec();
      if (existingSlug) {
        throw new BadRequestException('Workspace slug is already taken');
      }
      workspace.slug = dto.slug;
    }

    if (dto.avatarUrl !== undefined) {
      workspace.avatarUrl = dto.avatarUrl;
    }

    if (dto.settings !== undefined) {
      workspace.settings = {
        defaultTimezone:
          dto.settings.defaultTimezone ?? workspace.settings.defaultTimezone,
        allowGuestInvites:
          dto.settings.allowGuestInvites ??
          workspace.settings.allowGuestInvites,
      };
    }

    const saved = await workspace.save();
    return saved.populate([
      { path: 'owner', select: 'firstName lastName email avatarUrl' },
      { path: 'members.user', select: 'firstName lastName email avatarUrl' },
    ]);
  }

  async deleteWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<{ message: string; id: string }> {
    await this.checkWorkspaceAccess(workspaceId, userId, [WorkspaceRole.OWNER]);

    // Cascading delete
    const spaces = await this.spaceModel
      .find({ workspaceId })
      .select('_id')
      .lean()
      .exec();
    const spaceIds = spaces.map((s) => s._id);

    const lists = await this.listModel
      .find({ spaceId: { $in: spaceIds } })
      .select('_id')
      .lean()
      .exec();
    const listIds = lists.map((l) => l._id);

    if (listIds.length > 0) {
      await this.taskModel.deleteMany({ list: { $in: listIds } }).exec();
    }

    if (spaceIds.length > 0) {
      await this.folderModel.deleteMany({ spaceId: { $in: spaceIds } }).exec();
      await this.listModel.deleteMany({ spaceId: { $in: spaceIds } }).exec();
      await this.spaceModel.deleteMany({ _id: { $in: spaceIds } }).exec();
    }

    await this.workspaceModel.findByIdAndDelete(workspaceId).exec();

    return { message: 'Workspace deleted successfully', id: workspaceId };
  }

  // ----------------------------------------------------
  // Spaces CRUD
  // ----------------------------------------------------

  async createSpace(
    workspaceId: string,
    dto: CreateSpaceDto,
    userId: string,
  ): Promise<SpaceDocument> {
    await this.checkWorkspaceAccess(workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
    ]);

    let order = dto.order;
    if (order === undefined) {
      order = await this.spaceModel.countDocuments({ workspaceId }).exec();
    }

    const space = new this.spaceModel({
      workspaceId: new Types.ObjectId(workspaceId),
      name: dto.name,
      description: dto.description,
      icon: dto.icon || 'folder',
      color: dto.color || '#4F46E5',
      isPrivate: dto.isPrivate || false,
      members: (dto.members || []).map((m) => new Types.ObjectId(m)),
      features: dto.features || {
        customStatuses: true,
        customFields: true,
        calendarView: true,
      },
      order,
    });

    const saved = await space.save();

    // Create a default list inside the newly created Space
    const defaultList = new this.listModel({
      spaceId: saved._id,
      name: 'List',
      order: 0,
      color: saved.color,
    });
    await defaultList.save();

    return saved;
  }

  async findAllSpaces(
    workspaceId: string,
    userId: string,
  ): Promise<SpaceDocument[]> {
    const { role } = await this.checkWorkspaceAccess(workspaceId, userId);

    const query: Record<string, unknown> = {
      workspaceId: new Types.ObjectId(workspaceId),
    };

    if (role !== WorkspaceRole.OWNER && role !== WorkspaceRole.ADMIN) {
      query.$or = [
        { isPrivate: false },
        { members: new Types.ObjectId(userId) },
      ];
    }

    return this.spaceModel.find(query).sort({ order: 1, createdAt: 1 }).exec();
  }

  async findOneSpace(spaceId: string, userId: string): Promise<SpaceDocument> {
    const { space } = await this.checkSpaceAccess(spaceId, userId);
    return space;
  }

  async updateSpace(
    spaceId: string,
    dto: UpdateSpaceDto,
    userId: string,
  ): Promise<SpaceDocument> {
    const { space, role } = await this.checkSpaceAccess(spaceId, userId);

    if (role === WorkspaceRole.GUEST) {
      throw new ForbiddenException('Guests cannot modify spaces');
    }

    if (dto.name !== undefined) space.name = dto.name;
    if (dto.description !== undefined) space.description = dto.description;
    if (dto.icon !== undefined) space.icon = dto.icon;
    if (dto.color !== undefined) space.color = dto.color;
    if (dto.isPrivate !== undefined) space.isPrivate = dto.isPrivate;
    if (dto.order !== undefined) space.order = dto.order;
    if (dto.members !== undefined) {
      space.members = dto.members.map((m) => new Types.ObjectId(m));
    }
    if (dto.features !== undefined) {
      space.features = {
        customStatuses:
          dto.features.customStatuses ?? space.features.customStatuses,
        customFields: dto.features.customFields ?? space.features.customFields,
        calendarView: dto.features.calendarView ?? space.features.calendarView,
      };
    }

    return space.save();
  }

  async deleteSpace(
    spaceId: string,
    userId: string,
  ): Promise<{ message: string; id: string }> {
    const { space, role } = await this.checkSpaceAccess(spaceId, userId);

    if (role !== WorkspaceRole.OWNER && role !== WorkspaceRole.ADMIN) {
      throw new ForbiddenException('Only owners and admins can delete spaces');
    }

    // Cascading delete
    const lists = await this.listModel
      .find({ spaceId })
      .select('_id')
      .lean()
      .exec();
    const listIds = lists.map((l) => l._id);

    if (listIds.length > 0) {
      await this.taskModel.deleteMany({ list: { $in: listIds } }).exec();
    }

    await this.folderModel.deleteMany({ spaceId }).exec();
    await this.listModel.deleteMany({ spaceId }).exec();
    await this.spaceModel.findByIdAndDelete(space._id).exec();

    return { message: 'Space deleted successfully', id: spaceId };
  }

  // ----------------------------------------------------
  // Folders CRUD
  // ----------------------------------------------------

  async createFolder(
    spaceId: string,
    dto: CreateFolderDto,
    userId: string,
  ): Promise<FolderDocument> {
    const { role } = await this.checkSpaceAccess(spaceId, userId);
    if (role === WorkspaceRole.GUEST) {
      throw new ForbiddenException('Guests cannot create folders');
    }

    let order = dto.order;
    if (order === undefined) {
      order = await this.folderModel.countDocuments({ spaceId }).exec();
    }

    const folder = new this.folderModel({
      spaceId: new Types.ObjectId(spaceId),
      name: dto.name,
      order,
      isHidden: dto.isHidden || false,
    });

    return folder.save();
  }

  async findAllFolders(
    spaceId: string,
    userId: string,
  ): Promise<FolderDocument[]> {
    await this.checkSpaceAccess(spaceId, userId);
    return this.folderModel
      .find({ spaceId: new Types.ObjectId(spaceId) })
      .sort({ order: 1, createdAt: 1 })
      .exec();
  }

  async findOneFolder(
    folderId: string,
    userId: string,
  ): Promise<FolderDocument> {
    const { folder } = await this.checkFolderAccess(folderId, userId);
    return folder;
  }

  async updateFolder(
    folderId: string,
    dto: UpdateFolderDto,
    userId: string,
  ): Promise<FolderDocument> {
    const { folder, role } = await this.checkFolderAccess(folderId, userId);
    if (role === WorkspaceRole.GUEST) {
      throw new ForbiddenException('Guests cannot modify folders');
    }

    if (dto.name !== undefined) folder.name = dto.name;
    if (dto.order !== undefined) folder.order = dto.order;
    if (dto.isHidden !== undefined) folder.isHidden = dto.isHidden;

    return folder.save();
  }

  async deleteFolder(
    folderId: string,
    userId: string,
  ): Promise<{ message: string; id: string }> {
    const { folder, role } = await this.checkFolderAccess(folderId, userId);
    if (role === WorkspaceRole.GUEST) {
      throw new ForbiddenException('Guests cannot delete folders');
    }

    const lists = await this.listModel
      .find({ folderId })
      .select('_id')
      .lean()
      .exec();
    const listIds = lists.map((l) => l._id);

    if (listIds.length > 0) {
      await this.taskModel.deleteMany({ list: { $in: listIds } }).exec();
      await this.listModel.deleteMany({ folderId }).exec();
    }

    await this.folderModel.findByIdAndDelete(folder._id).exec();
    return { message: 'Folder deleted successfully', id: folderId };
  }

  // ----------------------------------------------------
  // Lists CRUD
  // ----------------------------------------------------

  async createList(
    spaceId: string,
    dto: CreateListDto,
    userId: string,
  ): Promise<ListDocument> {
    const { space, role } = await this.checkSpaceAccess(spaceId, userId);
    if (role === WorkspaceRole.GUEST) {
      throw new ForbiddenException('Guests cannot create lists');
    }

    if (dto.folderId) {
      const folder = await this.folderModel.findById(dto.folderId).exec();
      if (!folder || this.extractId(folder.spaceId) !== spaceId) {
        throw new BadRequestException('Folder does not belong to this space');
      }
    }

    let order = dto.order;
    if (order === undefined) {
      const countFilter: Record<string, unknown> = {
        spaceId: new Types.ObjectId(spaceId),
      };
      if (dto.folderId) {
        countFilter.folderId = new Types.ObjectId(dto.folderId);
      } else {
        countFilter.folderId = { $exists: false };
      }
      order = await this.listModel.countDocuments(countFilter).exec();
    }

    const list = new this.listModel({
      spaceId: new Types.ObjectId(spaceId),
      folderId: dto.folderId ? new Types.ObjectId(dto.folderId) : undefined,
      name: dto.name,
      order,
      color: dto.color || space.color,
    });

    return list.save();
  }

  async findAllLists(spaceId: string, userId: string): Promise<ListDocument[]> {
    await this.checkSpaceAccess(spaceId, userId);
    return this.listModel
      .find({ spaceId: new Types.ObjectId(spaceId) })
      .sort({ order: 1, createdAt: 1 })
      .exec();
  }

  async findOneList(listId: string, userId: string): Promise<ListDocument> {
    const { list } = await this.checkListAccess(listId, userId);
    return list;
  }

  async updateList(
    listId: string,
    dto: UpdateListDto,
    userId: string,
  ): Promise<ListDocument> {
    const { list, space, role } = await this.checkListAccess(listId, userId);
    if (role === WorkspaceRole.GUEST) {
      throw new ForbiddenException('Guests cannot modify lists');
    }

    if (dto.name !== undefined) list.name = dto.name;
    if (dto.order !== undefined) list.order = dto.order;
    if (dto.color !== undefined) list.color = dto.color;

    if (dto.folderId !== undefined) {
      if (dto.folderId === null) {
        list.folderId = undefined;
      } else {
        const folder = await this.folderModel.findById(dto.folderId).exec();
        if (
          !folder ||
          this.extractId(folder.spaceId) !== this.extractId(space._id)
        ) {
          throw new BadRequestException('Folder does not belong to this space');
        }
        list.folderId = new Types.ObjectId(dto.folderId);
      }
    }

    return list.save();
  }

  async deleteList(
    listId: string,
    userId: string,
  ): Promise<{ message: string; id: string }> {
    const { list, role } = await this.checkListAccess(listId, userId);
    if (role === WorkspaceRole.GUEST) {
      throw new ForbiddenException('Guests cannot delete lists');
    }

    await this.taskModel.deleteMany({ list: list._id }).exec();
    await this.listModel.findByIdAndDelete(list._id).exec();

    return { message: 'List deleted successfully', id: listId };
  }

  // ----------------------------------------------------
  // Hierarchy Tree for Sidebar
  // ----------------------------------------------------

  async getWorkspaceTree(
    workspaceId: string,
    userId: string,
  ): Promise<HierarchyTreeResponse> {
    const { workspace, role } = await this.checkWorkspaceAccess(
      workspaceId,
      userId,
    );

    const spaceQuery: Record<string, unknown> = {
      workspaceId: workspace._id,
    };
    if (role !== WorkspaceRole.OWNER && role !== WorkspaceRole.ADMIN) {
      spaceQuery.$or = [
        { isPrivate: false },
        { members: new Types.ObjectId(userId) },
      ];
    }

    const spaces = await this.spaceModel
      .find(spaceQuery)
      .sort({ order: 1, createdAt: 1 })
      .lean()
      .exec();

    const spaceIds = spaces.map((s) => s._id);

    const [folders, lists] = await Promise.all([
      this.folderModel
        .find({ spaceId: { $in: spaceIds } })
        .sort({ order: 1, createdAt: 1 })
        .lean()
        .exec(),
      this.listModel
        .find({ spaceId: { $in: spaceIds } })
        .sort({ order: 1, createdAt: 1 })
        .lean()
        .exec(),
    ]);

    const treeSpaces: HierarchyTreeNodeSpace[] = spaces.map((space) => {
      const spaceIdStr = this.extractId(space._id);
      const spaceFolders = folders.filter(
        (f) => this.extractId(f.spaceId) === spaceIdStr,
      );
      const spaceLists = lists.filter(
        (l) => this.extractId(l.spaceId) === spaceIdStr,
      );

      const treeFolders: HierarchyTreeNodeFolder[] = spaceFolders.map(
        (folder) => {
          const folderIdStr = this.extractId(folder._id);
          const folderLists = spaceLists.filter(
            (l) => l.folderId && this.extractId(l.folderId) === folderIdStr,
          );
          return {
            id: folderIdStr,
            name: folder.name,
            order: folder.order,
            isHidden: folder.isHidden,
            spaceId: spaceIdStr,
            lists: folderLists.map((l) => ({
              id: this.extractId(l._id),
              name: l.name,
              order: l.order,
              color: l.color,
              folderId: folderIdStr,
              spaceId: spaceIdStr,
            })),
          };
        },
      );

      const folderlessLists = spaceLists
        .filter((l) => !l.folderId)
        .map((l) => ({
          id: this.extractId(l._id),
          name: l.name,
          order: l.order,
          color: l.color,
          spaceId: spaceIdStr,
        }));

      return {
        id: spaceIdStr,
        name: space.name,
        description: space.description,
        icon: space.icon,
        color: space.color,
        isPrivate: space.isPrivate,
        order: space.order,
        workspaceId: this.extractId(workspace._id),
        folders: treeFolders,
        lists: folderlessLists,
      };
    });

    return {
      workspace: {
        id: this.extractId(workspace._id),
        name: workspace.name,
        slug: workspace.slug,
        owner: this.extractId(workspace.owner),
        avatarUrl: workspace.avatarUrl,
        userRole: role,
      },
      spaces: treeSpaces,
    };
  }

  // ----------------------------------------------------
  // Legacy Projects Auto-Migration
  // ----------------------------------------------------

  async migrateLegacyProjects(): Promise<void> {
    const projects = await this.projectModel.find().lean().exec();
    if (!projects || projects.length === 0) return;

    for (const project of projects) {
      const ownerId = this.extractId(project.owner);
      if (!ownerId) continue;

      let workspaceId: Types.ObjectId | null = null;
      const existingWorkspace = await this.workspaceModel
        .findOne({ owner: new Types.ObjectId(ownerId) })
        .exec();

      if (existingWorkspace) {
        workspaceId = existingWorkspace._id;
      } else {
        const createdWorkspace = await this.createWorkspace(
          { name: 'My Workspace' },
          ownerId,
        );
        workspaceId = createdWorkspace._id;
      }

      if (!workspaceId) continue;

      let space = await this.spaceModel
        .findOne({
          workspaceId,
          name: project.name,
        })
        .exec();

      if (!space) {
        space = new this.spaceModel({
          workspaceId,
          name: project.name,
          description: project.description || '',
          icon: 'folder',
          color: '#4F46E5',
          order: 0,
        });
        await space.save();
      }

      let list = await this.listModel
        .findOne({ spaceId: space._id, name: 'Default List' })
        .exec();

      if (!list) {
        list = await this.listModel.findOne({ spaceId: space._id }).exec();
      }

      if (!list) {
        list = new this.listModel({
          spaceId: space._id,
          name: 'Default List',
          order: 0,
          color: '#4F46E5',
        });
        await list.save();
      }

      // Link any unlinked tasks belonging to this project
      await this.taskModel
        .updateMany(
          {
            project: project._id,
            $or: [{ list: { $exists: false } }, { list: null }],
          },
          { $set: { list: list._id } },
        )
        .exec();
    }
  }

  // ----------------------------------------------------
  // List Tasks CRUD
  // ----------------------------------------------------

  async createListTask(
    listId: string,
    dto: CreateTaskDto,
    userId: string,
  ): Promise<TaskDocument> {
    const { list, space } = await this.checkListAccess(listId, userId);

    const spaceName = space.name || 'TASK';
    const prefix =
      spaceName
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 4)
        .toUpperCase() || 'TSK';

    const count = await this.taskModel
      .countDocuments({ list: list._id })
      .exec();
    let num = count + 1;
    let candidateKey = `${prefix}-${num}`;
    while (
      await this.taskModel.findOne({ taskKey: candidateKey }).lean().exec()
    ) {
      num++;
      candidateKey = `${prefix}-${num}`;
    }

    const createdTask = new this.taskModel({
      title: dto.title,
      description: dto.description || '',
      status: dto.status || TaskStatus.TODO,
      priority: dto.priority || TaskPriority.MEDIUM,
      list: list._id,
      reporter: new Types.ObjectId(userId),
      assignee: dto.assignee ? new Types.ObjectId(dto.assignee) : undefined,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      taskKey: candidateKey,
      subtasksCount: 0,
      completedSubtasksCount: 0,
      order: num,
    });

    const saved = await createdTask.save();
    const result = await this.taskModel
      .findById(saved._id)
      .populate('reporter', 'firstName lastName email avatarUrl')
      .populate('assignee', 'firstName lastName email avatarUrl')
      .exec();
    if (!result) {
      throw new NotFoundException('Failed to retrieve created task');
    }
    return result;
  }

  async findListTasks(listId: string, userId: string): Promise<TaskDocument[]> {
    await this.checkListAccess(listId, userId);

    return this.taskModel
      .find({
        list: new Types.ObjectId(listId),
        $or: [{ parentTaskId: { $exists: false } }, { parentTaskId: null }],
      })
      .sort({ order: 1, createdAt: -1 })
      .populate('reporter', 'firstName lastName email avatarUrl')
      .populate('assignee', 'firstName lastName email avatarUrl')
      .exec();
  }

  async updateListTask(
    listId: string,
    taskId: string,
    dto: UpdateTaskDto,
    userId: string,
  ): Promise<TaskDocument> {
    await this.checkListAccess(listId, userId);

    const task = await this.taskModel
      .findOne({
        _id: new Types.ObjectId(taskId),
        list: new Types.ObjectId(listId),
      })
      .exec();
    if (!task) {
      throw new NotFoundException('Task not found in this list');
    }

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.assignee !== undefined) {
      task.assignee = dto.assignee
        ? new Types.ObjectId(dto.assignee)
        : undefined;
    }
    if (dto.startDate !== undefined) {
      task.startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    }
    if (dto.dueDate !== undefined) {
      task.dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;
    }

    await task.save();

    const updated = await this.taskModel
      .findById(task._id)
      .populate('reporter', 'firstName lastName email avatarUrl')
      .populate('assignee', 'firstName lastName email avatarUrl')
      .populate('parentTaskId', 'title taskKey')
      .exec();
    if (!updated) {
      throw new NotFoundException('Failed to retrieve updated task');
    }
    return updated;
  }

  async deleteListTask(
    listId: string,
    taskId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.checkListAccess(listId, userId);

    const task = await this.taskModel
      .findOne({
        _id: new Types.ObjectId(taskId),
        list: new Types.ObjectId(listId),
      })
      .exec();
    if (!task) {
      throw new NotFoundException('Task not found in this list');
    }

    await this.taskModel
      .deleteMany({
        $or: [
          { _id: new Types.ObjectId(taskId) },
          { parentTaskId: new Types.ObjectId(taskId) },
        ],
      })
      .exec();

    return { success: true, message: 'Task deleted successfully' };
  }

  async findOneListTask(
    listId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskDocument> {
    await this.checkListAccess(listId, userId);

    const task = await this.taskModel
      .findOne({
        _id: new Types.ObjectId(taskId),
        list: new Types.ObjectId(listId),
      })
      .populate('reporter', 'firstName lastName email avatarUrl')
      .populate('assignee', 'firstName lastName email avatarUrl')
      .populate('parentTaskId', 'title taskKey')
      .exec();
    if (!task) {
      throw new NotFoundException('Task not found in this list');
    }
    return task;
  }

  async findListSubtasks(
    listId: string,
    parentTaskId: string,
    userId: string,
  ): Promise<TaskDocument[]> {
    await this.checkListAccess(listId, userId);

    return this.taskModel
      .find({
        list: new Types.ObjectId(listId),
        parentTaskId: new Types.ObjectId(parentTaskId),
      })
      .sort({ order: 1, createdAt: 1 })
      .populate('reporter', 'firstName lastName email avatarUrl')
      .populate('assignee', 'firstName lastName email avatarUrl')
      .populate('parentTaskId', 'title taskKey')
      .exec();
  }

  async createListSubtask(
    listId: string,
    parentTaskId: string,
    dto: CreateSubtaskDto,
    userId: string,
  ): Promise<TaskDocument> {
    const { list } = await this.checkListAccess(listId, userId);

    const parent = await this.taskModel
      .findOne({
        _id: new Types.ObjectId(parentTaskId),
        list: list._id,
      })
      .exec();
    if (!parent) {
      throw new NotFoundException('Parent task not found in this list');
    }

    const order =
      dto.order !== undefined ? dto.order : parent.subtasksCount || 0;
    const taskKey = `${parent.taskKey}-${order + 1}`;

    const subtask = new this.taskModel({
      title: dto.title,
      description: dto.description || '',
      priority: dto.priority || TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      list: list._id,
      parentTaskId: parent._id,
      reporter: new Types.ObjectId(userId),
      assignee: dto.assignee ? new Types.ObjectId(dto.assignee) : undefined,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      taskKey,
      order,
      subtasksCount: 0,
      completedSubtasksCount: 0,
    });

    const saved = await subtask.save();

    await this.taskModel
      .updateOne({ _id: parent._id }, { $inc: { subtasksCount: 1 } })
      .exec();

    const result = await this.taskModel
      .findById(saved._id)
      .populate('reporter', 'firstName lastName email avatarUrl')
      .populate('assignee', 'firstName lastName email avatarUrl')
      .exec();
    if (!result) {
      throw new NotFoundException('Failed to retrieve created subtask');
    }
    return result;
  }
}
