import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { Project } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: MongoRepository<Project>,
  ) {}
  async create(createProjectDto: CreateProjectDto) {
    return this.projectRepository.save(createProjectDto);
  }

  async findAll() {
    return this.projectRepository.find();
  }

  async findOne(id: string) {
    const objectId = new ObjectId(id);
    return await this.projectRepository.findOneBy({ _id: objectId });
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    return await this.projectRepository.update(id, updateProjectDto);
  }

  async remove(id: string) {
    return await this.projectRepository.delete(id);
  }
}
