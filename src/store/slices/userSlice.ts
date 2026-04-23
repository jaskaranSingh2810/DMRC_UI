import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AxiosResponse } from "axios";
import axiosInstance from "@/api/axiosInstance";
import type { ApiEnvelope, AsyncStatus, ManagedUserRecord } from "@/types";
import { getApiData, getApiMessage, isApiSuccess } from "@/utils/api";
import { parseApiError } from "@/utils/errorHandler";

interface UserFilters {
  [key: string]: string;
}

interface UserState {
  items: ManagedUserRecord[];
  currentUser: ManagedUserRecord | null;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  status: AsyncStatus;
  filters: UserFilters;
  listLoaded: boolean;
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  selectedModule: string;
}

const initialState: UserState = {
  items: [],
  currentUser: null,
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
  selectedModule: "all",
};

interface PaginatedUsers {
  content: ManagedUserRecord[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  isFirst: boolean;
  isLast: boolean;
}

interface UserListRequest {
  page: number;
  size: number;
  sortCriteria?: UserSortCriteria[];
}

interface UserSortCriteria {
  field: string;
  direction: "ASC" | "DESC";
}

interface UpdateUserStatusRequest {
  id: string | number;
  status: "Active" | "Inactive";
  userName: string;
}

export const fetchUsers = createAsyncThunk<
  PaginatedUsers,
  UserListRequest | void,
  { rejectValue: string }
>("users/fetchUsers", async (payload, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<PaginatedUsers>> =
      await axiosInstance.post("/api/v1/dmrc/user/list", {
        page: payload?.page ?? 0,
        size: payload?.size ?? 10,
        ...(payload?.sortCriteria?.length
          ? { sortCriteria: payload.sortCriteria }
          : {}),
      });

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to fetch users."),
      );
    }

    return getApiData(response.data);
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to fetch users."));
  }
});

export const updateUserStatus = createAsyncThunk<
  { message: string },
  UpdateUserStatusRequest,
  { rejectValue: string }
>("users/updateStatus", async (payload, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<ManagedUserRecord>> =
      await axiosInstance.post(
        `/api/v1/dmrc/user/status/${encodeURIComponent(String(payload.id))}/${payload.status}`,
        { userName: payload.userName },
      );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(
          response.data,
          `Unable to mark user ${payload.status.toLowerCase()}.`,
        ),
      );
    }

    return {
      message: getApiMessage(
        response.data,
        `User marked ${payload.status.toLowerCase()}.`,
      ),
    };
  } catch (error) {
    return rejectWithValue(
      parseApiError(
        error,
        `Unable to mark user ${payload.status.toLowerCase()}.`,
      ),
    );
  }
});

const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    setUserFilter(
      state,
      action: PayloadAction<{ key: string; value: string }>,
    ) {
      state.filters[action.payload.key] = action.payload.value;
    },
    clearUserMessages(state) {
      state.error = null;
      state.successMessage = null;
    },
    clearUserFilters(state) {
      state.filters = {};
    },
    setSelectedModule(state, action: PayloadAction<string>) {
      state.selectedModule = action.payload;
    },
  },
  extraReducers: (builder) => {
    const pending = (state: UserState) => {
      state.loading = true;
      state.error = null;
      state.successMessage = null;
      state.status = "loading";
    };

    const rejected = (
      state: UserState,
      action: PayloadAction<string | undefined>,
    ) => {
      state.loading = false;
      state.error = action.payload ?? "Request failed.";
      state.status = "failed";
    };

    builder
      .addCase(fetchUsers.pending, pending)
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload?.content ?? [];
        state.currentPage = (action.payload?.currentPage ?? 0) + 1;
        state.totalPages = action.payload?.totalPages ?? 1;
        state.totalElements = action.payload?.totalElements ?? 0;
        state.pageSize = action.payload?.pageSize ?? state.pageSize;
        state.status = "succeeded";
        state.listLoaded = true;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        rejected(state, action);
        state.listLoaded = true;
      })
      .addCase(updateUserStatus.pending, pending)
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
        state.status = "succeeded";
      })
      .addCase(updateUserStatus.rejected, rejected);
  },
});

export const {
  setUserFilter,
  clearUserMessages,
  clearUserFilters,
  setSelectedModule,
} = userSlice.actions;
export default userSlice.reducer;
