<template>
  <NuxtLayout>
    <div
      class="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6"
    >
      <div
        class="bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-700"
      >
        <h1 class="text-3xl font-bold mb-4 text-emerald-400">Pinia + Nuxt</h1>

        <div class="my-6">
          <p class="text-gray-400 text-sm">Поточний Count (State):</p>
          <p class="text-5xl font-extrabold text-white my-2">
            {{ counterStore.count }}
          </p>

          <p class="text-gray-400 text-sm mt-4">Подвоєне значення (Getter):</p>
          <p class="text-2xl font-semibold text-emerald-300">
            {{ counterStore.doubled }}
          </p>
        </div>
        <div class="flex justify-center gap-3 mt-6">
          <button
            @click="counterStore.decrement"
            class="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg font-medium transition cursor-pointer"
          >
            -1
          </button>
          <button
            @click="counterStore.reset"
            class="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-medium transition cursor-pointer"
          >
            Reset
          </button>
          <button
            @click="counterStore.increment"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition cursor-pointer"
          >
            +1
          </button>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { useCounterStore } from "@/stores/counter";
const counterStore = useCounterStore();
</script>
