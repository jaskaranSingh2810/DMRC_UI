import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { getToken, logout } from "@/utils/auth";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8086",
});

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getToken();
    const isLoginRequest = config.url?.includes("/auth/login") ?? false;

    if (token && !isLoginRequest) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
