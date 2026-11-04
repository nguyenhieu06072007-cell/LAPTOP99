# LAPTOP99 — BÁO CÁO PHÂN CÔNG VÀ ĐÓNG GÓP THÀNH VIÊN DỰ ÁN

> **Khoa Công nghệ Thông tin — Đại học CMC**  
> **Học phần:** Dự án Laptop99 — Báo cáo phát triển hệ thống  
> **Lớp:** ICT 4  
> **Nhánh chính (Tích hợp toàn diện):** `main`

---

## 👥 1.5. NHÓM THỰC HIỆN VÀ VAI TRÒ (CHÍNH THỨC)

| STT | Thành viên | Lớp / MSV | Vai trò chính theo phân công | Nhánh GitHub (Branch) |
| :---: | :--- | :---: | :--- | :--- |
| **1** | **Nguyễn Văn Hiếu** | `ICT 4 — BSE250019` | **Backend Lead** (kiến trúc lõi, Auth, Catalog); **Frontend Admin** (khung, xác thực, quản lý danh mục) | [`Nguyễn-Hiếu`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/tree/Nguy%E1%BB%85n-Hi%E1%BA%BFu) |
| **2** | **Nguyễn Tiến Đạt** | `ICT 4 — BSE250011` | **Database Engineer**: thiết kế CSDL, migration, dữ liệu mẫu | [`Tien-Dat`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/tree/Tien-Dat) |
| **3** | **Bùi Quang Huy** | `ICT 4 — BIT252677` | **Backend**: Orders, Inventory, Customers, Marketing, Dashboard, Storefront API | [`Bùi-Quang-Huy`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/tree/B%C3%B9i-Quang-Huy) |
| **4** | **Nguyễn Đam Phong** | `ICT 4 — BSE252331` | **Frontend**: Customer Storefront và UI/UX | [`Nguyễn-Đam-Phong`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/tree/Nguy%E1%BB%85n-%C4%90am-Phong) |
| **5** | **Trần Minh Đức** | `ICT 4 — BSE252332` | **Frontend Admin** (nghiệp vụ vận hành) và **Tester/QA** kiêm nhiệm | [`minh-đức`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/tree/minh-%C4%91%E1%BB%A9c) |

---

## 🛠️ CHI TIẾT PHẠM VI MÃ NGUỒN TỪNG THÀNH VIÊN TRÊN GITHUB

### 1. Nguyễn Văn Hiếu — BSE250019 (Nhánh `Nguyễn-Hiếu`)
* **Vai trò:** Backend Lead & Frontend Admin Core.
* **Mã nguồn trong nhánh:**
  - **Backend Core:** `app.js`, `server.js`, `config/db.js`, `config/env.js`, `config/permissions.js`, `middlewares/auth.js`, `middlewares/error.js`, `controllers/auth.controller.js`, `controllers/products.controller.js`, `controllers/categories.controller.js`, `controllers/brands.controller.js`, `controllers/users.controller.js`.
  - **Frontend Admin Core:** `AdminLayout.jsx`, `AuthContext.jsx`, `LoginPage.jsx`, `DashboardPage.jsx`, `ProductListPage.jsx`, `ProductFormPage.jsx`, `ProductDetailPage.jsx`, `CategoryListPage.jsx`, `BrandListPage.jsx`, `UserListPage.jsx`.
  - **Tính năng nổi bật:** Khung điều hướng Admin hiện đại, tích hợp công tắc Dark/Light Mode Topbar & Sidebar, kiến trúc phân quyền RBAC đa vai trò.

### 2. Nguyễn Tiến Đạt — BSE250011 (Nhánh `Tien-Dat`)
* **Vai trò:** Database Engineer.
* **Mã nguồn trong nhánh:**
  - **Kịch bản CSDL:** `laptop_shop.sql` hoàn chỉnh 21 bảng dữ liệu, chuẩn mã hóa `utf8mb4_unicode_ci` triệt tiêu lỗi font tiếng Việt.
  - **Scripts Migration & Dữ liệu mẫu:** `Database/` chứa các kịch bản kiểm thử ràng buộc, trigger, transaction; các kịch bản nạp dữ liệu laptop thật, seed 100 sản phẩm, banner và đơn hàng đa trạng thái.
  - **Bảo mật CSDL:** Cấu hình kết nối SSL đám mây TiDB Cloud, loại bỏ token/pass nhạy cảm khỏi repo.

