<template>
  <!-- eslint-disable vue/no-v-html -->
  <div
    v-if="renderedHtml"
    ref="viewerRef"
    class="markdown-viewer leading-relaxed"
    :class="compact ? 'markdown-compact text-xs text-slate-400' : 'text-sm text-slate-200 overflow-x-auto'"
    @click="handleClick"
    v-html="renderedHtml"
  />
  <div v-else-if="!compact" class="text-sm text-slate-500 italic">
    {{ emptyPlaceholder }}
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { renderMarkdown, toggleTaskListItem } from '../../utils/markdown';

interface Props {
  content?: string | null;
  interactiveChecklists?: boolean;
  emptyPlaceholder?: string;
  compact?: boolean;
}

interface Emits {
  (e: 'update:content', val: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  interactiveChecklists: true,
  emptyPlaceholder: 'No description provided',
  compact: false,
});

const emit = defineEmits<Emits>();

const viewerRef = ref<HTMLElement | null>(null);

const renderedHtml = computed(() => {
  return renderMarkdown(props.content);
});

function handleClick(event: MouseEvent) {
  if (!props.interactiveChecklists || !viewerRef.value || !props.content) return;

  const target = event.target as HTMLElement | null;
  if (!target) return;

  // Check if click was on or directly adjacent to a task list checkbox
  const checkbox = target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox'
    ? (target as HTMLInputElement)
    : target.querySelector('input[type="checkbox"]') as HTMLInputElement | null;

  if (checkbox) {
    const allCheckboxes = Array.from(viewerRef.value.querySelectorAll('input[type="checkbox"]'));
    const index = allCheckboxes.indexOf(checkbox);
    if (index !== -1) {
      event.preventDefault();
      event.stopPropagation();
      const updatedMarkdown = toggleTaskListItem(props.content, index);
      emit('update:content', updatedMarkdown);
    }
  }
}
</script>

<style scoped>
.markdown-viewer :deep(h1) {
  font-size: 1.35rem;
  font-weight: 700;
  color: #ffffff;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.markdown-viewer :deep(h2) {
  font-size: 1.2rem;
  font-weight: 700;
  color: #ffffff;
  margin-top: 0.875rem;
  margin-bottom: 0.375rem;
}

.markdown-viewer :deep(h3) {
  font-size: 1.05rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
}

.markdown-viewer :deep(h4),
.markdown-viewer :deep(h5),
.markdown-viewer :deep(h6) {
  font-size: 0.925rem;
  font-weight: 600;
  color: #e2e8f0;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
}

.markdown-viewer :deep(p) {
  margin-top: 0.35rem;
  margin-bottom: 0.35rem;
}

.markdown-viewer :deep(p:first-child) {
  margin-top: 0;
}

.markdown-viewer :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-viewer :deep(ul) {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin-top: 0.35rem;
  margin-bottom: 0.35rem;
}

.markdown-viewer :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.25rem;
  margin-top: 0.35rem;
  margin-bottom: 0.35rem;
}

.markdown-viewer :deep(li) {
  margin-top: 0.15rem;
  margin-bottom: 0.15rem;
}

/* GFM Task Lists */
.markdown-viewer :deep(ul:has(input[type="checkbox"])),
.markdown-viewer :deep(li:has(input[type="checkbox"])) {
  list-style-type: none;
  padding-left: 0;
}

.markdown-viewer :deep(input[type="checkbox"]) {
  margin-right: 0.5rem;
  cursor: pointer;
  accent-color: #6366f1;
  width: 0.95rem;
  height: 0.95rem;
  vertical-align: -0.1rem;
}

.markdown-viewer :deep(blockquote) {
  border-left: 3px solid #6366f1;
  background-color: rgba(99, 102, 241, 0.08);
  padding: 0.5rem 0.75rem;
  border-radius: 0 0.5rem 0.5rem 0;
  font-style: italic;
  color: #cbd5e1;
  margin: 0.5rem 0;
}

.markdown-viewer :deep(pre) {
  background-color: #020617;
  border: 1px solid #1e293b;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  color: #a5b4fc;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.markdown-viewer :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  background-color: rgba(30, 41, 59, 0.7);
  color: #c7d2fe;
  padding: 0.15rem 0.35rem;
  border-radius: 0.375rem;
  border: 1px solid rgba(51, 65, 85, 0.6);
}

.markdown-viewer :deep(pre code) {
  background-color: transparent;
  color: inherit;
  padding: 0;
  border: none;
}

.markdown-viewer :deep(a) {
  color: #818cf8;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color 0.15s ease;
}

.markdown-viewer :deep(a:hover) {
  color: #a5b4fc;
}

.markdown-viewer :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.625rem 0;
  font-size: 0.8rem;
}

.markdown-viewer :deep(th),
.markdown-viewer :deep(td) {
  border: 1px solid #334155;
  padding: 0.4rem 0.65rem;
  text-align: left;
}

.markdown-viewer :deep(th) {
  background-color: #1e293b;
  color: #f8fafc;
  font-weight: 600;
}

.markdown-viewer :deep(hr) {
  border-color: #334155;
  margin: 0.75rem 0;
}

/* Compact mode (for task cards and preview snippets) */
.markdown-viewer.markdown-compact :deep(h1),
.markdown-viewer.markdown-compact :deep(h2),
.markdown-viewer.markdown-compact :deep(h3),
.markdown-viewer.markdown-compact :deep(h4),
.markdown-viewer.markdown-compact :deep(h5),
.markdown-viewer.markdown-compact :deep(h6) {
  font-size: 0.75rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
  display: inline;
  margin-right: 0.35rem;
}

.markdown-viewer.markdown-compact :deep(p) {
  margin: 0;
  display: inline;
  margin-right: 0.35rem;
}

.markdown-viewer.markdown-compact :deep(ul),
.markdown-viewer.markdown-compact :deep(ol) {
  list-style: none;
  padding: 0;
  margin: 0;
  display: inline;
}

.markdown-viewer.markdown-compact :deep(li) {
  display: inline;
  margin: 0;
  margin-right: 0.35rem;
}

.markdown-viewer.markdown-compact :deep(li)::before {
  content: "• ";
  color: #64748b;
}

.markdown-viewer.markdown-compact :deep(li:has(input[type="checkbox"]))::before {
  content: "";
}

.markdown-viewer.markdown-compact :deep(input[type="checkbox"]) {
  width: 0.75rem;
  height: 0.75rem;
  margin-right: 0.25rem;
  pointer-events: none;
}

.markdown-viewer.markdown-compact :deep(blockquote) {
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  display: inline;
  font-style: italic;
  margin-right: 0.35rem;
}

.markdown-viewer.markdown-compact :deep(pre) {
  border: none;
  background: rgba(15, 23, 42, 0.6);
  padding: 0.05rem 0.25rem;
  margin: 0;
  display: inline;
  border-radius: 0.25rem;
}

.markdown-viewer.markdown-compact :deep(code) {
  font-size: 0.7rem;
  padding: 0.05rem 0.25rem;
}

.markdown-viewer.markdown-compact :deep(a) {
  color: inherit;
  text-decoration: underline;
  pointer-events: none;
}

.markdown-viewer.markdown-compact :deep(table) {
  display: inline;
  margin: 0;
}
</style>
