import { redirect } from "next/navigation";

// The QuickBooks connection moved into Admin Settings.
export default function Page() {
  redirect("/admin/settings");
}
