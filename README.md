# Sistema de Registro y Coordinación de Centros de Acopio

App web para registrar centros de acopio, llevar su inventario, capturar donaciones, publicar necesidades y coordinar transferencias de insumos entre centros.

## Stack

- **Next.js 15** (App Router, React 19, TypeScript)
- **PostgreSQL** + **Prisma** ORM
- **Tailwind CSS**
- Autenticación propia con **JWT** en cookie httpOnly (`jose` + `bcryptjs`), con roles.

## Requisitos

- Node.js 18+ (probado con Node 24)
- Una base de datos PostgreSQL accesible

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar entorno
cp .env.example .env
#   edita DATABASE_URL y AUTH_SECRET (min 32 chars)

# 3. Crear el esquema en la base de datos
npm run db:migrate      # crea las tablas (modo dev)
# o, sin migraciones:   npm run db:push

# 4. Cargar datos de ejemplo
npm run db:seed

# 5. Levantar en desarrollo
npm run dev             # http://localhost:3000
```

## Usuarios de ejemplo (tras el seed)

| Rol         | Email                   | Contraseña   |
|-------------|-------------------------|--------------|
| ADMIN       | admin@acopio.mx         | password123  |
| COORDINADOR | coordinador@acopio.mx   | password123  |
| VOLUNTARIO  | voluntario@acopio.mx    | password123  |

## Scripts

| Script              | Descripción                              |
|---------------------|------------------------------------------|
| `npm run dev`       | Servidor de desarrollo                   |
| `npm run build`     | Build de producción                      |
| `npm start`         | Servir el build                          |
| `npm run lint`      | ESLint                                   |
| `npm run typecheck` | Verificación de tipos (tsc)              |
| `npm run db:migrate`| Crear/aplicar migraciones (dev)          |
| `npm run db:push`   | Sincronizar esquema sin migración        |
| `npm run db:seed`   | Cargar datos de ejemplo                  |
| `npm run db:studio` | Explorar la BD con Prisma Studio         |
| `npm run db:reset`  | Reiniciar la BD y re-sembrar             |

## Módulos

- **Centros** — registro y ficha de cada centro de acopio.
- **Inventario** — existencias por centro e insumo (se actualiza solo con donaciones/transferencias).
- **Donaciones** — entradas de insumos; suman al inventario del centro.
- **Necesidades** — insumos que requiere cada centro, con prioridad.
- **Transferencias** — envío de insumos entre centros; al completarse mueve el inventario.
# Sistema_de_Registro_Coordinaci-n_Centros-de-Acopio
