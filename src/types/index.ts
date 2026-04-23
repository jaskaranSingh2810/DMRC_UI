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
  name: string;
}

export interface UserModule {
  moduleId?: string | number;
  moduleName?: string;
  permissions: Permission[];
}

export interface UserProfile {
  id?: string | number;
  username?: string;
  email?: string;
  role?: {
    name?: UserRole | string;
  };
  modules?: UserModule[];
  [key: string]: unknown;
}

export interface User {
  accessToken: string | null;
  role: UserRole | string | null;
  profile: UserProfile | null;
  modules: UserModule[];
  permissions: string[];
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
  startDate?: string | null;
  endDate?: string | null;
  locations?: AdLocation[];
  startTime?: string | null;
  endTime?: string | null;
  status: EntityStatus | string;
}

export interface ApiEnvelope<TData> {
  success?: boolean;
  status?: string;
  message?: string;
  data: TData;
}
