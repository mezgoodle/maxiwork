import { describe, it, expect } from 'vitest';
import { extractApiErrorMessage } from './error';

describe('extractApiErrorMessage', () => {
  it('returns fallback message if error is null or undefined', () => {
    expect(extractApiErrorMessage(null)).toBe('An unexpected error occurred');
    expect(extractApiErrorMessage(undefined, 'Custom fallback')).toBe('Custom fallback');
  });

  it('returns string if error is a string', () => {
    expect(extractApiErrorMessage('Network timeout')).toBe('Network timeout');
  });

  it('extracts nested data.message from Nuxt/NestJS error', () => {
    const err = { data: { message: 'Project not found' } };
    expect(extractApiErrorMessage(err)).toBe('Project not found');
  });

  it('joins array validation error messages from NestJS ValidationPipe', () => {
    const err = { data: { message: ['Title is required', 'Status is invalid'] } };
    expect(extractApiErrorMessage(err)).toBe('Title is required, Status is invalid');
  });

  it('extracts top-level error.message', () => {
    const err = new Error('Database connection failed');
    expect(extractApiErrorMessage(err)).toBe('Database connection failed');
  });

  it('returns fallback if object has no recognizable message', () => {
    expect(extractApiErrorMessage({ status: 500 })).toBe('An unexpected error occurred');
  });
});
