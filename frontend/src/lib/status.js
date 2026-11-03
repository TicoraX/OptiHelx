// Conserva la referencia previa de cada clave cuyo contenido no cambio, para que
// React.memo en las tarjetas evite re-renders cuando /api/status devuelve objetos
// nuevos con el mismo contenido.
// ponytail: JSON.stringify por clave; el techo son unos pocos KB por refresco
// (hoy 2.5 KB en 16 claves). Depende del orden de claves, que el servidor mantiene
// estable; si cambiara, solo se pierde la optimizacion, nunca la correccion.
export function mergeStatus(prev, next) {
  if (!prev || !next) return next;
  const out = {};
  for (const key of Object.keys(next)) {
    out[key] = key in prev && JSON.stringify(prev[key]) === JSON.stringify(next[key]) ? prev[key] : next[key];
  }
  return out;
}
