# Gunakan Node.js LTS versi Alpine yang ringan dan aman (Node.js 24)
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Salin package.json dan package-lock.json terlebih dahulu untuk memanfaatkan caching Docker layer
COPY package*.json ./

# Install dependensi hanya untuk production
RUN npm ci --omit=dev

# Salin seluruh kode backend
COPY . .

# Buat folder uploads jika belum ada dan berikan kepemilikan ke user non-root 'node'
RUN mkdir -p uploads && chown -R node:node /app

# Beralih ke user non-root 'node' untuk keamanan (CIS Docker Benchmark)
USER node

# Expose port backend (5000)
EXPOSE 5000

# Jalankan server aplikasi
CMD ["node", "index.js"]
