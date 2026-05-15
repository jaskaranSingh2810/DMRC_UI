export * from "./user";

export enum UserRole {
  SUPER_ADMIN = "super_admin",
  AD_MANAGER = "ad_manager",
  NOTICE_MANAGER = "notice_manager",
  TICKER_MANAGER = "ticker_manager",
  DEVICE_MANAGER = "device_manager",
  USER_MANAGER = "user_manager",
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
  permissions: Permission[];
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
  landmark?: string | null;
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
  device?: string;
}

export interface DeviceResolutionHistoryRecord {
  id?: string | number;
  remarks: string;
  resolvedBy: string;
  resolvedDate: string;
}

export interface DeviceDetails {
  device: DeviceRecord;
  resolutionHistory: DeviceResolutionHistoryRecord[];
}

export interface DevicePayload {
  brand: string;
  model: string;
  landmark?: string;
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
  title?: string;
  announcementName?: string;
  description: string;
  priority?: NoticePriority | string;
  status: EntityStatus | string;
  themeId?: string | null;
  createdBy?: string;
  publishedOn?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  deleted?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  locations?: AdLocation[];
  locationName?: string;
}

export interface NoticeThemePalette {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  panel: string;
}

export interface NoticeThemeOption {
  id: string;
  label: string;
  category: string;
  palette: NoticeThemePalette;
}

export type NoticeStatusFilter = "all" | "live" | "expired";

export interface NoticeSortCriteria {
  field: string;
  direction: "ASC" | "DESC";
}

export interface NoticeListRequest {
  page: number;
  size: number;
  sortCriteria?: NoticeSortCriteria[];
  filters?: Record<string, string>;
  statusFilter?: NoticeStatusFilter;
}

export interface PaginatedNotices {
  content: Notice[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  isFirst: boolean;
  isLast: boolean;
}

export interface NoticeStats {
  total: number;
  live: number;
  expired: number;
}

export interface NoticeMutationPayload {
  announcementName: string;
  description: string;
  locationIds: Array<string | number>;
  themeId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: string;
  userName: string;
}

export interface NoticeMutationFormValues {
  announcementName: string;
  description: string;
  selectedLocationIds: string[];
  themeId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: string;
  userName: string;
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

export interface ApiEnvelope<TData> {
  success?: boolean;
  status?: string;
  message?: string;
  data: TData;
}
