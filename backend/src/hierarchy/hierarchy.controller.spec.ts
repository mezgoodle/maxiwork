import { Test, TestingModule } from '@nestjs/testing';
import { HierarchyController } from './hierarchy.controller';
import { HierarchyService } from './hierarchy.service';

describe('HierarchyController', () => {
  let controller: HierarchyController;
  let mockHierarchyService: {
    createWorkspace: jest.Mock;
    findAllWorkspaces: jest.Mock;
    findOneWorkspace: jest.Mock;
    updateWorkspace: jest.Mock;
    deleteWorkspace: jest.Mock;
    getWorkspaceTree: jest.Mock;
    createSpace: jest.Mock;
    findAllSpaces: jest.Mock;
    findOneSpace: jest.Mock;
    updateSpace: jest.Mock;
    deleteSpace: jest.Mock;
    createFolder: jest.Mock;
    findAllFolders: jest.Mock;
    findOneFolder: jest.Mock;
    updateFolder: jest.Mock;
    deleteFolder: jest.Mock;
    createList: jest.Mock;
    findAllLists: jest.Mock;
    findOneList: jest.Mock;
    updateList: jest.Mock;
    deleteList: jest.Mock;
  };

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'user@example.com',
  };

  beforeEach(async () => {
    mockHierarchyService = {
      createWorkspace: jest.fn(),
      findAllWorkspaces: jest.fn(),
      findOneWorkspace: jest.fn(),
      updateWorkspace: jest.fn(),
      deleteWorkspace: jest.fn(),
      getWorkspaceTree: jest.fn(),
      createSpace: jest.fn(),
      findAllSpaces: jest.fn(),
      findOneSpace: jest.fn(),
      updateSpace: jest.fn(),
      deleteSpace: jest.fn(),
      createFolder: jest.fn(),
      findAllFolders: jest.fn(),
      findOneFolder: jest.fn(),
      updateFolder: jest.fn(),
      deleteFolder: jest.fn(),
      createList: jest.fn(),
      findAllLists: jest.fn(),
      findOneList: jest.fn(),
      updateList: jest.fn(),
      deleteList: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HierarchyController],
      providers: [
        {
          provide: HierarchyService,
          useValue: mockHierarchyService,
        },
      ],
    }).compile();

    controller = module.get<HierarchyController>(HierarchyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('createWorkspace should forward to service', async () => {
    const dto = { name: 'Acme' };
    mockHierarchyService.createWorkspace.mockResolvedValue({
      _id: 'ws1',
      ...dto,
    });

    const result = await controller.createWorkspace(mockUser, dto);
    expect(mockHierarchyService.createWorkspace).toHaveBeenCalledWith(
      dto,
      String(mockUser._id),
    );
    expect(result).toEqual({ _id: 'ws1', ...dto });
  });

  it('findAllWorkspaces should forward to service', async () => {
    mockHierarchyService.findAllWorkspaces.mockResolvedValue([{ _id: 'ws1' }]);
    const result = await controller.findAllWorkspaces(mockUser);
    expect(mockHierarchyService.findAllWorkspaces).toHaveBeenCalledWith(
      String(mockUser._id),
    );
    expect(result).toHaveLength(1);
  });

  it('createSpace should forward to service with workspaceId', async () => {
    const dto = { name: 'Engineering' };
    mockHierarchyService.createSpace.mockResolvedValue({ _id: 's1', ...dto });

    const result = await controller.createSpace(
      '507f1f77bcf86cd799439011',
      mockUser,
      dto,
    );
    expect(mockHierarchyService.createSpace).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      dto,
      String(mockUser._id),
    );
    expect(result).toEqual({ _id: 's1', ...dto });
  });

  it('createFolder should forward to service with spaceId', async () => {
    const dto = { name: 'Q4' };
    mockHierarchyService.createFolder.mockResolvedValue({ _id: 'f1', ...dto });

    const result = await controller.createFolder(
      '507f1f77bcf86cd799439011',
      mockUser,
      dto,
    );
    expect(mockHierarchyService.createFolder).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      dto,
      String(mockUser._id),
    );
    expect(result).toEqual({ _id: 'f1', ...dto });
  });

  it('createList should forward to service with spaceId', async () => {
    const dto = { name: 'Sprint Backlog' };
    mockHierarchyService.createList.mockResolvedValue({ _id: 'l1', ...dto });

    const result = await controller.createList(
      '507f1f77bcf86cd799439011',
      mockUser,
      dto,
    );
    expect(mockHierarchyService.createList).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      dto,
      String(mockUser._id),
    );
    expect(result).toEqual({ _id: 'l1', ...dto });
  });

  it('getWorkspaceTree should forward to service', async () => {
    mockHierarchyService.getWorkspaceTree.mockResolvedValue({
      workspace: { id: 'ws1', name: 'Acme' },
      spaces: [],
    });

    const result = await controller.getWorkspaceTree(
      '507f1f77bcf86cd799439011',
      mockUser,
    );
    expect(mockHierarchyService.getWorkspaceTree).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      String(mockUser._id),
    );
    expect(result.workspace.name).toBe('Acme');
  });
});
