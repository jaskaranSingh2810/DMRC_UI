import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { AxiosResponse } from "axios";
import axiosInstance from "@/api/axiosInstance";
import type { ApiEnvelope, User, UserProfile } from "@/types";
import { getAuthUser, logout } from "@/utils/auth";
import { normalizeUser } from "@/utils/normalizeUser";

interface AuthContextValue {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(getAuthUser());
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (): Promise<void> => {
    if (!user?.accessToken) {
      setLoading(false);
      return;
    }

    if (user.modules.length > 0) {
      setLoading(false);
      return;
    }

    try {
      const res: AxiosResponse<ApiEnvelope<UserProfile>> = await axiosInstance.get(
        "/api/v1/dmrc/auth/user-profile"
      );
      const profile = res.data.data;
      const updatedUser = normalizeUser(user, profile);

      setUser(updatedUser);
      localStorage.setItem("authUser", JSON.stringify(updatedUser));
    } catch (error) {
      console.error("PROFILE ERROR:", error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}

export { AuthContext };

