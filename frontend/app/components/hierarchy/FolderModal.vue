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
            <span>{{ isEditing ? 'Edit Folder' : 'Create New Folder' }}</span>
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
                Folder Name <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                maxlength="50"
                placeholder="e.g. Sprints, Documentation, Releases"
                class="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm transition"
              >
            </div>

            <div class="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span class="text-sm font-medium text-slate-200">Hidden Folder</span>
                <p class="text-xs text-slate-400">Hide from default navigation</p>
              </div>
              <input
                v-model="form.isHidden"
                type="checkbox"
                class="w-5 h-5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
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
              {{ submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Folder') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import type { Folder } from '../../types/hierarchy';

const props = defineProps<{
  isOpen: boolean;
  spaceId: string;
  folderToEdit?: Folder | null;
}>();

const emit = defineEmits<{
  (e: 'close' | 'saved'): void;
}>();

const submitting = ref(false);
const errorMessage = ref<string | null>(null);
const isEditing = ref(false);

const form = reactive({
  name: '',
  isHidden: false,
});

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      errorMessage.value = null;
      if (props.folderToEdit) {
        isEditing.value = true;
        form.name = props.folderToEdit.name;
        form.isHidden = props.folderToEdit.isHidden || false;
      } else {
        isEditing.value = false;
        form.name = '';
        form.isHidden = false;
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

    if (isEditing.value && props.folderToEdit) {
      await store.updateFolder(props.folderToEdit._id, {
        name: form.name.trim(),
        isHidden: form.isHidden,
      });
    } else {
      await store.createFolder(props.spaceId, {
        name: form.name.trim(),
        isHidden: form.isHidden,
      });
    }

    emit('saved');
    handleClose();
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string }; message?: string };
    errorMessage.value = fetchErr?.data?.message || fetchErr?.message || 'Failed to save folder';
  } finally {
    submitting.value = false;
  }
}
</script>
