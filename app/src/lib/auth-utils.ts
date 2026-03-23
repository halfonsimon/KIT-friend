import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Get the current authenticated user's ID.
 * Redirects to /login if not authenticated.
 * Use in server components and server actions.
 */
export async function requireUser(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user.id;
}

/**
 * Get the current user's ID or null (no redirect).
 * Use in API routes where you want to return 401 instead of redirecting.
 */
export async function getOptionalUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
