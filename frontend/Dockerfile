# Frontend Dockerfile - Multi-stage build
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY public/ ./public/
COPY src/ ./src/

# Set build-time environment variable (can be overridden)
ARG REACT_APP_API_URL=http://localhost:3001
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build the React app
RUN npm run build

# Production stage - use nginx to serve static files
FROM nginx:alpine

# Install envsubst for environment variable substitution
RUN apk add --no-cache gettext

# Copy built files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Create nginx config template that will use environment variable substitution
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Proxy API requests to backend \
    location /api { \
        proxy_pass ${BACKEND_URL}; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_cache_bypass $http_upgrade; \
        proxy_read_timeout 300s; \
        proxy_connect_timeout 75s; \
    } \
    \
    # Proxy simulations routes directly (for compatibility with existing frontend code) \
    location /simulations { \
        proxy_pass ${BACKEND_URL}/api/simulations; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_cache_bypass $http_upgrade; \
        proxy_read_timeout 300s; \
        proxy_connect_timeout 75s; \
    } \
    \
    # Health check endpoint (also proxy to backend) \
    location /health { \
        proxy_pass ${BACKEND_URL}/health; \
        proxy_http_version 1.1; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    \
    # SPA routing \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Static assets caching \
    location /static { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/templates/default.conf.template

# Set default backend URL (should be overridden in Railway with backend service URL)
# Format: https://your-backend-service-name.up.railway.app
# Do NOT include /api in the URL - nginx will add it
ENV BACKEND_URL=http://localhost:8080

# Expose port
EXPOSE 80

# Use envsubst to substitute environment variables in nginx config at runtime
CMD ["/bin/sh", "-c", "envsubst '$$BACKEND_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
