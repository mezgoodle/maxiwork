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
            <span>{{ isEditing ? 'Edit List' : 'Create New List' }}</span>
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
                List Name <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                maxlength="50"
                placeholder="e.g. Sprint Backlog, Bug Tracker, Ideas"
                class="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm transition"
              >
            </div>

            <!-- Folder Assignment -->
            <div v-if="folders.length > 0">
              <label class="block text-sm font-medium text-slate-300 mb-1.5">
                Folder Location
              </label>
              <select
                v-model="form.folderId"
                class="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm transition"
              >
                <option value="">None (Directly under Space)</option>
                <option v-for="folder in folders" :key="folder.id" :value="folder.id">
                  📁 {{ folder.name }}
                </option>
              </select>
            </div>

            <!-- Color Palette -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-1.5">
                Color Badge
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

            <!-- Custom Statuses Entry -->
            <div
              v-if="isEditing && listToEdit?.id"
              class="pt-3 border-t border-slate-800 flex items-center justify-between"
            >
              <div>
                <span class="text-sm font-medium text-slate-200">Custom Statuses</span>
                <p class="text-xs text-slate-400">Configure or override status workflow for this list</p>
              </div>
              <button
                type="button"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-indigo-400 hover:text-indigo-300 border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                @click="isStatusWorkflowOpen = true"
              >
                <span>⚙️</span>
                <span>Edit Statuses</span>
              </button>
            </div>

            <!-- Custom Fields Entry -->
            <div
              v-if="isEditing && listToEdit?.id"
              class="pt-3 border-t border-slate-800 flex items-center justify-between"
            >
              <div>
                <span class="text-sm font-medium text-slate-200">Custom Fields</span>
                <p class="text-xs text-slate-400">Configure fields for this list and view space fields</p>
              </div>
              <button
                type="button"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-indigo-400 hover:text-indigo-300 border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                @click="isCustomFieldsOpen = true"
              >
                <span>📋</span>
                <span>Edit Fields</span>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
            <div>
              <button
                v-if="isEditing"
                type="button"
                :disabled="submitting || isDeleting"
                class="px-3.5 py-2 text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition cursor-pointer disabled:opacity-50"
                @click="isConfirmDeleteDialogOpen = true"
              >
                Delete List
              </button>
            </div>
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
                @click="handleClose"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="submitting || isDeleting"
                class="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg transition cursor-pointer"
              >
                {{ submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create List') }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Confirm List Deletion Dialog -->
    <ConfirmDialog
      :is-open="isConfirmDeleteDialogOpen"
      title="Delete List"
      :message="`Are you sure you want to delete '${props.listToEdit?.name || 'this list'}' and all associated tasks? This action cannot be undone.`"
      confirm-text="Delete List"
      :is-destructive="true"
      :loading="isDeleting"
      @confirm="handleConfirmDelete"
      @cancel="isConfirmDeleteDialogOpen = false"
    />

    <!-- Status Workflow Modal for List -->
    <StatusWorkflowModal
      v-if="listToEdit?.id"
      :is-open="isStatusWorkflowOpen"
      target-type="list"
      :target-id="listToEdit.id"
      :target-name="listToEdit.name"
      @close="isStatusWorkflowOpen = false"
      @saved="handleStatusWorkflowSaved"
    />

    <!-- Custom Fields Modal for List -->
    <CustomFieldsModal
      v-if="listToEdit?.id"
      :is-open="isCustomFieldsOpen"
      :space-id="spaceId"
      :list-id="listToEdit.id"
      :entity-name="listToEdit.name"
      @close="isCustomFieldsOpen = false"
      @updated="emit('saved')"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import type { HierarchyTreeNodeFolder, HierarchyTreeNodeList } from '../../types/hierarchy';
import ConfirmDialog from '../ui/ConfirmDialog.vue';
import StatusWorkflowModal from './StatusWorkflowModal.vue';
import CustomFieldsModal from '../custom-fields/CustomFieldsModal.vue';
import { useToast } from '../../composables/useToast';
import { extractApiErrorMessage } from '../../utils/error';

const props = defineProps<{
  isOpen: boolean;
  spaceId: string;
  folders: HierarchyTreeNodeFolder[];
  defaultFolderId?: string;
  listToEdit?: HierarchyTreeNodeList | null;
}>();

const emit = defineEmits<{
  (e: 'close' | 'saved'): void;
  (e: 'deleted', id: string): void;
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

const submitting = ref(false);
const errorMessage = ref<string | null>(null);
const isEditing = ref(false);
const isConfirmDeleteDialogOpen = ref(false);
const isDeleting = ref(false);
const isStatusWorkflowOpen = ref(false);
const isCustomFieldsOpen = ref(false);

function handleStatusWorkflowSaved() {
  emit('saved');
}

const { showToast } = useToast();

const form = reactive({
  name: '',
  folderId: '',
  color: '#4F46E5',
});

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      errorMessage.value = null;
      isConfirmDeleteDialogOpen.value = false;
      if (props.listToEdit) {
        isEditing.value = true;
        form.name = props.listToEdit.name;
        form.folderId = props.listToEdit.folderId || '';
        form.color = props.listToEdit.color || '#4F46E5';
      } else {
        isEditing.value = false;
        form.name = '';
        form.folderId = props.defaultFolderId || '';
        form.color = '#4F46E5';
      }
    }
  },
  { immediate: true },
);

function handleClose() {
  emit('close');
}

async function handleConfirmDelete() {
  if (!props.listToEdit) return;
  const listId = props.listToEdit.id;
  isDeleting.value = true;
  errorMessage.value = null;

  try {
    const { useHierarchyStore } = await import('../../stores/hierarchy');
    const store = useHierarchyStore();
    await store.deleteList(listId);

    showToast('List deleted successfully', 'success');
    emit('deleted', listId);
    isConfirmDeleteDialogOpen.value = false;
    handleClose();
  } catch (err: unknown) {
    const msg = extractApiErrorMessage(err, 'Failed to delete list');
    errorMessage.value = msg;
    showToast(msg, 'error');
  } finally {
    isDeleting.value = false;
  }
}

async function handleSubmit() {
  if (!form.name.trim()) return;

  submitting.value = true;
  errorMessage.value = null;

  try {
    const { useHierarchyStore } = await import('../../stores/hierarchy');
    const store = useHierarchyStore();

    if (isEditing.value && props.listToEdit) {
      await store.updateList(props.listToEdit.id, {
        name: form.name.trim(),
        folderId: form.folderId || null,
        color: form.color,
      });
    } else {
      await store.createList(props.spaceId, {
        name: form.name.trim(),
        folderId: form.folderId || undefined,
        color: form.color,
      });
    }

    emit('saved');
    handleClose();
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string }; message?: string };
    errorMessage.value = fetchErr?.data?.message || fetchErr?.message || 'Failed to save list';
  } finally {
    submitting.value = false;
  }
}
</script>
