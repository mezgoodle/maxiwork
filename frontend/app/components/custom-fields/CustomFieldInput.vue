<template>
  <div class="w-full">
    <!-- Text Field -->
    <template v-if="field.type === 'text'">
      <input
        :value="stringValue"
        type="text"
        :placeholder="placeholder || (compact ? '-' : `Enter ${field.name}...`)"
        :disabled="disabled"
        :class="compact ? compactInputClasses : defaultInputClasses"
        @input="handleInput(($event.target as HTMLInputElement).value)"
        @change="handleChange(($event.target as HTMLInputElement).value)"
        @blur="handleBlur"
      >
    </template>

    <!-- Number Field -->
    <template v-else-if="field.type === 'number'">
      <input
        :value="numberValue"
        type="number"
        step="any"
        :placeholder="placeholder || (compact ? '-' : `Enter number...`)"
        :disabled="disabled"
        :class="compact ? compactInputClasses : defaultInputClasses"
        @input="handleNumberInput(($event.target as HTMLInputElement).value)"
        @change="handleNumberChange(($event.target as HTMLInputElement).value)"
        @blur="handleBlur"
      >
    </template>

    <!-- Date Field -->
    <template v-else-if="field.type === 'date'">
      <DatePickerMenu
        :model-value="dateValue"
        :placeholder="placeholder || (compact ? '-' : 'Select date')"
        :disabled="disabled"
        :compact="compact"
        @update:model-value="handleDateChange"
      />
    </template>

    <!-- Dropdown Field -->
    <template v-else-if="field.type === 'dropdown'">
      <select
        :value="stringValue"
        :disabled="disabled"
        :class="compact ? compactSelectClasses : defaultSelectClasses"
        @change="handleDropdownChange(($event.target as HTMLSelectElement).value)"
      >
        <option value="">
          {{ compact ? '-' : `Select ${field.name}...` }}
        </option>
        <option
          v-for="opt in field.options || []"
          :key="opt"
          :value="opt"
        >
          {{ opt }}
        </option>
      </select>
    </template>

    <!-- Checkbox Field -->
    <template v-else-if="field.type === 'checkbox'">
      <label
        class="inline-flex items-center gap-2 cursor-pointer select-none"
        :class="{ 'opacity-50 cursor-not-allowed': disabled }"
      >
        <input
          type="checkbox"
          :checked="!!modelValue"
          :disabled="disabled"
          class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500/40 cursor-pointer"
          @change="handleCheckboxChange(($event.target as HTMLInputElement).checked)"
        >
        <span v-if="!compact" class="text-xs text-slate-300">{{ field.name }}</span>
      </label>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CustomField, EffectiveCustomField } from '../../types/custom-field';
import DatePickerMenu from '../ui/DatePickerMenu.vue';

interface Props {
  field: CustomField | EffectiveCustomField;
  modelValue: unknown;
  compact?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

interface Emits {
  (e: 'update:modelValue' | 'change', value: unknown): void;
  (e: 'blur'): void;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  disabled: false,
  placeholder: '',
});

const emit = defineEmits<Emits>();

const stringValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) return '';
  return String(props.modelValue);
});

const numberValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined || props.modelValue === '') {
    return '';
  }
  return Number(props.modelValue);
});

const dateValue = computed(() => {
  if (!props.modelValue) return '';
  const d = new Date(String(props.modelValue));
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
});

const defaultInputClasses =
  'w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm transition';

const compactInputClasses =
  'w-full px-2 py-1 bg-slate-900/60 hover:bg-slate-900 border border-transparent hover:border-slate-700 focus:border-indigo-500 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition';

const defaultSelectClasses =
  'w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition';

const compactSelectClasses =
  'w-full px-1.5 py-1 bg-slate-900/60 hover:bg-slate-900 border border-transparent hover:border-slate-700 focus:border-indigo-500 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition cursor-pointer';

function handleInput(val: string) {
  emit('update:modelValue', val);
}

function handleChange(val: string) {
  emit('update:modelValue', val);
  emit('change', val);
}

function handleNumberInput(val: string) {
  const num = val === '' ? null : Number(val);
  emit('update:modelValue', num);
}

function handleNumberChange(val: string) {
  const num = val === '' ? null : Number(val);
  emit('update:modelValue', num);
  emit('change', num);
}

function handleDateChange(val: string) {
  const finalVal = val ? new Date(val).toISOString() : null;
  emit('update:modelValue', finalVal);
  emit('change', finalVal);
}

function handleDropdownChange(val: string) {
  const finalVal = val === '' ? null : val;
  emit('update:modelValue', finalVal);
  emit('change', finalVal);
}

function handleCheckboxChange(checked: boolean) {
  emit('update:modelValue', checked);
  emit('change', checked);
}

function handleBlur() {
  emit('blur');
}
</script>
