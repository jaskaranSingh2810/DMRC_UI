import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  clearAuthStorage,
  getAuthUser,
  getToken,
  isRememberedAuth,
  setAuthUser,
} from "@/utils/auth";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8086";

const axiosInstance = axios.create({
  baseURL,
});

const refreshClient = axios.create({
  baseURL,
});

let refreshPromise: Promise<string | null> | null = null;

function forceLogout(): void {
  clearAuthStorage();

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const existingUser = getAuthUser();

  if (!existingUser?.accessToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post("/api/v1/dmrc/auth/refresh", undefined, {
        headers: {
          Authorization: `Bearer ${existingUser.accessToken}`,
        },
      })
      .then((response) => {
        if (!response.data?.success || !response.data?.accessToken) {
          throw new Error(response.data?.message ?? "Unable to refresh session.");
        }

        const updatedUser = {
          ...existingUser,
          accessToken: response.data.accessToken ?? existingUser.accessToken,
          refreshToken: response.data.refreshToken ?? existingUser.refreshToken,
        };

        setAuthUser(updatedUser, isRememberedAuth());
        return updatedUser.accessToken;
      })
      .catch((error) => {
        forceLogout();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getToken();
    const isLoginRequest = config.url?.includes("/auth/login") ?? false;

    if (token && !isLoginRequest) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const requestUrl = originalRequest?.url ?? "";
    const isRefreshRequest = requestUrl.includes("/auth/refresh");
    const isLogoutRequest = requestUrl.includes("/auth/logout");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshRequest &&
      !isLogoutRequest
    ) {
      originalRequest._retry = true;

      try {
        const nextAccessToken = await refreshAccessToken();

        if (nextAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
          return axiosInstance(originalRequest);
        }
      } catch {
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401 && (isRefreshRequest || isLogoutRequest)) {
      forceLogout();
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
