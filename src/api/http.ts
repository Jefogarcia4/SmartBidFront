const BASE_URL = 'http://localhost:5080';

const TOKEN_KEY = 'smartbid.auth';

/**
 * Guarda el header Authorization completo:
 *  - "Basic base64(email:password)" para login con contraseña
 *  - "Bearer <jwt>" para login con Office 365 (Microsoft Entra ID)
 */
export const tokenStore = {
  get: (): string | null => sessionStorage.getItem(TOKEN_KEY),
  set: (email: string, password: string) =>
    sessionStorage.setItem(TOKEN_KEY, `Basic ${btoa(`${email}:${password}`)}`),
  setBearer: (jwt: string) => sessionStorage.setItem(TOKEN_KEY, `Bearer ${jwt}`),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = tokenStore.get();
  if (token) headers.set('Authorization', token);

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      message = body?.message ?? body?.title ?? message;
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Descarga binaria (ej. documentos Word) con el mismo esquema de autenticación. */
async function requestBlob(path: string): Promise<Blob> {
  const headers = new Headers();
  const token = tokenStore.get();
  if (token) headers.set('Authorization', token);
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) throw new ApiError(res.status, `Error ${res.status} descargando el archivo`);
  return res.blob();
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  blob: (path: string) => requestBlob(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body != null ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
