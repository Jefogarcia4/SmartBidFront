/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base del API SmartBid, sin barra final. */
  readonly VITE_API_URL?: string;
  readonly VITE_AAD_CLIENT_ID?: string;
  readonly VITE_AAD_TENANT_ID?: string;
  readonly VITE_AAD_API_SCOPE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
