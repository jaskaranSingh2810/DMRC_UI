import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AxiosResponse } from "axios";
import axiosInstance from "@/api/axiosInstance";
import type {
  ApiEnvelope,
  AsyncStatus,
  DeviceLocation,
  Notice,
  NoticeListRequest,
  NoticeMutationPayload,
  NoticeStats,
  PaginatedNotices,
} from "@/types";
import { getApiData, getApiMessage, isApiSuccess } from "@/utils/api";
import { parseApiError } from "@/utils/errorHandler";
import {
  NOTICE_THEMES,
  deleteFallbackNotice,
  getFallbackNotices,
  getFallbackNoticeStats,
  saveFallbackNotice,
} from "@/pages/NoticeManagement/noticeManagementData";
import { applyNoticeQuery } from "@/pages/NoticeManagement/noticeManagementHelpers";
import type { RootState } from "@/store";

interface NoticeState {
  items: Notice[];
  currentNotice: Notice | null;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  status: AsyncStatus;
  filters: Record<string, string>;
  listLoaded: boolean;
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  selectedStatusFilter: "all" | "live" | "expired";
  stats: NoticeStats;
  usingFallbackData: boolean;
}

const initialState: NoticeState = {
  items: [],
  currentNotice: null,
  loading: false,
  error: null,
  successMessage: null,
  status: "idle",
  filters: {},
  listLoaded: false,
  currentPage: 1,
  totalPages: 1,
  totalElements: 0,
  pageSize: 10,
  selectedStatusFilter: "all",
  stats: getFallbackNoticeStats(),
  usingFallbackData: false,
};

interface NoticeMutationRequest {
  noticeId?: string | number;
  payload: NoticeMutationPayload;
}

interface RemoveNoticeRequest {
  id: string | number;
  userName: string;
}

function resolveLocations(
  state: RootState,
  locationIds: Array<string | number>,
): DeviceLocation[] {
  return locationIds.map((locationId) => {
    const match = state.locations.items.find(
      (location) => String(location.locationId) === String(locationId),
    );

    return {
      locationId,
      locationName: match?.locationName ?? `Location ${locationId}`,
    };
  });
}

function buildFallbackNotice(
  state: RootState,
  request: NoticeMutationRequest,
): Notice {
  const now = new Date().toISOString();
  const locations = resolveLocations(state, request.payload.locationIds);
  const existing =
    request.noticeId !== undefined
      ? getFallbackNotices().find(
          (notice) => String(notice.noticeId) === String(request.noticeId),
        )
      : undefined;
  const startAt = new Date(
    `${request.payload.startDate}T${request.payload.startTime}:00`,
  );
  const endAt = new Date(`${request.payload.endDate}T${request.payload.endTime}:00`);
  const nowDate = new Date();
  const computedStatus =
    endAt.getTime() < nowDate.getTime()
      ? "EXPIRED"
      : startAt.getTime() <= nowDate.getTime()
        ? request.payload.status === "DRAFT"
          ? "DRAFT"
          : "LIVE"
        : request.payload.status === "DRAFT"
          ? "DRAFT"
          : "SCHEDULED";

  return {
    noticeId: request.noticeId ?? `notice-${Date.now()}`,
    announcementName: request.payload.announcementName,
    title: request.payload.announcementName,
    description: request.payload.description,
    createdBy: existing?.createdBy ?? request.payload.userName,
    publishedOn:
      request.payload.status === "DRAFT"
        ? existing?.publishedOn ?? null
        : existing?.publishedOn ?? now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    updatedBy: request.payload.userName,
    startDate: request.payload.startDate,
    endDate: request.payload.endDate,
    locations,
    locationName: locations.map((location) => location.locationName).join(", "),
    startTime: request.payload.startTime,
    endTime: request.payload.endTime,
    status: computedStatus,
    themeId: request.payload.themeId,
    priority: existing?.priority ?? "MEDIUM",
  };
}

export const fetchNotices = createAsyncThunk<
  { data: PaginatedNotices; usingFallbackData: boolean },
  NoticeListRequest,
  { rejectValue: string }
>("notices/fetchNotices", async (payload, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<PaginatedNotices>> =
      await axiosInstance.post("/api/v1/dmrc/notice/list", payload);

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to fetch notices."),
      );
    }

    return { data: getApiData(response.data), usingFallbackData: false };
  } catch {
    return {
      data: applyNoticeQuery(getFallbackNotices(), payload),
      usingFallbackData: true,
    };
  }
});

export const fetchNoticeStats = createAsyncThunk<
  { data: NoticeStats; usingFallbackData: boolean },
  void,
  { rejectValue: string }
>("notices/fetchStats", async (_, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<NoticeStats>> =
      await axiosInstance.get("/api/v1/dmrc/notice/stats");

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to fetch notice stats."),
      );
    }

    return { data: getApiData(response.data), usingFallbackData: false };
  } catch {
    return { data: getFallbackNoticeStats(), usingFallbackData: true };
  }
});

export const fetchNoticeById = createAsyncThunk<
  { data: Notice; usingFallbackData: boolean },
  string | number,
  { rejectValue: string }
>("notices/fetchById", async (noticeId, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<Notice>> = await axiosInstance.get(
      `/api/v1/dmrc/notice/${noticeId}`,
    );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to load notice."),
      );
    }

    return { data: getApiData(response.data), usingFallbackData: false };
  } catch {
    const fallbackNotice = getFallbackNotices().find(
      (notice) => String(notice.noticeId) === String(noticeId),
    );

    if (!fallbackNotice) {
      return rejectWithValue("Notice not found.");
    }

    return { data: fallbackNotice, usingFallbackData: true };
  }
});

