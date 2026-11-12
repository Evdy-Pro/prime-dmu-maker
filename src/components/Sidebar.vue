<script setup lang="ts">
import { computed, ref } from "vue";
import { useDmu } from "../composables/useDmu.ts";
import { usesMockActivityData } from "../services/activitySource.ts";
import { exportDmuZip } from "../templates/exportDmuZip.ts";
import type { PreviewViewport } from "../types/preview.ts";
import ColorField from "./ColorField.vue";

const PREVIEW_VIEWPORTS: { id: PreviewViewport; label: string }[] = [
  { id: "desktop", label: "Desktop" },
  { id: "tablet", label: "Tablet" },
  { id: "phone", label: "Phone" },
];

defineProps<{
  previewViewport: PreviewViewport;
}>();

const emit = defineEmits<{
  "update:previewViewport": [viewport: PreviewViewport];
}>();

const {
  activity,
  status,
  uploadingFacultyIndex,
  uploadError,
  uploadErrorIndex,
  primaryColor,
  secondaryColor,
  ctaColor,
  fetchActivity,
  setPrimaryColor,
  setSecondaryColor,
  setCtaColor,
  replaceFacultyPhoto,
} = useDmu();
const code = ref("");
const validation = ref<string | null>(null);
const isExporting = ref(false);
const exportError = ref<string | null>(null);
const mockData = usesMockActivityData();
const uploadInFlight = computed(() => uploadingFacultyIndex.value !== null);
const searchLocked = computed(() => status.value === "loading" || isExporting.value || uploadInFlight.value);

function handleSubmit() {
  if (searchLocked.value) {
    return;
  }
  if (!code.value.trim()) {
    validation.value = "Enter an activity code to fetch DMU data.";
    return;
  }
  validation.value = null;
  void fetchActivity(code.value);
}

async function handleExport() {
  const current = activity.value;
  if (!current || status.value === "loading" || isExporting.value || uploadInFlight.value) {
    return;
  }
  isExporting.value = true;
  exportError.value = null;
  try {
    await exportDmuZip(current, {
      primary: primaryColor.value,
      secondary: secondaryColor.value,
      cta: ctaColor.value,
    });
  } catch (caught) {
    exportError.value = caught instanceof Error ? caught.message : "Export failed.";
  } finally {
    isExporting.value = false;
  }
}

function onPhotoChange(event: Event, index: number) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || searchLocked.value) {
    return;
  }
  void replaceFacultyPhoto(index, file);
}
</script>

<template>
  <aside class="flex h-full w-[360px] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
    <div class="border-b border-slate-200 px-5 py-5">
      <p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">PRIME Education</p>
      <h1 class="mt-1 text-xl font-semibold text-slate-900">DMU Maker</h1>
    </div>

    <form class="space-y-3 border-b border-slate-200 px-5 py-5" @submit.prevent="handleSubmit">
      <label class="block" for="activity-code">
        <span class="text-sm font-medium text-slate-700">Activity code</span>
        <input
          id="activity-code"
          v-model="code"
          placeholder="13WC2610"
          autocomplete="off"
          :disabled="searchLocked"
          class="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#388f69] focus:ring-2 focus:ring-[#388f69]/30 disabled:cursor-not-allowed disabled:bg-slate-50"
        />
      </label>
      <p class="text-xs text-slate-500">
        {{ mockData ? "13WC2610, 13LV258, 13WC261, or 23LV261" : "Enter an activity code from Admin. Example: 13WC2610." }}
      </p>
      <p v-if="validation" class="text-sm text-red-600">{{ validation }}</p>
      <button
        type="submit"
        :disabled="searchLocked"
        class="w-full rounded-md bg-[#388f69] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2f7858] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {{ status === "loading" ? "Fetching…" : "Fetch activity" }}
      </button>
      <div class="flex gap-2" role="group" aria-label="Preview size">
        <button
          v-for="option in PREVIEW_VIEWPORTS"
          :key="option.id"
          type="button"
          :aria-pressed="previewViewport === option.id"
          :class="[
            'flex-1 rounded-md px-2 py-2 text-sm font-semibold',
            previewViewport === option.id
              ? 'bg-[#388f69] text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
          ]"
          @click="emit('update:previewViewport', option.id)"
        >
          {{ option.label }}
        </button>
      </div>
    </form>

    <section class="space-y-4 border-b border-slate-200 px-5 py-5">
      <h2 class="text-sm font-semibold tracking-wide text-slate-500 uppercase">Colors</h2>
      <ColorField label="Primary" hint="Header bars" :value="primaryColor" @change="setPrimaryColor" />
      <ColorField
        label="Secondary"
        hint="Panel behind the button and faculty"
        :value="secondaryColor"
        @change="setSecondaryColor"
      />
      <ColorField label="CTA" hint="Register button" :value="ctaColor" @change="setCtaColor" />
    </section>

    <section class="space-y-4 px-5 py-5">
      <h2 class="text-sm font-semibold tracking-wide text-slate-500 uppercase">Faculty photos</h2>
      <ul v-if="activity" class="space-y-4">
        <li
          v-for="(member, index) in activity.faculty"
          :key="`${member.name}-${index}`"
          class="rounded-lg border border-slate-200 p-3"
        >
          <div class="flex items-center gap-3">
            <img
              :src="member.photo_url"
              alt=""
              :class="
                member.isReplaced
                  ? 'h-14 w-14 shrink-0 rounded-full bg-slate-100 object-cover object-center'
                  : 'h-14 w-14 shrink-0 rounded-full bg-slate-100 object-cover object-[center_15%]'
              "
            />
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-slate-900">{{ member.name }}</p>
              <p class="text-xs text-slate-500">{{ member.role }}</p>
            </div>
          </div>
          <label class="mt-3 block text-xs font-medium text-slate-600">
            Replace photo
            <input
              type="file"
              :accept="mockData ? 'image/*' : 'image/png,image/jpeg,image/webp'"
              :aria-label="`Replace photo for ${member.name}`"
              :disabled="searchLocked"
              class="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              @change="onPhotoChange($event, index)"
            />
          </label>
          <p v-if="uploadingFacultyIndex === index" class="mt-2 text-xs text-slate-500">Uploading…</p>
          <p v-if="uploadErrorIndex === index && uploadError" class="mt-2 text-sm text-red-600">{{ uploadError }}</p>
        </li>
      </ul>
      <p v-else class="text-sm text-slate-500">Fetch an activity to replace faculty photos.</p>
    </section>

    <section class="mt-auto border-t border-slate-200 px-5 py-5">
      <button
        type="button"
        :disabled="!activity || status === 'loading' || isExporting || uploadInFlight"
        class="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleExport"
      >
        {{ isExporting ? "Exporting…" : "Export DMU" }}
      </button>
      <p v-if="exportError" class="mt-2 text-sm text-red-600">{{ exportError }}</p>
    </section>
  </aside>
</template>
