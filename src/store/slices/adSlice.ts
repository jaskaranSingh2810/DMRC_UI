import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AxiosResponse } from "axios";
import axiosInstance from "@/api/axiosInstance";
import type { Ad, ApiEnvelope, AsyncStatus, DeviceLocation, DeviceRecord } from "@/types";
import { getApiData, getApiMessage, isApiSuccess } from "@/utils/api";
import { parseApiError } from "@/utils/errorHandler";
import { buildDraftUploadFormData } from "@/pages/AdsManagement/adCampaignWizardHelpers";
import {
  buildAssignScreensPayload,
  buildForecastPayload,
  buildSchedulePayload,
  mapContentListResponse,
  normalizeInventoryForecastResponse,
  type ContentListResponse,
} from "@/pages/AdsManagement/adManagementApiHelpers";
import type {
  CampaignMediaState,
  DraftContentResponse,
  LocationOption,
  ScheduleEntry,
} from "@/pages/AdsManagement/adCampaignWizardTypes";
interface AdFilters {
  [key: string]: string;
}

export interface AdsSummary {
  totalContents: number;
  liveContents: number;
  expiredContents: number;
}

export interface AssignedLocationScreensResponse {
  contentId: string | number;
  terminals: Array<{
    locationId: string | number;
    screens: {
      portraitScreens: DeviceRecord[];
      landscapeScreens: DeviceRecord[];
    };
  }>;
}

export interface LocationScreensResponse {
  portraitScreens: DeviceRecord[];
  landscapeScreens: DeviceRecord[];
}

export interface InventoryForecastTerminal {
  locationId: string | number;
  locationName: string;
  selectedScreens: number;
  capacityHours: number;
  availableHours: number;
  requiredHours: number;
  utilizationPercentage: number;
  pacingIntervalSeconds: number;
  allowed: boolean;
}

export interface InventoryForecastResponse {
  overallUtilization: number;
  totalRequiredHours: number;
  totalScreens: number;
  terminals: InventoryForecastTerminal[];
}

export interface ScheduledContentResponse {
  contentId: string | number;
  contentName: string;
  contentType: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
  isPublish: boolean;
  publishedOn: string | null;
  targetPlays: number;
  priority: number;
  locations: Array<{
    locationId: string | number;
    locationName: string;
  }>;
}

interface AdState {
  items: Ad[];
  currentAd: Ad | null;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  status: AsyncStatus;
  filters: AdFilters;
  listLoaded: boolean;
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  summary: AdsSummary;
  screensByLocation: Record<string, DeviceRecord[]>;
  assignedScreensByLocation: Record<string, DeviceRecord[]>;
  forecast: InventoryForecastResponse | null;
}

const initialState: AdState = {
  items: [],
  currentAd: null,
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
  summary: {
    totalContents: 0,
    liveContents: 0,
    expiredContents: 0,
  },
  screensByLocation: {},
  assignedScreensByLocation: {},
  forecast: null,
};

interface PaginatedAds {
  content: Ad[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  isFirst: boolean;
  isLast: boolean;
  summary: AdsSummary;
}

interface AdListRequest {
  page?: number;
  size?: number;
  sortCriteria?: AdSortCriteria[];
}

interface AdSortCriteria {
  field: string;
  direction: "ASC" | "DESC";
}

interface RemoveAdRequest {
  id: string | number;
  userName: string;
}

interface AssignScreensRequest {
  contentId: string | number;
  locations: LocationOption[];
  selectedDevices: Record<string, string[]>;
}

interface ForecastRequest {
  contentId: string | number;
  locations: LocationOption[];
  schedule: Record<string, ScheduleEntry>;
  selectedDevices: Record<string, string[]>;
}

interface ScheduleContentRequest {
  contentId: string | number;
  locations: LocationOption[];
  schedule: Record<string, ScheduleEntry>;
  publish: boolean;
}

export const fetchAds = createAsyncThunk<
  PaginatedAds,
  AdListRequest | void,
  { rejectValue: string }
>("ads/fetchAds", async (_, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<ContentListResponse>> =
      await axiosInstance.get(
        `/api/v1/dmrc/content/fetch-all-contents`,
      );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to fetch ads."),
      );
    }

    return mapContentListResponse(getApiData(response.data));
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to fetch ads."));
  }
});

export const removeAd = createAsyncThunk<
  Ad,
  RemoveAdRequest,
  { rejectValue: string }
>("ads/remove", async (payload, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<Ad>> = await axiosInstance.delete(
      "/api/v1/dmrc/ad/remove",
      {
        data: payload,
      },
    );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to remove ad."),
      );
    }

    return getApiData(response.data);
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to remove ad."));
  }
});

