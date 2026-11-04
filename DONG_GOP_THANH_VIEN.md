# LAPTOP99 — BÁO CÁO PHÂN CÔNG VÀ ĐÓNG GÓP THÀNH VIÊN DỰ ÁN

> **Dự án:** Hệ thống Bán lẻ Laptop Trực tuyến & Quản trị Toàn diện **LAPTOP99**  
> **Kiến trúc hệ thống:** Full-Stack Web Application (Storefront MVC + Admin CMS React + Node.js REST API + TiDB Cloud Database)  
> **Nhánh chính (Production):** `main`

---

## 👥 BẢNG TỔNG HỢP PHÂN CÔNG & NHÁNH THÀNH VIÊN

| STT | Thành viên | Nhánh GitHub (Branch) | Vai trò chính | Phạm vi mã nguồn phụ trách |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Nguyễn Hiếu** *(Trưởng nhóm)* | [`Nguyễn-Hiếu`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/tree/Nguy%E1%BB%85n-Hi%E1%BA%BFu) | Team Leader & Admin Core | Khung giao diện Admin (`AdminLayout`), Xác thực (`AuthContext`), Dashboard, Chế độ Sáng/Tối Admin, Tích hợp & Deploy Vercel/Render |
| **2** | **Bùi Quang Huy** | [`Bùi-Quang-Huy`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/tree/B%C3%B9i-Quang-Huy) | Backend API Developer | Toàn bộ RESTful API Controllers, Models, Bảo mật chống dò mật khẩu, Băm mã OTP, Logic nghiệp vụ giỏ hàng & tìm kiếm |
| **3** | **Nguyễn Đam Phong** | [`Nguyễn-Đam-Phong`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/tree/Nguy%E1%BB%85n-%C4%90am-Phong) | Storefront Frontend Developer | Giao diện khách hàng Storefront (MVC), Nhân vật Mascot Robot AI 24/7, Giao diện Sáng/Tối, Sửa 12 lỗi UI/UX và tối ưu Offline |
| **4** | **Tiến Đạt** | [`Tien-Dat`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/tree/Tien-Dat) | Database & DevOps Engineer | CSDL 21 bảng `laptop_shop.sql` chuẩn UTF-8, Kịch bản Migration CSDL, Seed dữ liệu 100 laptop thật, Bảo mật kết nối SSL |
| **5** | **Minh Đức** | [`minh-đức`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/tree/minh-%C4%91%E1%BB%A9c) | Admin Modules Developer | Các trang nghiệp vụ Admin CMS: Kanban đơn hàng, Nhập Excel hàng loạt, Quản lý banner, Đánh giá, Thu cũ đổi mới, Bảo hành RMA |

---

## 🛠️ CHI TIẾT ĐÓNG GÓP TỪNG THÀNH VIÊN

### 1. Nguyễn Hiếu — Trưởng nhóm & Admin Core UI
* **Mục tiêu:** Xây dựng nền tảng khung quản trị doanh nghiệp hiện đại, bảo mật và trải nghiệm người dùng cao cấp.
* **Các file phụ trách chính:**
  - `laptop-shop-admin/src/components/layout/AdminLayout.jsx` (Khung giao diện chung, sidebar thu gọn, thanh điều hướng)
  - `laptop-shop-admin/src/context/AuthContext.jsx` (Quản lý phiên đăng nhập, phân quyền RBAC, duy trì session khi F5)
  - `laptop-shop-admin/src/pages/auth/LoginPage.jsx` (Giao diện đăng nhập Admin chống tấn công)
  - `laptop-shop-admin/src/pages/dashboard/DashboardPage.jsx` (Bảng điều khiển chỉ số doanh thu, biểu đồ thời gian thực)
  - **Tính năng nổi bật:** Bổ sung cơ chế chuyển đổi **Dark Mode & Light Mode** toàn diện trên thanh Topbar, Sidebar và Menu Profile; cấu hình Deploy Vercel SPA routing rewrites.

### 2. Bùi Quang Huy — Backend RESTful API & Security
* **Mục tiêu:** Xây dựng hệ thống máy chủ Node.js/Express vững chắc, kết nối CSDL đám mây TiDB và đảm bảo an toàn thông tin.
* **Các file phụ trách chính:**
  - `laptop-shop-admin-backend/src/controllers/client.controller.js` & `src/models/client.model.js` (API trang khách hàng)
  - `laptop-shop-admin-backend/src/controllers/auth.controller.js` (Đăng nhập, phân quyền, cấp phát token JWT)
  - `laptop-shop-admin-backend/src/controllers/products.controller.js`, `orders.controller.js`, `banners.controller.js`
  - **Tính năng & Sửa lỗi nổi bật:**
    + Vá lỗi tìm kiếm gợi ý: hỗ trợ đồng thời cả hai tham số `q` và `search`.
    + Vá lỗi bộ lọc giá và bộ lọc RAM theo đúng nhãn chuẩn xác.
    + Thêm cơ chế **Khóa tài khoản chống Brute-force**: tự động khóa 15 phút nếu đăng nhập sai 5 lần liên tiếp.
    + Khắc phục tính năng Quên mật khẩu: băm mã OTP bằng `bcrypt`, bảo vệ chống thu thập email/SĐT người dùng.
    + Kiểm tra xung đột số điện thoại trùng lặp khi khách sửa hồ sơ.

