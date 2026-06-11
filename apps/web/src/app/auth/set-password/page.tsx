"use client";

import { BrandWordmark } from "@/components/BrandWordmark";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/useAsync";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * Where invite + password-reset links land (via /auth/confirm). The link
 * signed the user in; here they choose their password.
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setHasSession(!!data.user));
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-50 px-4 dark:bg-stone-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <BrandWordmark size="lg" tagline />
        </div>

        {hasSession === false ? (
          <div className="rounded-xl border border-stone-200 bg-white p-6 text-center shadow-card dark:border-stone-800 dark:bg-stone-900">
            <h1 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              This link is invalid or has expired
            </h1>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Ask an admin to send a new invite, or request a fresh password reset from the
              sign-in page.
            </p>
            <div className="mt-4">
              <Button onClick={() => router.replace("/login")}>Back to sign in</Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => void submit(e)}
            className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900"
          >
            <div>
              <h1 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                Choose your password
              </h1>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                You'll use this to sign in to Crafted MFG on web and mobile.
              </p>
            </div>
            <Input
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              label="Confirm password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
            <Button type="submit" loading={saving || hasSession === null}>
              Set password &amp; sign in
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
