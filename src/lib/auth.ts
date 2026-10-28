import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuth } from "@/lib/auth-config";
import { hasAdmin } from "@/lib/setup";

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  return (auth ??= createAuth());
}

export async function getAdminSession(requestHeaders: Headers) {
  // Only initial setup and the administrator CLI can provision accounts.
  return getAuth().api.getSession({ headers: requestHeaders });
}

export async function requireAdmin() {
  if (!(await hasAdmin())) redirect("/setup");
  const session = await getAdminSession(await headers());
  if (!session) redirect("/admin/login");
  return session;
}
