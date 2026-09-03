# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

La especificación funcional vive en `INSTRUCCIONES_PROYECTO.md` (reto de hackatón). Es la fuente de verdad para roles, modelo de datos y reglas; alinéate a ella.

## Comandos

```bash
npm run dev            # desarrollo (http://localhost:3000)
npm run build          # build de producción (corre lint + typecheck)
npm run typecheck      # solo tipos: tsc --noEmit
npm run lint           # ESLint

npm run db:migrate     # crear/aplicar migración en dev (tras editar schema.prisma)
npm run db:push        # sincronizar esquema sin migración
npm run db:seed        # sembrar datos de ejemplo (prisma/seed.ts)
npm run db:reset       # reset + re-seed (destruye datos)
npm run db:studio      # Prisma Studio
```

Tras cambiar `prisma/schema.prisma` SIEMPRE `npm run db:generate` (o `db:migrate`, que lo incluye). Si un servidor `next dev` quedó corriendo con un client Prisma viejo, sus queries fallan con 500 → reinícialo tras regenerar.

```bash
docker compose up --build   # Postgres + migrate/seed + app (http://localhost:3000). Requiere .env con AUTH_SECRET
docker compose down -v      # parar y borrar datos
```

`next.config.mjs` usa `output: "standalone"`; el `Dockerfile` copia `.next/standalone`, `.next/static` y `node_modules/.prisma`. Cookie de sesión: `COOKIE_SECURE=false` en `.env` para demo por HTTP en red local (compose lo pasa; por defecto en producción es `Secure`).

No hay framework de tests configurado.

### Entorno sandbox

`npm install` bloquea install-scripts (allow-scripts); tras instalar correr `npx prisma generate`. `prisma migrate reset` es destructivo y pide la variable `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` en entornos no interactivos.

## Arquitectura

Next.js 15 App Router, full-stack. Páginas = Server Components que leen Prisma directo; mutaciones por rutas API REST bajo `src/app/api/**`. Auth propia (JWT en cookie, `jose`), no NextAuth.

### El concepto central: ledger de Movimientos + stock derivado

NO existe una tabla de inventario editable. El stock se CALCULA sumando `Movimiento` según el signo de su tipo:

```
+ : RECEPCION, TRANSFERENCIA_ENTRADA, AJUSTE(signoPositivo=true)
− : ENTREGA, MERMA, TRANSFERENCIA_SALIDA, AJUSTE(signoPositivo=false)
```

- `src/lib/stock.ts` — `signoDeMovimiento()`, `calcularStock({centroId?, campanaId?, campanaIds?})` (agregación `groupBy` en BD), `stockDisponible(...)`, `totalesPorCampana()` (fila agregada por campaña para el panel global; 4 agregaciones fijas, no una por campaña) y `progresoMetas(campanaId)` (avance de `MetaCampana` = suma de RECEPCION vs objetivo). Toda pantalla/endpoint de stock deriva de aquí; nunca se guarda un número de stock.
- `src/lib/movimientos.ts` — `registrarMovimiento()` (recepción/entrega/merma/ajuste) y `registrarTransferencia()`. Ambos corren en `prisma.$transaction`; validan centro activo + campaña activa + centro participante (`validarContexto`). Las salidas toman un lock consultivo `pg_advisory_xact_lock` sobre la línea centro+campaña+artículo antes de validar stock (`MovimientoError` → 422): sin él, salidas concurrentes dejarían stock negativo. Merma y ajuste exigen `motivo` (validado en Zod).
  - `alcanceMovimientos(session, filtros)` / `alcanceStock(session, filtros)` — ÚNICO punto que decide qué movimientos/stock puede VER cada rol. Úsalos en todo listado, página y exportación; no re-implementar filtros por rol en las rutas.
  - **Transferencia = DOS movimientos ligados** (TRANSFERENCIA_SALIDA en origen + TRANSFERENCIA_ENTRADA en destino) con el mismo `grupoTransferencia`, creados atómicamente. No romper esto: mantiene cuadrado el stock global.
  - `autorizarMovimiento(session, tipo, centroId)` centraliza las reglas de rol por tipo (ver abajo).

### Roles y permisos (spec §3)

`enum Rol`: `COORDINADOR`, `ENCARGADO`, `VOLUNTARIO`, `INSTITUCION`, `LIDER_CAMPANA`.

- **COORDINADOR** (general): crea/activa centros, campañas, instituciones, artículos, usuarios; opera cualquier centro; ve todo.
- **ENCARGADO**: solo su centro; cualquier tipo de movimiento.
- **VOLUNTARIO**: solo su centro; SOLO `RECEPCION` y `ENTREGA` (no merma/ajuste/transferencia). Regla en `autorizarMovimiento`.
- **INSTITUCION**: ve solo las entregas con su `institucionId` y las confirma (`PATCH /api/movimientos/[id]/confirmar`).
- **LIDER_CAMPANA** (opcional): dashboard agregado de la campaña que lidera (`liderId`).

