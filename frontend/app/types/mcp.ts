export interface ApiKeyItem {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyPayload {
  name: string;
  expiresAt?: string;
}

export interface CreateApiKeyResponse extends ApiKeyItem {
  secret: string;
}

export type McpExpirationPreset = 'never' | '7d' | '30d' | '90d' | '365d';

export type McpClientTab = 'claude' | 'cursor' | 'antigravity';

export type McpToolCategory = 'Tasks' | 'Hierarchy' | 'Context & Activity';

export interface McpToolCatalogItem {
  name: string;
  category: McpToolCategory;
  description: string;
  badge: 'Read-only' | 'Write' | 'Destructive';
  badgeColor: string;
}

export interface McpToolCategoryGroup {
  category: McpToolCategory;
  count: number;
  tools: McpToolCatalogItem[];
}
