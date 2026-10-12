# Gunakan Node.js LTS versi Alpine yang ringan dan aman
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Salin package.json dan package-lock.json terlebih dahulu untuk memanfaatkan caching Docker layer
COPY package*.json ./

# Install dependensi hanya untuk production
RUN npm ci --omit=dev

# Salin seluruh kode backend
COPY . .

# Buat folder uploads jika belum ada
RUN mkdir -p uploads

# Expose port backend (5000)
EXPOSE 5000

# Jalankan server aplikasi
CMD ["node", "index.js"]
