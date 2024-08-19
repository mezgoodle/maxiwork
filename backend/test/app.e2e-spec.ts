import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from './../src/app.module';
import { CreateTaskDto } from './../src/tasks/dto/create-task.dto';
import { UpdateTaskDto } from './../src/tasks/dto/update-task.dto';

describe('Tasks', () => {
  let app: INestApplication;
  let createdTaskId: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRoot({
          type: 'mongodb',
          url: process.env.MONGODB_URI,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
          useUnifiedTopology: true,
          useNewUrlParser: true,
          logging: true,
        }),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('(POST) /tasks should create a new task', async () => {
    const newTask: CreateTaskDto = {
      title: 'Test Task',
      status: 'OPEN',
      description: 'Test Description',
      userId: '60b5f8c8e11b1a3d2c20d2b6',
    };

    const response = await request(app.getHttpServer())
      .post('/tasks')
      .send(newTask)
      .expect(201);

    createdTaskId = response.body.id;

    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe(newTask.title);
    expect(response.body.status).toBe(newTask.status);
  });

  it(`/GET tasks should return all tasks`, async () => {
    const response = await request(app.getHttpServer())
      .get('/tasks')
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
  });

  it('(GET) /tasks/:id should return a task by ID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/tasks/${createdTaskId}`)
      .expect(200);

    expect(response.body.id).toBe(createdTaskId);
  });

  it('(PATCH) /tasks/:id should update a task by ID', async () => {
    const updatedTask: UpdateTaskDto = { title: 'Updated Task' };

    await request(app.getHttpServer())
      .patch(`/tasks/${createdTaskId}`)
      .send(updatedTask)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/tasks/${createdTaskId}`)
      .expect(200);

    expect(response.body.title).toBe(updatedTask.title);
  });

  it('(DELETE) /tasks/:id should delete a task by ID', async () => {
    await request(app.getHttpServer())
      .delete(`/tasks/${createdTaskId}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/tasks/${createdTaskId}`)
      .expect(404);
  });

  afterAll(async () => {
    await app.close();
  });
});
