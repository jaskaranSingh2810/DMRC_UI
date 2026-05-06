import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ActionMenu from "@/components/Table/ActionMenu";
import DataTable from "@/components/Table/DataTable";
import type { Column, SortState } from "@/components/Table/types";
import { getLocationAccessLabel } from "@/api/userManagementService";
import { useToast } from "@/hooks/useToast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchLocations } from "@/store/slices/locationSlice";
import {
  clearUserMessages,
  fetchUserModules,
  fetchUsers,
  resetUserPassword,
  setSelectedUserStatFilter,
  setUserFilter,
  setUserSorting,
  updateUserStatus,
} from "@/store/slices/usersSlice";
import type { ManagedUserRecord } from "@/types/user";
import UserPasswordModal from "./components/UserPasswordModal";
import UserStatCard from "./components/UserStatCard";
import UserStatusBadge from "./components/UserStatusBadge";
import UserStatusConfirmModal from "./components/UserStatusConfirmModal";
import { buildUserListRequest } from "./userListRequest";

type UserActionState =
  | {
      user: ManagedUserRecord;
      nextStatus: "Active" | "Inactive";
    }
  | null;

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

export default function UserManagement() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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
    selectedModules,
    selectedStatFilter,
    summary,
    availableModules,
    passwordResetLoading,
  } = useAppSelector((state) => state.users);
  const { items: locationList, listLoaded: locationListLoaded } =
    useAppSelector((state) => state.locations);

  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [statusAction, setStatusAction] = useState<UserActionState>(null);
  const [passwordUser, setPasswordUser] = useState<ManagedUserRecord | null>(null);
  const [passwordResetMessage, setPasswordResetMessage] = useState<string | null>(
    null,
  );
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);

  useEffect(() => {
    if (!locationListLoaded) {
      void dispatch(fetchLocations());
    }
  }, [dispatch, locationListLoaded]);

  useEffect(() => {
    if (availableModules.length === 0) {
      void dispatch(fetchUserModules());
    }
  }, [availableModules.length, dispatch]);

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage, "User");
      dispatch(clearUserMessages());
    }
  }, [dispatch, successMessage, toast]);

  useEffect(() => {
    if (error && !passwordUser) {
      toast.error(error, "User");
      dispatch(clearUserMessages());
    }
  }, [dispatch, error, passwordUser, toast]);

  useEffect(() => {
    setPage(1);
  }, [selectedModules, selectedStatFilter]);

  const request = useMemo(
    () =>
      buildUserListRequest({
        filters,
        pageNumber: page,
        pageSize,
        selectedModules,
        selectedStatFilter,
        sortState,
      }),
    [filters, page, pageSize, selectedModules, selectedStatFilter, sortState],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void dispatch(fetchUsers(request));
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [dispatch, request]);

  const refetchUsers = async () => {
    await dispatch(fetchUsers(request));
  };

  const handleStatCardClick = (nextFilter: "all" | "active" | "inactive") => {
    dispatch(
      setSelectedUserStatFilter(
        nextFilter === "all"
          ? "all"
          : selectedStatFilter === nextFilter
            ? "all"
            : nextFilter,
      ),
    );
  };

  const columns: Column<ManagedUserRecord>[] = [
    {
      label: "User ID",
      key: "id",
      filterable: true,
      sortable: true,
      isHidden: false
    },
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
      label: "Location Access",
      key: "locationAccess",
      render: (row) =>
        row.locationAccess.length
          ? row.locationAccess.join(", ")
          : getLocationAccessLabel(row.accessAssignments, locationList),
    },
    {
      label: "Module Access",
      key: "moduleAccess",
      render: (row) => (row.moduleAccess.length ? row.moduleAccess.join(", ") : "-"),
    },
    {
      label: "Last Logged in",
      key: "lastLoggedIn",
      filterable: true,
      filterType: "date",
      sortable: true,
      render: (row) => formatDateTime(row.lastLoggedIn),
    },
    {
      label: "Created By",
      key: "createdBy",
      filterable: true,
      sortable: true,
    },
    {
      label: "Created On",
      key: "createdOn",
      filterable: true,
      filterType: "date",
      sortable: true,
      render: (row) => formatDate(row.createdOn),
    },
    {
      label: "Status",
      key: "status",
      filterable: true,
      render: (row) => <UserStatusBadge status={row.status} />,
    },
    {
      label: "Actions",
      key: "actions",
      render: (row) => (
        <ActionMenu
          actions={[
            {
              label: "Edit User",
              onClick: () => navigate(`/user-management/${row.id}/edit`),
            },
            {
              label: "Reset Password",
              onClick: () => {
                setPasswordResetMessage(null);
                setPasswordResetError(null);
                dispatch(clearUserMessages());
                setPasswordUser(row);
              },
            },
            {
              label: row.status === "Inactive" ? "Activate User" : "Deactivate User",
              onClick: () =>
                setStatusAction({
                  user: row,
                  nextStatus: row.status === "Inactive" ? "Active" : "Inactive",
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
        <UserStatCard
          label="Total Users"
          value={String(summary.totalUsers)}
          accent="violet"
          icon="/Images/UserManagement/Total_Users.png"
          isActive={selectedStatFilter === "all"}
          onClick={() => handleStatCardClick("all")}
        />
        <UserStatCard
          label="Active Users"
          value={String(summary.activeUsers)}
          accent="green"
          icon="/Images/UserManagement/Active_Users.png"
          isActive={selectedStatFilter === "active"}
          onClick={() => handleStatCardClick("active")}
        />
        <UserStatCard
          label="Inactive Users"
          value={String(summary.inactiveUsers)}
          accent="slate"
          icon="/Images/UserManagement/Inactive_Users.png"
          isActive={selectedStatFilter === "inactive"}
          onClick={() => handleStatCardClick("inactive")}
        />
      </div>

      {error && items.length === 0 && !passwordUser ? (
        <div className="rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void refetchUsers()}
              className="rounded-[8px] border border-rose-300 px-3 py-2 font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}

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
            dispatch(setUserFilter({ key, value }));
            setPage(1);
          }}
          onSort={(key) => {
            setSortState((current) => {
              const nextSortState =
                current?.key !== key
                  ? { key, direction: "ASC" as const }
                  : current.direction === "ASC"
                    ? { key, direction: "DESC" as const }
                    : null;

              dispatch(
                setUserSorting(
                  nextSortState
                    ? [
                        {
                          field: nextSortState.key,
                          direction: nextSortState.direction,
                        },
                      ]
                    : [],
                ),
              );

              return nextSortState;
            });
            setPage(1);
          }}
        />
      </div>

      {statusAction ? (
        <UserStatusConfirmModal
          user={statusAction.user}
          nextStatus={statusAction.nextStatus}
          loading={loading}
          onClose={() => setStatusAction(null)}
          onConfirm={async () => {
            const result = await dispatch(
              updateUserStatus({
                id: statusAction.user.id,
                status: statusAction.nextStatus,
              }),
            );

            if (updateUserStatus.fulfilled.match(result)) {
              await refetchUsers();
              setStatusAction(null);
            }
          }}
        />
      ) : null}

      {passwordUser ? (
        <UserPasswordModal
          user={passwordUser}
          loading={passwordResetLoading}
          message={passwordResetMessage}
          error={passwordResetError}
          onClose={() => {
            setPasswordUser(null);
            setPasswordResetMessage(null);
            setPasswordResetError(null);
            dispatch(clearUserMessages());
          }}
          onSubmit={async () => {
            const result = await dispatch(
              resetUserPassword({
                id: passwordUser.id,
              }),
            );

            if (resetUserPassword.fulfilled.match(result)) {
              setPasswordResetMessage(
                result.payload ||
                  "We've sent a password reset link to the user's registered email. Please ask them to check their inbox.",
              );
              setPasswordResetError(null);
              return;
            }

            setPasswordResetMessage(null);
            setPasswordResetError(
              result.payload ?? "Unable to send reset password link.",
            );
          }}
        />
      ) : null}
    </div>
  );
}
