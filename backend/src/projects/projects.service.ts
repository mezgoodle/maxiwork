import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Model } from 'mongoose';
import { Project } from './schemas/project.schema';
import { User } from '@/users/schemas/user.schema';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}
  async create({ userId, ...createProjectDto }: CreateProjectDto) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User Not Found', 404);
    const newProject = new this.projectModel({
      user: userId,
      ...createProjectDto,
    });
    const savedProject = await newProject.save();
    await user.updateOne({ $push: { projects: savedProject._id } });
    return savedProject;
  }

  async findAll() {
    return this.projectModel.find();
  }

  async findOne(id: string) {
    return await this.projectModel.findById(id);
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    return await this.projectModel.findByIdAndUpdate(id, updateProjectDto, {
      new: true,
    });
  }

  async remove(id: string) {
    const project = await this.projectModel.findById(id);
    if (!project) throw new HttpException('Project Not Found', 404);

    const { user, _id } = project;

    await this.userModel.updateOne({ _id: user }, { $pull: { projects: _id } });

    return await this.projectModel.findByIdAndDelete(id);
  }
}
