import { setActivePinia, createPinia } from 'pinia';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { useCustomFieldsStore } from './custom-fields';
import type { CustomField, EffectiveCustomField } from '../types/custom-field';

describe('useCustomFieldsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  const mockSpaceField: CustomField = {
    _id: 'cf-1',
    entityType: 'space',
    entityId: 'sp-1',
    name: 'Priority Score',
    type: 'number',
    options: [],
    defaultValue: 10,
    required: false,
    order: 0,
    description: 'Score from 1 to 10',
    createdAt: '2026-09-28T00:00:00.000Z',
    updatedAt: '2026-09-28T00:00:00.000Z',
  };

  const mockListField: EffectiveCustomField = {
    _id: 'cf-2',
    entityType: 'list',
    entityId: 'l-1',
    name: 'Customer Tier',
    type: 'dropdown',
    options: ['Free', 'Pro', 'Enterprise'],
    defaultValue: 'Free',
    required: true,
    order: 1,
    inherited: false,
    createdAt: '2026-09-28T00:00:00.000Z',
    updatedAt: '2026-09-28T00:00:00.000Z',
  };

  it('initializes with default state', () => {
    const store = useCustomFieldsStore();
    expect(store.spaceFields).toEqual({});
    expect(store.listFields).toEqual({});
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('fetchSpaceFields populates spaceFields state', async () => {
    const store = useCustomFieldsStore();
    global.$fetch = vi.fn().mockResolvedValue([mockSpaceField]);

    const res = await store.fetchSpaceFields('sp-1');
    expect(res).toEqual([mockSpaceField]);
    expect(store.spaceFields['sp-1']).toEqual([mockSpaceField]);
  });

  it('createSpaceField appends to spaceFields state', async () => {
    const store = useCustomFieldsStore();
    store.spaceFields['sp-1'] = [mockSpaceField];

    const newField: CustomField = {
      ...mockSpaceField,
      _id: 'cf-new',
      name: 'Client Name',
      type: 'text',
    };
    global.$fetch = vi.fn().mockResolvedValue(newField);

    const res = await store.createSpaceField('sp-1', {
      name: 'Client Name',
      type: 'text',
    });
    expect(res._id).toBe('cf-new');
    expect(store.spaceFields['sp-1']).toHaveLength(2);
  });

  it('fetchListFields populates listFields state', async () => {
    const store = useCustomFieldsStore();
    global.$fetch = vi.fn().mockResolvedValue([mockListField]);

    const res = await store.fetchListFields('l-1');
    expect(res).toEqual([mockListField]);
    expect(store.listFields['l-1']).toEqual([mockListField]);
  });

  it('createListField appends to listFields with inherited: false', async () => {
    const store = useCustomFieldsStore();
    const created: CustomField = {
      _id: 'cf-3',
      entityType: 'list',
      entityId: 'l-1',
      name: 'Release Date',
      type: 'date',
      options: [],
      required: false,
      order: 2,
    };
    global.$fetch = vi.fn().mockResolvedValue(created);

    const res = await store.createListField('l-1', {
      name: 'Release Date',
      type: 'date',
    });
    expect(res._id).toBe('cf-3');
    expect(store.listFields['l-1']).toHaveLength(1);
    expect(store.listFields['l-1'][0].inherited).toBe(false);
  });

  it('updateField updates field in cached lists and spaces', async () => {
    const store = useCustomFieldsStore();
    store.spaceFields['sp-1'] = [mockSpaceField];
    store.listFields['l-1'] = [mockListField];

    const updatedField = {
      ...mockListField,
      name: 'Client Segment',
    };
    global.$fetch = vi.fn().mockResolvedValue(updatedField);

    const res = await store.updateField(
      'cf-2',
      { name: 'Client Segment' },
      { listId: 'l-1' },
    );
    expect(res.name).toBe('Client Segment');
    expect(store.listFields['l-1'][0].name).toBe('Client Segment');
    expect(store.listFields['l-1'][0].inherited).toBe(false);
  });

  it('deleteField removes field from cached space and list fields', async () => {
    const store = useCustomFieldsStore();
    store.spaceFields['sp-1'] = [mockSpaceField];
    store.listFields['l-1'] = [mockListField];

    global.$fetch = vi.fn().mockResolvedValue(undefined);

    await store.deleteField('cf-1', { spaceId: 'sp-1' });
    expect(store.spaceFields['sp-1']).toHaveLength(0);

    await store.deleteField('cf-2', { listId: 'l-1' });
    expect(store.listFields['l-1']).toHaveLength(0);
  });

  it('updateTaskCustomFields calls PATCH /tasks/:taskId/custom-fields', async () => {
    const store = useCustomFieldsStore();
    const mockTask = { _id: 't-1', title: 'Task 1', customFieldValues: { 'cf-1': 42 } };
    global.$fetch = vi.fn().mockResolvedValue(mockTask);

    const res = await store.updateTaskCustomFields('t-1', { 'cf-1': 42 });
    expect(res).toEqual(mockTask);
  });

  it('batchUpdateListCustomFields calls PATCH /lists/:listId/tasks/custom-fields/batch', async () => {
    const store = useCustomFieldsStore();
    const mockTasks = [{ _id: 't-1', title: 'Task 1' }];
    global.$fetch = vi.fn().mockResolvedValue({ updatedCount: 1, tasks: mockTasks });

    const res = await store.batchUpdateListCustomFields('l-1', [
      { taskId: 't-1', customFieldValues: { 'cf-1': 10 } },
    ]);
    expect(res).toEqual(mockTasks);
  });

  it('handles API errors properly', async () => {
    const store = useCustomFieldsStore();
    const errorObj = { data: { message: 'Custom field not found' } };
    global.$fetch = vi.fn().mockRejectedValue(errorObj);

    await expect(store.fetchSpaceFields('sp-invalid')).rejects.toEqual(errorObj);
    expect(store.error).toBe('Custom field not found');
  });
});
