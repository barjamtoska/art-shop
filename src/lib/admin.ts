import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, isAdminEmail } from "./auth";

/*
 * The real access check for the admin area. src/proxy.ts only redirects
 * visitors without a session cookie (a cheap first filter); every admin page
 * and every server action must call one of these.
 */

export type Admin = { id: string; email: string; name: string };

export async function getAdmin(): Promise<Admin | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAdminEmail(session.user.email)) return null;
  const { id, email, name } = session.user;
  return { id, email, name };
}

/** For admin pages: sends anyone else to the sign-in page. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/sign-in");
  return admin;
}

/** For server actions: fails closed, without redirecting. */
export async function assertAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorised");
  return admin;
}
