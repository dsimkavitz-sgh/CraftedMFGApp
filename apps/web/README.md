# Crafted MFG — Web

Responsive web client for Crafted MFG (hat manufacturing & distribution).
Next.js 15 App Router + Supabase + the shared `@crafted/shared` data layer.

## Setup

1. From the repo root: `pnpm install`
2. Copy `apps/web/.env.local.example` to `apps/web/.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your
   Supabase project (apply the migrations in `supabase/migrations` first).
3. Run the dev server:

```sh
pnpm --filter web dev
# or from apps/web: pnpm dev
```

Open http://localhost:3000. You'll be redirected to `/login` — sign in with an
email/password user created via the Supabase dashboard (or `pnpm seed:users`
from the repo root). There is no self-signup in the MVP.

## Scripts

- `pnpm dev` — dev server
- `pnpm build` / `pnpm start` — production build / serve
- `pnpm typecheck` — `tsc --noEmit` (strict)
- `pnpm lint` — `next lint` (non-blocking)

## Routes

| Route | Description |
| --- | --- |
| `/login` | Email/password sign-in |
| `/` | Dashboard: stat cards, low stock, recent adjustments |
| `/catalog`, `/catalog/new`, `/catalog/[styleId]` | Style catalog, create, detail + variants |
| `/inventory` | Searchable inventory with adjust + history |
| `/suppliers` | Supplier list + create/edit/delete |
| `/orders`, `/orders/new`, `/orders/[poId]` | Purchase orders, create, detail (stages + shipments) |
| `/admin/qbo` | QuickBooks connection + sync log (admin) |
| `/admin/users` | User roles (admin) |

Roles (`admin` / `manager` / `warehouse`) gate UI via the shared `can` helpers;
Postgres RLS enforces the same rules server-side.
