-- Crafted MFG — demo seed data (suppliers, styles, variants, inventory, POs).
-- Demo *users* are created separately by `pnpm seed:users` (auth users can't
-- be seeded with plain SQL inserts safely).

-- Allow qty seeding past the audit guard for this session only.
select set_config('app.inventory_rpc', 'on', false);

-- ── Suppliers ────────────────────────────────────────────────────────────────
insert into public.suppliers (id, name, type, country, alibaba_reference, uses_trade_assurance, contact_notes) values
  ('11111111-1111-4111-8111-111111111101', 'Qingdao Headwear Co.', 'hat_manufacturer', 'China',
   'qingdao-headwear-co', true,
   'Primary trucker/snapback supplier. Contact: Lily Chen (WeChat). 30% deposit, balance before ship.'),
  ('11111111-1111-4111-8111-111111111102', 'Nantong Caps Manufacturing', 'hat_manufacturer', 'China',
   'nantong-caps-mfg', true,
   'Dad hats and 5-panels. Slower sampling (~3 wks) but great stitching QC.'),
  ('11111111-1111-4111-8111-111111111103', 'Hanoi Brim Works', 'hat_manufacturer', 'Vietnam',
   null, false,
   'Newer relationship — wide brims & buckets. Email only, responds within a day.'),
  -- Phase 3: patch sourcing uses a different manufacturer type (no schema rework needed)
  ('11111111-1111-4111-8111-111111111104', 'Sialkot Patch & Emblem', 'patch_manufacturer', 'Pakistan',
   'sialkot-patch-emblem', true,
   'PVC + embroidered patches. Phase 3 — not used by the hat catalog yet.');

-- ── Styles ───────────────────────────────────────────────────────────────────
insert into public.styles (id, name, description, supplier_id, hero_photo_url, active) values
  ('22222222-2222-4222-8222-222222222201', 'Classic Trucker',
   'Mid-profile 6-panel trucker, mesh back, snapback closure. Our flagship.',
   '11111111-1111-4111-8111-111111111101', null, true),
  ('22222222-2222-4222-8222-222222222202', 'Heritage Dad Hat',
   'Unstructured 6-panel washed-cotton dad hat with brass buckle.',
   '11111111-1111-4111-8111-111111111102', null, true),
  ('22222222-2222-4222-8222-222222222203', 'Camper 5-Panel',
   'Low-profile 5-panel camper, nylon strap clip closure.',
   '11111111-1111-4111-8111-111111111102', null, true),
  ('22222222-2222-4222-8222-222222222204', 'Field Bucket',
   'Cotton-twill bucket hat, discontinued colorway run.',
   '11111111-1111-4111-8111-111111111103', null, false);

-- ── Variants (SKU scheme: CM-{STYLE}-{COLOR}-{NNN}, see packages/shared) ─────
insert into public.variants (id, style_id, color, size, sku) values
  ('33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', 'Navy',     'OSFA', 'CM-CLA-NAV-001'),
  ('33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222201', 'Black',    'OSFA', 'CM-CLA-BLA-001'),
  ('33333333-3333-4333-8333-333333333303', '22222222-2222-4222-8222-222222222201', 'Charcoal', 'OSFA', 'CM-CLA-CHA-001'),
  ('33333333-3333-4333-8333-333333333304', '22222222-2222-4222-8222-222222222202', 'Khaki',    'OSFA', 'CM-HER-KHA-001'),
  ('33333333-3333-4333-8333-333333333305', '22222222-2222-4222-8222-222222222202', 'Forest',   'OSFA', 'CM-HER-FOR-001'),
  ('33333333-3333-4333-8333-333333333306', '22222222-2222-4222-8222-222222222203', 'Black',    'S/M',  'CM-CAM-BLA-001'),
  ('33333333-3333-4333-8333-333333333307', '22222222-2222-4222-8222-222222222203', 'Black',    'L/XL', 'CM-CAM-BLA-002'),
  ('33333333-3333-4333-8333-333333333308', '22222222-2222-4222-8222-222222222204', 'Olive',    'OSFA', 'CM-FIE-OLI-001');

