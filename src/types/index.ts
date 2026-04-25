export enum UserRole {
  SUPER_ADMIN = "super_admin",
  AD_MANAGER = "ad_manager",
  NOTICE_MANAGER = "notice_manager",
  TICKER_MANAGER = "ticker_manager",
}

export type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

export enum EntityStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  EXPIRED = "EXPIRED",
  SCHEDULED = "SCHEDULED",
}

export enum NoticePriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export enum DeviceType {
  LCD = "LCD",
  LED = "LED",
  KIOSK = "KIOSK",
}

export interface Permission {
  id?: string | number;
  name: string;
}

export interface UserModule {
  id?: string | number;
  name?: string;
  moduleId?: string | number;
  moduleName?: string;
  permissions: Permission[];
}

export interface UserDepartment {
  id?: string | number;
  name?: string;
}

export interface UserProfile {
  id?: string | number;
  username?: string;
  fullName?: string | null;
  email?: string;
  emailId?: string | null;
  department?: UserDepartment | null;
  role?: {
    id?: string | number;
    name?: UserRole | string;
  };
  modules?: UserModule[];
  [key: string]: unknown;
}

export interface SidebarMenuItem {
  id: string | number;
  name: string;
  path: string;
  icon: string;
  permission?: string | null;
}

export interface User {
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt?: number | null;
  role: UserRole | string | null;
  profile: UserProfile | null;
  modules: UserModule[];
  permissions: string[];
  menu: SidebarMenuItem[];
}

export interface DeviceLocation {
  locationId: string | number;
  locationName: string;
}

export interface DeviceRecord {
  id: number;
  deviceCode: string;
  brand: string;
  model: string;
  orientation: string;
  locationId: number;
  deviceSize: number;
  createdAt: string;
  createdBy: string;
  status: string;
  remarks?: string | null;
  updatedAt?: string;
  updatedBy?: string;
  deleted?: boolean;
  locations?: DeviceLocation;
  locationName?: string;
}

export interface DevicePayload {
  brand: string;
  model: string;
  orientation: string;
  locationId: number;
  deviceSize: number;
  userName: string;
}

export interface Device {
  deviceId: string | number;
  deviceName: string;
  locationName: string;
  deviceType: DeviceType | string;
  status: EntityStatus | string;
}


export interface Ticker {
  tickerId: string | number;
  title: string;
  message: string;
  status: EntityStatus | string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface Notice {
  noticeId: string | number;
  title: string;
  description: string;
  priority: NoticePriority | string;
  status: EntityStatus | string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface AdLocation {
  locationId?: string | number;
  locationName: string;
}

export interface Ad {
  contentId: string | number;
  contentName: string;
  createdBy: string;
  publishedOn?: string | null;
  createdAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  locations?: AdLocation[];
  locationName?: string;
  startTime?: string | null;
  endTime?: string | null;
  status: EntityStatus | string;
  remarks?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  deleted?: boolean;
}

export interface ManagedUserRecord {
  id: string | number;
  empId: string;
  employeeName: string;
  emailId: string;
  mobileNumber: string;
  password?: string | null;
  locationAccess?: string[] | null;
  moduleAccess?: string[] | null;
  lastLoggedIn?: string | null;
  createdOn?: string | null;
  createdBy?: string | null;
  status: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface ApiEnvelope<TData> {
  success?: boolean;
  status?: string;
  message?: string;
  data: TData;
}
