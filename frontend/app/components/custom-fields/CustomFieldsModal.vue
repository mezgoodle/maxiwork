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

      <!-- Modal Panel -->
      <div
        class="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 z-10 max-h-[90vh] flex flex-col"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-800 mb-6 shrink-0">
          <div>
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <span>Custom Fields</span>
              <span v-if="entityName" class="text-xs font-normal text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                {{ entityName }}
              </span>
            </h2>
            <p class="text-xs text-slate-400 mt-1">
              {{ listId ? 'Configure custom fields for this list and view inherited space fields.' : 'Configure custom fields for this space (inherited by all lists).' }}
            </p>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
            @click="handleClose"
          >
            ✕
          </button>
        </div>

        <!-- Body Area (Scrollable) -->
        <div class="flex-1 overflow-y-auto space-y-6 pr-1">
          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm"
          >
            {{ errorMessage }}
          </div>

          <!-- Existing Fields List -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Existing Fields ({{ currentFields.length }})
              </h3>
              <button
                v-if="!showForm"
                type="button"
                class="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                @click="openAddForm"
              >
                <span>+</span>
                <span>Add Custom Field</span>
              </button>
            </div>

            <!-- Loading Skeleton -->
            <div v-if="loading && currentFields.length === 0" class="space-y-2">
              <div v-for="i in 3" :key="i" class="h-14 bg-slate-800/60 rounded-xl animate-pulse" />
            </div>

            <!-- Empty State -->
            <div
              v-else-if="currentFields.length === 0"
              class="p-6 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs"
            >
              No custom fields configured yet. Click "Add Custom Field" to create your first field.
            </div>

            <!-- Fields Cards -->
            <div v-else class="space-y-2">
              <div
                v-for="field in currentFields"
                :key="field._id"
                class="p-3.5 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 rounded-xl flex items-center justify-between gap-3 transition"
              >
                <!-- Left: Name, Type, Flags -->
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap mb-1">
                    <span class="text-sm font-semibold text-white">
                      {{ field.name }}
                    </span>

                    <!-- Type Badge -->
                    <span
                      class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full"
                      :class="getTypeBadgeClass(field.type)"
                    >
                      {{ field.type }}
                    </span>

                    <!-- Required Badge -->
                    <span
                      v-if="field.required"
                      class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20"
                    >
                      Required
                    </span>

                    <!-- Inherited Badge -->
                    <span
                      v-if="'inherited' in field && field.inherited"
                      class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                      title="Inherited from parent Space"
                    >
                      ↳ Space Inherited
                    </span>
                  </div>

                  <!-- Description or Dropdown options list -->
                  <div class="flex items-center gap-2 text-xs text-slate-400 truncate">
                    <span v-if="field.description">{{ field.description }}</span>
                    <span v-if="field.type === 'dropdown' && field.options?.length" class="text-slate-500 truncate">
                      Options: {{ field.options.join(', ') }}
                    </span>
                  </div>
                </div>

                <!-- Right: Actions -->
                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/60 transition cursor-pointer text-xs"
                    title="Edit Field"
                    @click="openEditForm(field)"
                  >
                    ✏️
                  </button>
                  <button
                    v-if="!('inherited' in field && field.inherited)"
                    type="button"
                    class="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition cursor-pointer text-xs"
                    title="Delete Field"
                    @click="promptDeleteField(field)"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Add / Edit Form Panel -->
          <div
            v-if="showForm"
            class="p-5 bg-slate-800/80 border border-indigo-500/30 rounded-2xl space-y-4"
          >
            <div class="flex items-center justify-between pb-2 border-b border-slate-700/80">
              <h4 class="text-sm font-bold text-white">
                {{ editingField ? 'Edit Custom Field' : 'Create Custom Field' }}
              </h4>
              <button
                type="button"
                class="text-xs text-slate-400 hover:text-white cursor-pointer"
                @click="closeForm"
              >
                Cancel
              </button>
            </div>

            <!-- Field Name -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">
                Field Name <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                maxlength="50"
                placeholder="e.g. Story Points, Client Tier, Target Release"
                class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
            </div>

            <!-- Field Type (Only selectable during creation) -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">
                Field Type <span class="text-rose-400">*</span>
              </label>
              <select
                v-model="form.type"
                :disabled="!!editingField"
                class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50"
              >
                <option value="text">Text (short single-line input)</option>
                <option value="number">Number (numeric value)</option>
                <option value="date">Date (calendar date picker)</option>
                <option value="dropdown">Dropdown (predefined options)</option>
                <option value="checkbox">Checkbox (boolean true/false toggle)</option>
              </select>
            </div>

            <!-- Dropdown Options Manager (Visible only when type is dropdown) -->
            <div v-if="form.type === 'dropdown'" class="space-y-2">
              <label class="block text-xs font-semibold text-slate-300">
                Dropdown Options <span class="text-rose-400">*</span>
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model="newOptionInput"
                  type="text"
                  placeholder="Type an option and press Add..."
                  class="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                  @keydown.enter.prevent="addOption"
                >
                <button
                  type="button"
                  :disabled="!newOptionInput.trim()"
                  class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-40 cursor-pointer"
                  @click="addOption"
                >
                  Add Option
                </button>
              </div>

              <!-- Options Tags -->
              <div class="flex flex-wrap gap-1.5 pt-1">
                <span
                  v-for="(opt, idx) in form.options"
                  :key="idx"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs"
                >
                  <span>{{ opt }}</span>
                  <button
                    type="button"
                    class="text-indigo-400 hover:text-rose-400 cursor-pointer text-xs leading-none"
                    @click="removeOption(idx)"
                  >
                    ✕
                  </button>
                </span>
                <span v-if="form.options.length === 0" class="text-xs text-amber-400/80">
                  Please add at least one dropdown option.
                </span>
              </div>
            </div>

            <!-- Required Toggle & Description -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <input
                  v-model="form.description"
                  type="text"
                  maxlength="200"
                  placeholder="Help text for users"
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
              </div>

              <div class="flex items-center pt-5">
                <label class="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    v-model="form.required"
                    type="checkbox"
                    class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500/40 cursor-pointer"
                  >
                  <span class="text-xs font-medium text-slate-300">Required field</span>
                </label>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-700/80">
              <button
                type="button"
                class="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                @click="closeForm"
              >
                Cancel
              </button>
              <button
                type="button"
                :disabled="isSubmitting || !isFormValid"
                class="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-600/20"
                @click="saveField"
              >
                <span v-if="isSubmitting" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{{ editingField ? 'Save Changes' : 'Create Field' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end shrink-0">
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
            @click="handleClose"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Delete Field Confirmation Dialog -->
  <ConfirmDialog
    :is-open="isDeleteDialogOpen"
    title="Delete Custom Field"
    :message="`Are you sure you want to delete field '${fieldToDelete?.name}'? Values stored in tasks for this field will be permanently removed.`"
    confirm-text="Delete Field"
    is-destructive
    @confirm="handleConfirmDelete"
    @cancel="isDeleteDialogOpen = false"
  />
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type {
  CustomField,
  CustomFieldType,
  EffectiveCustomField,
} from '../../types/custom-field';
import { useCustomFieldsStore } from '../../stores/custom-fields';
import { useToast } from '../../composables/useToast';
import ConfirmDialog from '../ui/ConfirmDialog.vue';

interface Props {
  isOpen: boolean;
  spaceId?: string;
  listId?: string;
  entityName?: string;
}

interface Emits {
  (e: 'close' | 'updated'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const customFieldsStore = useCustomFieldsStore();
const { showToast } = useToast();

const loading = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref('');

const showForm = ref(false);
const editingField = ref<CustomField | EffectiveCustomField | null>(null);
const newOptionInput = ref('');

const isDeleteDialogOpen = ref(false);
const fieldToDelete = ref<CustomField | EffectiveCustomField | null>(null);

const form = reactive({
  name: '',
  type: 'text' as CustomFieldType,
  options: [] as string[],
  required: false,
  description: '',
});

const currentFields = computed(() => {
  if (props.listId) {
    return customFieldsStore.listFields[props.listId] || [];
  }
  if (props.spaceId) {
    return customFieldsStore.spaceFields[props.spaceId] || [];
  }
  return [];
});

const isFormValid = computed(() => {
  if (!form.name.trim()) return false;
  if (form.type === 'dropdown' && form.options.length === 0) return false;
  return true;
});

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      errorMessage.value = '';
      closeForm();
      await loadFields();
    }
  },
);

async function loadFields() {
  loading.value = true;
  try {
    if (props.listId) {
      await customFieldsStore.fetchListFields(props.listId);
    } else if (props.spaceId) {
      await customFieldsStore.fetchSpaceFields(props.spaceId);
    }
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load custom fields';
  } finally {
    loading.value = false;
  }
}

function handleClose() {
  closeForm();
  emit('close');
}

function openAddForm() {
  editingField.value = null;
  form.name = '';
  form.type = 'text';
  form.options = [];
  form.required = false;
  form.description = '';
  newOptionInput.value = '';
  showForm.value = true;
}

function openEditForm(field: CustomField | EffectiveCustomField) {
  editingField.value = field;
  form.name = field.name;
  form.type = field.type;
  form.options = [...(field.options || [])];
  form.required = field.required;
  form.description = field.description || '';
  newOptionInput.value = '';
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingField.value = null;
  newOptionInput.value = '';
}

function addOption() {
  const opt = newOptionInput.value.trim();
  if (opt && !form.options.includes(opt)) {
    form.options.push(opt);
    newOptionInput.value = '';
  }
}

function removeOption(index: number) {
  form.options.splice(index, 1);
}

async function saveField() {
  if (!isFormValid.value) return;
  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    if (editingField.value) {
      await customFieldsStore.updateField(
        editingField.value._id,
        {
          name: form.name.trim(),
          options: form.type === 'dropdown' ? form.options : [],
          required: form.required,
          description: form.description.trim(),
        },
        { spaceId: props.spaceId, listId: props.listId },
      );
      showToast('Custom field updated successfully', 'success');
    } else {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        options: form.type === 'dropdown' ? form.options : [],
        required: form.required,
        description: form.description.trim(),
      };

      if (props.listId) {
        await customFieldsStore.createListField(props.listId, payload);
      } else if (props.spaceId) {
        await customFieldsStore.createSpaceField(props.spaceId, payload);
      }
      showToast('Custom field created successfully', 'success');
    }

    closeForm();
    await loadFields();
    emit('updated');
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to save custom field';
  } finally {
    isSubmitting.value = false;
  }
}

