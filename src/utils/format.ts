export const money = (value: number): string =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** La plataforma de un paquete es multivalor: el negocio la escribe separada por " / ". */
export const platformChips = (platform: string | null): string[] =>
  (platform ?? '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
