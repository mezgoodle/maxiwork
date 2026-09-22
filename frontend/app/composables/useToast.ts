import { ref } from 'vue';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

const toasts = ref<Toast[]>([]);

export const useToast = () => {
  const add = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    duration = 4000,
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = { id, message, type, duration };
    toasts.value.push(toast);

    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }
  };

  const success = (message: string, duration = 4000) =>
    add(message, 'success', duration);
  const error = (message: string, duration = 5000) =>
    add(message, 'error', duration);
  const info = (message: string, duration = 4000) =>
    add(message, 'info', duration);

  const remove = (id: string) => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  };

  return {
    toasts,
    add,
    success,
    error,
    info,
    remove,
  };
};