function promptDeleteField(field: CustomField | EffectiveCustomField) {
  fieldToDelete.value = field;
  isDeleteDialogOpen.value = true;
}

async function handleConfirmDelete() {
  if (!fieldToDelete.value) return;
  const fieldId = fieldToDelete.value._id;
  isDeleteDialogOpen.value = false;

  try {
    await customFieldsStore.deleteField(fieldId, {
      spaceId: props.spaceId,
      listId: props.listId,
    });
    showToast('Custom field deleted successfully', 'success');
    await loadFields();
    emit('updated');
  } catch (err: unknown) {
    showToast(
      err instanceof Error ? err.message : 'Failed to delete custom field',
      'error',
    );
  } finally {
    fieldToDelete.value = null;
  }
}

function getTypeBadgeClass(type: CustomFieldType): string {
  switch (type) {
    case 'text':
      return 'bg-blue-500/10 text-blue-300 border border-blue-500/20';
    case 'number':
      return 'bg-purple-500/10 text-purple-300 border border-purple-500/20';
    case 'date':
      return 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
    case 'dropdown':
      return 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20';
    case 'checkbox':
      return 'bg-rose-500/10 text-rose-300 border border-rose-500/20';
    default:
      return 'bg-slate-700 text-slate-300';
  }
}
</script>
