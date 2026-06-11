"use client";

import { useState } from "react";
import {
  ROLE_LABELS,
  USER_ROLES,
  formatDate,
  listUsers,
  setUserRole,
  type UserRole,
} from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage, useAsync } from "@/lib/useAsync";
import { useProfile } from "@/components/providers";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingBlock } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";

export function UsersAdminPage() {
  const me = useProfile();
  const supabase = getSupabaseBrowserClient();
  const state = useAsync(() => listUsers(supabase), []);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function changeRole(userId: string, fullName: string, role: UserRole) {
    if (!window.confirm(`Change ${fullName}'s role to ${ROLE_LABELS[role]}?`)) {
      state.reload(); // reset the select back to the stored value
      return;
    }
    setActionError(null);
    setBusyId(userId);
    try {
      await setUserRole(supabase, userId, role);
      state.reload();
    } catch (e) {
      setActionError(errorMessage(e));
      state.reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Users" subtitle="Who can sign in, and what they can do." />

      <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300">
        New users are invited via the Supabase dashboard in the MVP (Authentication → Users →
        Invite). Once they sign in, manage their role here.
      </div>

      {actionError ? (
        <div className="mb-4">
          <ErrorAlert message={actionError} />
        </div>
      ) : null}

      {state.loading && !state.data ? <LoadingBlock /> : null}
      {state.error ? <ErrorAlert message={state.error} onRetry={state.reload} /> : null}

      {state.data && state.data.length === 0 ? <EmptyState title="No users found" /> : null}

      {state.data && state.data.length > 0 ? (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:text-stone-400">
                  <th className="px-4 py-2.5 sm:px-6">Name</th>
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5">Joined</th>
                  <th className="px-4 py-2.5">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {state.data.map((user) => (
                  <tr key={user.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-900 dark:text-stone-100 sm:px-6">
                      {user.full_name}
                      {user.id === me?.id ? (
                        <span className="ml-2 text-xs font-normal text-stone-400 dark:text-stone-500">(you)</span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-stone-500 dark:text-stone-400">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-stone-500 dark:text-stone-400">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <select
                        value={user.role}
                        disabled={busyId === user.id || user.id === me?.id}
                        onChange={(e) =>
                          void changeRole(user.id, user.full_name, e.target.value as UserRole)
                        }
                        aria-label={`Role for ${user.full_name}`}
                        className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700 focus:border-stone-500 focus:outline-none disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                      >
                        {USER_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
