import { describe, it, expect } from 'vitest';
import {
  formatCustomFieldValue,
  getCustomFieldBadgeClass,
  getCustomFieldTypeLabel,
  validateCustomFieldValue,
} from './custom-field';
import type { CustomField } from '../types/custom-field';

describe('custom-field utils', () => {
  const textField: CustomField = {
    _id: '1',
    entityType: 'list',
    entityId: 'l1',
    name: 'Customer',
    type: 'text',
    options: [],
    required: true,
    order: 0,
  };

  const numberField: CustomField = {
    _id: '2',
    entityType: 'list',
    entityId: 'l1',
    name: 'Story Points',
    type: 'number',
    options: [],
    required: false,
    order: 1,
  };

  const dropdownField: CustomField = {
    _id: '3',
    entityType: 'space',
    entityId: 's1',
    name: 'Tier',
    type: 'dropdown',
    options: ['Starter', 'Pro', 'Enterprise'],
    required: false,
    order: 2,
  };

  const checkboxField: CustomField = {
    _id: '4',
    entityType: 'list',
    entityId: 'l1',
    name: 'Is Billable',
    type: 'checkbox',
    options: [],
    required: false,
    order: 3,
  };

  const dateField: CustomField = {
    _id: '5',
    entityType: 'list',
    entityId: 'l1',
    name: 'Milestone',
    type: 'date',
    options: [],
    required: false,
    order: 4,
  };

  describe('getCustomFieldTypeLabel', () => {
    it('returns labels correctly', () => {
      expect(getCustomFieldTypeLabel('text')).toBe('Text');
      expect(getCustomFieldTypeLabel('number')).toBe('Number');
      expect(getCustomFieldTypeLabel('date')).toBe('Date');
      expect(getCustomFieldTypeLabel('dropdown')).toBe('Dropdown');
      expect(getCustomFieldTypeLabel('checkbox')).toBe('Checkbox');
    });
  });

  describe('getCustomFieldBadgeClass', () => {
    it('returns CSS classes for each type', () => {
      expect(getCustomFieldBadgeClass('text')).toContain('blue');
      expect(getCustomFieldBadgeClass('number')).toContain('purple');
      expect(getCustomFieldBadgeClass('date')).toContain('amber');
      expect(getCustomFieldBadgeClass('dropdown')).toContain('emerald');
      expect(getCustomFieldBadgeClass('checkbox')).toContain('rose');
    });
  });

  describe('formatCustomFieldValue', () => {
    it('formats empty values as dash', () => {
      expect(formatCustomFieldValue(textField, null)).toBe('—');
      expect(formatCustomFieldValue(textField, undefined)).toBe('—');
      expect(formatCustomFieldValue(textField, '')).toBe('—');
    });

    it('formats checkbox values as Yes or No', () => {
      expect(formatCustomFieldValue(checkboxField, true)).toBe('Yes');
      expect(formatCustomFieldValue(checkboxField, false)).toBe('No');
    });

    it('formats number values', () => {
      expect(formatCustomFieldValue(numberField, 42)).toBe('42');
      expect(formatCustomFieldValue(numberField, '10.5')).toBe('10.5');
    });

    it('formats text and dropdown values', () => {
      expect(formatCustomFieldValue(textField, 'Acme Corp')).toBe('Acme Corp');
      expect(formatCustomFieldValue(dropdownField, 'Pro')).toBe('Pro');
    });

    it('formats date values', () => {
      const formatted = formatCustomFieldValue(dateField, '2026-10-15T00:00:00.000Z');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Oct');
    });
  });

  describe('validateCustomFieldValue', () => {
    it('enforces required fields when empty', () => {
      const res = validateCustomFieldValue(textField, '');
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Customer is required');
    });

    it('passes optional fields when empty', () => {
      expect(validateCustomFieldValue(numberField, '').isValid).toBe(true);
      expect(validateCustomFieldValue(numberField, null).isValid).toBe(true);
    });

    it('validates number fields', () => {
      expect(validateCustomFieldValue(numberField, 25).isValid).toBe(true);
      expect(validateCustomFieldValue(numberField, '25').isValid).toBe(true);
      expect(validateCustomFieldValue(numberField, 'abc').isValid).toBe(false);
      expect(validateCustomFieldValue(numberField, true).isValid).toBe(false);
    });

    it('validates date fields', () => {
      expect(validateCustomFieldValue(dateField, '2026-10-15').isValid).toBe(true);
      expect(validateCustomFieldValue(dateField, 'not-a-date').isValid).toBe(false);
    });

    it('validates dropdown fields against allowed options', () => {
      expect(validateCustomFieldValue(dropdownField, 'Pro').isValid).toBe(true);
      const invalidRes = validateCustomFieldValue(dropdownField, 'Ultra');
      expect(invalidRes.isValid).toBe(false);
      expect(invalidRes.error).toContain('is not a valid option');
    });

    it('validates checkbox fields', () => {
      expect(validateCustomFieldValue(checkboxField, true).isValid).toBe(true);
      expect(validateCustomFieldValue(checkboxField, false).isValid).toBe(true);
      expect(validateCustomFieldValue(checkboxField, 'yes').isValid).toBe(false);
    });
  });
});
