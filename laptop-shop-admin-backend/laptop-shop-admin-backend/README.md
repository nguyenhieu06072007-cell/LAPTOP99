# Laptop Shop – Admin Backend API

Backend cho trang quản trị, viết trên **Node.js (>= 18.11) + Express + MySQL**, dùng đúng schema trong `laptop_shop.sql`.

## 1. Cài đặt

```bash
# 1) Tạo database + dữ liệu mẫu
mysql -u root -p < laptop_shop.sql

# 2) Cài thư viện, cấu hình
npm install
cp .env.example .env        # điền DB_PASSWORD và JWT_SECRET (>= 32 ký tự)

# 3) Đặt mật khẩu thật cho admin (file SQL chỉ có placeholder)
npm run set-admin-password -- admin@laptopshop.vn "MatKhauManh@123"

# 4) Chạy
npm run dev                 # hoặc: npm start
```

Tạo `JWT_SECRET` ngẫu nhiên: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## 2. Phân quyền (khớp bảng `roles`)

| Quyền | super_admin | product_manager | data_entry | accountant |
|---|:-:|:-:|:-:|:-:|
| Xem sản phẩm / hãng / danh mục / kho | ✅ | ✅ | ✅ | ✅ |
| Thêm, sửa sản phẩm, ảnh | ✅ | ✅ | ✅ | ❌ |
| Xoá mềm / khôi phục sản phẩm | ✅ | ✅ | ❌ | ❌ |
| Thêm/sửa/xoá hãng, danh mục | ✅ | ✅ | ❌ | ❌ |
| Nhập/xuất/điều chỉnh kho | ✅ | ✅ | ❌ | ❌ |
| Xem **giá nhập**, biên lợi nhuận | ✅ | ✅ | ❌ | ✅ |
| Dashboard | ✅ | ✅ | ❌ | ✅ |
| Quản lý tài khoản admin, xem audit log | ✅ | ❌ | ❌ | ❌ |

Sửa ma trận ở `src/config/permissions.js`.

## 3. Endpoint (prefix `/api/admin`, gửi `Authorization: Bearer <token>`)

**Auth**
- `POST /auth/login` `{email, password}` → `{token, user}` (sai 5 lần ⇒ khoá 15 phút, cấu hình trong `.env`)
- `GET /auth/me` · `PUT /auth/me/password`

**Sản phẩm** – `/products`
- `GET /` lọc: `search, brand_id, category_id, status, condition_type, stock=out|low|in, min_price, max_price, is_featured=1, is_new=1, is_bestseller=1, trashed=only|with, sort=created_at|updated_at|price|name|stock|sold|views, order=asc|desc, page, limit`
- `GET /:id` (kèm `specs`, `images`) · `GET /:id/price-history`
- `POST /` · `PUT /:id` · `PATCH /:id/status`
- `DELETE /:id` (xoá mềm) · `POST /:id/restore`
- `POST /:id/images` (multipart, field `images`, tối đa 8 ảnh ≤ 5MB) · `PATCH /:id/images/:imageId` · `DELETE /:id/images/:imageId`

**Kho** – `/inventory`
- `GET /movements` · `GET /low-stock` · `POST /movements`

**Hãng / Danh mục** – `/brands`, `/categories` (`?tree=1` trả dạng cây): `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`

**Khác**: `GET /dashboard` · `GET /audit-logs` · `/users` (CRUD, `/users/roles`, `PATCH /:id/status`, `POST /:id/reset-password`)

Sức khoẻ hệ thống: `GET /health`. Ảnh được phục vụ tại `/uploads/...`.

### Ví dụ
```bash
TOKEN=$(curl -s localhost:4000/api/admin/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@laptopshop.vn","password":"MatKhauManh@123"}' | jq -r .data.token)

curl -X POST localhost:4000/api/admin/products -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{
  "sku":"ACER-SWIFT3-SF314","name":"Laptop Acer Swift 3 SF314 i5 16GB 512GB",
  "brand_id":5,"category_id":3,"cost_price":15000000,"price":18990000,
  "stock_quantity":10,"status":"active",
  "specs":{"cpu_model":"Core i5-1240P","ram_gb":16,"storage_gb":512,"screen_size_inch":14.0}
}'
```

## 4. Các quyết định thiết kế cần biết

- **Khoá lạc quan:** `PUT /products/:id` bắt buộc gửi `version` (lấy từ `GET`). Nếu người khác đã sửa trước ⇒ `409` kèm `current_version`.
- **Tồn kho chỉ đổi qua `/inventory/movements`** (có `FOR UPDATE`, không cho âm, ghi `stock_before/after`). `PUT /products` bỏ qua `stock_quantity`. Khi tạo sản phẩm có `stock_quantity > 0` thì tự sinh phiếu nhập đầu.
- **Lịch sử giá** tự ghi khi `price`/`sale_price` đổi. **Audit log** ghi old/new cho mọi thao tác ghi.
- **Xoá mềm:** `deleted_at` + chuyển `hidden`; SKU/slug của sản phẩm đã xoá vẫn bị chiếm (do `UNIQUE` trong schema) – muốn dùng lại hãy khôi phục hoặc đổi SKU.
- **Giá nhập (`cost_price`)** bị ẩn khỏi response và bị bỏ qua khi ghi nếu role không có quyền `cost:read`.
- Slug tự sinh từ tên (bỏ dấu tiếng Việt), tự thêm `-2`, `-3` nếu trùng; **không đổi** khi sửa tên để không gãy URL/SEO.
- Token JWT stateless; đăng xuất = frontend xoá token. Mỗi request vẫn kiểm tra lại user trong DB nên khoá tài khoản có hiệu lực ngay.
- Lỗi dạng `{ "error": { "message": "...", "details": [...] } }`; danh sách dạng `{ "data": [...], "meta": { page, limit, total, total_pages } }`.

## 5. Cấu trúc

```
src/
  app.js, server.js
  config/      env, db (pool + transaction), permissions
  middlewares/ auth (JWT + RBAC), error, upload (multer)
  routes/      auth, users, brands, categories, products, inventory, dashboard, audit
  services/    audit
  utils/       helpers (slugify, paging, ApiError...)
scripts/set-admin-password.js
```
