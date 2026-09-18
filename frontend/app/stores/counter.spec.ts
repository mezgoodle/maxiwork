import { setActivePinia, createPinia } from 'pinia';
import { describe, beforeEach, it, expect } from 'vitest';
import { useCounterStore } from './counter';

describe('useCounterStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with count 0', () => {
    const store = useCounterStore();
    expect(store.count).toBe(0);
    expect(store.doubled).toBe(0);
  });

  it('increments count', () => {
    const store = useCounterStore();
    store.increment();
    expect(store.count).toBe(1);
    expect(store.doubled).toBe(2);
  });

  it('decrements count', () => {
    const store = useCounterStore();
    store.decrement();
    expect(store.count).toBe(-1);
    expect(store.doubled).toBe(-2);
  });

  it('resets count', () => {
    const store = useCounterStore();
    store.increment();
    store.reset();
    expect(store.count).toBe(0);
  });
});