export const saveAdDraft = createAsyncThunk<
  DraftContentResponse,
  CampaignMediaState,
  { rejectValue: string }
>("ads/saveDraft", async (campaign, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<DraftContentResponse>> =
      await axiosInstance.post(
        `/api/v1/dmrc/content/upload-ad-data`,
        buildDraftUploadFormData(campaign),
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to save draft."),
      );
    }

    return getApiData(response.data);
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to save draft."));
  }
});

export const fetchAdContent = createAsyncThunk<
  DraftContentResponse,
  string | number,
  { rejectValue: string }
>("ads/fetchContent", async (contentId, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<DraftContentResponse>> =
      await axiosInstance.get(
        `/api/v1/dmrc/content/${contentId}`,
      );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to load content."),
      );
    }

    return getApiData(response.data);
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to load content."));
  }
});

export const fetchLocationScreens = createAsyncThunk<
  { locationId: string; devices: DeviceRecord[] },
  string | number,
  { rejectValue: string }
>("ads/fetchLocationScreens", async (locationId, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<DeviceRecord[]>> =
      await axiosInstance.get(
        `/api/v1/dmrc/device/${locationId}/deviceCode`,
      );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to fetch location screens."),
      );
    }

    return {
      locationId: String(locationId),
      devices: getApiData(response.data),
    };
  } catch (error) {
    return rejectWithValue(
      parseApiError(error, "Unable to fetch location screens."),
    );
  }
});

export const assignLocationScreens = createAsyncThunk<
  AssignedLocationScreensResponse,
  AssignScreensRequest,
  { rejectValue: string }
>("ads/assignLocationScreens", async (payload, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<AssignedLocationScreensResponse>> =
      await axiosInstance.post(
        `/api/v1/dmrc/content/assign-location-screens`,
        buildAssignScreensPayload(
          payload.contentId,
          payload.locations,
          payload.selectedDevices,
        ),
      );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to assign screens."),
      );
    }

    return getApiData(response.data);
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to assign screens."));
  }
});

export const fetchAssignedLocationScreens = createAsyncThunk<
  { locationId: string; data: LocationScreensResponse },
  string | number,
  { rejectValue: string }
>("ads/fetchAssignedLocationScreens", async (locationId, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<LocationScreensResponse>> =
      await axiosInstance.get(
        `/api/v1/dmrc/content/location-screens/${locationId}`,
      );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to fetch assigned screens."),
      );
    }

    return {
      locationId: String(locationId),
      data: getApiData(response.data),
    };
  } catch (error) {
    return rejectWithValue(
      parseApiError(error, "Unable to fetch assigned screens."),
    );
  }
});

export const fetchInventoryForecast = createAsyncThunk<
  InventoryForecastResponse,
  ForecastRequest,
  { rejectValue: string }
>("ads/fetchInventoryForecast", async (payload, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<InventoryForecastResponse>> =
      await axiosInstance.post(
        `/api/v1/dmrc/content/inventory-forecast`,
        buildForecastPayload(
          payload.contentId,
          payload.locations,
          payload.schedule,
          payload.selectedDevices,
        ),
      );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to fetch inventory forecast."),
      );
    }

    return normalizeInventoryForecastResponse(getApiData(response.data));
  } catch (error) {
    return rejectWithValue(
      parseApiError(error, "Unable to fetch inventory forecast."),
    );
  }
});

export const scheduleAdContent = createAsyncThunk<
  ScheduledContentResponse,
  ScheduleContentRequest,
  { rejectValue: string }
>("ads/scheduleContent", async (payload, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<ScheduledContentResponse>> =
      await axiosInstance.post(
        `/api/v1/dmrc/content/schedule-content`,
        buildSchedulePayload(
          payload.contentId,
          payload.locations,
          payload.schedule,
          payload.publish,
        ),
      );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to schedule content."),
      );
    }

    return getApiData(response.data);
  } catch (error) {
    return rejectWithValue(
      parseApiError(error, "Unable to schedule content."),
    );
  }
});

function upsertAd(ads: Ad[], nextAd: Ad): Ad[] {
  const index = ads.findIndex(
    (ad) => String(ad.contentId) === String(nextAd.contentId),
  );

  if (index === -1) {
    return [nextAd, ...ads];
  }

  const copy = [...ads];
  copy[index] = {
    ...copy[index],
    ...nextAd,
  };

  return copy;
}

function mergeScreenGroups(
  portraitScreens: DeviceRecord[],
  landscapeScreens: DeviceRecord[],
) {
  return [...portraitScreens, ...landscapeScreens];
}

