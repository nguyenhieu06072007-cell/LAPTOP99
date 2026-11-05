# 📖 HƯỚNG DẪN DÀNH CHO GIẢNG VIÊN CHẤM ĐỒ ÁN LAPTOP99
**Học phần:** Phát triển ứng dụng Web / Đồ án phát triển hệ thống  
**Nhóm thực hiện:** Nhóm Laptop99 — Lớp ICT 4 — Khoa CNTT, Đại học CMC  

---

## ⚡ CÁCH 1: KHỞI CHẠY BẰNG DOCKER (KHUYẾN NGHỊ — CHỈ 1 CÂU LỆNH)
*(Áp dụng khi máy tính của Thầy/Cô đã cài đặt Docker Desktop)*

### Bước 1: Mở Terminal tại thư mục dự án
Thầy/Cô mở **Terminal** (hoặc **PowerShell** / **CMD**) tại thư mục gốc của dự án `sprint2`.

### Bước 2: Chạy câu lệnh khởi động
```bash
docker compose up -d --build
```
> *(Hoặc trên Windows, Thầy/Cô chỉ cần **nhấp đúp chuột vào file `start-docker.bat`**)*.

Hệ thống sẽ tự động:
1. Kéo image MySQL 8.0, tự động nạp sẵn CSDL và dữ liệu mẫu từ `laptop_shop.sql`.
2. Build và khởi chạy Backend Node.js Express tại cổng `4000`.
3. Build và khởi chạy Frontend Admin tại cổng `5173`.
4. Khởi chạy Storefront khách hàng tại cổng `3000` (và `8080`).

### Bước 3: Mở trình duyệt xem sản phẩm
* **Giao diện Khách hàng (Storefront):** [http://localhost:3000](http://localhost:3000) *(hoặc [http://localhost:8080](http://localhost:8080))*
* **Giao diện Quản trị viên (Admin Dashboard):** [http://localhost:5173](http://localhost:5173)
* **Backend REST API:** [http://localhost:4000/api](http://localhost:4000/api)

---

## 💻 CÁCH 2: KHỞI CHẠY TRUYỀN THỐNG (NẾU MÁY CHƯA CÓ DOCKER)
*(Dành cho máy Windows đã có sẵn Node.js và XAMPP)*

Thầy/Cô chỉ cần vào thư mục dự án và nhấp đúp vào file:
* **`start-system.bat`**: File sẽ tự động kiểm tra MySQL XAMPP (cổng 3306), bật Backend (cổng 4000) và bật Frontend Admin (cổng 5173).
* Mở giao diện khách hàng: Nhấp đúp chuột trực tiếp vào file **`index.html`**.

---

## 🔑 THÔNG TIN TÀI KHOẢN ĐĂNG NHẬP HỆ THỐNG

### 1. Tài khoản Quản trị Admin:
* **Địa chỉ:** `http://localhost:5173`
* **Email:** `admin@laptopshop.vn`
* **Mật khẩu:** `Admin@123456`
* *(Có đầy đủ các quyền: Quản lý đơn hàng Kanban, Nhập kho Batch Import, Khách hàng, Bảo hành S/N, Thu cũ đổi mới, Doanh thu).*

### 2. Tài khoản Khách hàng mua sắm:
* **Địa chỉ:** `http://localhost:3000` (hoặc mở trực tiếp file `index.html`)
* **Email:** `khach@demo.vn` *(hoặc `nguyenhieu06072007@gmail.com`)*
* **Mật khẩu:** `123456`
* *(Hoặc Thầy/Cô có thể bấm "Đăng ký" tài khoản mới trực tiếp trên giao diện).*

---

## 🛑 DỪNG HỆ THỐNG KHI CHẤM XONG
Khi chấm xong, Thầy/Cô gõ lệnh sau để giải phóng tài nguyên:
```bash
docker compose down
```
