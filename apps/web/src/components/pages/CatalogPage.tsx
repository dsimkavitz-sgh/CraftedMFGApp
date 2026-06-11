"use client";

import Link from "next/link";
import { can, listStyles } from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAsync } from "@/lib/useAsync";
import { useRole } from "@/components/providers";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingBlock } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export function CatalogPage() {
  const role = useRole();
  const supabase = getSupabaseBrowserClient();
  const state = useAsync(() => listStyles(supabase, { includeInactive: true }), []);

  return (
    <div>
      <PageHeader
        title="Catalog"
        subtitle="Hat styles and their variants."
        actions={
          can.editCatalog(role) ? (
            <Link href="/catalog/new">
              <Button>New style</Button>
            </Link>
          ) : undefined
        }
      />

      {state.loading && !state.data ? <LoadingBlock /> : null}
      {state.error ? <ErrorAlert message={state.error} onRetry={state.reload} /> : null}

      {state.data && state.data.length === 0 ? (
        <EmptyState
          title="No styles yet"
          description="Create your first hat style to start building the catalog."
          action={
            can.editCatalog(role) ? (
              <Link href="/catalog/new">
                <Button size="sm">New style</Button>
              </Link>
            ) : undefined
          }
        />
      ) : null}

      {state.data && state.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.data.map((style) => {
            const totalOnHand = style.variants.reduce(
              (acc, v) => acc + (v.inventory?.qty_on_hand ?? 0),
              0,
            );
            return (
              <Link key={style.id} href={`/catalog/${style.id}`} className="group">
                <Card padded={false} className="overflow-hidden transition-shadow group-hover:shadow-md">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
                    {style.hero_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={style.hero_photo_url}
                        alt={style.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-100 to-stone-300 dark:from-stone-900 dark:to-stone-700">
                        <span className="text-4xl font-semibold text-stone-500/70 dark:text-stone-400/50">
                          {style.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {!style.active ? (
                      <div className="absolute left-3 top-3">
                        <Badge tone="stone">Inactive</Badge>
                      </div>
                    ) : null}
                  </div>
                  <div className="p-4">
                    <h2 className="truncate text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                      {style.name}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
                      {style.supplier?.name ?? "No supplier"}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                      <span>
                        {style.variants.length} variant{style.variants.length === 1 ? "" : "s"}
                      </span>
                      <span className="font-medium text-stone-700 dark:text-stone-300">
                        {totalOnHand.toLocaleString("en-US")} on hand
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
