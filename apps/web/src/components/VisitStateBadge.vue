<script setup lang="ts">
import { computed } from 'vue';
import { VISIT_STATE_LABEL, visitDisplayState, type VisitDisplayState } from '@/utils/labels';

const props = defineProps<{ visit: { status: string; isPast: boolean } }>();

const STYLE: Readonly<Record<VisitDisplayState, string>> = {
  UPCOMING: 'bg-emerald-50 text-emerald-700',
  PAST: 'bg-slate-100 text-slate-600',
  CANCELED: 'bg-red-50 text-red-700',
};

const state = computed(() => visitDisplayState(props.visit));
</script>

<template>
  <span class="rounded-full px-2 py-0.5 text-xs" :class="STYLE[state]">{{
    VISIT_STATE_LABEL[state]
  }}</span>
</template>
