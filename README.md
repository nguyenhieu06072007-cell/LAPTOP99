# LAPTOP99 — THIẾT KẾ CƠ SỞ DỮ LIỆU & MIGRATION

> **Khoa Công nghệ Thông tin — Đại học CMC**  
> **Dự án:** Laptop99 — Hệ thống bán lẻ Laptop chính hãng  
> **Sinh viên thực hiện:** **Nguyễn Tiến Đạt** (Lớp: `ICT 4` — MSV: `BSE250011`)  
> **Vai trò phân công:** **Database Engineer: thiết kế CSDL, migration, dữ liệu mẫu**

---

## 🗄️ PHẠM VI MÃ NGUỒN PHỤ TRÁCH

Nhánh này chứa toàn bộ tài nguyên và mã nguồn **Cơ sở dữ liệu (Database)** của dự án:
* `laptop_shop.sql`: Kịch bản CSDL đầy đủ **21 bảng dữ liệu** (chuẩn hóa 3NF):
  - Bảng sản phẩm & danh mục: `products`, `product_images`, `categories`, `brands`.
  - Bảng bán hàng & đơn hàng: `orders`, `order_items`, `customers`, `coupons`.
  - Bảng quản trị & nghiệp vụ: `banners`, `product_reviews`, `news`, `audit_logs`, `password_resets`.
  - Chuẩn mã hóa: `SET NAMES utf8mb4;` và collation `utf8mb4_unicode_ci` triệt tiêu lỗi font tiếng Việt.
* `scripts/`: Bộ kịch bản di chuyển và nạp dữ liệu:
  - `migration_security_and_logic.js`: Nâng cấp cấu trúc bảng bảo mật và chống brute-force.
  - `seed-real-banners.js` & `seed-timeline-orders.js`: Nạp dữ liệu mẫu 100 sản phẩm laptop thật, banner và đơn hàng.
  - `upgrade-rbac-db.js`: Nâng cấp hệ thống bảng phân quyền vai trò người dùng (Admin, Manager, Staff).

## 🚀 HƯỚNG DẪN IMPORT CSDL
1. Mở MySQL Workbench hoặc DBeaver / Navicat.
2. Tạo database: `CREATE DATABASE laptop_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
3. Chạy file `laptop_shop.sql` để nạp toàn bộ cấu trúc 21 bảng và dữ liệu mẫu.
