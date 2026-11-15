<script setup lang="ts">
import ApiStatus from '@/components/ApiStatus.vue';
import AppHeader from '@/components/AppHeader.vue';
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <RouterView />
    </main>
    <footer class="border-t border-slate-200 bg-white">
      <div class="mx-auto flex max-w-5xl justify-end px-4 py-2">
        <ApiStatus />
      </div>
    </footer>
  </div>
</template>
