<template>
  <aside
    class="bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 z-30 select-none h-full"
    :class="store.isSidebarCollapsed ? 'w-16' : 'w-64'"
  >
    <!-- Top: Workspace Selector Header -->
    <div class="p-3 border-b border-slate-800 flex items-center justify-between relative">
      <div v-if="!store.isSidebarCollapsed" class="flex-1 min-w-0 pr-2">
        <button
          type="button"
          class="w-full flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-800/80 transition text-left cursor-pointer"
          @click="isWorkspaceMenuOpen = !isWorkspaceMenuOpen"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              class="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm"
            >
              {{ store.currentWorkspace?.name ? store.currentWorkspace.name.substring(0, 2).toUpperCase() : 'MW' }}
            </div>
            <span class="text-sm font-semibold text-white truncate">
              {{ store.currentWorkspace?.name || 'Select Workspace' }}
            </span>
          </div>
          <span class="text-xs text-slate-400">▼</span>
        </button>

        <!-- Workspace Dropdown Menu -->
        <div
          v-if="isWorkspaceMenuOpen"
          class="absolute top-14 left-3 right-3 bg-slate-850 border border-slate-700/80 rounded-xl shadow-2xl p-2 z-50 bg-slate-900"
        >
          <div class="text-xs font-medium text-slate-400 px-2 py-1 uppercase tracking-wider">
            Workspaces
          </div>
          <div class="max-h-48 overflow-y-auto space-y-1 my-1">
            <button
              v-for="ws in store.workspaces"
              :key="ws._id"
              type="button"
              class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition text-left cursor-pointer"
              :class="store.currentWorkspace?._id === ws._id ? 'bg-indigo-600/20 text-indigo-300 font-medium' : 'text-slate-300 hover:bg-slate-800 hover:text-white'"
              @click="handleSelectWorkspace(ws._id)"
            >
              <span class="truncate">{{ ws.name }}</span>
              <span v-if="store.currentWorkspace?._id === ws._id" class="text-indigo-400">✓</span>
            </button>
          </div>
          <div class="pt-1.5 border-t border-slate-800 mt-1">
            <button
              type="button"
              class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer"
              @click="openCreateWorkspace"
            >
              <span>+</span>
              <span>Create Workspace</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Icon-only Workspace indicator when collapsed -->
      <div v-else class="mx-auto py-1">
        <button
          type="button"
          title="Switch Workspace"
          class="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm hover:opacity-90 cursor-pointer"
          @click="store.toggleSidebar"
        >
          {{ store.currentWorkspace?.name ? store.currentWorkspace.name.substring(0, 1).toUpperCase() : 'M' }}
        </button>
      </div>
    </div>

    <!-- Middle: Hierarchy Tree (Spaces -> Folders -> Lists) -->
    <div class="flex-1 overflow-y-auto px-2 py-3 space-y-2">
      <!-- Collapsed view: icon rail -->
      <div v-if="store.isSidebarCollapsed" class="flex flex-col items-center space-y-3">
        <div
          v-for="space in store.tree"
          :key="space.id"
          class="w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer hover:ring-2 hover:ring-indigo-400 transition"
          :style="{ backgroundColor: `${space.color}20`, color: space.color }"
          :title="space.name"
          @click="store.toggleSidebar"
        >
          {{ iconSymbols[space.icon] || '📁' }}
        </div>
        <button
          type="button"
          title="Add Space"
          class="w-8 h-8 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 flex items-center justify-center text-sm transition cursor-pointer"
          @click="openCreateSpace"
        >
          +
        </button>
      </div>

      <!-- Expanded view: Full navigation tree -->
      <div v-else class="space-y-1">
        <div class="flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span>Spaces</span>
          <button
            type="button"
            class="text-slate-400 hover:text-white p-0.5 rounded transition cursor-pointer"
            title="Create Space"
            @click="openCreateSpace"
          >
            +
          </button>
        </div>

        <div v-if="store.tree.length === 0" class="text-xs text-slate-500 px-3 py-2 italic">
          No spaces yet. Click + to add one.
        </div>

        <!-- Space Item -->
        <div v-for="space in store.tree" :key="space.id" class="rounded-xl overflow-hidden group">
          <!-- Space Header -->
          <div
            class="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800/60 transition group cursor-pointer text-sm"
          >
            <div
              class="flex items-center gap-2 min-w-0 flex-1"
              @click="store.toggleNode(space.id)"
            >
              <span
                class="text-xs text-slate-500 transition-transform duration-200"
                :class="store.isNodeCollapsed(space.id) ? '' : 'rotate-90'"
              >
                ▶
              </span>
              <span
                class="w-2.5 h-2.5 rounded-full shrink-0"
                :style="{ backgroundColor: space.color }"
              />
              <span class="truncate font-medium text-slate-200 group-hover:text-white text-xs">
                {{ space.name }}
              </span>
            </div>

            <!-- Space Quick Actions -->
            <div class="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
              <button
                type="button"
                class="p-1 text-xs text-slate-400 hover:text-white rounded hover:bg-slate-700/60 cursor-pointer"
                title="Add List"
                @click.stop="openCreateList(space.id)"
              >
                +
              </button>
              <button
                type="button"
                class="p-1 text-xs text-slate-400 hover:text-white rounded hover:bg-slate-700/60 cursor-pointer"
                title="Space Options"
                @click.stop="openSpaceMenu(space)"
              >
                ···
              </button>
            </div>
          </div>

          <!-- Space Children (Folders and Folderless Lists) -->
          <div v-if="!store.isNodeCollapsed(space.id)" class="pl-4 space-y-0.5 mt-0.5">
            <!-- Folders -->
            <div v-for="folder in space.folders" :key="folder.id" class="group/folder">
              <div
                class="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-800/40 transition cursor-pointer text-xs"
              >
                <div
                  class="flex items-center gap-1.5 min-w-0 flex-1 text-slate-300 group-hover/folder:text-white"
                  @click="store.toggleNode(folder.id)"
                >
                  <span
                    class="text-[10px] text-slate-500 transition-transform"
                    :class="store.isNodeCollapsed(folder.id) ? '' : 'rotate-90'"
                  >
                    ▶
                  </span>
                  <span>📁</span>
                  <span class="truncate font-normal">{{ folder.name }}</span>
                </div>

                <div class="opacity-0 group-hover/folder:opacity-100 transition flex items-center gap-1">
                  <button
                    type="button"
                    class="p-0.5 text-[10px] text-slate-400 hover:text-white rounded cursor-pointer"
                    title="Add List to Folder"
                    @click.stop="openCreateList(space.id, folder.id)"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    class="p-0.5 text-[10px] text-slate-400 hover:text-white rounded cursor-pointer"
                    title="Folder Options"
                    @click.stop="openFolderMenu(folder)"
                  >
                    ···
                  </button>
                </div>
              </div>

              <!-- Folder Lists -->
              <div v-if="!store.isNodeCollapsed(folder.id)" class="pl-4 space-y-0.5 mt-0.5">
                <NuxtLink
                  v-for="list in folder.lists"
                  :key="list.id"
                  :to="`/lists/${list.id}`"
                  class="flex items-center justify-between px-2 py-1 rounded-lg transition text-xs group/list"
                  :class="route.params.id === list.id ? 'bg-indigo-600/20 text-indigo-300 font-medium' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'"
                >
                  <div class="flex items-center gap-2 truncate">
                    <span
                      class="w-2 h-2 rounded-full shrink-0"
                      :style="{ backgroundColor: list.color || space.color }"
                    />
                    <span class="truncate">{{ list.name }}</span>
                  </div>

                  <button
                    type="button"
                    class="opacity-0 group-hover/list:opacity-100 p-0.5 text-slate-400 hover:text-white rounded cursor-pointer"
                    @click.prevent.stop="openListMenu(list, space.id)"
                  >
                    ···
                  </button>
                </NuxtLink>
              </div>
            </div>

            <!-- Folderless Lists -->
            <NuxtLink
              v-for="list in space.lists"
              :key="list.id"
              :to="`/lists/${list.id}`"
              class="flex items-center justify-between px-2 py-1 rounded-lg transition text-xs group/list"
              :class="route.params.id === list.id ? 'bg-indigo-600/20 text-indigo-300 font-medium' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'"
            >
              <div class="flex items-center gap-2 truncate">
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  :style="{ backgroundColor: list.color || space.color }"
                />
                <span class="truncate">{{ list.name }}</span>
              </div>

              <button
                type="button"
                class="opacity-0 group-hover/list:opacity-100 p-0.5 text-slate-400 hover:text-white rounded cursor-pointer"
                @click.prevent.stop="openListMenu(list, space.id)"
              >
                ···
              </button>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom: Collapse toggle & User actions -->
    <div class="p-2 border-t border-slate-800 flex items-center justify-between">
      <button
        type="button"
        class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer w-full flex items-center justify-center gap-2 text-xs"
        @click="store.toggleSidebar"
      >
        <span class="text-sm">{{ store.isSidebarCollapsed ? '▶' : '◀' }}</span>
        <span v-if="!store.isSidebarCollapsed">Collapse Sidebar</span>
      </button>
    </div>

    <!-- Modals -->
    <WorkspaceModal
      :is-open="isWorkspaceModalOpen"
      :workspace-to-edit="workspaceToEdit"
      @close="isWorkspaceModalOpen = false"
      @saved="handleWorkspaceSaved"
    />

    <SpaceModal
      :is-open="isSpaceModalOpen"
      :workspace-id="store.currentWorkspace?._id || ''"
      :space-to-edit="spaceToEdit"
      @close="isSpaceModalOpen = false"
      @saved="handleSpaceSaved"
    />

    <FolderModal
      :is-open="isFolderModalOpen"
      :space-id="activeSpaceId"
      :folder-to-edit="folderToEdit"
      @close="isFolderModalOpen = false"
      @saved="handleFolderSaved"
    />

    <ListModal
      :is-open="isListModalOpen"
      :space-id="activeSpaceId"
      :folders="activeSpaceFolders"
      :default-folder-id="activeFolderId"
      :list-to-edit="listToEdit"
      @close="isListModalOpen = false"
      @saved="handleListSaved"
    />
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useHierarchyStore } from '../../stores/hierarchy';
import type {
  Workspace,
  Space,
  Folder,
  HierarchyTreeNodeSpace,
  HierarchyTreeNodeFolder,
  HierarchyTreeNodeList,
} from '../../types/hierarchy';
import WorkspaceModal from './WorkspaceModal.vue';
import SpaceModal from './SpaceModal.vue';
import FolderModal from './FolderModal.vue';
import ListModal from './ListModal.vue';

