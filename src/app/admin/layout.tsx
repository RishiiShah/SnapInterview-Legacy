import Link from "next/link";

import { requireAdminSession } from "@/lib/admin-auth";

const adminNavItems = [
  { label: "Overview", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Questions", href: "/admin/questions" },
  { label: "Interviews", href: "/admin/interviews" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession();
  const email = session.user.email ?? "admin";

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">SnapInterview Admin</h1>
            <p className="text-sm text-zinc-500">{email}</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="rounded-lg border border-zinc-200 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Back to App
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
