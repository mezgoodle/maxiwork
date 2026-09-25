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
        class="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 z-10"
      >
        <div class="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <h2 class="text-xl font-bold text-white flex items-center gap-2">
            <span>{{ isEditing ? 'Edit Space' : 'Create New Space' }}</span>
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
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-1.5">
                Space Name <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                maxlength="50"
                placeholder="e.g. Engineering, Marketing, Operations"
                class="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm transition"
              >
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-1.5">
                Description (Optional)
              </label>
              <textarea
                v-model="form.description"
                rows="2"
                maxlength="500"
                placeholder="Brief summary of this space"
                class="w-full px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm transition"
              />
            </div>

            <!-- Color & Icon Pickers -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Color Palette -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">
                  Color
                </label>
                <div class="flex flex-wrap gap-2 items-center">
                  <button
                    v-for="color in presetColors"
                    :key="color"
                    type="button"
                    class="w-7 h-7 rounded-full border-2 transition transform hover:scale-110 cursor-pointer"
                    :style="{ backgroundColor: color }"
                    :class="form.color === color ? 'border-white scale-110 shadow-md' : 'border-transparent'"
                    @click="form.color = color"
                  />
                </div>
              </div>

              <!-- Icon Selector -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">
                  Icon
                </label>
                <div class="flex flex-wrap gap-1.5 items-center">
                  <button
                    v-for="icon in presetIcons"
                    :key="icon"
                    type="button"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-sm border transition cursor-pointer"
                    :class="form.icon === icon ? 'bg-indigo-600/30 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'"
                    @click="form.icon = icon"
                  >
                    {{ iconSymbols[icon] || '📁' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Privacy Option -->
            <div class="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span class="text-sm font-medium text-slate-200">Make Private</span>
                <p class="text-xs text-slate-400">Only invited members can access this space</p>
              </div>
              <input
                v-model="form.isPrivate"
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
              {{ submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Space') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import type { Space } from '../../types/hierarchy';

const props = defineProps<{
  isOpen: boolean;
  workspaceId: string;
  spaceToEdit?: Space | null;
}>();

const emit = defineEmits<{
  (e: 'close' | 'saved'): void;
}>();

const presetColors = [
  '#4F46E5', // Indigo
  '#10B981', // Emerald
  '#EF4444', // Rose
  '#F59E0B', // Amber
  '#0EA5E9', // Sky
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#64748B', // Slate
];

const presetIcons = ['folder', 'rocket', 'flag', 'tag', 'star', 'compass', 'zap', 'target'];

const iconSymbols: Record<string, string> = {
  folder: '📁',
  rocket: '🚀',
  flag: '🚩',
  tag: '🏷️',
  star: '⭐',
  compass: '🧭',
  zap: '⚡',
  target: '🎯',
};

const submitting = ref(false);
const errorMessage = ref<string | null>(null);
const isEditing = ref(false);

const form = reactive({
  name: '',
  description: '',
  color: '#4F46E5',
  icon: 'folder',
  isPrivate: false,
});

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      errorMessage.value = null;
      if (props.spaceToEdit) {
        isEditing.value = true;
        form.name = props.spaceToEdit.name;
        form.description = props.spaceToEdit.description || '';
        form.color = props.spaceToEdit.color || '#4F46E5';
        form.icon = props.spaceToEdit.icon || 'folder';
        form.isPrivate = props.spaceToEdit.isPrivate || false;
      } else {
        isEditing.value = false;
        form.name = '';
        form.description = '';
        form.color = '#4F46E5';
        form.icon = 'folder';
        form.isPrivate = false;
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

    if (isEditing.value && props.spaceToEdit) {
      await store.updateSpace(props.spaceToEdit._id, {
        name: form.name.trim(),
        description: form.description.trim(),
        color: form.color,
        icon: form.icon,
        isPrivate: form.isPrivate,
      });
    } else {
      await store.createSpace(props.workspaceId, {
        name: form.name.trim(),
        description: form.description.trim(),
        color: form.color,
        icon: form.icon,
        isPrivate: form.isPrivate,
      });
    }

    emit('saved');
    handleClose();
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string }; message?: string };
    errorMessage.value = fetchErr?.data?.message || fetchErr?.message || 'Failed to save space';
  } finally {
    submitting.value = false;
  }
}
</script>
