import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked with GitHub Flavored Markdown (GFM) and line breaks
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Configure DOMPurify hook to ensure external links open in a new tab safely.
 */
let isHookInitialized = false;

function ensureDomPurifyHooks() {
  if (isHookInitialized || typeof window === 'undefined') return;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  isHookInitialized = true;
}

/**
 * Basic server-side tag sanitizer fallback when running outside browser environment.
 */
function basicServerSanitize(html: string): string {
  // Strip dangerous script, iframe, and inline event handlers on server side
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
}

/**
 * Renders raw Markdown text into safe, sanitized HTML.
 */
export function renderMarkdown(content?: string | null): string {
  if (!content || !content.trim()) {
    return '';
  }

  // Parse Markdown synchronously with marked
  const rawHtml = marked.parse(content, { async: false }) as string;

  // Sanitize HTML with DOMPurify if in browser environment
  if (typeof window !== 'undefined' && typeof DOMPurify?.sanitize === 'function') {
    ensureDomPurifyHooks();
    return DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target', 'rel'],
    });
  }

  // Server-side fallback
  return basicServerSanitize(rawHtml);
}

/**
 * Regular expression to match GFM task list items:
 * e.g., "- [ ] item" or "* [x] completed"
 */
const TASK_LIST_REGEX = /^([ \t]*[-*+]\s+)\[([ xX])\](\s+.*)$/gm;

/**
 * Toggles a checklist item at the specified occurrence index (0-based)
 * between unchecked `[ ]` and checked `[x]`.
 */
export function toggleTaskListItem(markdown: string, itemIndex: number): string {
  let currentIndex = 0;

  return markdown.replace(TASK_LIST_REGEX, (match, prefix: string, checkState: string, suffix: string) => {
    if (currentIndex === itemIndex) {
      const isChecked = checkState.toLowerCase() === 'x';
      const newCheckState = isChecked ? ' ' : 'x';
      currentIndex++;
      return `${prefix}[${newCheckState}]${suffix}`;
    }
    currentIndex++;
    return match;
  });
}
