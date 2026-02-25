FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY web/package*.json web/
RUN npm ci

COPY web web
RUN npm --workspace web run build

FROM node:22-alpine AS runtime
WORKDIR /app

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY package*.json ./
COPY web/package*.json web/
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/web ./web

USER nextjs
EXPOSE 3000
CMD ["npm", "--workspace", "web", "run", "start"]
