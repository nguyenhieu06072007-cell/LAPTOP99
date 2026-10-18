const { z } = require('zod');
const { pool, withTransaction } = require('../config/db');
const { ApiError, asyncHandler, paging, pageMeta, escapeLike, toInt } = require('../utils/helpers');
const { writeAudit } = require('../services/audit');
const ReviewModel = require('../models/review.model');

const ReviewsController = {
  listReviews: asyncHandler(async (req, res) => {
    const q = req.query;
    const { page, limit, offset } = paging(q);
    const where = [];
    const params = [];

    if (q.search) {
      const s = `%${escapeLike(String(q.search).trim())}%`;
      where.push('(r.customer_name LIKE ? OR r.product_name LIKE ? OR r.title LIKE ? OR r.comment LIKE ?)');
      params.push(s, s, s, s);
    }
    if (['customer', 'staff'].includes(q.source)) {
      where.push('r.source = ?'); params.push(q.source);
    }
    if (['pending', 'replied', 'hidden'].includes(q.status)) {
      where.push('r.status = ?'); params.push(q.status);
    }
    if (['positive', 'neutral', 'negative'].includes(q.sentiment)) {
      where.push('r.sentiment = ?'); params.push(q.sentiment);
    }
    const rating = toInt(q.rating);
    if (rating && rating >= 1 && rating <= 5) {
      where.push('r.rating = ?'); params.push(rating);
    }
    if (toInt(q.product_id)) {
      where.push('r.product_id = ?'); params.push(toInt(q.product_id));
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = await ReviewModel.countReviews(whereClause, params);
    const rows = await ReviewModel.findReviews({ whereClause, params, limit, offset });

    res.json({ data: rows, meta: pageMeta(page, limit, total) });
  }),

  replyReview: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const { admin_reply } = z.object({
      admin_reply: z.string().trim().min(1).max(5000),
    }).parse(req.body);

    await withTransaction(async (conn) => {
      const review = await ReviewModel.findReviewById(id);
      if (!review) throw new ApiError(404, 'Không tìm thấy đánh giá');
      if (review.status === 'hidden') throw new ApiError(409, 'Đánh giá đã bị ẩn, không thể trả lời');

      await ReviewModel.updateReply(conn, id, { adminReply: admin_reply, userId: req.user.id });
      await writeAudit(conn, req, {
        action: 'reply', entity: 'product_review', entityId: id,
        newValues: { admin_reply },
      });
    });

    const updated = await ReviewModel.findReviewById(id);
    res.json({ data: updated });
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const { status } = z.object({
      status: z.enum(['pending', 'replied', 'hidden']),
    }).parse(req.body);

    await withTransaction(async (conn) => {
      const review = await ReviewModel.findReviewById(id);
      if (!review) throw new ApiError(404, 'Không tìm thấy đánh giá');

      await ReviewModel.updateStatus(conn, id, status);
      await writeAudit(conn, req, {
        action: 'update_status', entity: 'product_review', entityId: id,
        oldValues: { status: review.status }, newValues: { status },
      });
    });

    const updated = await ReviewModel.findReviewById(id);
    res.json({ data: updated });
  }),
};

module.exports = ReviewsController;

