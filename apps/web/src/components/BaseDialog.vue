<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue';

const props = defineProps<{ title: string }>();
const emit = defineEmits<{ close: [] }>();

const panel = ref<HTMLElement | null>(null);
const titleId = useId();

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close');
  }
}

// 열리면 첫 입력·버튼으로 포커스를 옮겨 키보드 사용자가 바로 조작할 수 있게 한다.
onMounted(async () => {
  document.addEventListener('keydown', onKeydown);
  await nextTick();
  panel.value?.querySelector<HTMLElement>('textarea, input, select, button')?.focus();
});
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    @click.self="emit('close')"
  >
    <div
      ref="panel"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
    >
      <h2 :id="titleId" class="mb-4 text-lg font-semibold">{{ props.title }}</h2>
      <slot />
    </div>
  </div>
</template>
