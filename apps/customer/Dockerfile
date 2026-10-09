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
RUN npm run build --workspace=@uav/customer

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3101
COPY --from=builder /app/apps/customer/public ./apps/customer/public
COPY --from=builder /app/apps/customer/.next/standalone ./
COPY --from=builder /app/apps/customer/.next/static ./apps/customer/.next/static
EXPOSE 3101
CMD ["node", "apps/customer/server.js"]
