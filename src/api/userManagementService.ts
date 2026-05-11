import axios from "axios";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import axiosInstance from "@/api/axiosInstance";
import type { ApiEnvelope, DeviceLocation } from "@/types";
import type {
  ManagedUserFormPayload,
  ManagedUserRecord,
  ManagedUserStatusSummary,
  UserAccessAssignment,
  UserApiModule,
  UserApiRecord,
  UserListApiPayload,
  UserModuleOption,
  UserRoleOption,
} from "@/types/user";
import { getApiData, getApiMessage, isApiSuccess } from "@/utils/api";

const appApiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8083";

const deviceModulesUrl = `${appApiBaseUrl}/api/v1/dmrc/module/all`;
const userApiRoot = `${appApiBaseUrl}/api/v1/dmrc/users`;
const usersListUrl = `${userApiRoot}/all`;
const userRolesUrl = `${appApiBaseUrl}/api/v1/dmrc/users/get-roles`;

type UserEnvelopeResponse<TData> = AxiosResponse<ApiEnvelope<TData>>;

interface UserListRequestPayload {
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
  sortCriteria?: Array<{
    field: string;
    direction: "ASC" | "DESC";
  }>;
}

interface PaginatedUsersResult {
  content: ManagedUserRecord[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  summary: ManagedUserStatusSummary;
}

interface UpdateUserRequestPayload extends ManagedUserFormPayload {
  id: string | number;
}

interface UpdateUserStatusRequest {
  id: string | number;
  status: "Active" | "Inactive";
}

interface UserListFilters {
  empId?: string;
  employeeName?: string;
  emailId?: string;
  mobileNumber?: string;
  lastLoggedIn?: string;
  createdOn?: string;
  createdBy?: string;
  status?: string;
  moduleIds?: number[];
}

async function requestApiData<TData>(
  config: AxiosRequestConfig,
  fallbackMessage: string,
): Promise<TData> {
  const response: UserEnvelopeResponse<TData> = await axiosInstance.request(config);

  if (!isApiSuccess(response.data)) {
    throw new Error(getApiMessage(response.data, fallbackMessage));
  }

  return getApiData(response.data);
}

async function requestApiMessage(
  config: AxiosRequestConfig,
  fallbackMessage: string,
): Promise<string> {
  const response: UserEnvelopeResponse<unknown> = await axiosInstance.request(config);

  if (!isApiSuccess(response.data)) {
    throw new Error(getApiMessage(response.data, fallbackMessage));
  }

  return getApiMessage(response.data, fallbackMessage);
}

async function requestWithFallback<TData>(
  candidates: AxiosRequestConfig[],
  fallbackMessage: string,
  mode: "data" | "message" = "data",
): Promise<TData | string> {
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      if (mode === "message") {
        return await requestApiMessage(candidate, fallbackMessage);
      }

      return await requestApiData<TData>(candidate, fallbackMessage);
    } catch (error) {
      lastError = error;

      if (
        axios.isAxiosError(error) &&
        error.response &&
        ![404, 405].includes(error.response.status)
      ) {
        break;
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error(fallbackMessage);
}

function normalizeStatus(user: UserApiRecord): string {
  if (typeof user.status === "string" && user.status.trim()) {
    const normalized = user.status.trim().toLowerCase();
    return normalized === "active"
      ? "Active"
      : normalized === "inactive"
        ? "Inactive"
        : user.status.trim();
  }

  if (typeof user.active === "boolean") {
    return user.active ? "Active" : "Inactive";
  }

  if (typeof user.enabled === "boolean") {
    return user.enabled ? "Active" : "Inactive";
  }

  return "Inactive";
}

function mapApiModulesToAssignments(
  modules: UserApiModule[] | undefined,
): UserAccessAssignment[] {
  return (modules ?? []).map((moduleItem) => ({
    moduleId: Number(moduleItem.id ?? moduleItem.moduleId ?? 0),
    moduleName: String(moduleItem.name ?? moduleItem.moduleName ?? ""),
    enabled: true,
    locationIds: (moduleItem.locationIds ?? []).map((locationId) =>
      Number(locationId),
    ),
  }));
}

function mapListModuleAccess(
  moduleAccess: UserApiRecord["moduleAccess"],
): UserAccessAssignment[] {
  return (moduleAccess ?? []).map((moduleItem, index) =>
    typeof moduleItem === "string"
      ? {
          moduleId: index + 1,
          moduleName: moduleItem,
          enabled: false,
          locationIds: [],
        }
      : {
          moduleId: Number(moduleItem.id ?? moduleItem.moduleId ?? index + 1),
          moduleName: String(moduleItem.name ?? moduleItem.moduleName ?? ""),
          enabled: false,
          locationIds: [],
        },
  );
}

function mapApiUserToManagedUser(user: UserApiRecord): ManagedUserRecord {
  const detailedAssignments = mapApiModulesToAssignments(user.modules);
  const listAssignments = mapListModuleAccess(user.moduleAccess);
  const accessAssignments =
    detailedAssignments.length > 0 ? detailedAssignments : listAssignments;
  const moduleAccess = accessAssignments.map((assignment) => assignment.moduleName);

  return {
    id: user.id ?? user.userId ?? 0,
    username: user.username,
    empId: user.empId,
    employeeName: user.empName,
    emailId: user.email,
    mobileNumber: user.mobile,
    accessAssignments,
    moduleAccess,
    locationAccess: user.locationAccess ?? [],
    lastLoggedIn: user.lastLoggedIn ?? null,
    createdOn: user.createdOn ?? user.createdAt ?? null,
    createdBy:
      user.createdBy === null || typeof user.createdBy === "undefined"
        ? null
        : String(user.createdBy),
    updatedAt: user.updatedAt ?? null,
    updatedBy: user.updatedBy ?? null,
    designation: user.designation ?? null,
    role:
      user.role || user.roleId || user.roleName
        ? {
            id: user.role?.id ?? user.role?.roleId ?? user.roleId ?? undefined,
            name:
              user.role?.name ?? user.role?.roleName ?? user.roleName ?? undefined,
          }
        : null,
    status: normalizeStatus(user),
  };
}

function toCreatePermissions(assignments: UserAccessAssignment[]) {
  return assignments
    .filter((assignment) => assignment.enabled)
    .map((assignment) => ({
      moduleId: assignment.moduleId,
      locationIds: assignment.locationIds,
    }));
}

function toUpdateModules(assignments: UserAccessAssignment[]) {
  return assignments
    .filter((assignment) => assignment.enabled)
    .map((assignment) => ({
      moduleId: assignment.moduleId,
      name: assignment.moduleName,
      locationIds: assignment.locationIds,
    }));
}

function toCreateUserPayload(payload: ManagedUserFormPayload) {
  const username = payload.emailId.trim() || payload.empId.trim();

  return {
    username,
    empId: payload.empId.trim(),
    empName: payload.employeeName.trim(),
    email: payload.emailId.trim(),
    mobile: payload.mobileNumber.trim(),
    password: payload.password,
    roleId: Number(payload.roleId),
    roleName: payload.roleName?.trim(),
    permissions: toCreatePermissions(payload.accessAssignments),
  };
}

function toUpdateUserPayload(payload: UpdateUserRequestPayload) {
  return {
    id: Number(payload.id),
    username: payload.emailId.trim() || payload.empId.trim(),
    empId: payload.empId.trim(),
    empName: payload.employeeName.trim(),
    email: payload.emailId.trim(),
    mobile: payload.mobileNumber.trim(),
    roleId: Number(payload.roleId),
    permissions: toUpdateModules(payload.accessAssignments),
  };
}

function getUsersFromPayload(payload: UserListApiPayload | UserApiRecord[]): UserApiRecord[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.content ?? payload.items ?? payload.data ?? [];
}

function getCurrentPage(payload: UserListApiPayload, requestPage: number): number {
  return payload.currentPage ?? payload.page ?? requestPage;
}

function getPageSize(payload: UserListApiPayload, requestSize: number): number {
  return payload.pageSize ?? payload.size ?? requestSize;
}

function getTotalItems(payload: UserListApiPayload, contentLength: number): number {
  return payload.totalItems ?? payload.totalElements ?? contentLength;
}

function getTotalPages(
  payload: UserListApiPayload,
  totalItems: number,
  pageSize: number,
): number {
  return payload.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize));
}

