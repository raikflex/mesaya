-- ============================================================
-- S28b: Multiples fotos por producto (hasta 2)
-- Reemplaza la columna imagen_path (text) por imagenes_paths (text[]).
-- La foto en la posicion 1 del arreglo es la PRINCIPAL.
-- Correr en el SQL Editor de Supabase.
-- (El bucket productos-fotos y sus politicas RLS ya existen; no cambian.)
-- ============================================================

-- 1) Nueva columna array. Arreglo vacio = sin fotos.
alter table public.productos
  add column if not exists imagenes_paths text[] not null default '{}';

-- 2) Migrar lo que hubiera en la columna vieja (si aun existe) al arreglo.
--    Guardado en un bloque para que sea seguro re-ejecutar.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'productos'
      and column_name = 'imagen_path'
  ) then
    update public.productos
      set imagenes_paths = array[imagen_path]
      where imagen_path is not null
        and imagenes_paths = '{}';
  end if;
end $$;

-- 3) Tope de 2 fotos por producto a nivel de base de datos.
alter table public.productos
  drop constraint if exists productos_max_2_fotos;
alter table public.productos
  add constraint productos_max_2_fotos
  check (coalesce(array_length(imagenes_paths, 1), 0) <= 2);

-- 4) Eliminar la columna vieja.
alter table public.productos
  drop column if exists imagen_path;
