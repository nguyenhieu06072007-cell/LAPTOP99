const { ApiError, asyncHandler } = require('../utils/helpers');
const BannersModel = require('../models/banners.model');

/**
 * BannersController — Tầng Controller (MVC) xử lý CRUD và thiết kế Banner
 */
const BannersController = {
  // Public / Client: Chỉ trả về các banner đang được Admin kích hoạt hiển thị
  listClientBanners: asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const rows = await BannersModel.getAll({ onlyActive: true });
    res.json({ data: rows });
  }),

  // Admin: Lấy toàn bộ danh sách banner
  listAdminBanners: asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const rows = await BannersModel.getAll({ onlyActive: false });
    res.json({ data: rows });
  }),

  getBannerDetail: asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) throw new ApiError(400, 'ID banner không hợp lệ');
    const row = await BannersModel.getById(id);
    if (!row) throw new ApiError(404, 'Không tìm thấy banner');
    res.json({ data: row });
  }),

  createBanner: asyncHandler(async (req, res) => {
    if (!req.body.title || String(req.body.title).trim().length < 2) {
      throw new ApiError(400, 'Vui lòng nhập tiêu đề chính cho banner');
    }
    const created = await BannersModel.create(req.body);
    res.status(201).json({ data: created, message: 'Đã tạo banner mới thành công' });
  }),

  updateBanner: asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      throw new ApiError(400, 'ID banner không hợp lệ');
    }
    const updated = await BannersModel.update(id, req.body);
    if (!updated) throw new ApiError(404, 'Không tìm thấy banner cần cập nhật');
    res.json({ data: updated, message: 'Đã lưu thiết kế banner thành công' });
  }),

  toggleBannerStatus: asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) throw new ApiError(400, 'ID banner không hợp lệ');
    const existing = await BannersModel.getById(id);
    if (!existing) throw new ApiError(404, 'Không tìm thấy banner');
    const nextState = req.body.is_active !== undefined ? Boolean(req.body.is_active) : !existing.is_active;
    const updated = await BannersModel.updateStatus(id, nextState);
    res.json({ data: updated, message: nextState ? 'Đã bật hiển thị banner' : 'Đã tạm ẩn banner' });
  }),

  deleteBanner: asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) throw new ApiError(400, 'ID banner không hợp lệ');
    const existing = await BannersModel.getById(id);
    if (!existing) throw new ApiError(404, 'Không tìm thấy banner');
    await BannersModel.remove(id);
    res.json({ success: true, message: 'Đã xóa banner thành công' });
  }),

  // Tải tệp hình ảnh quảng cáo trực tiếp từ máy tính của Admin lên server
  uploadBannerImage: asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, 'Vui lòng chọn tệp hình ảnh quảng cáo để tải lên');
    }
    const url = `/uploads/banners/${req.file.filename}`;
    res.status(201).json({
      data: {
        url,
        filename: req.file.filename,
        size: req.file.size,
      },
      message: 'Tải hình ảnh quảng cáo lên thành công',
    });
  }),
};

module.exports = BannersController;

