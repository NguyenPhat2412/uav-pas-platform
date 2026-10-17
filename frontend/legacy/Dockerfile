
FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci


FROM node:22-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" npm run build

FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]