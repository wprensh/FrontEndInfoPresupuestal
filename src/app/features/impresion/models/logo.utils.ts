/** Ancho y alto máximos con que se guarda el logo: suficiente para imprimir a 300 ppp en el membrete. */
const MAX_ANCHO = 900;
const MAX_ALTO = 450;

const leer = (archivo: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(archivo);
  });

/** Bytes reales de un data URL en base64. */
export const bytesDataUrl = (dataUrl: string): number => {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
};

/**
 * Devuelve el logo como data URL. Si pasa del límite o de 900×450 px se redibuja más pequeño
 * (PNG para conservar la transparencia y, si aún pesa mucho, WebP).
 */
export async function ajustarLogo(archivo: File, maxBytes: number): Promise<string> {
  const original = await leer(archivo);
  const img = new Image();
  img.src = original;
  await img.decode().catch(() => {
    throw new Error('El archivo no es una imagen válida');
  });

  const escala = Math.min(1, MAX_ANCHO / img.naturalWidth, MAX_ALTO / img.naturalHeight);
  if (escala === 1 && archivo.size <= maxBytes) return original;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);

  for (const [tipo, calidad] of [['image/png', undefined], ['image/webp', 0.92], ['image/webp', 0.8], ['image/jpeg', 0.85]] as const) {
    const dataUrl = canvas.toDataURL(tipo, calidad);
    if (dataUrl.startsWith(`data:${tipo}`) && bytesDataUrl(dataUrl) <= maxBytes) return dataUrl;
  }
  throw new Error('El logo es demasiado pesado; usa una imagen de menos de 512 KB');
}
