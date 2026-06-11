# Crafted MFG — Mobile (iOS-first)

Expo (React Native + TypeScript) client for inventory, purchase orders, catalog,
and shipment tracking. All data access goes through `@crafted/shared` against
Supabase (RLS enforces roles server-side).

## Run it

```bash
# From the repo root
pnpm install

# Configure environment
cp apps/mobile/.env.example apps/mobile/.env
# …fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# Start the dev server
pnpm --filter mobile dev
# then press `i` to open the iOS simulator (or scan the QR with Expo Go)
```

Type checking: `pnpm --filter mobile typecheck`.

## Notes

- Push notifications: the app only registers Expo push tokens in MVP; sending
  (shipment alerts) ships in Phase 2 via Supabase edge functions. Registration
  requires a physical device.
- Barcode scanning is a Phase 2 stub (`app/scan.tsx`) — no camera dependency yet.
- TestFlight: set up an EAS project (`eas init`, `eas build --platform ios`)
  later; the bundle identifier is `com.craftedmfg.app`.
