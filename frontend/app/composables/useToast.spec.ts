import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useToast } from './useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('initializes with empty toasts', () => {
    const { toasts } = useToast();
    toasts.value = [];
    expect(toasts.value).toEqual([]);
  });

  it('adds a toast via add()', () => {
    const { toasts, add } = useToast();
    toasts.value = [];
    add('Test message', 'info', 0);
    expect(toasts.value.length).toBe(1);
    expect(toasts.value[0].message).toBe('Test message');
    expect(toasts.value[0].type).toBe('info');
  });

  it('adds a toast via showToast alias', () => {
    const { toasts, showToast } = useToast();
    toasts.value = [];
    showToast('Success alert', 'success', 0);
    expect(toasts.value.length).toBe(1);
    expect(toasts.value[0].message).toBe('Success alert');
    expect(toasts.value[0].type).toBe('success');
  });

  it('provides convenience helpers success, error, and info', () => {
    const { toasts, success, error, info } = useToast();
    toasts.value = [];
    success('Success msg', 0);
    error('Error msg', 0);
    info('Info msg', 0);

    expect(toasts.value.length).toBe(3);
    expect(toasts.value[0].type).toBe('success');
    expect(toasts.value[1].type).toBe('error');
    expect(toasts.value[2].type).toBe('info');
  });

  it('removes a toast by id', () => {
    const { toasts, add, remove } = useToast();
    toasts.value = [];
    add('First', 'info', 0);
    const id = toasts.value[0].id;
    remove(id);
    expect(toasts.value.length).toBe(0);
  });
});
