import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

describe('Tasks', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it(`Simple test`, async () => {
    expect(true).toBe(true);
  });

  afterAll(async () => {
    await app.close();
  });
});
