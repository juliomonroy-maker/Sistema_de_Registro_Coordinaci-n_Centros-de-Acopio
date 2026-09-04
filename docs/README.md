# Documentación

| Documento | Para quién | Qué responde |
|---|---|---|
| [ESPECIFICACION.md](ESPECIFICACION.md) | Todos | La especificación original del reto: roles, modelo de datos, reglas. Fuente de verdad |
| [ARQUITECTURA.md](ARQUITECTURA.md) | Quien va a explicar o mantener el sistema | Cómo está construido, por qué así, dónde vive cada cosa |
| [API.md](API.md) | Quien integra o prueba el backend | Cada endpoint: método, ruta, quién puede, qué recibe, qué devuelve |
| [MANUAL_USUARIO.md](MANUAL_USUARIO.md) | Quien usa o demuestra el sistema | Qué ve y qué puede hacer cada rol, paso a paso |
| [reportes/](reportes/) | Quien revisa el avance | Un reporte fechado por tanda de cambios (qué se hizo, por qué, cómo se probó) |

Puesta en marcha (local o con Docker) y usuarios de ejemplo: ver el [README principal](../README.md).

## Convención

- La raíz del repo solo tiene `README.md` (arranque) y `CLAUDE.md` (guía para el asistente de código).
- Todo lo demás va en `docs/`. Un cambio funcional actualiza `API.md` (si hay endpoint nuevo) y
  `MANUAL_USUARIO.md` (si cambia lo que ve un rol), y se resume en `reportes/AAAA-MM-DD-tema.md`.
