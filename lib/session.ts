import { auth } from "@/auth";
import { getUserById, toSessionUser, type DbUser } from "@/lib/queries";
import type { SessionUser } from "@/lib/types";

export async function getSignedInUser(): Promise<DbUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return getUserById(id);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const user = await getSignedInUser();
  if (!user) return null;
  return toSessionUser(user);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
