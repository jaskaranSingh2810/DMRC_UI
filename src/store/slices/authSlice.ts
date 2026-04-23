import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AxiosResponse } from "axios";
import axiosInstance from "@/api/axiosInstance";
import type { ApiEnvelope, AsyncStatus, User, UserProfile } from "@/types";
import { setAuthUser, getAuthUser, clearAuthStorage } from "@/utils/auth";
import { normalizeUser } from "@/utils/normalizeUser";
import { getApiData, getApiMessage, isApiSuccess } from "@/utils/api";
import { parseApiError } from "@/utils/errorHandler";

interface LoginPayload {
  accessToken?: string;
  token?: string;
  roles?: string[];
  user?: {
    roles?: string[];
  };
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

    const profileResponse: AxiosResponse<ApiEnvelope<UserProfile>> =
      await axiosInstance.get("/api/v1/dmrc/auth/user-profile", {
        headers: {
          Authorization: `Bearer ${baseUser.accessToken}`,
        },
      });

    const fullUser = isApiSuccess(profileResponse.data)
      ? normalizeUser(loginData, getApiData(profileResponse.data))
      : baseUser;

    setAuthUser(fullUser, remember);
    return fullUser;
  } catch (error) {
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

    const response: AxiosResponse<ApiEnvelope<UserProfile>> =
      await axiosInstance.get("/api/v1/dmrc/auth/user-profile");

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Failed to load profile.")
      );
    }

    const updatedUser = normalizeUser(existingUser, getApiData(response.data));
    setAuthUser(updatedUser, Boolean(localStorage.getItem("authUser")));
    return updatedUser;
  } catch (error) {
    return rejectWithValue(parseApiError(error, "Failed to load profile."));
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
      { email }
    );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to send reset link.")
      );
    }

    return getApiMessage(response.data, "Reset link sent successfully.");
  } catch (error) {
    return rejectWithValue(
      parseApiError(error, "Unable to send reset link.")
    );
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
      }
    );

    if (!isApiSuccess(response.data)) {
      return rejectWithValue(
        getApiMessage(response.data, "Unable to reset password.")
      );
    }

    return getApiMessage(response.data, "Password updated successfully.");
  } catch (error) {
    return rejectWithValue(
      parseApiError(error, "Unable to reset password.")
    );
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
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
      action: PayloadAction<string | undefined>
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

export const { logout, clearAuthMessages, setAuthenticatedUser } =
  authSlice.actions;
export default authSlice.reducer;
