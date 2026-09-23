import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateProjectDto } from './update-project.dto';

describe('UpdateProjectDto', () => {
  it('should pass validation with empty object (all fields omitted)', async () => {
    const dto = plainToInstance(UpdateProjectDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation with valid name, prefix, and description', async () => {
    const dto = plainToInstance(UpdateProjectDto, {
      name: 'Valid Name',
      prefix: 'VALID',
      description: 'A valid description',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should allow clearing description with empty string', async () => {
    const dto = plainToInstance(UpdateProjectDto, {
      description: '',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject explicit null name', async () => {
    const dto = plainToInstance(UpdateProjectDto, {
      name: null,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should reject explicit null prefix', async () => {
    const dto = plainToInstance(UpdateProjectDto, {
      prefix: null,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('prefix');
  });

  it('should reject explicit null description', async () => {
    const dto = plainToInstance(UpdateProjectDto, {
      description: null,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('description');
  });

  it('should reject name shorter than 2 characters after trim', async () => {
    const dto = plainToInstance(UpdateProjectDto, {
      name: ' a ',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should reject prefix longer than 5 characters', async () => {
    const dto = plainToInstance(UpdateProjectDto, {
      prefix: 'TOOLONG',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('prefix');
  });
});
