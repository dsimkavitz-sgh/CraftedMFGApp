"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_LABELS, can } from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  show: boolean;
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS = {
  home: "M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8",
  catalog: "M4 7l8-4 8 4-8 4-8-4Zm0 5l8 4 8-4M4 17l8 4 8-4",
  inventory: "M4 8h16v12H4V8Zm2-4h12l2 4H4l2-4Zm4 8h4",
  orders: "M3 7h11v10H3V7Zm11 3h4l3 3v4h-7M7.5 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  suppliers: "M3 21V9l6-4v4l6-4v4l6-4v16H3Zm5 0v-4h3v4m4 0v-4h3v4",
  qbo: "M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4",
  users: "M16 19v-1a4 4 0 0 0-8 0v1m12 0v-1a4 4 0 0 0-3-3.9M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm5-1a3 3 0 0 0 0-6",
} as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Responsive app chrome: fixed sidebar on desktop, top bar + slide-over
 * drawer on mobile. Nav items are filtered by the signed-in user's role.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const profile = useProfile();
  const role = profile?.role ?? null;
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const navItems: NavItem[] = [
    { href: "/", label: "Dashboard", icon: <NavIcon d={ICONS.home} />, show: true },
    { href: "/catalog", label: "Catalog", icon: <NavIcon d={ICONS.catalog} />, show: true },
    { href: "/inventory", label: "Inventory", icon: <NavIcon d={ICONS.inventory} />, show: true },
    { href: "/orders", label: "On Order", icon: <NavIcon d={ICONS.orders} />, show: true },
    { href: "/suppliers", label: "Suppliers", icon: <NavIcon d={ICONS.suppliers} />, show: true },
    { href: "/admin/qbo", label: "QuickBooks", icon: <NavIcon d={ICONS.qbo} />, show: can.viewQboAdmin(role) },
    { href: "/admin/users", label: "Users", icon: <NavIcon d={ICONS.users} />, show: can.manageUsers(role) },
  ].filter((item) => item.show);

  async function signOut() {
    setSigningOut(true);
    try {
      await getSupabaseBrowserClient().auth.signOut();
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-amber-600/10 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const userMenu = (
    <div className="border-t border-stone-200 p-3 dark:border-stone-800">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-600 text-sm font-semibold text-white">
          {(profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || "?").toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
            {profile?.full_name ?? "Unknown"}
          </p>
          <p className="truncate text-xs text-stone-500 dark:text-stone-400">
            {role ? ROLE_LABELS[role] : "No role"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={signingOut}
          title="Sign out"
          aria-label="Sign out"
          className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800 disabled:opacity-50 dark:hover:bg-stone-800 dark:hover:text-stone-200"
        >
          <NavIcon d="M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5M10 4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7" />
        </button>
      </div>
    </div>
  );

  const brand = (
    <div className="flex items-center gap-2 px-5 py-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-white">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M4 14c0-1 .6-2.4 2-3.5C6 7 8.5 5 12 5s6 2 6 5.5c1.4 1.1 2 2.5 2 3.5 0 1.6-1.6 2.5-3.5 2.5h-9C5.6 16.5 4 15.6 4 14Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M8 18.5v.5M16 18.5v.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </div>
      <span className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Crafted MFG
      </span>
    </div>
  );

  return (
    <div className="min-h-dvh bg-stone-50 dark:bg-stone-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 lg:flex">
        {brand}
        {nav}
        {userMenu}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-stone-800 dark:bg-stone-900/90 lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <NavIcon d="M4 7h16M4 12h16M4 17h16" />
          </button>
          <span className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Crafted MFG
          </span>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-stone-950/50" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <NavIcon d="M6 6l12 12M18 6 6 18" />
              </button>
            </div>
            {nav}
            {userMenu}
          </div>
        </div>
      ) : null}

      <main className="px-4 py-6 sm:px-6 lg:ml-60 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
