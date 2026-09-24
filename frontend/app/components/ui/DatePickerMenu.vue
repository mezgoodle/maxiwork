<template>
  <div ref="containerRef" class="relative w-full">
    <!-- Trigger Button -->
    <div
      class="w-full px-3 py-2 bg-slate-800/80 border rounded-xl text-sm flex items-center justify-between transition cursor-pointer select-none"
      :class="[
        isOpen
          ? 'border-emerald-500 ring-2 ring-emerald-500/40 text-white'
          : 'border-slate-700 hover:border-slate-600 text-slate-200',
        disabled ? 'opacity-50 pointer-events-none' : '',
      ]"
      @click="toggleDropdown"
    >
      <div class="flex items-center gap-2 overflow-hidden truncate">
        <span class="text-slate-400 shrink-0">📅</span>
        <span v-if="modelValue" class="font-medium text-white truncate">
          {{ formattedDisplayDate }}
        </span>
        <span v-else class="text-slate-500 truncate">
          {{ placeholder }}
        </span>
      </div>

      <div class="flex items-center gap-1.5 shrink-0 ml-2">
        <button
          v-if="modelValue && !disabled"
          type="button"
          class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-700/60 transition cursor-pointer"
          title="Clear date"
          @click.stop="clearDate"
        >
          ✕
        </button>
        <span class="text-xs text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': isOpen }">
          ▼
        </span>
      </div>
    </div>

    <!-- Dropdown Menu -->
    <div
      v-if="isOpen"
      class="absolute left-0 top-full mt-1.5 w-64 sm:w-72 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-3 z-50 backdrop-blur-md"
    >
      <!-- Quick Options -->
      <div class="mb-3">
        <div class="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 px-1">
          Quick Presets
        </div>
        <div class="space-y-1">
          <button
            type="button"
            :disabled="isBeforeMin(todayStr)"
            class="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition flex items-center justify-between cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            :class="modelValue === todayStr ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'"
            @click="selectDate(todayStr)"
          >
            <span>⚡ Today</span>
            <span class="text-[11px] text-slate-500 font-mono">{{ formatShort(todayStr) }}</span>
          </button>

          <button
            type="button"
            :disabled="isBeforeMin(tomorrowStr)"
            class="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition flex items-center justify-between cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            :class="modelValue === tomorrowStr ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'"
            @click="selectDate(tomorrowStr)"
          >
            <span>⏩ Tomorrow</span>
            <span class="text-[11px] text-slate-500 font-mono">{{ formatShort(tomorrowStr) }}</span>
          </button>

          <button
            type="button"
            :disabled="isBeforeMin(inOneWeekStr)"
            class="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition flex items-center justify-between cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            :class="modelValue === inOneWeekStr ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'"
            @click="selectDate(inOneWeekStr)"
          >
            <span>📆 In 1 week</span>
            <span class="text-[11px] text-slate-500 font-mono">{{ formatShort(inOneWeekStr) }}</span>
          </button>
        </div>
      </div>

      <!-- Divider -->
      <div class="border-t border-slate-800/80 my-2.5" />

      <!-- Specific Date Picker -->
      <div>
        <label class="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 px-1">
          Specific Date
        </label>
        <input
          :value="modelValue"
          type="date"
          :min="minDate"
          class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition cursor-pointer"
          @input="onNativeInput"
        >
      </div>

      <!-- Clear Option -->
      <div v-if="modelValue" class="mt-2.5 pt-2 border-t border-slate-800/80">
        <button
          type="button"
          class="w-full text-center py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
          @click="clearDate"
        >
          Clear Date
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

interface Props {
  modelValue?: string;
  placeholder?: string;
  minDate?: string;
  disabled?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Select date',
  minDate: undefined,
  disabled: false,
});

const emit = defineEmits<Emits>();

const containerRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = padZero(d.getMonth() + 1);
  const day = padZero(d.getDate());
  return `${year}-${month}-${day}`;
}

const todayStr = computed(() => toDateString(new Date()));

const tomorrowStr = computed(() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateString(d);
});

const inOneWeekStr = computed(() => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return toDateString(d);
});

function isBeforeMin(dateStr: string): boolean {
  if (!props.minDate) return false;
  return dateStr < props.minDate;
}

function parseDate(str: string): Date | null {
  if (!str) return null;
  const parts = str.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null;
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

const formattedDisplayDate = computed(() => {
  if (!props.modelValue) return '';
  const d = parseDate(props.modelValue);
  if (!d) return props.modelValue;

  const dateFormatted = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (props.modelValue === todayStr.value) {
    return `Today (${dateFormatted})`;
  }
  if (props.modelValue === tomorrowStr.value) {
    return `Tomorrow (${dateFormatted})`;
  }
  return dateFormatted;
});

function formatShort(str: string): string {
  const d = parseDate(str);
  if (!d) return str;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function toggleDropdown() {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
}

function selectDate(dateStr: string) {
  emit('update:modelValue', dateStr);
  isOpen.value = false;
}

function onNativeInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
  if (target.value) {
    isOpen.value = false;
  }
}

function clearDate() {
  emit('update:modelValue', '');
  isOpen.value = false;
}

function handleDocumentClick(event: MouseEvent) {
  if (!containerRef.value) return;
  if (!containerRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    isOpen.value = false;
  }
}

onMounted(() => {
  if ((import.meta as { client?: boolean }).client) {
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeydown);
  }
});

onBeforeUnmount(() => {
  if ((import.meta as { client?: boolean }).client) {
    document.removeEventListener('click', handleDocumentClick);
    document.removeEventListener('keydown', handleDocumentKeydown);
  }
});
</script>
