# Reporte de auditoría y cambios — 2026-09-03

Auditoría de seguridad y correctitud del sistema, corrección de hallazgos, dos innovaciones
(metas por campaña y exportación CSV) y pruebas de uso por rol contra el servidor real.

## 1. Hallazgos de seguridad corregidos

| # | Hallazgo | Riesgo | Corrección |
|---|----------|--------|------------|
| 1 | **IDOR en detalle de centro y campaña.** Cualquier usuario autenticado (voluntario, institución) podía leer stock y movimientos de cualquier centro/campaña por URL, tanto en página como en `GET /api/centros/:id` y `GET /api/campanas/:id`. | Alto | `puedeVerCentro()` / `puedeVerCampana()` en `src/lib/auth.ts`; aplicados en las rutas API y en las páginas (redirigen a `/dashboard`). |
| 2 | **Fuga de datos por rol en listados.** Líder e institución veían *todos* los movimientos en `/movimientos`; líder e institución podían consultar cualquier stock en `/api/stock`. | Alto | `alcanceMovimientos()` y `alcanceStock()` en `src/lib/movimientos.ts`: único punto que decide el `where` por rol. Lo usan listado, página, exportación y stock. Institución recibe 403 en stock. |
| 3 | **Condición de carrera en validación de stock.** Dos salidas simultáneas leían el mismo disponible y ambas pasaban → stock negativo. | Alto | Lock consultivo `pg_advisory_xact_lock` sobre la línea centro+campaña+artículo antes de validar la salida. Probado con 8 entregas paralelas sobre stock para 4: exactamente 4 aceptadas, 4 rechazadas con 422. |
| 4 | **Sesión no revocable.** Rol, centro y `activo` viajaban en el JWT (8 h). Desactivar o reasignar una cuenta no surtía efecto hasta expirar. | Medio | `getSession()` ahora solo confía en `userId` del token y relee el usuario en BD en cada request (deduplicado con `React.cache`). Usuario inactivo = sin sesión. |
| 5 | **Enumeración de cuentas por timing en login.** `bcrypt.compare` solo corría si el correo existía. | Medio | Se compara siempre contra un hash señuelo generado al arrancar (`HASH_SENUELO`). |
| 6 | **Sin límite de intentos de login.** | Medio | Rate limit en memoria: 10 intentos / 15 min por IP+correo → 429 con `Retry-After` (`src/lib/ratelimit.ts`). |
| 7 | **Open redirect** en `/login?next=`. | Medio | Solo se acepta ruta interna que empiece con `/` y no con `//`. |
| 8 | **Líder podía reasignarse/quitarse el liderazgo o cerrar la campaña** vía `PATCH /api/campanas/:id`. | Medio | `liderId` y `activa` se ignoran salvo para COORDINADOR. |
| 9 | Sin cabeceras de seguridad; `X-Powered-By` expuesto. | Bajo | `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; `poweredByHeader: false`. |
| 10 | Middleware verificaba JWT con `AUTH_SECRET` indefinido sin fallar cerrado. | Bajo | Si falta o es corto, se rechaza la sesión. |
| 11 | Contraseña mínima de 6 en alta de usuarios; correo sensible a mayúsculas. | Bajo | Mínimo 8; correo normalizado a minúsculas en login y alta. |

## 2. Reglas de negocio y correctitud

- **Contexto de movimiento validado en transacción:** centro activo, campaña activa y centro participante en la campaña (`validarContexto`). Antes se podía mover stock en centros inactivos, campañas cerradas o centros ajenos a la campaña. Transferencias validan origen y destino.
- **Donante anónimo** ya no guarda el nombre aunque el formulario lo envíe.
- **"Entregas sin confirmar"** en el panel global solo cuenta entregas canalizadas a una institución (las de beneficiario directo no se confirman nunca).
- **Cantidad** acotada (`> 0`, finita, ≤ 1,000,000). Cuerpo JSON malformado → 400 en lugar de 500. Errores de validación a nivel de formulario (no de campo) ya se muestran (`formErrors`).
- **Cálculo de stock** pasa de traer todos los movimientos a memoria a `groupBy` con `_sum` en Postgres (`src/lib/stock.ts`). Mismo resultado, coste constante en memoria.
- Se eliminó el cast `as never` en `motivo` usando el tipo `Motivo` de Prisma.

## 3. Innovación A — Metas por campaña

- **Modelo:** `MetaCampana { campanaId, articuloId, cantidadObjetivo }` con `@@unique([campanaId, articuloId])`. Migración `20260903_metas_campana`.
- **Avance derivado del ledger:** `progresoMetas(campanaId)` suma las `RECEPCION` del artículo en todos los centros de la campaña y lo compara con el objetivo. Mide lo *captado*; las entregas no restan avance.
- **API:** `GET /api/campanas/:id/metas` (coordinador o líder) y `PUT` que reemplaza el conjunto (rechaza artículos repetidos). `GET /api/campanas/:id` incluye `metas`.
- **UI:** `src/components/MetasCampana.tsx` en `/campanas/[id]` (editar, agregar, quitar, guardar; barras de progreso por color). Resumen de solo lectura en dashboard de coordinador (por campaña activa) y de líder, con KPI "Avance de metas". El seed crea 3 metas de ejemplo.

## 4. Innovación B — Exportación CSV

- `GET /api/movimientos/export?centroId=&campanaId=&tipo=&desde=&hasta=` — ledger completo (21 columnas: fecha, tipo, signo, centro, campaña, artículo, cantidad con signo, motivo, actor, donante, institución, confirmación, contraparte y grupo de transferencia). Hasta 50,000 filas.
- `GET /api/stock/export?centroId=&campanaId=` — inventario derivado.
- Ambos respetan exactamente el alcance por rol del listado. UTF-8 con BOM (Excel), RFC 4180, y protección contra inyección de fórmulas en celdas de texto (`src/lib/csv.ts`).
- Botones "Exportar CSV" en panel global, dashboard de encargado y líder, detalle de centro y campaña, y en `/movimientos`.
- `/movimientos` ahora tiene **filtros** (tipo, campaña, desde, hasta) por query string; el botón CSV hereda los filtros activos.

## 4b. Gestión de usuarios en pantalla

- `/usuarios` (coordinador) pasa de tabla de solo lectura a **alta de cuentas y activar/desactivar** (`src/components/UsuariosAdmin.tsx`). El formulario muestra el selector de centro o institución según el rol elegido.
- Nuevo `PATCH /api/usuarios/:id` (coordinador): `activo`, `rol`, `centroId`, `institucionId`, `nombre`, `password`.
- Reglas: encargado/voluntario requieren centro; institución requiere institución (validado en alta y en edición). Un coordinador no puede desactivarse ni quitarse el rol a sí mismo. Correo normalizado a minúsculas.
- Desactivar surte efecto inmediato: la sesión activa del usuario deja de ser válida en el siguiente request (verificado).

## 4c. Totales por campaña en el panel global

- `totalesPorCampana()` en `src/lib/stock.ts`: por cada campaña devuelve centros participantes, unidades recibidas, entregadas, merma, stock actual, número de movimientos y avance promedio de sus metas. Todo derivado del ledger, con cuatro agregaciones fijas en BD (no una consulta por campaña).
- Tabla "Totales por campaña" en el panel del coordinador, ordenada con las activas primero y con el nombre enlazado al detalle. El avance se muestra como porcentaje más barra; una campaña sin metas muestra guion.
- Verificado con el seed: recibido 1,385 − entregado 1,000 − merma 10 = stock 375, que coincide con `GET /api/stock`. Las transferencias se anulan dentro de la misma campaña, como debe ser. Avance 37% = promedio de 50, 61 y 0. Una campaña recién creada sin movimientos rinde una fila en ceros sin errores.

## 4d. Docker (ítem del MVP "ejecutarse desde otra computadora")

- `Dockerfile` multi-etapa: `deps` (npm ci), `builder` (prisma generate + build standalone de Next), `runner` (Debian slim con openssl, usuario sin privilegios, solo `.next/standalone`, `.next/static` y el motor de Prisma; healthcheck sobre `/login`).
- `docker-compose.yml`: `db` (Postgres 16 con volumen y healthcheck), `migrate` (imagen `builder`, corre `prisma migrate deploy` y el seed idempotente, termina) y `app` (arranca solo cuando `migrate` terminó bien; `AUTH_SECRET` obligatorio desde `.env`, falla con mensaje claro si falta).
- `.dockerignore` excluye `.env`, `node_modules`, `.next` y `.git`: ningún secreto entra en la imagen.
- `next.config.mjs`: `output: "standalone"`.
- Cookie de sesión: nuevo `COOKIE_SECURE`. En producción por HTTP plano (demo por IP en red local) el navegador no enviaría una cookie `Secure` y el login parecería fallar; con `COOKIE_SECURE=false` funciona. Sin la variable, producción sigue siendo `Secure`.
- README: sección "Con Docker" con comandos, acceso por IP de red, puerto configurable y reinicio limpio.

**Validación.** Docker no está instalado en la máquina donde se hizo el trabajo, así que la imagen no se construyó aquí. Se validó el equivalente al runner: `next build` en modo standalone, motor de Prisma presente en `.next/standalone/node_modules/.prisma`, y `node server.js` con `NODE_ENV=production` sirviendo login (200 con cookie sin `Secure` cuando `COOKIE_SECURE=false`, con `Secure` cuando no se define), dashboard y CSV. Primer `docker compose up --build` en una máquina con Docker es la prueba pendiente.

## 5. Pruebas de uso ejecutadas (servidor `next dev`, seed cargado)

Todas las siguientes pasaron:

- Login de los 5 roles; correo inexistente → 401 sin diferencia de mensaje; 11.º intento fallido → 429.
- Voluntario (centro 1) → centro 2: 403 en API y redirección en página. Encargado → detalle de campaña: 403/redirección. Líder → su campaña: 200 con metas.
- Institución: `/api/stock` 403; `/api/movimientos` solo sus ENTREGA. Encargado: solo su centro. Voluntario intentando MERMA: 403.
- Entrega sin stock → 422 con disponible/solicitado. Cantidad 1e12 → 422. JSON roto → 400.
- Metas: PUT como líder 200 con porcentajes; repetidos → 422 con mensaje; como encargado → 403. Líder que intenta `activa:false` y `liderId:null` → ignorado.
- Transferencia desde centro ajeno → 403; como coordinador → salida y entrada con el mismo `grupoTransferencia`.
- Concurrencia: 13 entregas paralelas con stock suficiente → 13×201; 8 entregas con stock para 4 → 4×201 + 4×422; stock final 0, nunca negativo.
- CSV: `Content-Type: text/csv`, `Content-Disposition: attachment`, BOM presente, filtros por tipo y fechas aplicados.
- Todas las páginas por rol responden 200; cabeceras de seguridad presentes.
- Usuarios: alta sin centro → 422 con mensaje; con centro → 201 y correo en minúsculas; duplicado → 409; cambio a INSTITUCION sin institución → 422; desactivar → 200 y su sesión previa responde 401 al instante; login desactivado → 401; auto-desactivarse → 422; encargado editando usuarios → 403.
- `npm run typecheck`, `npm run lint` y `npm run build` limpios.

## 6. Archivos

**Nuevos:** `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `src/lib/csv.ts`, `src/lib/ratelimit.ts`, `src/components/MetasCampana.tsx`,
`src/app/api/movimientos/export/route.ts`, `src/app/api/stock/export/route.ts`,
`src/app/api/campanas/[id]/metas/route.ts`, `src/app/api/usuarios/[id]/route.ts`, `src/components/UsuariosAdmin.tsx`,
`prisma/migrations/*_metas_campana/`, este reporte.

**Modificados:** `prisma/schema.prisma`, `prisma/seed.ts`, `next.config.mjs`, `src/middleware.ts`,
`src/lib/{session,auth,stock,movimientos,validation,api,password}.ts`,
`src/app/api/auth/login/route.ts`, `src/app/api/{movimientos,stock,usuarios}/route.ts`,
`src/app/api/{campanas,centros}/[id]/route.ts`, `src/app/login/page.tsx`,
`src/app/(app)/{movimientos,usuarios,campanas/[id],centros/[id]}/page.tsx`, `src/app/(app)/dashboard/_components.tsx`,
`src/components/{ui,NavBar}.tsx`, `CLAUDE.md`, `README.md`.

## 7. Pendientes sugeridos (fuera de alcance)

- Construir la imagen en una máquina con Docker (`docker compose up --build`) antes de la demo.
- Rate limit distribuido (Redis) si se despliega en más de una instancia.
- Endpoint para que el líder gestione centros participantes desde la UI (el API `PATCH` ya acepta `centroIds`).
- Pruebas automatizadas (no hay framework configurado); el script de la batería manual quedó fuera del repo.
