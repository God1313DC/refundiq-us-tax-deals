import { AppRole } from "@/lib/types";

export const roleRank: Record<AppRole, number> = {
  client: 1,
  preparer: 2,
  admin: 3
};

export function canAccessRole(userRole: AppRole, allowed: AppRole[]) {
  return allowed.some((role) => roleRank[userRole] >= roleRank[role]);
}

export function canAccessCase(userRole: AppRole, caseOwnerId: string, currentUserId: string) {
  if (userRole === "client") {
    return caseOwnerId === currentUserId;
  }

  return userRole === "preparer" || userRole === "admin";
}
