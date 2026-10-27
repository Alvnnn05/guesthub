# ==========================================
# TAHAP 1: Build React Vite Aplikasi (Node.js 24)
# ==========================================
FROM node:24-alpine AS build-stage

WORKDIR /app

# Salin manifest dependensi
COPY package*.json ./

# Install seluruh dependensi untuk proses build
RUN npm ci

# Salin source code frontend
COPY . .

# Set environment variabel build: API mengarah ke path relatif /api
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Jalankan build production Vite
RUN npm run build

# ==========================================
# TAHAP 2: Sajikan via Web Server Nginx
# ==========================================
FROM nginx:alpine

# Salin konfigurasi kustom Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Salin hasil build React dari tahap 1 ke direktori publik Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Expose port HTTP default (80)
EXPOSE 80

# Jalankan Nginx di foreground
CMD ["nginx", "-g", "daemon off;"]
