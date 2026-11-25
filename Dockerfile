# =========================================================
# Dev stage – Vite dev server con HMR
# =========================================================
FROM node:22-alpine AS dev

WORKDIR /app

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate

# Instalar todas las dependencias (dev + prod)
# --ignore-scripts: no ejecuta build scripts (esbuild, msw)
# Los scripts no son necesarios en dev porque Vite maneja bundling.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copiar fuente completa
COPY . .

EXPOSE 5173

# Vite dev server con host 0.0.0.0 para Docker
CMD ["pnpm", "dev", "--", "--host", "0.0.0.0"]

# ---- Production stage – multi-stage build ----
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate

COPY package.json pnpm-lock.yaml ./.npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-alpine AS production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate

COPY package.json ./.npmrc ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 4173
USER node
CMD ["node", "dist/server/entry.mjs"]