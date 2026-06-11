"use client";

import { useState } from "react";
import {
  ROLE_LABELS,
  USER_ROLES,
  formatDate,
  inviteUser,
  listUsers,
  setUserRole,
  type UserRole,
} from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage, useAsync } from "@/lib/useAsync";
import { useProfile } from "@/components/providers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
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

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("warehouse");
  const [inviting, setInviting] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);

  async function sendInvite() {
    setActionError(null);
    setInviteNotice(null);
    if (!/^\S+@\S+\.\S+$/.test(inviteEmail.trim())) {
      setActionError("Enter a valid email address to invite.");
      return;
    }
    setInviting(true);
    try {
      await inviteUser(supabase, {
        email: inviteEmail.trim(),
        full_name: inviteName.trim(),
        role: inviteRole,
      });
      setInviteNotice(`Invite sent to ${inviteEmail.trim()} — they'll set a password via the email link.`);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("warehouse");
      state.reload();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setInviting(false);
    }
  }

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

      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
          Invite a team member
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@craftedmfg.com"
            />
          </div>
          <div className="flex-1">
            <Input
              label="Full name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="First Last"
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              label="Role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
            >
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={() => void sendInvite()} loading={inviting}>
            Send invite
          </Button>
        </div>
        {inviteNotice ? (
          <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{inviteNotice}</p>
        ) : null}
      </Card>

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
