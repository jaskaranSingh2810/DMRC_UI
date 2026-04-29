import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AxiosResponse } from "axios";
import axiosInstance from "@/api/axiosInstance";
import type {
  ApiEnvelope,
  AsyncStatus,
  DevicePayload,
  DeviceRecord,
} from "@/types";
import { getApiData, getApiMessage, isApiSuccess } from "@/utils/api";
import { parseApiError } from "@/utils/errorHandler";

interface DeviceFilters {
  [key: string]: string;
}

interface DeviceState {
  items: DeviceRecord[];
  currentDevice: DeviceRecord | null;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  status: AsyncStatus;
  filters: DeviceFilters;
  listLoaded: boolean;
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  selectedLocationId: string;
  summary: {
    totalDevices: number;
    activeDevices: number;
    inactiveDevices: number;
    notWorkingDevices: number;
    unRegisteredDevices: number;
  };
}

const initialState: DeviceState = {
  items: [],
  currentDevice: null,
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
  selectedLocationId: "",
  summary: {
    totalDevices: 0,
    activeDevices: 0,
    inactiveDevices: 0,
    notWorkingDevices: 0,
    unRegisteredDevices: 0,
  },
};

interface PaginatedDevices {
  summary?: {
    totalDevices: number;
    activeDevices: number;
    inactiveDevices: number;
    notWorkingDevices: number;
    unRegisteredDevices: number;
  };
  content: DeviceRecord[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  isFirst: boolean;
  isLast: boolean;
}

interface DeviceListRequest {
  page: number;
  size: number;
  locationIds?: number[];
  deviceCode?: string;
  brand?: string;
  model?: string;
  landmark?: string;
  status?: string;
  orientation?: string;
  deviceSize?: number;
  createdBy?: string;
  createdAt?: string;
  sortCriteria?: DeviceSortCriteria[];
}

interface DeviceSortCriteria {
  field: string;
  direction: "ASC" | "DESC";
}

interface UpdateDeviceRequest {
  id: number;
  userName: string;
  brand: string;
  model: string;
  landmark?: string;
  orientation: string;
  locationId: number;
  deviceSize: number;
}

interface UpdateDeviceStatusRequest {
  locationId: number;
  deviceCode: string;
  status: "Active" | "Inactive";
}

interface RemoveDeviceRequest {
  id: number;
  userName: string;
  remarks: string;
}

interface DeviceDownloadPayload {
  blob: Blob;
  filename: string;
}

interface DeviceStatusUpdateResult {
  message: string;
}

export const fetchDevices = createAsyncThunk<
  PaginatedDevices,
  DeviceListRequest | void,
  { rejectValue: string }
>("devices/fetchDevices", async (payload, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<PaginatedDevices>> =
      await axiosInstance.post("/api/v1/dmrc/device/list", {
        page: payload?.page ?? 0,
        size: payload?.size ?? 10,
        ...("locationIds" in (payload ?? {})
          ? { locationIds: payload?.locationIds ?? [] }
          : {}),
        ...(payload?.deviceCode ? { deviceCode: payload.deviceCode } : {}),
        ...(payload?.brand ? { brand: payload.brand } : {}),
        ...(payload?.model ? { model: payload.model } : {}),
        ...(payload?.landmark ? { landmark: payload.landmark } : {}),
        ...(payload?.status ? { status: payload.status } : {}),
        ...(payload?.orientation ? { orientation: payload.orientation } : {}),
        ...(typeof payload?.deviceSize === "number"
          ? { deviceSize: payload.deviceSize }
          : {}),
        ...(payload?.createdBy ? { createdBy: payload.createdBy } : {}),
        ...(payload?.createdAt ? { createdAt: payload.createdAt } : {}),
        ...(payload?.sortCriteria?.length
          ? { sortCriteria: payload.sortCriteria }
          : {}),
      });

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to fetch devices."),
      );
    }

    return getApiData(response.data);
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to fetch devices."));
  }
});

export const fetchDeviceByCode = createAsyncThunk<
  DeviceRecord,
  { deviceCode: string },
  { rejectValue: string }
>("devices/fetchByCode", async ({ deviceCode }, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<DeviceRecord>> =
      await axiosInstance.get(
        `/api/v1/dmrc/device/deviceCode/${encodeURIComponent(deviceCode)}`,
      );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to fetch device."),
      );
    }

    return getApiData(response.data);
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to fetch device."));
  }
});

export const createDevice = createAsyncThunk<
  DeviceRecord,
  DevicePayload,
  { rejectValue: string }
>("devices/create", async (payload, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<DeviceRecord>> =
      await axiosInstance.post("/api/v1/dmrc/device/create-device", payload);

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to create device."),
      );
    }

    return getApiData(response.data);
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to create device."));
  }
});

export const updateDevice = createAsyncThunk<
  DeviceRecord,
  UpdateDeviceRequest,
  { rejectValue: string }
>("devices/update", async (payload, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<DeviceRecord>> =
      await axiosInstance.patch("/api/v1/dmrc/device/update", payload);

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to update device."),
      );
    }

    return getApiData(response.data);
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to update device."));
  }
});

export const updateDeviceStatus = createAsyncThunk<
  DeviceStatusUpdateResult,
  UpdateDeviceStatusRequest,
  { rejectValue: string }
