<template>
  <div class="space-y-3 text-xs">
    <!-- Frequency and Interval -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-400 font-medium mb-1">
          Frequency
        </label>
        <select
          :value="modelValue.frequency"
          class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          @change="updateField('frequency', ($event.target as HTMLSelectElement).value as RecurrenceFrequency)"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom (Days)</option>
        </select>
      </div>

      <div>
        <label class="block text-slate-400 font-medium mb-1">
          Every
        </label>
        <div class="flex items-center gap-1.5">
          <input
            :value="modelValue.interval"
            type="number"
            min="1"
            max="999"
            class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500"
            @input="updateField('interval', Number(($event.target as HTMLInputElement).value))"
          >
          <span class="text-slate-400 shrink-0">
            {{ modelValue.frequency === 'weekly' ? 'week(s)' : modelValue.frequency === 'monthly' ? 'month(s)' : 'day(s)' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Days of week selector if weekly -->
    <div v-if="modelValue.frequency === 'weekly'">
      <label class="block text-slate-400 font-medium mb-1.5">
        Repeat on
      </label>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="day in WEEKDAYS"
          :key="day.value"
          type="button"
          :aria-pressed="Boolean(modelValue.daysOfWeek?.includes(day.value))"
          class="px-2.5 py-1 rounded-md text-xs font-semibold border transition cursor-pointer"
          :class="
            modelValue.daysOfWeek?.includes(day.value)
              ? 'bg-indigo-600 text-white border-indigo-500'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
          "
          @click="toggleDay(day.value)"
        >
          {{ day.shortLabel }}
        </button>
      </div>
    </div>

    <!-- End condition -->
    <div>
      <label class="block text-slate-400 font-medium mb-1">
        Ends
      </label>
      <div
        role="radiogroup"
        aria-label="Recurrence end condition"
        class="grid grid-cols-3 gap-2 mb-2"
      >
        <button
          type="button"
          role="radio"
          :aria-checked="modelValue.endType === 'never'"
          class="px-2 py-1 text-center rounded-lg border text-xs font-medium transition cursor-pointer"
          :class="
            modelValue.endType === 'never'
              ? 'bg-indigo-600 text-white border-indigo-500'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
          "
          @click="updateField('endType', 'never')"
        >
          Never
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="modelValue.endType === 'after_occurrences'"
          class="px-2 py-1 text-center rounded-lg border text-xs font-medium transition cursor-pointer"
          :class="
            modelValue.endType === 'after_occurrences'
              ? 'bg-indigo-600 text-white border-indigo-500'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
          "
          @click="updateField('endType', 'after_occurrences')"
        >
          After #
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="modelValue.endType === 'on_date'"
          class="px-2 py-1 text-center rounded-lg border text-xs font-medium transition cursor-pointer"
          :class="
            modelValue.endType === 'on_date'
              ? 'bg-indigo-600 text-white border-indigo-500'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
          "
          @click="updateField('endType', 'on_date')"
        >
          On date
        </button>
      </div>

      <div v-if="modelValue.endType === 'after_occurrences'" class="flex items-center gap-2">
        <span class="text-slate-400">Total occurrences:</span>
        <input
          :value="modelValue.occurrences ?? ''"
          type="number"
          min="1"
          placeholder="e.g. 10"
          class="w-24 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500"
          @input="handleOccurrencesInput(($event.target as HTMLInputElement).value)"
        >
      </div>

      <div v-if="modelValue.endType === 'on_date'">
        <DatePickerMenu
          :model-value="formattedEndDate"
          placeholder="Select end date"
          :min-date="minEndDate"
          @update:model-value="handleEndDateUpdate"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RecurrenceFrequency, RecurrenceSettings } from '../../types/task';
import { WEEKDAYS } from '../../utils/recurrence';
import DatePickerMenu from '../ui/DatePickerMenu.vue';

interface Props {
  modelValue: RecurrenceSettings;
  minEndDate?: string;
}

interface Emits {
  (e: 'update:modelValue', value: RecurrenceSettings): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const formattedEndDate = computed(() => {
  const dateStr = props.modelValue.endDate;
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
});

function updateField<K extends keyof RecurrenceSettings>(
  key: K,
  value: RecurrenceSettings[K],
) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  });
}

function toggleDay(dayVal: number) {
  const currentDays = [...(props.modelValue.daysOfWeek || [])];
  const idx = currentDays.indexOf(dayVal);
  if (idx > -1) {
    currentDays.splice(idx, 1);
  } else {
    currentDays.push(dayVal);
  }
  updateField('daysOfWeek', currentDays);
}

function handleOccurrencesInput(raw: string) {
  const trimmed = raw.trim();
  updateField('occurrences', trimmed === '' ? undefined : Number(trimmed));
}

function handleEndDateUpdate(val: string) {
  updateField('endDate', val || undefined);
}
</script>
