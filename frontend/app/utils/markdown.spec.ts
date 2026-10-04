import { describe, it, expect } from 'vitest';
import { renderMarkdown, toggleTaskListItem } from './markdown';

describe('markdown utility', () => {
  describe('renderMarkdown', () => {
    it('returns empty string for null, undefined, or whitespace-only input', () => {
      expect(renderMarkdown(null)).toBe('');
      expect(renderMarkdown(undefined)).toBe('');
      expect(renderMarkdown('')).toBe('');
      expect(renderMarkdown('   \n  ')).toBe('');
    });

    it('renders basic formatting (bold, italic, strikethrough, headings)', () => {
      const input = '# Heading 1\n**bold** and *italic* and ~~strike~~';
      const html = renderMarkdown(input);

      expect(html).toContain('<h1>Heading 1</h1>');
      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<em>italic</em>');
      expect(html).toContain('<del>strike</del>');
    });

    it('renders code blocks and inline code', () => {
      const input = '`inline code`\n\n```typescript\nconst x = 10;\n```';
      const html = renderMarkdown(input);

      expect(html).toContain('<code>inline code</code>');
      expect(html).toContain('<pre><code class="language-typescript">const x = 10;\n</code></pre>');
    });

    it('renders blockquotes and lists', () => {
      const input = '> Important notice\n\n- Item 1\n- Item 2';
      const html = renderMarkdown(input);

      expect(html).toContain('<blockquote>');
      expect(html).toContain('Important notice');
      expect(html).toContain('<ul>');
      expect(html).toContain('<li>Item 1</li>');
      expect(html).toContain('<li>Item 2</li>');
    });

    it('renders task list items with checkbox inputs', () => {
      const input = '- [ ] Todo item\n- [x] Done item';
      const html = renderMarkdown(input);

      expect(html).toContain('type="checkbox"');
      expect(html).toContain('Todo item');
      expect(html).toContain('Done item');
    });

    it('renders tables properly', () => {
      const input = '| Col 1 | Col 2 |\n| --- | --- |\n| Val 1 | Val 2 |';
      const html = renderMarkdown(input);

      expect(html).toContain('<table>');
      expect(html).toContain('<th>Col 1</th>');
      expect(html).toContain('<td>Val 1</td>');
    });

    it('sanitizes malicious script tags and inline event handlers', () => {
      const malicious = '<script>alert("xss")</script>Hello <img src=x onerror=alert(1)>';
      const html = renderMarkdown(malicious);

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('alert("xss")');
      expect(html).not.toContain('onerror=');
      expect(html).toContain('Hello');
    });

    it('neutralizes javascript: URLs in links', () => {
      const malicious = '[Click me](javascript:alert("xss"))';
      const html = renderMarkdown(malicious);

      expect(html).not.toContain('href="javascript:');
    });

    it('handles nested lists and complex markdown structures', () => {
      const md = `
1. First
   - Nested bullet
   - Another bullet
2. Second
`;
      const html = renderMarkdown(md);
      expect(html).toContain('<ol>');
      expect(html).toContain('<ul>');
      expect(html).toContain('Nested bullet');
    });

    it('escapes and sanitizes nested tags inside blockquotes and tables', () => {
      const md = `
> Quote with <script>danger()</script> and **bold**

| Name | Action |
| --- | --- |
| Safe | <img src="x" onerror="evil()"> |
`;
      const html = renderMarkdown(md);
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('onerror=');
      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('Safe');
    });
  });

  describe('toggleTaskListItem', () => {
    it('toggles an unchecked task to checked at given index', () => {
      const md = '- [ ] First task\n- [ ] Second task';
      const toggled = toggleTaskListItem(md, 0);

      expect(toggled).toBe('- [x] First task\n- [ ] Second task');
    });

    it('toggles a checked task to unchecked at given index', () => {
      const md = '- [x] First task\n- [x] Second task';
      const toggled = toggleTaskListItem(md, 1);

      expect(toggled).toBe('- [x] First task\n- [ ] Second task');
    });

    it('handles uppercase [X] toggling to unchecked [ ]', () => {
      const md = '- [X] Uppercase checked item';
      const toggled = toggleTaskListItem(md, 0);

      expect(toggled).toBe('- [ ] Uppercase checked item');
    });

    it('handles mixed asterisks and dashes with indentation', () => {
      const md = '  * [ ] Nested item\n  + [x] Plus item';
      const toggled = toggleTaskListItem(md, 0);

      expect(toggled).toBe('  * [x] Nested item\n  + [x] Plus item');
    });

    it('does not alter regular bracketed text like [Link] or array [0]', () => {
      const md = 'Check out [this link](https://example.com) and array[0]\n- [ ] Real task item';
      const toggled = toggleTaskListItem(md, 0);

      expect(toggled).toBe('Check out [this link](https://example.com) and array[0]\n- [x] Real task item');
    });

    it('does not alter markdown if index is out of bounds', () => {
      const md = '- [ ] Task 1';
      const toggled = toggleTaskListItem(md, 5);

      expect(toggled).toBe('- [ ] Task 1');
    });

    it('correctly toggles the targeted item when multiple exist', () => {
      const md = '- [ ] Item 0\n- [ ] Item 1\n- [ ] Item 2';
      const toggled1 = toggleTaskListItem(md, 1);
      expect(toggled1).toBe('- [ ] Item 0\n- [x] Item 1\n- [ ] Item 2');

      const toggled2 = toggleTaskListItem(toggled1, 2);
      expect(toggled2).toBe('- [ ] Item 0\n- [x] Item 1\n- [x] Item 2');

      const toggled0 = toggleTaskListItem(toggled2, 0);
      expect(toggled0).toBe('- [x] Item 0\n- [x] Item 1\n- [x] Item 2');
    });
  });
});
