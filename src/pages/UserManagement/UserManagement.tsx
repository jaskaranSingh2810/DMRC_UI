import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ActionMenu from "@/components/Table/ActionMenu";
import DataTable from "@/components/Table/DataTable";
import type { SortState } from "@/components/Table/types";
import { useToast } from "@/hooks/useToast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearUserMessages,
  fetchUsers,
  setSelectedUserStatFilter,
  setUserFilter,
  updateUserAccess,
  updateUserPassword,
  updateUserStatus,
} from "@/store/slices/userSlice";
import type { ManagedUserRecord } from "@/types";
import UserAccessModal from "./components/UserAccessModal";
import UserPasswordModal from "./components/UserPasswordModal";
import UserPasswordSuccessModal from "./components/UserPasswordSuccessModal";
import UserStatCard from "./components/UserStatCard";
import UserStatusBadge from "./components/UserStatusBadge";
import UserStatusConfirmModal from "./components/UserStatusConfirmModal";
import { buildUserListRequest } from "./userListRequest";
import { userLocationOptions } from "./userManagementData";

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

function getLocationAccessLabel(user: ManagedUserRecord): string {
  if (user.locationAccess?.length) {
    return user.locationAccess.join(", ");
  }

  return "-";
}

function getModuleAccessLabel(user: ManagedUserRecord): string {
  if (user.moduleAccess?.length) {
    return user.moduleAccess.join(", ");
  }

  return "-";
}

export default function UserManagement() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const { user: authUser } = useAppSelector((state) => state.auth);
  const {
    items,
    loading,
    error,
    successMessage,
    filters,
    currentPage,
    totalPages,
    pageSize,
    selectedModule,
    selectedStatFilter,
    summary,
  } = useAppSelector((state) => state.users);
  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [statusAction, setStatusAction] = useState<UserActionState>(null);
  const [passwordUser, setPasswordUser] = useState<ManagedUserRecord | null>(null);
  const [accessUser, setAccessUser] = useState<ManagedUserRecord | null>(null);
  const [showPasswordSuccess, setShowPasswordSuccess] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>(
    {},
  );

  const request = useMemo(
    () =>
      buildUserListRequest({
        filters,
        pageNumber: page,
        pageSize,
        selectedModule,
        selectedStatFilter,
        sortState,
      }),
    [filters, page, pageSize, selectedModule, selectedStatFilter, sortState],
  );

  useEffect(() => {
    void dispatch(fetchUsers(request));
  }, [dispatch, request]);

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

  useEffect(() => {
    setPage(1);
  }, [selectedModule, selectedStatFilter]);

  const refetchUsers = async () => {
    await dispatch(
      fetchUsers(
        buildUserListRequest({
          filters,
          pageNumber: page,
          pageSize,
          selectedModule,
          selectedStatFilter,
          sortState,
        }),
      ),
    );
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

        return (
          <div className="flex items-center gap-2">
            <span>{isVisible ? row.password : "XXXXXXXX"}</span>
            <button
              type="button"
              onClick={() =>
                setVisiblePasswords((current) => ({
                  ...current,
                  [passwordKey]: !current[passwordKey],
                }))
              }
              className="text-[#667085]"
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
      filterType: "date",
      sortable: true,
      render: (row: ManagedUserRecord) => formatDateTime(row.lastLoggedIn),
    },
    {
      label: "Created On",
      key: "createdOn",
      filterable: true,
      filterType: "date",
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
      render: (row: ManagedUserRecord) => <UserStatusBadge status={row.status} />,
    },
    {
      label: "Actions",
      key: "actions",
      render: (row: ManagedUserRecord) => (
        <ActionMenu
          actions={[
            {
              label: "Edit User Details",
              onClick: () => navigate(`/user-management/${row.id}/edit`),
            },
            {
              label: "Change Password",
              onClick: () => setPasswordUser(row),
            },
            {
              label: "Manage Access",
              onClick: () => setAccessUser(row),
            },
            {
              label: row.status === "Inactive" ? "Activate" : "Deactivate",
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
          onClick={() => dispatch(setSelectedUserStatFilter("all"))}
        />
        <UserStatCard
          label="Active Users"
          value={String(summary.activeUsers)}
          accent="green"
          icon="/Images/UserManagement/Active_Users.png"
          isActive={selectedStatFilter === "active"}
          onClick={() =>
            dispatch(
              setSelectedUserStatFilter(
                selectedStatFilter === "active" ? "all" : "active",
              ),
            )
          }
        />
        <UserStatCard
          label="Inactive Users"
          value={String(summary.inactiveUsers)}
          accent="slate"
          icon="/Images/UserManagement/Inactive_Users.png"
          isActive={selectedStatFilter === "inactive"}
          onClick={() =>
            dispatch(
              setSelectedUserStatFilter(
                selectedStatFilter === "inactive" ? "all" : "inactive",
              ),
            )
          }
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

      {statusAction ? (
        <UserStatusConfirmModal
          user={statusAction.user}
          nextStatus={statusAction.nextStatus}
          onClose={() => setStatusAction(null)}
          onConfirm={async () => {
            const result = await dispatch(
              updateUserStatus({
                id: statusAction.user.id,
                status: statusAction.nextStatus,
                userName: authUser?.profile?.username ?? "Admin",
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
          onClose={() => setPasswordUser(null)}
          onSubmit={async (password) => {
            const result = await dispatch(
              updateUserPassword({
                id: passwordUser.id,
                password,
                userName: authUser?.profile?.username ?? "Admin",
              }),
            );

            if (updateUserPassword.fulfilled.match(result)) {
              await refetchUsers();
              setPasswordUser(null);
              setShowPasswordSuccess(true);
            }
          }}
        />
      ) : null}

      {showPasswordSuccess ? (
        <UserPasswordSuccessModal onClose={() => setShowPasswordSuccess(false)} />
      ) : null}

      {accessUser ? (
        <UserAccessModal
          user={accessUser}
          locations={userLocationOptions}
          onClose={() => setAccessUser(null)}
          onSubmit={async (accessAssignments) => {
            const result = await dispatch(
              updateUserAccess({
                id: accessUser.id,
                accessAssignments,
                userName: authUser?.profile?.username ?? "Admin",
              }),
            );

            if (updateUserAccess.fulfilled.match(result)) {
              await refetchUsers();
              setAccessUser(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}
