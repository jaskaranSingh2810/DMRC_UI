import { ChevronDown, X, PanelRightOpen, PanelRightClose } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutUser } from "@/store/slices/authSlice";
import type { SidebarMenuItem } from "@/types";

interface MenuItem {
  label: string;
  path?: string[];
  icon?: string;
  permission?: string;
  children?: MenuItem[];
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

  const mappedMenus: MenuItem[] = menu.flatMap((menuItem) => {
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

  const adsMenu = mappedMenus.find((m) => m.path?.includes("/ads-management"));

  const noticeMenu = mappedMenus.find((m) =>
    m.path?.includes("/notice-management"),
  );

  const remainingMenus = mappedMenus.filter(
    (m) =>
      !m.path?.includes("/ads-management") &&
      !m.path?.includes("/notice-management"),
  );

  if (adsMenu || noticeMenu) {
    remainingMenus.splice(1, 0, {
      label: "Content Management",
      icon: "/Images/Sidebar/Ad_Management.png",
      children: [adsMenu, noticeMenu].filter(Boolean) as MenuItem[],
    });
  }

  return remainingMenus;
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

  const filteredMenus = useMemo(() => {
    return menus
      .map((menu) => {
        if (menu.children) {
          return {
            ...menu,
            children: menu.children.filter(
              (child) =>
                !child.permission || userPermissions.has(child.permission),
            ),
          };
        }

        return menu;
      })
      .filter((menu) => {
        if (menu.children) {
          return menu.children.length > 0;
        }

        return !menu.permission || userPermissions.has(menu.permission);
      });
  }, [menus, userPermissions]);

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
    w-[280px] ${isCollapsed ? "md:w-20" : "md:w-[280px]"}
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
                  aria-label={
                    isCollapsed ? "Expand sidebar" : "Collapse sidebar"
                  }
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
                  key={menu.label}
                  item={menu}
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
                  <span className="lg:text-[14px] text-[12px] font-medium">
                    Logout
                  </span>
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
  item,
  collapsed,
  onSelect,
  level = 0,
}: {
  item: MenuItem;
  collapsed: boolean;
  onSelect: () => void;
  level?: number;
}) {
  const { pathname } = useLocation();

  const [submenuOpen, setSubmenuOpen] = useState(true);

  const hasChildren = !!item.children?.length;

  const isActive = item.path?.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  const isChildActive = item.children?.some((child) =>
    child.path?.some((p) => pathname === p || pathname.startsWith(p + "/")),
  );

  if (hasChildren) {
    return (
      <div className="relative">
        <button
          onClick={() => setSubmenuOpen((prev) => !prev)}
          className={`
            group relative flex w-full items-center justify-between
            rounded-md px-4 py-3 transition-all duration-200
            ${isChildActive ? "bg-white/15" : "hover:bg-white/10"}
          `}
        >
          <div className="flex items-center gap-3">
            <img
              src={item.icon}
              alt={item.label}
              className="h-5 w-5 opacity-90"
            />

            {!collapsed && (
              <span className="text-[15px] font-medium text-white">
                {item.label}
              </span>
            )}
          </div>

          {!collapsed && (
            <ChevronDown
              size={18}
              className={`transition-transform duration-300 ${
                submenuOpen ? "rotate-180" : ""
              }`}
            />
          )}
        </button>

        {!collapsed && submenuOpen ? (
          <div className="relative ml-7 mt-2 space-y-1">
            <div className="absolute left-[9px] top-0 h-full w-px bg-white" />

            {item.children?.map((child, index) => {
              const childActive = child.path?.some(
                (p) => pathname === p || pathname.startsWith(p + "/"),
              );

              return (
                <div key={child.label} className="relative pl-5">
                  <div className="absolute left-[9px] top-1/2 h-px w-3 bg-white" />

                  <NavLink
                    to={child.path?.[0] || "#"}
                    onClick={onSelect}
                    className={`
                      flex items-center gap-3 rounded-md px-3 py-2 transition-all duration-200
                      ${childActive ? "bg-white/20 border-l-2 border-white" : "hover:bg-white/10"}
                    `}
                  >
                    <img
                      src={child.icon}
                      alt={child.label}
                      className="h-4 w-4 opacity-90"
                    />

                    <span className="text-[14px] text-white">
                      {child.label}
                    </span>
                  </NavLink>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path?.[0] || "#"}
      onClick={onSelect}
      className={`
        group relative flex items-center gap-3 rounded-md px-4 py-3 transition-all duration-200
        ${
          isActive ? "bg-white/15 border-l-2 border-white" : "hover:bg-white/10"
        }
      `}
    >
      <img src={item.icon} alt={item.label} className="h-5 w-5 opacity-90" />

      {!collapsed ? (
        <span className="text-[14px] text-white">{item.label}</span>
      ) : null}

      {collapsed ? (
        <span className="absolute left-14 z-50 hidden whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white group-hover:block">
          {item.label}
        </span>
      ) : null}
    </NavLink>
  );
}
