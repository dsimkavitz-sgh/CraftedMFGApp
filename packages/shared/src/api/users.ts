import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRow } from "../types/database";
import type { UserRole } from "../types/enums";

/** The signed-in user's profile row (id, email, full_name, role). */
export async function getCurrentProfile(supabase: SupabaseClient): Promise<UserRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  return data as UserRow | null;
}

/** Admin only (enforced by RLS). */
export async function listUsers(supabase: SupabaseClient): Promise<UserRow[]> {
  const { data, error } = await supabase.from("users").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []) as UserRow[];
}

/** Admin only (enforced by RLS). */
export async function setUserRole(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole,
): Promise<void> {
  const { error } = await supabase.from("users").update({ role }).eq("id", userId);
  if (error) throw error;
}

/**
 * Admin only. Sends a Supabase invite email; the new user sets a password via
 * the link and lands in public.users with the requested role.
 */
export async function inviteUser(
  supabase: SupabaseClient,
  input: { email: string; full_name: string; role: UserRole },
): Promise<void> {
  const { data, error } = await supabase.functions.invoke("invite-user", { body: input });
  if (error) throw error;
  const result = data as { ok?: boolean; error?: string };
  if (!result.ok) throw new Error(result.error ?? "Invite failed");
}

export const can = {
  manageUsers: (role: UserRole | null | undefined) => role === "admin",
  editCatalog: (role: UserRole | null | undefined) => role === "admin" || role === "manager",
  editSuppliers: (role: UserRole | null | undefined) => role === "admin" || role === "manager",
  editPurchaseOrders: (role: UserRole | null | undefined) => role === "admin" || role === "manager",
  advanceStages: (role: UserRole | null | undefined) => role === "admin" || role === "manager",
  editShipments: (role: UserRole | null | undefined) => role === "admin" || role === "manager",
  adjustInventory: (role: UserRole | null | undefined) =>
    role === "admin" || role === "manager" || role === "warehouse",
  viewQboAdmin: (role: UserRole | null | undefined) => role === "admin",
  manageSettings: (role: UserRole | null | undefined) => role === "admin",
} as const;
