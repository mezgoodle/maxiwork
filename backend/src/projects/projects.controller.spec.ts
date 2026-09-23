import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let mockProjectsService: any;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'user@example.com',
  };

  beforeEach(async () => {
    mockProjectsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should call projectsService.create with user id and dto', async () => {
    const dto = { name: 'Project 1', prefix: 'P1', description: 'Desc' };
    mockProjectsService.create.mockResolvedValue({ _id: 'proj1', ...dto });

    const result = await controller.create(mockUser, dto);

    expect(mockProjectsService.create).toHaveBeenCalledWith(
      dto,
      String(mockUser._id),
    );
    expect(result).toEqual({ _id: 'proj1', ...dto });
  });

  it('findAll should call projectsService.findAll with user id', async () => {
    const projects = [{ _id: 'proj1', name: 'P1' }];
    mockProjectsService.findAll.mockResolvedValue(projects);

    const result = await controller.findAll(mockUser);

    expect(mockProjectsService.findAll).toHaveBeenCalledWith(
      String(mockUser._id),
    );
    expect(result).toEqual(projects);
  });

  it('findOne should call projectsService.findOne with id and user id', async () => {
    const project = { _id: 'proj1', name: 'P1' };
    mockProjectsService.findOne.mockResolvedValue(project);

    const result = await controller.findOne('proj1', mockUser);

    expect(mockProjectsService.findOne).toHaveBeenCalledWith(
      'proj1',
      String(mockUser._id),
    );
    expect(result).toEqual(project);
  });

  it('update should call projectsService.update with id, dto, and user id', async () => {
    const dto = { name: 'Updated Name' };
    const updated = { _id: 'proj1', name: 'Updated Name' };
    mockProjectsService.update.mockResolvedValue(updated);

    const result = await controller.update('proj1', mockUser, dto);

    expect(mockProjectsService.update).toHaveBeenCalledWith(
      'proj1',
      dto,
      String(mockUser._id),
    );
    expect(result).toEqual(updated);
  });

  it('remove should call projectsService.remove with id and user id', async () => {
    const res = { message: 'Project deleted successfully', id: 'proj1' };
    mockProjectsService.remove.mockResolvedValue(res);

    const result = await controller.remove('proj1', mockUser);

    expect(mockProjectsService.remove).toHaveBeenCalledWith(
      'proj1',
      String(mockUser._id),
    );
    expect(result).toEqual(res);
  });
});
