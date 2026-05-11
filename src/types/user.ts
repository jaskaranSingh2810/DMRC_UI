export interface UserModuleFilter {
  id: number;
  name: string;
}

export interface UserRoleSummary {
  id?: string | number;
  name?: string;
}

export interface UserRoleOption {
  roleId: number;
  roleName: string;
}

export interface UserAccessAssignment {
  moduleId: number;
  moduleName: string;
  enabled: boolean;
  locationIds: number[];
}

export interface UserLocationOption {
  id: number;
  name: string;
}

export interface UserModuleOption {
  id: number;
  name: string;
}

export interface ManagedUserRecord {
  id?: number;
  userId?: number;
  username?: string;
  empId: string;
  employeeName: string;
  emailId: string;
  mobileNumber: string;
  accessAssignments: UserAccessAssignment[];
  moduleAccess: string[];
  locationAccess: string[];
  lastLoggedIn?: string | null;
  createdOn?: string | null;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  designation?: string | null;
  role?: UserRoleSummary | null;
  status: string;
}

export interface ManagedUserFormPayload {
  userId?: number;
  empId: string;
  employeeName: string;
  emailId: string;
  mobileNumber: string;
  password: string;
  roleId: number;
  roleName?: string;
  accessAssignments: UserAccessAssignment[];
}

export interface ManagedUserStatusSummary {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
}

export interface UserApiRole {
  id?: string | number;
  name?: string;
  roleId?: string | number;
  roleName?: string;
}

export interface UserApiModule {
  id?: string | number;
  name?: string;
  moduleId?: string | number;
  moduleName?: string;
  locationIds?: Array<string | number>;
}

export interface UserApiRecord {
  id?: number;
  userId?: number;
  username?: string;
  empId: string;
  empName: string;
  email: string;
  mobile: string;
  lastLoggedIn?: string | null;
  createdAt?: string | null;
  createdOn?: string | null;
  createdBy?: string | number | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  designation?: string | null;
  status?: string | null;
  active?: boolean | null;
  enabled?: boolean | null;
  roleId?: string | number | null;
  roleName?: string | null;
  role?: UserApiRole | null;
  modules?: UserApiModule[];
  moduleAccess?: Array<UserApiModule | string>;
  locationAccess?: string[];
}

export interface UserListApiPayload {
  content?: UserApiRecord[];
  items?: UserApiRecord[];
  data?: UserApiRecord[];
  currentPage?: number;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  totalElements?: number;
  pageSize?: number;
  size?: number;
  summary?: ManagedUserStatusSummary;
}
