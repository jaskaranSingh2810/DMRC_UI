import axios, { AxiosError } from "axios";
import type { ApiEnvelope } from "@/types";
import { getApiMessage } from "./api";

export function parseApiError(
  error: unknown,
  fallback: string = "Network error. Please try again."
): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiEnvelope<unknown>>;
    if (axiosError.response?.data) {
      return getApiMessage(axiosError.response.data, fallback);
    }

    if (axiosError.request) {
      return "Server not reachable. Please try again.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
