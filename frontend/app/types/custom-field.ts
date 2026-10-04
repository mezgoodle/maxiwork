export type CustomFieldType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';

export interface CustomField {
  _id: string;
  entityType: 'space' | 'list';
  entityId: string;
  name: string;
  type: CustomFieldType;
  options: string[];
  defaultValue?: unknown;
  required: boolean;
  order: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EffectiveCustomField extends CustomField {
  inherited: boolean;
}

export interface CreateCustomFieldPayload {
  name: string;
  type: CustomFieldType;
  options?: string[];
  defaultValue?: unknown;
  required?: boolean;
  order?: number;
  description?: string;
}

export interface UpdateCustomFieldPayload {
  name?: string;
  options?: string[];
  defaultValue?: unknown;
  required?: boolean;
  order?: number;
  description?: string;
}

export interface BatchUpdateCustomFieldItem {
  taskId: string;
  customFieldValues: Record<string, unknown>;
}