const route = useRoute();
const store = useHierarchyStore();

const isWorkspaceMenuOpen = ref(false);

const isWorkspaceModalOpen = ref(false);
const workspaceToEdit = ref<Workspace | null>(null);

const isSpaceModalOpen = ref(false);
const spaceToEdit = ref<Space | null>(null);

const isFolderModalOpen = ref(false);
const activeSpaceId = ref('');
const folderToEdit = ref<Folder | null>(null);

const isListModalOpen = ref(false);
const activeFolderId = ref('');
const listToEdit = ref<HierarchyTreeNodeList | null>(null);

const iconSymbols: Record<string, string> = {
  folder: '📁',
  rocket: '🚀',
  flag: '🚩',
  tag: '🏷️',
  star: '⭐',
  compass: '🧭',
  zap: '⚡',
  target: '🎯',
};

const activeSpaceFolders = computed<HierarchyTreeNodeFolder[]>(() => {
  const sp = store.tree.find((s) => s.id === activeSpaceId.value);
  return sp ? sp.folders : [];
});

onMounted(async () => {
  store.initPersistedState();
  if (store.workspaces.length === 0) {
    await store.fetchWorkspaces();
  }
});

function handleSelectWorkspace(workspaceId: string) {
  isWorkspaceMenuOpen.value = false;
  store.selectWorkspace(workspaceId);
}

