const env = require('./config/env');

if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
  console.error('Thieu JWT_SECRET hoac qua ngan (can >= 32 ky tu). Hay cau hinh trong file .env');
  process.exit(1);
}

const app = require('./app');
const { pool } = require('./config/db');

(async () => {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.error('Khong ket noi duoc MySQL:', err.message);
    process.exit(1);
  }
  const server = app.listen(env.PORT, () => {
    console.log(`[pk6h] Laptop Shop Server running on http://localhost:${env.PORT}`);
    console.log(`   - Client API: http://localhost:${env.PORT}/api/client`);
    console.log(`   - Admin API:  http://localhost:${env.PORT}/api/admin`);

    // Keep-alive: ping /health every 14 minutes to prevent Render free tier sleep
    if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
      const pingUrl = `${process.env.RENDER_EXTERNAL_URL}/health`;
      setInterval(async () => {
        try {
          const res = await fetch(pingUrl);
          console.log(`[keep-alive] ping -> ${res.status}`);
        } catch (e) {
          console.warn('[keep-alive] ping failed:', e.message);
        }
      }, 14 * 60 * 1000);
    }
  });

  const shutdown = () => server.close(async () => { await pool.end(); process.exit(0); });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
