import { redirect } from "next/navigation";
import { can, getCurrentProfile } from "@crafted/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { QboAdminPage } from "@/components/pages/QboAdminPage";

export const metadata = { title: "Admin Settings" };

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile(supabase);
  if (!can.manageSettings(profile?.role)) redirect("/");
  return <QboAdminPage />;
}
