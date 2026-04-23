import type { ApiEnvelope } from "@/types";

export function isApiSuccess<TData>(payload: ApiEnvelope<TData>): boolean {
  if (typeof payload.success === "boolean") {
    return payload.success;
  }

  return String(payload.status ?? "").toLowerCase() === "success";
}

export function getApiMessage<TData>(
  payload?: Partial<ApiEnvelope<TData>> | null,
  fallback: string = "Something went wrong."
): string {
  return payload?.message ?? fallback;
}

export function getApiData<TData>(payload: ApiEnvelope<TData>): TData {
  return payload.data;
}
