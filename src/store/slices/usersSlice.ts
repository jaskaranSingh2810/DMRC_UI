import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import {
  createUserRecord,
  fetchUserById as fetchUserByIdRequest,
  fetchUserModules as fetchUserModulesRequest,
  fetchUserRoles as fetchUserRolesRequest,
  fetchUsersList,
  requestUserPasswordReset,
  updateUserRecord,
  updateUserStatusRecord,
} from "@/api/userManagementService";
import { parseApiError } from "@/utils/errorHandler";
import type { AsyncStatus } from "@/types";
import type {
  ManagedUserFormPayload,
  ManagedUserRecord,
  ManagedUserStatusSummary,
  UserModuleFilter,
  UserModuleOption,
  UserRoleOption,
} from "@/types/user";
import type {
  UserListRequest,
  UserStatFilter,
} from "@/pages/UserManagement/userListRequest";

interface UserFilters {
  [key: string]: string;
}

interface FetchUsersResult {
  content: ManagedUserRecord[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  summary: ManagedUserStatusSummary;
}

interface UserState {
  items: ManagedUserRecord[];
  currentUser: ManagedUserRecord | null;
  availableModules: UserModuleOption[];
  availableRoles: UserRoleOption[];
  loading: boolean;
  modulesLoading: boolean;
  rolesLoading: boolean;
  passwordResetLoading: boolean;
  error: string | null;
  successMessage: string | null;
  passwordResetMessage: string | null;
  status: AsyncStatus;
  filters: UserFilters;
  listLoaded: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  sorting: UserListRequest["sortCriteria"];
  selectedModules: UserModuleFilter[];
  selectedStatFilter: UserStatFilter;
  summary: ManagedUserStatusSummary;
}

interface UpdateUserPayload extends ManagedUserFormPayload {
  id: string | number;
}

interface UpdateUserStatusRequest {
  id: string | number;
  status: "Active" | "Inactive";
}

const initialSummary: ManagedUserStatusSummary = {
  totalUsers: 0,
  activeUsers: 0,
  inactiveUsers: 0,
};

const initialState: UserState = {
  items: [],
  currentUser: null,
  availableModules: [],
  availableRoles: [],
  loading: false,
  modulesLoading: false,
  rolesLoading: false,
  passwordResetLoading: false,
  error: null,
  successMessage: null,
  passwordResetMessage: null,
  status: "idle",
  filters: {},
  listLoaded: false,
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  pageSize: 10,
  sorting: [],
  selectedModules: [],
  selectedStatFilter: "all",
  summary: initialSummary,
};

export const fetchUsers = createAsyncThunk<
  FetchUsersResult,
  UserListRequest | void,
  { rejectValue: string }
>("users/fetchUsers", async (payload, { rejectWithValue }) => {
  try {
    return await fetchUsersList({
      page: payload?.page ?? 0,
      size: payload?.size ?? 10,
      ...(payload?.empId ? { empId: payload.empId } : {}),
      ...(payload?.employeeName ? { employeeName: payload.employeeName } : {}),
      ...(payload?.emailId ? { emailId: payload.emailId } : {}),
      ...(payload?.mobileNumber ? { mobileNumber: payload.mobileNumber } : {}),
      ...(payload?.lastLoggedIn ? { lastLoggedIn: payload.lastLoggedIn } : {}),
      ...(payload?.createdOn ? { createdOn: payload.createdOn } : {}),
      ...(payload?.createdBy ? { createdBy: payload.createdBy } : {}),
      ...(payload?.status ? { status: payload.status } : {}),
      ...(payload?.moduleIds?.length ? { moduleIds: payload.moduleIds } : {}),
      ...(payload?.sortCriteria?.length
        ? { sortCriteria: payload.sortCriteria }
        : {}),
    });
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to fetch users."));
  }
});

export const fetchUserById = createAsyncThunk<
  ManagedUserRecord,
  { id: string | number },
  { rejectValue: string }
>("users/fetchUserById", async ({ id }, { rejectWithValue }) => {
  try {
    return await fetchUserByIdRequest(id);
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to fetch user."));
  }
});

export const fetchUserModules = createAsyncThunk<
  UserModuleOption[],
  void,
  { rejectValue: string }
>("users/fetchModules", async (_, { rejectWithValue }) => {
  try {
    return await fetchUserModulesRequest();
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to fetch modules."));
  }
});

export const fetchUserRoles = createAsyncThunk<
  UserRoleOption[],
  void,
  { rejectValue: string }
>("users/fetchRoles", async (_, { rejectWithValue }) => {
  try {
    return await fetchUserRolesRequest();
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to fetch roles."));
  }
});

export const createUser = createAsyncThunk<
  ManagedUserRecord,
  ManagedUserFormPayload,
  { rejectValue: string }
>("users/createUser", async (payload, { rejectWithValue }) => {
  try {
    return await createUserRecord(payload);
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to create user."));
  }
});

export const updateUser = createAsyncThunk<
  ManagedUserRecord,
  UpdateUserPayload,
  { rejectValue: string }
>("users/updateUser", async (payload, { rejectWithValue }) => {
  try {
    return await updateUserRecord(payload);
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to update user."));
  }
});

export const updateUserStatus = createAsyncThunk<
  { id: string | number; status: "Active" | "Inactive"; message: string },
  UpdateUserStatusRequest,
  { rejectValue: string }
>("users/updateStatus", async (payload, { rejectWithValue }) => {
  try {
    const message = await updateUserStatusRecord(payload);

    return {
      ...payload,
      message,
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

export const resetUserPassword = createAsyncThunk<
  string,
  { id: string | number },
  { rejectValue: string }
>("users/resetPassword", async ({ id }, { rejectWithValue }) => {
  try {
    return await requestUserPasswordReset(id);
  } catch (error) {
    return rejectWithValue(
      parseApiError(error, "Unable to send reset password link."),
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

const usersSlice = createSlice({
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
      state.passwordResetMessage = null;
    },
    clearUserFilters(state) {
      state.filters = {};
    },
    setSelectedModules(state, action: PayloadAction<UserModuleFilter[]>) {
      state.selectedModules = action.payload;
    },
    setSelectedUserStatFilter(state, action: PayloadAction<UserStatFilter>) {
      state.selectedStatFilter = action.payload;
    },
    setUserSorting(
      state,
      action: PayloadAction<UserListRequest["sortCriteria"]>,
    ) {
      state.sorting = action.payload;
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
        state.totalItems = action.payload.totalItems;
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
      .addCase(fetchUserModules.pending, (state) => {
        state.modulesLoading = true;
        state.error = null;
      })
      .addCase(fetchUserModules.fulfilled, (state, action) => {
        state.modulesLoading = false;
        state.availableModules = action.payload
      })
      .addCase(fetchUserModules.rejected, (state, action) => {
        state.modulesLoading = false;
        state.error = action.payload ?? "Unable to fetch modules.";
      })
      .addCase(fetchUserRoles.pending, (state) => {
        state.rolesLoading = true;
        state.error = null;
      })
      .addCase(fetchUserRoles.fulfilled, (state, action) => {
        state.rolesLoading = false;
        state.availableRoles = action.payload;
      })
      .addCase(fetchUserRoles.rejected, (state, action) => {
        state.rolesLoading = false;
        state.error = action.payload ?? "Unable to fetch roles.";
      })
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
        state.items = state.items.map((user) =>
          String(user.id) === String(action.payload.id)
            ? {
                ...user,
                status: action.payload.status,
              }
            : user,
        );
        state.successMessage = action.payload.message;
        state.status = "succeeded";
      })
      .addCase(updateUserStatus.rejected, rejected)
      .addCase(resetUserPassword.pending, (state) => {
        state.passwordResetLoading = true;
        state.error = null;
      })
      .addCase(resetUserPassword.fulfilled, (state, action) => {
        state.passwordResetLoading = false;
        state.passwordResetMessage = action.payload;
      })
      .addCase(resetUserPassword.rejected, (state, action) => {
        state.passwordResetLoading = false;
        state.error = action.payload ?? "Unable to send reset password link.";
      });
  },
});

export const {
  setUserFilter,
  clearUserMessages,
  clearUserFilters,
  setSelectedModules,
  setSelectedUserStatFilter,
  setUserSorting,
  clearCurrentUser,
} = usersSlice.actions;
export default usersSlice.reducer;
