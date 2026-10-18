-- =====================================================================
-- laptop_shop  |  SALES MODULE (migration bổ sung)  |  MySQL 8.0.16+
-- Chạy SAU file laptop_shop.sql (đã có roles, users, brands, categories,
-- products, product_specs, product_images, inventory_movements ...).
-- Chạy 1 lần duy nhất (các lệnh ALTER không idempotent).
--
-- Quy ước (giữ nhất quán với file gốc):
--   * Bảng số nhiều, snake_case; khóa chính `id` UNSIGNED AUTO_INCREMENT
--   * Bảng nghiệp vụ tăng nhanh (orders, order_details, carts...) dùng BIGINT
--   * Tiền VND: DECIMAL(15,0)      * Thời gian: DATETIME (UTC ở backend)
--   * Cờ true/false: TINYINT(1) is_*   * Trạng thái hữu hạn: ENUM
--   * Mọi bảng có created_at / updated_at (bảng lịch sử chỉ có created_at)
-- =====================================================================

USE laptop_shop;

-- ---------------------------------------------------------------------
-- 0. CHỈNH BẢNG CÓ SẴN
-- ---------------------------------------------------------------------

-- Khách hàng dùng chung bảng users với admin, phân biệt bằng role.
INSERT INTO roles (id, name, description) VALUES
 (5,'customer','Khách hàng mua hàng trên website'),
 (6,'order_manager','Xử lý đơn hàng: xác nhận, giao hàng, hủy, hoàn');

ALTER TABLE users
  ADD COLUMN email_verified_at DATETIME NULL AFTER phone,
  ADD COLUMN deleted_at        DATETIME NULL AFTER updated_at,
  ADD INDEX idx_users_role (role_id),
  ADD INDEX idx_users_deleted (deleted_at);

