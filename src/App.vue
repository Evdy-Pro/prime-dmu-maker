<script setup lang="ts">
import { ref } from "vue";
import PreviewPane from "./components/PreviewPane.vue";
import Sidebar from "./components/Sidebar.vue";
import { provideDmu } from "./composables/useDmu.ts";
import type { PreviewViewport } from "./types/preview.ts";

provideDmu();

const previewViewport = ref<PreviewViewport>("desktop");
</script>

<template>
  <div class="flex h-full overflow-hidden bg-slate-100 text-slate-900">
    <Sidebar v-model:preview-viewport="previewViewport" />
    <PreviewPane :preview-viewport="previewViewport" />
  </div>
</template>
