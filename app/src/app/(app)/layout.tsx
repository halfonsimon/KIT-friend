import type { ReactNode } from "react";
import { auth } from "@/auth";
import AppNav from "@/components/AppNav";
import Landing from "@/components/landing/Landing";
import Backdrop from "@/components/ui/Backdrop";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const user = session?.user
    ? { name: session.user.name ?? null, email: session.user.email ?? null, image: session.user.image ?? null }
    : null;

  // Signed out, only "/" is reachable here (the route gate sends everything else
  // to /login), and it's the landing page. Drawn here rather than by the page so
  // Today's loading screen, which wraps the page, never flashes before it.
  if (!user) return <Landing />;

  return (
    <div className="relative min-h-screen md:pt-4">
      <Backdrop />
      <AppNav user={user} />
      {/* Bottom padding keeps content clear of the phone's floating nav. */}
      <main className="mx-auto max-w-[1360px] px-5 pb-32 pt-6 md:px-10 md:pb-16 md:pt-12">{children}</main>
    </div>
  );
}
