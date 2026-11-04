# LAPTOP99 — BACKEND LEAD & FRONTEND ADMIN CORE

> **Khoa Công nghệ Thông tin — Đại học CMC**  
> **Dự án:** Laptop99 — Hệ thống bán lẻ Laptop chính hãng  
> **Sinh viên thực hiện:** **Nguyễn Văn Hiếu** (Lớp: `ICT 4` — MSV: `BSE250019`)  
> **Vai trò phân công:** **Backend Lead (kiến trúc lõi, Auth, Catalog); Frontend Admin (khung, xác thực, quản lý danh mục)**

---

## 🏛️ PHẠM VI MÃ NGUỒN PHỤ TRÁCH

Nhánh này chứa mã nguồn **Kiến trúc lõi Backend** và **Khung nền tảng Admin Core CMS**:
* **Backend Lead (Kiến trúc lõi, Auth & Catalog):**
  - `src/app.js`, `src/server.js`: Thiết kế kiến trúc tổng thể, middleware bảo mật CORS, Rate Limit, Error Handler.
  - `src/config/`: `db.js` (kết nối TiDB Cloud SSL), `env.js`, `permissions.js` (hệ thống ma trận quyền RBAC).
  - `src/controllers/` & `src/models/`:
    + `auth.controller.js`, `user.model.js`: Đăng nhập, cấp phát JWT, phân quyền tài khoản.
    + `products.controller.js`, `product.model.js`: Quản lý danh mục sản phẩm, biến thể, giá cả.
    + `categories.controller.js`, `brands.controller.js`: Quản lý danh mục và thương hiệu laptop.
    + `audit.controller.js`, `audit.model.js`: Ghi nhận nhật ký kiểm toán hệ thống (Audit Log).
* **Frontend Admin (Khung, Xác thực & Quản lý danh mục):**
  - `AdminLayout.jsx`, `Sidebar.jsx`, `App.jsx`: Khung điều hướng Admin hiện đại.
  - **Dark Mode & Light Mode**: Tích hợp nút chuyển đổi giao diện sáng tối toàn diện trên Topbar & Sidebar.
  - `AuthContext.jsx`, `LoginPage.jsx`: Quản trị phiên đăng nhập, chống redirect lặp 401, duy trì session khi F5.
  - `ProductListPage.jsx`, `ProductFormPage.jsx`, `CategoryListPage.jsx`, `BrandListPage.jsx`, `DashboardPage.jsx`.

## 🚀 HƯỚNG DẪN KHỞI CHẠY
1. Khởi chạy Backend:
```bash
cd laptop-shop-admin-backend/laptop-shop-admin-backend
npm install && npm start
```
2. Khởi chạy Admin CMS:
```bash
cd laptop-shop-admin
npm install && npm run dev
```
