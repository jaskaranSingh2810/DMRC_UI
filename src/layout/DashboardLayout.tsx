import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

const MOBILE_BREAKPOINT = 768;

const getIsMobileViewport = () => window.innerWidth < MOBILE_BREAKPOINT;

export default function DashboardLayout() {
  const [isMobile, setIsMobile] = useState(getIsMobileViewport);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  const toggleDesktopSidebarCollapse = useCallback(() => {
    setIsDesktopSidebarCollapsed((current) => !current);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = getIsMobileViewport();

      setIsMobile(nextIsMobile);

      if (!nextIsMobile) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen((current) => !current);
      return;
    }

    setIsDesktopSidebarCollapsed((current) => !current);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isCollapsed={isDesktopSidebarCollapsed}
        isMobile={isMobile}
        isOpen={isMobile ? isMobileSidebarOpen : true}
        onClose={closeMobileSidebar}
        onToggleCollapse={toggleDesktopSidebarCollapse}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto bg-dashboardBg p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
