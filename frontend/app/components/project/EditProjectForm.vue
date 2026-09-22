<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <div
      v-if="errorMessage"
      class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm"
    >
      {{ errorMessage }}
    </div>

    <!-- Project Name -->
    <div>
      <label class="block text-sm font-medium text-slate-300 mb-1.5">
        Project Name <span class="text-rose-400">*</span>
      </label>
      <input
        v-model.trim="form.name"
        type="text"
        required
        maxlength="100"
        placeholder="Project name"
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
      <input
        :value="form.prefix"
        type="text"
        required
        maxlength="5"
        placeholder="e.g. MAX"
        class="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm transition"
        @input="handlePrefixInput"
      >
      <p class="text-xs text-slate-400 mt-1">
        2–5 uppercase characters.
      </p>
      <p v-if="prefixError" class="text-xs text-rose-400 mt-1">
        {{ prefixError }}
      </p>
    </div>

    <!-- Description -->
    <div>
      <label class="block text-sm font-medium text-slate-300 mb-1.5">
        Description
      </label>
      <textarea
        v-model.trim="form.description"
        rows="4"
        maxlength="1000"
        placeholder="Project description..."
        class="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm transition"
      />
    </div>

    <!-- Save Button -->
    <div class="flex justify-end pt-4 border-t border-slate-800">
      <button
        type="submit"
        :disabled="loading || isFormInvalid || !isDirty"
        class="px-5 py-2.5 text-sm font-medium rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/20"
      >
        <span v-if="loading" class="animate-spin text-xs">⏳</span>
        Save Changes
      </button>
    </div>
  </form>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, watch } from 'vue';
import { useProjectsStore } from '../../stores/projects';
import { useToast } from '../../composables/useToast';
import type { Project } from '../../types/project';

interface Props {
  project: Project;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'saved', project: Project): void;
}>();

const projectsStore = useProjectsStore();
const toast = useToast();

const form = reactive({
  name: props.project.name,
  prefix: props.project.prefix,
  description: props.project.description || '',
});

const loading = ref(false);
const errorMessage = ref('');

watch(
  () => props.project,
  (p) => {
    if (p) {
      form.name = p.name;
      form.prefix = p.prefix;
      form.description = p.description || '';
    }
  },
  { deep: true },
);

function handlePrefixInput(event: Event) {
  const target = event.target as HTMLInputElement;
  form.prefix = target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const isDirty = computed(() => {
  return (
    form.name !== props.project.name ||
    form.prefix !== props.project.prefix ||
    form.description !== (props.project.description || '')
  );
});

const nameError = computed(() => {
  if (!form.name) return 'Project name is required';
  if (form.name.length < 2) return 'Project name must be at least 2 characters';
  return '';
});

const prefixError = computed(() => {
  if (!form.prefix) return 'Prefix is required';
  if (form.prefix.length < 2) return 'Prefix must be at least 2 characters';
  if (form.prefix.length > 5) return 'Prefix cannot exceed 5 characters';
  return '';
});

const isFormInvalid = computed(() => {
  return !!nameError.value || !!prefixError.value;
});

async function handleSubmit() {
  if (isFormInvalid.value || !isDirty.value) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    const updated = await projectsStore.updateProject(props.project._id, {
      name: form.name.trim(),
      prefix: form.prefix.trim(),
      description: form.description ? form.description.trim() : undefined,
    });
    toast.success('Project settings updated successfully!');
    emit('saved', updated);
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string }; message?: string };
    errorMessage.value =
      fetchErr?.data?.message || fetchErr?.message || 'Failed to update project';
    toast.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}
</script>
