import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTaskDto } from './create-task.dto';
import { UpdateTaskDto } from './update-task.dto';
import { UpdateTaskStatusDto } from './update-task-status.dto';
import { GetTasksQueryDto } from './get-tasks-query.dto';
import { CreateSubtaskDto } from './create-subtask.dto';
import { MoveSubtaskDto } from './move-subtask.dto';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';

describe('Tasks DTOs', () => {
  describe('CreateTaskDto', () => {
    it('should validate valid payload with minimal fields', async () => {
      const dto = plainToInstance(CreateTaskDto, {
        title: 'Task Title',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate valid payload with all fields', async () => {
      const dto = plainToInstance(CreateTaskDto, {
        title: '  Task Title  ',
        description: 'Task description',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        assignee: '507f1f77bcf86cd799439011',
        startDate: '2026-09-24T00:00:00.000Z',
        dueDate: '2026-09-30T00:00:00.000Z',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.title).toBe('Task Title');
    });

    it('should fail when title is empty', async () => {
      const dto = plainToInstance(CreateTaskDto, {
        title: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when status or priority is invalid', async () => {
      const dto = plainToInstance(CreateTaskDto, {
        title: 'Task Title',
        status: 'invalid_status',
        priority: 'unknown_priority',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(2);
    });

    it('should fail when assignee is not a valid Mongo ObjectId', async () => {
      const dto = plainToInstance(CreateTaskDto, {
        title: 'Task Title',
        assignee: 'not-an-id',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateTaskDto', () => {
    it('should pass with empty object', async () => {
      const dto = plainToInstance(UpdateTaskDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with valid partial updates', async () => {
      const dto = plainToInstance(UpdateTaskDto, {
        title: 'Updated title',
        status: TaskStatus.DONE,
        dueDate: '2026-10-01T00:00:00.000Z',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow clearing assignee with null', async () => {
      const dto = plainToInstance(UpdateTaskDto, {
        assignee: null,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid status', async () => {
      const dto = plainToInstance(UpdateTaskDto, {
        status: 'invalid_status',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateTaskStatusDto', () => {
    it('should pass with valid status', async () => {
      const dto = plainToInstance(UpdateTaskStatusDto, {
        status: TaskStatus.IN_REVIEW,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid status', async () => {
      const dto = plainToInstance(UpdateTaskStatusDto, {
        status: 'not_a_status',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('GetTasksQueryDto', () => {
    it('should accept default values', async () => {
      const dto = plainToInstance(GetTasksQueryDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should convert page and limit strings to numbers and trim search', async () => {
      const dto = plainToInstance(GetTasksQueryDto, {
        page: '2',
        limit: '15',
        search: '  bug fix  ',
        status: TaskStatus.TODO,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(15);
      expect(dto.search).toBe('bug fix');
    });

    it('should reject non-positive page or limit > 100', async () => {
      const dto = plainToInstance(GetTasksQueryDto, {
        page: '0',
        limit: '200',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(2);
    });

    it('should reject search longer than 100 characters', async () => {
      const dto = plainToInstance(GetTasksQueryDto, {
        search: 'a'.repeat(101),
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('search');
    });

    it('should parse rootOnly boolean and listId MongoId', async () => {
      const dto = plainToInstance(GetTasksQueryDto, {
        rootOnly: 'true',
        listId: '507f1f77bcf86cd799439011',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.rootOnly).toBe(true);
      expect(dto.listId).toBe('507f1f77bcf86cd799439011');
    });
  });

  describe('CreateSubtaskDto', () => {
    it('should validate valid subtask payload', async () => {
      const dto = plainToInstance(CreateSubtaskDto, {
        title: 'Child Task',
        priority: TaskPriority.HIGH,
        order: 1,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.title).toBe('Child Task');
    });

    it('should reject empty title', async () => {
      const dto = plainToInstance(CreateSubtaskDto, {
        title: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('MoveSubtaskDto', () => {
    it('should validate valid payload with newParentTaskId and order', async () => {
      const dto = plainToInstance(MoveSubtaskDto, {
        newParentTaskId: '507f1f77bcf86cd799439011',
        order: 2,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow null newParentTaskId for moving to root', async () => {
      const dto = plainToInstance(MoveSubtaskDto, {
        newParentTaskId: null,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid Mongo ID', async () => {
      const dto = plainToInstance(MoveSubtaskDto, {
        newParentTaskId: 'invalid-id',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
