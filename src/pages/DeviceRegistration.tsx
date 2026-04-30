import { Check, ChevronDown, LogOut, Monitor, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/hooks/useToast";
import { buildDeviceListRequest } from "@/pages/DeviceManagement/deviceListRequest";
import {
  loadStoredRegisteredDevice,
  saveRegisteredDevice,
  type StoredRegisteredDevice,
} from "@/pages/deviceRegistrationStorage";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearDeviceMessages,
  fetchDevices,
  setSelectedLocationId,
  updateDeviceStatus,
} from "@/store/slices/deviceSlice";
import { fetchLocations } from "@/store/slices/locationSlice";
import type { DeviceLocation, DeviceRecord } from "@/types";
import { getAuthUser } from "@/utils/auth";
import { useNavigate } from "react-router-dom";

type UserDetails = {
  displayName: string;
  displayRole: string;
  avatarUrl: string;
};

const pageStyles = `
  :root {
    --bg-left: #0f4c90;
    --bg-mid: #312d6f;
    --bg-right: #8f173d;
    --panel-border: rgba(17, 24, 39, 0.08);
    --text-dark: #2f3542;
    --text-muted: #697386;
    --input-border: #e4e7ec;
    --input-text: #667085;
    --button-primary-left: #164f96;
    --button-primary-right: #8e1c45;
  }

  .device-registration-page * { box-sizing: border-box; }
  .device-registration-page {
    margin: 0;
    min-height: 100vh;
    font-family: "Poppins", "Segoe UI", sans-serif;
    color: var(--text-dark);
    background: #fff;
  }
  .device-registration-page img { display: block; max-width: 100%; }
  .device-registration-page button,
  .device-registration-page input { font: inherit; }

  .page-shell { margin: 0; min-height: 100vh; background: #fff; }
  .page-frame {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: linear-gradient(90deg, var(--bg-left) 0%, var(--bg-mid) 48%, var(--bg-right) 100%);
  }
  .topbar {
    height: 50px;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 28px 0 24px;
    border-bottom: 1px solid rgba(17, 24, 39, 0.06);
  }
  .brand-strip { display: flex; align-items: center; gap: 18px; min-width: 0; }
  .main-logo { height: 24px; object-fit: contain; }
  .metro-logo { height: 24px; object-fit: contain; }
  .user-chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    cursor: pointer;
    border: 0;
    background: transparent;
    padding: 0;
  }
  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #d8b39a 0%, #9a6749 100%);
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    overflow: hidden;
    flex-shrink: 0;
  }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .user-meta { min-width: 0; line-height: 1.05; text-align: left; }
  .user-name {
    font-size: 12px;
    font-weight: 700;
    color: #383838;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .user-role { font-size: 10px; color: #646464; white-space: nowrap; }
  .user-arrow {
    width: 18px;
    height: 18px;
    color: #7a7a7a;
    flex-shrink: 0;
    transition: transform 0.25s ease;
  }
  .user-arrow.open { transform: rotate(180deg); }
  .user-menu {
    position: absolute;
    top: 45px;
    right: 0;
    width: 130px;
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(14px);
    border-radius: 14px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    z-index: 999;
    box-shadow: 0 10px 35px rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .menu-btn {
    width: 100%;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 14px;
    cursor: pointer;
    color: #ffffff;
    font-size: 12px;
    font-weight: 500;
    transition: background 0.2s ease;
  }
  .menu-btn:hover { background: rgba(255, 255, 255, 0.08); }
  .hero {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
  }
  .register-card {
    width: min(100%, 940px);
    display: grid;
    grid-template-columns: minmax(320px, 0.95fr) minmax(0, 1fr);
    gap: 28px;
    padding: 26px;
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid var(--panel-border);
    border-radius: 18px;
    box-shadow: 0 14px 40px rgba(11, 24, 53, 0.12);
  }
  .card-visual {
    min-height: 505px;
    border-radius: 14px;
    overflow: hidden;
    background: #d8dde5;
  }
  .card-visual img { width: 100%; height: 100%; object-fit: cover; }
  .form-panel {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0;
    padding: 12px 2px;
  }
  .form-heading {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #2f3d5a;
  }
  .form-copy {
    margin: 6px 0 16px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-muted);
  }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-group { margin-top: 12px; }
  .field-row .form-group { margin-top: 0; width: 100%; }
  .field-label {
    display: block;
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 500;
    color: #314157;
  }
  .text-input,
  .dropdown-selected,
  .dropdown-search {
    width: 100%;
    min-height: 38px;
    padding: 10px 14px;
    border: 1px solid var(--input-border);
    border-radius: 6px;
    background: #fff;
    color: var(--input-text);
    font-size: 12px;
    outline: none;
  }
  .text-input::placeholder,
  .dropdown-search::placeholder { color: #a3aab6; font-size: 12px; }
  .custom-dropdown { position: relative; }
  .dropdown-selected {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
  }
  .dropdown-selected.disabled,
  .btn:disabled { cursor: not-allowed; opacity: 0.65; }
  .selected-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }
  .dropdown-icon {
    width: 14px;
    height: 14px;
    color: #8b93a1;
    transition: transform 0.2s ease;
    flex-shrink: 0;
    margin-left: 8px;
  }
  .dropdown-icon.open { transform: rotate(180deg); }
  .dropdown-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    padding: 8px;
    border: 1px solid #e7e9ef;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.12);
    z-index: 10;
  }
  .dropdown-search { margin-bottom: 8px; }
  .dropdown-list { max-height: 180px; overflow-y: auto; }
  .dropdown-item {
    width: 100%;
    padding: 9px 8px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    text-align: left;
    font-size: 12px;
    color: #344054;
    cursor: pointer;
  }
  .dropdown-item:hover { background: #f4f6fb; }
  .dropdown-empty { padding: 8px; font-size: 12px; color: #697386; }
  .details-box { margin-top: 12px; }
  .device-card {
    background: #f7f4f9;
    border: 1.5px solid #d7b8ea;
    border-radius: 8px;
    padding: 10px 12px;
    width: 100%;
  }
  .device-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .device-title {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #333333;
    font-size: 13px;
    font-weight: 600;
  }
  .device-icon { color: #7b2cbf; flex-shrink: 0; width: 16px; height: 16px; }
  .close-btn {
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 10px;
    color: #3f3f46;
    line-height: 1;
    padding: 0;
    width: 14px;
    height: 14px;
  }
  .device-tags { display: flex; gap: 14px; }
  .tag {
    flex: 1;
    background: #ffffff;
    border: 0.5px solid #e2e4ea;
    border-radius: 14px;
    padding: 5px 8px;
    text-align: center;
    font-size: 12px;
    font-weight: 500;
    color: #566272;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  }
  .status-message { min-height: 16px; margin-top: 8px; font-size: 11px; color: #b42318; }
  .buttons { display: flex; gap: 14px; margin-top: auto; padding-top: 18px; }
  .btn {
    flex: 1;
    min-height: 30px;
    border-radius: 6px;
    border: 1px solid transparent;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .btn:hover:not(:disabled) { transform: translateY(-1px); }
  .cancel { background: #fff; color: #353d49; border-color: #2d3642; }
  .register {
    color: #fff;
    background: linear-gradient(90deg, var(--button-primary-left) 0%, var(--button-primary-right) 100%);
    box-shadow: 0 8px 16px rgba(122, 26, 66, 0.18);
  }
  .modal {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(10, 13, 18, 0.55);
  }
  .modal-content {
    width: 100%;
    max-width: 520px;
    padding: 40px 36px 32px;
    border-radius: 24px;
    background: #fff;
    text-align: center;
  }
  .check {
    width: 108px;
    height: 108px;
    margin: 0 auto 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #09b35a;
  }
  .check svg { width: 52px; height: 52px; }
  .modal-content h3 { margin: 0 0 12px; font-size: 26px; color: #2d3138; }
  .modal-content p {
    max-width: 360px;
    margin: 0 auto 28px;
    font-size: 14px;
    line-height: 1.45;
    color: #5e6a7d;
  }
  .modal-action { max-width: 254px; margin: 0 auto; padding: 8px; }
  .modal-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 320px;
    margin: 0 auto;
  }
  .device-summary {
    margin: 0 auto 24px;
    padding: 16px 18px;
    border-radius: 14px;
    border: 1px solid #e5e7eb;
    background: #f8fafc;
    text-align: left;
  }
  .device-summary-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 6px 0;
    font-size: 13px;
    color: #475467;
  }
  .device-summary-row strong { color: #101828; }

  @media (max-width: 920px) {
    .register-card { width: min(100%, 440px); grid-template-columns: 1fr; gap: 16px; padding: 16px; }
    .card-visual { min-height: 220px; }
    .form-panel { justify-content: flex-start; padding: 0; }
  }

  @media (max-width: 720px) {
    .topbar { height: auto; gap: 12px; padding: 12px 14px; align-items: flex-start; }
    .user-chip { align-self: flex-end; }
    .hero { padding: 24px 14px; }
  }

  @media (max-width: 520px) {
    .field-row { grid-template-columns: 1fr; }
    .buttons { flex-direction: column; }
  }
`;

