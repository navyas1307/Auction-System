# Stage 1 — Build frontend
FROM node:18 AS build-frontend

# Set working directory
WORKDIR /app

# Copy frontend files
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend ./frontend

# IMPORTANT: Pass build arguments for React environment variables
ARG REACT_APP_SUPABASE_URL
ARG REACT_APP_SUPABASE_ANON_KEY

# Set environment variables for React build
ENV REACT_APP_SUPABASE_URL=$REACT_APP_SUPABASE_URL
ENV REACT_APP_SUPABASE_ANON_KEY=$REACT_APP_SUPABASE_ANON_KEY

# Build React app with environment variables
RUN cd frontend && npm run build

# Stage 2 — Build backend with frontend static files
FROM node:18

WORKDIR /app

# Copy backend package.json and install dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy backend source
COPY backend ./backend

# Copy built frontend files into backend's public folder
COPY --from=build-frontend /app/frontend/build ./backend/public

# Expose port (Render will map this automatically)
EXPOSE 5000

# Set environment variables (Render lets you override these)
ENV NODE_ENV=production
ENV PORT=5000

# Start backend
WORKDIR /app/backend
CMD ["node", "server.js"]
