/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base del API SmartBid, sin barra final. */
  readonly VITE_API_URL?: string;
  readonly VITE_AAD_CLIENT_ID?: string;
  readonly VITE_AAD_TENANT_ID?: string;
  readonly VITE_AAD_API_SCOPE?: string;
  /** Chat agéntico de FlexGPT para generar el SOW (incluye ?model=...). */
  readonly VITE_FLEXGPT_CHAT_URL?: string;
  /** "true" embebe el chat en un iframe; por defecto se abre en ventana propia. */
  readonly VITE_FLEXGPT_EMBED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