### 3. Bùi Quang Huy — BIT252677 (Nhánh `Bùi-Quang-Huy`)
* **Vai trò:** Backend Nghiệp vụ & Storefront API.
* **Mã nguồn trong nhánh:**
  - **Controllers & Models:**
    + Quản lý đơn hàng: `orders.controller.js`, `order.model.js`, `order.service.js`, `orders.routes.js`.
    + Quản lý kho: `inventory.controller.js`, `inventory.model.js`, `inventory.routes.js`.
    + Khách hàng & Marketing: `customers.controller.js`, `customer.model.js`, `promotions.controller.js`, `promotion.model.js`, `banners.controller.js`, `banners.model.js`.
    + Bảng điều khiển: `dashboard.controller.js`, `dashboard.model.js`.
    + API Khách hàng: `client.controller.js`, `client.model.js`, `client.routes.js`, `reviews.controller.js`, `review.model.js`.
  - **Vá lỗi bảo mật & logic:** Khóa brute-force 15 phút sau 5 lần nhập sai, băm OTP đặt lại mật khẩu với `bcrypt`, kiểm tra chống trùng SĐT, xử lý đồng thời 2 tham số `q` & `search`, sửa lọc giá/RAM.

### 4. Nguyễn Đam Phong — BSE252331 (Nhánh `Nguyễn-Đam-Phong`)
* **Vai trò:** Frontend Customer Storefront & UI/UX.
* **Mã nguồn trong nhánh:**
  - **Storefront MVC:** Toàn bộ thư mục `storefront/` (HTML/CSS/JS), file `index.html`, thư mục ảnh `uploads/`.
  - **Giao diện người dùng:** Trang chủ `home.view.js` (Hero Slider, Brand Showcase, Flash Sale), Trang sản phẩm `catalog.view.js`, Trang giỏ hàng và thanh toán `checkout.view.js`.
  - **Tính năng nổi bật:** Mascot Trợ lý AI Robot 24/7 sinh động (`chatbot.view.js`, `chatbot.controller.js`), Chế độ giao diện Sáng / Tối toàn diện, sửa 12 lỗi giao diện và cơ chế tương thích chạy offline giao thức `file:///`.

### 5. Trần Minh Đức — BSE252332 (Nhánh `minh-đức`)
* **Vai trò:** Frontend Admin Nghiệp vụ vận hành & Tester/QA kiêm nhiệm.
* **Mã nguồn trong nhánh:**
  - **Màn hình Admin vận hành:**
    + `OrderKanbanPage.jsx`: Quản lý tiến độ đơn hàng kéo thả dạng Kanban.
    + `BatchImportPage.jsx`: Nhập danh sách laptop hàng loạt bằng file Excel.
    + `FeedbackReportsPage.jsx`: Báo cáo, duyệt và phản hồi đánh giá từ khách.
    + `ReturnsManagementPage.jsx`: Tiếp nhận và xử lý đổi trả, hoàn tiền RMA.
    + `WarrantySerialPage.jsx`: Tra cứu và kích hoạt bảo hành điện tử theo Serial S/N.
    + `TradeInPage.jsx`: Chương trình thu cũ đổi mới, trợ giá laptop.
    + `BannerManagementPage.jsx` & `PromotionCampaignPage.jsx`: Studio quản lý banner và đợt khuyến mãi.
  - **Tester / QA:** Bộ kịch bản kiểm thử API tự động `verify_all_security_and_logic.js`, test cases xác thực luồng nghiệp vụ.

---

## 🚀 CÁCH THẦY CÔ KIỂM TRA TỪNG NHÁNH TRÊN GITHUB

* **Xem sản phẩm tổng thể chạy trực tiếp:** `git checkout main` (gồm 100% mã nguồn cả nhóm đã tích hợp và deploy).
* **Kiểm tra bài làm độc lập của từng sinh viên:**
  1. `git checkout Nguyễn-Hiếu` &rarr; Xem mã nguồn Backend Lead & Admin Core (Nguyễn Văn Hiếu - BSE250019)
  2. `git checkout Tien-Dat` &rarr; Xem mã nguồn CSDL & Migration (Nguyễn Tiến Đạt - BSE250011)
  3. `git checkout Bùi-Quang-Huy` &rarr; Xem mã nguồn Backend Orders, Inventory, Client API (Bùi Quang Huy - BIT252677)
  4. `git checkout Nguyễn-Đam-Phong` &rarr; Xem mã nguồn Giao diện khách hàng Storefront & Robot AI (Nguyễn Đam Phong - BSE252331)
  5. `git checkout minh-đức` &rarr; Xem mã nguồn Admin vận hành Kanban/Excel & QA (Trần Minh Đức - BSE252332)
