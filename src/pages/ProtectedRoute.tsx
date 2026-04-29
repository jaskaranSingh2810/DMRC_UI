import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { UserRole } from "@/types";
import { useAppSelector } from "@/store/hooks";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Array<UserRole | string>;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, loading } = useAppSelector((state) => state.auth);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Loading...
      </div>
    );
  }

  if (!user?.accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "super_admin") {
    return <>{children}</>;
  }

  // if (allowedRoles && user.role && !allowedRoles.includes(user.role)) {
  //   return <Navigate to="/unauthorized" replace />;
  // }

  return <>{children}</>;
}
