import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

describe('TasksService', () => {
  let service: TasksService;
  let repository: MongoRepository<Task>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useClass: MongoRepository,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    repository = module.get<MongoRepository<Task>>(getRepositoryToken(Task));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should save a new task', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        status: 'OPEN',
        userId: '60b5f8c8e11b1a3d2c20d2b6',
      };
      jest.spyOn(repository, 'save').mockResolvedValue(createTaskDto as Task);

      expect(await service.create(createTaskDto)).toEqual(createTaskDto);
      expect(repository.save).toHaveBeenCalledWith(createTaskDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of tasks', async () => {
      const tasks: Task[] = [
        { title: 'Test Task', description: 'Test Description' } as Task,
      ];
      jest.spyOn(repository, 'find').mockResolvedValue(tasks);

      expect(await service.findAll()).toEqual(tasks);
      expect(repository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a task by id', async () => {
      const id = '60b5f8c8e11b1a3d2c20d2b6';
      const objectId = new ObjectId(id);
      const task: Task = {
        title: 'Test Task',
        description: 'Test Description',
      } as Task;
      jest.spyOn(repository, 'findOneBy').mockResolvedValue(task);

      expect(await service.findOne(id)).toEqual(task);
      expect(repository.findOneBy).toHaveBeenCalledWith({ _id: objectId });
    });
  });

  describe('update', () => {
    it('should update a task by id', async () => {
      const id = '1';
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
        description: 'Updated Description',
      };
      const result = { affected: 1 } as any;
      jest.spyOn(repository, 'update').mockResolvedValue(result);

      expect(await service.update(id, updateTaskDto)).toEqual(result);
      expect(repository.update).toHaveBeenCalledWith(id, updateTaskDto);
    });
  });

  describe('remove', () => {
    it('should remove a task by id', async () => {
      const id = '1';
      const result = { affected: 1 } as any;
      jest.spyOn(repository, 'delete').mockResolvedValue(result);

      expect(await service.remove(id)).toEqual(result);
      expect(repository.delete).toHaveBeenCalledWith(id);
    });
  });
});