function getInitials(name: string): string {
  return (
    String(name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "US"
  );
}

function formatRole(role: string): string {
  const normalized = String(role || "User")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!normalized) {
    return "User";
  }

  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getStoredUserDetails(): UserDetails {
  const authUser = getAuthUser();

  return {
    displayName: authUser?.profile?.username || "Guest User",
    displayRole: formatRole(authUser?.role || "User"),
    avatarUrl: "",
  };
}

function toStoredDeviceRecord(device: StoredRegisteredDevice): DeviceRecord {
  return {
    id: 0,
    deviceCode: device.deviceCode,
    brand: device.brand || "-",
    model: "",
    landmark: device.landmark,
    orientation: device.orientation || "-",
    locationId: device.locationId,
    deviceSize: device.deviceSize || 0,
    createdAt: "",
    createdBy: "",
    status: "ACTIVE",
    locationName: device.locationName,
  };
}

function DropdownToggle({
  label,
  expanded,
  disabled = false,
  onClick,
}: {
  label: string;
  expanded: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={expanded}
      aria-disabled={disabled ? "true" : "false"}
      aria-label={label}
      onClick={onClick}
      className={`dropdown-selected${disabled ? " disabled" : ""}`}
    >
      <span className="selected-text">{label}</span>
      <ChevronDown className={`dropdown-icon${expanded ? " open" : ""}`} />
    </button>
  );
}

export default function DeviceRegistration() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    items: deviceList,
    loading,
    error,
    successMessage,
    selectedLocationId,
  } = useAppSelector((state) => state.devices);
  const { items: locationList, listLoaded: locationListLoaded } =
    useAppSelector((state) => state.locations);

  const [selectedLocationName, setSelectedLocationName] =
    useState("Select Location");
  const [selectedDeviceCode, setSelectedDeviceCode] = useState("Select Screen");
  const [selectedDevice, setSelectedDevice] = useState<DeviceRecord | null>(
    null,
  );
  const [landmark, setLandmark] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");
  const [openDropdown, setOpenDropdown] = useState<
    "location" | "device" | null
  >(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showRegisteredDeviceModal, setShowRegisteredDeviceModal] =
    useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [storedDevice, setStoredDevice] =
    useState<StoredRegisteredDevice | null>(null);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLButtonElement | null>(null);

  const userDetails = useMemo(() => getStoredUserDetails(), []);
  const filters = useMemo(() => ({}), []);
  const page = 1;
  const pageSize = 100;
  const selectedStatFilter = "unRegistered" as const;
  const sortState = null;
  const isKioskSession = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("kiosk") === "true";
  }, []);

  const filteredLocations = useMemo(() => {
    const query = locationSearch.trim().toLowerCase();
    return locationList.filter((location) =>
      location.locationName.toLowerCase().includes(query),
    );
  }, [locationList, locationSearch]);

  const filteredDevices = useMemo(() => {
    const query = deviceSearch.trim().toLowerCase();
    return deviceList.filter((device) =>
      device.deviceCode.toLowerCase().includes(query),
    );
  }, [deviceList, deviceSearch]);

  useEffect(() => {
    let active = true;

    void loadStoredRegisteredDevice()
      .then((savedDevice) => {
        if (!active || !savedDevice) {
          return;
        }

        setStoredDevice(savedDevice);

        if (isKioskSession) {
          setShowRegisteredDeviceModal(true);
        }
      })
      .catch(() => {
        if (active) {
          setStoredDevice(null);
        }
      });

    return () => {
      active = false;
    };
  }, [isKioskSession]);

  useEffect(() => {
    if (!locationListLoaded) {
      void dispatch(fetchLocations());
    }
  }, [dispatch, locationListLoaded]);

  useEffect(() => {
    if (successMessage) {
      dispatch(clearDeviceMessages());
    }
  }, [dispatch, successMessage, toast]);

  useEffect(() => {
    if (error) {
      toast.error(error, "Device");
      dispatch(clearDeviceMessages());
    }
  }, [dispatch, error, toast]);

  useEffect(() => {
    if (!selectedLocationId && !locationListLoaded) {
      return;
    }

    void dispatch(
      fetchDevices(
        buildDeviceListRequest({
          filters,
          locationList,
          pageNumber: page,
          pageSize,
          selectedLocationId,
          selectedStatFilter,
          sortState,
        }),
      ),
    );
  }, [
    dispatch,
    filters,
    locationList,
    locationListLoaded,
    page,
    pageSize,
    selectedLocationId,
    selectedStatFilter,
    sortState,
  ]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }

      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenDropdown(null);
        setShowSuccessModal(false);
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!selectedLocationId) {
      setSelectedLocationName("Select Location");
      setSelectedDeviceCode("Select Screen");
      setSelectedDevice(null);
      setStatusMessage("");
      return;
    }

    if (loading) {
      setSelectedDeviceCode("Loading Screen...");
      return;
    }

    if (deviceList.length === 0) {
      setSelectedDeviceCode("No Screen Available");
      setStatusMessage("No screens are available for the selected location.");
      return;
    }

    if (!selectedDevice) {
      setSelectedDeviceCode("Select Screen");
    }
    setStatusMessage("");
  }, [deviceList, loading, selectedDevice, selectedLocationId]);

  const handleLocationSelect = (location: DeviceLocation) => {
    dispatch(setSelectedLocationId(String(location.locationId || "")));
    setSelectedLocationName(location.locationName || "Select Location");
    setSelectedDeviceCode("Select Screen");
    setSelectedDevice(null);
    setDeviceSearch("");
    setStatusMessage("");
    setOpenDropdown(null);
  };

  const handleDeviceSelect = (device: DeviceRecord) => {
    setSelectedDevice(device);
    setSelectedDeviceCode(device.deviceCode || "Select Screen");
    setOpenDropdown(null);
    setStatusMessage("");
  };

  const resetForm = () => {
    dispatch(setSelectedLocationId(""));
    setSelectedLocationName("Select Location");
    setSelectedDeviceCode("Select Screen");
    setSelectedDevice(null);
    setLandmark("");
    setLocationSearch("");
    setDeviceSearch("");
    setOpenDropdown(null);
    setStatusMessage("");
  };

  const applyStoredDeviceToForm = (device: StoredRegisteredDevice) => {
    dispatch(setSelectedLocationId(String(device.locationId)));
    setSelectedLocationName(device.locationName || "Select Location");
    setSelectedDeviceCode(device.deviceCode || "Select Screen");
    setSelectedDevice(toStoredDeviceRecord(device));
    setLandmark(device.landmark || "");
    setStatusMessage("");
    setDeviceSearch("");
    setLocationSearch("");
    setOpenDropdown(null);
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    // resetForm();
    navigateToPlayer();
  };

  const handleReregisterDevice = () => {
    resetForm();
    // if (storedDevice) {
    //   applyStoredDeviceToForm(storedDevice);
    // }
    setShowRegisteredDeviceModal(false);
  };

  const handleSubmit = async () => {
    if (loading) {
      return;
    }

    const deviceCode =
      selectedDevice?.deviceCode ||
      (selectedDeviceCode !== "Select Screen" ? selectedDeviceCode : "");

    if (!selectedLocationId || !deviceCode) {
      setStatusMessage(
        "Please select both location and screen before registering.",
      );
      return;
    }

    setStatusMessage("");

    const result = await dispatch(
      updateDeviceStatus({
        locationId: Number(selectedLocationId),
        deviceCode,
        status: "Active",
        landmark,
      }),
    );

    if (!updateDeviceStatus.fulfilled.match(result)) {
      return;
    }

    const nextStoredDevice: StoredRegisteredDevice = {
      deviceCode,
      locationId: Number(selectedLocationId),
      locationName: selectedLocationName,
      landmark: landmark.trim(),
      brand: selectedDevice?.brand || storedDevice?.brand || undefined,
      orientation:
        selectedDevice?.orientation || storedDevice?.orientation || undefined,
      deviceSize:
        selectedDevice?.deviceSize || storedDevice?.deviceSize || undefined,
    };

    await saveRegisteredDevice(nextStoredDevice);
    setStoredDevice(nextStoredDevice);

    setShowSuccessModal(true);
    setLandmark("");
    setSelectedDevice(null);
    setSelectedDeviceCode("Select Screen");
  };

  const navigateToPlayer = () => {
    navigate("/device/player");
  };

  const handleLogout = () => {
    window.location.href = "/logout?kiosk=true";
  };

  const deviceDropdownDisabled =
    !selectedLocationId || loading || deviceList.length === 0;

  return (
    <div className="device-registration-page">
      <style>{pageStyles}</style>
      <div className="page-shell">
        <div className="page-frame">
          <header className="topbar">
            <div className="brand-strip">
              <img
                src="/Images/Login/Delhi_GMR.png"
                alt="DMRC and GMR logos"
                className="main-logo"
              />
              <img
                src="/Images/Login/Delhi_Metro.png"
                alt="Delhi Metro logo"
                className="metro-logo"
              />
            </div>

            <button
              type="button"
              className="user-chip"
              aria-label="Logged in user"
              onClick={() => setShowUserMenu((current) => !current)}
              ref={userMenuRef}
            >
              <div className="avatar">
                {userDetails.avatarUrl ? (
                  <img src={userDetails.avatarUrl} alt="User avatar" />
                ) : (
                  getInitials(userDetails.displayName)
                )}
              </div>

              <div className="user-meta">
                <div className="user-name">
                  {userDetails.displayName.toUpperCase()}
                </div>
                <div className="user-role">{userDetails.displayRole}</div>
              </div>

              <ChevronDown
                className={`user-arrow${showUserMenu ? " open" : ""}`}
              />

              {showUserMenu ? (
                <div className="user-menu">
                  <button
                    type="button"
                    className="menu-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleLogout();
                    }}
                  >
                    <LogOut size={14} />
                    <span>Logout</span>
                  </button>
                </div>
              ) : null}
            </button>
          </header>

          <main className="hero">
            <section className="register-card" aria-labelledby="registerTitle">
              <div className="card-visual">
                <img
                  src="/Images/Login/Register_Left.png"
                  alt="Airport display device"
                />
              </div>

              <div className="form-panel" ref={dropdownRef}>
                <div>
                  <h1 className="form-heading" id="registerTitle">
                    Register Device
                  </h1>
                  <p className="form-copy">
                    Fill in the required details to register a new device for
                    content scheduling and monitoring.
                  </p>

                  <div className="field-row">
                    <div className="form-group">
                      <label className="field-label" htmlFor="locationSearch">
                        Select Location*
                      </label>
                      <div className="custom-dropdown">
                        <DropdownToggle
                          label={selectedLocationName}
                          expanded={openDropdown === "location"}
                          onClick={() =>
                            setOpenDropdown((current) =>
                              current === "location" ? null : "location",
                            )
                          }
                        />

                        {openDropdown === "location" ? (
                          <div className="dropdown-menu">
                            <input
                              id="locationSearch"
                              className="dropdown-search"
                              type="text"
                              placeholder="Search"
                              value={locationSearch}
                              onChange={(event) =>
                                setLocationSearch(event.target.value)
                              }
                            />
                            <div className="dropdown-list" role="listbox">
                              {filteredLocations.length ? (
                                filteredLocations.map((location) => (
                                  <button
                                    key={String(location.locationId)}
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() =>
                                      handleLocationSelect(location)
                                    }
                                  >
                                    {location.locationName}
                                  </button>
                                ))
                              ) : (
                                <div className="dropdown-empty">
                                  No locations found.
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="field-label" htmlFor="deviceSearch">
                        Screen*
                      </label>
                      <div className="custom-dropdown">
                        <DropdownToggle
                          label={selectedDeviceCode}
                          expanded={openDropdown === "device"}
                          disabled={deviceDropdownDisabled}
                          onClick={() => {
                            if (deviceDropdownDisabled) {
                              return;
                            }

                            setOpenDropdown((current) =>
                              current === "device" ? null : "device",
                            );
                          }}
                        />

                        {openDropdown === "device" ? (
                          <div className="dropdown-menu">
                            <input
                              id="deviceSearch"
                              className="dropdown-search"
                              type="text"
                              placeholder="Search"
                              value={deviceSearch}
                              onChange={(event) =>
                                setDeviceSearch(event.target.value)
                              }
                            />
                            <div className="dropdown-list" role="listbox">
                              {filteredDevices.length ? (
                                filteredDevices.map((device) => (
                                  <button
                                    key={device.deviceCode}
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() => handleDeviceSelect(device)}
                                  >
                                    {device.deviceCode}
                                  </button>
                                ))
                              ) : (
                                <div className="dropdown-empty">
                                  No screens found.
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {selectedDevice ? (
                    <div className="details-box">
                      <div className="device-card">
                        <div className="device-header">
                          <div className="device-title">
                            <Monitor className="device-icon" />
                            <span>{selectedDevice.deviceCode}</span>
                          </div>

                          <button
                            type="button"
                            className="close-btn"
                            aria-label="Clear selected screen"
                            onClick={() => {
                              setSelectedDevice(null);
                              setSelectedDeviceCode("Select Screen");
                            }}
                          >
                            <X size={10} />
                          </button>
                        </div>

                        <div className="device-tags">
                          <div className="tag">
                            {selectedDevice.brand || "-"}
                          </div>
                          <div className="tag">
                            {selectedDevice.deviceSize
                              ? `${selectedDevice.deviceSize} inch`
                              : "70 inch"}
                          </div>
                          <div className="tag">
                            {selectedDevice.orientation || "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="form-group">
                    <label className="field-label" htmlFor="landmark">
                      Landmark
                    </label>
                    <input
                      className="text-input"
                      id="landmark"
                      type="text"
                      placeholder="Enter Landmark"
                      autoComplete="off"
                      value={landmark}
                      onChange={(event) => setLandmark(event.target.value)}
                    />
                  </div>

                  <div className="status-message" aria-live="polite">
                    {statusMessage}
                  </div>
                </div>

                <div className="buttons">
                  <button
                    className="btn cancel"
                    type="button"
                    onClick={resetForm}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn register"
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? "Registering..." : "Register Device"}
                  </button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {showSuccessModal ? (
        <div className="modal">
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="successTitle"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="check" aria-hidden="true">
              <Check />
            </div>
            <h3 id="successTitle">Device Registered Successfully</h3>
            <p>
              Your device has been successfully registered and is now ready to
              use.
            </p>
            <button
              className="btn register modal-action"
              type="button"
              onClick={closeSuccessModal}
            >
              Start Content Play
            </button>
          </div>
        </div>
      ) : null}

      {showRegisteredDeviceModal && storedDevice ? (
        <div className="modal">
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="registeredDeviceTitle"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="registeredDeviceTitle">Device Already Registered</h3>
            <p>
              This kiosk already has a registered device. Review the saved
              details below or re-register it with updated information.
            </p>
            <div className="device-summary">
              <div className="device-summary-row">
                <span>Location</span>
                <strong>{storedDevice.locationName}</strong>
              </div>
              <div className="device-summary-row">
                <span>Screen</span>
                <strong>{storedDevice.deviceCode}</strong>
              </div>
              <div className="device-summary-row">
                <span>Landmark</span>
                <strong>{storedDevice.landmark || "-"}</strong>
              </div>
              <div className="device-summary-row">
                <span>Brand</span>
                <strong>{storedDevice.brand || "-"}</strong>
              </div>
              <div className="device-summary-row">
                <span>Orientation</span>
                <strong>{storedDevice.orientation || "-"}</strong>
              </div>
              <div className="device-summary-row">
                <span>Size</span>
                <strong>
                  {storedDevice.deviceSize
                    ? `${storedDevice.deviceSize} inch`
                    : "-"}
                </strong>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn register"
                type="button"
                onClick={navigateToPlayer}
              >
                Directly Start Content Play
              </button>
              <button
                className="btn cancel"
                type="button"
                onClick={handleReregisterDevice}
              >
                Reregister Device
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
