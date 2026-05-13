'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@mesaya/database/server';
import { createServiceClient } from '@mesaya/database/service';

const TIPOS_PERMITIDOS = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
];

const TAMANO_MAX = 2 * 1024 * 1024; // 2 MB

export type ResultadoLogo =
  | { ok: true; logoUrl: string }
  | { ok: false; error: string };

export type ResultadoEliminar =
  | { ok: true }
  | { ok: false; error: string };

function extensionDe(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'png';
  }
}

async function verificarDueno(): Promise<
  { ok: true; restauranteId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id, rol')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil?.restaurante_id || perfil.rol !== 'dueno') {
    return { ok: false, error: 'Solo el dueno puede cambiar el logo.' };
  }
  return { ok: true, restauranteId: perfil.restaurante_id as string };
}

/**
 * Sube un nuevo logo: borra cualquier archivo previo en el prefijo del
 * restaurante, sube el nuevo y actualiza la columna logo_url.
 */
export async function subirLogo(formData: FormData): Promise<ResultadoLogo> {
  const file = formData.get('archivo');
  if (!(file instanceof File)) {
    return { ok: false, error: 'No se recibio archivo.' };
  }

  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return {
      ok: false,
      error: 'Formato no permitido. Usa PNG, JPG, WebP o SVG.',
    };
  }

  if (file.size > TAMANO_MAX) {
    return {
      ok: false,
      error: `El archivo es muy grande (max 2 MB). Pesa ${(file.size / 1024 / 1024).toFixed(2)} MB.`,
    };
  }

  const auth = await verificarDueno();
  if (!auth.ok) return auth;

  const admin = createServiceClient();
  const prefijo = `${auth.restauranteId}/`;

  // 1. Borrar archivos viejos del prefijo
  const { data: archivosViejos } = await admin.storage
    .from('logos')
    .list(auth.restauranteId);

  if (archivosViejos && archivosViejos.length > 0) {
    const paths = archivosViejos.map((a) => `${prefijo}${a.name}`);
    await admin.storage.from('logos').remove(paths);
  }

  // 2. Subir el nuevo (cache-buster en el nombre via timestamp)
  const ext = extensionDe(file.type);
  const nombreArchivo = `logo-${Date.now()}.${ext}`;
  const pathCompleto = `${prefijo}${nombreArchivo}`;

  const { error: errorUpload } = await admin.storage
    .from('logos')
    .upload(pathCompleto, file, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    });

  if (errorUpload) {
    return {
      ok: false,
      error: 'No pudimos subir el archivo: ' + errorUpload.message,
    };
  }

  // 3. Obtener URL publica
  const { data: urlData } = admin.storage
    .from('logos')
    .getPublicUrl(pathCompleto);

  const logoUrl = urlData.publicUrl;

  // 4. Actualizar BD
  const { error: errorUpdate } = await admin
    .from('restaurantes')
    .update({ logo_url: logoUrl })
    .eq('id', auth.restauranteId);

  if (errorUpdate) {
    return {
      ok: false,
      error: 'Logo subido pero no pudimos guardar la URL: ' + errorUpdate.message,
    };
  }

  revalidatePath('/admin/branding');
  revalidatePath('/admin');
  return { ok: true, logoUrl };
}

/**
 * Elimina el logo: borra archivos del Storage y nulea la columna logo_url.
 */
export async function eliminarLogo(): Promise<ResultadoEliminar> {
  const auth = await verificarDueno();
  if (!auth.ok) return auth;

  const admin = createServiceClient();
  const prefijo = `${auth.restauranteId}/`;

  // Listar y borrar todos los archivos del restaurante
  const { data: archivos } = await admin.storage
    .from('logos')
    .list(auth.restauranteId);

  if (archivos && archivos.length > 0) {
    const paths = archivos.map((a) => `${prefijo}${a.name}`);
    const { error: errorRemove } = await admin.storage
      .from('logos')
      .remove(paths);
    if (errorRemove) {
      return {
        ok: false,
        error: 'No pudimos borrar los archivos: ' + errorRemove.message,
      };
    }
  }

  // Nulear columna
  const { error: errorUpdate } = await admin
    .from('restaurantes')
    .update({ logo_url: null })
    .eq('id', auth.restauranteId);

  if (errorUpdate) {
    return {
      ok: false,
      error: 'Archivos borrados pero no pudimos limpiar la URL: ' + errorUpdate.message,
    };
  }

  revalidatePath('/admin/branding');
  revalidatePath('/admin');
  return { ok: true };
}
