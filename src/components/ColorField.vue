<script setup lang="ts">
import { computed, ref } from "vue";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const props = defineProps<{
  label: string;
  hint: string;
  value: string;
}>();

const emit = defineEmits<{
  change: [hex: string];
}>();

const draft = ref<string | null>(null);
const shown = computed(() => draft.value ?? props.value);

function onPickerInput(event: Event) {
  draft.value = null;
  emit("change", (event.target as HTMLInputElement).value);
}

function onHexInput(event: Event) {
  const next = (event.target as HTMLInputElement).value;
  draft.value = next;
  if (HEX_COLOR.test(next)) {
    emit("change", next.toLowerCase());
  }
}
</script>

<template>
  <label class="block">
    <span class="text-sm font-medium text-slate-700">{{ label }}</span>
    <span class="mt-0.5 block text-xs text-slate-500">{{ hint }}</span>
    <div class="mt-1.5 flex items-center gap-2">
      <input
        type="color"
        :aria-label="`${label} picker`"
        :value="value"
        class="h-10 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1"
        @input="onPickerInput"
      />
      <input
        type="text"
        :aria-label="`${label} hex`"
        :value="shown"
        spellcheck="false"
        class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-800 uppercase"
        @input="onHexInput"
        @blur="draft = null"
      />
    </div>
  </label>
</template>
