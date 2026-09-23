import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
  ) {}

  private extractId(ref: unknown): string {
    if (!ref) return '';
    if (typeof ref === 'object') {
      if ('_id' in (ref as Record<string, unknown>)) {
        return String((ref as { _id: unknown })._id);
      }
      if (typeof (ref as { toString?: unknown }).toString === 'function') {
        return (ref as { toString(): string }).toString();
      }
    }
    return typeof ref === 'string' ? ref : '';
  }

  async create(
    createProjectDto: CreateProjectDto,
    userId: string,
  ): Promise<ProjectDocument> {
    const normalizedPrefix = createProjectDto.prefix.toUpperCase().trim();

    const existing = await this.projectModel.findOne({
      prefix: normalizedPrefix,
    });
    if (existing) {
      throw new ConflictException('Project prefix already in use');
    }

    const createdProject = new this.projectModel({
      name: createProjectDto.name,
      description: createProjectDto.description ?? '',
      prefix: normalizedPrefix,
      owner: userId,
      members: [],
    });

    try {
      const savedProject = await createdProject.save();
      return await savedProject.populate('owner', 'firstName lastName email');
    } catch (err: unknown) {
      const mongoError = err as { code?: number };
      if (mongoError?.code === 11000) {
        throw new ConflictException('Project prefix already in use');
      }
      throw err;
    }
  }

  async findAll(userId: string): Promise<ProjectDocument[]> {
    return this.projectModel
      .find({
        $or: [{ owner: userId }, { members: userId }],
      })
      .sort({ createdAt: -1 })
      .populate('owner', 'firstName lastName email')
      .exec();
  }

  async findOne(id: string, userId: string): Promise<ProjectDocument> {
    const project = await this.projectModel
      .findById(id)
      .populate('owner', 'firstName lastName email')
      .populate('members', 'firstName lastName email')
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const ownerId = this.extractId(project.owner);
    const isMember = (project.members || []).some(
      (member) => this.extractId(member) === userId.toString(),
    );

    if (ownerId !== userId.toString() && !isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
  ): Promise<ProjectDocument> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const ownerId = this.extractId(project.owner);
    if (ownerId !== userId.toString()) {
      throw new ForbiddenException(
        'Only the project owner can update this project',
      );
    }

    if (updateProjectDto.prefix) {
      const normalizedPrefix = updateProjectDto.prefix.toUpperCase().trim();
      if (normalizedPrefix !== project.prefix) {
        const existing = await this.projectModel.findOne({
          prefix: normalizedPrefix,
          _id: { $ne: id },
        });
        if (existing) {
          throw new ConflictException('Project prefix already in use');
        }
        project.prefix = normalizedPrefix;
      }
    }

    if (updateProjectDto.name !== undefined) {
      project.name = updateProjectDto.name;
    }

    if (updateProjectDto.description !== undefined) {
      project.description = updateProjectDto.description;
    }

    try {
      const updated = await project.save();
      return await updated.populate('owner', 'firstName lastName email');
    } catch (err: unknown) {
      const mongoError = err as { code?: number };
      if (mongoError?.code === 11000) {
        throw new ConflictException('Project prefix already in use');
      }
      throw err;
    }
  }

  async remove(
    id: string,
    userId: string,
  ): Promise<{ message: string; id: string }> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const ownerId = this.extractId(project.owner);
    if (ownerId !== userId.toString()) {
      throw new ForbiddenException(
        'Only the project owner can delete this project',
      );
    }

    await this.projectModel.findByIdAndDelete(id).exec();
    return { message: 'Project deleted successfully', id };
  }
}
