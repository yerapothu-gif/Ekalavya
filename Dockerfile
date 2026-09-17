# Step 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Step 2: Production Server
FROM node:20-alpine AS runner
WORKDIR /app

# Copy Backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production
COPY backend/ ./backend/

# Copy built frontend static files to backend public dir (if serving statically)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 4000
ENV NODE_ENV=production

CMD ["node", "backend/src/server.js"]
