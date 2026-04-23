import type { User, UserModule, UserProfile } from "@/types";

interface LoginPayload {
  accessToken?: string;
  token?: string;
  roles?: string[];
  user?: {
    roles?: string[];
  };
}

function getUserRole(
  payload: LoginPayload | User,
  profile: UserProfile | null
): string | null {
  const payloadRoles = "roles" in payload ? payload.roles : undefined;
  const nestedUserRoles = "user" in payload ? payload.user?.roles : undefined;

  return (
    profile?.role?.name ??
    payloadRoles?.[0] ??
    nestedUserRoles?.[0] ??
    null
  );
}

export function normalizeUser(
  data: LoginPayload | User,
  profile: UserProfile | null = null
): User {
  const sourceProfile = profile ?? null;
  const modules: UserModule[] = sourceProfile?.modules ?? [];
  const permissions = modules.flatMap((moduleItem) =>
    moduleItem.permissions.map((permission) => permission.name)
  );

  return {
    accessToken:
      data.accessToken ??
      ("token" in data ? data.token ?? null : null),
    role: getUserRole(data, sourceProfile),
    profile: sourceProfile,
    modules,
    permissions,
  };
}
