import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Project } from '@/projects/schemas/project.schema';
import { Task } from '@/tasks/schemas/task.schema';

@Schema()
export class User {
  @Prop({ unique: true })
  email: string;

  @Prop({ unique: true })
  username: string;

  @Prop()
  password: string;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    default: [],
  })
  tasks: Task[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    default: [],
  })
  projects: Project[];
}

export const UserSchema = SchemaFactory.createForClass(User);
