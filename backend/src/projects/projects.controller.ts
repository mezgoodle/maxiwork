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
  UsePipes,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectDto } from './dto/project.dto';
import { ApiTags } from '@nestjs/swagger';
import { ObjectIdPipe } from '@/pipes/objectId.pipe';

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
  @UsePipes(ObjectIdPipe)
  async findOne(@Param('id') id: string): Promise<ProjectDto> {
    const project = await this.projectsService.findOne(id);
    if (!project) {
      throw new HttpException('Project not found', 404);
    }
    return project;
  }

  @Patch(':id')
  @UsePipes(ObjectIdPipe)
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectDto> {
    const project = await this.projectsService.update(id, updateProjectDto);
    if (!project) {
      throw new HttpException('Project not found', 404);
    }
    return project;
  }

  @Delete(':id')
  @UsePipes(ObjectIdPipe)
  remove(@Param('id') id: string) {
    const project = this.projectsService.remove(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return;
  }
}