const adSlice = createSlice({
  name: "ads",
  initialState,
  reducers: {
    setAdFilter(state, action: PayloadAction<{ key: string; value: string }>) {
      state.filters[action.payload.key] = action.payload.value;
    },
    clearAdMessages(state) {
      state.error = null;
      state.successMessage = null;
    },
    clearAdFilters(state) {
      state.filters = {};
    },
    clearAdForecast(state) {
      state.forecast = null;
    },
  },
  extraReducers: (builder) => {
    const pending = (state: AdState) => {
      state.loading = true;
      state.error = null;
      state.successMessage = null;
      state.status = "loading";
    };

    const rejected = (
      state: AdState,
      action: PayloadAction<string | undefined>,
    ) => {
      state.loading = false;
      state.error = action.payload ?? "Request failed.";
      state.status = "failed";
    };

    builder
      .addCase(fetchAds.pending, pending)
      .addCase(fetchAds.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.content;
        state.summary = action.payload.summary;
        state.currentPage = action.payload.currentPage + 1;
        state.totalPages = action.payload.totalPages;
        state.totalElements = action.payload.totalElements;
        state.pageSize = action.payload.pageSize;
        state.status = "succeeded";
        state.listLoaded = true;
      })
      .addCase(fetchAds.rejected, (state, action) => {
        rejected(state, action);
        state.listLoaded = true;
      })
      .addCase(removeAd.pending, pending)
      .addCase(removeAd.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAd = action.payload;
        state.items = upsertAd(state.items, action.payload);
        state.successMessage = "Ad removed successfully.";
        state.status = "succeeded";
      })
      .addCase(removeAd.rejected, rejected)
      .addCase(saveAdDraft.pending, pending)
      .addCase(saveAdDraft.fulfilled, (state) => {
        state.loading = false;
        state.status = "succeeded";
      })
      .addCase(saveAdDraft.rejected, rejected)
      .addCase(fetchAdContent.pending, pending)
      .addCase(fetchAdContent.fulfilled, (state) => {
        state.loading = false;
        state.status = "succeeded";
      })
      .addCase(fetchAdContent.rejected, rejected)
      .addCase(fetchLocationScreens.pending, pending)
      .addCase(fetchLocationScreens.fulfilled, (state, action) => {
        state.loading = false;
        state.screensByLocation[action.payload.locationId] = action.payload.devices;
        state.status = "succeeded";
      })
      .addCase(fetchLocationScreens.rejected, rejected)
      .addCase(assignLocationScreens.pending, pending)
      .addCase(assignLocationScreens.fulfilled, (state, action) => {
        state.loading = false;
        state.assignedScreensByLocation = action.payload.terminals.reduce<
          Record<string, DeviceRecord[]>
        >((accumulator, terminal) => {
          accumulator[String(terminal.locationId)] = mergeScreenGroups(
            terminal.screens.portraitScreens,
            terminal.screens.landscapeScreens,
          );
          return accumulator;
        }, {});
        state.successMessage = "Location and screens saved successfully.";
        state.status = "succeeded";
      })
      .addCase(assignLocationScreens.rejected, rejected)
      .addCase(fetchAssignedLocationScreens.pending, pending)
      .addCase(fetchAssignedLocationScreens.fulfilled, (state, action) => {
        state.loading = false;
        state.assignedScreensByLocation[action.payload.locationId] =
          mergeScreenGroups(
            action.payload.data.portraitScreens,
            action.payload.data.landscapeScreens,
          );
        state.status = "succeeded";
      })
      .addCase(fetchAssignedLocationScreens.rejected, rejected)
      .addCase(fetchInventoryForecast.pending, pending)
      .addCase(fetchInventoryForecast.fulfilled, (state, action) => {
        state.loading = false;
        state.forecast = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchInventoryForecast.rejected, rejected)
      .addCase(scheduleAdContent.pending, pending)
      .addCase(scheduleAdContent.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAd = {
          contentId: action.payload.contentId,
          contentName: action.payload.contentName,
          createdBy: "",
          publishedOn: action.payload.publishedOn,
          startDate: action.payload.startDateTime.split("T")[0] ?? null,
          endDate: action.payload.endDateTime.split("T")[0] ?? null,
          startTime: action.payload.startDateTime.split("T")[1] ?? null,
          endTime: action.payload.endDateTime.split("T")[1] ?? null,
          status: action.payload.status,
          locations: action.payload.locations,
        };
        state.successMessage = "Content scheduled successfully.";
        state.status = "succeeded";
      })
      .addCase(scheduleAdContent.rejected, rejected);
  },
});

export const {
  setAdFilter,
  clearAdMessages,
  clearAdFilters,
  clearAdForecast,
} = adSlice.actions;
export default adSlice.reducer;
