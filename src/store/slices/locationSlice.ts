import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AxiosResponse } from "axios";
import axiosInstance from "@/api/axiosInstance";
import type { ApiEnvelope, AsyncStatus, DeviceLocation } from "@/types";
import { getApiData, getApiMessage, isApiSuccess } from "@/utils/api";
import { parseApiError } from "@/utils/errorHandler";

interface LocationFilters {
  [key: string]: string;
}

interface LocationState {
  items: DeviceLocation[];
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  status: AsyncStatus;
  filters: LocationFilters;
  listLoaded: boolean;
}

const initialState: LocationState = {
  items: [],
  loading: false,
  error: null,
  successMessage: null,
  filters: {},
  listLoaded: false,
  status: "idle",
};

export const fetchLocations = createAsyncThunk<
  DeviceLocation[],
  void,
  { rejectValue: string }
>("locations/fetchLocations", async (_, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<DeviceLocation[]> | DeviceLocation[]> =
      await axiosInstance.get("/api/v1/dmrc/device/locations");
    const payload = response.data;

    if (Array.isArray(payload)) {
      return payload;
    }

    if (!isApiSuccess(payload)) {
      return rejectWithValue(
        getApiMessage(payload, "Unable to fetch locations."),
      );
    }

    return getApiData(payload);
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to fetch locations."));
  }
});

const locationSlice = createSlice({
  name: "locations",
  initialState,
  reducers: {
    setLocationFilter(
      state,
      action: PayloadAction<{ key: string; value: string }>,
    ) {
      state.filters[action.payload.key] = action.payload.value;
    },
    clearLocationMessages(state) {
      state.error = null;
      state.successMessage = null;
    },
    clearLocationFilters(state) {
      state.filters = {};
    },
  },
  extraReducers: (builder) => {
    const pending = (state: LocationState) => {
      state.loading = true;
      state.error = null;
      state.successMessage = null;
      state.status = "loading";
    };

    const rejected = (
      state: LocationState,
      action: PayloadAction<string | undefined>,
    ) => {
      state.loading = false;
      state.error = action.payload ?? "Request failed.";
      state.status = "failed";
    };

    builder
      .addCase(fetchLocations.pending, pending)
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.status = "succeeded";
        state.listLoaded = true;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        rejected(state, action);
        state.listLoaded = true;
      });
  },
});

export const {
  setLocationFilter,
  clearLocationMessages,
  clearLocationFilters,
} = locationSlice.actions;
export default locationSlice.reducer;
