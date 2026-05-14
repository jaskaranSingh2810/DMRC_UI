import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Monitor,
  Power,
  Trash2,
  Wrench,
  XCircle,
} from "lucide-react";
import AddDeviceModal from "@/components/DeviceManagement/AddDeviceModal";
import ActionMenu from "@/components/Table/ActionMenu";
import DataTable from "@/components/Table/DataTable";
import type { Column, SortState } from "@/components/Table/types";
import Modal from "@/components/ui/Modal";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { useToast } from "@/hooks/useToast";
import { buildDeviceListRequest } from "@/pages/DeviceManagement/deviceListRequest";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearCurrentDeviceDetails,
  clearDeviceMessages,
  fetchDeviceDetails,
  fetchDevices,
  removeDevice,
  resolveDevice,
  setDeviceFilter,
  updateDevice,
  updateDeviceStatus,
} from "@/store/slices/deviceSlice";
import { fetchLocations } from "@/store/slices/locationSlice";
import { fetchUsers } from "@/store/slices/usersSlice";
import type {
  DeviceDetails,
  DeviceRecord,
  DeviceResolutionHistoryRecord,
} from "@/types";
import type { ManagedUserRecord } from "@/types/user";

interface StatusBadgeProps {
  status: string;
}

type DeviceActionState =
  | {
      device: DeviceRecord;
      type: "status";
      nextStatus: "Active" | "Inactive";
    }
  | {
      device: DeviceRecord;
      type: "remove";
    }
  | {
      device: DeviceRecord;
      type: "resolve";
    }
  | null;

type DeviceStatFilter =
  | "all"
  | "active"
  | "inactive"
  | "not_working"
  | "unRegistered";

