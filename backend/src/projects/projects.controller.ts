import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectDto } from './dto/project.dto';
import { ApiTags } from '@nestjs/swagger';
import { ObjectIdPipe } from '@/pipes/objectId.pipe';
import { plainToInstance } from 'class-transformer';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<ProjectDto> {
    const response = await this.projectsService.create(createProjectDto);
    if (response.error) {
      throw new HttpException(response.error.message, response.error.status);
    }
    const project = response.data.toObject();
    return plainToInstance(ProjectDto, project);
  }

  @Get()
  async findAll(): Promise<ProjectDto[]> {
    const projects = await this.projectsService.findAll();
    return projects.map((project) =>
      plainToInstance(ProjectDto, project.toObject()),
    );
  }

  @Get(':id')
  async findOne(@Param('id', ObjectIdPipe) id: string): Promise<ProjectDto> {
    const project = await this.projectsService.findOne(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const projectObject = project.toObject();
    return plainToInstance(ProjectDto, projectObject);
  }

  @Patch(':id')
  async update(
    @Param('id', ObjectIdPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectDto> {
    const updatedProject = await this.projectsService.update(
      id,
      updateProjectDto,
    );
    if (!updatedProject) {
      throw new NotFoundException('Project not found');
    }
    const projectObject = updatedProject.toObject();
    return plainToInstance(ProjectDto, projectObject);
  }

  @Delete(':id')
  async remove(@Param('id', ObjectIdPipe) id: string) {
    const response = await this.projectsService.remove(id);
    if (response.error) {
      throw new HttpException(response.error.message, response.error.status);
    }
    return;
  }
}
