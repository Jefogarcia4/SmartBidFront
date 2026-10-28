import { AuthError, PublicClientApplication } from '@azure/msal-browser';

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

/**
 * Marca con la que MSAL registra que hay un login en curso (en sessionStorage). Si la página se
 * recarga con la ventana de Microsoft abierta, la marca queda huérfana y todo intento posterior
 * en esa pestaña falla con `interaction_in_progress`: recargar no la borra, solo cerrar la
 * pestaña. Es una clave interna de MSAL 3 (BrowserCacheManager.setInteractionInProgress).
 */
const INTERACTION_STATUS_KEY = 'msal.interaction.status';

/** Abre el popup de Microsoft y devuelve el token para el header Authorization. */
export async function acquireMicrosoftToken(): Promise<string> {
  const msal = await getMsal();
  const scopes = apiScope && !apiScope.startsWith('<') ? [apiScope] : ['openid', 'profile', 'email'];
  // El botón queda deshabilitado mientras dura el login, así que si al hacer clic ya hay una
  // marca de "en curso", es la huérfana de una recarga: se borra para no bloquear la pestaña.
  try {
    sessionStorage.removeItem(INTERACTION_STATUS_KEY);
  } catch {
    // Sin acceso a sessionStorage MSAL tampoco funcionaría; que falle con su propio error.
  }
  const result = await msal.loginPopup({ scopes, prompt: 'select_account' });
  // Con scope de API se usa el accessToken; sin él, el idToken (el API acepta ambos)
  return apiScope && !apiScope.startsWith('<') ? result.accessToken : result.idToken;
}

/**
 * Indicación para Chrome cuando la empresa exige un equipo administrado. Edge le presenta a
 * Microsoft la identidad del equipo por su cuenta; Chrome necesita la extensión oficial o la
 * política CloudAPAuthEnabled. Es la causa típica de "en Edge entra y en Chrome no".
 */
const CHROME_SSO =
  'En Chrome instalá la extensión «Microsoft Single Sign On» desde la Chrome Web Store y volvé ' +
  'a intentar; mientras tanto podés entrar con Edge.';

/**
 * Traduce un error del login de Microsoft a un mensaje que diga qué pasó y qué hacer, con el
 * código al final para que el usuario lo pueda reportar. Antes todo terminaba en "cancelado o
 * fallido" y no había forma de distinguir un popup bloqueado de una política de la empresa.
 */
export function describeMicrosoftError(err: unknown): string {
  if (!(err instanceof AuthError)) {
    return 'Inicio de sesión con Microsoft fallido.';
  }

  // Los rechazos de Entra ID vienen como "AADSTS53003: Access has been blocked by…".
  const aadsts = /AADSTS(\d+)/.exec(`${err.errorMessage} ${err.message}`)?.[1];
  const codigo = aadsts ? `AADSTS${aadsts}` : err.errorCode;

  switch (aadsts) {
    case '50097': // se requiere autenticación del dispositivo
    case '53000': // el equipo no cumple (no administrado / no conforme)
    case '53001': // el equipo no está unido al dominio
      return `Tu empresa exige entrar desde un equipo administrado y Microsoft no pudo comprobarlo en este navegador. ${CHROME_SSO} (${codigo})`;
    case '53003':
      return `Una política de acceso de tu empresa bloqueó el ingreso desde este navegador. ${CHROME_SSO} Si ya la tenés, consultá con TI. (${codigo})`;
    case '50105':
      return `Tu cuenta no tiene asignada la aplicación SmartBid en Microsoft Entra ID. Pedile al administrador que te la asigne. (${codigo})`;
    case '50020':
    case '50034':
      return `Esa cuenta no pertenece al directorio de la empresa. Elegí tu cuenta corporativa. (${codigo})`;
    case '65001':
      return `Falta que un administrador autorice SmartBid en Microsoft Entra ID. (${codigo})`;
    case '50011':
      return `La dirección de SmartBid no está registrada en la aplicación de Entra ID. Avisale al administrador. (${codigo})`;
  }

  switch (err.errorCode) {
    case 'popup_window_error':
    case 'empty_window_error':
    case 'block_nested_popups':
      return `El navegador bloqueó la ventana de Microsoft. Permití las ventanas emergentes para este sitio (ícono a la derecha de la barra de direcciones) y volvé a intentar. (${codigo})`;
    case 'user_cancelled':
      // Con una política de equipo administrado, Microsoft suele mostrar "No puedes llegar hasta
      // aquí" DENTRO de la ventana y no devuelve el error: el usuario la cierra y llega como
      // cancelación. Por eso el mensaje cubre ese caso.
      return `Se cerró la ventana de Microsoft antes de terminar. Si te mostró «No puedes llegar hasta aquí» o un aviso sobre el dispositivo, tu empresa exige un equipo administrado. ${CHROME_SSO}`;
    case 'interaction_in_progress':
      return 'Ya hay un inicio de sesión de Microsoft abierto. Cerrá esa ventana y volvé a intentar.';
    case 'monitor_window_timeout':
      return `La ventana de Microsoft no respondió a tiempo. Volvé a intentar; si se repite, desactivá para este sitio las extensiones que bloquean anuncios o rastreadores. (${codigo})`;
    case 'no_network_connectivity':
      return 'No hay conexión con Microsoft. Revisá la red o la VPN y volvé a intentar.';
  }

  return `No se pudo iniciar sesión con Microsoft. (${codigo})`;
}

export async function microsoftLogout(): Promise<void> {
  if (!instance) return;
  await instance.clearCache();
}
