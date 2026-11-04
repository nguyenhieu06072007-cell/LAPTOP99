require('dotenv').config();

const e = process.env;
module.exports = {
  NODE_ENV: e.NODE_ENV || 'development',
  PORT: Number(e.PORT) || 4000,
  DB_HOST: e.DB_HOST || 'localhost',
  DB_PORT: Number(e.DB_PORT) || 3306,
  DB_USER: e.DB_USER || 'root',
  DB_PASSWORD: e.DB_PASSWORD || '',
  DB_NAME: e.DB_NAME || 'laptop_shop',
  JWT_SECRET: e.JWT_SECRET || '',
  JWT_EXPIRES_IN: e.JWT_EXPIRES_IN || '8h',
  MAX_FAILED_LOGINS: Number(e.MAX_FAILED_LOGINS) || 5,
  LOCK_MINUTES: Number(e.LOCK_MINUTES) || 15,
  CORS_ORIGINS: (e.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  UPLOAD_DIR: e.UPLOAD_DIR || 'uploads',
  TRUST_PROXY: Number(e.TRUST_PROXY) || 0,
  AI_PROVIDER: e.AI_PROVIDER || 'gemini',
  GEMINI_API_KEY: e.GEMINI_API_KEY || '',
  GEMINI_MODEL: e.GEMINI_MODEL || 'gemini-1.5-flash',
  OPENAI_API_KEY: e.OPENAI_API_KEY || '',
  OPENAI_MODEL: e.OPENAI_MODEL || 'gpt-4o-mini',
};
