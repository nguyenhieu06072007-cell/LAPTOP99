# Phân công và đối chiếu nhánh thành viên Laptop99

Học phần Phát triển ứng dụng Web, lớp N04, Đại học CMC. Giảng viên hướng dẫn Thầy Ngô Việt Anh.

| Thành viên | Mã sinh viên | Công việc theo báo cáo | Nhánh |
| --- | --- | --- | --- |
| Nguyễn Văn Hiếu | BSE250019 | Kiến trúc backend, xác thực, phân quyền, API danh mục, hãng, sản phẩm và khung Admin | [`Nguyễn-Hiếu`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/tree/Nguy%E1%BB%85n-Hi%E1%BA%BFu) |
| Nguyễn Tiến Đạt | BSE250011 | Lược đồ và ràng buộc CSDL, kịch bản cập nhật, dữ liệu mẫu | [`Tien-Dat`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/tree/Tien-Dat) |
| Bùi Quang Huy | BIT252677 | API đơn hàng, kho, khách hàng, tiếp thị, dashboard và API Storefront | [`Bùi-Quang-Huy`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/tree/B%C3%B9i-Quang-Huy) |
| Nguyễn Đam Phong | BSE252331 | Storefront gồm trang chủ, danh mục, chi tiết, giỏ hàng và thanh toán | [`Nguyễn-Đam-Phong`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/tree/Nguy%E1%BB%85n-%C4%90am-Phong) |
| Trần Minh Đức | BSE252332 | Giao diện Admin vận hành đơn hàng, kho, hậu mãi, banner, khuyến mãi và kiểm thử | [`minh-đức`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/tree/minh-%C4%91%E1%BB%A9c) |

## Kết quả rà soát

Đối chiếu các tệp chính, commit riêng và bản tích hợp tại [`af00aca`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/tree/af00aca428891af49150945b55c0c8e067836985).

### Nguyễn Văn Hiếu

- Nhánh có backend lõi, `config/permissions.js`, controller xác thực, sản phẩm, hãng, danh mục và khung Admin. Các tệp lõi đã kiểm tra khớp bản tích hợp.
- Commit [`ccf7dc0`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/commit/ccf7dc0) giữ lại các thư mục thuộc phạm vi và thêm README. Mã ở hai thư mục Admin và backend có sẵn tại commit chung trước đó. Các tệp `AuthContext.jsx` và `ProductListPage.jsx` đã được cập nhật thêm trên bản tích hợp.

### Nguyễn Tiến Đạt

- Nhánh có `laptop_shop.sql` và chín tệp trong `scripts/`. Commit [`95dbfaf`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/commit/95dbfaf) đưa các script ra thư mục gốc để xem riêng. Các script tương ứng nằm trong `src/scripts/` của backend trên bản tích hợp.
- Tệp SQL có sẵn tại commit chung trước đó và đã thay đổi trên bản tích hợp. Dùng tệp SQL trên `main` để chạy ứng dụng hoàn chỉnh.

### Bùi Quang Huy

- Commit [`d3ce9af`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/commit/d3ce9af) tập hợp backend dưới `src/` ở gốc. Có controller đơn hàng, kho, khách hàng, khuyến mãi, banner, dashboard và API Storefront. Các controller đơn hàng, kho, khách hàng, khuyến mãi và banner đã kiểm tra khớp bản tích hợp.
- Commit [`e04dfa4`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/commit/e04dfa4) thêm một bản `client.controller.js` ở đường dẫn lồng nhau. Package ở gốc chạy `src/server.js`, nên bản ở đường dẫn lồng nhau nằm ngoài cây backend đang được package đó chạy. Xem sự khác biệt trước khi tích hợp bản sửa địa chỉ giao hàng.

### Nguyễn Đam Phong

- Nhánh có `index.html`, `storefront/` và `uploads/`. Có mã cho các trang khách hàng, giỏ hàng, thanh toán và chatbot. Commit [`0aa9ca5`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/commit/0aa9ca5) tách phần Storefront có sẵn thành nhánh xem riêng. Sau đó có commit riêng và các lần đồng bộ từ nhánh tích hợp.
- Bản checkout trên `main` có các cập nhật về tự động xác nhận VietQR nằm ngoài bản Storefront đang giữ ở nhánh này. Dùng bản tích hợp để demo thanh toán.

### Trần Minh Đức

- Commit [`722e152`](https://github.com/nguyenhieu06072007-cell/LAPTOP99/commit/722e152) tập hợp Admin dưới `src/` ở gốc. Có Kanban, nhập kho Excel, đánh giá, đổi trả, bảo hành, thu cũ, banner và khuyến mãi. Sáu màn hình được kiểm tra khớp bản tích hợp. Kanban và trang đánh giá có thay đổi tiếp trên bản tích hợp.
- Nhánh `minh-đức` chưa có tệp kiểm thử. Script `verify_all_security_and_logic.js` có trong backend của bản tích hợp và thư mục `scripts/` trên `Tien-Dat`. Lịch sử kiểm tra được chưa đủ để gán quyền tác giả script cho thành viên theo phần phân công QA.

Nhánh thành viên là bản trích theo mảng công việc. Để chấm đóng góp cá nhân, dùng phần phân công cùng với diff của commit và minh chứng do thành viên cung cấp.
