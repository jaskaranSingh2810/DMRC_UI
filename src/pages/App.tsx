import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { UserRole } from "@/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMenu, fetchProfile } from "@/store/slices/authSlice";

import DashboardLayout from "@/layout/DashboardLayout";
import ProtectedRoute from "./ProtectedRoute";

import Dashboard from "./Dashboard";
import Login from "./Login";
import NoticeManagement from "./NoticeManagement/NoticeManagement";
import TickerManagement from "./TickerManagement/TickerManagement";
import Unauthorized from "./Unauthorized";
import AdsManagement from "./AdsManagement/AdsManagement";
import DeviceManagement from "./DeviceManagement/DeviceManagement";
import UserManagement from "./UserManagement/UserManagement";
import UserFormPage from "./UserManagement/UserFormPage";
import Support from "./Support";
import CreateNewAd from "./AdsManagement/CreateNewAd";
import CreateNotice from "./NoticeManagement/CreateNotice";
import CreateTicker from "./TickerManagement/CreateTicker";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import Logout from "./Logout";
import DeviceRegistration from "./DeviceRegistration";
import PlayerPage from "./PlayerPage";

export default function App() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isKioskSession = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("kiosk") === "true";
  }, []);

  useEffect(() => {
    if (user?.accessToken && !user.profile) {
      void dispatch(fetchProfile());
    }
  }, [dispatch, user?.accessToken, user?.profile]);

  useEffect(() => {
    if (user?.accessToken && !user.menu?.length) {
      void dispatch(fetchMenu());
    }
  }, [dispatch, user?.accessToken, user?.menu]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const blocked =
        e.key === "F12" ||
        e.key === "F11" ||
        e.key === "Escape" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) ||
        (e.ctrlKey && e.key === "U") ||
        (e.altKey && e.key === "F4") ||
        (e.ctrlKey &&
          ["w", "W", "r", "R", "l", "L", "t", "T", "n", "N"].includes(e.key));

      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    if(isKioskSession){
      document.addEventListener("keydown", handleKeyDown, true);
      document.addEventListener("contextmenu", handleContextMenu, true);
  
      return () => {
        document.removeEventListener("keydown", handleKeyDown, true);
        document.removeEventListener("contextmenu", handleContextMenu, true);
      };
    }
  }, [isKioskSession]);
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route
          path="/device/view"
          element={
            <ProtectedRoute>
              <DeviceRegistration />
            </ProtectedRoute>
          }
        />

        <Route
          path="/device/player"
          element={
            <ProtectedRoute>
              <PlayerPage />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute
              allowedRoles={[
                UserRole.SUPER_ADMIN,
                UserRole.AD_MANAGER,
                UserRole.NOTICE_MANAGER,
                UserRole.TICKER_MANAGER,
              ]}
            >
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />

          <Route
            path="/ads-management"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.SUPER_ADMIN, UserRole.AD_MANAGER]}
              >
                <AdsManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ads-management/create"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.SUPER_ADMIN, UserRole.AD_MANAGER]}
              >
                <CreateNewAd />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notice-management"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.SUPER_ADMIN, UserRole.NOTICE_MANAGER]}
              >
                <NoticeManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notice-management/create"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.SUPER_ADMIN, UserRole.NOTICE_MANAGER]}
              >
                <CreateNotice />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notice-management/:noticeId/edit"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.SUPER_ADMIN, UserRole.NOTICE_MANAGER]}
              >
                <CreateNotice />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ticker-management"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.SUPER_ADMIN, UserRole.TICKER_MANAGER]}
              >
                <TickerManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ticker-management/create"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.SUPER_ADMIN, UserRole.TICKER_MANAGER]}
              >
                <CreateTicker />
              </ProtectedRoute>
            }
          />

          <Route
            path="/device-management"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.SUPER_ADMIN, UserRole.DEVICE_MANAGER]}
              >
                <DeviceManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/user-management"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.SUPER_ADMIN, UserRole.USER_MANAGER]}
              >
                <UserManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/user-management/create"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.SUPER_ADMIN, UserRole.USER_MANAGER]}
              >
                <UserFormPage mode="create" />
              </ProtectedRoute>
            }
          />

          <Route
            path="/user-management/:userId/edit"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.SUPER_ADMIN, UserRole.USER_MANAGER]}
              >
                <UserFormPage mode="edit" />
              </ProtectedRoute>
            }
          />

          <Route path="/support" element={<Support />} />
          <Route path="/logout" element={<Logout />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
