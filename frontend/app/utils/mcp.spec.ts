import { describe, expect, it } from 'vitest';
import {
  MCP_TOKEN_PLACEHOLDER,
  MCP_TOOLS_CATALOG,
  buildMcpClientSnippet,
  computeExpirationIso,
  getMcpToolsByCategories,
  isApiKeyExpired,
  resolveMcpEndpointUrl,
} from './mcp';

describe('MCP Utilities (MAX-115, MAX-116)', () => {
  describe('resolveMcpEndpointUrl', () => {
    it('appends /mcp cleanly without trailing slashes', () => {
      expect(resolveMcpEndpointUrl('http://localhost:3000/api')).toBe(
        'http://localhost:3000/api/mcp',
      );
      expect(resolveMcpEndpointUrl('http://localhost:3000/api/')).toBe(
        'http://localhost:3000/api/mcp',
      );
    });

    it('resolves relative apiBase against appOrigin when provided', () => {
      expect(resolveMcpEndpointUrl('/api', 'http://localhost:3001')).toBe(
        'http://localhost:3001/api/mcp',
      );
      expect(resolveMcpEndpointUrl('/api/', 'http://localhost:3001/')).toBe(
        'http://localhost:3001/api/mcp',
      );
      expect(resolveMcpEndpointUrl('', 'http://localhost:3001')).toBe(
        'http://localhost:3001/mcp',
      );
    });

    it('handles empty or whitespace apiBase gracefully without appOrigin', () => {
      expect(resolveMcpEndpointUrl('')).toBe('/mcp');
      expect(resolveMcpEndpointUrl('   ')).toBe('/mcp');
    });
  });

  describe('computeExpirationIso', () => {
    const fixedNow = new Date('2026-11-01T12:00:00.000Z');

    it('returns undefined for "never" preset', () => {
      expect(computeExpirationIso('never', fixedNow)).toBeUndefined();
    });

    it('computes correct dates for day presets', () => {
      const exp7d = computeExpirationIso('7d', fixedNow);
      expect(exp7d).toBe('2026-11-08T12:00:00.000Z');

      const exp30d = computeExpirationIso('30d', fixedNow);
      expect(exp30d).toBe('2026-12-01T12:00:00.000Z');

      const exp90d = computeExpirationIso('90d', fixedNow);
      expect(exp90d).toBe('2027-01-30T12:00:00.000Z');

      const exp365d = computeExpirationIso('365d', fixedNow);
      expect(exp365d).toBe('2027-11-01T12:00:00.000Z');
    });
  });

  describe('isApiKeyExpired', () => {
    const now = new Date('2026-11-05T10:00:00.000Z');

    it('returns false when expiresAt is null or undefined', () => {
      expect(isApiKeyExpired(null, now)).toBe(false);
      expect(isApiKeyExpired(undefined, now)).toBe(false);
    });

    it('returns true when expiresAt is in the past', () => {
      expect(isApiKeyExpired('2026-11-01T10:00:00.000Z', now)).toBe(true);
      expect(isApiKeyExpired('2026-11-05T10:00:00.000Z', now)).toBe(true);
    });

    it('returns false when expiresAt is in the future', () => {
      expect(isApiKeyExpired('2026-11-10T10:00:00.000Z', now)).toBe(false);
    });
  });

  describe('buildMcpClientSnippet', () => {
    const endpoint = 'http://localhost:3000/api/mcp';

    it('uses placeholder token and local stdio bridge for Claude Desktop', () => {
      const claude = buildMcpClientSnippet('claude', endpoint);
      expect(claude.title).toBe('Claude Desktop');
      expect(claude.configPath).toBe('claude_desktop_config.json');
      expect(claude.description).toContain('mcp-remote');
      expect(claude.description).toContain(`Replace ${MCP_TOKEN_PLACEHOLDER}`);
      expect(claude.json).toContain(MCP_TOKEN_PLACEHOLDER);
      expect(claude.json).toContain('mcp-remote');
      expect(claude.json).toContain(endpoint);
    });

    it('reveals real token when revealSecret is true', () => {
      const rawSecret = 'mxw_live_0123456789abcdef0123456789abcdef';
      const cursor = buildMcpClientSnippet('cursor', endpoint, rawSecret, true);
      expect(cursor.title).toBe('Cursor IDE');
      expect(cursor.configPath).toBe('.cursor/mcp.json');
      expect(cursor.json).toContain(rawSecret);
      expect(cursor.description).not.toContain('Replace');
    });

    it('uses explicit placeholder instead of truncated secret when revealSecret is false', () => {
      const rawSecret = 'mxw_live_0123456789abcdef0123456789abcdef';
      const antigravity = buildMcpClientSnippet(
        'antigravity',
        endpoint,
        rawSecret,
        false,
      );
      expect(antigravity.title).toBe('Google Antigravity');
      expect(antigravity.configPath).toBe('mcp_config.json');
      expect(antigravity.json).toContain(MCP_TOKEN_PLACEHOLDER);
      expect(antigravity.json).not.toContain(rawSecret);
      expect(antigravity.json).not.toContain('...');
      expect(antigravity.description).toContain(`Replace ${MCP_TOKEN_PLACEHOLDER}`);
    });
  });

  describe('MCP Tools Catalog', () => {
    it('contains exactly 14 tools', () => {
      expect(MCP_TOOLS_CATALOG).toHaveLength(14);
    });

    it('groups tools into Tasks (6), Hierarchy (5), Context & Activity (3)', () => {
      const groups = getMcpToolsByCategories();
      expect(groups).toHaveLength(3);

      const tasksGroup = groups.find((g) => g.category === 'Tasks');
      const hierarchyGroup = groups.find((g) => g.category === 'Hierarchy');
      const contextGroup = groups.find(
        (g) => g.category === 'Context & Activity',
      );

      expect(tasksGroup?.count).toBe(6);
      expect(hierarchyGroup?.count).toBe(5);
      expect(contextGroup?.count).toBe(3);
    });
  });
});
