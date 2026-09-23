import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from './schemas/project.schema';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let mockProjectModel: any;

  const mockOwnerId = '507f1f77bcf86cd799439011';
  const mockMemberId = '507f1f77bcf86cd799439022';
  const mockOtherUserId = '507f1f77bcf86cd799439033';
  const mockProjectId = '607f1f77bcf86cd799439099';

  beforeEach(async () => {
    mockProjectModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({
        ...dto,
        _id: mockProjectId,
        populate: jest.fn().mockResolvedValue({
          ...dto,
          _id: mockProjectId,
          owner: {
            _id: mockOwnerId,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
        }),
      }),
    }));

    mockProjectModel.findOne = jest.fn();
    mockProjectModel.find = jest.fn();
    mockProjectModel.findById = jest.fn();
    mockProjectModel.findByIdAndDelete = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getModelToken(Project.name),
          useValue: mockProjectModel,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a project with uppercase prefix', async () => {
      mockProjectModel.findOne.mockResolvedValue(null);

      const result = await service.create(
        {
          name: 'Maxi Project',
          prefix: 'max',
          description: 'A test project',
        },
        mockOwnerId,
      );

      expect(mockProjectModel.findOne).toHaveBeenCalledWith({ prefix: 'MAX' });
      expect(result).toHaveProperty('_id', mockProjectId);
      expect(result.prefix).toBe('MAX');
    });

    it('should throw ConflictException if prefix already exists', async () => {
      mockProjectModel.findOne.mockResolvedValue({
        _id: 'existing-id',
        prefix: 'MAX',
      });

      await expect(
        service.create(
          {
            name: 'Another Project',
            prefix: 'max',
          },
          mockOwnerId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if save() throws duplicate key error 11000', async () => {
      mockProjectModel.findOne.mockResolvedValue(null);
      mockProjectModel.mockImplementationOnce((dto) => ({
        ...dto,
        save: jest.fn().mockRejectedValue({ code: 11000 }),
      }));

      await expect(
        service.create(
          {
            name: 'Another Project',
            prefix: 'max',
          },
          mockOwnerId,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return projects where user is owner or member', async () => {
      const mockList = [
        { _id: 'p1', name: 'Project 1', prefix: 'P1' },
        { _id: 'p2', name: 'Project 2', prefix: 'P2' },
      ];

      mockProjectModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockList),
          }),
        }),
      });

      const result = await service.findAll(mockOwnerId);

      expect(mockProjectModel.find).toHaveBeenCalledWith({
        $or: [{ owner: mockOwnerId }, { members: mockOwnerId }],
      });
      expect(result).toEqual(mockList);
    });
  });

  describe('findOne', () => {
    it('should return project when user is owner', async () => {
      const mockProject = {
        _id: mockProjectId,
        name: 'Project 1',
        prefix: 'P1',
        owner: { _id: mockOwnerId },
        members: [],
      };

      mockProjectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockProject),
          }),
        }),
      });

      const result = await service.findOne(mockProjectId, mockOwnerId);
      expect(result).toEqual(mockProject);
    });

    it('should return project when user is member', async () => {
      const mockProject = {
        _id: mockProjectId,
        name: 'Project 1',
        prefix: 'P1',
        owner: { _id: mockOwnerId },
        members: [{ _id: mockMemberId }],
      };

      mockProjectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockProject),
          }),
        }),
      });

      const result = await service.findOne(mockProjectId, mockMemberId);
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockProjectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      await expect(service.findOne(mockProjectId, mockOwnerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is neither owner nor member', async () => {
      const mockProject = {
        _id: mockProjectId,
        name: 'Project 1',
        prefix: 'P1',
        owner: { _id: mockOwnerId },
        members: [{ _id: mockMemberId }],
      };

      mockProjectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockProject),
          }),
        }),
      });

      await expect(
        service.findOne(mockProjectId, mockOtherUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update project fields when user is owner', async () => {
      const mockProject = {
        _id: mockProjectId,
        name: 'Old Name',
        prefix: 'OLD',
        owner: mockOwnerId,
        save: jest.fn().mockResolvedValue({
          _id: mockProjectId,
          name: 'New Name',
          prefix: 'NEW',
          populate: jest.fn().mockResolvedValue({
            _id: mockProjectId,
            name: 'New Name',
            prefix: 'NEW',
          }),
        }),
      };

      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProject),
      });
      mockProjectModel.findOne.mockResolvedValue(null);

      const result = await service.update(
        mockProjectId,
        { name: 'New Name', prefix: 'new' },
        mockOwnerId,
      );

      expect(mockProject.name).toBe('New Name');
      expect(mockProject.prefix).toBe('NEW');
      expect(result.name).toBe('New Name');
    });

    it('should throw NotFoundException if project to update not found', async () => {
      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update(mockProjectId, { name: 'New Name' }, mockOwnerId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if non-owner tries to update', async () => {
      const mockProject = {
        _id: mockProjectId,
        owner: mockOwnerId,
      };

      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProject),
      });

      await expect(
        service.update(mockProjectId, { name: 'New Name' }, mockOtherUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if new prefix is already in use by another project', async () => {
      const mockProject = {
        _id: mockProjectId,
        prefix: 'OLD',
        owner: mockOwnerId,
      };

      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProject),
      });
      mockProjectModel.findOne.mockResolvedValue({
        _id: 'different-project-id',
        prefix: 'NEW',
      });

      await expect(
        service.update(mockProjectId, { prefix: 'NEW' }, mockOwnerId),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if save() causes duplicate key 11000 error', async () => {
      const mockProject = {
        _id: mockProjectId,
        prefix: 'OLD',
        owner: mockOwnerId,
        save: jest.fn().mockRejectedValue({ code: 11000 }),
      };

      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProject),
      });

      await expect(
        service.update(mockProjectId, { name: 'New' }, mockOwnerId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete project when user is owner', async () => {
      const mockProject = {
        _id: mockProjectId,
        owner: mockOwnerId,
      };

      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProject),
      });
      mockProjectModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProject),
      });

      const result = await service.remove(mockProjectId, mockOwnerId);

      expect(mockProjectModel.findByIdAndDelete).toHaveBeenCalledWith(
        mockProjectId,
      );
      expect(result).toHaveProperty('message', 'Project deleted successfully');
      expect(result).toHaveProperty('id', mockProjectId);
    });

    it('should throw NotFoundException if project to delete not found', async () => {
      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(mockProjectId, mockOwnerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if non-owner tries to delete', async () => {
      const mockProject = {
        _id: mockProjectId,
        owner: mockOwnerId,
      };

      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProject),
      });

      await expect(
        service.remove(mockProjectId, mockOtherUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
