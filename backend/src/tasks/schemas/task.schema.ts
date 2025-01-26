import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Project } from '@/projects/schemas/project.schema';
import { User } from '@/users/schemas/user.schema';

@Schema({ timestamps: true })
export class Task {
  @Prop()
  title: string;

  @Prop()
  description: string;

  @Prop()
  status: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Project' })
  project: Project;

  // @Prop({ default: new Date() })
  // createdAt: Date;

  // @Prop({ default: new Date() })
  // updatedAt: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
