# Multi-stage build for React frontend

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /build

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./
COPY vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tsconfig.vitest.json vitest.setup.ts ./

# Build for production
RUN npm run build

# Stage 2: Runtime stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /build/dist /usr/share/nginx/html

# Copy nginx configuration for SPA routing
RUN echo 'server {\
    listen 80;\
    server_name localhost;\
    root /usr/share/nginx/html;\
    index index.html;\
    \
    # Handle client-side routing\
    location / {\
        try_files $uri $uri/ /index.html;\
    }\
    \
    # API proxy for development (optional)\
    location /api/ {\
        proxy_pass http://backend:8000/;\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
    }\
    \
    # Security headers\
    add_header X-Frame-Options "SAMEORIGIN" always;\
    add_header X-XSS-Protection "1; mode=block" always;\
    add_header X-Content-Type-Options "nosniff" always;\
    add_header Referrer-Policy "no-referrer-when-downgrade" always;\
    add_header Content-Security-Policy "default-src '\''self'\'' http: https: data: blob: '\''unsafe-inline'\''" always;\
}' > /etc/nginx/conf.d/default.conf

# Create non-root user
RUN adduser -D -u 1000 forge && \
    chown -R forge:forge /usr/share/nginx/html && \
    chown -R forge:forge /var/cache/nginx && \
    chown -R forge:forge /var/log/nginx && \
    chown -R forge:forge /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown forge:forge /var/run/nginx.pid

USER forge

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
