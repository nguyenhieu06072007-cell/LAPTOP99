# LAPTOP99 — FRONTEND ADMIN (NGHIỆP VỤ VẬN HÀNH) & TESTER/QA

> **Khoa Công nghệ Thông tin — Đại học CMC**  
> **Dự án:** Laptop99 — Hệ thống bán lẻ Laptop chính hãng  
> **Sinh viên thực hiện:** **Trần Minh Đức** (Lớp: `ICT 4` — MSV: `BSE252332`)  
> **Vai trò phân công:** **Frontend Admin (nghiệp vụ vận hành) và Tester/QA kiêm nhiệm**

---

## 📊 PHẠM VI MÃ NGUỒN PHỤ TRÁCH

Nhánh này chứa mã nguồn **Các màn hình nghiệp vụ vận hành chuyên sâu trên Admin CMS React** và **Bộ kiểm thử QA**:
* `src/pages/`:
  - `orders/OrderKanbanPage.jsx`: Quản lý tiến độ đơn hàng kéo thả dạng Kanban (Chờ duyệt &rarr; Đang xử lý &rarr; Đang giao &rarr; Đã giao).
  - `import/BatchImportPage.jsx`: Nhập dữ liệu sản phẩm laptop hàng loạt từ file Excel (.xlsx, .csv).
  - `feedback/FeedbackReportsPage.jsx`: Báo cáo, kiểm duyệt và trả lời đánh giá sao từ khách hàng.
  - `returns/ReturnsManagementPage.jsx`: Xử lý khiếu nại, quy trình đổi trả máy và hoàn tiền (RMA).
  - `warranty/WarrantySerialPage.jsx`: Tra cứu, kích hoạt bảo hành điện tử theo số Serial S/N.
  - `tradein/TradeInPage.jsx`: Chương trình Thu cũ đổi mới, thẩm định và định giá máy cũ trợ giá.
  - `banners/BannerManagementPage.jsx` & `promotions/PromotionCampaignPage.jsx`: Studio quản lý banner và đợt khuyến mãi.
  - `customers/CustomerPurchaseHistoryPage.jsx`: Xem hồ sơ và lịch sử chi tiêu khách hàng.
* **Tester / QA:** 
  - Kịch bản kiểm thử API tự động `verify_all_security_and_logic.js`.
  - Kiểm thử giao diện phản hồi trên mọi kích thước màn hình và chế độ Dark/Light Mode.

## 🚀 HƯỚNG DẪN KHỞI CHẠY ADMIN CMS
```bash
npm install
npm run dev
```
