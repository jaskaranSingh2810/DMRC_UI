import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AxiosResponse } from "axios";
import axiosInstance from "@/api/axiosInstance";
import type {
  ApiEnvelope,
  AsyncStatus,
  SidebarMenuItem,
  User,
  UserProfile,
} from "@/types";
import {
  clearAuthStorage,
  getAuthUser,
  isRememberedAuth,
  setAuthUser,
} from "@/utils/auth";
import { normalizeUser } from "@/utils/normalizeUser";
import { getApiData, getApiMessage, isApiSuccess } from "@/utils/api";
import { parseApiError } from "@/utils/errorHandler";

interface LoginPayload {
  accessToken: string;
  accessTokenExpiresAt?: number;
  refreshToken?: string;
  message?: string;
  success?: boolean;
  time?: string;
  status?: string;
}

interface RefreshResponse {
  status?: string;
  accessToken?: string;
  refreshToken?: string;
  message?: string;
  success?: boolean;
}

interface LoginRequest {
  username: string;
  password: string;
  remember: boolean;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  password: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  status: AsyncStatus;
}

const storedUser = getAuthUser();

const initialState: AuthState = {
  user: storedUser,
  loading: false,
  error: null,
  successMessage: null,
  status: "idle",
};

async function requestUserProfile(): Promise<UserProfile> {
  const response: AxiosResponse<ApiEnvelope<UserProfile>> = await axiosInstance.get(
    "/api/v1/dmrc/auth/user-profile",
  );

  if (!isApiSuccess(response.data)) {
    throw new Error(getApiMessage(response.data, "Failed to load profile."));
  }

  return getApiData(response.data);
}

async function requestMenu(): Promise<SidebarMenuItem[]> {
  const response: AxiosResponse<ApiEnvelope<SidebarMenuItem[]>> =
    await axiosInstance.get("/api/v1/dmrc/auth/menu");

  if (!isApiSuccess(response.data)) {
    throw new Error(getApiMessage(response.data, "Failed to load menu."));
  }

  return getApiData(response.data);
}

export const loginUser = createAsyncThunk<
  User,
  LoginRequest,
  { rejectValue: string }
>("auth/login", async ({ username, password, remember }, { rejectWithValue }) => {
  try {
    const loginResponse: AxiosResponse<ApiEnvelope<LoginPayload>> =
      await axiosInstance.post("/api/v1/dmrc/auth/login", {
        username,
        password,
      });

    if (!isApiSuccess(loginResponse.data)) {
      return rejectWithValue(getApiMessage(loginResponse.data, "Login failed."));
    }

    const loginData = getApiData(loginResponse.data);
    const baseUser = normalizeUser(loginData);

    setAuthUser(baseUser, remember);

    const [profile, menu] = await Promise.all([requestUserProfile(), requestMenu()]);
    const fullUser = normalizeUser(loginData, profile, menu);

    setAuthUser(fullUser, remember);
    return fullUser;
  } catch (error) {
    clearAuthStorage();
    return rejectWithValue(parseApiError(error, "Unable to login."));
  }
});

export const fetchProfile = createAsyncThunk<
  User,
  void,
  { state: { auth: AuthState }; rejectValue: string }
>("auth/fetchProfile", async (_, { getState, rejectWithValue }) => {
  try {
    const existingUser = getState().auth.user ?? getAuthUser();

    if (!existingUser?.accessToken) {
      throw new Error("No active session found.");
    }

    const profile = await requestUserProfile();
    const updatedUser = normalizeUser(
      existingUser,
      profile,
      existingUser.menu ?? [],
    );

    setAuthUser(updatedUser, isRememberedAuth());
    return updatedUser;
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Failed to load profile."));
  }
});

export const fetchMenu = createAsyncThunk<
  User,
  void,
  { state: { auth: AuthState }; rejectValue: string }
>("auth/fetchMenu", async (_, { getState, rejectWithValue }) => {
  try {
    const existingUser = getState().auth.user ?? getAuthUser();

    if (!existingUser?.accessToken) {
      throw new Error("No active session found.");
    }

    const menu = await requestMenu();
    const updatedUser: User = {
      ...existingUser,
      menu,
    };

    setAuthUser(updatedUser, isRememberedAuth());
    return updatedUser;
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Failed to load menu."));
  }
});

export const refreshAuthToken = createAsyncThunk<
  User,
  void,
  { state: { auth: AuthState }; rejectValue: string }
