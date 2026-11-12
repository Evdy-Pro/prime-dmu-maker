<script setup lang="ts">
import { computed } from "vue";
import { useDmu } from "../composables/useDmu.ts";
import { usesMockActivityData } from "../services/activitySource.ts";
import { applyDmuColors, generateDmuHtml, withPreviewCss } from "../templates/generateDmuHtml.ts";
import { primeDmuCss } from "../templates/primeDmuCss.ts";
import type { PreviewViewport } from "../types/preview.ts";

const PREVIEW_WIDTH: Record<PreviewViewport, string> = {
  desktop: "100%",
  tablet: "768px",
  phone: "375px",
};

defineProps<{
  previewViewport: PreviewViewport;
}>();

const { activity, status, error, primaryColor, secondaryColor, ctaColor } = useDmu();
const mockData = usesMockActivityData();

const srcDoc = computed(() => {
  if (!activity.value) {
    return "";
  }
  const html = generateDmuHtml(activity.value);
  const css = applyDmuColors(primeDmuCss, {
    primary: primaryColor.value,
    secondary: secondaryColor.value,
    cta: ctaColor.value,
  });
  return withPreviewCss(html, css);
});
</script>

<template>
  <main class="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-100">
    <div class="border-b border-slate-200 bg-white px-6 py-4">
      <h2 class="text-sm font-semibold tracking-wide text-slate-500 uppercase">Live preview</h2>
      <p class="mt-1 text-sm text-slate-600">
        Rendered DMU. Color, photo, and activity changes update this view.
      </p>
    </div>
    <div class="flex min-h-0 flex-1 flex-col">
      <p v-if="status === 'error' && error" class="px-6 pt-4 text-sm text-red-600">{{ error }}</p>
      <div v-if="activity" class="flex min-h-0 flex-1 justify-center overflow-auto">
        <iframe
          title="DMU live preview"
          :srcdoc="srcDoc"
          class="h-full min-h-0 shrink-0 border-0 bg-[#e6e6e6]"
          :style="{ width: PREVIEW_WIDTH[previewViewport] }"
        />
      </div>
      <div v-else class="p-6">
        <p v-if="status === 'loading'" class="text-sm text-slate-600">Fetching activity…</p>
        <p v-if="status === 'idle'" class="text-sm text-slate-600">
          {{
            mockData
              ? "Enter an activity code such as 13WC2610, 13LV258, 13WC261, or 23LV261."
              : "Enter an activity code from Admin, such as 13WC2610."
          }}
        </p>
      </div>
      <p v-if="status === 'loading' && activity" class="border-t border-slate-200 bg-white px-6 py-2 text-sm text-slate-600">
        Fetching activity…
      </p>
    </div>
  </main>
</template>
