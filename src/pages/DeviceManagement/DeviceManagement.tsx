import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Monitor,
  Power,
  Trash2,
  XCircle,
} from "lucide-react";
import AddDeviceModal from "@/components/DeviceManagement/AddDeviceModal";
import ActionMenu from "@/components/Table/ActionMenu";
import DataTable from "@/components/Table/DataTable";
import type { Column } from "@/components/Table/types";
import type { SortState } from "@/components/Table/types";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/hooks/useToast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearDeviceMessages,
  fetchDevices,
  removeDevice,
  setDeviceFilter,
  updateDeviceStatus,
  updateDevice,
} from "@/store/slices/deviceSlice";
import { fetchLocations } from "@/store/slices/locationSlice";
import type { DeviceRecord } from "@/types";
import { buildDeviceListRequest } from "./deviceListRequest";

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

function formatCreatedAt(value?: string): string {
  if (!value) {
    return "-";
  }

  const [datePart] = value.split("T");
  return datePart || "-";
}

export default function DeviceManagement() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const {
    items,
    loading,
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

  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [editingDevice, setEditingDevice] = useState<DeviceRecord | null>(null);
  const [deviceAction, setDeviceAction] = useState<DeviceActionState>(null);
  const [removeRemarks, setRemoveRemarks] = useState("");
  const [selectedStatFilter, setSelectedStatFilter] =
    useState<DeviceStatFilter>("all");

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

    { label: "Brand", key: "brand", filterable: true, sortable: true },

    { label: "Model", key: "model", filterable: true, sortable: true },

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

    { label: "Size", key: "deviceSize", filterable: true, sortable: true },

    {
      label: "Locations",
      key: "locations",
      filterable: true,
      sortable: true,
      render: (row: DeviceRecord) =>
        row.locationName ?? row.locations?.locationName ?? "-",
    },

    { label: "Created By", key: "createdBy", filterable: true, sortable: true },

    {
      label: "Created On",
      key: "createdAt",
      filterable: true,
      filterType: "date",
      sortable: true,
      render: (row: DeviceRecord) => formatCreatedAt(row.createdAt),
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
              label: "Edit",
              onClick: () => setEditingDevice(row),
            },
            {
              label: "Remove",
              onClick: () => {
                setDeviceAction({
                  device: row,
                  type: "remove",
                });
                setRemoveRemarks("");
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Devices"
          value={String(summary.totalDevices)}
          accent="violet"
          icon={"/Images/DeviceManagement/Total_Devices.png"}
          isActive={selectedStatFilter === "all"}
          onClick={() => handleStatCardClick("all")}
        />
        <StatCard
          label="Active Devices"
          value={String(summary.activeDevices)}
          accent="green"
          icon={"/Images/DeviceManagement/Active_Devices.png"}
          isActive={selectedStatFilter === "active"}
          onClick={() => handleStatCardClick("active")}
        />
        <StatCard
          label="Inactive Devices"
          value={String(summary.inactiveDevices)}
          accent="slate"
          icon={"/Images/DeviceManagement/Inactive_Devices.png"}
          isActive={selectedStatFilter === "inactive"}
          onClick={() => handleStatCardClick("inactive")}
        />
        <StatCard
          label="Not working Devices"
          value={String(summary.notWorkingDevices)}
          accent="red"
          icon={"/Images/DeviceManagement/Not_Working_Devices.png"}
          isActive={selectedStatFilter === "not_working"}
          onClick={() => handleStatCardClick("not_working")}
        />
        <StatCard
          label="Unregistered Devices"
          value={String(summary.unRegisteredDevices)}
          accent="red"
          icon={"/Images/DeviceManagement/UnRegistered_Devices.png"}
          isActive={selectedStatFilter === "unRegistered"}
          onClick={() => handleStatCardClick("unRegistered")}
        />
      </div>

      <div className="shadow-sm">
        <DataTable
          data={items}
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
                userName: "Jaskaran Singh",
              }),
            );

            if (updateDevice.fulfilled.match(result)) {
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
              setEditingDevice(null);
            }
          }}
        />
      ) : null}

      {deviceAction ? (
        <DeviceConfirmModal
          action={deviceAction}
          remarks={removeRemarks}
          onRemarksChange={setRemoveRemarks}
          onClose={() => {
            setDeviceAction(null);
            setRemoveRemarks("");
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
                userName: "Anamika Kumari",
                remarks: removeRemarks,
              }),
            );

            if (removeDevice.fulfilled.match(result)) {
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
              setDeviceAction(null);
              setRemoveRemarks("");
            }
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
}: {
  label: string;
  value: string;
  icon: string;
  accent: "violet" | "green" | "slate" | "red";
  isActive: boolean;
  onClick: () => void;
}) {
  const accentStyles = {
    violet: {
      card: "border-violet-100",
      tile: "bg-violet-100 text-violet-700",
    },
    green: {
      card: "border-emerald-100",
      tile: "bg-emerald-100 text-emerald-700",
    },
    slate: {
      card: "border-slate-200",
      tile: "bg-slate-200 text-slate-600",
    },
    red: {
      card: "border-rose-100",
      tile: "bg-rose-100 text-rose-600",
    },
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      className={`flex items-center gap-2 justify-between rounded-[8px] border bg-white px-5 py-4 text-left shadow-[rgba(0, 0, 0, 0.05)] transition ${isActive ? "border-[#5E1B7F] ring-2 ring-[#5E1B7F1F]" : accentStyles[accent].card}`}
    >
      <div>
        <p className="text-[16px] font-medium text-slate-700">{label}</p>
        <p className="mt-2 text-[24px] font-semibold leading-none text-slate-900">
          {value}
        </p>
      </div>
      <div className={`flex h-14 w-14 items-center justify-center rounded-xl`}>
        <img src={icon} alt={label} className="h-14 w-14" />
      </div>
    </button>
  );
}

