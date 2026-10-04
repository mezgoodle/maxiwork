<template>
  <div class="markdown-editor border border-slate-700/80 rounded-xl bg-slate-900 overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-indigo-500/40 focus-within:border-indigo-500 transition">
    <!-- Header: Tabs and Toolbar -->
    <div class="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-800/40 px-3 py-1.5 gap-2">
      <!-- Tabs: Write / Preview -->
      <div class="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
        <button
          type="button"
          class="px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer flex items-center gap-1.5"
          :class="activeTab === 'write' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'"
          @click="activeTab = 'write'"
        >
          <span>✏️</span>
          <span>Write</span>
        </button>
        <button
          type="button"
          class="px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer flex items-center gap-1.5"
          :class="activeTab === 'preview' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'"
          @click="activeTab = 'preview'"
        >
          <span>👁️</span>
          <span>Preview</span>
        </button>
      </div>

      <!-- Formatting Toolbar (only visible in Write mode) -->
      <div v-if="activeTab === 'write'" class="flex items-center gap-0.5 flex-wrap">
        <button
          type="button"
          title="Bold (Ctrl+B)"
          class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-md transition cursor-pointer text-xs font-bold leading-none min-w-[26px]"
          @click="wrapSelection('**', '**', 'bold text')"
        >
          B
        </button>
        <button
          type="button"
          title="Italic (Ctrl+I)"
          class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-md transition cursor-pointer text-xs italic leading-none min-w-[26px]"
          @click="wrapSelection('*', '*', 'italic text')"
        >
          I
        </button>
        <button
          type="button"
          title="Strikethrough"
          class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-md transition cursor-pointer text-xs line-through leading-none min-w-[26px]"
          @click="wrapSelection('~~', '~~', 'strikethrough text')"
        >
          S
        </button>

        <span class="w-[1px] h-3.5 bg-slate-700/80 mx-1" />

        <button
          type="button"
          title="Heading"
          class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-md transition cursor-pointer text-xs font-semibold leading-none min-w-[26px]"
          @click="insertLinePrefix('### ', 'Heading')"
        >
          H
        </button>
        <button
          type="button"
          title="Bullet List"
          class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-md transition cursor-pointer text-xs leading-none min-w-[26px]"
          @click="insertLinePrefix('- ', 'List item')"
        >
          •
        </button>
        <button
          type="button"
          title="Task List"
          class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-md transition cursor-pointer text-xs leading-none min-w-[26px]"
          @click="insertLinePrefix('- [ ] ', 'Task item')"
        >
          ☑
        </button>

        <span class="w-[1px] h-3.5 bg-slate-700/80 mx-1" />

        <button
          type="button"
          title="Code Block"
          class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-md transition cursor-pointer text-xs font-mono leading-none min-w-[26px]"
          @click="insertCode"
        >
          &lt;&gt;
        </button>
        <button
          type="button"
          title="Insert Link (Ctrl+K)"
          class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-md transition cursor-pointer text-xs leading-none min-w-[26px]"
          @click="insertLink"
        >
          🔗
        </button>
        <button
          type="button"
          title="Quote"
          class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-md transition cursor-pointer text-xs leading-none min-w-[26px]"
          @click="insertLinePrefix('> ', 'Quote text')"
        >
          ❝
        </button>
      </div>
    </div>

    <!-- Editor Body: Textarea (Write mode) -->
    <div v-show="activeTab === 'write'" class="p-3 relative">
      <textarea
        ref="textareaRef"
        :value="modelValue"
        :placeholder="placeholder"
        :rows="minRows"
        :maxlength="maxlength"
        class="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition leading-relaxed resize-y font-normal"
        @input="handleInput"
        @keydown="handleKeydown"
        @blur="$emit('blur')"
      />
    </div>

    <!-- Preview Body: MarkdownViewer (Preview mode) -->
    <div
      v-show="activeTab === 'preview'"
      class="p-4 bg-slate-900/60 min-h-[110px] max-h-[350px] overflow-y-auto"
    >
      <MarkdownViewer
        :content="modelValue"
        :interactive-checklists="false"
        empty-placeholder="Nothing to preview. Switch to Write tab to add content."
      />
    </div>

    <!-- Footer: Tips & Hints -->
    <div class="px-3 py-1.5 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
      <span>Markdown enabled</span>
      <span class="hidden sm:inline">Ctrl+B Bold • Ctrl+I Italic • Ctrl+Enter Submit</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import MarkdownViewer from './MarkdownViewer.vue';

