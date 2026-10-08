import { quotationsApi } from '../api/services';

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
    const blob = await quotationsApi.generateDocument(quotationId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cotizacion_${numero}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
