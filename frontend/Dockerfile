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

# Create nginx config template directory and file
RUN mkdir -p /etc/nginx/templates && \
    echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Proxy API requests to backend \
    location /api { \
        proxy_pass $BACKEND_URL; \
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
        proxy_pass $BACKEND_URL/api/simulations; \
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
        proxy_pass $BACKEND_URL/health; \
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
ENV BACKEND_URL=""

# Expose port
EXPOSE 80

# Create startup script that validates BACKEND_URL and generates nginx config
RUN echo '#!/bin/sh' > /start-nginx.sh && \
    echo 'set -e' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Debug: Print all environment variables starting with BACKEND' >> /start-nginx.sh && \
    echo 'echo "=== Environment Debug ==="' >> /start-nginx.sh && \
    echo 'env | grep -i backend || echo "No BACKEND variables found"' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Export BACKEND_URL to ensure it is available' >> /start-nginx.sh && \
    echo 'export BACKEND_URL="${BACKEND_URL:-}"' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Validate BACKEND_URL' >> /start-nginx.sh && \
    echo 'if [ -z "$BACKEND_URL" ] || [ "$BACKEND_URL" = "" ]; then' >> /start-nginx.sh && \
    echo '  echo "ERROR: BACKEND_URL environment variable is not set!"' >> /start-nginx.sh && \
    echo '  echo "Please set BACKEND_URL in Railway environment variables to your backend service URL"' >> /start-nginx.sh && \
    echo '  echo "Example: https://your-backend-service.up.railway.app"' >> /start-nginx.sh && \
    echo '  exit 1' >> /start-nginx.sh && \
    echo 'fi' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo 'echo "Using BACKEND_URL: $BACKEND_URL"' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Normalize BACKEND_URL: ensure it has a protocol prefix' >> /start-nginx.sh && \
    echo 'ORIGINAL_BACKEND_URL="$BACKEND_URL"' >> /start-nginx.sh && \
    echo 'if echo "$BACKEND_URL" | grep -qE "^https?://"; then' >> /start-nginx.sh && \
    echo '  echo "BACKEND_URL already has protocol prefix: $BACKEND_URL"' >> /start-nginx.sh && \
    echo 'else' >> /start-nginx.sh && \
    echo '  echo "Adding https:// prefix to BACKEND_URL (original: $BACKEND_URL)"' >> /start-nginx.sh && \
    echo '  export BACKEND_URL="https://$BACKEND_URL"' >> /start-nginx.sh && \
    echo '  echo "Normalized BACKEND_URL: $BACKEND_URL"' >> /start-nginx.sh && \
    echo 'fi' >> /start-nginx.sh && \
    echo 'echo "Final BACKEND_URL for nginx config: $BACKEND_URL"' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Generate nginx config with substituted BACKEND_URL' >> /start-nginx.sh && \
    echo '# envsubst replaces $VARIABLE or ${VARIABLE} in the template' >> /start-nginx.sh && \
    echo 'envsubst '"'"'$BACKEND_URL'"'"' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Debug: Show generated config (showing proxy_pass lines)' >> /start-nginx.sh && \
    echo 'echo "=== Generated nginx config (proxy_pass directives) ==="' >> /start-nginx.sh && \
    echo 'grep -n "proxy_pass" /etc/nginx/conf.d/default.conf || echo "No proxy_pass found"' >> /start-nginx.sh && \
    echo 'echo "=== Full generated nginx config ==="' >> /start-nginx.sh && \
    echo 'cat /etc/nginx/conf.d/default.conf' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Validate generated config' >> /start-nginx.sh && \
    echo 'echo "=== Validating nginx config ==="' >> /start-nginx.sh && \
    echo 'nginx -t' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Start nginx' >> /start-nginx.sh && \
    echo 'echo "=== Starting nginx ==="' >> /start-nginx.sh && \
    echo 'exec nginx -g "daemon off;"' >> /start-nginx.sh && \
    chmod +x /start-nginx.sh

CMD ["/start-nginx.sh"]
