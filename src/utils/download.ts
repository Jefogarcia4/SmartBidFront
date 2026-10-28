import { quotationsApi } from '../api/services';

/** Hace que el navegador guarde un archivo recibido del API con el nombre indicado. */
export function guardarArchivo(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Descarga el Word estándar de una cotización.
 *
 * Vive acá porque lo usan dos pantallas: el modal que acaba de crear la cotización (descarga
 * automática) y el detalle de Mis Cotizaciones (botón). Tener una sola copia evita que el
 * nombre del archivo se les vaya separando.
 *
 * Devuelve false si falló, para que quien llama avise con su propio toast.
 */
export async function descargarWordEstandar(quotationId: number, numero: string): Promise<boolean> {
  try {
    guardarArchivo(await quotationsApi.generateDocument(quotationId), `Cotizacion_${numero}.docx`);
    return true;
  } catch {
    return false;
  }
}
