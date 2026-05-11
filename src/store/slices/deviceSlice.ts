import axios from "axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import axiosInstance from "@/api/axiosInstance";
import type {
  ApiEnvelope,
  AsyncStatus,
  DeviceDetails,
  DevicePayload,
  DeviceRecord,
  DeviceResolutionHistoryRecord,
} from "@/types";
import { getApiData, getApiMessage, isApiSuccess } from "@/utils/api";
import { parseApiError } from "@/utils/errorHandler";

interface DeviceFilters {
  [key: string]: string;
}

interface DeviceState {
  items: DeviceRecord[];
  currentDevice: DeviceRecord | null;
  currentDeviceDetails: DeviceDetails | null;
  loading: boolean;
  detailsLoading: boolean;
  resolveLoading: boolean;
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
  currentDeviceDetails: null,
  loading: false,
  detailsLoading: false,
  resolveLoading: false,
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
  landmark?: string;
}

interface RemoveDeviceRequest {
  id: number;
  userName: string;
  remarks: string;
}

interface ResolveDeviceRequest {
  id: number;
  deviceCode: string;
  locationId: number;
  reason: string;
  resolvedBy?: string;
  resolvedById?: string | number;
  userName: string;
}

interface FetchDeviceDetailsRequest {
  id: number;
  deviceCode?: string;
}

interface DeviceDownloadPayload {
  blob: Blob;
  filename: string;
}

interface DeviceStatusUpdateResult {
  message: string;
}

type UnknownRecord = Record<string, unknown>;

function getRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" ? (value as UnknownRecord) : null;
}