-- ── Starting inventory (inventory rows were auto-created at 0 by trigger) ────
update public.inventory set qty_on_hand = 248, location = 'A1-04' where variant_id = '33333333-3333-4333-8333-333333333301';
update public.inventory set qty_on_hand = 312, location = 'A1-05' where variant_id = '33333333-3333-4333-8333-333333333302';
update public.inventory set qty_on_hand = 96,  location = 'A1-06' where variant_id = '33333333-3333-4333-8333-333333333303';
update public.inventory set qty_on_hand = 154, location = 'B2-01' where variant_id = '33333333-3333-4333-8333-333333333304';
update public.inventory set qty_on_hand = 41,  location = 'B2-02' where variant_id = '33333333-3333-4333-8333-333333333305';
update public.inventory set qty_on_hand = 73,  location = 'C1-11' where variant_id = '33333333-3333-4333-8333-333333333306';
update public.inventory set qty_on_hand = 58,  location = 'C1-12' where variant_id = '33333333-3333-4333-8333-333333333307';
update public.inventory set qty_on_hand = 12,  location = 'D4-09' where variant_id = '33333333-3333-4333-8333-333333333308';

insert into public.inventory_adjustments (variant_id, delta, new_qty, reason) values
  ('33333333-3333-4333-8333-333333333301', 248, 248, 'Initial stock count (seed)'),
  ('33333333-3333-4333-8333-333333333302', 312, 312, 'Initial stock count (seed)'),
  ('33333333-3333-4333-8333-333333333303', 96,  96,  'Initial stock count (seed)'),
  ('33333333-3333-4333-8333-333333333304', 154, 154, 'Initial stock count (seed)'),
  ('33333333-3333-4333-8333-333333333305', 41,  41,  'Initial stock count (seed)'),
  ('33333333-3333-4333-8333-333333333306', 73,  73,  'Initial stock count (seed)'),
  ('33333333-3333-4333-8333-333333333307', 58,  58,  'Initial stock count (seed)'),
  ('33333333-3333-4333-8333-333333333308', 12,  12,  'Initial stock count (seed)');

-- ── Purchase orders ──────────────────────────────────────────────────────────
insert into public.purchase_orders (id, po_number, supplier_id, order_date, eta, status, notes) values
  ('44444444-4444-4444-8444-444444444401', 'PO-2026-014', '11111111-1111-4111-8111-111111111101',
   current_date - 32, current_date + 18, 'in_production',
   'Spring restock — confirm Pantone 533C for navy mesh before production run.'),
  ('44444444-4444-4444-8444-444444444402', 'PO-2026-015', '11111111-1111-4111-8111-111111111102',
   current_date - 10, current_date + 45, 'ordered',
   'First order of Forest colorway at new MOQ (300).');

insert into public.po_line_items (po_id, variant_id, qty, unit_cost) values
  ('44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333301', 500, 3.85),
  ('44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333302', 500, 3.85),
  ('44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333303', 250, 3.95),
  ('44444444-4444-4444-8444-444444444402', '33333333-3333-4333-8333-333333333304', 300, 4.10),
  ('44444444-4444-4444-8444-444444444402', '33333333-3333-4333-8333-333333333305', 300, 4.10);

-- ── Manufacturing stage history (latest row per PO = current stage) ──────────
insert into public.manufacturing_stage_events (po_id, stage, note, created_at) values
  ('44444444-4444-4444-8444-444444444401', 'sampling',   'Samples approved with revised stitch density.', now() - interval '30 days'),
  ('44444444-4444-4444-8444-444444444401', 'production', 'Run started 6/2; supplier estimates 3 weeks.',  now() - interval '9 days'),
  ('44444444-4444-4444-8444-444444444402', 'sampling',   'Awaiting Forest colorway lab dips.',            now() - interval '7 days');

-- ── Shipment on the in-production PO's earlier partial (demo of MVP fields) ──
insert into public.shipments (po_id, carrier, tracking_number, status, eta, last_event_summary) values
  ('44444444-4444-4444-8444-444444444401', 'dhl', 'JD014600003482719104', 'in_transit',
   current_date + 6, 'Departed facility — HONG KONG');
