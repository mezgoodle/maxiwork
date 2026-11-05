<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
      <div>
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/dashboard"
            class="text-xs text-slate-400 hover:text-slate-200 transition"
          >
            ← Back to Dashboard
          </NuxtLink>
        </div>
        <h1 class="text-2xl font-bold text-white mt-1 flex items-center gap-2.5">
          <span class="text-2xl">🔌</span> Model Context Protocol (MCP) Settings
        </h1>
        <p class="text-sm text-slate-400 mt-1 max-w-2xl">
          Connect MaxiWork to external AI agents like Claude Desktop, Cursor, and Google Antigravity using personal API keys.
        </p>
      </div>

      <!-- Quick Status Badge -->
      <div class="flex items-center gap-3">
        <div class="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center gap-2 text-xs">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span class="text-slate-300 font-medium">MCP Endpoint Online</span>
        </div>
      </div>
    </div>

    <!-- Endpoint URL Banner -->
    <div class="bg-slate-850 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60">
      <div class="space-y-1">
        <div class="text-xs font-semibold uppercase tracking-wider text-indigo-400">
          MaxiWork MCP Endpoint URL
        </div>
        <div class="font-mono text-sm text-slate-200 select-all break-all">
          {{ mcpEndpointUrl }}
        </div>
        <div class="text-xs text-slate-400">
          Supports Streamable HTTP (<code class="text-slate-300">POST /api/mcp</code>) and SSE (<code class="text-slate-300">GET /api/mcp</code>).
        </div>
      </div>
      <button
        type="button"
        class="shrink-0 px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white transition flex items-center gap-2 cursor-pointer border border-slate-700"
        @click="copyToClipboard(mcpEndpointUrl, 'MCP Endpoint URL copied to clipboard')"
      >
        <span>📋</span>
        <span>Copy URL</span>
      </button>
    </div>

    <!-- Active Secret Alert (Only shown immediately upon creation) -->
    <div
      v-if="createdSecret"
      class="bg-emerald-950/40 border border-emerald-600/50 rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in duration-300"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">🔑</span>
          <div>
            <h3 class="text-base font-semibold text-emerald-300">
              New API Key Generated Successfully
            </h3>
            <p class="text-xs text-emerald-400/80 mt-0.5">
              Copy this token now. For security reasons, it will never be displayed again.
            </p>
          </div>
        </div>
        <button
          type="button"
          class="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
          @click="dismissSecretBanner"
        >
          ✕ Dismiss
        </button>
      </div>

      <div class="relative flex items-center">
        <input
          :type="revealSecret ? 'text' : 'password'"
          readonly
          :value="createdSecret"
          class="w-full bg-slate-950 border border-emerald-700/60 rounded-xl px-4 py-3 font-mono text-sm text-emerald-200 select-all pr-32 focus:outline-none"
        >
        <div class="absolute right-2 flex items-center gap-1.5">
          <button
            type="button"
            class="px-2.5 py-1 text-xs rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            @click="revealSecret = !revealSecret"
          >
            {{ revealSecret ? 'Hide' : 'Reveal' }}
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer shadow-sm flex items-center gap-1.5"
            @click="copyToClipboard(createdSecret, 'API Key copied to clipboard')"
          >
            <span>📋</span>
            <span>Copy</span>
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2 text-xs text-emerald-400/90">
        <span>💡</span>
        <span>This token has also been populated into the client configuration snippets below.</span>
      </div>
    </div>

    <!-- Create API Key & Tokens Table Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <!-- Create Token Form -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 lg:col-span-1">
        <div>
          <h2 class="text-base font-semibold text-white">
            Create API Key
          </h2>
          <p class="text-xs text-slate-400 mt-1">
            Generate an authentication token for external MCP tools or agents.
          </p>
        </div>

        <form class="space-y-4" @submit.prevent="handleCreateApiKey">
          <!-- Token Name -->
          <div>
            <label for="tokenName" class="block text-xs font-medium text-slate-300 mb-1.5">
              Key Name <span class="text-rose-400">*</span>
            </label>
            <input
              id="tokenName"
              v-model="newKeyName"
              type="text"
              placeholder="e.g. Claude Desktop, Cursor Work laptop"
              required
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            >

            <!-- Quick fill suggestions -->
            <div class="flex flex-wrap gap-1.5 mt-2">
              <button
                v-for="suggestion in nameSuggestions"
                :key="suggestion"
                type="button"
                class="px-2 py-0.5 rounded-md text-[11px] bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                @click="newKeyName = suggestion"
              >
                {{ suggestion }}
              </button>
            </div>
          </div>

          <!-- Expiration Preset -->
          <div>
            <label for="expirationPreset" class="block text-xs font-medium text-slate-300 mb-1.5">
              Expiration
            </label>
            <select
              id="expirationPreset"
              v-model="selectedExpiration"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="never">
                Never expires
              </option>
              <option value="7d">
                7 days
              </option>
              <option value="30d">
                30 days (Recommended)
              </option>
              <option value="90d">
                90 days
              </option>
              <option value="365d">
                1 year
              </option>
            </select>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isSubmitting || !newKeyName.trim()"
            class="w-full py-2.5 px-4 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm transition flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span v-if="isSubmitting" class="animate-spin text-xs">⏳</span>
            <span>Generate Token</span>
          </button>
        </form>
      </div>

      <!-- Existing Tokens Table -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 lg:col-span-2">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-white">
              Active API Keys
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">
              Revoking an API key will immediately deny its access to the MCP server.
            </p>
          </div>
          <button
            type="button"
            title="Refresh list"
            class="p-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            @click="fetchApiKeys"
          >
            🔄 Refresh
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="isLoadingKeys" class="py-12 text-center text-sm text-slate-500">
          Loading API keys...
        </div>

        <!-- Empty State -->
        <div v-else-if="apiKeys.length === 0" class="py-12 text-center text-sm text-slate-500 border border-dashed border-slate-800 rounded-xl">
          <p class="text-base mb-1">
            🔒 No API Keys Yet
          </p>
          <p class="text-xs text-slate-400">
            Generate your first token using the form on the left to connect external agents.
          </p>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-slate-800 text-slate-400 uppercase font-medium text-[11px] tracking-wider">
                <th class="py-3 px-3">
                  Name
                </th>
                <th class="py-3 px-3">
                  Key Prefix
                </th>
                <th class="py-3 px-3">
                  Status
                </th>
                <th class="py-3 px-3">
                  Last Used
                </th>
                <th class="py-3 px-3">
                  Created
                </th>
                <th class="py-3 px-3 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              <tr v-for="key in apiKeys" :key="key.id" class="hover:bg-slate-800/30 transition">
                <td class="py-3 px-3 font-medium text-white max-w-[140px] truncate" :title="key.name">
                  {{ key.name }}
                </td>
                <td class="py-3 px-3 font-mono text-slate-300">
                  {{ key.keyPrefix }}...
                </td>
                <td class="py-3 px-3">
                  <span
                    v-if="isApiKeyExpired(key.expiresAt)"
                    class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  >
                    Expired
                  </span>
                  <span
                    v-else
                    class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  >
                    Active
                  </span>
                </td>
                <td class="py-3 px-3 text-slate-400">
                  {{ key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never' }}
                </td>
                <td class="py-3 px-3 text-slate-400">
                  {{ formatDate(key.createdAt) }}
                </td>
                <td class="py-3 px-3 text-right">
                  <button
                    type="button"
                    class="px-2.5 py-1 text-xs font-medium text-rose-400 hover:text-white hover:bg-rose-600/30 rounded-lg transition cursor-pointer"
                    @click="promptRevokeKey(key)"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Client Connection Guides (Tabs) -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 class="text-base font-semibold text-white">
            Client Connection Guide
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">
            Copy-paste configurations directly into your preferred MCP-enabled client.
          </p>
        </div>

        <!-- Token reveal toggle inside snippets -->
        <div v-if="createdSecret" class="flex items-center gap-2 text-xs">
          <span class="text-slate-400">Include new token in snippet:</span>
          <button
            type="button"
            class="px-2.5 py-1 rounded-lg border text-xs font-medium transition cursor-pointer"
            :class="snippetRevealToken ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'"
            @click="snippetRevealToken = !snippetRevealToken"
          >
            {{ snippetRevealToken ? '✓ Active Token' : 'Masked Token' }}
          </button>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="flex border-b border-slate-800 gap-2">
        <button
          v-for="tab in clientTabs"
          :key="tab.id"
          type="button"
          class="px-4 py-2.5 text-xs font-semibold rounded-t-xl transition cursor-pointer border-b-2"
          :class="activeTab === tab.id ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Active Tab Panel -->
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <h3 class="text-sm font-semibold text-white">
              {{ currentSnippet.title }}
            </h3>
            <p class="text-xs text-slate-400">
              {{ currentSnippet.description }}
            </p>
            <div class="flex items-center gap-2 pt-1">
              <span class="text-[11px] text-slate-500">Config file location:</span>
              <code class="text-xs font-mono bg-slate-950 px-2 py-0.5 rounded text-indigo-300 border border-slate-800">
                {{ currentSnippet.configPath }}
              </code>
            </div>
          </div>

          <button
            type="button"
            class="px-3.5 py-1.5 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition flex items-center gap-1.5 cursor-pointer border border-slate-700 shrink-0"
            @click="copyToClipboard(currentSnippet.json, `${currentSnippet.title} configuration copied to clipboard`)"
          >
            <span>📋</span>
            <span>Copy Snippet</span>
          </button>
        </div>

        <!-- Code Block -->
        <div class="relative">
          <pre class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed"><code>{{ currentSnippet.json }}</code></pre>
        </div>
      </div>
    </div>

    <!-- Available MCP Tools Catalog Reference -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      <div>
        <h2 class="text-base font-semibold text-white flex items-center gap-2">
          <span>🛠️</span> Available MCP Tools (14)
        </h2>
        <p class="text-xs text-slate-400 mt-1">
          These tools are automatically available to any connected AI agent via MaxiWork's embedded MCP server.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="group in toolGroups"
          :key="group.category"
          class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3"
        >
          <div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span class="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {{ group.category }}
            </span>
            <span class="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {{ group.count }}
            </span>
          </div>

          <div class="space-y-2.5">
            <div
              v-for="tool in group.tools"
              :key="tool.name"
              class="space-y-1 p-2 rounded-lg hover:bg-slate-900/60 transition"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-xs text-indigo-300 font-semibold truncate">
                  {{ tool.name }}
                </span>
                <span
                  class="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded shrink-0"
                  :class="
                    tool.badge === 'Read-only'
                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      : tool.badge === 'Destructive'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  "
                >
                  {{ tool.badge }}
                </span>
              </div>
              <p class="text-[11px] text-slate-400 leading-snug">
                {{ tool.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Explicit Confirmation Dialog for Token Revocation -->
    <ConfirmDialog
      :is-open="isRevokeDialogOpen"
      title="Revoke API Key"
      :message="`Are you sure you want to revoke '${keyToRevoke?.name}'? External clients or agents using this token will be denied access immediately.`"
      confirm-text="Revoke Key"
      cancel-text="Keep Key"
      :is-destructive="true"
      :loading="isRevoking"
      @confirm="handleConfirmRevoke"
      @cancel="isRevokeDialogOpen = false"
      @close="isRevokeDialogOpen = false"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import type {
  ApiKeyItem,
  CreateApiKeyPayload,
  CreateApiKeyResponse,
  McpClientTab,
  McpExpirationPreset,
} from '../../types/mcp';
import {
  buildMcpClientSnippet,
  computeExpirationIso,
  getMcpToolsByCategories,
  isApiKeyExpired,
  resolveMcpEndpointUrl,
} from '../../utils/mcp';
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue';
import { useApi } from '../../composables/useApi';
import { useToast } from '../../composables/useToast';

definePageMeta({
  middleware: 'auth',
});

const config = useRuntimeConfig();
const { apiFetch } = useApi();
const toast = useToast();

// State
const apiKeys = ref<ApiKeyItem[]>([]);
const isLoadingKeys = ref(false);
const isSubmitting = ref(false);
const newKeyName = ref('');
const selectedExpiration = ref<McpExpirationPreset>('never');
const createdSecret = ref<string | null>(null);
const revealSecret = ref(false);
const snippetRevealToken = ref(true);
const activeTab = ref<McpClientTab>('claude');

// Revocation modal state
const isRevokeDialogOpen = ref(false);
const isRevoking = ref(false);
const keyToRevoke = ref<ApiKeyItem | null>(null);

// Static data
const nameSuggestions = ['Claude Desktop', 'Cursor IDE', 'Google Antigravity', 'CI/CD Automation'];
const clientTabs: Array<{ id: McpClientTab; label: string }> = [
  { id: 'claude', label: 'Claude Desktop' },
  { id: 'cursor', label: 'Cursor IDE' },
  { id: 'antigravity', label: 'Google Antigravity' },
];

const toolGroups = getMcpToolsByCategories();

const mcpEndpointUrl = computed(() => {
  return resolveMcpEndpointUrl(config.public?.apiBase || 'http://localhost:3000/api');
});

const currentSnippet = computed(() => {
  return buildMcpClientSnippet(
    activeTab.value,
    mcpEndpointUrl.value,
    createdSecret.value,
    snippetRevealToken.value,
  );
});

async function fetchApiKeys() {
  isLoadingKeys.value = true;
  try {
    const data = await apiFetch<ApiKeyItem[]>('/user/api-keys');
    apiKeys.value = Array.isArray(data) ? data : [];
  } catch {
    toast.error('Failed to load API keys');
  } finally {
    isLoadingKeys.value = false;
  }
}

async function handleCreateApiKey() {
  const trimmed = newKeyName.value.trim();
  if (!trimmed) return;

  isSubmitting.value = true;
  try {
    const payload: CreateApiKeyPayload = {
      name: trimmed,
      expiresAt: computeExpirationIso(selectedExpiration.value),
    };

    const res = await apiFetch<CreateApiKeyResponse>('/user/api-keys', {
      method: 'POST',
      body: payload,
    });

    if (res?.secret) {
      createdSecret.value = res.secret;
      revealSecret.value = false;
      snippetRevealToken.value = true;
      toast.success('API key generated successfully');
    }

    newKeyName.value = '';
    selectedExpiration.value = 'never';
    await fetchApiKeys();
  } catch {
    toast.error('Failed to create API key');
  } finally {
    isSubmitting.value = false;
  }
}

function promptRevokeKey(key: ApiKeyItem) {
  keyToRevoke.value = key;
  isRevokeDialogOpen.value = true;
}

async function handleConfirmRevoke() {
  if (!keyToRevoke.value) return;

  isRevoking.value = true;
  try {
    await apiFetch(`/user/api-keys/${keyToRevoke.value.id}`, {
      method: 'DELETE',
    });
    toast.success(`API key '${keyToRevoke.value.name}' revoked`);
    isRevokeDialogOpen.value = false;
    keyToRevoke.value = null;
    await fetchApiKeys();
  } catch {
    toast.error('Failed to revoke API key');
  } finally {
    isRevoking.value = false;
  }
}

function dismissSecretBanner() {
  createdSecret.value = null;
}

async function copyToClipboard(text: string, message = 'Copied to clipboard') {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } else {
      toast.info(text);
    }
  } catch {
    toast.error('Failed to copy to clipboard');
  }
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

onMounted(() => {
  fetchApiKeys();
});
</script>
