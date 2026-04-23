import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function DashboardLayout() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header toggleSidebar={() => setIsOpen(true)} />
        
        <main className="flex-1 overflow-y-auto bg-dashboardBg p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}