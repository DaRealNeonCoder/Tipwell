import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";

export class UnauthorizedError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "UnauthorizedError";
  }
}

export async function getCurrentSession() {
  getServerEnv();
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUserSession() {
  const session = await getCurrentSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

export async function requireUserId(): Promise<string> {
  const session = await requireUserSession();
  return session.user.id;
}
