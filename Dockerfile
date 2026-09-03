# syntax=docker/dockerfile:1
# Imagen de la app (Next.js standalone). Ver docker-compose.yml para BD + migraciones.

FROM node:20-bookworm-slim AS base
# Prisma necesita libssl en tiempo de ejecución.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ── deps: node_modules completo (incluye prisma CLI y tsx para migrar/sembrar) ──
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── builder: genera el client de Prisma y compila Next en modo standalone ──
FROM deps AS builder
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runner: solo lo necesario para servir, sin devDependencies ni código fuente ──
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN groupadd -r app && useradd -r -g app app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
# El motor de Prisma se copia explícito por si el trazado de Next lo omite.
COPY --from=builder --chown=app:app /app/node_modules/.prisma ./node_modules/.prisma
USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