function normalizeForCompare(value: string | undefined | null): string {
  return String(value ?? "").trim().toLowerCase();
}

function compareUsers(
  left: ManagedUserRecord,
  right: ManagedUserRecord,
  field: string,
): number {
  const leftValue =
    field === "createdBy"
      ? left.createdBy
      : field === "createdOn"
        ? left.createdOn
        : field === "lastLoggedIn"
          ? left.lastLoggedIn
          : field === "empId"
            ? left.empId
            : field === "employeeName"
              ? left.employeeName
              : field === "emailId"
                ? left.emailId
                : field === "mobileNumber"
                  ? left.mobileNumber
                  : field === "status"
                    ? left.status
                    : String((left as Record<string, unknown>)[field] ?? "");
  const rightValue =
    field === "createdBy"
      ? right.createdBy
      : field === "createdOn"
        ? right.createdOn
        : field === "lastLoggedIn"
          ? right.lastLoggedIn
          : field === "empId"
            ? right.empId
            : field === "employeeName"
              ? right.employeeName
              : field === "emailId"
                ? right.emailId
                : field === "mobileNumber"
                  ? right.mobileNumber
                  : field === "status"
                    ? right.status
                    : String((right as Record<string, unknown>)[field] ?? "");

  return normalizeForCompare(leftValue).localeCompare(
    normalizeForCompare(rightValue),
    undefined,
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}

function matchesUserFilters(
  user: ManagedUserRecord,
  filters: UserListFilters,
): boolean {
  const columnChecks = [
    [filters.empId, user.empId],
    [filters.employeeName, user.employeeName],
    [filters.emailId, user.emailId],
    [filters.mobileNumber, user.mobileNumber],
    [filters.lastLoggedIn, user.lastLoggedIn ?? ""],
    [filters.createdOn, user.createdOn ?? ""],
    [filters.createdBy, user.createdBy ?? ""],
  ] as const;

  const matchesColumns = columnChecks.every(([filterValue, actualValue]) => {
    if (!filterValue?.trim()) {
      return true;
    }

    return normalizeForCompare(actualValue).includes(
      normalizeForCompare(filterValue),
    );
  });

  const matchesStatus = filters.status?.trim()
    ? normalizeForCompare(user.status) === normalizeForCompare(filters.status)
    : true;

  const matchesModules = filters.moduleIds?.length
    ? user.accessAssignments.some((assignment) =>
        filters.moduleIds?.includes(assignment.moduleId),
      )
    : true;

  return matchesColumns && matchesStatus && matchesModules;
}

function filterUsers(
  users: ManagedUserRecord[],
  filters: UserListFilters,
): ManagedUserRecord[] {
  return users.filter((user) => matchesUserFilters(user, filters));
}

function sortUsers(
  users: ManagedUserRecord[],
  sortCriteria?: UserListRequestPayload["sortCriteria"],
): ManagedUserRecord[] {
  if (!sortCriteria?.length) {
    return users;
  }

  const [{ field, direction }] = sortCriteria;
  const sortedUsers = [...users].sort((left, right) =>
    compareUsers(left, right, field),
  );

  return direction === "DESC" ? sortedUsers.reverse() : sortedUsers;
}

function paginateUsers(
  users: ManagedUserRecord[],
  page: number,
  size: number,
): ManagedUserRecord[] {
  const offset = page * size;
  return users.slice(offset, offset + size);
}

function fetchUserCount(
  users: ManagedUserRecord[],
  payload: UserListRequestPayload,
  status?: "Active" | "Inactive",
): number {
  return filterUsers(users, {
    ...payload,
    status,
  }).length;
}

async function fetchAllUsers(): Promise<ManagedUserRecord[]> {
  const response: AxiosResponse<
    ApiEnvelope<UserApiRecord[] | UserListApiPayload>
  > = await axiosInstance.get(usersListUrl);

  if (!isApiSuccess(response.data)) {
    throw new Error(getApiMessage(response.data, "Unable to fetch users."));
  }

  return getUsersFromPayload(getApiData(response.data)).map(mapApiUserToManagedUser);
}

export async function fetchUserModules(): Promise<UserModuleOption[]> {
  const response = await axiosInstance.get<UserModuleOption[] | ApiEnvelope<UserModuleOption[]>>(
    deviceModulesUrl,
  );
  const payload = response.data;

  const modules = Array.isArray(payload)
    ? payload
    : isApiSuccess(payload)
      ? getApiData(payload)
      : [];

  return modules.map((moduleItem) => ({
    id: Number((moduleItem as { moduleId?: number; id?: number }).moduleId ?? moduleItem.id),
    name: String(
      (moduleItem as { moduleName?: string; name?: string }).moduleName ??
        moduleItem.name,
    ),
  }));
}

export async function fetchUserRoles(): Promise<UserRoleOption[]> {
  const response = await axiosInstance.get<UserRoleOption[] | ApiEnvelope<UserRoleOption[]>>(
    userRolesUrl,
  );
  const payload = response.data;

  const roles = Array.isArray(payload)
    ? payload
    : isApiSuccess(payload)
      ? getApiData(payload)
      : [];

  return roles.map((role) => ({
    roleId: Number(role.roleId),
    roleName: String(role.roleName),
  }));
}

export async function fetchUsersList(
  payload: UserListRequestPayload,
): Promise<PaginatedUsersResult> {
  const allUsers = await fetchAllUsers();
  const filteredUsers = filterUsers(allUsers, {
    ...payload,
    status: payload.status,
  });

  const sortedUsers = sortUsers(filteredUsers, payload.sortCriteria);
  const pageSize = payload.size || 10;
  const totalItems = sortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = payload.page || 0;
  const content = paginateUsers(sortedUsers, currentPage, pageSize);
  const summary = {
    totalUsers: fetchUserCount(allUsers, { ...payload, status: undefined }, undefined),
    activeUsers: fetchUserCount(allUsers, { ...payload, status: undefined }, "Active"),
    inactiveUsers: fetchUserCount(allUsers, { ...payload, status: undefined }, "Inactive"),
  } satisfies ManagedUserStatusSummary;

  return {
    content,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    summary,
  };
}

export async function fetchUserById(id: string | number): Promise<ManagedUserRecord> {
  const response = await requestApiData<UserApiRecord>(
    {
      method: "get",
      url: `${userApiRoot}/user/${id}`,
    },
    "Unable to fetch user.",
  );

  return mapApiUserToManagedUser(response);
}

export async function createUserRecord(
  payload: ManagedUserFormPayload,
): Promise<ManagedUserRecord> {
  const response = await requestApiData<UserApiRecord>(
    {
      method: "post",
      url: `${userApiRoot}/create-user`,
      data: toCreateUserPayload(payload),
    },
    "Unable to create user.",
  );

  return mapApiUserToManagedUser(response);
}

export async function updateUserRecord(
  payload: UpdateUserRequestPayload,
): Promise<ManagedUserRecord> {
  const response = await requestApiData<UserApiRecord>(
    {
      method: "put",
      url: `${userApiRoot}/update-user/${payload.id}`,
      data: toUpdateUserPayload(payload),
    },
    "Unable to update user.",
  );

  return mapApiUserToManagedUser(response);
}

export async function updateUserStatusRecord(
  payload: UpdateUserStatusRequest,
): Promise<string> {
  return requestWithFallback<string>(
    [
      {
        method: "post",
        url: `${userApiRoot}/deactivate-user/${payload.id}/${payload?.status.toLowerCase()}`,
      }
    ],
    `Unable to mark user ${payload.status.toLowerCase()}.`,
    "message",
  ) as Promise<string>;
}

export async function requestUserPasswordReset(
  id: string | number,
): Promise<string> {
  return requestWithFallback<string>(
    [
      {
        method: "post",
        url: `${userApiRoot}/reset-password/${id}`,
      },
      {
        method: "post",
        url: `${userApiRoot}/user/${id}/reset-password`,
      },
      {
        method: "post",
        url: `${userApiRoot}/reset-user-password/${id}`,
      },
    ],
    "Unable to send reset password link.",
    "message",
  ) as Promise<string>;
}

export function getLocationAccessLabel(
  assignments: UserAccessAssignment[],
  locations: DeviceLocation[],
): string {
  const selectedLocationNames = Array.from(
    new Set(
      assignments.flatMap((assignment) =>
        assignment.locationIds.map((locationId) => {
          const matchedLocation = locations.find(
            (location) => Number(location.locationId) === Number(locationId),
          );

          return matchedLocation?.locationName ?? `Location ${locationId}`;
        }),
      ),
    ),
  );

  return selectedLocationNames.length ? selectedLocationNames.join(", ") : "-";
}
