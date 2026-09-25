import Link from "next/link";
import { site } from "@/config/site";
import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "./AdminNav";
import { SignOutButton } from "./SignOutButton";

/** Every admin page sits behind this real session check (src/proxy.ts is only a first filter). */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gold/15 py-5">
        <Link href="/admin" className="font-caps text-lg tracking-[0.25em] text-ivory">
          {site.name} <span className="text-ivory-muted">· admin</span>
        </Link>
        <div className="flex items-center gap-5 text-sm text-ivory-muted">
          <Link href="/" className="underline decoration-gold/40 underline-offset-4 hover:text-ivory">
            View the gallery
          </Link>
          <span className="hidden sm:inline">{admin.email}</span>
          <SignOutButton />
        </div>
      </header>
      <AdminNav />
      <main id="main" className="pt-10">
        {children}
      </main>
    </div>
  );
}