export const createNotice = createAsyncThunk<
  { data: Notice; usingFallbackData: boolean },
  NoticeMutationRequest,
  { rejectValue: string; state: RootState }
>("notices/create", async (request, { getState, rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<Notice>> = await axiosInstance.post(
      "/api/v1/dmrc/notice/create",
      request.payload,
    );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to create notice."),
      );
    }

    return { data: getApiData(response.data), usingFallbackData: false };
  } catch {
    const fallbackNotice = buildFallbackNotice(getState(), request);
    saveFallbackNotice(fallbackNotice);
    return { data: fallbackNotice, usingFallbackData: true };
  }
});

export const updateNotice = createAsyncThunk<
  { data: Notice; usingFallbackData: boolean },
  NoticeMutationRequest,
  { rejectValue: string; state: RootState }
>("notices/update", async (request, { getState, rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<Notice>> = await axiosInstance.put(
      "/api/v1/dmrc/notice/update",
      {
        noticeId: request.noticeId,
        ...request.payload,
      },
    );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to update notice."),
      );
    }

    return { data: getApiData(response.data), usingFallbackData: false };
  } catch {
    const fallbackNotice = buildFallbackNotice(getState(), request);
    saveFallbackNotice(fallbackNotice);
    return { data: fallbackNotice, usingFallbackData: true };
  }
});

export const removeNotice = createAsyncThunk<
  { data: Notice; usingFallbackData: boolean },
  RemoveNoticeRequest,
  { rejectValue: string }
>("notices/remove", async (payload, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<Notice>> = await axiosInstance.delete(
      "/api/v1/dmrc/notice/remove",
      { data: payload },
    );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to remove notice."),
      );
    }

    return { data: getApiData(response.data), usingFallbackData: false };
  } catch {
    const removedNotice = deleteFallbackNotice(payload.id);

    if (!removedNotice) {
      return rejectWithValue("Notice not found.");
    }

    return { data: removedNotice, usingFallbackData: true };
  }
});

const noticeSlice = createSlice({
  name: "notices",
  initialState,
  reducers: {
    setNoticeFilter(state, action: PayloadAction<{ key: string; value: string }>) {
      state.filters[action.payload.key] = action.payload.value;
    },
    setNoticeStatusFilter(
      state,
      action: PayloadAction<"all" | "live" | "expired">,
    ) {
      state.selectedStatusFilter = action.payload;
    },
    clearNoticeMessages(state) {
      state.error = null;
      state.successMessage = null;
    },
    clearNoticeFilters(state) {
      state.filters = {};
      state.selectedStatusFilter = "all";
    },
  },
  extraReducers: (builder) => {
    const pending = (state: NoticeState) => {
      state.loading = true;
      state.error = null;
      state.successMessage = null;
      state.status = "loading";
    };

    const rejected = (
      state: NoticeState,
      action: PayloadAction<string | undefined>,
    ) => {
      state.loading = false;
      state.error = action.payload ?? "Request failed.";
      state.status = "failed";
    };

    builder
      .addCase(fetchNotices.pending, pending)
      .addCase(fetchNotices.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data.content;
        state.currentPage = action.payload.data.currentPage + 1;
        state.totalPages = action.payload.data.totalPages;
        state.totalElements = action.payload.data.totalElements;
        state.pageSize = action.payload.data.pageSize;
        state.status = "succeeded";
        state.listLoaded = true;
        state.usingFallbackData = action.payload.usingFallbackData;
      })
      .addCase(fetchNotices.rejected, (state, action) => {
        rejected(state, action);
        state.listLoaded = true;
      })
      .addCase(fetchNoticeStats.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchNoticeStats.fulfilled, (state, action) => {
        state.stats = action.payload.data;
        state.usingFallbackData = action.payload.usingFallbackData;
      })
      .addCase(fetchNoticeStats.rejected, rejected)
      .addCase(fetchNoticeById.pending, pending)
      .addCase(fetchNoticeById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentNotice = action.payload.data;
        state.status = "succeeded";
        state.usingFallbackData = action.payload.usingFallbackData;
      })
      .addCase(fetchNoticeById.rejected, rejected)
      .addCase(createNotice.pending, pending)
      .addCase(createNotice.fulfilled, (state, action) => {
        state.loading = false;
        state.currentNotice = action.payload.data;
        state.successMessage = "Notice created successfully.";
        state.status = "succeeded";
        state.usingFallbackData = action.payload.usingFallbackData;
      })
      .addCase(createNotice.rejected, rejected)
      .addCase(updateNotice.pending, pending)
      .addCase(updateNotice.fulfilled, (state, action) => {
        state.loading = false;
        state.currentNotice = action.payload.data;
        state.successMessage = "Notice updated successfully.";
        state.status = "succeeded";
        state.usingFallbackData = action.payload.usingFallbackData;
      })
      .addCase(updateNotice.rejected, rejected)
      .addCase(removeNotice.pending, pending)
      .addCase(removeNotice.fulfilled, (state, action) => {
        state.loading = false;
        state.currentNotice = action.payload.data;
        state.successMessage = "Notice deleted successfully.";
        state.status = "succeeded";
        state.usingFallbackData = action.payload.usingFallbackData;
      })
      .addCase(removeNotice.rejected, rejected);
  },
});

export const noticeThemes = NOTICE_THEMES;
export const {
  setNoticeFilter,
  setNoticeStatusFilter,
  clearNoticeMessages,
  clearNoticeFilters,
} = noticeSlice.actions;
export default noticeSlice.reducer;
