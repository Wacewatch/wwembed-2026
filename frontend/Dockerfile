FROM node:22-alpine AS builder
WORKDIR /app
# Layer corepack — caché tant que l'image de base ne change pas
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Layer deps — caché tant que package.json + lockfile ne changent pas
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --no-frozen-lockfile

# Layer build — seulement invalidé si le code source change
COPY . .

ARG JWT_SECRET
ARG MONGO_URL
ARG TMDB_API_KEY
ENV JWT_SECRET=${JWT_SECRET}
ENV MONGO_URL=${MONGO_URL}
ENV TMDB_API_KEY=${TMDB_API_KEY}

RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