function DeviceConfirmModal({
  action,
  remarks,
  onRemarksChange,
  onClose,
  onConfirmStatus,
  onRemove,
}: {
  action: Exclude<DeviceActionState, null>;
  remarks: string;
  onRemarksChange: (value: string) => void;
  onClose: () => void;
  onConfirmStatus: () => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const isRemoveAction = action.type === "remove";
  const isActivateAction =
    action.type === "status" && action.nextStatus === "Active";
  const title = isRemoveAction
    ? "Are you sure want to Remove this Device?"
    : `Are you sure want to mark as ${action.nextStatus} this Device?`;
  const description = isRemoveAction
    ? "Removing this device will permanently remove it from the system and stop all associated activities."
    : isActivateAction
      ? "Marking this device as active will make it available again for active operations."
      : "Marking this device inactive will stop all scheduled content on this devised &  remove it from active operations.";

  return (
    <Modal onClose={onClose} className="max-w-xl">
      <div className="px-8 py-9 text-center">
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
            isRemoveAction ? "bg-rose-50" : "bg-sky-50"
          }`}
        >
          {isRemoveAction ? (
            <img
              src="/Images/DeviceManagement/Remove_Confirmation.png"
              alt="Remove Device"
              className="h-20 w-20"
            />
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
        <h3 className="mt-6 text-[24px] font-semibold leading-tight text-slate-900">
          {title}
        </h3>
        <p className="mt-4 text-sm leading-6 text-slate-500">{description}</p>

        {isRemoveAction ? (
          <label className="mt-6 block text-left">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
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

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              void (isRemoveAction ? onRemove() : onConfirmStatus())
            }
            className={`rounded-xl px-4 py-3 font-semibold transition
  ${
    isRemoveAction && !remarks.trim()
      ? "bg-[#B8B8B8] cursor-not-allowed opacity-70 text-[#333333]"
      : "bg-custom-gradient hover:opacity-95 text-white"
  }`}
            disabled={isRemoveAction && !remarks.trim() ? true : false}
          >
            {isRemoveAction ? "Yes, Remove" : "Yes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
