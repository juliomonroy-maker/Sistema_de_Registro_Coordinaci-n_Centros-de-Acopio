/**
 * Limitador de intentos en memoria (ventana fija). Suficiente para una sola
 * instancia; en despliegues multi-instancia sustituir por Redis o similar.
 */
type Ventana = { inicio: number; intentos: number };

const ventanas = new Map<string, Ventana>();

export function limitar(clave: string, max: number, ventanaMs: number): { permitido: boolean; reintentarEnSeg: number } {
  const ahora = Date.now();
  const v = ventanas.get(clave);

  if (!v || ahora - v.inicio >= ventanaMs) {
    ventanas.set(clave, { inicio: ahora, intentos: 1 });
    return { permitido: true, reintentarEnSeg: 0 };
  }

  v.intentos++;
  if (v.intentos > max) {
    return { permitido: false, reintentarEnSeg: Math.ceil((v.inicio + ventanaMs - ahora) / 1000) };
  }
  return { permitido: true, reintentarEnSeg: 0 };
}

/** Limpieza perezosa para que el mapa no crezca sin límite. */
setInterval(() => {
  const ahora = Date.now();
  for (const [k, v] of ventanas) if (ahora - v.inicio > 60 * 60 * 1000) ventanas.delete(k);
}, 10 * 60 * 1000).unref?.();
