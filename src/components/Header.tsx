import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Menu, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  downloadDevices,
  setSelectedLocationId,
} from "@/store/slices/deviceSlice";
import { fetchLocations } from "@/store/slices/locationSlice";
import {
  fetchUserModules,
  setSelectedModules,
} from "@/store/slices/usersSlice";
import { useModal } from "./ModalContext";

type HeaderAction = {
  type: "navigate";
  label: string;
  path: string;
};

const headerConfig: Record<
  string,
  {
    title: string;
    action?: HeaderAction;
  }
> = {
  "/ads-management": {
    title: "Ads Management",
    action: {
      type: "navigate",
      label: "Create New Ad",
      path: "/ads-management/create",
    },
  },
  "/notice-management": {
    title: "Notice Management",
    action: {
      type: "navigate",
      label: "Create New Notice",
      path: "/notice-management/create",
    },
  },
  "/ticker-management": {
    title: "Ticker Management",
    action: {
      type: "navigate",
      label: "Create New Ticker",
      path: "/ticker-management/create",
    },
  },
  "/device-management": {
    title: "Device Management",
    action: {
      type: "navigate",
      label: "Add New Device",
      path: "/device-management",
    },
  },
  "/user-management": {
    title: "User Management",
    action: {
      type: "navigate",
      label: "Add New User",
      path: "/user-management/create",
    },
  },
};
export default function Header({
  toggleSidebar,
}: {
  toggleSidebar: () => void;
}) {
  const dispatch = useAppDispatch();
  const { openModal } = useModal();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isDeviceManagementPage = pathname === "/device-management";
  const isUserManagementPage = pathname === "/user-management";
  const isCreatePage =
    pathname.includes("/ads-management/create") ||
    /^\/ads-management\/[^/]+\/edit$/.test(pathname) ||
    pathname.includes("/notice-management/create") ||
    /^\/notice-management\/[^/]+\/edit$/.test(pathname) ||
    pathname.includes("/ticker-management/create") ||
    /^\/ticker-management\/[^/]+\/edit$/.test(pathname) ||
    pathname.includes("/user-management/create") ||
    /^\/user-management\/[^/]+\/edit$/.test(pathname);

  const [locationMenuOpen, setLocationMenuOpen] = useState(false);
  const [moduleMenuOpen, setModuleMenuOpen] = useState(false);
  const locationMenuRef = useRef<HTMLDivElement | null>(null);
  const moduleMenuRef = useRef<HTMLDivElement | null>(null);
  const { loading, selectedLocationId } = useAppSelector(
    (state) => state.devices,
  );
  const { items: locationList, listLoaded: locationListLoaded } =
    useAppSelector((state) => state.locations);
  const { availableModules, selectedModules } = useAppSelector(
    (state) => state.users,
  );

  const config = Object.entries(headerConfig).find(
    ([key]) => pathname === key || pathname.startsWith(key + "/"),
  )?.[1] || { title: "Dashboard" };

  useEffect(() => {
    if (isDeviceManagementPage && !locationListLoaded) {
      void dispatch(fetchLocations());
    }
  }, [dispatch, isDeviceManagementPage, locationListLoaded]);

  useEffect(() => {
    if (isUserManagementPage && availableModules.length === 0) {
      void dispatch(fetchUserModules());
    }
  }, [availableModules.length, dispatch, isUserManagementPage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        locationMenuRef.current &&
        !locationMenuRef.current.contains(event.target as Node)
      ) {
        setLocationMenuOpen(false);
      }

      if (
        moduleMenuRef.current &&
        !moduleMenuRef.current.contains(event.target as Node)
      ) {
        setModuleMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLocationLabel =
    locationList.find(
      (location) => String(location.locationId) === String(selectedLocationId),
    )?.locationName ?? "All Locations";
  const selectedModuleLabel =
    selectedModules.length === 0
      ? "All Modules"
      : selectedModules.length === 1
        ? selectedModules[0].name
        : `${selectedModules.length} Modules`;

  const handleAction = () => {
    if (!config.action) return;

    if (config.action.type === "navigate") {
      if (pathname === "/device-management") {
        openModal("ADD_DEVICE");
        return;
      }

      navigate(config.action.path);
    }
  };

  return (
    <div
      className={`flex justify-between p-4 bg-[rgb(245 247 250 / var(--tw-bg-opacity, 1))] rounded-[12px]`}
    >
      <div className="flex gap-3 items-center">
        <button
          onClick={toggleSidebar}
          className="rounded-md border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-50 md:hidden"
          aria-label="Toggle sidebar"
          type="button"
        >
          <Menu />
        </button>
        <h1 className="lg:text-[24px] md:text-[22px] text-[20px] font-semibold">
          {config.title}
        </h1>
      </div>

      <div
        className={`flex flex-wrap items-center justify-end gap-3 ${
          isCreatePage ? "hidden" : ""
        }`}
      >
        {isDeviceManagementPage ? (
          <>
            <div ref={locationMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setLocationMenuOpen((current) => !current)}
                className="flex min-w-[170px] items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-[6px] lg:text-[14px] md:text-[12px] text-[12px] font-semibold text-[#333333] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                aria-haspopup="listbox"
                aria-expanded={locationMenuOpen}
              >
                <span>{selectedLocationLabel}</span>
                <ChevronDown
                  size={16}
                  className={`text-[#5E1B7F] transition ${
                    locationMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {locationMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.35rem)] z-30 lg:min-w-[170px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      dispatch(setSelectedLocationId(""));
                      setLocationMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition ${
                      !selectedLocationId
                        ? "bg-[#F4ECFA] text-[#7C3AA8]"
                        : "bg-white text-[#333333] hover:bg-slate-50"
                    }`}
                    role="option"
                    aria-selected={!selectedLocationId}
                  >
                    <span>All Locations</span>
                  </button>
                  {locationList.map((location) => {
                    const isSelected =
                      String(location.locationId) ===
                      String(selectedLocationId);

                    return (
                      <button
                        key={location.locationId}
                        type="button"
                        onClick={() => {
                          dispatch(
                            setSelectedLocationId(String(location.locationId)),
                          );
                          setLocationMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition ${
                          isSelected
                            ? "bg-[#F4ECFA] text-[#7C3AA8]"
                            : "bg-white text-[#333333] hover:bg-slate-50"
                        }`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span>{location.locationName}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                const result = await dispatch(downloadDevices());

                if (downloadDevices.fulfilled.match(result)) {
                  const url = window.URL.createObjectURL(result.payload.blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = result.payload.filename;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  window.URL.revokeObjectURL(url);
                }
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-[6px] text-[14px] font-semibold text-[#333333] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 bg-white"
            >
              Download Script
              <Download size={16} absoluteStrokeWidth={true} />
            </button>
          </>
        ) : null}

        {isUserManagementPage ? (
          <div ref={moduleMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setModuleMenuOpen((current) => !current)}
              className="flex min-w-[170px] items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-[6px] text-[14px] font-semibold text-[#333333] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              aria-haspopup="listbox"
              aria-expanded={moduleMenuOpen}
            >
              <span>{selectedModuleLabel}</span>
              <ChevronDown
                size={16}
                className={`text-[#5E1B7F] transition ${
                  moduleMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {moduleMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.35rem)] z-30 lg:min-w-[220px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    dispatch(setSelectedModules([]));
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition ${
                    selectedModules.length === 0
                      ? "bg-[#F4ECFA] text-[#7C3AA8]"
                      : "bg-white text-[#333333] hover:bg-slate-50"
                  }`}
                  role="option"
                  aria-selected={selectedModules.length === 0}
                >
                  <input
                    type="checkbox"
                    checked={selectedModules.length === 0}
                    readOnly
                    className="h-4 w-4 accent-[#5E1B7F]"
                  />
                  <span>All Modules</span>
                </button>
                {availableModules.map((moduleOption) => {
                  const isSelected = selectedModules.some(
                    (selectedModule) => selectedModule.id === moduleOption.id,
                  );

                  return (
                    <button
                      key={moduleOption.id}
                      type="button"
                      onClick={() => {
                        const nextModules = isSelected
                          ? selectedModules.filter(
                              (selectedModule) =>
                                selectedModule.id !== moduleOption.id,
                            )
                          : [...selectedModules, moduleOption];
                        dispatch(setSelectedModules(nextModules));
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition ${
                        isSelected
                          ? "bg-[#F4ECFA] text-[#7C3AA8]"
                          : "bg-white text-[#333333] hover:bg-slate-50"
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="h-4 w-4 accent-[#5E1B7F]"
                      />
                      <span>{moduleOption.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {config.action && (
          <button
            className="flex items-center gap-2 rounded-lg text-[14px] bg-custom-gradient px-4 py-[6px] text-white transition hover:bg-blue-600 font-semibold"
            onClick={handleAction}
          >
            <Plus size={16} absoluteStrokeWidth={true} />
            {config.action.label}
          </button>
        )}
      </div>
    </div>
  );
}
