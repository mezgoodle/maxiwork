import { HttpStatus, Injectable } from '@nestjs/common';

import { Task } from './schemas/task.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { User } from '@/users/schemas/user.schema';
import { Project } from '@/projects/schemas/project.schema';
import { Response } from '@/utils/interfaces/response.interface';
import { ApiError } from '@/utils/errors';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
  ) {}
  async create({
    userId,
    projectId,
    ...createTaskDto
  }: CreateTaskDto): Promise<Response> {
    const user = await this.userModel.findById(userId);
    const project = await this.projectModel.findById(projectId);
    if (!user) return { data: null, error: new ApiError('User Not Found') };
    if (!project)
      return { data: null, error: new ApiError('Project Not Found') };
    const newTask = new this.taskModel({
      user: userId,
      project: projectId,
      ...createTaskDto,
    });
    const savedTask = await newTask.save();
    await user.updateOne({ $push: { tasks: savedTask._id } });
    await project.updateOne({ $push: { tasks: savedTask._id } });
    return {
      data: savedTask,
      error: null,
    };
  }

  async findAll(page: number = 1, limit: number = 10, search: string = '') {
    const skip = (page - 1) * limit;
    const query = search ? { title: { $regex: search, $options: 'i' } } : {};
    return await this.taskModel.find(query).limit(limit).skip(skip);
  }

  async findOne(id: string) {
    return await this.taskModel.findById(id);
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    return await this.taskModel.findByIdAndUpdate(id, updateTaskDto, {
      new: true,
    });
  }

  async reassign(id: string, userId: string): Promise<Response> {
    const task = await this.taskModel.findById(id);
    if (!task) {
      return {
        data: null,
        error: new ApiError('Task not found'),
      };
    }

    const oldUserId = task.user.toString();
    if (oldUserId === userId) {
      return {
        data: null,
        error: new ApiError(
          'User already assigned to task',
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

    await oldUser.updateOne({ $pull: { tasks: id } });
    await newUser.updateOne({ $push: { tasks: id } });

    const updatedTask = await this.taskModel.findByIdAndUpdate(
      id,
      { user: userId },
      { new: true },
    );

    return {
      data: updatedTask,
      error: null,
    };
  }

  async remove(id: string): Promise<Response> {
    const task = await this.taskModel.findById(id);
    if (!task)
      return {
        data: null,
        error: new ApiError('Task not found'),
      };
    const { user, project, _id } = task;

    await this.userModel.updateOne({ _id: user }, { $pull: { tasks: _id } });
    await this.projectModel.updateOne(
      { _id: project },
      { $pull: { tasks: _id } },
    );

    return await this.taskModel.findByIdAndDelete(id);
  }

  async removeByProject(projectId: Types.ObjectId): Promise<void> {
    const documents = await this.taskModel
      .find({ project: projectId })
      .select('_id')
      .exec();
    const idsToRemove = documents.map((doc) => doc._id);
    // remove from user these ids
    await this.userModel.updateMany(
      { tasks: { $in: idsToRemove } },
      { $pull: { tasks: { $in: idsToRemove } } },
    );
    await this.taskModel.deleteMany({ project: projectId }).exec();
  }

  async removeByUser(userId: Types.ObjectId): Promise<void> {
    await this.taskModel.deleteMany({ user: userId }).exec();
  }
}