>("devices/updateStatus", async (payload, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<DeviceRecord>> =
      await axiosInstance.post(
        `/api/v1/dmrc/device/status/${payload.locationId}/${encodeURIComponent(
          payload.deviceCode,
        )}/${payload.status}`,
      );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(
          response.data,
          `Unable to mark device ${payload.status.toLowerCase()}.`,
        ),
      );
    }

    return {
      message: getApiMessage(
        response.data,
        `Device marked ${payload.status.toLowerCase()}.`,
      ),
    };
  } catch (error) {
    return rejectWithValue(
      parseApiError(
        error,
        `Unable to mark device ${payload.status.toLowerCase()}.`,
      ),
    );
  }
});

export const downloadDevices = createAsyncThunk<
  DeviceDownloadPayload,
  void,
  { rejectValue: string }
>("devices/download", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get("/api/v1/dmrc/device/download", {
      responseType: "blob",
    });
    const contentDisposition = response.headers["content-disposition"] as
      | string
      | undefined;
    const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/i);
    const resolvedFilename = filenameMatch?.[1] ?? "device-script";
    const batchFilename = resolvedFilename.toLowerCase().endsWith(".bat")
      ? resolvedFilename
      : `${resolvedFilename.replace(/\.[^.]+$/, "")}.bat`;

    return {
      blob: response.data as Blob,
      filename: batchFilename,
    };
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to download script."));
  }
});

export const removeDevice = createAsyncThunk<
  DeviceRecord,
  RemoveDeviceRequest,
  { rejectValue: string }
>("devices/remove", async (payload, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<DeviceRecord>> =
      await axiosInstance.delete("/api/v1/dmrc/device/remove", {
        data: payload,
      });

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to remove device."),
      );
    }

    return getApiData(response.data);
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to remove device."));
  }
});

function upsertDevice(
  devices: DeviceRecord[],
  nextDevice: DeviceRecord,
): DeviceRecord[] {
  const index = devices.findIndex((device) => device.id === nextDevice.id);

  if (index === -1) {
    return [nextDevice, ...devices];
  }

  const copy = [...devices];
  copy[index] = {
    ...copy[index],
    ...nextDevice,
  };
  return copy;
}

const deviceSlice = createSlice({
  name: "devices",
  initialState,
  reducers: {
    setDeviceFilter(
      state,
      action: PayloadAction<{ key: string; value: string }>,
    ) {
      state.filters[action.payload.key] = action.payload.value;
    },

    clearDeviceMessages(state) {
      state.error = null;
      state.successMessage = null;
    },
    setSelectedLocationId(state, action: PayloadAction<string>) {
      state.selectedLocationId = action.payload;
    },
    clearDeviceFilters(state) {
      state.filters = {};
    },
  },
  extraReducers: (builder) => {
    const pending = (state: DeviceState) => {
      state.loading = true;
      state.error = null;
      state.successMessage = null;
      state.status = "loading";
    };

    const rejected = (
      state: DeviceState,
      action: PayloadAction<string | undefined>,
    ) => {
      state.loading = false;
      state.error = action.payload ?? "Request failed.";
      state.status = "failed";
    };

    builder
      .addCase(fetchDevices.pending, pending)
      .addCase(fetchDevices.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload?.content ?? [];
        state.summary = action.payload?.summary ?? initialState.summary;
        state.currentPage = (action.payload?.currentPage ?? 0) + 1;
        state.totalPages = action.payload?.totalPages ?? 1;
        state.totalElements = action.payload?.totalElements ?? 0;
        state.pageSize = action.payload?.pageSize ?? state.pageSize;
        state.status = "succeeded";
        state.listLoaded = true;
      })
      .addCase(fetchDevices.rejected, (state, action) => {
        rejected(state, action);
        state.listLoaded = true;
      })
      .addCase(fetchDeviceByCode.pending, pending)
      .addCase(fetchDeviceByCode.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDevice = action.payload;
        state.successMessage = "Device loaded successfully.";
        state.status = "succeeded";
      })
      .addCase(fetchDeviceByCode.rejected, rejected)
      .addCase(createDevice.pending, pending)
      .addCase(createDevice.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDevice = action.payload;
        state.items = upsertDevice(state.items, action.payload);
        state.successMessage = "Device created successfully.";
        state.status = "succeeded";
      })
      .addCase(createDevice.rejected, rejected)
      .addCase(updateDevice.pending, pending)
      .addCase(updateDevice.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDevice = action.payload;
        state.items = upsertDevice(state.items, action.payload);
        state.successMessage = "Device updated successfully.";
        state.status = "succeeded";
      })
      .addCase(updateDevice.rejected, rejected)
      .addCase(updateDeviceStatus.pending, pending)
      .addCase(updateDeviceStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
        state.status = "succeeded";
      })
      .addCase(updateDeviceStatus.rejected, rejected)
      .addCase(downloadDevices.pending, pending)
      .addCase(downloadDevices.fulfilled, (state) => {
        state.loading = false;
        state.successMessage = "Script downloaded successfully.";
        state.status = "succeeded";
      })
      .addCase(downloadDevices.rejected, rejected)
      .addCase(removeDevice.pending, pending)
      .addCase(removeDevice.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDevice = action.payload;
        state.items = upsertDevice(state.items, action.payload);
        state.successMessage = "Device removed successfully.";
        state.status = "succeeded";
      })
      .addCase(removeDevice.rejected, rejected);
  },
});

export const {
  setDeviceFilter,
  clearDeviceMessages,
  setSelectedLocationId,
  clearDeviceFilters,
} = deviceSlice.actions;
export default deviceSlice.reducer;
