<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        @click="handleClose"
      />

      <!-- Modal panel -->
      <div
        class="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 z-10"
      >
        <div class="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <h2 class="text-xl font-bold text-white flex items-center gap-2">
            <span>{{ isEditing ? 'Edit Workspace' : 'Create New Workspace' }}</span>
          </h2>
          <button
            type="button"
            class="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
            @click="handleClose"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div
            v-if="errorMessage"
            class="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm"
          >
            {{ errorMessage }}
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-1.5">
                Workspace Name <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                maxlength="50"
                placeholder="e.g. Acme Corp, Product Team"
                class="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm transition"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-300 mb-1.5">
                Avatar URL (Optional)
              </label>
              <input
                v-model="form.avatarUrl"
                type="url"
                placeholder="https://example.com/logo.png"
                class="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm transition"
              >
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
              @click="handleClose"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg transition cursor-pointer"
            >
              {{ submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Workspace') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import type { Workspace } from '../../types/hierarchy';

const props = defineProps<{
  isOpen: boolean;
  workspaceToEdit?: Workspace | null;
}>();

const emit = defineEmits<{
  (e: 'close' | 'saved'): void;
}>();

const submitting = ref(false);
const errorMessage = ref<string | null>(null);
const isEditing = ref(false);

const form = reactive({
  name: '',
  avatarUrl: '',
});

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      errorMessage.value = null;
      if (props.workspaceToEdit) {
        isEditing.value = true;
        form.name = props.workspaceToEdit.name;
        form.avatarUrl = props.workspaceToEdit.avatarUrl || '';
      } else {
        isEditing.value = false;
        form.name = '';
        form.avatarUrl = '';
      }
    }
  },
  { immediate: true },
);

function handleClose() {
  emit('close');
}

async function handleSubmit() {
  if (!form.name.trim()) return;

  submitting.value = true;
  errorMessage.value = null;

  try {
    const { useHierarchyStore } = await import('../../stores/hierarchy');
    const store = useHierarchyStore();

    if (isEditing.value && props.workspaceToEdit) {
      await store.updateWorkspace(props.workspaceToEdit._id, {
        name: form.name.trim(),
        avatarUrl: form.avatarUrl.trim() || undefined,
      });
    } else {
      await store.createWorkspace({
        name: form.name.trim(),
        avatarUrl: form.avatarUrl.trim() || undefined,
      });
    }

    emit('saved');
    handleClose();
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string }; message?: string };
    errorMessage.value = fetchErr?.data?.message || fetchErr?.message || 'Failed to save workspace';
  } finally {
    submitting.value = false;
  }
}
</script>
