import { Test, TestingModule } from '@nestjs/testing';
import { CustomFieldsController } from './custom-fields.controller';
import { CustomFieldsService } from './custom-fields.service';
import { CustomFieldType } from './enums/custom-field-type.enum';

describe('CustomFieldsController', () => {
  let controller: CustomFieldsController;
  let mockCustomFieldsService: {
    createSpaceCustomField: jest.Mock;
    getSpaceCustomFields: jest.Mock;
    createListCustomField: jest.Mock;
    getListEffectiveCustomFields: jest.Mock;
    getCustomFieldById: jest.Mock;
    updateCustomField: jest.Mock;
    deleteCustomField: jest.Mock;
    setTaskCustomFields: jest.Mock;
    batchUpdateTaskCustomFields: jest.Mock;
  };

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
  };
  const mockSpaceId = '507f1f77bcf86cd799439022';
  const mockListId = '507f1f77bcf86cd799439033';
  const mockFieldId = '507f1f77bcf86cd799439044';
  const mockTaskId = '507f1f77bcf86cd799439055';

  beforeEach(async () => {
    mockCustomFieldsService = {
      createSpaceCustomField: jest
        .fn()
        .mockResolvedValue({ id: mockFieldId, name: 'Field 1' }),
      getSpaceCustomFields: jest
        .fn()
        .mockResolvedValue([{ id: mockFieldId, name: 'Field 1' }]),
      createListCustomField: jest
        .fn()
        .mockResolvedValue({ id: mockFieldId, name: 'List Field' }),
      getListEffectiveCustomFields: jest
        .fn()
        .mockResolvedValue([{ id: mockFieldId, name: 'Effective Field' }]),
      getCustomFieldById: jest
        .fn()
        .mockResolvedValue({ id: mockFieldId, name: 'Field 1' }),
      updateCustomField: jest
        .fn()
        .mockResolvedValue({ id: mockFieldId, name: 'Updated' }),
      deleteCustomField: jest
        .fn()
        .mockResolvedValue({ message: 'Deleted', id: mockFieldId }),
      setTaskCustomFields: jest.fn().mockResolvedValue({
        id: mockTaskId,
        customFieldValues: { [mockFieldId]: 'val' },
      }),
      batchUpdateTaskCustomFields: jest
        .fn()
        .mockResolvedValue({ updatedCount: 1, tasks: [{ id: mockTaskId }] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomFieldsController],
      providers: [
        {
          provide: CustomFieldsService,
          useValue: mockCustomFieldsService,
        },
      ],
    }).compile();

    controller = module.get<CustomFieldsController>(CustomFieldsController);
  });

  it('createSpaceCustomField should delegate to service', async () => {
    const dto = { name: 'Points', type: CustomFieldType.NUMBER };
    const res = await controller.createSpaceCustomField(
      mockSpaceId,
      mockUser,
      dto,
    );
    expect(res).toEqual({ id: mockFieldId, name: 'Field 1' });
    expect(mockCustomFieldsService.createSpaceCustomField).toHaveBeenCalledWith(
      mockSpaceId,
      dto,
      mockUser._id,
    );
  });

  it('getSpaceCustomFields should delegate to service', async () => {
    const res = await controller.getSpaceCustomFields(mockSpaceId, mockUser);
    expect(res).toHaveLength(1);
    expect(mockCustomFieldsService.getSpaceCustomFields).toHaveBeenCalledWith(
      mockSpaceId,
      mockUser._id,
    );
  });

  it('createListCustomField should delegate to service', async () => {
    const dto = { name: 'List Field', type: CustomFieldType.TEXT };
    const res = await controller.createListCustomField(
      mockListId,
      mockUser,
      dto,
    );
    expect(res).toEqual({ id: mockFieldId, name: 'List Field' });
    expect(mockCustomFieldsService.createListCustomField).toHaveBeenCalledWith(
      mockListId,
      dto,
      mockUser._id,
    );
  });

  it('getListEffectiveCustomFields should delegate to service', async () => {
    const res = await controller.getListEffectiveCustomFields(
      mockListId,
      mockUser,
    );
    expect(res).toHaveLength(1);
    expect(
      mockCustomFieldsService.getListEffectiveCustomFields,
    ).toHaveBeenCalledWith(mockListId, mockUser._id);
  });

  it('getCustomFieldById should delegate to service', async () => {
    const res = await controller.getCustomFieldById(mockFieldId, mockUser);
    expect(res).toEqual({ id: mockFieldId, name: 'Field 1' });
    expect(mockCustomFieldsService.getCustomFieldById).toHaveBeenCalledWith(
      mockFieldId,
      mockUser._id,
    );
  });

  it('updateCustomField should delegate to service', async () => {
    const dto = { name: 'Updated' };
    const res = await controller.updateCustomField(mockFieldId, mockUser, dto);
    expect(res).toEqual({ id: mockFieldId, name: 'Updated' });
    expect(mockCustomFieldsService.updateCustomField).toHaveBeenCalledWith(
      mockFieldId,
      dto,
      mockUser._id,
    );
  });

  it('deleteCustomField should delegate to service', async () => {
    const res = await controller.deleteCustomField(mockFieldId, mockUser);
    expect(res).toEqual({ message: 'Deleted', id: mockFieldId });
    expect(mockCustomFieldsService.deleteCustomField).toHaveBeenCalledWith(
      mockFieldId,
      mockUser._id,
    );
  });

  it('setTaskCustomFields should delegate to service', async () => {
    const dto = { customFieldValues: { [mockFieldId]: 'val' } };
    const res = await controller.setTaskCustomFields(mockTaskId, mockUser, dto);
    expect(res).toEqual({
      id: mockTaskId,
      customFieldValues: { [mockFieldId]: 'val' },
    });
    expect(mockCustomFieldsService.setTaskCustomFields).toHaveBeenCalledWith(
      mockTaskId,
      dto.customFieldValues,
      mockUser._id,
    );
  });

  it('batchUpdateTaskCustomFields should delegate to service', async () => {
    const dto = {
      updates: [
        { taskId: mockTaskId, customFieldValues: { [mockFieldId]: 'val' } },
      ],
    };
    const res = await controller.batchUpdateTaskCustomFields(
      mockListId,
      mockUser,
      dto,
    );
    expect(res.updatedCount).toBe(1);
    expect(
      mockCustomFieldsService.batchUpdateTaskCustomFields,
    ).toHaveBeenCalledWith(mockListId, dto.updates, mockUser._id);
  });
});
