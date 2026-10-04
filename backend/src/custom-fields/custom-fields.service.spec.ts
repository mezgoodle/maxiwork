import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  CustomFieldsService,
  EffectiveCustomFieldItem,
} from './custom-fields.service';
import { CustomField } from './schemas/custom-field.schema';
import { Task } from '../tasks/schemas/task.schema';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { WorkspaceRole } from '../hierarchy/enums/workspace-role.enum';
import { CustomFieldType } from './enums/custom-field-type.enum';

describe('CustomFieldsService', () => {
  let service: CustomFieldsService;
  let customFieldModel: any;
  let taskModel: any;
  let hierarchyService: any;

  const mockUserId = '507f1f77bcf86cd799439011';
  const mockSpaceId = '507f1f77bcf86cd799439022';
  const mockListId = '507f1f77bcf86cd799439033';
  const mockFieldId = '507f1f77bcf86cd799439044';
  const mockTaskId = '507f1f77bcf86cd799439055';

  beforeEach(async () => {
    function MockCustomFieldModel(this: any, data: any) {
      this._id = new Types.ObjectId(mockFieldId);
      Object.assign(this, data);
      this.save = jest.fn().mockResolvedValue(this);
    }
    MockCustomFieldModel.find = jest.fn();
    MockCustomFieldModel.findOne = jest.fn();
    MockCustomFieldModel.findById = jest.fn();
    MockCustomFieldModel.findByIdAndDelete = jest.fn();
    MockCustomFieldModel.countDocuments = jest.fn();

    const mockTaskModelConstructor: any = jest.fn();
    mockTaskModelConstructor.find = jest.fn();
    mockTaskModelConstructor.findOne = jest.fn();
    mockTaskModelConstructor.findById = jest.fn();
    mockTaskModelConstructor.updateMany = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    });

    hierarchyService = {
      checkSpaceAccess: jest.fn().mockResolvedValue({
        space: { _id: new Types.ObjectId(mockSpaceId), name: 'Engineering' },
        workspace: { _id: new Types.ObjectId() },
        role: WorkspaceRole.OWNER,
      }),
      checkListAccess: jest.fn().mockResolvedValue({
        list: {
          _id: new Types.ObjectId(mockListId),
          name: 'Backlog',
          spaceId: new Types.ObjectId(mockSpaceId),
        },
        space: { _id: new Types.ObjectId(mockSpaceId), name: 'Engineering' },
        workspace: { _id: new Types.ObjectId() },
        role: WorkspaceRole.OWNER,
      }),
      findAllLists: jest
        .fn()
        .mockResolvedValue([{ _id: new Types.ObjectId(mockListId) }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomFieldsService,
        {
          provide: getModelToken(CustomField.name),
          useValue: MockCustomFieldModel,
        },
        {
          provide: getModelToken(Task.name),
          useValue: mockTaskModelConstructor,
        },
        {
          provide: HierarchyService,
          useValue: hierarchyService,
        },
      ],
    }).compile();

    service = module.get<CustomFieldsService>(CustomFieldsService);
    customFieldModel = module.get(getModelToken(CustomField.name));
    taskModel = module.get(getModelToken(Task.name));
  });

  describe('createSpaceCustomField', () => {
    it('should create a custom field for a space', async () => {
      customFieldModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      customFieldModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const result = await service.createSpaceCustomField(
        mockSpaceId,
        {
          name: 'Sprint Points',
          type: CustomFieldType.NUMBER,
          required: true,
        },
        mockUserId,
      );

      expect(result.name).toBe('Sprint Points');
      expect(result.type).toBe(CustomFieldType.NUMBER);
      expect(result.required).toBe(true);
      expect(result.entityType).toBe('space');
    });

    it('should reject duplicate field names in same space', async () => {
      customFieldModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      });

      await expect(
        service.createSpaceCustomField(
          mockSpaceId,
          { name: 'Sprint Points', type: CustomFieldType.NUMBER },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject dropdown fields without options', async () => {
      await expect(
        service.createSpaceCustomField(
          mockSpaceId,
          { name: 'Severity', type: CustomFieldType.DROPDOWN, options: [] },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createListCustomField', () => {
    it('should create a custom field for a list', async () => {
      customFieldModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      customFieldModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.createListCustomField(
        mockListId,
        {
          name: 'Client Feedback',
          type: CustomFieldType.TEXT,
        },
        mockUserId,
      );

      expect(result.name).toBe('Client Feedback');
      expect(result.entityType).toBe('list');
    });
  });

  describe('getListEffectiveCustomFields', () => {
    it('should return inherited space fields and list fields combined', async () => {
      const spaceFieldDoc = {
        _id: new Types.ObjectId(),
        name: 'Space Level Field',
        type: CustomFieldType.TEXT,
        options: [],
        required: false,
        entityType: 'space' as const,
        entityId: new Types.ObjectId(mockSpaceId),
        order: 0,
      };
      const listFieldDoc = {
        _id: new Types.ObjectId(),
        name: 'List Level Field',
        type: CustomFieldType.NUMBER,
        options: [],
        required: true,
        entityType: 'list' as const,
        entityId: new Types.ObjectId(mockListId),
        order: 1,
      };

      customFieldModel.find
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([spaceFieldDoc]),
            }),
          }),
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([listFieldDoc]),
            }),
          }),
        });

      const result = await service.getListEffectiveCustomFields(
        mockListId,
        mockUserId,
      );

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Space Level Field');
      expect(result[0].inherited).toBe(true);
      expect(result[1].name).toBe('List Level Field');
      expect(result[1].inherited).toBe(false);
    });
  });

  describe('validateAndSanitizeFieldValue', () => {
    const baseField: EffectiveCustomFieldItem = {
      id: mockFieldId,
      name: 'Test Field',
      type: CustomFieldType.TEXT,
      options: [],
      required: false,
      entityType: 'space',
      entityId: mockSpaceId,
      order: 0,
      inherited: false,
    };

    it('validates text field and trims whitespace', () => {
      const field: EffectiveCustomFieldItem = {
        ...baseField,
        name: 'Client',
        type: CustomFieldType.TEXT,
      };
      expect(
        service.validateAndSanitizeFieldValue(field, '  Acme Corp  '),
      ).toBe('Acme Corp');
    });

    it('validates number field', () => {
      const field: EffectiveCustomFieldItem = {
        ...baseField,
        name: 'Points',
        type: CustomFieldType.NUMBER,
      };
      expect(service.validateAndSanitizeFieldValue(field, 42)).toBe(42);
      expect(service.validateAndSanitizeFieldValue(field, '42')).toBe(42);
    });

    it('throws error for invalid number', () => {
      const field: EffectiveCustomFieldItem = {
        ...baseField,
        name: 'Points',
        type: CustomFieldType.NUMBER,
      };
      expect(() =>
        service.validateAndSanitizeFieldValue(field, 'not-a-number'),
      ).toThrow(BadRequestException);
    });

    it('validates date field', () => {
      const field: EffectiveCustomFieldItem = {
        ...baseField,
        name: 'Release Date',
        type: CustomFieldType.DATE,
      };
      const dateStr = '2026-09-28T00:00:00.000Z';
      expect(service.validateAndSanitizeFieldValue(field, dateStr)).toBe(
        dateStr,
      );
    });

    it('validates dropdown field against options', () => {
      const field: EffectiveCustomFieldItem = {
        ...baseField,
        name: 'Priority',
        type: CustomFieldType.DROPDOWN,
        options: ['High', 'Medium', 'Low'],
      };
      expect(service.validateAndSanitizeFieldValue(field, 'High')).toBe('High');
      expect(() =>
        service.validateAndSanitizeFieldValue(field, 'Urgent'),
      ).toThrow(BadRequestException);
    });

    it('validates checkbox field', () => {
      const field: EffectiveCustomFieldItem = {
        ...baseField,
        name: 'Reviewed',
        type: CustomFieldType.CHECKBOX,
      };
      expect(service.validateAndSanitizeFieldValue(field, true)).toBe(true);
      expect(service.validateAndSanitizeFieldValue(field, 'true')).toBe(true);
      expect(service.validateAndSanitizeFieldValue(field, false)).toBe(false);
      expect(service.validateAndSanitizeFieldValue(field, 'false')).toBe(false);
    });

    it('throws when required field is empty', () => {
      const field: EffectiveCustomFieldItem = {
        ...baseField,
        name: 'Mandatory',
        type: CustomFieldType.TEXT,
        required: true,
      };
      expect(() => service.validateAndSanitizeFieldValue(field, null)).toThrow(
        BadRequestException,
      );
      expect(() => service.validateAndSanitizeFieldValue(field, '')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteCustomField', () => {
    it('deletes field and unsets values on tasks', async () => {
      const fieldDoc: any = {
        _id: new Types.ObjectId(mockFieldId),
        entityType: 'list',
        entityId: new Types.ObjectId(mockListId),
      };
      customFieldModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(fieldDoc),
      });
      customFieldModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(fieldDoc),
      });

      const res = await service.deleteCustomField(mockFieldId, mockUserId);
      expect(res.message).toBe('Custom field deleted successfully');
      expect(taskModel.updateMany).toHaveBeenCalled();
    });
  });

  describe('setTaskCustomFields', () => {
    it('updates custom field values on task', async () => {
      const mockTask: any = {
        _id: new Types.ObjectId(mockTaskId),
        list: new Types.ObjectId(mockListId),
        customFieldValues: {},
        save: jest.fn().mockResolvedValue(this),
      };
      taskModel.findById
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockTask),
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockTask),
              }),
            }),
          }),
        });

      jest.spyOn(service, 'getListEffectiveCustomFields').mockResolvedValue([
        {
          id: mockFieldId,
          name: 'Estimation',
          type: CustomFieldType.NUMBER,
          options: [],
          required: false,
          entityType: 'list',
          entityId: mockListId,
          order: 0,
          inherited: false,
        },
      ]);

      await service.setTaskCustomFields(
        mockTaskId,
        { [mockFieldId]: 8 },
        mockUserId,
      );

      expect(mockTask.customFieldValues[mockFieldId]).toBe(8);
      expect(mockTask.save).toHaveBeenCalled();
    });

    it('correctly merges when customFieldValues is a Map instance and removes null keys', async () => {
      const initialMap = new Map<string, unknown>([
        ['existing_field', 42],
        ['to_delete_field', 'abc'],
      ]);
      const mockTask: any = {
        _id: new Types.ObjectId(mockTaskId),
        list: new Types.ObjectId(mockListId),
        customFieldValues: initialMap,
        save: jest.fn().mockResolvedValue(this),
      };

      taskModel.findById
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockTask),
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockTask),
              }),
            }),
          }),
        });

      jest.spyOn(service, 'getListEffectiveCustomFields').mockResolvedValue([
        {
          id: 'existing_field',
          name: 'Existing',
          type: CustomFieldType.NUMBER,
          options: [],
          required: false,
          entityType: 'list',
          entityId: mockListId,
          order: 0,
          inherited: false,
        },
        {
          id: 'to_delete_field',
          name: 'To Delete',
          type: CustomFieldType.TEXT,
          options: [],
          required: false,
          entityType: 'list',
          entityId: mockListId,
          order: 1,
          inherited: false,
        },
        {
          id: mockFieldId,
          name: 'Estimation',
          type: CustomFieldType.NUMBER,
          options: [],
          required: false,
          entityType: 'list',
          entityId: mockListId,
          order: 2,
          inherited: false,
        },
      ]);

      await service.setTaskCustomFields(
        mockTaskId,
        {
          [mockFieldId]: 13,
          to_delete_field: null,
        },
        mockUserId,
      );

      expect(mockTask.customFieldValues[mockFieldId]).toBe(13);
      expect(mockTask.customFieldValues.existing_field).toBe(42);
      expect(mockTask.customFieldValues.to_delete_field).toBeUndefined();
      expect(mockTask.save).toHaveBeenCalled();
    });
  });
});
