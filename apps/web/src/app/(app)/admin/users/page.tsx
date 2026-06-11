import { redirect } from "next/navigation";
import { can, getCurrentProfile } from "@crafted/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UsersAdminPage } from "@/components/pages/UsersAdminPage";

export const metadata = { title: "Users" };

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile(supabase);
  if (!can.manageUsers(profile?.role)) redirect("/");
  return <UsersAdminPage />;
}
