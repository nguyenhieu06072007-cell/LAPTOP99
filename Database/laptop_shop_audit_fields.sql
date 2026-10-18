-- =====================================================================
-- laptop_shop  |  TRƯỜNG AUDIT THỐNG NHẤT  |  MySQL 8.0.16+
-- Thứ tự chạy: 1) laptop_shop.sql  2) laptop_shop_sales_schema.sql
--              3) laptop_shop_constraints.sql  4) file này (chạy 1 lần)
--
-- ÁNH XẠ TÊN
--   API / ORM (camelCase)   Cột DB (snake_case)
--   createDate           -> created_at     DATETIME  NOT NULL
--   updateDate           -> updated_at     DATETIME  NOT NULL
--   createBy             -> created_by     INT UNSIGNED NULL, FK users(id)
--   updateBy             -> updated_by     INT UNSIGNED NULL, FK users(id)
--   (DB giữ snake_case cho đồng nhất với toàn schema; backend ánh xạ sang camelCase.)
--
-- PHẠM VI
--   Đủ 4 trường : roles, users, brands, categories, products, product_specs,
--                 product_images, user_addresses, orders, order_details
--   Chỉ created_*: inventory_movements, price_history, order_status_history
--                 (sổ cái append-only, không bao giờ sửa)
--   Không áp dụng: carts, cart_items (dữ liệu tạm, chủ sở hữu = carts.user_id);
--                  audit_logs (chính là nhật ký; user_id = actor)
--
-- QUY ƯỚC GHI (ai ghi, khi nào)
--   created_at : DB tự điền (DEFAULT CURRENT_TIMESTAMP, giờ UTC). Backend KHÔNG ghi. Bất biến.
--   updated_at : DB tự cập nhật (ON UPDATE CURRENT_TIMESTAMP) khi có cột nào đổi giá trị.
--                Backend KHÔNG ghi. UPDATE không đổi gì thì updated_at không đổi.
--   created_by : BACKEND ghi 1 lần lúc INSERT = id user đang đăng nhập (lấy từ token xác thực,
--                không bao giờ nhận từ body request). Bất biến (trigger chặn).
--   updated_by : BACKEND ghi trong MỌI câu UPDATE = id user đang đăng nhập.
--                Lúc INSERT nếu không truyền, trigger tự đặt = created_by.
--   Actor không phải người dùng (job, webhook thanh toán, khách vãng lai, tự đăng ký)
--   dùng tài khoản 'system' (users.email = 'system@laptopshop.local', role 'system').
--   Vì vậy created_by / updated_by = NULL chỉ còn nghĩa "dữ liệu cũ chưa rõ nguồn" và bị
--   truy vấn đối soát cảnh báo.
--   Xóa mềm: UPDATE deleted_at + updated_by => updated_by chính là người xóa.
--   Cùng 1 transaction nghiệp vụ (đơn + dòng hàng + sổ kho + lịch sử) dùng CÙNG 1 actor.
--   Audit columns trả lời "ai chạm lần đầu / lần cuối, khi nào"; audit_logs trả lời
--   "đã đổi gì" (old_values/new_values) cho các thao tác nhạy cảm.
-- Giờ UTC: mọi kết nối backend phải chạy  SET time_zone = '+00:00'  (DATETIME không tự đổi múi giờ).
-- =====================================================================

USE laptop_shop;

-- ---------------------------------------------------------------------
-- 1. THÊM CỘT AUDIT + KHÓA NGOẠI TỚI users (RESTRICT, theo quy tắc R2)
-- ---------------------------------------------------------------------
ALTER TABLE roles
  ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN created_by INT UNSIGNED NULL AFTER created_at,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_by,
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER updated_at,
  ADD CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_roles_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE users
  ADD COLUMN created_by INT UNSIGNED NULL AFTER created_at,
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER updated_at,
  ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE brands
  ADD COLUMN created_by INT UNSIGNED NULL AFTER created_at,
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER updated_at,
  ADD CONSTRAINT fk_brands_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_brands_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE categories
  ADD COLUMN created_by INT UNSIGNED NULL AFTER created_at,
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER updated_at,
  ADD CONSTRAINT fk_categories_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_categories_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE products
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER updated_at,
  ADD CONSTRAINT fk_products_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD INDEX idx_products_updated_at (updated_at);
ALTER TABLE product_specs
  ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN created_by INT UNSIGNED NULL AFTER created_at,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_by,
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER updated_at,
  ADD CONSTRAINT fk_product_specs_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_product_specs_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE product_images
  ADD COLUMN created_by INT UNSIGNED NULL AFTER created_at,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_by,
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER updated_at,
  ADD CONSTRAINT fk_product_images_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_product_images_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE user_addresses
  ADD COLUMN created_by INT UNSIGNED NULL AFTER created_at,
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER updated_at,
  ADD CONSTRAINT fk_user_addresses_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_user_addresses_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE orders
  ADD COLUMN created_by INT UNSIGNED NULL AFTER created_at,
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER updated_at,
  ADD CONSTRAINT fk_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_orders_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD INDEX idx_orders_updated_at (updated_at);
