# LAPTOP99 — GIAO DIỆN KHÁCH HÀNG (CUSTOMER STOREFRONT & UI/UX)

> **Khoa Công nghệ Thông tin — Đại học CMC**  
> **Dự án:** Laptop99 — Hệ thống bán lẻ Laptop chính hãng  
> **Sinh viên thực hiện:** **Nguyễn Đam Phong** (Lớp: `ICT 4` — MSV: `BSE252331`)  
> **Vai trò phân công:** **Frontend: Customer Storefront và UI/UX**

---

## 💻 PHẠM VI MÃ NGUỒN PHỤ TRÁCH

Nhánh này chứa toàn bộ mã nguồn **Giao diện Khách hàng Storefront (MVC Architecture)**:
* `storefront/js/views/`: 
  - `home.view.js`: Trang chủ với Hero Slider, Showcase thương hiệu Apple/ASUS/Lenovo/Dell, Flash Sale đếm ngược thời gian thực.
  - `catalog.view.js`: Bộ lọc đa chiều (Giá, Hãng, RAM, SSD, CPU), danh sách sản phẩm, trang chi tiết cấu hình.
  - `checkout.view.js`: Giỏ hàng, áp dụng Voucher, quy trình đặt hàng và quét mã VietQR.
  - `services.view.js`: Chuyên trang Thu cũ đổi mới, Tra cứu bảo hành Serial S/N.
* `storefront/js/components/`:
  - `chatbot.view.js` & `chatbot.controller.js`: **Nhân vật Mascot Trợ lý AI Robot 24/7** với hiệu ứng động, tương tác tư vấn máy và bảng giá.
* `storefront/css/styles.css`: Hệ thống thiết kế chuẩn UI/UX, hỗ trợ **Dark Mode & Light Mode**.
* `uploads/`: Toàn bộ kho hình ảnh sản phẩm laptop và banner hiển thị.

## 🚀 HƯỚNG DẪN MỞ BÀI
* Nhấp đúp mở file `index.html` trên bất kỳ trình duyệt nào (Chrome, Edge).
* Hỗ trợ tự động chạy cả **Online** (gọi API máy chủ đám mây) lẫn **Offline** (giao thức `file:///`).
