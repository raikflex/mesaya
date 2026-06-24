-- ============================================================
-- S28: Fotos de productos del menu
-- Agrega columna imagen_path + bucket de Storage + politicas RLS.
-- Correr en el SQL Editor de Supabase.
-- Convencion de path dentro del bucket: {restaurante_id}/{archivo}
-- ============================================================

-- 1) Columna en productos. Guardamos el PATH dentro del bucket
--    (no la URL completa), para mayor flexibilidad.
alter table public.productos
  add column if not exists imagen_path text;

-- 2) Bucket publico para las fotos de productos.
insert into storage.buckets (id, name, public)
values ('productos-fotos', 'productos-fotos', true)
on conflict (id) do nothing;

-- 3) Politicas RLS sobre storage.objects.
--    Lectura: publica (el comensal anonimo ve las fotos).
--    Escritura/actualizacion/borrado: solo el dueno y solo en la
--    carpeta de SU restaurante (primer segmento del path).

drop policy if exists "fotos_productos_lectura_publica" on storage.objects;
create policy "fotos_productos_lectura_publica"
on storage.objects for select
to public
using ( bucket_id = 'productos-fotos' );

drop policy if exists "fotos_productos_insert_dueno" on storage.objects;
create policy "fotos_productos_insert_dueno"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'productos-fotos'
  and (storage.foldername(name))[1] = (
    select p.restaurante_id::text
    from public.perfiles p
    where p.id = auth.uid() and p.rol = 'dueno'
  )
);

drop policy if exists "fotos_productos_update_dueno" on storage.objects;
create policy "fotos_productos_update_dueno"
on storage.objects for update
to authenticated
using (
  bucket_id = 'productos-fotos'
  and (storage.foldername(name))[1] = (
    select p.restaurante_id::text
    from public.perfiles p
    where p.id = auth.uid() and p.rol = 'dueno'
  )
);

drop policy if exists "fotos_productos_delete_dueno" on storage.objects;
create policy "fotos_productos_delete_dueno"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'productos-fotos'
  and (storage.foldername(name))[1] = (
    select p.restaurante_id::text
    from public.perfiles p
    where p.id = auth.uid() and p.rol = 'dueno'
  )
);