function getString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function getNumber(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function normalizeDeviceRecord(
  value: unknown,
  fallback?: Partial<DeviceRecord>,
): DeviceRecord {
  const record = getRecord(value) ?? {};
  const locations = getRecord(record.locations);
  const locationName =
    getString(record.locationName) ||
    getString(locations?.locationName) ||
    getString(fallback?.locationName) ||
    getString(getRecord(fallback?.locations)?.locationName);

  return {
    id: getNumber(record.id ?? fallback?.id),
    deviceCode: getString(record.deviceCode ?? fallback?.deviceCode),
    brand: getString(record.brand ?? fallback?.brand),
    model: getString(record.model ?? fallback?.model),
    landmark: getString(record.landmark ?? fallback?.landmark, "") || null,
    orientation: getString(record.orientation ?? fallback?.orientation),
    locationId: getNumber(record.locationId ?? fallback?.locationId),
    deviceSize: getNumber(record.deviceSize ?? fallback?.deviceSize),
    createdAt: getString(record.createdAt ?? fallback?.createdAt),
    createdBy: getString(record.createdBy ?? fallback?.createdBy),
    status: getString(record.status ?? fallback?.status),
    remarks: getString(record.remarks ?? fallback?.remarks, "") || null,
    updatedAt: getString(record.updatedAt ?? fallback?.updatedAt, "") || undefined,
    updatedBy: getString(record.updatedBy ?? fallback?.updatedBy, "") || undefined,
    deleted:
      typeof record.deleted === "boolean"
        ? record.deleted
        : typeof fallback?.deleted === "boolean"
          ? fallback.deleted
          : undefined,
    locations: locationName
      ? {
          locationId:
            getString(locations?.locationId) || getString(fallback?.locationId),
          locationName,
        }
      : fallback?.locations,
    locationName,
    device: getString(record.device ?? fallback?.device, "") || undefined,
  };
}

function normalizeResolutionHistoryEntry(
  value: unknown,
): DeviceResolutionHistoryRecord {
  const record = getRecord(value) ?? {};

  return {
    id: getString(record.id || record.historyId || record.resolutionId, "") || undefined,
    remarks:
      getString(record.remarks) ||
      getString(record.remark) ||
      getString(record.reason) ||
      "-",
    resolvedBy:
      getString(record.resolvedBy) ||
      getString(record.resolveBy) ||
      getString(record.updatedBy) ||
      getString(record.createdBy) ||
      "-",
    resolvedDate:
      getString(record.resolvedDate) ||
      getString(record.resolveDate) ||
      getString(record.updatedAt) ||
      getString(record.createdAt) ||
      "-",
  };
}

function normalizeDeviceDetails(
  payload: unknown,
  fallback?: Partial<DeviceRecord>,
): DeviceDetails {
  const record = getRecord(payload) ?? {};
  const nestedDevice =
    getRecord(record.device) ??
    getRecord(record.deviceDetails) ??
    getRecord(record.details) ??
    record;
  const historySource =
    record.resolutionHistory ??
    record.deviceResolutionHistory ??
    record.history ??
    getRecord(record.device)?.resolutionHistory ??
    [];

  return {
    device: normalizeDeviceRecord(nestedDevice, fallback),
    resolutionHistory: Array.isArray(historySource)
      ? historySource.map(normalizeResolutionHistoryEntry)
      : [],
  };
}

async function requestApiData<TData>(
  config: AxiosRequestConfig,
  fallbackMessage: string,
): Promise<TData> {
  const response: AxiosResponse<ApiEnvelope<TData>> =
    await axiosInstance.request(config);

  if (!isApiSuccess(response.data)) {
    throw new Error(getApiMessage(response.data, fallbackMessage));
  }

  return getApiData(response.data);
}

async function requestApiMessage(
  config: AxiosRequestConfig,
  fallbackMessage: string,
): Promise<string> {
  const response: AxiosResponse<ApiEnvelope<unknown>> =
    await axiosInstance.request(config);

  if (!isApiSuccess(response.data)) {
    throw new Error(getApiMessage(response.data, fallbackMessage));
  }

  return getApiMessage(response.data, fallbackMessage);
}

async function requestWithFallback<TData>(
  candidates: AxiosRequestConfig[],
  fallbackMessage: string,
  mode: "data" | "message" = "data",
): Promise<TData | string> {
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      if (mode === "message") {
        return await requestApiMessage(candidate, fallbackMessage);
      }

      return await requestApiData<TData>(candidate, fallbackMessage);
    } catch (error) {
      lastError = error;

      if (
        axios.isAxiosError(error) &&
        error.response &&
        ![404, 405].includes(error.response.status)
      ) {
        break;
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error(fallbackMessage);
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
    const landmarkQuery = payload.landmark?.trim()
      ? `?landmark=${encodeURIComponent(payload.landmark.trim())}`
      : "";
    const response: AxiosResponse<ApiEnvelope<DeviceRecord>> =
      await axiosInstance.post(
        `/api/v1/dmrc/device/status/${payload.locationId}/${encodeURIComponent(
          payload.deviceCode,
        )}/${payload.status}${landmarkQuery}`,
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

export const resolveDevice = createAsyncThunk<
  DeviceStatusUpdateResult,
  ResolveDeviceRequest,
  { rejectValue: string }
>("devices/resolve", async (payload, { rejectWithValue }) => {
  try {
    const requestBody = {
      id: payload.id,
      deviceId: payload.id,
      deviceCode: payload.deviceCode,
      locationId: payload.locationId,
      remarks: payload.reason.trim(),
      reason: payload.reason.trim(),
      resolvedBy: payload.resolvedBy?.trim() || undefined,
      resolvedById: payload.resolvedById,
      updatedBy: payload.userName,
      userName: payload.userName,
      status: "Resolved",
    };

    const message = (await requestWithFallback<string>(
      [
        {
          method: "post",
          url: "/api/v1/dmrc/device/resolve",
          data: requestBody,
        },
        {
          method: "post",
          url: `/api/v1/dmrc/device/resolve/${payload.id}`,
          data: requestBody,
        },
        {
          method: "patch",
          url: `/api/v1/dmrc/device/${payload.id}/resolve`,
          data: requestBody,
        },
        {
          method: "patch",
          url: "/api/v1/dmrc/device/update-resolution",
          data: requestBody,
        },
      ],
      "Unable to resolve device.",
      "message",
    )) as string;

    return {
      message,
    };
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to resolve device."));
  }
});

export const fetchDeviceDetails = createAsyncThunk<
  DeviceDetails,
  FetchDeviceDetailsRequest,
  { state: { devices: DeviceState }; rejectValue: string }
>("devices/fetchDetails", async (payload, { getState, rejectWithValue }) => {
  try {
    const fallbackDevice = getState().devices.items.find(
      (device) => device.id === payload.id,
    );

    const data = (await requestWithFallback<unknown>(
      [
        {
          method: "get",
          url: `/api/v1/dmrc/device/${payload.id}`,
        },
        {
          method: "get",
          url: `/api/v1/dmrc/device/${payload.id}/details`,
        },
        {
          method: "get",
          url: `/api/v1/dmrc/device/${payload.id}`,
        },
        ...(payload.deviceCode
          ? [
              {
                method: "get" as const,
                url: `/api/v1/dmrc/device/deviceCode/${encodeURIComponent(
                  payload.deviceCode,
                )}`,
              },
            ]
          : []),
      ],
      "Unable to fetch device details.",
      "data",
    )) as unknown;

    return normalizeDeviceDetails(data, fallbackDevice);
  } catch (error) {
    return rejectWithValue(
      parseApiError(error, "Unable to fetch device details."),
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
    clearCurrentDeviceDetails(state) {
      state.currentDeviceDetails = null;
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
      .addCase(resolveDevice.pending, (state) => {
        state.resolveLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(resolveDevice.fulfilled, (state, action) => {
        state.resolveLoading = false;
        state.successMessage = action.payload.message;
        state.status = "succeeded";
      })
      .addCase(resolveDevice.rejected, (state, action) => {
        state.resolveLoading = false;
        state.error = action.payload ?? "Unable to resolve device.";
        state.status = "failed";
      })
      .addCase(fetchDeviceDetails.pending, (state) => {
        state.detailsLoading = true;
        state.error = null;
      })
      .addCase(fetchDeviceDetails.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.currentDeviceDetails = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchDeviceDetails.rejected, (state, action) => {
        state.detailsLoading = false;
        state.error = action.payload ?? "Unable to fetch device details.";
        state.status = "failed";
      })
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
  clearCurrentDeviceDetails,
} = deviceSlice.actions;
export default deviceSlice.reducer;
