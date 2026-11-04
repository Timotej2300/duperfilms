import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getPermissions } from "@/lib/admin";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administrácia", robots: { index: false, follow: false } };

const NAV = [
  { href: "/admin", label: "Dashboard", perm: "dashboard.view" },
  { href: "/admin/titles", label: "Filmy a seriály", perm: "movies.write" },
  { href: "/admin/genres", label: "Kategórie", perm: "genres.write" },
  { href: "/admin/home", label: "Homepage", perm: "home.write" },
  { href: "/admin/users", label: "Používatelia", perm: "users.view" },
  { href: "/admin/plans", label: "Predplatné", perm: "plans.write" },
  { href: "/admin/coupons", label: "Kupóny", perm: "plans.write" },
  { href: "/admin/payments", label: "Platby", perm: "payments.view" },
  { href: "/admin/ads", label: "Reklamy", perm: "ads.write" },
  { href: "/admin/settings", label: "Nastavenia", perm: "settings.write" },
  { href: "/admin/audit", label: "Audit logy", perm: "audit.view" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s || !s.user.role.isStaff) redirect("/login");
  const perms = await getPermissions(s.user.roleId);
  const isOwner = s.user.role.key === "OWNER";

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-white/10 bg-ink-900 p-4 md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r">
        <Logo size="sm" href="/admin" />
        <p className="mt-1 text-xs text-white/40">{s.user.email} · {s.user.role.name}</p>
        <nav className="mt-4 flex flex-wrap gap-1 md:flex-col">
          {NAV.filter((n) => isOwner || perms.has(n.perm)).map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white">{n.label}</Link>
          ))}
          <Link href="/browse" className="rounded-md px-3 py-2 text-sm text-white/40 hover:text-white">← Späť na web</Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-x-auto p-5 sm:p-8">{children}</main>
    </div>
  );
}
