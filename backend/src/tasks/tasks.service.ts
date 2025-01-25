import { HttpException, Injectable } from '@nestjs/common';

import { Task } from './schemas/task.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { User } from '@/users/schemas/user.schema';
import { Project } from '@/projects/schemas/project.schema';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
  ) {}
  async create({ userId, projectId, ...createTaskDto }: CreateTaskDto) {
    const user = await this.userModel.findById(userId);
    const project = await this.projectModel.findById(projectId);
    if (!user) throw new HttpException('User Not Found', 404);
    if (!project) throw new HttpException('Project Not Found', 404);
    const newTask = new this.taskModel({
      user: userId,
      project: projectId,
      ...createTaskDto,
    });
    const savedTask = await newTask.save();
    await user.updateOne({ $push: { tasks: savedTask._id } });
    await project.updateOne({ $push: { tasks: savedTask._id } });
    return savedTask;
  }

  async findAll() {
    return this.taskModel.find();
  }

  async findOne(id: string) {
    return await this.taskModel.findById(id);
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    return await this.taskModel.findByIdAndUpdate(id, updateTaskDto, {
      new: true,
    });
  }

  async remove(id: string) {
    const task = await this.taskModel.findById(id);
    if (!task) throw new HttpException('Task Not Found', 404);
    const { user, project, _id } = task;

    await this.userModel.updateOne({ _id: user }, { $pull: { tasks: _id } });
    await this.projectModel.updateOne(
      { _id: project },
      { $pull: { tasks: _id } },
    );

    return await this.taskModel.findByIdAndDelete(id);
  }
}
