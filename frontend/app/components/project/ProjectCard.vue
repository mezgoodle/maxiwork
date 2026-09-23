<template>
  <div
    class="bg-slate-800/60 border border-slate-700/80 hover:border-emerald-500/50 rounded-2xl p-6 transition flex flex-col justify-between shadow-lg backdrop-blur group"
  >
    <div>
      <div class="flex items-start justify-between gap-3 mb-3">
        <div class="flex items-center gap-2.5">
          <span
            class="px-2.5 py-1 text-xs font-bold tracking-wider rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono uppercase"
          >
            {{ project.prefix }}
          </span>
          <h3
            class="text-lg font-bold text-white group-hover:text-emerald-300 transition line-clamp-1"
          >
            {{ project.name }}
          </h3>
        </div>

        <NuxtLink
          :to="`/projects/${project._id}/settings`"
          class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700/60 transition text-sm cursor-pointer"
          title="Project settings"
        >
          ⚙
        </NuxtLink>
      </div>

      <p class="text-sm text-slate-400 line-clamp-3 mb-6 min-h-[3rem]">
        {{ project.description || 'No description provided.' }}
      </p>
    </div>

    <div
      class="pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-500"
    >
      <div>
        <span>Owner: </span>
        <span class="text-slate-300 font-medium">
          {{ ownerName }}
        </span>
      </div>

      <NuxtLink
        :to="`/projects/${project._id}/settings`"
        class="text-emerald-400 hover:text-emerald-300 font-medium transition cursor-pointer"
      >
        Settings &rarr;
      </NuxtLink>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { Project } from '../../types/project';

interface Props {
  project: Project;
}

const props = defineProps<Props>();

const ownerName = computed(() => {
  if (!props.project.owner) return 'Unknown';
  if (typeof props.project.owner === 'object') {
    const { firstName, lastName, email } = props.project.owner;
    return (
      [firstName, lastName].filter(Boolean).join(' ') || email || 'Unknown'
    );
  }
  return 'Owner';
});
</script>
