import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TasksModule } from '@/tasks/tasks.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsModule } from '@/projects/projects.module';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TasksModule,
    MongooseModule.forRoot(process.env.MONGODB_URI),
    ProjectsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
