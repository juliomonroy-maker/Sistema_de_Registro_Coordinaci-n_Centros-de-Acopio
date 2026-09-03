# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm run dev            # desarrollo (http://localhost:3000)
npm run build          # build de producción (corre lint + typecheck)
npm run typecheck      # solo tipos: tsc --noEmit
npm run lint           # ESLint (next lint)

npm run db:migrate     # crear/aplicar migración en dev (tras editar schema.prisma)
npm run db:push        # sincronizar esquema sin migración (prototipado)
npm run db:seed        # sembrar datos de ejemplo (prisma/seed.ts)
npm run db:reset       # reset + re-seed (destruye datos)
npm run db:studio      # Prisma Studio
```

Tras cambiar `prisma/schema.prisma` SIEMPRE correr `npm run db:generate` (o `db:migrate`, que lo incluye) para regenerar el client tipado; si no, los tipos de `@prisma/client` quedan desfasados.

No hay framework de tests configurado todavía.

### Entorno sandbox

`npm install` en este entorno bloquea los install-scripts (allow-scripts), por lo que el postinstall de Prisma no corre. Tras instalar, ejecutar `npx prisma generate` manualmente para generar el client. `tsx` (usado por el seed) depende de esbuild, cuyo postinstall también puede quedar bloqueado.

## Arquitectura

Next.js 15 App Router, full-stack en un solo proyecto. No hay SPA aparte: las páginas son Server Components que leen de Prisma directamente; las mutaciones van por rutas API REST bajo `src/app/api/**`.

### Autenticación y autorización (clave)

Auth propia, NO NextAuth. Flujo:

- `src/lib/session.ts` — firma/verifica un JWT (`jose`, HS256) guardado en cookie httpOnly `acopio_session`. `getSession()` lee la sesión en Server Components y rutas API. Requiere `AUTH_SECRET` (min 32 chars).
- `src/middleware.ts` — corre en el Edge, reverifica el JWT y protege TODO salvo `/login` y `/api/auth/login`. Páginas sin sesión → redirect a `/login`; API sin sesión → 401 JSON. El matcher excluye assets estáticos.
- `src/lib/auth.ts` — `requireUser()` y `requireRole(...roles)` para usar DENTRO de cada ruta API. El middleware solo valida que HAY sesión; la comprobación de ROL se hace por ruta con `requireRole`. Lanzan `AuthError(status)`.

Roles (`enum Rol`): `ADMIN`, `COORDINADOR`, `VOLUNTARIO`. Regla general: crear/editar centros e insumos y cambiar estado de transferencias exige ADMIN/COORDINADOR; registrar donaciones y necesidades lo puede hacer cualquier usuario autenticado; borrar centros es solo ADMIN.

### Patrón de rutas API

Cada `route.ts` sigue: `try { await requireUser()/requireRole(...); const data = schema.parse(await req.json()); ...prisma...; return ok(data) } catch (err) { return handleError(err) }`.

- `src/lib/api.ts` — `ok()`, `fail()`, y `handleError()` que traduce `ZodError` (422), `AuthError` (401/403) y errores Prisma (P2002→409, P2025→404, P2003→422) a JSON consistente. Usar SIEMPRE `handleError` en el catch.
- `src/lib/validation.ts` — todos los esquemas Zod de entrada viven aquí, uno por operación.

### Inventario: nunca se edita a mano

`Inventario` (cantidad por `centroId`+`insumoId`) es un valor DERIVADO. Solo se modifica vía `ajustarInventario(tx, centroId, insumoId, delta)` en `src/lib/inventario.ts`, y SIEMPRE dentro de una transacción Prisma (`prisma.$transaction`). Valida que el stock no quede negativo.

- **Donación** (`POST /api/donaciones`): crea la donación y SUMA cada item al inventario del centro, en una transacción.
- **Transferencia** (`PATCH /api/transferencias/[id]`): al pasar a `COMPLETADA` RESTA del origen y SUMA al destino cada item, en una transacción. Las transiciones de estado están restringidas por la tabla `TRANSICIONES` (máquina de estados: SOLICITADA→APROBADA→EN_TRANSITO→COMPLETADA, con CANCELADA como salida). No saltarse este mecanismo al añadir features.

### Modelo de datos

Ver `prisma/schema.prisma`. Entidades: `Usuario`, `Centro`, `Categoria`→`Insumo`, `Inventario`, `Donacion`+`DonacionItem`, `Necesidad`, `Transferencia`+`TransferenciaItem`. Insumo es único por (`nombre`,`categoriaId`); Inventario es único por (`centroId`,`insumoId`). Los borrados usan `Cascade` para hijos (items) y `Restrict` sobre catálogos (`Insumo`, `Centro` en transferencias) para no perder trazabilidad.

### Frontend

- `src/app/(app)/` — grupo de rutas protegidas; su `layout.tsx` valida sesión y monta `NavBar`. Páginas de listado/detalle son Server Components que consultan Prisma directo (`export const dynamic = "force-dynamic"`).
- Formularios (`/login`, `/centros/nuevo`) son Client Components que llaman al API con `src/lib/fetcher.ts` (`api()`, que lanza `Error` con el mensaje del backend).
- `@/*` mapea a `src/*` (ver tsconfig).

## Datos de ejemplo

`npm run db:seed` crea 3 usuarios (admin/coordinador/voluntario, pass `password123`), categorías, insumos, 2 centros e inventario/necesidades/donación de muestra.
