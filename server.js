const env = require('./config/env');

if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
  console.error('Thiếu JWT_SECRET hoặc quá ngắn (cần >= 32 ký tự). Hãy cấu hình trong file .env');
  process.exit(1);
}

const app = require('./app');
const { pool } = require('./config/db');

(async () => {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.error('Không kết nối được MySQL:', err.message);
    process.exit(1);
  }
  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Laptop Shop Server running on http://localhost:${env.PORT}`);
    console.log(`   - Client API: http://localhost:${env.PORT}/api/client`);
    console.log(`   - Admin API:  http://localhost:${env.PORT}/api/admin`);
  });

  const shutdown = () => server.close(async () => { await pool.end(); process.exit(0); });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
