import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { TasksService } from './tasks.service';
import { Task } from './schemas/task.schema';
import { Project } from '../projects/schemas/project.schema';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';

interface MockTaskModelConstructor {
  new (dto: Record<string, unknown>): {
    save: () => Promise<{
      populate: (paths: unknown[]) => Promise<Record<string, unknown>>;
    }>;
  };
  find: jest.Mock;
  findOne: jest.Mock;
  findById: jest.Mock;
  countDocuments: jest.Mock;
  findOneAndDelete: jest.Mock;
  deleteOne: jest.Mock;
  deleteMany: jest.Mock;
  updateOne: jest.Mock;
}

interface MockProjectModel {
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  updateOne: jest.Mock;
}

describe('TasksService', () => {
  let service: TasksService;
  let mockTaskModel: MockTaskModelConstructor;
  let mockProjectModel: MockProjectModel;

  const mockOwnerId = '507f1f77bcf86cd799439011';
  const mockMemberId = '507f1f77bcf86cd799439022';
  const mockOtherUserId = '507f1f77bcf86cd799439033';
  const mockProjectId = '607f1f77bcf86cd799439099';
  const mockTaskId = '707f1f77bcf86cd799439088';

  const mockProject = {
    _id: mockProjectId,
    name: 'Test Project',
    prefix: 'TEST',
    owner: mockOwnerId,
    members: [mockMemberId],
  };

  beforeEach(async () => {
    const taskModelFn = jest
      .fn()
      .mockImplementation((dto: Record<string, unknown>) => ({
        ...dto,
        _id: mockTaskId,
        save: jest.fn().mockResolvedValue({
          ...dto,
          _id: mockTaskId,
          populate: jest.fn().mockResolvedValue({
            ...dto,
            _id: mockTaskId,
            reporter: {
              _id: mockOwnerId,
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
            },
          }),
        }),
      })) as unknown as MockTaskModelConstructor;

    taskModelFn.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    });
    taskModelFn.findOne = jest.fn();
    taskModelFn.findById = jest.fn();
    taskModelFn.countDocuments = jest.fn();
    taskModelFn.findOneAndDelete = jest.fn();
    taskModelFn.deleteOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    });
    taskModelFn.deleteMany = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    });
    taskModelFn.updateOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    });

    mockTaskModel = taskModelFn;

    mockProjectModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProject),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          prefix: mockProject.prefix,
          taskCounter: 1,
        }),
      }),
      updateOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getModelToken(Task.name),
          useValue: mockTaskModel,
        },
        {
          provide: getModelToken(Project.name),
          useValue: mockProjectModel,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkProjectAccess', () => {
    it('should grant access to project owner', async () => {
      const project = await service.checkProjectAccess(
        mockProjectId,
        mockOwnerId,
      );
      expect(project).toBeDefined();
      expect(project._id).toBe(mockProjectId);
    });

    it('should grant access to project member', async () => {
      const project = await service.checkProjectAccess(
        mockProjectId,
        mockMemberId,
      );
      expect(project).toBeDefined();
      expect(project._id).toBe(mockProjectId);
    });

    it('should throw NotFoundException when project is not found', async () => {
      mockProjectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.checkProjectAccess(mockProjectId, mockOwnerId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user has no access', async () => {
      await expect(
        service.checkProjectAccess(mockProjectId, mockOtherUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create first task with key TEST-1', async () => {
      mockTaskModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const dto: CreateTaskDto = {
        title: 'First Task',
        description: 'First description',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
      };

      const result = await service.create(mockProjectId, dto, mockOwnerId);
      expect(result).toBeDefined();
      expect(mockTaskModel).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'First Task',
          taskKey: 'TEST-1',
          project: mockProjectId,
          reporter: mockOwnerId,
        }),
      );
    });

    it('should increment task key based on existing tasks', async () => {
      mockTaskModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest
              .fn()
              .mockResolvedValue([
                { taskKey: 'TEST-1' },
                { taskKey: 'TEST-4' },
                { taskKey: 'TEST-2' },
              ]),
          }),
        }),
      });

      mockProjectModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          prefix: 'TEST',
          taskCounter: 5,
        }),
      });

      const dto: CreateTaskDto = {
        title: 'Next Task',
      };

      await service.create(mockProjectId, dto, mockOwnerId);
      expect(mockTaskModel).toHaveBeenCalledWith(
        expect.objectContaining({
          taskKey: 'TEST-5',
        }),
      );
    });

    it('should throw BadRequestException if assignee is not a member of the project', async () => {
      const dto: CreateTaskDto = {
        title: 'Task with external assignee',
        assignee: mockOtherUserId,
      };

      await expect(
        service.create(mockProjectId, dto, mockOwnerId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle optional dates and assignee conversion', async () => {
      mockTaskModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const dto: CreateTaskDto = {
        title: 'Dated Task',
        assignee: mockMemberId,
        startDate: '2026-09-24T00:00:00.000Z',
        dueDate: '2026-09-30T00:00:00.000Z',
      };

      await service.create(mockProjectId, dto, mockOwnerId);
      expect(mockTaskModel).toHaveBeenCalledWith(
        expect.objectContaining({
          assignee: expect.any(Types.ObjectId),
          startDate: expect.any(Date),
          dueDate: expect.any(Date),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should query tasks with pagination and sorting', async () => {
      const mockQueryExec = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ title: 'Task 1' }]),
      };

      mockTaskModel.find.mockReturnValue(mockQueryExec);
      mockTaskModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(25),
      });

      const query: GetTasksQueryDto = {
        page: 2,
        limit: 10,
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        search: 'bug',
      };

      const result = await service.findAll(mockProjectId, query, mockOwnerId);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });

      expect(mockTaskModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          project: mockProjectId,
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          $or: [
            { title: { $regex: 'bug', $options: 'i' } },
            { description: { $regex: 'bug', $options: 'i' } },
          ],
        }),
      );
    });

    it('should escape regex special characters in search query', async () => {
      const mockQueryExec = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockTaskModel.find.mockReturnValue(mockQueryExec);
      mockTaskModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const query: GetTasksQueryDto = {
        search: 'bug.*fix(1)',
      };

      await service.findAll(mockProjectId, query, mockOwnerId);

      expect(mockTaskModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [
            { title: { $regex: 'bug\\.\\*fix\\(1\\)', $options: 'i' } },
            { description: { $regex: 'bug\\.\\*fix\\(1\\)', $options: 'i' } },
          ],
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return task when found', async () => {
      const mockTask = { _id: mockTaskId, title: 'Found task' };
      mockTaskModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTask),
          }),
        }),
      });

      const result = await service.findOne(
        mockProjectId,
        mockTaskId,
        mockOwnerId,
      );
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockTaskModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      await expect(
        service.findOne(mockProjectId, mockTaskId, mockOwnerId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update task fields', async () => {
      const mockExisting = {
        _id: mockTaskId,
        title: 'Old Title',
        save: jest.fn().mockResolvedValue({
          populate: jest.fn().mockResolvedValue({
            _id: mockTaskId,
            title: 'New Title',
          }),
        }),
      };

      mockTaskModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockExisting),
      });

      const updateDto: UpdateTaskDto = {
        title: 'New Title',
        status: TaskStatus.DONE,
      };

      const result = await service.update(
        mockProjectId,
        mockTaskId,
        updateDto,
        mockOwnerId,
      );
      expect(mockExisting.title).toBe('New Title');
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when updating assignee to non-member', async () => {
      const mockExisting = {
        _id: mockTaskId,
        title: 'Task',
        save: jest.fn(),
      };

      mockTaskModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockExisting),
      });

      const updateDto: UpdateTaskDto = {
        assignee: mockOtherUserId,
      };

      await expect(
        service.update(mockProjectId, mockTaskId, updateDto, mockOwnerId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if task to update does not exist', async () => {
      mockTaskModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update(mockProjectId, mockTaskId, {}, mockOwnerId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update task status', async () => {
      const mockExisting = {
        _id: mockTaskId,
        status: TaskStatus.TODO,
        save: jest.fn().mockResolvedValue({
          populate: jest.fn().mockResolvedValue({
            _id: mockTaskId,
            status: TaskStatus.DONE,
          }),
        }),
      };

      mockTaskModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockExisting),
      });

      const statusDto: UpdateTaskStatusDto = {
        status: TaskStatus.DONE,
      };

      const result = await service.updateStatus(
        mockProjectId,
        mockTaskId,
        statusDto,
        mockOwnerId,
      );
      expect(mockExisting.status).toBe(TaskStatus.DONE);
      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should delete task and return confirmation', async () => {
      mockTaskModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockTaskId,
          status: TaskStatus.TODO,
          parentTaskId: null,
        }),
      });
      mockTaskModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.remove(
        mockProjectId,
        mockTaskId,
        mockOwnerId,
      );
      expect(result).toEqual({
        message: 'Task deleted successfully',
        id: mockTaskId,
      });
      expect(mockTaskModel.deleteOne).toHaveBeenCalled();
    });

    it('should decrement parent counters when deleting a subtask', async () => {
      const parentId = '807f1f77bcf86cd799439001';
      mockTaskModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockTaskId,
          status: TaskStatus.DONE,
          parentTaskId: new Types.ObjectId(parentId),
        }),
      });
      mockTaskModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await service.remove(mockProjectId, mockTaskId, mockOwnerId);
      expect(mockTaskModel.updateOne).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(parentId) },
        { $inc: { subtasksCount: -1, completedSubtasksCount: -1 } },
      );
    });

    it('should throw NotFoundException when task to delete is not found', async () => {
      mockTaskModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.remove(mockProjectId, mockTaskId, mockOwnerId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createSubtask', () => {
    const parentId = '807f1f77bcf86cd799439001';
    const subtaskDto: CreateSubtaskDto = {
      title: 'Child Subtask',
      priority: TaskPriority.HIGH,
    };

    it('should create subtask and increment parent subtasksCount', async () => {
      mockTaskModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: parentId,
          subtasksCount: 2,
          list: new Types.ObjectId('907f1f77bcf86cd799439001'),
        }),
      });

      const result = await service.createSubtask(
        mockProjectId,
        parentId,
        subtaskDto,
        mockOwnerId,
      );
      expect(result).toBeDefined();
      expect(mockTaskModel.updateOne).toHaveBeenCalledWith(
        { _id: parentId },
        { $inc: { subtasksCount: 1 } },
      );
    });

    it('should throw NotFoundException if parent task does not exist', async () => {
      mockTaskModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.createSubtask(mockProjectId, parentId, subtaskDto, mockOwnerId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findSubtasks', () => {
    const parentId = '807f1f77bcf86cd799439001';

    it('should return list of subtasks for a parent task', async () => {
      mockTaskModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: parentId }),
      });
      mockTaskModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([{ _id: mockTaskId }]),
            }),
          }),
        }),
      });

      const result = await service.findSubtasks(
        mockProjectId,
        parentId,
        mockOwnerId,
      );
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException if parent does not exist', async () => {
      mockTaskModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.findSubtasks(mockProjectId, parentId, mockOwnerId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTaskTree', () => {
    it('should return hierarchical task tree recursively', async () => {
      mockTaskModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest
                .fn()
                .mockResolvedValue({ _id: mockTaskId, title: 'Root Task' }),
            }),
          }),
        }),
      });

      // Child query for root
      mockTaskModel.find.mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest
                  .fn()
                  .mockResolvedValue([{ _id: 'sub-1', title: 'Subtask 1' }]),
              }),
            }),
          }),
        }),
      });

      // Child query for sub-1 (leaf)
      mockTaskModel.find.mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      const result = await service.getTaskTree(
        mockProjectId,
        mockTaskId,
        mockOwnerId,
      );
      expect(result).toBeDefined();
      expect(result._id).toBe(mockTaskId);
      expect(Array.isArray(result.subtasks)).toBe(true);
      expect((result.subtasks as unknown[]).length).toBe(1);
    });
  });

  describe('moveSubtask', () => {
    const oldParentId = '807f1f77bcf86cd799439001';
    const newParentId = '807f1f77bcf86cd799439002';

    it('should move subtask to new parent and adjust counters', async () => {
      const mockTaskDoc = {
        _id: mockTaskId,
        parentTaskId: new Types.ObjectId(oldParentId),
        status: TaskStatus.DONE,
        save: jest.fn().mockResolvedValue({
          _id: mockTaskId,
          populate: jest.fn().mockResolvedValue({ _id: mockTaskId }),
        }),
      };
      mockTaskModel.findOne
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockTaskDoc),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({
            _id: newParentId,
            list: 'list-1',
            parentTaskId: null,
          }),
        });

      const result = await service.moveSubtask(
        mockProjectId,
        mockTaskId,
        { newParentTaskId: newParentId },
        mockOwnerId,
      );
      expect(result).toBeDefined();
      expect(mockTaskModel.updateOne).toHaveBeenCalledWith(
        { _id: oldParentId },
        { $inc: { subtasksCount: -1, completedSubtasksCount: -1 } },
      );
      expect(mockTaskModel.updateOne).toHaveBeenCalledWith(
        { _id: newParentId },
        { $inc: { subtasksCount: 1, completedSubtasksCount: 1 } },
      );
    });

    it('should prevent self-parenting', async () => {
      mockTaskModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockTaskId,
          parentTaskId: null,
        }),
      });

      await expect(
        service.moveSubtask(
          mockProjectId,
          mockTaskId,
          { newParentTaskId: mockTaskId },
          mockOwnerId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
