import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAiStore } from './ai';

const mockApiFetch = vi.fn();

vi.mock('../composables/useApi', () => ({
  useApi: () => ({
    apiFetch: mockApiFetch,
  }),
}));

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({
    public: {
      apiBase: 'http://localhost:3000/api',
    },
  }),
}));

describe('ai store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initializes with default values', () => {
    const store = useAiStore();
    expect(store.isOpen).toBe(false);
    expect(store.isStreaming).toBe(false);
    expect(store.sessions).toEqual([]);
    expect(store.messages).toEqual([]);
    expect(store.mutationVersion).toBe(0);
  });

  it('toggles drawer state', () => {
    const store = useAiStore();
    store.toggleDrawer();
    expect(store.isOpen).toBe(true);
    store.closeDrawer();
    expect(store.isOpen).toBe(false);
    store.openDrawer();
    expect(store.isOpen).toBe(true);
  });

  it('fetches sessions and selects the first one', async () => {
    mockApiFetch.mockResolvedValueOnce([
      { id: 'sess-1', title: 'Session 1', messagesCount: 0 },
    ]);
    mockApiFetch.mockResolvedValueOnce([
      { role: 'user', content: 'Hi' },
      { role: 'model', content: 'Hello' },
    ]);

    const store = useAiStore();
    await store.fetchSessions();

    expect(store.sessions).toHaveLength(1);
    expect(store.activeSessionId).toBe('sess-1');
    expect(store.messages).toHaveLength(2);
  });

  it('creates a new session and sets it active', async () => {
    mockApiFetch.mockResolvedValueOnce({
      id: 'sess-2',
      title: 'New Chat',
      messagesCount: 0,
    });

    const store = useAiStore();
    const id = await store.createNewSession();

    expect(id).toBe('sess-2');
    expect(store.activeSessionId).toBe('sess-2');
    expect(store.messages).toEqual([]);
  });

  it('deletes a session and updates active session', async () => {
    mockApiFetch.mockResolvedValueOnce(undefined);

    const store = useAiStore();
    store.sessions = [{ id: 'sess-1', title: 'S1', messagesCount: 0, createdAt: '', updatedAt: '' }];
    store.activeSessionId = 'sess-1';

    await store.deleteSession('sess-1');

    expect(store.sessions).toEqual([]);
    expect(store.activeSessionId).toBeNull();
  });
});
