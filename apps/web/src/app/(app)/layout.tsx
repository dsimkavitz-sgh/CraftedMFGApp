import { redirect } from "next/navigation";
import { getCurrentProfile } from "@crafted/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/AppShell";

/**
 * Authenticated route group. Middleware guarantees a session; this layout
 * loads the profile row server-side and hydrates the client context.
 */
export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    // Signed in, but no users row yet (e.g. invited but not provisioned).
    // Don't redirect to /login — middleware would bounce straight back.
    return (
      <div className="flex min-h-dvh items-center justify-center bg-stone-50 px-4 dark:bg-stone-950">
        <div className="max-w-md rounded-xl border border-stone-200 bg-white p-6 text-center shadow-card dark:border-stone-800 dark:bg-stone-900">
          <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Profile not set up
          </h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            Your account ({user.email}) is signed in but has no profile yet. Ask an administrator to
            finish provisioning your user, then reload this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Providers profile={profile}>
      <AppShell>{children}</AppShell>
    </Providers>
  );
}
