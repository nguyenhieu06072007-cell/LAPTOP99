const { ZodError } = require('zod');
const { ApiError } = require('../utils/helpers');

const DUP_LABELS = { sku: 'SKU', barcode: 'Mã vạch', slug: 'Slug', email: 'Email', name: 'Tên' };

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Dữ liệu không hợp lệ',
        details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { message: err.message, details: err.details } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'JSON không hợp lệ' } });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: { message: `Lỗi upload: ${err.message}` } });
  }

  // Lỗi MySQL thường gặp -> thông báo thân thiện
  switch (err.code) {
    case 'ER_DUP_ENTRY': {
      const m = /for key '(?:[^']*\.)?([^']+)'/.exec(err.sqlMessage || '');
      const key = m ? m[1] : '';
      return res.status(409).json({ error: { message: `${DUP_LABELS[key] || 'Giá trị'} đã tồn tại` } });
    }
    case 'ER_NO_REFERENCED_ROW_2': {
      const m = /FOREIGN KEY \(`(\w+)`\)/.exec(err.sqlMessage || '');
      return res.status(400).json({ error: { message: `Giá trị tham chiếu không tồn tại${m ? ` (${m[1]})` : ''}` } });
    }
    case 'ER_ROW_IS_REFERENCED_2':
      return res.status(409).json({ error: { message: 'Không thể xoá vì dữ liệu đang được sử dụng ở nơi khác' } });
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
    case 'ER_CONSTRAINT_FAILED':
      return res.status(400).json({ error: { message: 'Dữ liệu vi phạm ràng buộc (giá bán, giá khuyến mãi, tồn kho...)' } });
    case 'ER_DATA_TOO_LONG':
    case 'ER_TRUNCATED_WRONG_VALUE':
    case 'ER_WARN_DATA_OUT_OF_RANGE':
      return res.status(400).json({ error: { message: 'Giá trị nhập vào không hợp lệ hoặc quá dài' } });
    default:
  }

  console.error(err);
  return res.status(500).json({
    error: { message: process.env.NODE_ENV === 'production' ? 'Lỗi hệ thống' : err.message },
  });
}

const notFound = (req, res) => res.status(404).json({ error: { message: 'Không tìm thấy endpoint' } });

module.exports = { errorHandler, notFound };
