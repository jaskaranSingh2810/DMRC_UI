import {
  ChevronDown,
  X,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutUser } from "@/store/slices/authSlice";
import type { SidebarMenuItem } from "@/types";

interface MenuItem {
  label: string;
  path: string[];
  icon: string;
  permission?: string;
}

interface User {
  permissions?: string[];
  menu?: SidebarMenuItem[];
}

const iconMap: Record<string, string> = {
  LayoutDashboard: "/Images/Sidebar/Dashboard.png",
  FileText: "/Images/Sidebar/Ad_Management.png",
  Megaphone: "/Images/Sidebar/Notice_Management.png",
  ScrollText: "/Images/Sidebar/Ticker_Management.png",
  Monitor: "/Images/Sidebar/Device_Management.png",
  Headphones: "/Images/Sidebar/Support.png",
  Users: "/Images/Sidebar/User_Management.png",
};

const routeMap: Record<string, string[]> = {
  "/dashboard": ["/dashboard"],
  "/ads-management": ["/ads-management", "/ads-management/create"],
  "/notice-management": ["/notice-management", "/notice-management/create"],
  "/ticker-management": ["/ticker-management", "/ticker-management/create"],
  "/device-management": ["/device-management"],
  "/support": ["/support"],
  "/user-management": ["/user-management"],
};

export function mapBackendMenu(menu: SidebarMenuItem[]): MenuItem[] {
  if (!Array.isArray(menu)) return [];

  return menu.flatMap((menuItem) => {
    const mappedPaths = routeMap[menuItem.path];
    const mappedIcon = iconMap[menuItem.icon];

    if (!mappedPaths || !mappedIcon) {
      return [];
    }

    return [
      {
        label: menuItem.name,
        path: mappedPaths,
        icon: mappedIcon,
        permission: menuItem.permission || '',
      },
    ];
  });
}

export default function Sidebar({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [collapsed, setCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menus = useMemo(
    () => mapBackendMenu(user?.menu ?? []),
    [user?.menu, user?.menu?.length],
  );  

  const userPermissions = useMemo(
    () => new Set(user?.permissions || []),
    [user?.permissions],
  );

  const filteredMenus = useMemo(
    () =>
      menus.filter(
        (menu) => !menu.permission || userPermissions.has(menu.permission),
      ),
    [menus, userPermissions],
  );

  const handleLogout = async (): Promise<void> => {
    try {
      setLogoutLoading(true);
      await dispatch(logoutUser());
      setIsOpen(false);
      navigate("/login", { replace: true });
    } finally {
      setLogoutLoading(false);
      setLogoutConfirmOpen(false);
      setProfileMenuOpen(false);
    }
  };

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

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
              {!collapsed ? (
                <img
                  src="/Images/Sidebar/Sidebar_Logo.png"
                  alt="Logo"
                  className="lg:h-6 md:h-6 h-5"
                />
              ) : null}

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
              {filteredMenus.map((menu) => (
                <MenuItemComponent
                  key={`${menu.label}-${menu.path?.join("-")}`} // safer key
                  {...menu}
                  collapsed={collapsed}
                  setIsOpen={setIsOpen}
                />
              ))}
            </nav>
          </div>

          <div ref={profileMenuRef} className="relative p-4">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((current) => !current)}
              className="flex w-full items-center gap-4 rounded-xl transition"
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              aria-label={user?.profile?.username ?? "User"}
            >
              <img
                src="/Images/Sidebar/Sidebar_User.png"
                alt="User"
                className="h-12 w-12 rounded-full border-2 border-white/80 object-cover shadow-[0_10px_24px_rgba(0,0,0,0.2)]"
              />

              {!collapsed ? (
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-[20px] font-semibold uppercase leading-none text-white">
                    {user?.profile?.username ?? "USER"}
                  </div>
                  <div className="mt-1 truncate text-[16px] font-400 text-white/80">
                    {user?.role ?? "User"}
                  </div>
                </div>
              ) : null}

              <ChevronDown
                size={28}
                className={`ml-auto shrink-0 text-white transition ${
                  profileMenuOpen ? "rotate-180" : ""
                }`}
              />
              
            </button>

            {profileMenuOpen && !collapsed ? (
              <div
                className="absolute bottom-[calc(100%)] left-[3.25rem] right-4 z-50 overflow-hidden rounded-2xl border border-white/10 bg-white/20 px-4 py-4 shadow-[0_22px_44px_rgba(0,0,0,0.22)] backdrop-blur-sm"
                role="menu"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-4 rounded-xl px-1 py-3 text-left text-white transition hover:bg-white/10"
                  role="menuitem"
                >
                  <img src="/Images/Sidebar/Change_Password.png" alt="Change Password" className="h-5 w-5" />
                  <span className="text-[14px] font-medium">Change Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLogoutConfirmOpen(true)}
                  className="flex w-full items-center gap-4 rounded-xl px-1 py-3 text-left text-white transition hover:bg-white/10"
                  role="menuitem"
                >
                  <img src="/Images/Sidebar/Logout.png" alt="Logout" className="h-5 w-5" />
                  <span className="text-[14px] font-medium">Logout</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      {logoutConfirmOpen ? (
        <LogoutConfirmModal
          loading={logoutLoading}
          onCancel={() => setLogoutConfirmOpen(false)}
          onConfirm={() => void handleLogout()}
        />
      ) : null}
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

      {!collapsed ? <span className="text-sm">{label}</span> : null}

      {collapsed ? (
        <span className="absolute left-14 z-50 hidden whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white group-hover:block">
          {label}
        </span>
      ) : null}
    </NavLink>
  );
}
