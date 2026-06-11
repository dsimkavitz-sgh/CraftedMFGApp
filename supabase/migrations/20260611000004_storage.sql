-- Crafted MFG — storage bucket for product photos
-- Public read (photo URLs render in both clients without signing);
-- writes restricted to admin/manager.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-photos',
  'product-photos',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy "product photos: public read"
  on storage.objects for select
  using (bucket_id = 'product-photos');

create policy "product photos: staff upload"
  on storage.objects for insert
  with check (bucket_id = 'product-photos' and public.is_staff_writer());

create policy "product photos: staff update"
  on storage.objects for update
  using (bucket_id = 'product-photos' and public.is_staff_writer());

create policy "product photos: staff delete"
  on storage.objects for delete
  using (bucket_id = 'product-photos' and public.is_staff_writer());