interface Props {
  modelValue?: string;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  maxlength?: number;
}

interface Emits {
  (e: 'update:modelValue', val: string): void;
  (e: 'submit' | 'cancel' | 'blur'): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Write description in Markdown...',
  minRows: 4,
  maxRows: 16,
  maxlength: undefined,
});

const emit = defineEmits<Emits>();

const activeTab = ref<'write' | 'preview'>('write');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
  adjustHeight();
}

function adjustHeight() {
  const textarea = textareaRef.value;
  if (!textarea) return;
  textarea.style.height = 'auto';
  const minHeight = props.minRows * 24;
  const maxHeight = props.maxRows * 24;
  textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)}px`;
}

watch(
  () => props.modelValue,
  () => {
    nextTick(() => {
      adjustHeight();
    });
  },
);

onMounted(() => {
  adjustHeight();
});

function wrapSelection(prefix: string, suffix: string, defaultText: string) {
  const textarea = textareaRef.value;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const currentVal = props.modelValue || '';
  const selectedText = currentVal.substring(start, end);

  const textToWrap = selectedText || defaultText;
  const replacement = `${prefix}${textToWrap}${suffix}`;
  const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);

  emit('update:modelValue', newVal);

  nextTick(() => {
    textarea.focus();
    if (selectedText) {
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    } else {
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + defaultText.length);
    }
    adjustHeight();
  });
}

function insertLinePrefix(prefix: string, defaultText: string) {
  const textarea = textareaRef.value;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const currentVal = props.modelValue || '';
  const selectedText = currentVal.substring(start, end);

  // If start is not at the beginning of a line, prepend a newline
  const needsNewline = start > 0 && currentVal[start - 1] !== '\n';
  const prefixToUse = needsNewline ? `\n${prefix}` : prefix;

  const textToInsert = selectedText || defaultText;
  const replacement = `${prefixToUse}${textToInsert}`;
  const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);

  emit('update:modelValue', newVal);

  nextTick(() => {
    textarea.focus();
    textarea.setSelectionRange(start + prefixToUse.length, start + replacement.length);
    adjustHeight();
  });
}

function insertCode() {
  const textarea = textareaRef.value;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const currentVal = props.modelValue || '';
  const selectedText = currentVal.substring(start, end);

  if (selectedText.includes('\n')) {
    wrapSelection('```\n', '\n```', selectedText || 'code');
  } else if (selectedText) {
    wrapSelection('`', '`', selectedText);
  } else {
    wrapSelection('```\n', '\n```', 'code block');
  }
}

function insertLink() {
  const textarea = textareaRef.value;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const currentVal = props.modelValue || '';
  const selectedText = currentVal.substring(start, end);

  if (selectedText) {
    const replacement = `[${selectedText}](url)`;
    const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    emit('update:modelValue', newVal);

    nextTick(() => {
      textarea.focus();
      // Select the 'url' part
      const urlStart = start + selectedText.length + 3;
      textarea.setSelectionRange(urlStart, urlStart + 3);
      adjustHeight();
    });
  } else {
    const replacement = '[link text](https://example.com)';
    const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    emit('update:modelValue', newVal);

    nextTick(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 1, start + 10);
      adjustHeight();
    });
  }
}

function handleKeydown(event: KeyboardEvent) {
  const isCtrlOrCmd = event.ctrlKey || event.metaKey;

  if (isCtrlOrCmd && event.key.toLowerCase() === 'b') {
    event.preventDefault();
    wrapSelection('**', '**', 'bold text');
  } else if (isCtrlOrCmd && event.key.toLowerCase() === 'i') {
    event.preventDefault();
    wrapSelection('*', '*', 'italic text');
  } else if (isCtrlOrCmd && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    insertLink();
  } else if (isCtrlOrCmd && event.key === 'Enter') {
    event.preventDefault();
    emit('submit');
  } else if (event.key === 'Escape') {
    emit('cancel');
  }
}
</script>
