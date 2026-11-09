# HƯỚNG DẪN ĐÓNG GÓI VÀ TRIỂN KHAI HỆ THỐNG LAPTOP99 BẰNG DOCKER
**Đồ án:** Báo cáo phát triển hệ thống — Hệ thống bán lẻ Laptop Laptop99  
**Đơn vị:** Khoa Công nghệ Thông tin — Đại học CMC  

---

## 1. TỔNG QUAN VỀ ĐÓNG GÓI DOCKER CỦA HỆ THỐNG
Dự án **Laptop99** đã được chuẩn hóa và đóng gói hoàn chỉnh bằng **Docker** & **Docker Compose** thành một kiến trúc vi dịch vụ (Microservices-ready containerized architecture) gồm **4 Container độc lập**:

| Tên Dịch vụ | Container Name | Công nghệ | Cổng Host | Vai trò & Tính năng |
| :--- | :--- | :--- | :--- | :--- |
| **MySQL Database** | `laptop99-mysql` | MySQL 8.0 | `3306` | Lưu trữ dữ liệu. **Tự động nạp dữ liệu mẫu** từ file `laptop_shop.sql` ngay khi khởi tạo lần đầu. |
| **Backend API** | `laptop99-backend` | Node.js 20, Express, REST API | `4000` | Xử lý logic nghiệp vụ, xác thực JWT, kết nối MySQL qua mạng nội bộ Docker (`mysql:3306`). |
| **Frontend Admin** | `laptop99-admin` | React, Vite, TailwindCSS, Nginx | `5173` | Trang bảng điều khiển quản trị viên (Admin Dashboard) được tối ưu bằng Nginx Alpine siêu nhẹ. |
| **Customer Storefront** | `laptop99-storefront` | HTML5, MVC, Nginx Alpine | `3000` & `8080` | Cửa hàng khách hàng trực tuyến, tích hợp reverse proxy điều hướng request `/api/` về Backend. |

---

## 2. HƯỚNG DẪN KHỞI CHẠY (DÀNH CHO GIẢNG VIÊN VÀ NGƯỜI CHẤM BÀI)

### Yêu cầu tiên quyết:
* Máy tính đã cài đặt **Docker Desktop** (Tải tại: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)).

### Bước 1: Khởi động toàn bộ hệ thống (Chỉ 1 câu lệnh)
Mở cửa sổ dòng lệnh (Terminal / PowerShell / Command Prompt) tại thư mục gốc của dự án (`sprint2`) và gõ:

```bash
docker compose up -d --build
```

> **Giải thích lệnh:**
> - `up`: Dựng và khởi động các container.
> - `-d`: Chạy ngầm dưới nền (detached mode).
> - `--build`: Tự động build lại mã nguồn mới nhất cho Backend và Admin.

---

### Bước 2: Truy cập hệ thống trên trình duyệt

Sau khi lệnh chạy xong (khoảng 30 giây đến 1 phút cho lần đầu tiên):

1. **Trang Khách hàng (Storefront):**
   - Địa chỉ: `http://localhost:3000` *(hoặc `http://localhost:8080`)*
   - Xem laptop, tìm kiếm, giỏ hàng, đặt hàng, tra cứu mã đơn hàng và Serial Number.

2. **Trang Quản trị viên (Admin Dashboard):**
   - Địa chỉ: `http://localhost:5173`
   - Tài khoản đăng nhập mẫu:
     * **Super Admin (Toàn quyền):** `admin@laptopshop.vn` / Mật khẩu: `Admin@123456`
     * **Trưởng phòng Sale:** `salesmgr@laptopshop.vn` / Mật khẩu: `Admin@123456`
     * **Nhân viên Sale (Ẩn giá vốn):** `sales@laptopshop.vn` / Mật khẩu: `Admin@123456`
     * **Thủ kho (Chỉ thấy kho & S/N):** `warehouse@laptopshop.vn` / Mật khẩu: `Admin@123456`
     * **Kế toán (Xem giá vốn & đối soát):** `accountant@laptopshop.vn` / Mật khẩu: `Admin@123456`
     * *(Trên trang Đăng nhập có thanh chọn vai trò 1 chạm để test nhanh)*

3. **Backend REST API:**
   - Địa chỉ: `http://localhost:4000/api`
   - Kiểm tra Healthcheck: `http://localhost:4000/api/health`

4. **Kết nối Database MySQL trực tiếp (nếu cần chấm CSDL):**
   - Host: `localhost` | Port: `3306`
   - User: `root` | Password: `root` | Database: `laptop_shop`

---

## 3. CÁC CÂU LỆNH HỮU ÍCH THƯỜNG DÙNG

### 1. Kiểm tra trạng thái các container:
```bash
docker compose ps
```

### 2. Xem log thời gian thực của toàn bộ hệ thống hoặc từng service:
```bash
# Xem log toàn bộ:
docker compose logs -f

# Xem log Backend:
docker compose logs -f backend

# Xem log Database:
docker compose logs -f mysql
```

### 3. Tắt hệ thống khi không dùng nữa:
```bash
docker compose down
```

### 4. Tắt và xóa sạch dữ liệu database để làm mới từ đầu:
```bash
docker compose down -v
```

---

## 4. NỘI DUNG ĐƯA VÀO BÁO CÁO PHÁT TRIỂN HỆ THỐNG
Nhóm có thể đưa trực tiếp nội dung dưới đây vào mục **"Triển khai và Đóng gói hệ thống (DevOps & Deployment)"** trong bài báo cáo:

* **Mục tiêu:** Tối ưu hóa quy trình triển khai (CI/CD readiness), giải quyết triệt để vấn đề xung đột môi trường ("Works on my machine").
* **Giải pháp:** Sử dụng công nghệ containerization (Docker & Docker Compose):
  - **Multi-stage Build:** Tách riêng môi trường build (Node.js) và môi trường chạy (Nginx Alpine) cho Frontend Admin giúp giảm dung lượng image từ ~800MB xuống dưới ~30MB.
  - **Database Auto-seeding:** Tích hợp cơ chế tự động nạp lược đồ và dữ liệu mẫu `laptop_shop.sql` qua thư mục chuẩn `/docker-entrypoint-initdb.d/` của MySQL 8.0.
  - **Internal Network Isolation:** Các container giao tiếp an toàn qua mạng ảo `laptop99_network` riêng biệt, không để lộ thông tin mật khẩu ra ngoài.

