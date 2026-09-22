<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        @click="handleCancel"
      />

      <!-- Dialog panel -->
      <div
        class="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 transform transition-all z-10"
      >
        <div class="flex items-start gap-4">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            :class="
              isDestructive
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-emerald-500/20 text-emerald-400'
            "
          >
            <span class="text-lg font-bold">!</span>
          </div>

          <div class="flex-1">
            <h3 class="text-lg font-semibold text-white">
              {{ title }}
            </h3>
            <p class="mt-2 text-sm text-slate-400 leading-relaxed">
              {{ message }}
            </p>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            :disabled="loading"
            class="px-4 py-2 text-sm font-medium rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            @click="handleCancel"
          >
            {{ cancelText }}
          </button>
          <button
            type="button"
            :disabled="loading"
            class="px-4 py-2 text-sm font-medium rounded-xl text-white transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            :class="
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            "
            @click="handleConfirm"
          >
            <span v-if="loading" class="animate-spin text-xs">⏳</span>
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  isDestructive: true,
  loading: false,
});

const emit = defineEmits<{
  (e: 'confirm' | 'cancel' | 'close'): void;
}>();

function handleConfirm() {
  if (!props.loading) {
    emit('confirm');
  }
}

function handleCancel() {
  if (!props.loading) {
    emit('cancel');
    emit('close');
  }
}
</script>
