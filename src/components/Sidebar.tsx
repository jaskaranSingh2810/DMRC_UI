import { ChevronDown, X, PanelRightOpen, PanelRightClose } from "lucide-react";
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
        permission: menuItem.permission || "",
      },
    ];
  });
}

export default function Sidebar({
  isCollapsed,
  isMobile,
  isOpen,
  onClose,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isMobile) {
      onClose();
    }
  }, [isMobile, pathname]);

  useEffect(() => {
    if (!isMobile || !isOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, isOpen]);

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
      onClose();
      navigate("/login", { replace: true });
    } finally {
      setLogoutLoading(false);
      setLogoutConfirmOpen(false);
      setProfileMenuOpen(false);
    }
  };

  return (
    <>
      {isMobile && isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`
    fixed inset-y-0 left-0 z-[999] h-screen overflow-y-auto overflow-x-visible bg-custom-gradient text-white transition-all duration-300
    md:static md:translate-x-0
    ${isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}
    w-64 ${isCollapsed ? "md:w-20" : "md:w-64"}
  `}
      >
        <div className="flex h-full flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-blue-800 p-4 pl-[25px]">
              {!isCollapsed ? (
                <img
                  src="/Images/Sidebar/Sidebar_Logo.png"
                  alt="Logo"
                  className="lg:h-6 md:h-6 h-5"
                />
              ) : null}

              <div className="flex items-center gap-2">
                <button
                  className="hidden md:block"
                  onClick={onToggleCollapse}
                  aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {isCollapsed ? (
                    <PanelRightOpen size={18} />
                  ) : (
                    <PanelRightClose size={18} />
                  )}
                </button>

                <button
                  className="md:hidden"
                  onClick={onClose}
                  aria-label="Close sidebar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <nav className="mt-4 lg:space-y-4 space-y-2 px-2">
              {filteredMenus.map((menu) => (
                <MenuItemComponent
                  key={`${menu.label}-${menu.path?.join("-")}`} // safer key
                  {...menu}
                  collapsed={isCollapsed}
                  onSelect={onClose}
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
                className="lg:h-12 lg:w-12 h-10 w-10 rounded-full border-2 border-white/80 object-cover shadow-[0_10px_24px_rgba(0,0,0,0.2)]"
              />

              {!isCollapsed ? (
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate lg:text-[20px] md:text-[16px] text-[14px] font-semibold uppercase leading-none text-white">
                    {user?.profile?.username ?? "USER"}
                  </div>
                  <div className="mt-1 truncate lg:text-[16px] md:text-[14px] text-[12px] font-400 text-white/80">
                    {user?.role ?? "User"}
                  </div>
                </div>
              ) : null}

              {!isCollapsed && (
                <ChevronDown
                  size={28}
                  className={`ml-auto shrink-0 text-white transition ${
                    profileMenuOpen ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>

            {profileMenuOpen ? (
              <div
                className="absolute bottom-[calc(100%)] left-[3.25rem] right-4 z-[9999] overflow-hidden rounded-2xl border border-white/10 bg-white/20 px-4 py-4 shadow-[0_22px_44px_rgba(0,0,0,0.22)] backdrop-blur-sm"
                role="menu"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-4 rounded-xl px-1 py-3 text-left text-white transition hover:bg-white/10"
                  role="menuitem"
                >
                  <img
                    src="/Images/Sidebar/Change_Password.png"
                    alt="Change Password"
                    className="h-5 w-5"
                  />
                  <span className="lg:text-[14px] md:text-[12px] text-[12px] font-medium">
                    Change Password
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLogoutConfirmOpen(true)}
                  className="flex w-full items-center gap-4 rounded-xl px-1 py-3 text-left text-white transition hover:bg-white/10"
                  role="menuitem"
                >
                  <img
                    src="/Images/Sidebar/Logout.png"
                    alt="Logout"
                    className="h-5 w-5"
                  />
                  <span className="lg:text-[14px] text-[12px] font-medium">Logout</span>
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
  onSelect,
}: MenuItem & { collapsed: boolean; onSelect: () => void }) {
  const { pathname } = useLocation();

  const isActive = path.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  return (
    <NavLink
      to={path[0]}
      onClick={onSelect}
      className={`group relative flex items-center gap-3 rounded-lg pl-4 py-2 transition-all
        ${
          isActive
            ? "bg-[rgba(239,_246,_255,_0.2)] border-l-2 border-white"
            : "hover:bg-[rgba(239,_246,_255,_0.2)]"
        }`}
    >
      <img src={Icon} alt={label} className="h-5 w-5" />

      {!collapsed ? <span className="lg:text-sm text-xs">{label}</span> : null}

      {collapsed ? (
        <span className="absolute left-14 z-50 hidden whitespace-nowrap rounded bg-black px-2 py-1 lg:text-xs md:text-[12px] text-white group-hover:block">
          {label}
        </span>
      ) : null}
    </NavLink>
  );
}