El donante NO tiene cuenta; sus datos van en el propio movimiento de RECEPCION (`donanteNombre`/`donanteAnonimo`).

### Auth

- `src/lib/session.ts` — JWT (HS256, `jose`) en cookie httpOnly `acopio_session`. El token solo identifica (`userId`); `getSession()` relee rol/centro/institución/activo de la BD en cada request (con `React.cache`) para que desactivar o reasignar cuentas surta efecto inmediato. Requiere `AUTH_SECRET` (≥32 chars).
- `src/middleware.ts` — reverifica el JWT en el Edge; protege todo salvo `/login` y `/api/auth/login`.
- `src/lib/auth.ts` — `requireUser()` / `requireRole(...)` DENTRO de cada ruta API, y `puedeVerCentro()` / `puedeVerCampana()` / `puedeGestionarCampana()` para acceso por recurso (anti-IDOR). Páginas de detalle deben llamarlos también.
- Login (`/api/auth/login`): compara siempre contra un hash (`HASH_SENUELO`) para no filtrar existencia de cuentas; rate limit en memoria (`src/lib/ratelimit.ts`, 10 intentos/15 min por IP+correo).
- `next.config.mjs` añade cabeceras de seguridad; `/login?next=` solo acepta rutas internas.

### Patrón de rutas API

`try { await requireUser()/requireRole(); const data = schema.parse(await req.json()); …prisma…; return ok() } catch (e) { return handleError(e) }`.
`src/lib/api.ts` traduce `ZodError`→422, `AuthError`→401/403, `MovimientoError`→422, JSON malformado→400, errores Prisma (P2002→409, P2025→404, P2003→422, P2034→409). Los esquemas Zod están en `src/lib/validation.ts` (incluye `movimientosFiltroSchema` + `queryToObject` para query strings).

### Exportación CSV y metas

- `src/lib/csv.ts` — `toCsv()` (RFC 4180, BOM, guard anti-inyección de fórmulas), `csvResponse()`, `nombreCsv()`.
- `GET /api/movimientos/export` y `GET /api/stock/export` — mismos filtros y alcance por rol que sus listados. Botones `BotonCsv` en dashboards, `/movimientos` (con filtros tipo/campaña/fechas) y detalles.
- `MetaCampana` (campaña × artículo → `cantidadObjetivo`). `GET/PUT /api/campanas/[id]/metas` (PUT reemplaza el conjunto; coordinador o líder). UI: `src/components/MetasCampana.tsx` (client) en `/campanas/[id]`; resumen de solo lectura en dashboards.

### Dashboards por rol (spec §7)

`src/app/(app)/dashboard/page.tsx` hace switch por `session.rol` y renderiza el componente de `_components.tsx`: `DashboardCoordinador` (global), `DashboardEncargado`/`DashboardVoluntario` (su centro), `DashboardInstitucion` (+ `EntregasInstitucion` client para confirmar), `DashboardLider` (agregado de su campaña). Los enlaces del `NavBar` también dependen del rol.

### Modelo de datos

`prisma/schema.prisma`: `Usuario`, `Campana`, `Centro`, `CentroCampana` (N:M), `Institucion`, `Articulo` (enums `CategoriaArticulo`/`Unidad`), `Movimiento` (ledger), `MetaCampana` (metas por artículo). El `Movimiento` cuelga de centro+campaña+artículo y guarda `actor` y `fecha` para trazabilidad completa.

### Frontend

- `src/app/(app)/` — grupo protegido; su `layout.tsx` valida sesión y monta `NavBar`. Listas/detalles son Server Components (`export const dynamic = "force-dynamic"`).
- `/usuarios` (solo COORDINADOR): `UsuariosAdmin` (client) crea cuentas y activa/desactiva vía `POST /api/usuarios` y `PATCH /api/usuarios/[id]`. `asignacionCoherente()` en `validation.ts` exige centro para encargado/voluntario e institución para INSTITUCION; el coordinador no puede desactivarse a sí mismo.
- Formularios (`/login`, `/movimientos/nuevo`, `/centros/nuevo`, `/campanas/nueva`) son Client Components que llaman al API con `src/lib/fetcher.ts` (`api()`). `/movimientos/nuevo` adapta sus campos al `tipo` y al rol.
- Helpers UI compartidos en `src/components/ui.tsx`. `@/*` → `src/*`.

## Datos de ejemplo

`npm run db:seed` crea un usuario por rol (pass `password123`): `coordinador@`, `encargado@`, `voluntario@`, `institucion@`, `lider@` (dominio `acopio.mx`), 1 campaña con 3 metas, 2 centros, 5 artículos, instituciones y movimientos de muestra.