ALTER TABLE order_details
  ADD COLUMN created_by INT UNSIGNED NULL AFTER created_at,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_by,
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER updated_at,
  ADD CONSTRAINT fk_order_details_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_order_details_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Bảng sổ cái (append-only) chỉ cần created_at + created_by -> đổi tên cho đồng nhất.
-- inventory_movements đã đúng chuẩn (created_at, created_by).
ALTER TABLE price_history DROP FOREIGN KEY fk_price_history_changed_by;
ALTER TABLE price_history
  RENAME COLUMN changed_by TO created_by,
  RENAME COLUMN changed_at TO created_at;
ALTER TABLE price_history
  ADD CONSTRAINT fk_price_history_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE order_status_history DROP FOREIGN KEY fk_order_status_history_changed_by;
ALTER TABLE order_status_history RENAME COLUMN changed_by TO created_by;
ALTER TABLE order_status_history
  ADD CONSTRAINT fk_order_status_history_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- ---------------------------------------------------------------------
-- 2. TÀI KHOẢN HỆ THỐNG (actor cho job, webhook, khách vãng lai, tự đăng ký)
-- ---------------------------------------------------------------------
SET @seed_admin = (SELECT id FROM users WHERE email = 'admin@laptopshop.vn');

INSERT INTO roles (name, description, created_by, updated_by)
VALUES ('system', 'Actor cho tiến trình tự động, webhook, khách vãng lai. Không đăng nhập được.', @seed_admin, @seed_admin);

INSERT INTO users (role_id, full_name, email, password_hash, status, created_by, updated_by)
SELECT id, 'System', 'system@laptopshop.local', '!', 'locked', @seed_admin, @seed_admin
FROM roles WHERE name = 'system';

SET @system_user = (SELECT id FROM users WHERE email = 'system@laptopshop.local');

-- ---------------------------------------------------------------------
-- 3. BACKFILL DỮ LIỆU CŨ (phải chạy TRƯỚC khi tạo trigger bất biến ở mục 4)
-- "updated_at = updated_at" để câu UPDATE không làm nhảy mốc cập nhật.
-- Dữ liệu mẫu do admin nhập => created_by/updated_by = admin.
-- ---------------------------------------------------------------------
UPDATE roles          SET created_by = @seed_admin, updated_by = @seed_admin, updated_at = updated_at WHERE created_by IS NULL AND name <> 'system';
UPDATE brands         SET created_by = @seed_admin, updated_by = @seed_admin, updated_at = updated_at WHERE created_by IS NULL;
UPDATE categories     SET created_by = @seed_admin, updated_by = @seed_admin, updated_at = updated_at WHERE created_by IS NULL;
UPDATE product_specs  SET created_by = @seed_admin, updated_by = @seed_admin, updated_at = updated_at WHERE created_by IS NULL;
UPDATE product_images SET created_by = @seed_admin, updated_by = @seed_admin, updated_at = updated_at WHERE created_by IS NULL;
UPDATE products       SET updated_by = COALESCE(created_by, @seed_admin), updated_at = updated_at WHERE updated_by IS NULL;
-- Tài khoản admin được tạo bởi tiến trình seed => actor là system.
UPDATE users          SET created_by = @system_user, updated_by = @system_user, updated_at = updated_at WHERE id = @seed_admin;

-- ---------------------------------------------------------------------
-- 4. TRIGGER GUARD RAIL
--   BI: updated_by mặc định = created_by khi tạo mới (lúc tạo, "lần chạm cuối" = người tạo).
--   BU: created_at / created_by bất biến.
--   (updated_at do DB tự cập nhật; updated_by do BACKEND ghi, xem quy ước đầu file)
-- ---------------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER trg_roles_audit_bi BEFORE INSERT ON roles FOR EACH ROW
BEGIN
  SET NEW.updated_by = COALESCE(NEW.updated_by, NEW.created_by);
END$$

CREATE TRIGGER trg_roles_audit_bu BEFORE UPDATE ON roles FOR EACH ROW
BEGIN
  IF NOT (NEW.created_at <=> OLD.created_at) OR NOT (NEW.created_by <=> OLD.created_by) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'roles: created_at and created_by are immutable';
  END IF;
END$$

CREATE TRIGGER trg_users_audit_bi BEFORE INSERT ON users FOR EACH ROW
BEGIN
  SET NEW.updated_by = COALESCE(NEW.updated_by, NEW.created_by);
END$$

