import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { Response } from '@/utils/interfaces/response.interface';
import { ProjectsService } from '@/projects/projects.service';
import { TasksService } from '@/tasks/tasks.service';
import { ApiError } from '@/utils/errors';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<Response> {
    const newUser = new this.userModel(createUserDto);
    const savedUser = await newUser.save();
    return {
      data: savedUser,
      error: null,
    };
  }

  async findAll(page: number = 1, limit: number = 10, search: string = '') {
    const skip = (page - 1) * limit;
    const query = search ? { email: { $regex: search, $options: 'i' } } : {};
    return await this.userModel.find(query).limit(limit).skip(skip);
  }

  async findOne(id: string) {
    return await this.userModel.findById(id);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return await this.userModel.findByIdAndUpdate(id, updateUserDto, {
      new: true,
    });
  }

  async remove(id: string, deleteChilds: boolean) {
    const user = await this.userModel.findById(id);
    if (!user)
      return {
        data: null,
        error: new ApiError('Project not found'),
      };
    if (deleteChilds) {
      await this.projectsService.removeByUser(user._id);
      await this.tasksService.removeByUser(user._id);
    }
    return await this.userModel.findByIdAndDelete(id);
  }
}
