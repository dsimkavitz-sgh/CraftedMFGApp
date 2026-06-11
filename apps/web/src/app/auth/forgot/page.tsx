"use client";

import { BrandWordmark } from "@/components/BrandWordmark";
import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/useAsync";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setSending(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-50 px-4 dark:bg-stone-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <BrandWordmark size="lg" tagline />
        </div>

        <form
          onSubmit={(e) => void submit(e)}
          className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900"
        >
          <div>
            <h1 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Reset your password
            </h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              We'll email you a link to choose a new one.
            </p>
          </div>
          {sent ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              If an account exists for {email.trim()}, a reset link is on its way. Check your
              inbox (and spam).
            </p>
          ) : (
            <>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
              <Button type="submit" loading={sending}>
                Send reset link
              </Button>
            </>
          )}
          <Link
            href="/login"
            className="text-center text-sm font-medium text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
          >
            ← Back to sign in
          </Link>
        </form>
      </div>
    </div>
  );
}
