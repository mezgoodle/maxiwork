import type { User } from './auth';

export interface Project {
  _id: string;
  name: string;
  description?: string;
  prefix: string;
  owner: User | string;
  members: (User | string)[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProjectPayload {
  name: string;
  prefix: string;
  description?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  prefix?: string;
  description?: string;
}
