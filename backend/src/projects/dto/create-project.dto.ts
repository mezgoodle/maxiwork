export class CreateProjectDto {
  title: string;
  description: string;
  members: string[];
  tasks: string[];
  userId: string;
}
