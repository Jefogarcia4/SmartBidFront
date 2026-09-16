import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, RefreshCw, Sparkles, X } from 'lucide-react';

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
 * Mensaje con el que el comercial arranca el chat. Corto y en el mismo formato con el que ya le
 * hablan al agente; todo el instructivo vive en el **system prompt** del agente en FlexGPT
 * (`FLEXGPT-SYSTEM-PROMPT.md` en el repo del API), que es donde manda de verdad.
 */
export function sowChatMessage(numero: string): string {
  return `Genera el SOW para ${numero}`;
}

/**
 * URL del chat: solo el modelo. **No lleva el parámetro `q` a propósito.**
 *
 * `q` es el único parámetro de Open WebUI que rellena el mensaje, y según su documentación lo
 * *envía solo* apenas carga la página. Ese autoenvío llegaba antes de que Open WebUI terminara
 * de registrar el tool server de SmartBID, así que el modelo respondía sin las herramientas del
 * MCP: decía no encontrar la cotización aunque estuviera todo bien configurado.
 *
 * No hay parámetro que rellene sin enviar, y escribir en la caja desde acá tampoco se puede: el
 * iframe es de otro dominio. Por eso el chat abre limpio y el mensaje se deja en el portapapeles
 * — para cuando el comercial lo pega, las herramientas ya están cargadas.
 */
export function buildSowChatUrl(): string {
  return CHAT_URL;
}

/**
 * Abre el chat en una ventana propia. Devuelve false si el navegador bloqueó el emergente,
 * para que la pantalla que lo llama avise en vez de quedarse en silencio.
 */
export function openSowChatWindow(numero: string): boolean {
  const width = Math.min(1180, Math.round(window.screen.availWidth * 0.9));
  const height = Math.min(880, Math.round(window.screen.availHeight * 0.9));
  const left = Math.round((window.screen.availWidth - width) / 2);
  const top = Math.round((window.screen.availHeight - height) / 2);

  const win = window.open(
    buildSowChatUrl(),
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

  /**
   * Remontar el iframe lo obliga a pedir la página de nuevo. Sirve después de tocar la
   * configuración en FlexGPT —conectar el tool server, cambiar el filtro de funciones— para no
   * tener que cerrar y reabrir el modal.
   *
   * Ojo: NO arregla la sesión. Si la cookie de FlexGPT no entra al iframe (SameSite=Lax), acá
   * nunca vas a estar logueado, y recargar mil veces da lo mismo — eso se resuelve del lado de
   * ellos con WEBUI_SESSION_COOKIE_SAME_SITE=none.
   */
  const [reloadKey, setReloadKey] = useState(0);
  const chatUrl = buildSowChatUrl();

  const message = useMemo(() => sowChatMessage(quotationNumber), [quotationNumber]);

  const copyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      return false; // sin permiso de portapapeles: el texto está a la vista para copiarlo a mano
    }
  }, [message]);

  // Intento al abrir, para que el comercial solo tenga que pegar. Si el navegador lo rechaza
  // por falta de interacción, queda el botón — por eso el texto también se muestra.
  useEffect(() => {
    void copyMessage();
  }, [copyMessage]);

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
              title="Copiar el mensaje para pegarlo en el chat"
              onClick={() => void copyMessage()}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copiado' : 'Copiar mensaje'}
            </button>
            <button
              className="sow-chat-btn"
              title="Recargar el chat (útil tras cambiar la configuración en FlexGPT)"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              <RefreshCw size={15} /> Recargar
            </button>
            <button
              className="sow-chat-btn"
              title="Abrir en una ventana propia (mantiene tu sesión de FlexGPT)"
              onClick={() => openSowChatWindow(quotationNumber)}
            >
              <ExternalLink size={15} /> Abrir aparte
            </button>
            <button className="sow-chat-btn icon-only" title="Cerrar" onClick={onClose}>
              <X size={17} />
            </button>
          </div>
        </header>

        <p className="sow-chat-hint">
          Pegá este mensaje en el chat y enviá:<code>{message}</code>
          <span>{copied ? 'Ya lo copiamos al portapapeles.' : 'Usá "Copiar mensaje".'}</span>
        </p>

        <iframe
          key={reloadKey}
          className="sow-chat-frame"
          src={chatUrl}
          title={`Generador de SOW · ${quotationNumber}`}
          allow="clipboard-write; microphone"
        />
      </div>
    </div>
  );
}
