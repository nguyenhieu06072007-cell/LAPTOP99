const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const { uploadRoot } = require('./middlewares/upload');
const { errorHandler, notFound } = require('./middlewares/error');

const app = express();
app.set('trust proxy', env.TRUST_PROXY);

// crossOriginResourcePolicy: cho phép frontend ở origin khác hiển thị ảnh /uploads
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    // Cho phép không có origin (file://, curl, mobile) hoặc trong môi trường dev
    if (!origin || origin === 'null') return callback(null, true);
    if (env.NODE_ENV !== 'production') return callback(null, true);
    if (env.CORS_ORIGINS.includes(origin)) return callback(null, true);
    return callback(null, true);
  },
  credentials: false,
}));
app.use(express.json({ limit: '1mb' }));
if (env.NODE_ENV !== 'test') app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/uploads', express.static(uploadRoot, { maxAge: '7d', index: false }));

app.get('/', (req, res) => {
  res.json({
    name: 'Laptop Shop Backend API Server',
    status: 'online',
    health: '/health',
    client_api: '/api/client/products',
    admin_api: '/api/admin'
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/admin/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Quá nhiều lần thử đăng nhập, vui lòng thử lại sau' } },
}));
app.use('/api/admin', require('./routes'));
app.use('/api/client', require('./routes/client.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
