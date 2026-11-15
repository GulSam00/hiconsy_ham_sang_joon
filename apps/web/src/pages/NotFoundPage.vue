<script setup lang="ts">
import { ROUTE_NAME } from '@/router/route-access';
</script>

<template>
  <section class="text-center">
    <h1 class="mb-2 text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
    <RouterLink :to="{ name: ROUTE_NAME.ROLE_SELECT }" class="text-sm underline">
      처음으로
    </RouterLink>
  </section>
</template>
