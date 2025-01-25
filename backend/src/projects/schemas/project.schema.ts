import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Task } from '@/tasks/schemas/task.schema';
import { User } from '@/users/schemas/user.schema';

@Schema({ timestamps: true })
export class Project {
  @Prop({ unique: true, required: true })
  title: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    default: [],
  })
  tasks: Task[];
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
