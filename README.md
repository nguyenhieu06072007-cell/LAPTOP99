# LAPTOP99 — BACKEND API (ORDERS, INVENTORY, CUSTOMERS, MARKETING, STOREFRONT API)

> **Khoa Công nghệ Thông tin — Đại học CMC**  
> **Dự án:** Laptop99 — Hệ thống bán lẻ Laptop chính hãng  
> **Sinh viên thực hiện:** **Bùi Quang Huy** (Lớp: `ICT 4` — MSV: `BIT252677`)  
> **Vai trò phân công:** **Backend: Orders, Inventory, Customers, Marketing, Dashboard, Storefront API**

---

## ⚙️ PHẠM VI MÃ NGUỒN PHỤ TRÁCH

Nhánh này chứa mã nguồn **Máy chủ RESTful API Node.js/Express** phục vụ nghiệp vụ bán hàng và khách hàng:
* `src/controllers/` & `src/models/`:
  - **Orders API:** `orders.controller.js`, `order.model.js` (Quản lý trạng thái đơn hàng, hủy đơn, thanh toán).
  - **Inventory API:** `inventory.controller.js`, `inventory.model.js` (Kiểm kê kho, số lượng tồn thực tế).
  - **Customers & CRM API:** `customers.controller.js`, `customer.model.js` (Quản lý khách hàng, chống trùng số điện thoại).
  - **Marketing & Promotions:** `promotions.controller.js`, `banners.controller.js` (Quản lý banner, mã giảm giá).
  - **Dashboard API:** `dashboard.controller.js`, `dashboard.model.js` (Thống kê doanh thu, đơn hàng).
  - **Storefront Client API:** `client.controller.js`, `client.model.js` (API phục vụ web khách hàng: lấy danh mục, tìm kiếm, lọc giá/RAM).
* **Vá lỗi bảo mật & logic:**
  - Khóa tài khoản chống brute-force (khóa 15 phút khi nhập sai mật khẩu 5 lần).
  - Đặt lại mật khẩu an toàn với mã OTP 6 số mã hóa bcrypt.
  - Sửa lỗi tìm kiếm hỗ trợ đồng thời cả `q` và `search`.

## 🚀 HƯỚNG DẪN KHỞI CHẠY BACKEND
```bash
npm install
npm start
```
Máy chủ API chạy tại: `http://localhost:5000`
