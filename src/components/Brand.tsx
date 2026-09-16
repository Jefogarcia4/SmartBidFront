import { useState } from 'react';

/**
 * Dos archivos para dos fondos, servidos desde `public/` (Vite copia esa carpeta tal cual a
 * `dist/`, así que la ruta es absoluta y no se importa):
 *
 *   Logo_1 → logotipo morado, para el blanco de la barra superior.
 *   Logo_2 → mismo logo con el texto en blanco, para el degradado morado del login.
 */
const LOGOS = {
  topbar: '/Logo_1.png',
  login: '/Logo_2.png',
} as const;

interface BrandProps {
  variant?: keyof typeof LOGOS;
}

/**
 * Marca de la aplicación, compartida por los cuatro headers y el login.
 *
 * Si el archivo no está (o falla al cargar) cae al texto que había antes, en vez de dejar el
 * ícono roto del navegador: la pantalla nunca queda peor de como estaba.
 */
export function Brand({ variant = 'topbar' }: BrandProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return variant === 'login' ? <h1>SmartBid</h1> : <span className="brand">SmartBid</span>;

  return (
    <img
      className="brand-logo"
      src={LOGOS[variant]}
      alt="SmartBid"
      onError={() => setFailed(true)}
    />
  );
}
