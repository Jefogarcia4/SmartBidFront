import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError, BASE_URL } from '../api/http';
import { isO365Configured } from '../auth/msal';

export function LoginPage() {
  const { login, loginWithMicrosoft, loginDevSso } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [showDevSso, setShowDevSso] = useState(false);
  const [devEmail, setDevEmail] = useState('carlos.green@smartbid.co');

  async function handleMicrosoft() {
    setError(null);
    // Sin ClientId/TenantId configurados: modo simulación (solo Development)
    if (!isO365Configured) {
      setShowDevSso((v) => !v);
      return;
    }
    setMsLoading(true);
    try {
      await loginWithMicrosoft();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Tu cuenta de Office 365 no está registrada en SmartBid.');
      } else if (err instanceof ApiError) {
        setError('No se pudo validar el token con el API.');
      } else {
        setError('Inicio de sesión con Microsoft cancelado o fallido.');
      }
    } finally {
      setMsLoading(false);
    }
  }

  async function handleDevSso(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMsLoading(true);
    try {
      await loginDevSso(devEmail);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Ese email no existe como usuario SSO en SmartBid (o el API no está en Development).');
      } else {
        setError('No se pudo conectar con el API.');
      }
    } finally {
      setMsLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Credenciales inválidas. Verifica tu email y contraseña.');
      } else {
        setError(`No se pudo conectar con el API (${BASE_URL}).`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-hero">
          <h1>SmartBid</h1>
          <p>Enterprise Marketplace Solution — Portal de Cotizaciones</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}
          <div className="field">
            <label htmlFor="email">EMAIL</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              placeholder="usuario@smartbid.co"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">CONTRASEÑA</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>

          <div className="login-divider">o</div>

          <button
            type="button"
            className="ms-btn"
            onClick={handleMicrosoft}
            disabled={msLoading}
            title={
              isO365Configured
                ? 'Iniciar sesión con tu cuenta corporativa'
                : 'Sin ClientId/TenantId configurados: abre la simulación SSO (solo desarrollo)'
            }
          >
            <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            {msLoading ? 'Conectando…' : 'Continuar con Microsoft'}
          </button>

          {!isO365Configured && showDevSso && (
            <div className="dev-sso">
              <div className="login-hint" style={{ textAlign: 'left' }}>
                <strong>Simulación SSO (solo desarrollo):</strong> ingresa como un usuario de
                Office 365 registrado en SmartBid, sin Azure.
              </div>
              <div className="field">
                <label>EMAIL CORPORATIVO (SSO)</label>
                <input
                  type="email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  placeholder="carlos.green@smartbid.co"
                />
              </div>
              <button
                type="button"
                className="login-btn"
                style={{ width: '100%' }}
                disabled={msLoading}
                onClick={(e) => void handleDevSso(e as unknown as FormEvent)}
              >
                {msLoading ? 'Conectando…' : 'Simular login SSO'}
              </button>
            </div>
          )}
          {!isO365Configured && !showDevSso && (
            <div className="login-hint">
              Office 365 sin configurar: el botón abre una <strong>simulación SSO</strong> (dev).
              Para el flujo real, define ClientId/TenantId en <code>.env</code>.
            </div>
          )}
          <div className="login-hint">Demo: admin@smartbid.co / Smartbid123*</div>
        </form>
      </div>
    </div>
  );
}
