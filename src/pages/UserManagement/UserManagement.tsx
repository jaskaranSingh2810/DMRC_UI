import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import ActionMenu from "@/components/Table/ActionMenu";
import DataTable from "@/components/Table/DataTable";
import type { SortState } from "@/components/Table/types";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/hooks/useToast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearUserMessages,
  fetchUsers,
  setUserFilter,
  updateUserStatus,
} from "@/store/slices/userSlice";
import type { ManagedUserRecord } from "@/types";

type UserStatFilter = "all" | "active" | "inactive";

type UserActionState =
  | {
      user: ManagedUserRecord;
      type: "status";
      nextStatus: "Active" | "Inactive";
    }
  | null;

function normalizeUserStatus(status: string): UserStatFilter | "other" {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "active") {
    return "active";
  }

  if (normalizedStatus === "inactive") {
    return "inactive";
  }

  return "other";
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString("en-GB");
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getLocationAccessLabel(user: ManagedUserRecord): string {
  if (user.locationAccess?.length) {
    return user.locationAccess.join(", ");
  }

  return "All Locations";
}

function getModuleAccessLabel(user: ManagedUserRecord): string {
  if (user.moduleAccess?.length) {
    return user.moduleAccess.join(", ");
  }

  return "-";
}

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = normalizeUserStatus(status);
  const styles =
    normalizedStatus === "active"
      ? "bg-emerald-50 text-emerald-600"
      : normalizedStatus === "inactive"
        ? "bg-slate-100 text-slate-600"
        : "bg-slate-100 text-slate-600";

  const displayStatus =
    normalizedStatus === "active"
      ? "Active"
      : normalizedStatus === "inactive"
        ? "Inactive"
        : status;

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${styles}`}
    >
      {displayStatus}
    </span>
  );
}

export default function UserManagement() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { user: authUser } = useAppSelector((state) => state.auth);
  const {
    items,
    loading,
    error,
    successMessage,
    filters,
    listLoaded,
    selectedModule,
  } = useAppSelector((state) => state.users);

  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [selectedStatFilter, setSelectedStatFilter] =
    useState<UserStatFilter>("all");
  const [userAction, setUserAction] = useState<UserActionState>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (!listLoaded) {
      void dispatch(fetchUsers());
    }
  }, [dispatch, listLoaded]);

  useEffect(() => {
    if (!listLoaded) {
      return;
    }

    void dispatch(
      fetchUsers({
        page: 0,
        size: 10,
        ...(sortState
          ? {
              sortCriteria: [
                {
                  field: sortState.key,
                  direction: sortState.direction,
                },
              ],
            }
          : {}),
      }),
    );
    setPage(1);
  }, [dispatch, listLoaded, sortState]);

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage, "User");
      dispatch(clearUserMessages());
    }
  }, [dispatch, successMessage, toast]);

  useEffect(() => {
    if (error) {
      toast.error(error, "User");
      dispatch(clearUserMessages());
    }
  }, [dispatch, error, toast]);

  const filteredUsers = useMemo(() => {
    const usersMatchingTableFilters = items.filter((item) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value) {
          return true;
        }

        const normalizedFilter = value.toLowerCase().trim();
        const rawValue =
          key === "locationAccess"
            ? getLocationAccessLabel(item)
            : key === "moduleAccess"
              ? getModuleAccessLabel(item)
              : String(item[key as keyof ManagedUserRecord] ?? "");

        return String(rawValue).toLowerCase().includes(normalizedFilter);
      }),
    );

    const usersMatchingModule =
      selectedModule === "all"
        ? usersMatchingTableFilters
        : usersMatchingTableFilters.filter((item) =>
            item.moduleAccess?.some(
              (moduleName) =>
                moduleName.toLowerCase() === selectedModule.toLowerCase(),
            ),
          );

    if (selectedStatFilter === "all") {
      return usersMatchingModule;
    }

    return usersMatchingModule.filter(
      (item) => normalizeUserStatus(item.status) === selectedStatFilter,
    );
  }, [filters, items, selectedModule, selectedStatFilter]);

  const totalUsersCount = items.length;
  const activeUsersCount = useMemo(
    () =>
      items.filter((item) => normalizeUserStatus(item.status) === "active")
        .length,
    [items],
  );
  const inactiveUsersCount = useMemo(
    () =>
      items.filter((item) => normalizeUserStatus(item.status) === "inactive")
        .length,
    [items],
  );

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [selectedStatFilter, selectedModule]);

  useEffect(() => {
    setSelectedStatFilter("all");
  }, [selectedModule]);

  const handleStatCardClick = (nextFilter: UserStatFilter) => {
    setSelectedStatFilter((current) => {
      if (nextFilter === "all") {
        return "all";
      }

      return current === nextFilter ? "all" : nextFilter;
    });
  };

  const columns = [
    {
      label: "Emp ID",
      key: "empId",
      filterable: true,
      sortable: true,
    },
    {
      label: "Employee Name",
      key: "employeeName",
      filterable: true,
      sortable: true,
    },
    {
      label: "Email Id",
      key: "emailId",
      filterable: true,
      sortable: true,
    },
    {
      label: "Mobile Number",
      key: "mobileNumber",
      filterable: true,
      sortable: true,
    },
    {
      label: "Password",
      key: "password",
      filterable: true,
      render: (row: ManagedUserRecord) => {
        const passwordKey = String(row.id);
        const isVisible = visiblePasswords[passwordKey];
        const passwordValue = row.password || "XXXXXXXX";

        return (
          <div className="flex items-center gap-2">
            <span>{isVisible ? passwordValue : "XXXXXXXX"}</span>
            <button
              type="button"
              onClick={() =>
                setVisiblePasswords((current) => ({
                  ...current,
                  [passwordKey]: !current[passwordKey],
                }))
              }
              className="text-slate-500 transition hover:text-slate-700"
              aria-label={isVisible ? "Hide password" : "Show password"}
            >
              {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        );
      },
    },
    {
      label: "Location Access",
      key: "locationAccess",
      filterable: true,
      sortable: true,
      render: (row: ManagedUserRecord) => getLocationAccessLabel(row),
    },
    {
      label: "Module Access",
      key: "moduleAccess",
      filterable: true,
      sortable: true,
      render: (row: ManagedUserRecord) => getModuleAccessLabel(row),
    },
    {
      label: "Last Logged in",
      key: "lastLoggedIn",
      filterable: true,
      sortable: true,
      render: (row: ManagedUserRecord) => formatDateTime(row.lastLoggedIn),
    },
    {
      label: "Created On",
      key: "createdOn",
      filterable: true,
      sortable: true,
      render: (row: ManagedUserRecord) => formatDate(row.createdOn),
    },
    {
      label: "Created By",
      key: "createdBy",
      filterable: true,
      sortable: true,
    },
    {
      label: "Status",
      key: "status",
      filterable: true,
      render: (row: ManagedUserRecord) => <StatusBadge status={row.status} />,
    },
    {
      label: "Actions",
      key: "actions",
      render: (row: ManagedUserRecord) => (
        <ActionMenu
          actions={[
            {
              label: "Edit User Details",
              onClick: () =>
                toast.info?.("Edit user details flow is not implemented yet."),
            },
            {
              label: "Change Password",
              onClick: () =>
                toast.info?.("Change password flow is not implemented yet."),
            },
            {
              label: "Manage Access",
              onClick: () =>
                toast.info?.("Manage access flow is not implemented yet."),
            },
            {
              label:
                normalizeUserStatus(row.status) === "inactive"
                  ? "Activate"
                  : "Deactivate",
              onClick: () =>
                setUserAction({
                  user: row,
                  type: "status",
                  nextStatus:
                    normalizeUserStatus(row.status) === "inactive"
                      ? "Active"
                      : "Inactive",
                }),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Users"
          value={String(totalUsersCount)}
          accent="violet"
          icon={'/Images/UserManagement/Total_Users.png'}
          isActive={selectedStatFilter === "all"}
          onClick={() => handleStatCardClick("all")}
        />
        <StatCard
          label="Active Users"
          value={String(activeUsersCount)}
          accent="green"
          icon={'/Images/UserManagement/Active_Users.png'}
          isActive={selectedStatFilter === "active"}
          onClick={() => handleStatCardClick("active")}
        />
        <StatCard
          label="Inactive Users"
          value={String(inactiveUsersCount)}
          accent="slate"
          icon={'/Images/UserManagement/Inactive_Users.png'}
          isActive={selectedStatFilter === "inactive"}
          onClick={() => handleStatCardClick("inactive")}
        />
      </div>

      <div className="shadow-sm">
        <DataTable
          data={paginatedUsers}
          columns={columns}
          loading={loading}
          page={page}
          totalPages={totalPages}
          sortState={sortState}
          onPageChange={setPage}
          onFilter={(key, value) => {
            dispatch(setUserFilter({ key, value }));
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

      {userAction ? (
        <UserStatusConfirmModal
          user={userAction.user}
          nextStatus={userAction.nextStatus}
          onClose={() => setUserAction(null)}
          onConfirm={async () => {
            const result = await dispatch(
              updateUserStatus({
                id: userAction.user.id,
                status: userAction.nextStatus,
                userName: authUser?.profile?.username ?? "Admin",
              }),
            );

            if (updateUserStatus.fulfilled.match(result)) {
              await dispatch(
                fetchUsers({
                  page: 0,
                  size: 10,
                  ...(sortState
                    ? {
                        sortCriteria: [
                          {
                            field: sortState.key,
                            direction: sortState.direction,
                          },
                        ],
                      }
                    : {}),
                }),
              );
              setUserAction(null);
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
  accent: "violet" | "green" | "slate";
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
      tile: "bg-emerald-100 text-emerald-600",
    },
    slate: {
      card: "border-slate-200",
      tile: "bg-slate-200 text-slate-600",
    },
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      className={`flex items-center gap-2 justify-between rounded-[8px] border bg-white px-5 py-4 text-left shadow-[rgba(0,0,0,0.05)] transition ${
        isActive
          ? "border-[#5E1B7F] ring-2 ring-[#5E1B7F1F]"
          : accentStyles[accent].card
      }`}
    >
      <div>
        <p className="text-[16px] font-medium text-slate-700">{label}</p>
        <p className="mt-2 text-[24px] font-semibold leading-none text-slate-900">
          {value}
        </p>
      </div>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${accentStyles[accent].tile}`}
      >
        <img src={icon} alt={label} className="h-12 w-12" />
      </div>
    </button>
  );
}

function UserStatusConfirmModal({
  user,
  nextStatus,
  onClose,
  onConfirm,
}: {
  user: ManagedUserRecord;
  nextStatus: "Active" | "Inactive";
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <Modal onClose={onClose} className="max-w-xl">
      <div className="px-8 py-9 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sky-50">
          <img src="/Images/UserManagement/Deactivate_Users.png" className="h-20 w-20" alt="Shield Check" />
        </div>
        <h3 className="mt-6 text-[22px] font-medium leading-tight text-slate-900">
          Deactivate User
        </h3>
        <p className="mt-4 text-sm leading-6 text-slate-500 text-[14px] font-normal">
          Are you sure you want to deactivate this user?
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="button" 
            onClick={() => void onConfirm()}
            className="rounded-xl bg-custom-gradient px-4 py-3 font-semibold text-white transition hover:opacity-95"
          >
            Yes
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