-- ---------------------------------------------------------------------
-- 1. ĐỊA CHỈ GIAO HÀNG CỦA KHÁCH
-- ---------------------------------------------------------------------
CREATE TABLE user_addresses (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  receiver_name  VARCHAR(100) NOT NULL,
  receiver_phone VARCHAR(20)  NOT NULL,
  province       VARCHAR(100) NOT NULL,            -- Tỉnh / Thành phố
  district       VARCHAR(100) NULL,                -- NULL với địa chỉ theo mô hình 2 cấp (đã bỏ cấp huyện)
  ward           VARCHAR(100) NOT NULL,            -- Phường / Xã
  address_line   VARCHAR(255) NOT NULL,            -- Số nhà, tên đường
  is_default     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at     DATETIME NULL,
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_addr_user (user_id, is_default)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. GIỎ HÀNG (mỗi user / mỗi khách vãng lai 1 giỏ)
-- ---------------------------------------------------------------------
CREATE TABLE carts (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NULL UNIQUE,          -- NULL = khách chưa đăng nhập
  session_token VARCHAR(64)  NULL UNIQUE,          -- định danh giỏ của khách vãng lai
  expires_at    DATETIME NULL,                     -- dọn giỏ guest hết hạn bằng job
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  -- Ràng buộc "user_id hoặc session_token phải có giá trị" do backend kiểm tra
  -- (MySQL không cho CHECK trên cột có FK ON DELETE).
) ENGINE=InnoDB;

CREATE TABLE cart_items (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cart_id     BIGINT UNSIGNED NOT NULL,
  product_id  INT UNSIGNED NOT NULL,
  quantity    SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ci_cart FOREIGN KEY (cart_id)    REFERENCES carts(id)    ON DELETE CASCADE,
  CONSTRAINT fk_ci_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT chk_ci_qty CHECK (quantity > 0),
  UNIQUE KEY uq_cart_product (cart_id, product_id)  -- thêm lại cùng SP => UPDATE quantity
) ENGINE=InnoDB;
-- Giỏ KHÔNG lưu giá: luôn lấy giá hiện hành từ products. Giá chỉ "đóng băng" khi tạo đơn.

-- ---------------------------------------------------------------------
-- 3. ĐƠN HÀNG
-- ---------------------------------------------------------------------
CREATE TABLE orders (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_code       VARCHAR(20)  NOT NULL UNIQUE,   -- mã hiển thị cho khách, vd LS260713-0001
  user_id          INT UNSIGNED NULL,              -- NULL = khách mua không đăng nhập
  idempotency_key  VARCHAR(64)  NULL UNIQUE,       -- chống bấm "Đặt hàng" 2 lần

  -- trạng thái
  status           ENUM('pending','confirmed','processing','shipping',
                        'delivered','completed','cancelled','returned')
                   NOT NULL DEFAULT 'pending',
  payment_status   ENUM('unpaid','paid','failed','refunded') NOT NULL DEFAULT 'unpaid',
  payment_method   VARCHAR(30)  NOT NULL DEFAULT 'cod',  -- cod | bank_transfer | vnpay | momo ... (VARCHAR để thêm cổng mới không cần ALTER)

  -- snapshot người đặt & người nhận (không phụ thuộc user_addresses bị sửa/xóa sau này)
  customer_name    VARCHAR(100) NOT NULL,
  customer_email   VARCHAR(150) NOT NULL,
  customer_phone   VARCHAR(20)  NOT NULL,
  receiver_name    VARCHAR(100) NOT NULL,
  receiver_phone   VARCHAR(20)  NOT NULL,
  province         VARCHAR(100) NOT NULL,
  district         VARCHAR(100) NULL,
  ward             VARCHAR(100) NOT NULL,
  address_line     VARCHAR(255) NOT NULL,

  -- tiền (VND). Giá sản phẩm đã gồm VAT.
  subtotal         DECIMAL(15,0) NOT NULL,         -- tổng (unit_price x quantity) các dòng
  discount_amount  DECIMAL(15,0) NOT NULL DEFAULT 0,
  shipping_fee     DECIMAL(15,0) NOT NULL DEFAULT 0,
  total_amount     DECIMAL(15,0) NOT NULL,         -- = subtotal - discount_amount + shipping_fee
  coupon_code      VARCHAR(50)   NULL,             -- chuẩn bị cho module khuyến mãi

  -- vận chuyển & ghi chú
  carrier          VARCHAR(50)  NULL,
  tracking_code    VARCHAR(60)  NULL,
  customer_note    VARCHAR(500) NULL,
  admin_note       VARCHAR(500) NULL,
  cancel_reason    VARCHAR(255) NULL,

  -- mốc thời gian
  placed_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at     DATETIME NULL,
  shipped_at       DATETIME NULL,
  delivered_at     DATETIME NULL,
  cancelled_at     DATETIME NULL,

  -- hệ thống
  version          INT UNSIGNED NOT NULL DEFAULT 1,  -- optimistic locking khi admin cập nhật đồng thời
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_ord_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_ord_money CHECK (subtotal >= 0 AND discount_amount >= 0 AND shipping_fee >= 0
                                  AND total_amount = subtotal - discount_amount + shipping_fee),
  INDEX idx_ord_user   (user_id, placed_at),
  INDEX idx_ord_status (status, placed_at),
  INDEX idx_ord_pay    (payment_status),
  INDEX idx_ord_phone  (customer_phone),
  INDEX idx_ord_placed (placed_at)
) ENGINE=InnoDB;

-- Tên bảng theo yêu cầu: OrderDetail -> order_details
CREATE TABLE order_details (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id        BIGINT UNSIGNED NOT NULL,
  product_id      INT UNSIGNED NOT NULL,

  -- snapshot sản phẩm tại thời điểm mua (sản phẩm đổi tên/giá/xóa mềm vẫn không ảnh hưởng đơn cũ)
  product_sku     VARCHAR(50)  NOT NULL,
  product_name    VARCHAR(255) NOT NULL,
  thumbnail_url   VARCHAR(255) NULL,

  quantity        SMALLINT UNSIGNED NOT NULL,
  original_price  DECIMAL(15,0) NOT NULL,          -- giá niêm yết lúc đặt (products.price)
  unit_price      DECIMAL(15,0) NOT NULL,          -- giá thực tính / 1 sp (sale_price nếu đang giảm)
  discount_amount DECIMAL(15,0) NOT NULL DEFAULT 0,-- giảm thêm trên cả dòng (coupon phân bổ)
  line_total      DECIMAL(15,0) GENERATED ALWAYS AS (unit_price * quantity - discount_amount) STORED,
  vat_rate        DECIMAL(4,2)  NOT NULL DEFAULT 10.00,
  cost_price      DECIMAL(15,0) NOT NULL DEFAULT 0,-- giá vốn lúc bán, dùng tính lãi (chỉ admin/kế toán xem)

  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_od_order FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  CONSTRAINT fk_od_prod  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT chk_od_qty   CHECK (quantity > 0),
  CONSTRAINT chk_od_price CHECK (unit_price >= 0 AND original_price >= unit_price AND discount_amount >= 0),
  UNIQUE KEY uq_od_order_prod (order_id, product_id),
  INDEX idx_od_prod (product_id)
) ENGINE=InnoDB;

-- Lịch sử đổi trạng thái đơn (ai đổi, khi nào, vì sao)
CREATE TABLE order_status_history (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id     BIGINT UNSIGNED NOT NULL,
  from_status  VARCHAR(20) NULL,
  to_status    VARCHAR(20) NOT NULL,
  note         VARCHAR(255) NULL,
  changed_by   INT UNSIGNED NULL,                  -- NULL = hệ thống / khách tự hủy
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_osh_order FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_osh_user  FOREIGN KEY (changed_by) REFERENCES users(id)  ON DELETE SET NULL,
  INDEX idx_osh_order (order_id, created_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. NỐI ĐƠN HÀNG VỚI KHO
-- Mỗi lần trừ/hoàn kho do đơn hàng sẽ ghi inventory_movements kèm order_id.
-- ---------------------------------------------------------------------
ALTER TABLE inventory_movements
  ADD COLUMN order_id BIGINT UNSIGNED NULL AFTER product_id,
  ADD CONSTRAINT fk_inv_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  ADD INDEX idx_inv_order (order_id);

-- ---------------------------------------------------------------------
-- 5. (TÙY CHỌN – SPRINT SAU) PHÂN QUYỀN CHI TIẾT
-- Hiện tại 1 user = 1 role qua users.role_id là đủ. Khi cần 1 user nhiều
-- role hoặc phân quyền theo từng hành động, bỏ comment khối dưới.
-- ---------------------------------------------------------------------
-- CREATE TABLE permissions (
--   id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
--   code  VARCHAR(80) NOT NULL UNIQUE,      -- vd: product.create, order.cancel
--   name  VARCHAR(150) NOT NULL
-- ) ENGINE=InnoDB;
-- CREATE TABLE role_permissions (
--   role_id       INT UNSIGNED NOT NULL,
--   permission_id INT UNSIGNED NOT NULL,
--   PRIMARY KEY (role_id, permission_id),
--   FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
--   FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB;
-- CREATE TABLE user_roles (
--   user_id INT UNSIGNED NOT NULL,
--   role_id INT UNSIGNED NOT NULL,
--   PRIMARY KEY (user_id, role_id),
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
--   FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB;
-- -- Migrate: INSERT INTO user_roles SELECT id, role_id FROM users;  rồi mới bỏ users.role_id.

-- ---------------------------------------------------------------------
-- 6. VIEW BÁO CÁO NHANH (dùng cho dashboard)
-- ---------------------------------------------------------------------
CREATE VIEW v_order_summary AS
SELECT o.id, o.order_code, o.user_id, o.customer_name, o.customer_phone,
       o.status, o.payment_status, o.payment_method,
       o.subtotal, o.discount_amount, o.shipping_fee, o.total_amount,
       (SELECT SUM(d.quantity) FROM order_details d WHERE d.order_id = o.id) AS total_items,
       o.placed_at, o.updated_at
FROM orders o;
