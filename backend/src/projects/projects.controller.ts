import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectDto } from './dto/project.dto';
import mongoose from 'mongoose';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<ProjectDto> {
    return await this.projectsService.create(createProjectDto);
  }

  @Get()
  findAll(): Promise<ProjectDto[]> {
    return this.projectsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProjectDto> {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    if (!isValidObjectId) {
      throw new HttpException('Invalid ID', 400);
    }
    const project = await this.projectsService.findOne(id);
    if (!project) {
      throw new HttpException('Project not found', 404);
    }
    return project;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectDto> {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    if (!isValidObjectId) {
      throw new HttpException('Invalid ID', 400);
    }
    const project = await this.projectsService.update(id, updateProjectDto);
    if (!project) {
      throw new HttpException('Project not found', 404);
    }
    return project;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    if (!isValidObjectId) {
      throw new HttpException('Invalid ID', 400);
    }
    const project = this.projectsService.remove(id);
    if (!project) {
      throw new HttpException('Project not found', 404);
    }
    return;
  }
}
