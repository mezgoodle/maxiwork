import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { HierarchyService } from './hierarchy.service';
import { Workspace } from './schemas/workspace.schema';
import { Space } from './schemas/space.schema';
import { Folder } from './schemas/folder.schema';
import { List } from './schemas/list.schema';
import { Task } from '../tasks/schemas/task.schema';
import { Project } from '../projects/schemas/project.schema';
import { User } from '../users/schemas/user.schema';
import { WorkspaceRole } from './enums/workspace-role.enum';
import { StatusCategory } from './enums/status-category.enum';

interface MockModel {
  findOne: jest.Mock;
  find: jest.Mock;
  findById: jest.Mock;
  findByIdAndDelete: jest.Mock;
  deleteMany?: jest.Mock;
  updateMany?: jest.Mock;
  countDocuments?: jest.Mock;
}

describe('HierarchyService', () => {
  let service: HierarchyService;

  const mockUserId = '507f1f77bcf86cd799439011';
  const mockOtherUserId = '507f1f77bcf86cd799439022';
  const mockWorkspaceId = '607f1f77bcf86cd799439011';
  const mockSpaceId = '707f1f77bcf86cd799439011';
  const mockFolderId = '807f1f77bcf86cd799439011';
  const mockListId = '907f1f77bcf86cd799439011';

  let mockWorkspaceModel: MockModel;
  let mockSpaceModel: MockModel;
  let mockFolderModel: MockModel;
  let mockListModel: MockModel;
  let mockTaskModel: MockModel;
  let mockProjectModel: MockModel;
  let mockUserModel: MockModel;

  beforeEach(async () => {
    const wsConstructor = jest
      .fn()
      .mockImplementation((dto: Record<string, unknown>) => ({
        ...dto,
        _id: mockWorkspaceId,
        save: jest.fn().mockResolvedValue({
          ...dto,
          _id: mockWorkspaceId,
          populate: jest.fn().mockResolvedValue({
            ...dto,
            _id: mockWorkspaceId,
            owner: { _id: mockUserId, firstName: 'User', lastName: 'One' },
          }),
        }),
      }));
    Object.assign(wsConstructor, {
      findOne: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
    });
    mockWorkspaceModel = wsConstructor as unknown as MockModel;

    const spaceConstructor = jest
      .fn()
      .mockImplementation((dto: Record<string, unknown>) => ({
        ...dto,
        _id: mockSpaceId,
        save: jest.fn().mockResolvedValue({
          ...dto,
          _id: mockSpaceId,
        }),
      }));
    Object.assign(spaceConstructor, {
      findOne: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
      deleteMany: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
    });
    mockSpaceModel = spaceConstructor as unknown as MockModel;

    const folderConstructor = jest
      .fn()
      .mockImplementation((dto: Record<string, unknown>) => ({
        ...dto,
        _id: mockFolderId,
        save: jest.fn().mockResolvedValue({
          ...dto,
          _id: mockFolderId,
        }),
      }));
    Object.assign(folderConstructor, {
      findOne: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
      deleteMany: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
    });
    mockFolderModel = folderConstructor as unknown as MockModel;

    const listConstructor = jest
      .fn()
      .mockImplementation((dto: Record<string, unknown>) => ({
        ...dto,
        _id: mockListId,
        save: jest.fn().mockResolvedValue({
          ...dto,
          _id: mockListId,
        }),
      }));
    Object.assign(listConstructor, {
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
        exec: jest.fn().mockResolvedValue([]),
      }),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
      deleteMany: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
    });
    mockListModel = listConstructor as unknown as MockModel;

    const taskConstructor = jest
      .fn()
      .mockImplementation((dto: Record<string, unknown>) => ({
        ...dto,
        _id: '507f1f77bcf86cd799439099',
        save: jest.fn().mockResolvedValue({
          ...dto,
          _id: '507f1f77bcf86cd799439099',
        }),
      }));
    Object.assign(taskConstructor, {
      findOne: jest.fn().mockReturnValue({
        lean: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
        exec: jest.fn().mockResolvedValue(null),
      }),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
      deleteMany: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      updateMany: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
    });
    mockTaskModel = taskConstructor as unknown as MockModel;

    mockProjectModel = {
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue({
        lean: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      }),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    mockUserModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HierarchyService,
        {
          provide: getModelToken(Workspace.name),
          useValue: mockWorkspaceModel,
        },
        { provide: getModelToken(Space.name), useValue: mockSpaceModel },
        { provide: getModelToken(Folder.name), useValue: mockFolderModel },
        { provide: getModelToken(List.name), useValue: mockListModel },
        { provide: getModelToken(Task.name), useValue: mockTaskModel },
        { provide: getModelToken(Project.name), useValue: mockProjectModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<HierarchyService>(HierarchyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Workspace Operations', () => {
    it('should create a workspace with default space and list', async () => {
      mockWorkspaceModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.createWorkspace(
        { name: 'Test Org' },
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Org');
    });

    it('should throw ForbiddenException if user is not in workspace', async () => {
      mockWorkspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockWorkspaceId,
          owner: mockOtherUserId,
          members: [],
        }),
      });

      await expect(
        service.findOneWorkspace(mockWorkspaceId, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow access if user is workspace owner', async () => {
      const mockWs = {
        _id: mockWorkspaceId,
        owner: mockUserId,
        members: [{ user: mockUserId, role: WorkspaceRole.OWNER }],
        populate: jest.fn().mockResolvedValue({
          _id: mockWorkspaceId,
          name: 'My Org',
          owner: { _id: mockUserId },
        }),
      };
      mockWorkspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockWs),
      });

      const result = await service.findOneWorkspace(
        mockWorkspaceId,
        mockUserId,
      );
      expect(result).toBeDefined();
    });
  });

  describe('Space Operations', () => {
    it('should create a space inside an authorized workspace', async () => {
      const mockWs = {
        _id: mockWorkspaceId,
        owner: mockUserId,
        members: [{ user: mockUserId, role: WorkspaceRole.OWNER }],
      };
      mockWorkspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockWs),
      });

      const space = await service.createSpace(
        mockWorkspaceId,
        { name: 'Engineering', color: '#10B981' },
        mockUserId,
      );

      expect(space).toBeDefined();
      expect(space.name).toBe('Engineering');
    });

    it('should throw NotFoundException if space does not exist', async () => {
      mockSpaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.findOneSpace(mockSpaceId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Folder & List Operations', () => {
    it('should create a folder inside an authorized space', async () => {
      const mockWs = {
        _id: mockWorkspaceId,
        owner: mockUserId,
        members: [{ user: mockUserId, role: WorkspaceRole.OWNER }],
      };
      const mockSpace = {
        _id: mockSpaceId,
        workspaceId: mockWorkspaceId,
        isPrivate: false,
      };

      mockSpaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSpace),
      });
      mockWorkspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockWs),
      });

      const folder = await service.createFolder(
        mockSpaceId,
        { name: 'Q4 Initiatives' },
        mockUserId,
      );

      expect(folder).toBeDefined();
      expect(folder.name).toBe('Q4 Initiatives');
    });

    it('should create a list inside an authorized space', async () => {
      const mockWs = {
        _id: mockWorkspaceId,
        owner: mockUserId,
        members: [{ user: mockUserId, role: WorkspaceRole.OWNER }],
      };
      const mockSpace = {
        _id: mockSpaceId,
        workspaceId: mockWorkspaceId,
        color: '#4F46E5',
        isPrivate: false,
      };

      mockSpaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSpace),
      });
      mockWorkspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockWs),
      });

      const list = await service.createList(
        mockSpaceId,
        { name: 'Sprint Backlog' },
        mockUserId,
      );

      expect(list).toBeDefined();
      expect(list.name).toBe('Sprint Backlog');
    });

    it('should create a task in a list with candidate key', async () => {
      const mockWs = {
        _id: mockWorkspaceId,
        owner: mockUserId,
        members: [{ user: mockUserId, role: WorkspaceRole.OWNER }],
      };
      const mockSpace = {
        _id: mockSpaceId,
        workspaceId: mockWorkspaceId,
        name: 'General',
        isPrivate: false,
      };
      const mockList = {
        _id: mockListId,
        spaceId: mockSpaceId,
        name: 'Tasks',
      };

      mockListModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockList),
      });
      mockSpaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSpace),
      });
      mockWorkspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockWs),
      });

      const mockPopulated = {
        _id: '507f1f77bcf86cd799439099',
        title: 'New Feature',
        taskKey: 'GENE-1',
      };
      mockTaskModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPopulated),
          }),
        }),
      });

      const task = await service.createListTask(
        mockListId,
        { title: 'New Feature' },
        mockUserId,
      );

      expect(task).toBeDefined();
      expect(task.taskKey).toBe('GENE-1');
    });

    it('should find tasks belonging to a list', async () => {
      const mockWs = {
        _id: mockWorkspaceId,
        owner: mockUserId,
        members: [{ user: mockUserId, role: WorkspaceRole.OWNER }],
      };
      const mockSpace = {
        _id: mockSpaceId,
        workspaceId: mockWorkspaceId,
        name: 'General',
        isPrivate: false,
      };
      const mockList = {
        _id: mockListId,
        spaceId: mockSpaceId,
        name: 'Tasks',
      };

      mockListModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockList),
      });
      mockSpaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSpace),
      });
      mockWorkspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockWs),
      });

      const mockTaskList = [{ _id: 't1', title: 'Task 1' }];
      mockTaskModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockTaskList),
            }),
          }),
        }),
      });

      const tasks = await service.findListTasks(mockListId, mockUserId);
      expect(tasks).toEqual(mockTaskList);
    });

    it('should delete task and its subtasks', async () => {
      const mockWs = {
        _id: mockWorkspaceId,
        owner: mockUserId,
        members: [{ user: mockUserId, role: WorkspaceRole.OWNER }],
      };
      const mockSpace = {
        _id: mockSpaceId,
        workspaceId: mockWorkspaceId,
        name: 'General',
        isPrivate: false,
      };
      const mockList = {
        _id: mockListId,
        spaceId: mockSpaceId,
        name: 'Tasks',
      };

      mockListModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockList),
      });
      mockSpaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSpace),
      });
      mockWorkspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockWs),
      });

      mockTaskModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439099' }),
      });

      const res = await service.deleteListTask(
        mockListId,
        '507f1f77bcf86cd799439099',
        mockUserId,
      );
      expect(res).toEqual({
        success: true,
        message: 'Task deleted successfully',
      });
    });
  });

  describe('Status Workflow Operations', () => {
    const mockWs = {
      _id: mockWorkspaceId,
      owner: mockUserId,
      members: [{ user: mockUserId, role: WorkspaceRole.OWNER }],
    };

    const mockSpaceWithWorkflow = {
      _id: mockSpaceId,
      workspaceId: mockWorkspaceId,
      name: 'Engineering',
      isPrivate: false,
      statusWorkflow: {
        statuses: [
          {
            id: 'todo',
            name: 'To Do',
            category: StatusCategory.TO_DO,
            color: '#d1d5db',
            order: 0,
          },
          {
            id: 'in_progress',
            name: 'In Progress',
            category: StatusCategory.IN_PROGRESS,
            color: '#3b82f6',
            order: 1,
          },
          {
            id: 'done',
            name: 'Done',
            category: StatusCategory.DONE,
            color: '#10b981',
            order: 2,
          },
        ],
        defaultTodoStatusId: 'todo',
        defaultDoneStatusId: 'done',
      },
      save: jest.fn().mockResolvedValue(true),
    };

    const mockListWithWorkflow = {
      _id: mockListId,
      spaceId: mockSpaceId,
      name: 'Sprint 1',
      statusWorkflow: {
        statuses: [
          {
            id: 'backlog',
            name: 'Backlog',
            category: StatusCategory.TO_DO,
            color: '#6b7280',
            order: 0,
          },
          {
            id: 'done',
            name: 'Done',
            category: StatusCategory.DONE,
            color: '#10b981',
            order: 1,
          },
        ],
        defaultTodoStatusId: 'backlog',
        defaultDoneStatusId: 'done',
      },
      save: jest.fn().mockResolvedValue(true),
    };

    beforeEach(() => {
      mockWorkspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockWs),
      });
      mockSpaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockSpaceWithWorkflow }),
      });
      mockListModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockListWithWorkflow }),
      });
    });

    describe('getSpaceStatusWorkflow', () => {
      it('should return space workflow when present', async () => {
        const result = await service.getSpaceStatusWorkflow(
          mockSpaceId,
          mockUserId,
        );
        expect(result).toBeDefined();
        expect(result.statuses).toHaveLength(3);
      });

      it('should return default workflow when space has no workflow', async () => {
        mockSpaceModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: mockSpaceId,
            workspaceId: mockWorkspaceId,
            name: 'Engineering',
            isPrivate: false,
            statusWorkflow: null,
          }),
        });

        const result = await service.getSpaceStatusWorkflow(
          mockSpaceId,
          mockUserId,
        );
        expect(result).toBeDefined();
        expect(result.statuses.length).toBeGreaterThan(0);
        expect(result.defaultTodoStatusId).toBe('todo');
      });
    });

    describe('updateSpaceStatusWorkflow', () => {
      it('should throw ForbiddenException for guest role', async () => {
        const guestWs = {
          _id: mockWorkspaceId,
          owner: mockOtherUserId,
          members: [{ user: mockUserId, role: WorkspaceRole.GUEST }],
        };
        mockWorkspaceModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue(guestWs),
        });

        await expect(
          service.updateSpaceStatusWorkflow(
            mockSpaceId,
            { statuses: mockSpaceWithWorkflow.statusWorkflow.statuses },
            mockUserId,
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw BadRequestException if workflow has empty statuses', async () => {
        await expect(
          service.updateSpaceStatusWorkflow(
            mockSpaceId,
            { statuses: [] },
            mockUserId,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if duplicate status names exist', async () => {
        await expect(
          service.updateSpaceStatusWorkflow(
            mockSpaceId,
            {
              statuses: [
                { name: 'To Do', category: StatusCategory.TO_DO },
                { name: 'to do', category: StatusCategory.TO_DO },
                { name: 'Done', category: StatusCategory.DONE },
              ],
            },
            mockUserId,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if no to_do status category exists', async () => {
        await expect(
          service.updateSpaceStatusWorkflow(
            mockSpaceId,
            {
              statuses: [
                { name: 'Doing', category: StatusCategory.IN_PROGRESS },
                { name: 'Done', category: StatusCategory.DONE },
              ],
            },
            mockUserId,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if no done or closed category exists', async () => {
        await expect(
          service.updateSpaceStatusWorkflow(
            mockSpaceId,
            {
              statuses: [
                { name: 'To Do', category: StatusCategory.TO_DO },
                { name: 'In Progress', category: StatusCategory.IN_PROGRESS },
              ],
            },
            mockUserId,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if defaultTodoStatusId is invalid', async () => {
        await expect(
          service.updateSpaceStatusWorkflow(
            mockSpaceId,
            {
              statuses: [
                { id: 'todo', name: 'To Do', category: StatusCategory.TO_DO },
                { id: 'done', name: 'Done', category: StatusCategory.DONE },
              ],
              defaultTodoStatusId: 'non-existent',
            },
            mockUserId,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should update workflow when valid', async () => {
        const spaceObj = {
          ...mockSpaceWithWorkflow,
          save: jest.fn().mockResolvedValue(true),
        };
        mockSpaceModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue(spaceObj),
        });

        const updated = await service.updateSpaceStatusWorkflow(
          mockSpaceId,
          {
            statuses: [
              {
                id: 'todo',
                name: 'To Do',
                category: StatusCategory.TO_DO,
                color: '#fff',
              },
              {
                id: 'in_progress',
                name: 'In Progress',
                category: StatusCategory.IN_PROGRESS,
                color: '#3b82f6',
              },
              {
                id: 'done',
                name: 'Done',
                category: StatusCategory.DONE,
                color: '#10b981',
              },
            ],
            defaultTodoStatusId: 'todo',
          },
          mockUserId,
        );

        expect(updated).toBeDefined();
        expect(spaceObj.save).toHaveBeenCalled();
      });

      it('should throw BadRequestException if removed status has tasks and no migration provided', async () => {
        const spaceObj = {
          ...mockSpaceWithWorkflow,
          save: jest.fn().mockResolvedValue(true),
        };
        mockSpaceModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue(spaceObj),
        });
        mockListModel.find.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([{ _id: 'list1' }]),
            }),
          }),
        });
        mockTaskModel.countDocuments.mockReturnValue({
          exec: jest.fn().mockResolvedValue(5),
        });

        await expect(
          service.updateSpaceStatusWorkflow(
            mockSpaceId,
            {
              statuses: [
                { id: 'todo', name: 'To Do', category: StatusCategory.TO_DO },
                { id: 'done', name: 'Done', category: StatusCategory.DONE },
              ],
            },
            mockUserId,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should migrate tasks when removed status has a valid migration target', async () => {
        const spaceObj = {
          ...mockSpaceWithWorkflow,
          save: jest.fn().mockResolvedValue(true),
        };
        mockSpaceModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue(spaceObj),
        });
        mockListModel.find.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([{ _id: 'list1' }]),
            }),
          }),
        });
        mockTaskModel.countDocuments.mockReturnValue({
          exec: jest.fn().mockResolvedValue(3),
        });
        mockTaskModel.updateMany.mockReturnValue({
          exec: jest.fn().mockResolvedValue({ modifiedCount: 3 }),
        });

        const result = await service.updateSpaceStatusWorkflow(
          mockSpaceId,
          {
            statuses: [
              { id: 'todo', name: 'To Do', category: StatusCategory.TO_DO },
              { id: 'done', name: 'Done', category: StatusCategory.DONE },
            ],
            migrations: [{ fromStatusId: 'in_progress', toStatusId: 'todo' }],
          },
          mockUserId,
        );

        expect(result).toBeDefined();
        expect(mockTaskModel.updateMany).toHaveBeenCalled();
      });
    });

    describe('getListStatusWorkflow', () => {
      it('should return list workflow with isInherited: false when list has its own workflow', async () => {
        const result = await service.getListStatusWorkflow(
          mockListId,
          mockUserId,
        );
        expect(result.isInherited).toBe(false);
        expect(result.workflow.statuses[0].id).toBe('backlog');
      });

      it('should inherit space workflow when list has no custom workflow', async () => {
        mockListModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: mockListId,
            spaceId: mockSpaceId,
            name: 'Sprint 1',
            statusWorkflow: null,
          }),
        });

        const result = await service.getListStatusWorkflow(
          mockListId,
          mockUserId,
        );
        expect(result.isInherited).toBe(true);
        expect(result.workflow.statuses).toHaveLength(3);
      });
    });

    describe('updateListStatusWorkflow', () => {
      it('should update list workflow and save', async () => {
        const listObj = {
          ...mockListWithWorkflow,
          save: jest.fn().mockResolvedValue(true),
        };
        mockListModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue(listObj),
        });

        const updated = await service.updateListStatusWorkflow(
          mockListId,
          {
            statuses: [
              {
                id: 'backlog',
                name: 'Backlog',
                category: StatusCategory.TO_DO,
              },
              {
                id: 'in_review',
                name: 'In Review',
                category: StatusCategory.IN_PROGRESS,
              },
              { id: 'done', name: 'Done', category: StatusCategory.DONE },
            ],
          },
          mockUserId,
        );

        expect(updated).toBeDefined();
        expect(listObj.save).toHaveBeenCalled();
      });

      it('should throw BadRequestException if removed status has tasks and no migration given', async () => {
        const listObj = {
          ...mockListWithWorkflow,
          save: jest.fn().mockResolvedValue(true),
        };
        mockListModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue(listObj),
        });
        mockTaskModel.countDocuments.mockReturnValue({
          exec: jest.fn().mockResolvedValue(2),
        });

        await expect(
          service.updateListStatusWorkflow(
            mockListId,
            {
              statuses: [
                { id: 'todo', name: 'To Do', category: StatusCategory.TO_DO },
                { id: 'done', name: 'Done', category: StatusCategory.DONE },
              ],
            },
            mockUserId,
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('resetListStatusWorkflow', () => {
      it('should reset list statusWorkflow to undefined and return inherited space workflow', async () => {
        const listObj = {
          ...mockListWithWorkflow,
          save: jest.fn().mockResolvedValue(true),
          statusWorkflow: mockListWithWorkflow.statusWorkflow as
            | typeof mockListWithWorkflow.statusWorkflow
            | undefined,
        };
        mockListModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue(listObj),
        });

        const result = await service.resetListStatusWorkflow(
          mockListId,
          mockUserId,
        );
        expect(result.isInherited).toBe(true);
        expect(listObj.statusWorkflow).toBeUndefined();
        expect(listObj.save).toHaveBeenCalled();
      });
    });

    describe('createListTask status validation', () => {
      it('should reject status that is not part of list workflow', async () => {
        await expect(
          service.createListTask(
            mockListId,
            { title: 'Invalid Status Task', status: 'unknown_status' },
            mockUserId,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should accept valid status and set completed flag if category is done', async () => {
        const mockCreatedTask = {
          _id: 'task123',
          title: 'Done Task',
          status: 'done',
          completed: true,
          taskKey: 'SPRI-1',
          save: jest.fn().mockResolvedValue({
            _id: 'task123',
            title: 'Done Task',
            status: 'done',
            completed: true,
            taskKey: 'SPRI-1',
          }),
        };
        (mockTaskModel as unknown as jest.Mock).mockImplementation(
          () => mockCreatedTask,
        );
        mockTaskModel.countDocuments.mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        });
        mockTaskModel.findById.mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockCreatedTask),
            }),
          }),
        });

        const result = await service.createListTask(
          mockListId,
          { title: 'Done Task', status: 'done' },
          mockUserId,
        );

        expect(result).toBeDefined();
        expect(result.status).toBe('done');
      });
    });
  });
});