### 3. Nguyễn Đam Phong — Storefront MVC & Trải nghiệm khách hàng
* **Mục tiêu:** Phát triển giao diện bán hàng trực tuyến mượt mà, chuẩn kiến trúc MVC, tích hợp công nghệ AI và chạy tốt cả Online lẫn Offline.
* **Các file phụ trách chính:**
  - `storefront/js/views/pages/home.view.js` (Trang chủ, Hero Slider, Flash Sale, Showcase Hãng)
  - `storefront/js/views/pages/catalog.view.js` (Bộ lọc đa chiều, danh mục laptop, chi tiết sản phẩm)
  - `storefront/js/views/pages/checkout.view.js` & `cart.controller.js` (Giỏ hàng, quy trình thanh toán QR/COD)
  - `storefront/css/styles.css` (Hệ thống thiết kế Design Tokens, bảng màu Sáng / Tối)
  - `storefront/js/components/chatbot.view.js` & `chatbot.controller.js` (Mascot Robot tư vấn thông minh)
  - **Tính năng & Sửa lỗi nổi bật:**
    + Tích hợp **Trợ lý Robot LAPTOP99 AI 24/7** với hiệu ứng cử động sinh động và cửa sổ chat tương tác.
    + Bổ sung công tắc **Dark / Light Mode** ngay thanh Header Storefront.
    + Sửa lỗi đồng hồ đếm ngược Flash Sale neo theo mốc thời gian thực trong ngày (F5 không bị reset).
    + Tính năng "Mua ngay" bảo toàn số lượng khách hàng đã chọn.
    + Cơ chế tự động fallback ảnh sang đám mây khi mở bài tập bằng giao thức `file:///`.

### 4. Tiến Đạt — Database Schema & DevOps
* **Mục tiêu:** Thiết kế CSDL quan hệ chuẩn hóa 3NF, đảm bảo tính toàn vẹn dữ liệu và xây dựng quy trình triển khai dữ liệu.
* **Các file phụ trách chính:**
  - `laptop_shop.sql` (Kịch bản CSDL trọn vẹn 21 bảng, chuẩn UTF-8 đa ngôn ngữ)
  - `laptop-shop-admin-backend/src/config/db.js` (Cấu hình Pool kết nối MySQL có mã hóa SSL bảo mật)
  - `laptop-shop-admin-backend/src/scripts/migration_security_and_logic.js` (Kịch bản di chuyển cấu trúc bảng)
  - `laptop-shop-admin-backend/src/scripts/verify_all_security_and_logic.js` (Bộ kiểm thử tự động toàn diện)
  - **Tính năng & Sửa lỗi nổi bật:**
    + Dump toàn diện **21 bảng** CSDL (bổ sung đầy đủ bảng `banners`, `product_reviews`, `news`, `password_resets`, `audit_logs`).
    + Bổ sung tiền tố `SET NAMES utf8mb4;` triệt tiêu 100% lỗi font tiếng Việt khi import.
    + Dọn dẹp toàn bộ token JWT và mật khẩu nhạy cảm hardcode, bảo mật kho lưu trữ GitHub.

### 5. Minh Đức — Admin Business Modules (Nghiệp vụ quản trị)
* **Mục tiêu:** Hiện thực hóa các tính năng nghiệp vụ thương mại điện tử chuyên sâu cho nhân viên và người quản trị.
* **Các file phụ trách chính:**
  - `laptop-shop-admin/src/pages/orders/OrderKanbanPage.jsx` (Quản lý tiến độ đơn hàng kéo thả trực quan)
  - `laptop-shop-admin/src/pages/import/BatchImportPage.jsx` (Nhập dữ liệu sản phẩm laptop hàng loạt từ file Excel)
  - `laptop-shop-admin/src/pages/feedback/FeedbackReportsPage.jsx` (Báo cáo đánh giá sao, duyệt và phản hồi đánh giá)
  - `laptop-shop-admin/src/pages/tradein/TradeInPage.jsx` (Chương trình thu cũ đổi mới, định giá laptop trợ giá)
  - `laptop-shop-admin/src/pages/returns/ReturnsManagementPage.jsx` (Xử lý khiếu nại, đổi trả và hoàn tiền RMA)
  - `laptop-shop-admin/src/pages/warranty/WarrantySerialPage.jsx` (Tra cứu và kích hoạt bảo hành điện tử theo Serial S/N)
  - `laptop-shop-admin/src/pages/banners/BannerManagementPage.jsx` (Studio quản lý hình ảnh banner hiển thị ngoài web)
  - **Tính năng nổi bật:** Đồng bộ toàn diện hệ thống bảng biểu, form nhập liệu với chế độ Dark/Light Mode, validation dữ liệu chặt chẽ.

---

## 🚀 HƯỚNG DẪN KIỂM TRA MÃ NGUỒN THEO TỪNG NHÁNH

Thầy cô và các thành viên có thể kiểm tra trực tiếp mã nguồn chi tiết tại từng nhánh:
1. **Kiểm tra giao diện Khách hàng & Robot AI:** `git checkout Nguyễn-Đam-Phong`
2. **Kiểm tra máy chủ REST API & Bảo mật:** `git checkout Bùi-Quang-Huy`
3. **Kiểm tra Khung quản trị Admin & Theme:** `git checkout Nguyễn-Hiếu`
4. **Kiểm tra CSDL & Kịch bản Migration:** `git checkout Tien-Dat`
5. **Kiểm tra các trang nghiệp vụ Admin CMS:** `git checkout minh-đức`
6. **Kiểm tra toàn bộ hệ thống tích hợp chạy trực tiếp:** `git checkout main`
