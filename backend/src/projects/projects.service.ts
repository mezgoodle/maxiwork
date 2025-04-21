import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Model, Types } from 'mongoose';
import { Project } from '@/projects/schemas/project.schema';
import { User } from '@/users/schemas/user.schema';
import { Response } from '@/utils/interfaces/response.interface';
import { ApiError } from '@/utils/errors';
import { Task } from '@/tasks/schemas/task.schema';
import { TasksService } from '../tasks/tasks.service';
import { TaskStatus } from '@/tasks/dto/create-task.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Task.name) private taskModel: Model<Task>,
    private readonly tasksService: TasksService,
  ) {}
  async create({
    userId,
    ...createProjectDto
  }: CreateProjectDto): Promise<Response> {
    const user = await this.userModel.findById(userId);
    if (!user)
      return {
        data: null,
        error: new ApiError('User not found'),
      };
    const newProject = new this.projectModel({
      user: userId,
      ...createProjectDto,
    });
    const savedProject = await newProject.save();
    await user.updateOne({ $push: { projects: savedProject._id } });
    return {
      data: savedProject,
      error: null,
    };
  }

  async findAll(page: number = 1, limit: number = 10, search: string = '') {
    const skip = (page - 1) * limit;
    const query = search ? { title: { $regex: search, $options: 'i' } } : {};
    return await this.projectModel.find(query).limit(limit).skip(skip);
  }

  async findAllByUserId(userId: string) {
    return await this.projectModel.find({ user: userId });
  }

  async findOne(id: string) {
    return await this.projectModel.findById(id);
  }

  // TODO: update the method, if project is not found, throw an error
  async update(id: string, updateProjectDto: UpdateProjectDto) {
    return await this.projectModel.findByIdAndUpdate(id, updateProjectDto, {
      new: true,
    });
  }

  async statistics(id: string) {
    const project = await this.projectModel.findById(id);

    if (!project) {
      return {
        data: null,
        error: new ApiError('Project not found'),
      };
    }

    const tasks = await this.taskModel.find({ project: id });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (task) => task.status === TaskStatus.DONE,
    ).length;
    const completionPercentage = Math.round(
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    );

    return {
      data: {
        totalTasks,
        completionPercentage,
      },
      error: null,
    };
  }

  async reassign(id: string, userId: string): Promise<Response> {
    const project = await this.projectModel.findById(id);
    if (!project) {
      return {
        data: null,
        error: new ApiError('Project not found'),
      };
    }

    const oldUserId = project.user.toString();
    if (oldUserId === userId) {
      return {
        data: null,
        error: new ApiError(
          'User already assigned to project',
          HttpStatus.BAD_REQUEST,
        ),
      };
    }

    const oldUser = await this.userModel.findById(oldUserId);
    const newUser = await this.userModel.findById(userId);

    if (!newUser) {
      return {
        data: null,
        error: new ApiError('User not found'),
      };
    }

    await oldUser.updateOne({ $pull: { projects: id } });
    await newUser.updateOne({ $push: { projects: id } });

    const updatedProject = await this.projectModel.findByIdAndUpdate(
      id,
      { user: userId },
      { new: true },
    );

    return {
      data: updatedProject,
      error: null,
    };
  }

  async remove(id: string, deleteChilds: boolean): Promise<Response> {
    const project = await this.projectModel.findById(id);
    if (!project)
      return {
        data: null,
        error: new ApiError('Project not found'),
      };

    const { user, _id } = project;

    await this.userModel.updateOne({ _id: user }, { $pull: { projects: _id } });

    if (deleteChilds) {
      await this.tasksService.removeByProject(project._id);
    }

    return await this.projectModel.findByIdAndDelete(id);
  }

  async removeByUser(userId: Types.ObjectId): Promise<void> {
    const projects = await this.projectModel.find({ user: userId }).exec();
    for (const project of projects) {
      await this.projectModel.findByIdAndDelete(project._id);
      await this.tasksService.removeByProject(project._id);
    }
  }
}
