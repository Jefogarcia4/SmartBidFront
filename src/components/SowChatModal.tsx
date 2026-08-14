import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Sparkles, X } from 'lucide-react';

/**
 * Base del chat agéntico de FlexGPT. Se configura con VITE_FLEXGPT_CHAT_URL para poder
 * apuntar a otro modelo o a otra instancia sin recompilar la lógica.
 */
const CHAT_URL = import.meta.env.VITE_FLEXGPT_CHAT_URL ?? 'https://green.flexgpt.co/?model=generador-sow-mcp';

interface SowChatModalProps {
  quotationNumber: string;
  clientName?: string;
  onClose: () => void;
}

/**
 * Abre el modelo agéntico de FlexGPT embebido, ya apuntando a una cotización concreta.
 *
 * El modelo consulta los datos por el MCP de SmartBid (/mcp), así que aquí NO se le pasan
 * precios ni ítems: solo el número de cotización. Todo lo demás lo resuelve él con las
 * herramientas, que ya aplican el alcance por comercial.
 *
 * El sitio de FlexGPT no envía X-Frame-Options ni CSP frame-ancestors, por eso se puede
 * embeber. Aun así hay un botón para abrirlo en una pestaña: si la cookie de sesión de
 * FlexGPT es SameSite=Lax no viaja dentro del iframe y el chat mostraría el login.
 */
export function SowChatModal({ quotationNumber, clientName, onClose }: SowChatModalProps) {
  const [copied, setCopied] = useState(false);

  // Prompt inicial: Open WebUI lo toma del parámetro `q` de la URL.
  const chatUrl = useMemo(() => {
    const prompt = `Generá el SOW de la cotización ${quotationNumber}${clientName ? ` (${clientName})` : ''}.`;
    const url = new URL(CHAT_URL);
    url.searchParams.set('q', prompt);
    return url.toString();
  }, [quotationNumber, clientName]);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(quotationNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sin portapapeles: el número igual está visible para copiarlo a mano */
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
            <a
              className="sow-chat-btn"
              href={chatUrl}
              target="_blank"
              rel="noreferrer"
              title="Abrir el chat en una pestaña nueva"
            >
              <ExternalLink size={15} /> Abrir aparte
            </a>
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
