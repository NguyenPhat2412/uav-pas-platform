FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci --ignore-scripts

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=@uav/operations

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3102
COPY --from=builder /app/apps/operations/public ./apps/operations/public
COPY --from=builder /app/apps/operations/.next/standalone ./
COPY --from=builder /app/apps/operations/.next/static ./apps/operations/.next/static
EXPOSE 3102
CMD ["node", "apps/operations/server.js"]