function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const styles: Record<string, string> = {
    Active: "bg-[#3EAF3F1A] text-[#3EAF3F]",
    Inactive: "bg-[#EFEFEF] text-black",
    Removed: "bg-rose-100 text-rose-700",
    Error: "bg-red-100 text-red-600",
    Resolved: "bg-emerald-100 text-emerald-700",
  };
  const displayStatus =
    normalizedStatus === "active"
      ? "Active"
      : normalizedStatus === "inactive"
        ? "Inactive"
        : normalizedStatus === "removed"
          ? "Removed"
          : normalizedStatus === "error"
            ? "Error"
            : normalizedStatus === "resolved"
              ? "Resolved"
              : status;

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${
        styles[displayStatus] ?? "bg-[#EFEFEF] text-gray-600"
      }`}
    >
      {displayStatus}
    </span>
  );
}

function resolveDeviceLocationId(
  device: DeviceRecord,
  locationList: Array<{ locationId: string | number; locationName: string }>,
): number {
  const directLocationId = Number(device.locationId);

  if (Number.isFinite(directLocationId) && directLocationId > 0) {
    return directLocationId;
  }

  const nestedLocationId = Number(device.locations?.locationId);

  if (Number.isFinite(nestedLocationId) && nestedLocationId > 0) {
    return nestedLocationId;
  }

  const deviceLocationName =
    device.locationName ?? device.locations?.locationName;

  if (!deviceLocationName) {
    return 0;
  }

  const matchedLocation = locationList.find(
    (location) => location.locationName === deviceLocationName,
  );

  return Number(matchedLocation?.locationId ?? 0);
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();

  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

function toComparableTimestamp(value?: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function DeviceManagement() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const {
    items,
    currentDeviceDetails,
    loading,
    detailsLoading,
    resolveLoading,
    error,
    successMessage,
    filters,
    currentPage,
    totalPages,
    pageSize,
    selectedLocationId,
    summary,
  } = useAppSelector((state) => state.devices);
  const { items: locationList, listLoaded: locationListLoaded } =
    useAppSelector((state) => state.locations);
  const { user } = useAppSelector((state) => state.auth);
  const { items: userOptions, loading: usersLoading } = useAppSelector(
    (state) => state.users,
  );

  const data = items.map((device) => ({
    ...device,
    device: `${device.brand}-${device.model}-${device.deviceSize}`,
  }));

  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [editingDevice, setEditingDevice] = useState<DeviceRecord | null>(null);
  const [deviceAction, setDeviceAction] = useState<DeviceActionState>(null);
  const [detailsDevice, setDetailsDevice] = useState<DeviceRecord | null>(null);
  const [removeRemarks, setRemoveRemarks] = useState("");
  const [resolveReason, setResolveReason] = useState("");
  const [resolvedById, setResolvedById] = useState("");
  const [selectedStatFilter, setSelectedStatFilter] =
    useState<DeviceStatFilter>("all");
  const isAdminUser =
    String(user?.role ?? user?.profile?.role?.name ?? "").toLowerCase() ===
      "super_admin" ||
    String(user?.role ?? user?.profile?.role?.name ?? "").toLowerCase() ===
      "admin";

  useEffect(() => {
    if (!locationListLoaded) {
      void dispatch(fetchLocations());
    }
  }, [dispatch, locationListLoaded]);

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage, "Device");
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
    setSelectedStatFilter("all");
    setPage(1);
  }, [selectedLocationId]);

  useEffect(() => {
    setPage(1);
  }, [selectedStatFilter]);

  useEffect(() => {
    if (deviceAction?.type !== "resolve") {
      return;
    }

    if (!isAdminUser) {
      return;
    }

    if (userOptions.length > 0) {
      return;
    }

    void dispatch(
      fetchUsers({
        page: 0,
        size: 500,
        status: "Active",
      }),
    );
  }, [deviceAction, dispatch, isAdminUser, userOptions.length]);

  useEffect(() => {
    if (!detailsDevice) {
      return;
    }

    void dispatch(
      fetchDeviceDetails({
        id: detailsDevice.id,
        deviceCode: detailsDevice.deviceCode,
      }),
    );
  }, [detailsDevice, dispatch]);

  const visibleDeviceDetails =
    detailsDevice && currentDeviceDetails?.device.id === detailsDevice.id
      ? currentDeviceDetails
      : detailsDevice
        ? {
            device: detailsDevice,
            resolutionHistory: [],
          }
        : null;

  const refetchDevicesList = async () => {
    await dispatch(
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
  };

  const handleStatCardClick = (nextFilter: DeviceStatFilter) => {
    setSelectedStatFilter((current) => {
      if (nextFilter === "all") {
        return "all";
      }

      return current === nextFilter ? "all" : nextFilter;
    });
  };

  const columns: Column<DeviceRecord>[] = [
    {
      label: "Device ID",
      key: "deviceCode",
      filterable: true,
      sortable: true,
    },
    { label: "Device", key: "device", filterable: false, sortable: false },
    {
      label: "Orientation",
      key: "orientation",
      filterable: true,
      sortable: true,
    },
    {
      label: "Landmark",
      key: "landmark",
      filterable: true,
      sortable: true,
      render: (row: DeviceRecord) => row.landmark ?? "-",
    },
    {
      label: "Locations",
      key: "locations",
      filterable: true,
      sortable: true,
      render: (row: DeviceRecord) =>
        row.locationName ?? row.locations?.locationName ?? "-",
    },
    {
      label: "Status",
      key: "status",
      filterable: true,
      render: (row: DeviceRecord) => <StatusBadge status={row.status} />,
    },
    {
      label: "Actions",
      key: "actions",
      render: (row: DeviceRecord) => (
        <ActionMenu
          actions={[
            {
              label:
                row.status.toLowerCase() === "inactive"
                  ? "Mark as Active"
                  : "Mark as Inactive",
              onClick: () =>
                setDeviceAction({
                  device: row,
                  type: "status",
                  nextStatus:
                    row.status.toLowerCase() === "inactive"
                      ? "Active"
                      : "Inactive",
                }),
            },
            {
              label: "Resolve",
              onClick: () => {
                setResolveReason("");
                setResolvedById("");
                setDeviceAction({
                  device: row,
                  type: "resolve",
                });
              },
            },
            {
              label: "View Details",
              onClick: () => setDetailsDevice(row),
            },
            {
              label: "Edit",
              onClick: () => setEditingDevice(row),
            },
            {
              label: "Remove",
              onClick: () => {
                setRemoveRemarks("");
                setDeviceAction({
                  device: row,
                  type: "remove",
                });
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total Devices"
          value={String(summary.totalDevices)}
          accent="violet"
          icon="/Images/DeviceManagement/Total_Devices.png"
          isActive={selectedStatFilter === "all"}
          onClick={() => handleStatCardClick("all")}
          description="Total number of devices registered in the system, including all statuses and locations."
        />
        <StatCard
          label="Active Devices"
          value={String(summary.activeDevices)}
          accent="green"
          icon="/Images/DeviceManagement/Active_Devices.png"
          isActive={selectedStatFilter === "active"}
          onClick={() => handleStatCardClick("active")}
          description="Devices that are currently active and functioning properly."
        />
        <StatCard
          label="Inactive Devices"
          value={String(summary.inactiveDevices)}
          accent="slate"
          icon="/Images/DeviceManagement/Inactive_Devices.png"
          isActive={selectedStatFilter === "inactive"}
          onClick={() => handleStatCardClick("inactive")}
          description="Devices that are currently inactive and not functioning, but have not been removed from the system."
        />
        <StatCard
          label="Not working Devices"
          value={String(summary.notWorkingDevices)}
          accent="red"
          icon="/Images/DeviceManagement/Not_Working_Devices.png"
          isActive={selectedStatFilter === "not_working"}
          onClick={() => handleStatCardClick("not_working")}
          description="Devices that are currently not working due to errors or malfunctions and may require maintenance."
        />
        <StatCard
          label="Unregistered Devices"
          value={String(summary.unRegisteredDevices)}
          accent="red"
          icon="/Images/DeviceManagement/UnRegistered_Devices.png"
          isActive={selectedStatFilter === "unRegistered"}
          onClick={() => handleStatCardClick("unRegistered")}
          description="Devices that have been detected but not yet registered in the system, possibly due to connectivity issues or pending registration."
        />
      </div>

      <div className="shadow-sm">
        <DataTable
          data={data}
          columns={columns}
          loading={loading}
          page={currentPage || page}
          totalPages={totalPages}
          sortState={sortState}
          onPageChange={setPage}
          onFilter={(key, value) => {
            dispatch(setDeviceFilter({ key, value }));
            setPage(1);
          }}
          onSort={(key) => {
            setSortState((current) => {
              if (current?.key !== key) {
                return { key, direction: "ASC" };
              }

              if (current.direction === "ASC") {
                return { key, direction: "DESC" };
              }

              return null;
            });
            setPage(1);
          }}
        />
      </div>

      {editingDevice ? (
        <AddDeviceModal
          mode="edit"
          device={editingDevice}
          onClose={() => setEditingDevice(null)}
          onSave={async (payload) => {
            const result = await dispatch(
              updateDevice({
                id: editingDevice.id,
                ...payload,
                userName: user?.profile?.username ?? "SYSTEM",
              }),
            );

            if (updateDevice.fulfilled.match(result)) {
              await refetchDevicesList();
              setEditingDevice(null);
            }
          }}
        />
      ) : null}

      {deviceAction ? (
        <DeviceActionModal
          action={deviceAction}
          remarks={removeRemarks}
          onRemarksChange={setRemoveRemarks}
          resolveReason={resolveReason}
          onResolveReasonChange={setResolveReason}
          resolvedById={resolvedById}
          onResolvedByIdChange={setResolvedById}
          users={userOptions}
          isAdminUser={isAdminUser}
          hasExistingResolve={false}
          loadingResolveDetails={false}
          usersLoading={usersLoading}
          submitting={resolveLoading || loading}
          onClose={() => {
            setDeviceAction(null);
            setRemoveRemarks("");
            setResolveReason("");
            setResolvedById("");
          }}
          onConfirmStatus={async () => {
            if (!deviceAction || deviceAction.type !== "status") {
              return;
            }

            const locationId = resolveDeviceLocationId(
              deviceAction.device,
              locationList,
            );

            if (!locationId) {
              toast.warning(
                "Unable to resolve location for this device.",
                "Device",
              );
              return;
            }

            const result = await dispatch(
              updateDeviceStatus({
                locationId,
                deviceCode: deviceAction.device.deviceCode,
                status: deviceAction.nextStatus,
              }),
            );

            if (updateDeviceStatus.fulfilled.match(result)) {
              await refetchDevicesList();
              setDeviceAction(null);
            }
          }}
          onRemove={async () => {
            if (!deviceAction || deviceAction.type !== "remove") {
              return;
            }

            if (!removeRemarks.trim()) {
              toast.warning(
                "Remarks are required before removing a device.",
                "Device",
              );
              return;
            }

            const result = await dispatch(
              removeDevice({
                id: deviceAction.device.id,
                userName: user?.profile?.username ?? "SYSTEM",
                remarks: removeRemarks,
              }),
            );

            if (removeDevice.fulfilled.match(result)) {
              await refetchDevicesList();
              setDeviceAction(null);
              setRemoveRemarks("");
            }
          }}
          onResolve={async () => {
            if (!deviceAction || deviceAction.type !== "resolve") {
              return;
            }

            if (!resolveReason.trim()) {
              toast.warning("Reason is required before resolving.", "Device");
              return;
            }

            if (isAdminUser && !resolvedById.trim()) {
              toast.warning("Resolved By is required for admin.", "Device");
              return;
            }

            const result = await dispatch(
              resolveDevice({
                deviceId: deviceAction.device.id,
                reason: resolveReason,
                resolvedBy: isAdminUser
                  ? resolvedById
                  : user?.profile?.id
                    ? String(user.profile.id)
                    : undefined,
              }),
            );

            if (resolveDevice.fulfilled.match(result)) {
              await refetchDevicesList();
              setDeviceAction(null);
              setResolveReason("");
              setResolvedById("");
            }
          }}
        />
      ) : null}

      {detailsDevice ? (
        <DeviceDetailsModal
          deviceDetails={visibleDeviceDetails}
          loading={detailsLoading}
          onClose={() => {
            setDetailsDevice(null);
            dispatch(clearCurrentDeviceDetails());
          }}
        />
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  isActive,
  onClick,
  description,
}: {
  label: string;
  value: string;
  icon: string;
  accent: "violet" | "green" | "slate" | "red";
  isActive: boolean;
  onClick: () => void;
  description?: string;
}) {
  const accentStyles = {
    violet: {
      card: "border-violet-100",
    },
    green: {
      card: "border-emerald-100",
    },
    slate: {
      card: "border-slate-200",
    },
    red: {
      card: "border-rose-100",
    },
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      className={`flex items-center justify-between gap-2 rounded-[8px] border bg-white px-5 py-4 text-left shadow-[rgba(0,0,0,0.05)] transition ${
        isActive
          ? "border-[#5E1B7F] ring-2 ring-[#5E1B7F1F]"
          : accentStyles[accent].card
      }`}
    >
      <div>
        <div className="flex gap-1">
          <p className="text-[12px] lg:text-[14px] xl:text-[16px] font-medium text-[#333333]">{label}</p>
          {description ? <InfoTooltip description={description} /> : null}
        </div>
        <p className="mt-2 text-[16px] lg:text-[20px] xl:text-[24px] font-semibold leading-none text-slate-900">
          {value}
        </p>
      </div>
      <div className="flex md:h-10 md:w-10 xl:h-14 xl:w-14 items-center justify-center rounded-xl">
        <img src={icon} alt={label} className="md:h-10 md:w-10 lg:h-12 lg:w-12 xl:h-14 xl:w-14" />
      </div>
    </button>
  );
}

function DeviceActionModal({
  action,
  remarks,
  onRemarksChange,
  resolveReason,
  onResolveReasonChange,
  resolvedById,
  onResolvedByIdChange,
  users,
  isAdminUser,
  hasExistingResolve,
  loadingResolveDetails,
  usersLoading,
  submitting,
  onClose,
  onConfirmStatus,
  onRemove,
  onResolve,
}: {
  action: Exclude<DeviceActionState, null>;
  remarks: string;
  onRemarksChange: (value: string) => void;
  resolveReason: string;
  onResolveReasonChange: (value: string) => void;
  resolvedById: string;
  onResolvedByIdChange: (value: string) => void;
  users: ManagedUserRecord[];
  isAdminUser: boolean;
  hasExistingResolve: boolean;
  loadingResolveDetails: boolean;
  usersLoading: boolean;
  submitting: boolean;
  onClose: () => void;
  onConfirmStatus: () => Promise<void>;
  onRemove: () => Promise<void>;
  onResolve: () => Promise<void>;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedUserLabel = useMemo(() => {
    const selectedUser = users.find(
      (user) => String(user.id ?? user.userId) === String(resolvedById),
    );

    return (
      selectedUser?.employeeName ||
      selectedUser?.username ||
      selectedUser?.empId ||
      "Select"
    );
  }, [users, resolvedById]);
  const isRemoveAction = action.type === "remove";
  const isResolveAction = action.type === "resolve";
  const isActivateAction =
    action.type === "status" && action.nextStatus === "Active";

  const title = isRemoveAction
    ? "Are you sure want to Remove this Device?"
    : isResolveAction
      ? "Are you sure you want to Resolve this Device?"
      : `Are you sure want to mark as ${action.nextStatus} this Device?`;

  const description = isRemoveAction
    ? "Removing this device will permanently remove it from the system and stop all associated activities."
    : isResolveAction
      ? "Resolving this device will update its status and mark the issue as resolved. All related activities will continue normally after resolution."
      : isActivateAction
        ? "Marking this device as active will make it available again for active operations."
        : "Marking this device inactive will stop all scheduled content on this device and remove it from active operations.";

  const submitDisabled = isRemoveAction
    ? !remarks.trim() || submitting
    : isResolveAction
      ? !resolveReason.trim() ||
        (isAdminUser && !resolvedById.trim()) ||
        submitting ||
        loadingResolveDetails
      : submitting;

  return (
    <Modal onClose={onClose} className="max-w-xl">
      <div className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden">
        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
              isRemoveAction
                ? "bg-rose-50"
                : isResolveAction
                  ? "bg-[#F7F7F7]"
                  : "bg-sky-50"
            }`}
          >
            {isRemoveAction ? (
              <Trash2 size={34} className="text-rose-500" />
            ) : isResolveAction ? (
              <div className="relative">
                <img
                  src="/Images/DeviceManagement/Resolve_Device.png"
                  alt="Resolve"
                />
              </div>
            ) : (
              <div className="relative">
                <Monitor size={40} className="text-sky-600" />
                <Power
                  size={16}
                  className="absolute -right-1 -top-1 text-rose-500"
                />
              </div>
            )}
          </div>

          <h3 className="mt-6 text-[22px] font-medium leading-tight text-[#333333]">
            {title}
          </h3>
          <p className="mt-4 text-[13px] leading-6 text-[#566272]">
            {description}
          </p>

          {isRemoveAction ? (
            <label className="mt-6 block text-left">
              <span className="mb-2 block text-[14px] text-[#333333]">
                * Reason
              </span>
              <textarea
                value={remarks}
                onChange={(event) => onRemarksChange(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Add a reason before removing the device"
                required
              />
            </label>
          ) : null}

          {isResolveAction ? (
            <div className="mt-6 space-y-4 text-left">
              <label className="block">
                <span className="mb-2 block text-[14px] text-[#333333]">
                  Reason <span className="text-rose-500">*</span>
                </span>
                <textarea
                  value={resolveReason}
                  onChange={(event) =>
                    onResolveReasonChange(event.target.value)
                  }
                  rows={4}
                  className="w-full rounded-[8px] border border-[#E6E6E6] px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Please enter resolving reason"
                  required
                />
              </label>

              {loadingResolveDetails ? (
                <div className="rounded-[8px] border border-[#E6E6E6] bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Loading resolve details...
                </div>
              ) : null}

              {isAdminUser && (
                <label className="block">
                  <span className="mb-2 block text-[14px] text-[#333333]">
                    Resolved By <span className="text-rose-500">*</span>
                  </span>
                  <div className="relative w-full">
                    <button
                      type="button"
                      onClick={() => setDropdownOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-[8px] border border-[#E6E6E6] bg-white px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      disabled={usersLoading || loadingResolveDetails}
                    >
                      <span>
                        {usersLoading ? "Loading users..." : selectedUserLabel}
                      </span>

                      <ChevronDown
                        className={`h-4 w-4 text-[#667085] transition-transform ${
                          dropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute left-0 top-[calc(100%+0.35rem)] z-30 h-[150px] w-full overflow-y-auto overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            onResolvedByIdChange("");
                            setDropdownOpen(false);
                          }}
                          className={`flex w-full items-center px-4 py-3 text-left text-sm transition ${
                            !resolvedById
                              ? "bg-[#F4ECFA] text-[#7C3AA8]"
                              : "bg-white text-[#333333] hover:bg-slate-50"
                          }`}
                        >
                          Select
                        </button>

                        {users.map((option) => {
                          const optionValue = String(
                            option.id ?? option.userId,
                          );

                          const isSelected =
                            String(resolvedById) === optionValue;

                          return (
                            <button
                              key={optionValue}
                              type="button"
                              onClick={() => {
                                onResolvedByIdChange(optionValue);
                                setDropdownOpen(false);
                              }}
                              className={`flex w-full items-center px-4 py-3 text-left text-sm transition ${
                                isSelected
                                  ? "bg-[#F4ECFA] text-[#7C3AA8]"
                                  : "bg-white text-[#333333] hover:bg-slate-50"
                              }`}
                              role="option"
                              aria-selected={isSelected}
                            >
                              <span>
                                {option.employeeName ||
                                  option.username ||
                                  option.empId}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </label>
              )}
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                void (isRemoveAction
                  ? onRemove()
                  : isResolveAction
                    ? onResolve()
                    : onConfirmStatus())
              }
              className={`rounded-xl px-4 py-3 font-semibold transition ${
                submitDisabled
                  ? "cursor-not-allowed bg-[#B8B8B8] text-[#333333] opacity-70"
                  : "bg-custom-gradient text-white hover:opacity-95"
              }`}
              disabled={submitDisabled}
            >
              {isRemoveAction
                ? "Yes, Remove"
                : isResolveAction
                  ? hasExistingResolve
                    ? "Update"
                    : "Submit"
                  : "Yes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-[#333333] transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DeviceDetailsModal({
  deviceDetails,
  loading,
  onClose,
}: {
  deviceDetails: DeviceDetails | null;
  loading: boolean;
  onClose: () => void;
}) {
  const device = deviceDetails?.device ?? null;
  const history = deviceDetails?.resolutionHistory ?? [];
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const historyColumns: Column<DeviceResolutionHistoryRecord>[] = [
    {
      label: "Remark",
      key: "remarks",
      filterable: true,
      sortable: true,
    },
    {
      label: "Resolve By",
      key: "resolvedBy",
      filterable: true,
      sortable: true,
    },
    {
      label: "Resolve Date",
      key: "resolvedDate",
      filterable: true,
      sortable: true,
      render: (row) => formatDateTime(row.resolvedDate),
    },
  ];

  const filteredHistory = useMemo(
    () =>
      history.filter((entry) =>
        Object.entries(filters).every(([key, value]) => {
          if (!value.trim()) {
            return true;
          }

          const normalizedValue = value.trim().toLowerCase();
          const candidate =
            key === "resolvedDate"
              ? formatDateTime(entry.resolvedDate)
              : String(entry[key as keyof DeviceResolutionHistoryRecord] ?? "");

          return candidate.toLowerCase().includes(normalizedValue);
        }),
      ),
    [filters, history],
  );

  const sortedHistory = useMemo(() => {
    if (!sortState) {
      return filteredHistory;
    }

    return [...filteredHistory].sort((left, right) => {
      const leftValue =
        sortState.key === "resolvedDate"
          ? toComparableTimestamp(left.resolvedDate)
          : String(
              left[sortState.key as keyof DeviceResolutionHistoryRecord] ?? "",
            ).toLowerCase();
      const rightValue =
        sortState.key === "resolvedDate"
          ? toComparableTimestamp(right.resolvedDate)
          : String(
              right[sortState.key as keyof DeviceResolutionHistoryRecord] ?? "",
            ).toLowerCase();

      if (leftValue < rightValue) {
        return sortState.direction === "ASC" ? -1 : 1;
      }

      if (leftValue > rightValue) {
        return sortState.direction === "ASC" ? 1 : -1;
      }

      return 0;
    });
  }, [filteredHistory, sortState]);

  return (
    <Modal
      onClose={onClose}
      className="max-w-[calc(100vw-1rem)] rounded-[12px] sm:max-w-6xl"
    >
      <div className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden">
        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[18px] font-semibold text-[#333333] sm:text-[20px]">
                Device Details
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
              aria-label="Close details modal"
            >
              <XCircle size={18} />
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-[#F3F3F3] p-4 sm:mt-5 sm:p-5">
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
              <DetailField label="Brand" value={device?.brand ?? "-"} />
              <DetailField label="Model" value={device?.model ?? "-"} />
              <DetailField
                label="Orientation"
                value={device?.orientation ?? "-"}
              />
              <DetailField
                label="Location"
                value={
                  device?.locationName ?? device?.locations?.locationName ?? "-"
                }
              />
              <DetailField
                label="Size"
                value={device?.deviceSize ? `${device.deviceSize} inch` : "-"}
              />
              <DetailField label="Landmark" value={device?.landmark ?? "-"} />
              <DetailField
                label="Created By"
                value={device?.createdBy ?? "-"}
              />
              <DetailField
                label="Created on"
                value={formatDateTime(device?.createdAt)}
              />
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-[18px] font-semibold text-[#333333] sm:text-[20px]">
              Device Resolution History
            </h3>

            <div className="mt-4">
              <DataTable
                data={sortedHistory}
                columns={historyColumns}
                loading={loading}
                page={1}
                totalPages={1}
                sortState={sortState}
                onPageChange={() => undefined}
                onFilter={(key, value) => {
                  setFilters((current) => ({
                    ...current,
                    [key]: value,
                  }));
                }}
                onSort={(key) => {
                  setSortState((current) => {
                    if (current?.key !== key) {
                      return { key, direction: "ASC" };
                    }

                    if (current.direction === "ASC") {
                      return { key, direction: "DESC" };
                    }

                    return null;
                  });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[12px] text-slate-500">{label}</p>
      <p className="mt-1 text-[16px] font-medium text-[#333333]">{value}</p>
    </div>
  );
}
