import type {
  ManagedUserFormPayload,
  ManagedUserRecord,
  ManagedUserStatusSummary,
  UserAccessAssignment,
  UserLocationOption,
  UserModuleOption,
} from "@/types";
import type { UserListRequest } from "./userListRequest";

interface PaginatedUsers {
  summary: ManagedUserStatusSummary;
  content: ManagedUserRecord[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  isFirst: boolean;
  isLast: boolean;
}

interface UpdateManagedUserPayload extends ManagedUserFormPayload {
  id: string | number;
}

interface UpdateManagedUserPasswordPayload {
  id: string | number;
  password: string;
  userName: string;
}

interface UpdateManagedUserAccessPayload {
  id: string | number;
  accessAssignments: UserAccessAssignment[];
  userName: string;
}

interface UpdateManagedUserStatusPayload {
  id: string | number;
  status: "Active" | "Inactive";
  userName: string;
}

export const userModuleOptions: UserModuleOption[] = [
  { id: "ads", name: "Ad Management" },
  { id: "ticker", name: "Ticker Management" },
  { id: "notice", name: "Notice Management" },
  { id: "device", name: "Device Management" },
];

export const userLocationOptions: UserLocationOption[] = [
  { id: "t1", name: "Terminal 1" },
  { id: "t2", name: "Terminal 2" },
  { id: "t3", name: "Terminal 3" },
  { id: "all", name: "All Locations" },
];

function createAccess(
  moduleId: string,
  locationIds: string[],
): UserAccessAssignment {
  const moduleName =
    userModuleOptions.find((moduleOption) => moduleOption.id === moduleId)?.name ??
    moduleId;
  const locationNames = locationIds
    .map(
      (locationId) =>
        userLocationOptions.find((locationOption) => locationOption.id === locationId)
          ?.name ?? locationId,
    )
    .filter(Boolean);

  return {
    moduleId,
    moduleName,
    locationIds,
    locationNames,
  };
}

function deriveModuleAccess(accessAssignments: UserAccessAssignment[]): string[] {
  return Array.from(
    new Set(accessAssignments.map((assignment) => assignment.moduleName)),
  );
}

function deriveLocationAccess(accessAssignments: UserAccessAssignment[]): string[] {
  return Array.from(
    new Set(accessAssignments.flatMap((assignment) => assignment.locationNames)),
  );
}

function cloneUser(user: ManagedUserRecord): ManagedUserRecord {
  return {
    ...user,
    locationAccess: user.locationAccess ? [...user.locationAccess] : [],
    moduleAccess: user.moduleAccess ? [...user.moduleAccess] : [],
    accessAssignments: user.accessAssignments
      ? user.accessAssignments.map((assignment) => ({
          ...assignment,
          locationIds: [...assignment.locationIds],
          locationNames: [...assignment.locationNames],
        }))
      : [],
  };
}

function createSeedUsers(): ManagedUserRecord[] {
  const baseUsers: Array<{
    id: string;
    empId: string;
    employeeName: string;
    emailId: string;
    mobileNumber: string;
    password: string;
    createdBy: string;
    createdOn: string;
    lastLoggedIn: string;
    status: "Active" | "Inactive";
    accessAssignments: UserAccessAssignment[];
  }> = [
    {
      id: "1",
      empId: "GMR-1234",
      employeeName: "Rajendra Kumar",
      emailId: "rajendra@gmail.com",
      mobileNumber: "89867657890",
      password: "GMR12345",
      createdBy: "Mithlesh Kumar",
      createdOn: "2024-06-03",
      lastLoggedIn: "2024-06-03T09:00:00",
      status: "Active",
      accessAssignments: [
        createAccess("device", ["t1", "t2"]),
        createAccess("ticker", ["t1"]),
      ],
    },
    {
      id: "2",
      empId: "GMR-1235",
      employeeName: "Rajendra Kumar",
      emailId: "rajendra.kumar@example.com",
      mobileNumber: "89867657891",
      password: "GMR12346",
      createdBy: "Mithlesh Kumar",
      createdOn: "2024-06-02",
      lastLoggedIn: "2024-06-03T09:15:00",
      status: "Inactive",
      accessAssignments: [
        createAccess("device", ["all"]),
        createAccess("ticker", ["t1", "t2"]),
      ],
    },
    {
      id: "3",
      empId: "GMR-1236",
      employeeName: "Rajendra Kumar",
      emailId: "rajendra.office@example.com",
      mobileNumber: "89867657892",
      password: "GMR12347",
      createdBy: "Mithlesh Kumar",
      createdOn: "2024-06-01",
      lastLoggedIn: "2024-06-03T09:30:00",
      status: "Active",
      accessAssignments: [
        createAccess("ads", ["t1", "t2", "t3"]),
      ],
    },
    {
      id: "4",
      empId: "GMR-1237",
      employeeName: "Sonia Mehra",
      emailId: "sonia.mehra@example.com",
      mobileNumber: "9988012345",
      password: "SONIA123",
      createdBy: "Mithlesh Kumar",
      createdOn: "2024-06-04",
      lastLoggedIn: "2024-06-04T11:45:00",
      status: "Active",
      accessAssignments: [
        createAccess("notice", ["t1", "t3"]),
        createAccess("ticker", ["t1"]),
      ],
    },
    {
      id: "5",
      empId: "GMR-1238",
      employeeName: "Arun Singh",
      emailId: "arun.singh@example.com",
      mobileNumber: "9988012346",
      password: "ARUN1234",
      createdBy: "Mithlesh Kumar",
      createdOn: "2024-06-05",
      lastLoggedIn: "2024-06-05T08:20:00",
      status: "Inactive",
      accessAssignments: [
        createAccess("device", ["t2"]),
      ],
    },
    {
      id: "6",
      empId: "GMR-1239",
      employeeName: "Meenal Das",
      emailId: "meenal.das@example.com",
      mobileNumber: "9988012347",
      password: "MEENAL12",
      createdBy: "Admin",
      createdOn: "2024-06-06",
      lastLoggedIn: "2024-06-06T07:10:00",
      status: "Active",
      accessAssignments: [
        createAccess("notice", ["t2"]),
        createAccess("ads", ["t3"]),
      ],
    },
  ];

  return baseUsers.map((user) => ({
    ...user,
    moduleAccess: deriveModuleAccess(user.accessAssignments),
    locationAccess: deriveLocationAccess(user.accessAssignments),
  }));
}

let managedUsers = createSeedUsers();

function compareValues(
  left: string | number | undefined | null,
  right: string | number | undefined | null,
): number {
  const normalizedLeft = String(left ?? "").toLowerCase();
  const normalizedRight = String(right ?? "").toLowerCase();

  return normalizedLeft.localeCompare(normalizedRight, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function getUserFieldValue(user: ManagedUserRecord, field: string): string {
  if (field === "locationAccess") {
    return user.locationAccess?.join(", ") ?? "";
  }

  if (field === "moduleAccess") {
    return user.moduleAccess?.join(", ") ?? "";
  }

  return String(user[field as keyof ManagedUserRecord] ?? "");
}

function getSortedUsers(
  users: ManagedUserRecord[],
  sortCriteria?: UserListRequest["sortCriteria"],
): ManagedUserRecord[] {
  if (!sortCriteria?.length) {
    return users;
  }

  const [{ field, direction }] = sortCriteria;
  const sortedUsers = [...users].sort((left, right) =>
    compareValues(getUserFieldValue(left, field), getUserFieldValue(right, field)),
  );

  return direction === "DESC" ? sortedUsers.reverse() : sortedUsers;
}

function getFilteredUsers(request: UserListRequest): ManagedUserRecord[] {
  return managedUsers.filter((user) => {
    const filterEntries: Array<[keyof UserListRequest, string | undefined]> = [
      ["empId", request.empId],
      ["employeeName", request.employeeName],
      ["emailId", request.emailId],
      ["mobileNumber", request.mobileNumber],
      ["password", request.password],
      ["locationAccess", request.locationAccess],
      ["moduleAccess", request.moduleAccess],
      ["lastLoggedIn", request.lastLoggedIn],
      ["createdOn", request.createdOn],
      ["createdBy", request.createdBy],
    ];

    const matchesColumnFilters = filterEntries.every(([key, value]) => {
      if (!value) {
        return true;
      }

      return getUserFieldValue(user, key).toLowerCase().includes(value.toLowerCase());
    });

    const matchesModule = request.module
      ? user.moduleAccess?.some(
          (moduleName) =>
            moduleName.toLowerCase() === request.module?.toLowerCase(),
        ) ?? false
      : true;

    const matchesStatus = request.status
      ? user.status.toLowerCase() === request.status.toLowerCase()
      : true;

    return matchesColumnFilters && matchesModule && matchesStatus;
  });
}

function getSummary(request: UserListRequest): ManagedUserStatusSummary {
  const usersWithoutStatusFilter = getFilteredUsers({
    ...request,
    status: undefined,
  });

  return {
    totalUsers: usersWithoutStatusFilter.length,
    activeUsers: usersWithoutStatusFilter.filter((user) => user.status === "Active")
      .length,
    inactiveUsers: usersWithoutStatusFilter.filter(
      (user) => user.status === "Inactive",
    ).length,
  };
}

export function listManagedUsers(request: UserListRequest): PaginatedUsers {
  const filteredUsers = getFilteredUsers(request);
  const sortedUsers = getSortedUsers(filteredUsers, request.sortCriteria);
  const pageSize = request.size || 10;
  const currentPage = request.page || 0;
  const startIndex = currentPage * pageSize;
  const pagedUsers = sortedUsers
    .slice(startIndex, startIndex + pageSize)
    .map(cloneUser);
  const totalElements = sortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));

  return {
    summary: getSummary(request),
    content: pagedUsers,
    currentPage,
    totalPages,
    totalElements,
    pageSize,
    isFirst: currentPage === 0,
    isLast: currentPage >= totalPages - 1,
  };
}

export function getManagedUserById(id: string | number): ManagedUserRecord | null {
  const user = managedUsers.find((item) => String(item.id) === String(id));

  return user ? cloneUser(user) : null;
}

export function createManagedUserRecord(
  payload: ManagedUserFormPayload,
): ManagedUserRecord {
  const nextId = String(
    Math.max(0, ...managedUsers.map((user) => Number(user.id) || 0)) + 1,
  );
  const nextUser: ManagedUserRecord = {
    id: nextId,
    empId: payload.empId,
    employeeName: payload.employeeName,
    emailId: payload.emailId,
    mobileNumber: payload.mobileNumber,
    password: payload.password,
    accessAssignments: payload.accessAssignments.map((assignment) => ({
      ...assignment,
      locationIds: [...assignment.locationIds],
      locationNames: [...assignment.locationNames],
    })),
    moduleAccess: deriveModuleAccess(payload.accessAssignments),
    locationAccess: deriveLocationAccess(payload.accessAssignments),
    createdOn: new Date().toISOString().split("T")[0],
    createdBy: payload.userName,
    updatedAt: new Date().toISOString(),
    updatedBy: payload.userName,
    lastLoggedIn: null,
    status: "Active",
  };

  managedUsers = [nextUser, ...managedUsers];
  return cloneUser(nextUser);
}

export function updateManagedUser(
  payload: UpdateManagedUserPayload,
): ManagedUserRecord {
  const currentUser = getManagedUserById(payload.id);

  if (!currentUser) {
    throw new Error("User not found.");
  }

  const nextUser: ManagedUserRecord = {
    ...currentUser,
    empId: payload.empId,
    employeeName: payload.employeeName,
    emailId: payload.emailId,
    mobileNumber: payload.mobileNumber,
    password: payload.password,
    accessAssignments: payload.accessAssignments.map((assignment) => ({
      ...assignment,
      locationIds: [...assignment.locationIds],
      locationNames: [...assignment.locationNames],
    })),
    moduleAccess: deriveModuleAccess(payload.accessAssignments),
    locationAccess: deriveLocationAccess(payload.accessAssignments),
    updatedAt: new Date().toISOString(),
    updatedBy: payload.userName,
  };

  managedUsers = managedUsers.map((user) =>
    String(user.id) === String(payload.id) ? nextUser : user,
  );

  return cloneUser(nextUser);
}

export function updateManagedUserPassword(
  payload: UpdateManagedUserPasswordPayload,
): ManagedUserRecord {
  const currentUser = getManagedUserById(payload.id);

  if (!currentUser) {
    throw new Error("User not found.");
  }

  const nextUser: ManagedUserRecord = {
    ...currentUser,
    password: payload.password,
    updatedAt: new Date().toISOString(),
    updatedBy: payload.userName,
  };

  managedUsers = managedUsers.map((user) =>
    String(user.id) === String(payload.id) ? nextUser : user,
  );

  return cloneUser(nextUser);
}

export function updateManagedUserAccess(
  payload: UpdateManagedUserAccessPayload,
): ManagedUserRecord {
  const currentUser = getManagedUserById(payload.id);

  if (!currentUser) {
    throw new Error("User not found.");
  }

  const nextAssignments = payload.accessAssignments.map((assignment) => ({
    ...assignment,
    locationIds: [...assignment.locationIds],
    locationNames: [...assignment.locationNames],
  }));

  const nextUser: ManagedUserRecord = {
    ...currentUser,
    accessAssignments: nextAssignments,
    moduleAccess: deriveModuleAccess(nextAssignments),
    locationAccess: deriveLocationAccess(nextAssignments),
    updatedAt: new Date().toISOString(),
    updatedBy: payload.userName,
  };

  managedUsers = managedUsers.map((user) =>
    String(user.id) === String(payload.id) ? nextUser : user,
  );

  return cloneUser(nextUser);
}

export function updateManagedUserStatus(
  payload: UpdateManagedUserStatusPayload,
): ManagedUserRecord {
  const currentUser = getManagedUserById(payload.id);

  if (!currentUser) {
    throw new Error("User not found.");
  }

  const nextUser: ManagedUserRecord = {
    ...currentUser,
    status: payload.status,
    updatedAt: new Date().toISOString(),
    updatedBy: payload.userName,
  };

  managedUsers = managedUsers.map((user) =>
    String(user.id) === String(payload.id) ? nextUser : user,
  );

  return cloneUser(nextUser);
}

export function resetManagedUserData() {
  managedUsers = createSeedUsers();
}
