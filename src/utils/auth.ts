import type { User } from "@/types";

const AUTH_STORAGE_KEY = "authUser";

export function setAuthUser(user: User, remember: boolean = true): void {
  const storage = remember ? localStorage : sessionStorage;
  const secondaryStorage = remember ? sessionStorage : localStorage;

  secondaryStorage.removeItem(AUTH_STORAGE_KEY);
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function getAuthUser(): User | null {
  try {
    const local = localStorage.getItem(AUTH_STORAGE_KEY);
    const session = sessionStorage.getItem(AUTH_STORAGE_KEY);
    const raw = local ?? session;

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return getAuthUser()?.accessToken ?? null;
}

export function clearAuthStorage(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export function logout(): void {
  clearAuthStorage();
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}
