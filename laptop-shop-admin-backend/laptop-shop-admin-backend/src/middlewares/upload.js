const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const { ApiError } = require('../utils/helpers');

const uploadRoot = path.resolve(env.UPLOAD_DIR);
const productDir = path.join(uploadRoot, 'products');
const bannerDir = path.join(uploadRoot, 'banners');
fs.mkdirSync(productDir, { recursive: true });
fs.mkdirSync(bannerDir, { recursive: true });

const EXT = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, productDir),
  filename: (req, file, cb) =>
    cb(null, `${req.productSlug || 'product'}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${EXT[file.mimetype] || '.jpg'}`),
});

const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, bannerDir),
  filename: (req, file, cb) =>
    cb(null, `banner-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${EXT[file.mimetype] || path.extname(file.originalname) || '.jpg'}`),
});

const productImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new ApiError(400, 'Chỉ chấp nhận ảnh JPG, PNG, WEBP')),
}).any();

const bannerImage = multer({
  storage: bannerStorage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new ApiError(400, 'Chỉ chấp nhận tệp hình ảnh (JPG, PNG, WEBP, GIF, SVG)')),
}).single('image');

/** Kiểm tra chữ ký (magic bytes) vì mimetype do client tự khai báo. */
function looksLikeImage(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    fd = undefined;
    if (bytesRead < 4) return false;
    const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const png = buf.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const webp = buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
    const gif = buf.slice(0, 3).toString() === 'GIF';
    const svg = buf.toString().trim().startsWith('<svg') || buf.toString().trim().startsWith('<?xml');
    return Boolean(jpeg || png || webp || gif || svg);
  } catch (err) {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch (e) {}
    }
    return false;
  }
}

/** Xoá file vật lý (chỉ trong thư mục upload); lỗi được bỏ qua. */
function removeFiles(paths) {
  for (const p of paths) {
    const abs = path.resolve(p);
    if (abs.startsWith(uploadRoot + path.sep)) fs.promises.unlink(abs).catch(() => {});
  }
}

/** "/uploads/products/x.jpg" -> đường dẫn tuyệt đối trên đĩa */
const urlToPath = (url) => path.join(uploadRoot, String(url).replace(/^\/uploads\//, ''));

module.exports = { uploadRoot, productImages, bannerImage, looksLikeImage, removeFiles, urlToPath };