>("auth/refresh", async (_, { getState, rejectWithValue }) => {
  try {
    const existingUser = getState().auth.user ?? getAuthUser();

    if (!existingUser?.accessToken) {
      throw new Error("No active session found.");
    }

    const response: AxiosResponse<RefreshResponse> = await axiosInstance.post(
      "/api/v1/dmrc/auth/refresh",
      undefined,
      {
        headers: {
          Authorization: `Bearer ${existingUser.accessToken}`,
        },
      },
    );

    if (!response.data?.success || !response.data.accessToken) {
      return rejectWithValue(
        response.data?.message ?? "Unable to refresh session.",
      );
    }

    const updatedUser: User = {
      ...existingUser,
      accessToken: response.data.accessToken ?? existingUser.accessToken,
      refreshToken: response.data.refreshToken ?? existingUser.refreshToken,
    };

    setAuthUser(updatedUser, isRememberedAuth());
    return updatedUser;
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to refresh session."));
  }
});

export const logoutUser = createAsyncThunk<
  string,
  void,
  { state: { auth: AuthState }; rejectValue: string }
>("auth/logoutUser", async (_, { getState, rejectWithValue }) => {
  try {
    const existingUser = getState().auth.user ?? getAuthUser();

    if (existingUser?.accessToken) {
      const response: AxiosResponse<{ message?: string; status?: string }> =
        await axiosInstance.post("/api/v1/dmrc/auth/logout", undefined, {
          headers: {
            Authorization: `Bearer ${existingUser.accessToken}`,
          },
        });

      return response.data.message ?? "Logged out successfully.";
    }

    return "Logged out successfully.";
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to logout."));
  }
});

export const forgotPassword = createAsyncThunk<
  string,
  ForgotPasswordRequest,
  { rejectValue: string }
>("auth/forgotPassword", async ({ email }, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<unknown>> = await axiosInstance.post(
      "/api/v1/dmrc/auth/forgot-password",
      { email },
    );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to send reset link."),
      );
    }

    return getApiMessage(response.data, "Reset link sent successfully.");
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to send reset link."));
  }
});

export const resetPassword = createAsyncThunk<
  string,
  ResetPasswordRequest,
  { rejectValue: string }
>("auth/resetPassword", async ({ token, password }, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiEnvelope<unknown>> = await axiosInstance.post(
      "/api/v1/dmrc/auth/reset-password",
      {
        token,
        password,
      },
    );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to reset password."),
      );
    }

    return getApiMessage(response.data, "Password updated successfully.");
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Unable to reset password."));
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logoutLocal(state) {
      state.user = null;
      state.loading = false;
      state.error = null;
      state.successMessage = null;
      state.status = "idle";
      clearAuthStorage();
    },
    clearAuthMessages(state) {
      state.error = null;
      state.successMessage = null;
    },
    setAuthenticatedUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    setAuthMenu(state, action: PayloadAction<SidebarMenuItem[]>) {
      if (state.user) {
        state.user.menu = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    const pending = (state: AuthState) => {
      state.loading = true;
      state.error = null;
      state.successMessage = null;
      state.status = "loading";
    };

    const rejected = (
      state: AuthState,
      action: PayloadAction<string | undefined>,
    ) => {
      state.loading = false;
      state.error = action.payload ?? "Request failed.";
      state.status = "failed";
    };

    builder
      .addCase(loginUser.pending, pending)
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.status = "succeeded";
      })
      .addCase(loginUser.rejected, rejected)
      .addCase(fetchProfile.pending, pending)
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchProfile.rejected, rejected)
      .addCase(fetchMenu.pending, pending)
      .addCase(fetchMenu.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchMenu.rejected, rejected)
      .addCase(refreshAuthToken.pending, pending)
      .addCase(refreshAuthToken.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.status = "succeeded";
      })
      .addCase(refreshAuthToken.rejected, rejected)
      .addCase(logoutUser.pending, pending)
      .addCase(logoutUser.fulfilled, (state, action) => {
        state.user = null;
        state.loading = false;
        state.error = null;
        state.successMessage = action.payload;
        state.status = "idle";
        clearAuthStorage();
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.user = null;
        state.loading = false;
        state.error = action.payload ?? null;
        state.successMessage = null;
        state.status = "idle";
        clearAuthStorage();
      })
      .addCase(forgotPassword.pending, pending)
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload;
        state.status = "succeeded";
      })
      .addCase(forgotPassword.rejected, rejected)
      .addCase(resetPassword.pending, pending)
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload;
        state.status = "succeeded";
      })
      .addCase(resetPassword.rejected, rejected);
  },
});

export const {
  logoutLocal,
  clearAuthMessages,
  setAuthenticatedUser,
  setAuthMenu,
} = authSlice.actions;
export default authSlice.reducer;
