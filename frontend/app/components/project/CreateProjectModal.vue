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
        class="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 z-10"
      >
        <div class="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <h2 class="text-xl font-bold text-white">Create New Project</h2>
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
                Project Name <span class="text-rose-400">*</span>
              </label>
              <input
                v-model.trim="form.name"
                type="text"
                required
                maxlength="100"
                placeholder="e.g. Marketing Platform"
                class="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm transition"
              >
              <p v-if="nameError" class="text-xs text-rose-400 mt-1">
                {{ nameError }}
              </p>
            </div>

            <!-- Prefix -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-1.5">
                Prefix (Key) <span class="text-rose-400">*</span>
              </label>
              <div class="relative">
                <input
                  :value="form.prefix"
                  type="text"
                  required
                  maxlength="5"
                  placeholder="e.g. MP"
                  class="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm transition"
                  @input="handlePrefixInput"
                >
              </div>
              <p class="text-xs text-slate-400 mt-1">
                2–5 characters. Used for issue keys (e.g. {{ form.prefix || 'KEY' }}-101).
              </p>
              <p v-if="prefixError" class="text-xs text-rose-400 mt-1">
                {{ prefixError }}
              </p>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-1.5">
                Description <span class="text-slate-500">(Optional)</span>
              </label>
              <textarea
                v-model.trim="form.description"
                rows="3"
                maxlength="1000"
                placeholder="Briefly describe what this project is about..."
                class="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm transition"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-8 flex justify-end gap-3">
            <button
              type="button"
              :disabled="loading"
              class="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
              @click="handleClose"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading || isFormInvalid"
              class="px-5 py-2.5 text-sm font-medium rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/20"
            >
              <span v-if="loading" class="animate-spin text-xs">⏳</span>
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, watch } from 'vue';
import { useProjectsStore } from '../../stores/projects';
import { useToast } from '../../composables/useToast';
import type { Project } from '../../types/project';

interface Props {
  isOpen: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created', project: Project): void;
}>();

const projectsStore = useProjectsStore();
const toast = useToast();

const form = reactive({
  name: '',
  prefix: '',
  description: '',
});

const loading = ref(false);
const errorMessage = ref('');

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      form.name = '';
      form.prefix = '';
      form.description = '';
      errorMessage.value = '';
    }
  },
);

function handlePrefixInput(event: Event) {
  const target = event.target as HTMLInputElement;
  form.prefix = target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const nameError = computed(() => {
  if (!form.name) return '';
  if (form.name.length < 2) return 'Project name must be at least 2 characters';
  return '';
});

const prefixError = computed(() => {
  if (!form.prefix) return '';
  if (form.prefix.length < 2) return 'Prefix must be at least 2 characters';
  if (form.prefix.length > 5) return 'Prefix cannot exceed 5 characters';
  return '';
});

const isFormInvalid = computed(() => {
  return (
    !form.name ||
    form.name.length < 2 ||
    !form.prefix ||
    form.prefix.length < 2 ||
    form.prefix.length > 5
  );
});

function handleClose() {
  if (!loading.value) {
    emit('close');
  }
}

async function handleSubmit() {
  if (isFormInvalid.value) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    const created = await projectsStore.createProject({
      name: form.name,
      prefix: form.prefix,
      description: form.description || undefined,
    });
    toast.success(`Project "${created.name}" created successfully!`);
    emit('created', created);
    emit('close');
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string }; message?: string };
    errorMessage.value =
      fetchErr?.data?.message || fetchErr?.message || 'Failed to create project';
    toast.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}
</script>
