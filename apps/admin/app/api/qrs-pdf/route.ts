import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClient } from '@mesaya/database/server';

/**
 * Genera un PDF A4 con grid 4 QRs por página (2x2).
 * Cada QR apunta a {APP_URL_CLIENTE}/m/{qr_token}.
 *
 * Para dev: el dominio del cliente se toma de NEXT_PUBLIC_APP_URL_CLIENTE
 * (ej. http://192.168.1.11:3002). En prod: https://app.mesaya.co.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil?.restaurante_id) {
    return NextResponse.json({ error: 'Sin restaurante' }, { status: 400 });
  }

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('nombre_publico, color_marca')
    .eq('id', perfil.restaurante_id as string)
    .single();

  const { data: mesas } = await supabase
    .from('mesas')
    .select('numero, qr_token, capacidad')
    .eq('restaurante_id', perfil.restaurante_id as string)
    .order('numero', { ascending: true });

  if (!mesas || mesas.length === 0) {
    return NextResponse.json({ error: 'Sin mesas' }, { status: 400 });
  }

  const baseUrl =
    (globalThis as any).process?.env?.['NEXT_PUBLIC_APP_URL_CLIENTE'] ??
    'http://localhost:3002';

  const nombreNegocio = (restaurante?.nombre_publico as string) ?? 'Tu restaurante';
  const colorMarca = parseHexColor((restaurante?.color_marca as string) ?? '#1a1814');

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`QRs - ${nombreNegocio}`);
  pdfDoc.setAuthor('MesaYA');

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 en puntos: 595.28 x 841.89
  const pageW = 595.28;
  const pageH = 841.89;
  const margin = 30;
  const cellW = (pageW - margin * 2) / 2;
  const cellH = (pageH - margin * 2) / 2;

  // Posiciones de las 4 celdas (origen abajo-izquierda en PDF)
  const cells = [
    { x: margin, y: margin + cellH }, // top-left
    { x: margin + cellW, y: margin + cellH }, // top-right
    { x: margin, y: margin }, // bottom-left
    { x: margin + cellW, y: margin }, // bottom-right
  ];

  let page = pdfDoc.addPage([pageW, pageH]);
  let cellIdx = 0;

  for (const mesa of mesas) {
    if (cellIdx === 4) {
      page = pdfDoc.addPage([pageW, pageH]);
      cellIdx = 0;
    }

    const cell = cells[cellIdx]!;
    const url = `${baseUrl}/m/${mesa.qr_token as string}`;

    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 0,
      width: 600,
      color: { dark: '#000000', light: '#ffffff' },
    });
    const qrPng = await pdfDoc.embedPng(qrDataUrl);

    // QR centrado en la celda, dejando margen para texto arriba y abajo
    const qrSize = Math.min(cellW, cellH) - 100;
    const qrX = cell.x + (cellW - qrSize) / 2;
    const qrY = cell.y + (cellH - qrSize) / 2 - 10;

    // Borde sutil de la tarjeta
    page.drawRectangle({
      x: cell.x + 10,
      y: cell.y + 10,
      width: cellW - 20,
      height: cellH - 20,
      borderColor: rgb(0.85, 0.83, 0.78),
      borderWidth: 0.5,
    });

    // Nombre del restaurante arriba
    const nombreSize = 14;
    const nombreWidth = fontBold.widthOfTextAtSize(nombreNegocio, nombreSize);
    page.drawText(nombreNegocio, {
      x: cell.x + (cellW - nombreWidth) / 2,
      y: cell.y + cellH - 35,
      size: nombreSize,
      font: fontBold,
      color: rgb(0.1, 0.094, 0.078),
    });

    // QR
    page.drawImage(qrPng, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // "Mesa N" abajo
    const mesaText = `Mesa ${mesa.numero as string}`;
    const mesaSize = 22;
    const mesaWidth = fontBold.widthOfTextAtSize(mesaText, mesaSize);
    page.drawText(mesaText, {
      x: cell.x + (cellW - mesaWidth) / 2,
      y: cell.y + 50,
      size: mesaSize,
      font: fontBold,
      color: colorMarca,
    });

    // "Escanea para pedir"
    const helpText = 'Escanea para pedir';
    const helpSize = 9;
    const helpWidth = fontRegular.widthOfTextAtSize(helpText, helpSize);
    page.drawText(helpText, {
      x: cell.x + (cellW - helpWidth) / 2,
      y: cell.y + 30,
      size: helpSize,
      font: fontRegular,
      color: rgb(0.45, 0.43, 0.4),
    });

    cellIdx++;
  }

  const pdfBytes = await pdfDoc.save();
  // Convertir Uint8Array a Buffer (Node) para NextResponse.
  const buffer = Buffer.from(pdfBytes);

  const filename = `mesaya-qrs-${slugify(nombreNegocio)}.pdf`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

function parseHexColor(hex: string): ReturnType<typeof rgb> {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return rgb(0.1, 0.094, 0.078);
  }
  return rgb(r, g, b);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
