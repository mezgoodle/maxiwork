import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { HierarchyService } from './hierarchy.service';
import { Workspace } from './schemas/workspace.schema';
import { Space } from './schemas/space.schema';
import { Folder } from './schemas/folder.schema';
import { List } from './schemas/list.schema';
import { Task } from '../tasks/schemas/task.schema';
import { Project } from '../projects/schemas/project.schema';
import { User } from '../users/schemas/user.schema';
import { WorkspaceRole } from './enums/workspace-role.enum';

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
});
