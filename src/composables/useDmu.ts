import { computed, inject, provide, ref, shallowRef, type InjectionKey, type Ref } from "vue";
import { usesMockActivityData } from "../services/activitySource.ts";
import { fetchMockActivity } from "../services/mockDataService.ts";
import { fetchSynapseActivity, uploadFacultyPhoto, validateFacultyPhoto } from "../services/synapseApiService.ts";
import {
  DEFAULT_CTA_COLOR,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  type DmuActivity,
  type FetchStatus,
} from "../types/dmu.ts";

export type DmuState = {
  activity: Readonly<Ref<DmuActivity | null>>;
  status: Readonly<Ref<FetchStatus>>;
  error: Readonly<Ref<string | null>>;
  uploadingFacultyIndex: Readonly<Ref<number | null>>;
  uploadError: Readonly<Ref<string | null>>;
  uploadErrorIndex: Readonly<Ref<number | null>>;
  primaryColor: Readonly<Ref<string>>;
  secondaryColor: Readonly<Ref<string>>;
  ctaColor: Readonly<Ref<string>>;
  fetchActivity: (code: string) => Promise<void>;
  setPrimaryColor: (hex: string) => void;
  setSecondaryColor: (hex: string) => void;
  setCtaColor: (hex: string) => void;
  replaceFacultyPhoto: (index: number, file: File) => Promise<void>;
};

const DmuKey: InjectionKey<DmuState> = Symbol("dmu");

function revokeBlobUrl(url: string | undefined) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function asReadonly<T>(source: Ref<T>): Readonly<Ref<T>> {
  return computed(() => source.value);
}

export function provideDmu(): DmuState {
  const activity = shallowRef<DmuActivity | null>(null);
  const status = ref<FetchStatus>("idle");
  const error = ref<string | null>(null);
  const uploadingFacultyIndex = ref<number | null>(null);
  const uploadError = ref<string | null>(null);
  const uploadErrorIndex = ref<number | null>(null);
  const primaryColor = ref(DEFAULT_PRIMARY_COLOR);
  const secondaryColor = ref(DEFAULT_SECONDARY_COLOR);
  const ctaColor = ref(DEFAULT_CTA_COLOR);
  let requestId = 0;
  let uploading = false;
  let fetchInFlight = false;

  function clearUploadError() {
    uploadError.value = null;
    uploadErrorIndex.value = null;
  }

  function commitFacultyPhoto(index: number, photoUrl: string) {
    const current = activity.value;
    if (!current || index < 0 || index >= current.faculty.length) {
      revokeBlobUrl(photoUrl);
      return;
    }

    revokeBlobUrl(current.faculty[index]?.photo_url);
    const faculty = current.faculty.map((member, memberIndex) =>
      memberIndex === index ? { ...member, photo_url: photoUrl, isReplaced: true } : member,
    );
    activity.value = { ...current, faculty };
  }

  async function fetchActivity(code: string) {
    const trimmed = code.trim();
    if (!trimmed || uploading || fetchInFlight) {
      return;
    }

    const id = ++requestId;
    fetchInFlight = true;
    status.value = "loading";
    error.value = null;
    clearUploadError();

    try {
      const data = usesMockActivityData()
        ? await fetchMockActivity(trimmed)
        : await fetchSynapseActivity(trimmed);
      if (id !== requestId) {
        return;
      }

      activity.value?.faculty.forEach((member) => revokeBlobUrl(member.photo_url));
      activity.value = data;
      status.value = "success";
    } catch (caught) {
      if (id !== requestId) {
        return;
      }
      activity.value?.faculty.forEach((member) => revokeBlobUrl(member.photo_url));
      activity.value = null;
      status.value = "error";
      error.value = caught instanceof Error ? caught.message : "Failed to fetch activity.";
    } finally {
      if (id === requestId) {
        fetchInFlight = false;
      }
    }
  }

  async function replaceFacultyPhoto(index: number, file: File) {
    const current = activity.value;
    if (!current || uploading || fetchInFlight || index < 0 || index >= current.faculty.length) {
      return;
    }

    if (usesMockActivityData()) {
      commitFacultyPhoto(index, URL.createObjectURL(file));
      clearUploadError();
      return;
    }

    const member = current.faculty[index];
    if (member?.id == null) {
      uploadError.value = "This faculty member has no id, so the photo cannot be replaced.";
      uploadErrorIndex.value = index;
      return;
    }

    const invalid = validateFacultyPhoto(file);
    if (invalid) {
      uploadError.value = invalid;
      uploadErrorIndex.value = index;
      return;
    }

    const generation = requestId;
    const facultyId = member.id;
    const activityCode = current.activityCode;
    uploading = true;
    uploadingFacultyIndex.value = index;
    clearUploadError();

    try {
      const url = await uploadFacultyPhoto({ file, activityCode, facultyId });
      if (generation !== requestId) {
        return;
      }
      const latest = activity.value;
      if (!latest || latest.activityCode !== activityCode || latest.faculty[index]?.id !== facultyId) {
        return;
      }
      commitFacultyPhoto(index, url);
    } catch (caught) {
      if (generation !== requestId) {
        return;
      }
      uploadError.value = caught instanceof Error ? caught.message : "Faculty photo upload failed.";
      uploadErrorIndex.value = index;
    } finally {
      uploading = false;
      uploadingFacultyIndex.value = null;
    }
  }

  const state: DmuState = {
    activity: asReadonly(activity),
    status: asReadonly(status),
    error: asReadonly(error),
    uploadingFacultyIndex: asReadonly(uploadingFacultyIndex),
    uploadError: asReadonly(uploadError),
    uploadErrorIndex: asReadonly(uploadErrorIndex),
    primaryColor: asReadonly(primaryColor),
    secondaryColor: asReadonly(secondaryColor),
    ctaColor: asReadonly(ctaColor),
    fetchActivity,
    setPrimaryColor: (hex) => {
      primaryColor.value = hex;
    },
    setSecondaryColor: (hex) => {
      secondaryColor.value = hex;
    },
    setCtaColor: (hex) => {
      ctaColor.value = hex;
    },
    replaceFacultyPhoto,
  };

  provide(DmuKey, state);
  return state;
}

export function useDmu(): DmuState {
  const state = inject(DmuKey, null);
  if (!state) {
    throw new Error("useDmu must be used within a component that calls provideDmu.");
  }
  return state;
}