CREATE TRIGGER trg_users_audit_bu BEFORE UPDATE ON users FOR EACH ROW
BEGIN
  IF NOT (NEW.created_at <=> OLD.created_at) OR NOT (NEW.created_by <=> OLD.created_by) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'users: created_at and created_by are immutable';
  END IF;
END$$

CREATE TRIGGER trg_brands_audit_bi BEFORE INSERT ON brands FOR EACH ROW
BEGIN
  SET NEW.updated_by = COALESCE(NEW.updated_by, NEW.created_by);
END$$

CREATE TRIGGER trg_brands_audit_bu BEFORE UPDATE ON brands FOR EACH ROW
BEGIN
  IF NOT (NEW.created_at <=> OLD.created_at) OR NOT (NEW.created_by <=> OLD.created_by) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'brands: created_at and created_by are immutable';
  END IF;
END$$

CREATE TRIGGER trg_categories_audit_bi BEFORE INSERT ON categories FOR EACH ROW
BEGIN
  SET NEW.updated_by = COALESCE(NEW.updated_by, NEW.created_by);
END$$

CREATE TRIGGER trg_categories_audit_bu BEFORE UPDATE ON categories FOR EACH ROW
BEGIN
  IF NOT (NEW.created_at <=> OLD.created_at) OR NOT (NEW.created_by <=> OLD.created_by) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'categories: created_at and created_by are immutable';
  END IF;
END$$

CREATE TRIGGER trg_products_audit_bi BEFORE INSERT ON products FOR EACH ROW
BEGIN
  SET NEW.updated_by = COALESCE(NEW.updated_by, NEW.created_by);
END$$

CREATE TRIGGER trg_products_audit_bu BEFORE UPDATE ON products FOR EACH ROW
BEGIN
  IF NOT (NEW.created_at <=> OLD.created_at) OR NOT (NEW.created_by <=> OLD.created_by) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'products: created_at and created_by are immutable';
  END IF;
END$$

CREATE TRIGGER trg_product_specs_audit_bi BEFORE INSERT ON product_specs FOR EACH ROW
BEGIN
  SET NEW.updated_by = COALESCE(NEW.updated_by, NEW.created_by);
END$$

CREATE TRIGGER trg_product_specs_audit_bu BEFORE UPDATE ON product_specs FOR EACH ROW
BEGIN
  IF NOT (NEW.created_at <=> OLD.created_at) OR NOT (NEW.created_by <=> OLD.created_by) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'product_specs: created_at and created_by are immutable';
  END IF;
END$$

CREATE TRIGGER trg_product_images_audit_bi BEFORE INSERT ON product_images FOR EACH ROW
BEGIN
  SET NEW.updated_by = COALESCE(NEW.updated_by, NEW.created_by);
END$$

CREATE TRIGGER trg_product_images_audit_bu BEFORE UPDATE ON product_images FOR EACH ROW
BEGIN
  IF NOT (NEW.created_at <=> OLD.created_at) OR NOT (NEW.created_by <=> OLD.created_by) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'product_images: created_at and created_by are immutable';
  END IF;
END$$

CREATE TRIGGER trg_user_addresses_audit_bi BEFORE INSERT ON user_addresses FOR EACH ROW
BEGIN
  SET NEW.updated_by = COALESCE(NEW.updated_by, NEW.created_by);
END$$

CREATE TRIGGER trg_user_addresses_audit_bu BEFORE UPDATE ON user_addresses FOR EACH ROW
BEGIN
  IF NOT (NEW.created_at <=> OLD.created_at) OR NOT (NEW.created_by <=> OLD.created_by) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'user_addresses: created_at and created_by are immutable';
  END IF;
END$$

CREATE TRIGGER trg_orders_audit_bi BEFORE INSERT ON orders FOR EACH ROW
BEGIN
  SET NEW.updated_by = COALESCE(NEW.updated_by, NEW.created_by);
END$$

CREATE TRIGGER trg_orders_audit_bu BEFORE UPDATE ON orders FOR EACH ROW
BEGIN
  IF NOT (NEW.created_at <=> OLD.created_at) OR NOT (NEW.created_by <=> OLD.created_by) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'orders: created_at and created_by are immutable';
  END IF;
END$$

CREATE TRIGGER trg_order_details_audit_bi BEFORE INSERT ON order_details FOR EACH ROW
BEGIN
  SET NEW.updated_by = COALESCE(NEW.updated_by, NEW.created_by);
END$$

CREATE TRIGGER trg_order_details_audit_bu BEFORE UPDATE ON order_details FOR EACH ROW
BEGIN
  IF NOT (NEW.created_at <=> OLD.created_at) OR NOT (NEW.created_by <=> OLD.created_by) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order_details: created_at and created_by are immutable';
  END IF;
END$$

DELIMITER ;
