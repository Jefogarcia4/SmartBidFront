import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Sparkles, X } from 'lucide-react';

/**
 * Base del chat agéntico de FlexGPT. Configurable para apuntar a otro modelo o instancia.
 */
const CHAT_URL =
  import.meta.env.VITE_FLEXGPT_CHAT_URL ?? 'https://green.flexgpt.co/?model=generador-sow-mcp';

/**
 * ¿Embeber el chat en un iframe (experiencia buscada) o abrirlo en ventana propia?
 *
 * Embebido por defecto. La contrapartida está del lado de FlexGPT: su cookie de sesión solo
 * viaja a un iframe de otro sitio si está marcada `SameSite=None; Secure`. FlexGPT corre
 * Open WebUI, que expone exactamente esas dos opciones:
 *
 *     WEBUI_SESSION_COOKIE_SAME_SITE=none
 *     WEBUI_SESSION_COOKIE_SECURE=true
 *
 * Sin eso, el chat embebido muestra la pantalla de login aunque el usuario ya esté autenticado
 * en FlexGPT; el botón "Abrir aparte" de la cabecera es la salida mientras tanto.
 */
export const sowChatEmbedded = import.meta.env.VITE_FLEXGPT_EMBED !== 'false';

/**
 * Instrucción con la que arranca el chat.
 *
 * Nombra las herramientas del MCP de forma explícita y descarta otras fuentes: el agente tiene
 * además una base de conocimiento en Excel y, si no se le indica, busca ahí primero y responde
 * que no encuentra la cotización.
 *
 * El último paso se pide aparte y en imperativo porque el modelo daba por terminada la tarea al
 * escribir el SOW en el chat: redactaba las nueve secciones y no llamaba `generar_sow`, así que
 * el comercial se quedaba con el texto y sin el .docx. El entregable es el archivo, no el texto.
 */
function buildPrompt(numero: string, cliente?: string): string {
  return (
    `Usá la herramienta obtener_cotizacion del MCP de SmartBid para leer la cotización ${numero}` +
    `${cliente ? ` del cliente ${cliente}` : ''} y con esos datos redactá el SOW. ` +
    'Las cotizaciones están únicamente en SmartBid: no busques en archivos, hojas de cálculo ' +
    'ni otras fuentes. Los precios, cantidades y totales tomalos tal cual vienen de la herramienta. ' +
    'Consultá obtener_plantilla_sow para saber qué secciones redactar. ' +
    'Cuando termines de redactarlas, llamá obligatoriamente a generar_sow con esos textos y ' +
    'pasame el enlace de descarga que devuelve: el entregable es el documento Word, no el texto ' +
    'del chat, y sin esa llamada no existe ningún archivo que yo pueda descargar.'
  );
}

/** URL completa del chat: modelo + instrucción inicial. */
export function buildSowChatUrl(numero: string, cliente?: string): string {
  const url = new URL(CHAT_URL);
  url.searchParams.set('q', buildPrompt(numero, cliente));
  return url.toString();
}

/**
 * Abre el chat en una ventana propia. Devuelve false si el navegador bloqueó el emergente,
 * para que la pantalla que lo llama avise en vez de quedarse en silencio.
 */
export function openSowChatWindow(numero: string, cliente?: string): boolean {
  const width = Math.min(1180, Math.round(window.screen.availWidth * 0.9));
  const height = Math.min(880, Math.round(window.screen.availHeight * 0.9));
  const left = Math.round((window.screen.availWidth - width) / 2);
  const top = Math.round((window.screen.availHeight - height) / 2);

  const win = window.open(
    buildSowChatUrl(numero, cliente),
    `smartbid-sow-${numero}`,
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
  );

  win?.focus();
  return win != null;
}

interface SowChatModalProps {
  quotationNumber: string;
  clientName?: string;
  onClose: () => void;
}

/**
 * Chat embebido: es la experiencia buscada, con el asistente dentro de SmartBid.
 * Si FlexGPT todavía no permite la cookie cross-site, aquí se verá su pantalla de login y el
 * botón "Abrir aparte" resuelve el caso sin salir del flujo (ver sowChatEmbedded).
 */
export function SowChatModal({ quotationNumber, clientName, onClose }: SowChatModalProps) {
  const [copied, setCopied] = useState(false);
  const chatUrl = useMemo(
    () => buildSowChatUrl(quotationNumber, clientName),
    [quotationNumber, clientName],
  );

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(quotationNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sin portapapeles: el número está visible para copiarlo a mano */
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="sow-chat" onClick={(e) => e.stopPropagation()}>
        <header className="sow-chat-head">
          <div className="sow-chat-title">
            <Sparkles size={17} />
            <div>
              Generador de SOW
              <small>
                {quotationNumber}
                {clientName ? ` · ${clientName}` : ''}
              </small>
            </div>
          </div>
          <div className="sow-chat-actions">
            <button
              className="sow-chat-btn"
              title="Copiar el número de la cotización"
              onClick={() => void copyNumber()}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copiado' : 'Copiar N°'}
            </button>
            <button
              className="sow-chat-btn"
              title="Abrir en una ventana propia (mantiene tu sesión de FlexGPT)"
              onClick={() => openSowChatWindow(quotationNumber, clientName)}
            >
              <ExternalLink size={15} /> Abrir aparte
            </button>
            <button className="sow-chat-btn icon-only" title="Cerrar" onClick={onClose}>
              <X size={17} />
            </button>
          </div>
        </header>

        <iframe
          className="sow-chat-frame"
          src={chatUrl}
          title={`Generador de SOW · ${quotationNumber}`}
          allow="clipboard-write; microphone"
        />
      </div>
    </div>
  );
}
