import type { SidebarMenuItem, User, UserModule, UserProfile } from "@/types";

interface LoginPayload {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: number;
}

function getUserRole(
  payload: LoginPayload | User | null,
  profile: UserProfile | null
): string | null {
  if (profile?.role?.name) {
    return profile.role.name;
  }

  if (payload && "role" in payload) {
    return payload.role;
  }

  return null;
}

export function normalizeUser(
  data: LoginPayload | User,
  profile: UserProfile | null = null,
  menu: SidebarMenuItem[] = []
): User {
  const sourceProfile = profile ?? null;
  const sourceModules = sourceProfile?.modules ?? ("modules" in data ? data.modules : []);
  const modules: UserModule[] = sourceModules.map((moduleItem) => ({
    ...moduleItem,
    moduleId: moduleItem.moduleId ?? moduleItem.id,
    moduleName: moduleItem.moduleName ?? moduleItem.name,
  }));
  const permissions = modules.flatMap((moduleItem) =>
    moduleItem.permissions.map((permission) => permission.name)
  );

  return {
    accessToken: data.accessToken ?? null,
    refreshToken: "refreshToken" in data ? data.refreshToken ?? null : null,
    accessTokenExpiresAt:
      "accessTokenExpiresAt" in data ? data.accessTokenExpiresAt ?? null : null,
    role: getUserRole(data, sourceProfile),
    profile: sourceProfile,
    modules,
    permissions,
    menu: "menu" in data ? data.menu : menu,
  };
}
