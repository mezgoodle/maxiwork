import type { CustomField, CustomFieldType, EffectiveCustomField } from '../types/custom-field';

/**
 * Returns a human-friendly display label for a custom field type.
 */
export function getCustomFieldTypeLabel(type: CustomFieldType): string {
  switch (type) {
    case 'text':
      return 'Text';
    case 'number':
      return 'Number';
    case 'date':
      return 'Date';
    case 'dropdown':
      return 'Dropdown';
    case 'checkbox':
      return 'Checkbox';
    default:
      return type;
  }
}

/**
 * Returns Tailwind CSS badge classes for a custom field type.
 */
export function getCustomFieldBadgeClass(type: CustomFieldType): string {
  switch (type) {
    case 'text':
      return 'bg-blue-500/10 text-blue-300 border border-blue-500/20';
    case 'number':
      return 'bg-purple-500/10 text-purple-300 border border-purple-500/20';
    case 'date':
      return 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
    case 'dropdown':
      return 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20';
    case 'checkbox':
      return 'bg-rose-500/10 text-rose-300 border border-rose-500/20';
    default:
      return 'bg-slate-700 text-slate-300 border border-slate-600';
  }
}

/**
 * Formats a custom field value for human-readable display.
 */
export function formatCustomFieldValue(
  field: CustomField | EffectiveCustomField,
  value: unknown,
): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  switch (field.type) {
    case 'checkbox':
      return value ? 'Yes' : 'No';
    case 'number':
      return String(Number(value));
    case 'date': {
      const d = new Date(String(value));
      return isNaN(d.getTime())
        ? String(value)
        : d.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
    }
    case 'text':
    case 'dropdown':
    default:
      return String(value);
  }
}

/**
 * Validates a custom field value against its definition.
 */
export function validateCustomFieldValue(
  field: CustomField | EffectiveCustomField,
  value: unknown,
): { isValid: boolean; error?: string } {
  const isValueEmpty =
    value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

  if (field.required && isValueEmpty) {
    return { isValid: false, error: `${field.name} is required` };
  }

  if (isValueEmpty) {
    return { isValid: true };
  }

  switch (field.type) {
    case 'number': {
      const num = Number(value);
      if (typeof value === 'boolean' || isNaN(num) || !isFinite(num)) {
        return { isValid: false, error: `${field.name} must be a valid number` };
      }
      return { isValid: true };
    }
    case 'date': {
      const d = new Date(String(value));
      if (isNaN(d.getTime())) {
        return { isValid: false, error: `${field.name} must be a valid date` };
      }
      return { isValid: true };
    }
    case 'dropdown': {
      const valStr = String(value);
      if (Array.isArray(field.options) && field.options.length > 0) {
        if (!field.options.includes(valStr)) {
          return {
            isValid: false,
            error: `${field.name} value "${valStr}" is not a valid option`,
          };
        }
      }
      return { isValid: true };
    }
    case 'checkbox': {
      if (typeof value !== 'boolean') {
        return { isValid: false, error: `${field.name} must be true or false` };
      }
      return { isValid: true };
    }
    case 'text':
    default:
      return { isValid: true };
  }
}
