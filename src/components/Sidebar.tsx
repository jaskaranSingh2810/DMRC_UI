import { PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import type { SidebarMenuItem } from "@/types";

interface MenuItem {
  label: string;
  paths: string[];
  icon: string;
}

function buildRelatedPaths(path: string): string[] {
  const trimmedPath = path.trim();

  if (!trimmedPath) {
    return [];
  }

  const normalizedPath = trimmedPath.startsWith("/")
    ? trimmedPath
    : `/${trimmedPath}`;

  const relatedPaths = [normalizedPath];

  if (!normalizedPath.endsWith("/create")) {
    relatedPaths.push(`${normalizedPath}/create`);
  }

  return relatedPaths;
}

function mapBackendMenu(menuItems: SidebarMenuItem[]): MenuItem[] {
  return menuItems
    .filter((item) => item.name?.trim() && item.path?.trim())
    .map((item) => ({
      label: item.name.trim(),
      paths: buildRelatedPaths(item.path),
      icon: item.icon?.trim() || "/Images/Sidebar/Support.png",
    }))
    .filter((item) => item.paths.length > 0);
}

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

  const menus = useMemo(() => mapBackendMenu(user?.menu ?? []), [user?.menu]);

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed z-50 h-full bg-custom-gradient text-white transition-all duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:static md:translate-x-0 ${collapsed ? "w-64 md:w-20" : "w-64"}`}
      >
        <div className="flex h-full flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-blue-800 p-4 pl-[25px]">
              {!collapsed ? (
                <img
                  src="/Images/Sidebar/Sidebar_Logo.png"
                  alt="Logo"
                  className="h-5 md:h-6 lg:h-6"
                />
              ) : null}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="hidden md:block"
                  onClick={() => setCollapsed((value) => !value)}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {collapsed ? (
                    <PanelRightOpen size={18} />
                  ) : (
                    <PanelRightClose size={18} />
                  )}
                </button>

                <button
                  type="button"
                  className="md:hidden"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close sidebar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <nav className="mt-4 space-y-2 px-2 lg:space-y-4">
              {menus.map((menu) => (
                <MenuItemComponent
                  key={menu.paths[0]}
                  menu={menu}
                  collapsed={collapsed}
                  onNavigate={() => setIsOpen(false)}
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

            {!collapsed ? (
              <div className="min-w-0">
                <div className="truncate text-[20px] font-semibold uppercase text-white">
                  {user?.profile?.username ?? "USER"}
                </div>
                <div className="truncate text-[16px] text-[#CBCBCB]">
                  {user?.role ?? "User"}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}

function MenuItemComponent({
  menu,
  collapsed,
  onNavigate,
}: {
  menu: MenuItem;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const { pathname } = useLocation();

  const isActive = menu.paths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  return (
    <NavLink
      to={menu.paths[0]}
      onClick={onNavigate}
      className={`group relative flex items-center gap-3 rounded-lg py-2 pl-4 transition-all ${
        isActive
          ? "border-l-2 border-white bg-[rgba(239,_246,_255,_0.2)]"
          : "hover:bg-[rgba(239,_246,_255,_0.2)]"
      }`}
    >
      <img src={menu.icon} alt={menu.label} className="h-5 w-5" />

      {!collapsed ? <span className="text-sm">{menu.label}</span> : null}

      {collapsed ? (
        <span className="absolute left-14 z-50 hidden whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white group-hover:block">
          {menu.label}
        </span>
      ) : null}
    </NavLink>
  );
}
