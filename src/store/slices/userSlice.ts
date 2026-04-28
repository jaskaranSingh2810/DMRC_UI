import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type {
  AsyncStatus,
  ManagedUserFormPayload,
  ManagedUserRecord,
  ManagedUserStatusSummary,
  UserAccessAssignment,
} from "@/types";
import {
  createManagedUserRecord,
  getManagedUserById,
  listManagedUsers,
  updateManagedUser,
  updateManagedUserAccess,
  updateManagedUserPassword,
  updateManagedUserStatus,
} from "@/pages/UserManagement/userManagementData";
import type {
  UserListRequest,
  UserStatFilter,
} from "@/pages/UserManagement/userListRequest";

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
  selectedStatFilter: UserStatFilter;
  summary: ManagedUserStatusSummary;
}

interface PaginatedUsers {
  summary: ManagedUserStatusSummary;
  content: ManagedUserRecord[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  isFirst: boolean;
  isLast: boolean;
}

interface UpdateUserPayload extends ManagedUserFormPayload {
  id: string | number;
}

interface UpdateUserStatusRequest {
  id: string | number;
  status: "Active" | "Inactive";
  userName: string;
}

interface UpdateUserPasswordRequest {
  id: string | number;
  password: string;
  userName: string;
}

interface UpdateUserAccessRequest {
  id: string | number;
  accessAssignments: UserAccessAssignment[];
  userName: string;
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
  selectedStatFilter: "all",
  summary: {
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
  },
};

export const fetchUsers = createAsyncThunk<
  PaginatedUsers,
  UserListRequest | void,
  { rejectValue: string }
>("users/fetchUsers", async (payload, { rejectWithValue }) => {
  try {
    return listManagedUsers({
      page: payload?.page ?? 0,
      size: payload?.size ?? 10,
      ...(payload?.empId ? { empId: payload.empId } : {}),
      ...(payload?.employeeName ? { employeeName: payload.employeeName } : {}),
      ...(payload?.emailId ? { emailId: payload.emailId } : {}),
      ...(payload?.mobileNumber ? { mobileNumber: payload.mobileNumber } : {}),
      ...(payload?.password ? { password: payload.password } : {}),
      ...(payload?.locationAccess
        ? { locationAccess: payload.locationAccess }
        : {}),
      ...(payload?.moduleAccess ? { moduleAccess: payload.moduleAccess } : {}),
      ...(payload?.lastLoggedIn ? { lastLoggedIn: payload.lastLoggedIn } : {}),
      ...(payload?.createdOn ? { createdOn: payload.createdOn } : {}),
      ...(payload?.createdBy ? { createdBy: payload.createdBy } : {}),
      ...(payload?.status ? { status: payload.status } : {}),
      ...(payload?.module ? { module: payload.module } : {}),
      ...(payload?.sortCriteria?.length
        ? { sortCriteria: payload.sortCriteria }
        : {}),
    });
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Unable to fetch users.",
    );
  }
});

export const fetchUserById = createAsyncThunk<
  ManagedUserRecord,
  { id: string | number },
  { rejectValue: string }
>("users/fetchUserById", async ({ id }, { rejectWithValue }) => {
  const user = getManagedUserById(id);

  if (!user) {
    return rejectWithValue("Unable to fetch user.");
  }

  return user;
});

export const createUser = createAsyncThunk<
  ManagedUserRecord,
  ManagedUserFormPayload,
  { rejectValue: string }
>("users/createUser", async (payload, { rejectWithValue }) => {
  try {
    return createManagedUserRecord(payload);
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Unable to create user.",
    );
  }
});

export const updateUser = createAsyncThunk<
  ManagedUserRecord,
  UpdateUserPayload,
  { rejectValue: string }
>("users/updateUser", async (payload, { rejectWithValue }) => {
  try {
    return updateManagedUser(payload);
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Unable to update user.",
    );
  }
});

export const updateUserStatus = createAsyncThunk<
  { message: string },
  UpdateUserStatusRequest,
  { rejectValue: string }
>("users/updateStatus", async (payload, { rejectWithValue }) => {
  try {
    updateManagedUserStatus(payload);

    return {
      message: `User marked ${payload.status.toLowerCase()}.`,
    };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : `Unable to mark user ${payload.status.toLowerCase()}.`,
    );
  }
});

export const updateUserPassword = createAsyncThunk<
  { message: string },
  UpdateUserPasswordRequest,
  { rejectValue: string }
>("users/updatePassword", async (payload, { rejectWithValue }) => {
  try {
    updateManagedUserPassword(payload);

    return {
      message: "Password changed successfully.",
    };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Unable to change password.",
    );
  }
});

export const updateUserAccess = createAsyncThunk<
  { message: string },
  UpdateUserAccessRequest,
  { rejectValue: string }
>("users/updateAccess", async (payload, { rejectWithValue }) => {
  try {
    updateManagedUserAccess(payload);

    return {
      message: "Access updated successfully.",
    };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Unable to update access.",
    );
  }
});

function upsertUser(
  users: ManagedUserRecord[],
  nextUser: ManagedUserRecord,
): ManagedUserRecord[] {
  const index = users.findIndex((user) => String(user.id) === String(nextUser.id));

  if (index === -1) {
    return [nextUser, ...users];
  }

  const nextUsers = [...users];
  nextUsers[index] = {
    ...nextUsers[index],
    ...nextUser,
  };
  return nextUsers;
}

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
    setSelectedUserStatFilter(state, action: PayloadAction<UserStatFilter>) {
      state.selectedStatFilter = action.payload;
    },
    clearCurrentUser(state) {
      state.currentUser = null;
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
        state.items = action.payload.content;
        state.summary = action.payload.summary;
        state.currentPage = action.payload.currentPage + 1;
        state.totalPages = action.payload.totalPages;
        state.totalElements = action.payload.totalElements;
        state.pageSize = action.payload.pageSize;
        state.status = "succeeded";
        state.listLoaded = true;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        rejected(state, action);
        state.listLoaded = true;
      })
      .addCase(fetchUserById.pending, pending)
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchUserById.rejected, rejected)
      .addCase(createUser.pending, pending)
      .addCase(createUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
        state.items = upsertUser(state.items, action.payload);
        state.successMessage = "User created successfully.";
        state.status = "succeeded";
      })
      .addCase(createUser.rejected, rejected)
      .addCase(updateUser.pending, pending)
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
        state.items = upsertUser(state.items, action.payload);
        state.successMessage = "User updated successfully.";
        state.status = "succeeded";
      })
      .addCase(updateUser.rejected, rejected)
      .addCase(updateUserStatus.pending, pending)
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
        state.status = "succeeded";
      })
      .addCase(updateUserStatus.rejected, rejected)
      .addCase(updateUserPassword.pending, pending)
      .addCase(updateUserPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
        state.status = "succeeded";
      })
      .addCase(updateUserPassword.rejected, rejected)
      .addCase(updateUserAccess.pending, pending)
      .addCase(updateUserAccess.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
        state.status = "succeeded";
      })
      .addCase(updateUserAccess.rejected, rejected);
  },
});

export const {
  setUserFilter,
  clearUserMessages,
  clearUserFilters,
  setSelectedModule,
  setSelectedUserStatFilter,
  clearCurrentUser,
} = userSlice.actions;
export default userSlice.reducer;
