import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Workspace, WorkspaceSchema } from './schemas/workspace.schema';
import { Space, SpaceSchema } from './schemas/space.schema';
import { Folder, FolderSchema } from './schemas/folder.schema';
import { List, ListSchema } from './schemas/list.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { HierarchyService } from './hierarchy.service';
import { HierarchyController } from './hierarchy.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: Space.name, schema: SpaceSchema },
      { name: Folder.name, schema: FolderSchema },
      { name: List.name, schema: ListSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [HierarchyController],
  providers: [HierarchyService],
  exports: [HierarchyService, MongooseModule],
})
export class HierarchyModule {}
