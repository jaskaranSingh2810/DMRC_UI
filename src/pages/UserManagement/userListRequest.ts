import type { UserModuleFilter } from "@/types/user";
export type { UserModuleFilter };

type UserFilters = Record<string, string | undefined>;

export type UserStatFilter = "all" | "active" | "inactive";

type SortState = {
  key: string;
  direction: "ASC" | "DESC";
};

export interface UserSortCriteria {
  field: string;
  direction: "ASC" | "DESC";
}

export interface UserListRequest {
  page: number;
  size: number;
  empId?: string;
  employeeName?: string;
  emailId?: string;
  mobileNumber?: string;
  lastLoggedIn?: string;
  createdOn?: string;
  createdBy?: string;
  status?: string;
  moduleIds?: number[];
  sortCriteria?: UserSortCriteria[];
}

export function getApiUserStatus(status: string): string {
  const normalizedStatus = status.trim().toLowerCase();

  if (normalizedStatus === "active") {
    return "Active";
  }

  if (normalizedStatus === "inactive") {
    return "Inactive";
  }

  return status.trim();
}

export function buildUserListRequest({
  filters,
  pageNumber,
  pageSize,
  selectedModules,
  selectedStatFilter,
  sortState,
}: {
  filters: UserFilters;
  pageNumber: number;
  pageSize: number;
  selectedModules: UserModuleFilter[];
  selectedStatFilter: UserStatFilter;
  sortState: SortState | null;
}): UserListRequest {
  return {
    page: pageNumber - 1,
    size: pageSize || 10,
    ...(filters.empId?.trim() ? { empId: filters.empId.trim() } : {}),
    ...(filters.employeeName?.trim()
      ? { employeeName: filters.employeeName.trim() }
      : {}),
    ...(filters.emailId?.trim() ? { emailId: filters.emailId.trim() } : {}),
    ...(filters.mobileNumber?.trim()
      ? { mobileNumber: filters.mobileNumber.trim() }
      : {}),
    ...(filters.lastLoggedIn?.trim()
      ? { lastLoggedIn: filters.lastLoggedIn.trim() }
      : {}),
    ...(filters.createdOn?.trim()
      ? { createdOn: filters.createdOn.trim() }
      : {}),
    ...(filters.createdBy?.trim()
      ? { createdBy: filters.createdBy.trim() }
      : {}),
    ...(selectedModules.length
      ? {
          moduleIds: selectedModules.map((moduleOption) => moduleOption.id),
        }
      : {}),
    ...(selectedStatFilter !== "all"
      ? { status: getApiUserStatus(selectedStatFilter) }
      : filters.status?.trim()
        ? { status: getApiUserStatus(filters.status) }
        : {}),
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
  };
}
