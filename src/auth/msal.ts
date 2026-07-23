import { PublicClientApplication } from '@azure/msal-browser';

/**
 * Configuración de Microsoft Entra ID (Office 365).
 * Completa VITE_AAD_CLIENT_ID y VITE_AAD_TENANT_ID en el archivo .env
 * con los datos del App Registration de Azure.
 */
const clientId = import.meta.env.VITE_AAD_CLIENT_ID as string | undefined;
const tenantId = import.meta.env.VITE_AAD_TENANT_ID as string | undefined;
/** Opcional: scope del API (ej. api://<clientId>/access_as_user). Si no se define, se usa el idToken. */
const apiScope = import.meta.env.VITE_AAD_API_SCOPE as string | undefined;

export const isO365Configured =
  !!clientId && !clientId.startsWith('<') && !!tenantId && !tenantId.startsWith('<');

let instance: PublicClientApplication | null = null;

async function getMsal(): Promise<PublicClientApplication> {
  if (!instance) {
    instance = new PublicClientApplication({
      auth: {
        clientId: clientId!,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri: window.location.origin,
      },
      cache: { cacheLocation: 'sessionStorage' },
    });
    await instance.initialize();
  }
  return instance;
}

/** Abre el popup de Microsoft y devuelve el token para el header Authorization. */
export async function acquireMicrosoftToken(): Promise<string> {
  const msal = await getMsal();
  const scopes = apiScope && !apiScope.startsWith('<') ? [apiScope] : ['openid', 'profile', 'email'];
  const result = await msal.loginPopup({ scopes, prompt: 'select_account' });
  // Con scope de API se usa el accessToken; sin él, el idToken (el API acepta ambos)
  return apiScope && !apiScope.startsWith('<') ? result.accessToken : result.idToken;
}

export async function microsoftLogout(): Promise<void> {
  if (!instance) return;
  await instance.clearCache();
}