function openCreateWorkspace() {
  isWorkspaceMenuOpen.value = false;
  workspaceToEdit.value = null;
  isWorkspaceModalOpen.value = true;
}

function openCreateSpace() {
  spaceToEdit.value = null;
  isSpaceModalOpen.value = true;
}

function openSpaceMenu(space: HierarchyTreeNodeSpace) {
  // Simple prompt/action or open edit
  spaceToEdit.value = {
    _id: space.id,
    workspaceId: space.workspaceId,
    name: space.name,
    description: space.description,
    icon: space.icon,
    color: space.color,
    isPrivate: space.isPrivate,
    order: space.order,
    features: {
      customStatuses: true,
      customFields: true,
      calendarView: true,
    },
    createdAt: '',
    updatedAt: '',
  };
  isSpaceModalOpen.value = true;
}

function openCreateList(spaceId: string, folderId?: string) {
  activeSpaceId.value = spaceId;
  activeFolderId.value = folderId || '';
  listToEdit.value = null;
  isListModalOpen.value = true;
}

function openFolderMenu(folder: HierarchyTreeNodeFolder) {
  activeSpaceId.value = folder.spaceId;
  folderToEdit.value = {
    _id: folder.id,
    spaceId: folder.spaceId,
    name: folder.name,
    order: folder.order,
    isHidden: folder.isHidden,
    createdAt: '',
    updatedAt: '',
  };
  isFolderModalOpen.value = true;
}

function openListMenu(list: HierarchyTreeNodeList, spaceId: string) {
  activeSpaceId.value = spaceId;
  listToEdit.value = list;
  isListModalOpen.value = true;
}

function handleWorkspaceSaved() {
  // refreshed in store
}

function handleSpaceSaved() {
  // refreshed in store
}

function handleFolderSaved() {
  // refreshed in store
}

function handleListSaved() {
  // refreshed in store
}
</script>
