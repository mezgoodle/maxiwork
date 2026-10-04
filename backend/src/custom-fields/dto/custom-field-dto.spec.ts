import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCustomFieldDto } from './create-custom-field.dto';
import { UpdateCustomFieldDto } from './update-custom-field.dto';
import { SetTaskCustomFieldsDto } from './set-task-custom-fields.dto';
import { BatchUpdateCustomFieldsDto } from './batch-update-custom-fields.dto';
import { CustomFieldType } from '../enums/custom-field-type.enum';

describe('Custom Fields DTOs', () => {
  describe('CreateCustomFieldDto', () => {
    it('should validate valid payload for text field', async () => {
      const dto = plainToInstance(CreateCustomFieldDto, {
        name: '  Client Name  ',
        type: CustomFieldType.TEXT,
        required: true,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.name).toBe('Client Name');
      expect(dto.required).toBe(true);
    });

    it('should validate valid payload for dropdown field with options', async () => {
      const dto = plainToInstance(CreateCustomFieldDto, {
        name: 'Sprint Status',
        type: CustomFieldType.DROPDOWN,
        options: ['Planning', 'Development', 'QA'],
        order: 1,
        description: 'Current development phase',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when name is empty', async () => {
      const dto = plainToInstance(CreateCustomFieldDto, {
        name: '',
        type: CustomFieldType.NUMBER,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when type is invalid', async () => {
      const dto = plainToInstance(CreateCustomFieldDto, {
        name: 'Field',
        type: 'invalid_type',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateCustomFieldDto', () => {
    it('should validate valid partial update', async () => {
      const dto = plainToInstance(UpdateCustomFieldDto, {
        name: 'Updated Name',
        options: ['Option A', 'Option B'],
        required: false,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow empty update object', async () => {
      const dto = plainToInstance(UpdateCustomFieldDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('SetTaskCustomFieldsDto', () => {
    it('should validate object of custom field values', async () => {
      const dto = plainToInstance(SetTaskCustomFieldsDto, {
        customFieldValues: {
          field_1: 'Value',
          field_2: 123,
        },
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when customFieldValues is missing or not an object', async () => {
      const dto = plainToInstance(SetTaskCustomFieldsDto, {
        customFieldValues: 'not-an-object',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('BatchUpdateCustomFieldsDto', () => {
    it('should validate valid batch updates array', async () => {
      const dto = plainToInstance(BatchUpdateCustomFieldsDto, {
        updates: [
          {
            taskId: '507f1f77bcf86cd799439011',
            customFieldValues: { f1: 'A' },
          },
          {
            taskId: '507f1f77bcf86cd799439012',
            customFieldValues: { f2: 456 },
          },
        ],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when taskId is invalid ObjectId', async () => {
      const dto = plainToInstance(BatchUpdateCustomFieldsDto, {
        updates: [
          {
            taskId: 'invalid-id',
            customFieldValues: { f1: 'A' },
          },
        ],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
