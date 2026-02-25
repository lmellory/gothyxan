FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY backend/package*.json backend/
RUN npm ci

COPY backend backend
RUN npm --workspace backend run prisma:generate && npm --workspace backend run build

FROM node:22-alpine AS runtime
WORKDIR /app

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY package*.json ./
COPY backend/package*.json backend/
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend ./backend

USER nestjs
EXPOSE 4000
CMD ["sh", "-c", "cd backend && npx prisma db push && npm run start:prod"]
