import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './schemas/task.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { List, ListSchema } from '../hierarchy/schemas/list.schema';
import { Space, SpaceSchema } from '../hierarchy/schemas/space.schema';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { RecurrenceService } from './services/recurrence.service';
import { RecurrenceSchedulerService } from './services/recurrence-scheduler.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: List.name, schema: ListSchema },
      { name: Space.name, schema: SpaceSchema },
    ]),
  ],
  controllers: [TasksController],
  providers: [TasksService, RecurrenceService, RecurrenceSchedulerService],
  exports: [TasksService, RecurrenceService, RecurrenceSchedulerService],
})
export class TasksModule {}
