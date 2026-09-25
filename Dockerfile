# Multi-stage build for SongSync (Client + Server)
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --legacy-peer-deps
COPY client/ ./
RUN npx expo export -p web

FROM node:20-alpine AS runner
WORKDIR /app
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production
COPY server/ ./
COPY --from=client-builder /app/client/dist /app/client/dist

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/index.js"]
