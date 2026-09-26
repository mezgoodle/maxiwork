import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { MoveSubtaskDto } from './dto/move-subtask.dto';

describe('TasksController', () => {
  let controller: TasksController;
  let service: Record<keyof TasksService, jest.Mock>;

  const mockUserId = '507f1f77bcf86cd799439011';
  const mockProjectId = '607f1f77bcf86cd799439099';
  const mockTaskId = '707f1f77bcf86cd799439088';

  const mockUser = {
    _id: mockUserId,
    email: 'user@example.com',
  };

  beforeEach(async () => {
    service = {
      checkProjectAccess: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      remove: jest.fn(),
      createSubtask: jest.fn(),
      findSubtasks: jest.fn(),
      getTaskTree: jest.fn(),
      moveSubtask: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate task creation to TasksService', async () => {
      const dto: CreateTaskDto = {
        title: 'New Task',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
      };
      const expected = { _id: mockTaskId, ...dto };
      service.create.mockResolvedValue(expected);

      const result = await controller.create(mockProjectId, mockUser, dto);
      expect(service.create).toHaveBeenCalledWith(
        mockProjectId,
        dto,
        mockUserId,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('should delegate query to TasksService', async () => {
      const query: GetTasksQueryDto = { page: 1, limit: 20 };
      const expected = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 1 },
      };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(mockProjectId, query, mockUser);
      expect(service.findAll).toHaveBeenCalledWith(
        mockProjectId,
        query,
        mockUserId,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should delegate findOne to TasksService', async () => {
      const expected = { _id: mockTaskId, title: 'Found' };
      service.findOne.mockResolvedValue(expected);

      const result = await controller.findOne(
        mockProjectId,
        mockTaskId,
        mockUser,
      );
      expect(service.findOne).toHaveBeenCalledWith(
        mockProjectId,
        mockTaskId,
        mockUserId,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should delegate update to TasksService', async () => {
      const dto: UpdateTaskDto = { title: 'Updated' };
      const expected = { _id: mockTaskId, title: 'Updated' };
      service.update.mockResolvedValue(expected);

      const result = await controller.update(
        mockProjectId,
        mockTaskId,
        mockUser,
        dto,
      );
      expect(service.update).toHaveBeenCalledWith(
        mockProjectId,
        mockTaskId,
        dto,
        mockUserId,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('updateStatus', () => {
    it('should delegate updateStatus to TasksService', async () => {
      const dto: UpdateTaskStatusDto = { status: TaskStatus.DONE };
      const expected = { _id: mockTaskId, status: TaskStatus.DONE };
      service.updateStatus.mockResolvedValue(expected);

      const result = await controller.updateStatus(
        mockProjectId,
        mockTaskId,
        mockUser,
        dto,
      );
      expect(service.updateStatus).toHaveBeenCalledWith(
        mockProjectId,
        mockTaskId,
        dto,
        mockUserId,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should delegate remove to TasksService', async () => {
      const expected = { message: 'Task deleted successfully', id: mockTaskId };
      service.remove.mockResolvedValue(expected);

      const result = await controller.remove(
        mockProjectId,
        mockTaskId,
        mockUser,
      );
      expect(service.remove).toHaveBeenCalledWith(
        mockProjectId,
        mockTaskId,
        mockUserId,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('createSubtask', () => {
    it('should delegate createSubtask to TasksService', async () => {
      const dto: CreateSubtaskDto = {
        title: 'Child Task',
        priority: TaskPriority.MEDIUM,
      };
      const expected = { _id: 'child-1', ...dto };
      service.createSubtask.mockResolvedValue(expected);

      const result = await controller.createSubtask(
        mockProjectId,
        mockTaskId,
        mockUser,
        dto,
      );
      expect(service.createSubtask).toHaveBeenCalledWith(
        mockProjectId,
        mockTaskId,
        dto,
        mockUserId,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('findSubtasks', () => {
    it('should delegate findSubtasks to TasksService', async () => {
      const expected = [{ _id: 'child-1' }];
      service.findSubtasks.mockResolvedValue(expected);

      const result = await controller.findSubtasks(
        mockProjectId,
        mockTaskId,
        mockUser,
      );
      expect(service.findSubtasks).toHaveBeenCalledWith(
        mockProjectId,
        mockTaskId,
        mockUserId,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('getTaskTree', () => {
    it('should delegate getTaskTree to TasksService', async () => {
      const expected = { _id: mockTaskId, subtasks: [] };
      service.getTaskTree.mockResolvedValue(expected);

      const result = await controller.getTaskTree(
        mockProjectId,
        mockTaskId,
        mockUser,
      );
      expect(service.getTaskTree).toHaveBeenCalledWith(
        mockProjectId,
        mockTaskId,
        mockUserId,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('moveSubtask', () => {
    it('should delegate moveSubtask to TasksService', async () => {
      const dto: MoveSubtaskDto = { newParentTaskId: 'new-parent' };
      const expected = { _id: mockTaskId, parentTaskId: 'new-parent' };
      service.moveSubtask.mockResolvedValue(expected);

      const result = await controller.moveSubtask(
        mockProjectId,
        mockTaskId,
        mockUser,
        dto,
      );
      expect(service.moveSubtask).toHaveBeenCalledWith(
        mockProjectId,
        mockTaskId,
        dto,
        mockUserId,
      );
      expect(result).toEqual(expected);
    });
  });
});
