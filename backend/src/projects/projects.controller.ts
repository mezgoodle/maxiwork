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
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectDto } from './dto/project.dto';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ObjectIdPipe } from '@/pipes/objectId.pipe';
import { plainToInstance } from 'class-transformer';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a project' })
  @ApiParam({
    name: 'createProjectDto',
    type: CreateProjectDto,
    required: true,
    description: 'The project to create',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The project has been successfully created',
    type: ProjectDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'The project could not be created',
  })
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
  @ApiOperation({ summary: 'Get all projects' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns an array of projects',
    type: [ProjectDto],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search title for projects',
    example: 'title',
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
  ): Promise<ProjectDto[]> {
    const projects = await this.projectsService.findAll(page, limit, search);
    return projects.map((project) =>
      plainToInstance(ProjectDto, project.toObject()),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by id' })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'The id of the project to get',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns a project',
    type: ProjectDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'The project was not found',
  })
  async findOne(@Param('id', ObjectIdPipe) id: string): Promise<ProjectDto> {
    const project = await this.projectsService.findOne(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const projectObject = project.toObject();
    return plainToInstance(ProjectDto, projectObject);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project by id' })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'The id of the project to update',
  })
  @ApiParam({
    name: 'updateProjectDto',
    type: UpdateProjectDto,
    required: true,
    description: 'The project to update',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The project has been successfully updated',
    type: ProjectDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'The project was not found',
  })
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
  @ApiOperation({ summary: 'Delete a project by id' })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'The id of the project to delete',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The project has been successfully deleted',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'The project was not found',
  })
  async remove(@Param('id', ObjectIdPipe) id: string) {
    const response = await this.projectsService.remove(id);
    if (response.error) {
      throw new HttpException(response.error.message, response.error.status);
    }
    return;
  }
}
