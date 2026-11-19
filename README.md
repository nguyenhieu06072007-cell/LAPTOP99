# Laptop99

Website bán laptop gồm cửa hàng cho khách, trang quản trị và API dùng chung. Đồ án học phần Phát triển ứng dụng Web, lớp N04, Đại học CMC. Giảng viên hướng dẫn Thầy Ngô Việt Anh.

## Khởi chạy và truy cập

Xem [hướng dẫn Docker](docs/DOCKER_HUONG_DAN.md) để nạp cơ sở dữ liệu và chạy các dịch vụ. Xem [hướng dẫn chấm bài](docs/HUONG_DAN_CHAM_BAI.md) để thử các vai trò trên dữ liệu mẫu.

| Dịch vụ | Địa chỉ khi chạy Docker |
| --- | --- |
| Cửa hàng khách hàng | [http://localhost:3000](http://localhost:3000) |
| Quản trị | [http://localhost:5173](http://localhost:5173) |
| Kiểm tra backend | [http://localhost:4000/health](http://localhost:4000/health) |

[PR cấu hình bảo mật Docker](https://github.com/nguyenhieu06072007-cell/LAPTOP99/pull/6) có mẫu biến môi trường và hướng dẫn cho bản sửa quyền đối soát.

## Cấu trúc mã nguồn

| Đường dẫn | Nội dung |
| --- | --- |
| [`index.html`](index.html) và [`storefront/`](storefront/) | Cửa hàng HTML/CSS/JavaScript. `index.html` nạp router, dịch vụ API, model, view và controller theo thứ tự. Các view đang dùng nằm trong `views/components/`, `views/layouts/` và `views/pages/`. |
| [`laptop-shop-admin/`](laptop-shop-admin/) | Trang quản trị React/Vite. `src/pages/` chia màn hình theo nghiệp vụ, `src/components/` chứa thành phần dùng chung và `src/api/` cấu hình gọi API. |
| [Backend Express](laptop-shop-admin-backend/laptop-shop-admin-backend/) | `src/server.js` khởi động API. `src/routes/` định tuyến, `src/controllers/` xử lý yêu cầu, `src/services/` xử lý nghiệp vụ và `src/models/` truy cập dữ liệu. |
| [`laptop_shop.sql`](laptop_shop.sql) | Lược đồ và dữ liệu mẫu MySQL cho lần khởi tạo đầu tiên. |
| [`uploads/`](uploads/) | Ảnh sản phẩm và nội dung phục vụ cửa hàng. |
| [`docs/`](docs/) | Hướng dẫn vận hành, chấm bài và tài liệu prompt của nhóm. |

Frontend và API được tích hợp trên `main`. Xem [phân công và đối chiếu nhánh thành viên](DONG_GOP_THANH_VIEN.md) để mở đúng nhánh, commit và thư mục cần xem.

## Kiểm tra trang quản trị

Từ thư mục `laptop-shop-admin/` chạy các lệnh sau:

```sh
npm ci
npm run build
npm test
```
