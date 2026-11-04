const { Pool } = require ('pg');
require ('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Inisialisasi struktur tabel esensial jika belum ada
const initDb = async () => {
  try {
    // 1. Tabel pencabutan token (Blacklist Logout)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        revoked_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_revoked_tokens_token ON revoked_tokens(token);
    `);

    // 2. Tabel Audit Log (Sesuai audit-log-specification.md)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        user_id INTEGER,
        role VARCHAR(20),
        attempted_username VARCHAR(100),
        action VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        target_resource VARCHAR(50),
        target_id INTEGER,
        description TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
    `);

    // 3. Kebijakan Retensi 6 Bulan (Otomatis hapus log lebih tua dari 6 bulan)
    await pool.query(`
      DELETE FROM public.audit_logs 
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '6 months';
    `);

    console.log('Inisialisasi tabel esensial (revoked_tokens & audit_logs) berhasil.');
  } catch (err) {
    console.error('Inisialisasi tabel esensial database gagal:', err.message);
  }
};
initDb();

// Jalankan pembersihan retensi log usang setiap 24 jam sekali
setInterval(() => {
  pool.query("DELETE FROM public.audit_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '6 months'")
    .catch((err) => console.error('Pembersihan retensi audit log berkala gagal:', err.message));
}, 24 * 60 * 60 * 1000);

pool.on('connect', () => {
  console.log('Terhubung ke database PostgreSQL lokal');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};