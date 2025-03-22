import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { ProjectsModule } from '@/projects/projects.module';
import { TasksModule } from '@/tasks/tasks.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ProjectsModule,
    TasksModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
