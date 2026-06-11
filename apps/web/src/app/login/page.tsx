"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInSchema } from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/useAsync";
import { zodFieldErrors, type FieldErrors } from "@/lib/forms";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const { error } = await getSupabaseBrowserClient().auth.signInWithPassword(parsed.data);
      if (error) {
        setAuthError(error.message);
        setSubmitting(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setAuthError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-50 px-4 dark:bg-stone-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
              <path
                d="M4 14c0-1 .6-2.4 2-3.5C6 7 8.5 5 12 5s6 2 6 5.5c1.4 1.1 2 2.5 2 3.5 0 1.6-1.6 2.5-3.5 2.5h-9C5.6 16.5 4 15.6 4 14Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path d="M8 18.5v.5M16 18.5v.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              Crafted MFG
            </h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Sign in to your workspace</p>
          </div>
        </div>

        <form
          onSubmit={(e) => void submit(e)}
          className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900"
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@craftedmfg.com"
            error={fieldErrors["email"]}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            error={fieldErrors["password"]}
          />
          {authError ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
              {authError}
            </p>
          ) : null}
          <Button type="submit" loading={submitting} className="w-full">
            Sign in
          </Button>
          <p className="text-center text-xs text-stone-400 dark:text-stone-500">
            Accounts are created by an administrator — no self-signup.
          </p>
        </form>
      </div>
    </div>
  );
}
