import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AxiosResponse } from "axios";
import axiosInstance from "@/api/axiosInstance";
import type { Ad, ApiEnvelope, AsyncStatus } from "@/types";
import { getApiData, getApiMessage, isApiSuccess } from "@/utils/api";
import { parseApiError } from "@/utils/errorHandler";
import { buildDraftUploadFormData } from "@/pages/AdsManagement/adCampaignWizardHelpers";
import type {
  CampaignMediaState,
  DraftContentResponse,
} from "@/pages/AdsManagement/adCampaignWizardTypes";

interface AdFilters {
  [key: string]: string;
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
};

interface PaginatedAds {
  content: Ad[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  isFirst: boolean;
  isLast: boolean;
}

interface AdListRequest {
  page: number;
  size: number;
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

const contentBaseUrl =
  import.meta.env.VITE_CONTENT_API_URL ?? "http://localhost:8085";

function getContentUrl(path: string) {
  return `${contentBaseUrl}${path}`;
}

export const fetchAds = createAsyncThunk<
  PaginatedAds,
  AdListRequest | void,
  { rejectValue: string }
>("ads/fetchAds", async (payload, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<PaginatedAds>> =
      await axiosInstance.post("/api/v1/dmrc/ad/list", {
        page: payload?.page ?? 0,
        size: payload?.size ?? 10,
        ...(payload?.sortCriteria?.length
          ? { sortCriteria: payload.sortCriteria }
          : {}),
      });

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to fetch ads."),
      );
    }

    return getApiData(response.data);
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
        getContentUrl("/api/v1/dmrc/content/upload-ad-data"),
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
        getContentUrl(`/api/v1/dmrc/content/${contentId}`),
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
        state.items = action.payload?.content ?? [];
        state.currentPage = (action.payload?.currentPage ?? 0) + 1;
        state.totalPages = action.payload?.totalPages ?? 1;
        state.totalElements = action.payload?.totalElements ?? 0;
        state.pageSize = action.payload?.pageSize ?? state.pageSize;
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
      .addCase(fetchAdContent.rejected, rejected);
  },
});

export const { setAdFilter, clearAdMessages, clearAdFilters } =
  adSlice.actions;
export default adSlice.reducer;
