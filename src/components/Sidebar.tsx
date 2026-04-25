import {
  BoomBox,
  FileText,
  Headphones,
  LayoutDashboard,
  Megaphone,
  Monitor,
  ScrollText,
  Users,
  X,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { UserRole } from "@/types";
import { useLocation } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";

interface MenuItem {
  label: string;
  path: string[];
  icon: string;
}

const menuConfig: Record<string, MenuItem[]> = {
  [UserRole.SUPER_ADMIN]: [
    {
      label: "Dashboard",
      path: ["/dashboard"],
      icon: "/Images/Sidebar/Dashboard.png",
    },
    {
      label: "Ad Management",
      path: ["/ads-management", "/ads-management/create"],
      icon: "/Images/Sidebar/Ad_Management.png",
    },
    {
      label: "Notice Management",
      path: ["/notice-management", "/notice-management/create"],
      icon: "/Images/Sidebar/Notice_Management.png",
    },
    {
      label: "Ticker Management",
      path: ["/ticker-management", "/ticker-management/create"],
      icon: "/Images/Sidebar/Ticker_Management.png",
    },
    {
      label: "Device Management",
      path: ["/device-management"],
      icon: "/Images/Sidebar/Device_Management.png",
    },
    {
      label: "User Management",
      path: ["/user-management"],
      icon: "/Images/Sidebar/User_Management.png",
    },
    {
      label: "Support",
      path: ["/support"],
      icon: "/Images/Sidebar/Support.png",
    },
  ],
};

export default function Sidebar({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}) {
  const user = useAppSelector((state) => state.auth.user);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const menus = menuConfig[user?.role ?? UserRole.SUPER_ADMIN] ?? [];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
    fixed z-50 h-full bg-custom-gradient text-white transition-all duration-300
    
    ${isOpen ? "translate-x-0" : "-translate-x-full"}
    md:translate-x-0 md:static
    
    w-64 ${collapsed ? "md:w-20" : "md:w-64"}
  `}
      >
        <div className="flex h-full flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-blue-800 p-4 pl-[25px]">
              {!collapsed && (
                <img
                  src="/Images/Sidebar/Sidebar_Logo.png"
                  alt="Logo"
                  className="lg:h-6 md:h-6 h-5"
                />
              )}

              <div className="flex items-center gap-2">
                <button
                  className="hidden md:block"
                  onClick={() => setCollapsed(!collapsed)}
                >
                  {collapsed ? (
                    <PanelRightOpen size={18} />
                  ) : (
                    <PanelRightClose size={18} />
                  )}
                </button>

                <button className="md:hidden" onClick={() => setIsOpen(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <nav className="mt-4 lg:space-y-4 space-y-2 px-2">
              {menus.map((menu) => (
                <MenuItemComponent
                  key={menu.path[0]}
                  {...menu}
                  collapsed={collapsed}
                  setIsOpen={setIsOpen}
                />
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 p-4">
            <img
              src="/Images/Sidebar/Sidebar_User.png"
              alt="User"
              className="h-12 w-12 rounded-full"
            />

            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-[20px] font-semibold uppercase text-white">
                  {user?.profile?.username ?? "RAMESH SINGH"}
                </div>
                <div className="text-[16px] text-[#CBCBCB] truncate">
                  {user?.role ?? "Admin Manager"}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function MenuItemComponent({
  label,
  path,
  icon: Icon,
  collapsed,
  setIsOpen,
}: MenuItem & { collapsed: boolean; setIsOpen: (val: boolean) => void }) {
  const { pathname } = useLocation();

  const isActive = path.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  return (
    <NavLink
      to={path[0]}
      onClick={() => setIsOpen(false)}
      className={`group relative flex items-center gap-3 rounded-lg pl-4 py-2 transition-all
        ${
          isActive
            ? "bg-[rgba(239,_246,_255,_0.2)] border-l-2 border-white"
            : "hover:bg-[rgba(239,_246,_255,_0.2)]"
        }`}
    >
      <img src={Icon} alt={label} className="h-5 w-5" />

      {!collapsed && <span className="text-sm">{label}</span>}

      {collapsed && (
        <span className="absolute left-14 z-50 hidden whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white group-hover:block">
          {label}
        </span>
      )}
    </NavLink>
  );
}
