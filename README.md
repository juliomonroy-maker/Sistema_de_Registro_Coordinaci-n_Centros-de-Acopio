# SRCCA — Sistema de Registro y Coordinación de Centros de Acopio

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

## Con Docker (recomendado para demo y para verlo desde otra computadora)

Requiere Docker Desktop (incluye Compose). No hace falta Node ni Postgres instalados.

```bash
cp .env.example .env         # define AUTH_SECRET (min 32 chars) y deja COOKIE_SECURE=false
docker compose up --build    # levanta Postgres, aplica migraciones, siembra datos y arranca la app
```

- App en `http://localhost:3000`. Desde otra computadora de la misma red: `http://<IP-del-host>:3000`
  (la IP sale con `ipconfig` en Windows o `ifconfig | grep inet` en macOS/Linux).
- Los datos persisten en el volumen `pgdata`. Reinicio limpio: `docker compose down -v`.
- Parar: `docker compose down`. Volver a arrancar sin reconstruir: `docker compose up`.
- Cambiar puerto publicado: `APP_PORT=8080 docker compose up`.
- `COOKIE_SECURE=false` permite iniciar sesión por HTTP plano en la red local. Si se sirve
  detrás de HTTPS (túnel, proxy), quítalo del `.env` para que la cookie vuelva a ser `Secure`.

Estructura: `Dockerfile` multi-etapa (build standalone de Next, imagen final sin código fuente ni
devDependencies, usuario sin privilegios, healthcheck) y `docker-compose.yml` con tres servicios:
`db` (Postgres 16), `migrate` (corre `prisma migrate deploy` + seed y termina) y `app`, que solo
arranca cuando `migrate` terminó bien.

### Sin Docker, desde otra computadora

`npm run dev` escucha en todas las interfaces; Next imprime la URL de red al arrancar
(`Network: http://192.168.x.x:3000`). Sirve mientras esta máquina esté encendida y el
firewall permita el puerto.

## Usuarios de ejemplo (tras el seed)

| Rol                  | Email                   | Contraseña   |
|----------------------|-------------------------|--------------|
| Coordinador general  | coordinador@acopio.mx   | password123  |
| Encargado de centro  | encargado@acopio.mx     | password123  |
| Voluntario           | voluntario@acopio.mx    | password123  |
| Institución receptora| institucion@acopio.mx   | password123  |
| Líder de campaña     | lider@acopio.mx         | password123  |
| Voluntario pendiente | voluntario.pendiente@acopio.mx | password123 (no puede entrar hasta ser aprobado) |

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

## Documentación

Toda la documentación vive en [`docs/`](docs/README.md):

- [docs/ESPECIFICACION.md](docs/ESPECIFICACION.md) — especificación funcional del reto (fuente de verdad).
- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) — cómo está construido y por qué.
- [docs/API.md](docs/API.md) — referencia de cada endpoint.
- [docs/MANUAL_USUARIO.md](docs/MANUAL_USUARIO.md) — qué hace cada rol, con guion de demo.
- [docs/reportes/](docs/reportes/) — un reporte fechado por cada tanda de cambios.

## Módulos

- **Centros** — registro y ficha de cada centro de acopio (coordinador los da de alta).
- **Campañas** — contingencias; agrupan centros participantes (líder de campaña las gestiona).
- **Movimientos** — ledger único: recepción, entrega, merma, transferencia y ajuste. El stock se **deriva** de los movimientos; nunca se edita a mano.
- **Instituciones receptoras** — reciben entregas canalizadas y las confirman.
- **Dashboards por rol** — global (coordinador), por centro (encargado/voluntario), por campaña (líder), entregas (institución).
- **Metas por campaña** — objetivo de recolección por artículo (`MetaCampana`); el avance se deriva de las recepciones del ledger y se muestra con barras de progreso en la campaña y en los dashboards de coordinador y líder.
- **Exportación CSV** — `GET /api/movimientos/export` (ledger completo con filtros `centroId`, `campanaId`, `tipo`, `estado`, `desde`, `hasta`) y `GET /api/stock/export` (inventario derivado). Mismo alcance por rol que las pantallas; UTF-8 con BOM para Excel.
- **Mapa de centros** — `/mapa` con Leaflet + OpenStreetMap (sin API key): marcadores por centro con existencia total; mini-mapa en la ficha del centro; selector por clic al dar de alta un centro. La pantalla de **inicio de sesión** muestra a la izquierda el mapa público de puntos de donación (solo nombre y dirección). El seed incluye 14 centros reales de **Tampico, Tamaulipas**.
- **Gráficas** — en cada dashboard: actividad diaria (recibido/entregado/merma, 30 días), stock por categoría, top artículos, recibido por centro, avance de metas y comparativa por campaña. Todo derivado del ledger.
- **Aprobación de merma** — el encargado *solicita* la merma (queda `PENDIENTE`, no descuenta stock); el coordinador la aprueba o rechaza en `/aprobaciones`. Solo las mermas aprobadas afectan el stock.
- **Aprobación de voluntarios** — registro público en `/registro`; la cuenta queda `PENDIENTE` y no puede iniciar sesión hasta que el encargado de su centro o el coordinador la apruebe.

## Reglas clave (spec)

- Stock = suma de movimientos con signo; corrección solo vía movimiento de **ajuste** (con motivo).
- **Merma** y **ajuste** requieren motivo obligatorio. La merma del encargado necesita aprobación del coordinador; solo los movimientos `APROBADO` suman al stock.
- **Transferencia** = dos movimientos ligados (salida + entrada) en una transacción atómica.
- Un movimiento solo se admite si el centro está **activo**, la campaña **activa** y el centro **participa** en la campaña.
- Las salidas concurrentes sobre una misma línea de stock se serializan con un lock consultivo de Postgres: el stock nunca queda negativo.

## Seguridad

- Sesión JWT en cookie httpOnly; rol, centro e institución se releen de la BD en cada request (desactivar una cuenta la saca de inmediato).
- Login con respuesta de tiempo constante (sin enumeración de correos) y límite de 10 intentos / 15 min por IP+correo.
- Autorización por recurso (anti-IDOR): detalle de centro solo para coordinador o miembros; detalle/metas de campaña solo para coordinador o su líder; listados y CSV acotados por rol en `alcanceMovimientos` / `alcanceStock`.
- Cabeceras `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`; CSV con protección contra inyección de fórmulas.
- Todo movimiento guarda **actor** y **fecha** (trazabilidad).
- El **voluntario** solo registra recepciones y entregas.
- El **donante** no tiene cuenta; sus datos son opcionales (puede ser anónimo).

