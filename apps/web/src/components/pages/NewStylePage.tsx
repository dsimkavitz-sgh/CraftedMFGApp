"use client";

import { useRouter } from "next/navigation";
import { can, createStyle } from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRole } from "@/components/providers";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/Alert";
import { StyleForm } from "@/components/StyleForm";

export function NewStylePage() {
  const role = useRole();
  const router = useRouter();

  if (!can.editCatalog(role)) {
    return (
      <div>
        <PageHeader title="New style" />
        <ErrorAlert message="You don't have permission to create styles." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="New style" subtitle="Add a hat style to the catalog." />
      <Card>
        <StyleForm
          submitLabel="Create style"
          onCancel={() => router.push("/catalog")}
          onSubmit={async (input) => {
            const created = await createStyle(getSupabaseBrowserClient(), input);
            router.push(`/catalog/${created.id}`);
          }}
        />
      </Card>
    </div>
  );
}
