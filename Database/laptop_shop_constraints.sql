-- =====================================================================
-- laptop_shop  |  RÀNG BUỘC TOÀN VẸN DỮ LIỆU  |  MySQL 8.0.16+
-- Thứ tự chạy:  1) laptop_shop.sql
--               2) laptop_shop_sales_schema.sql
--               3) laptop_shop_constraints.sql   (file này, chạy 1 lần)
--
-- NGUYÊN TẮC XÓA / SỬA
--   R1. Không hard-delete dữ liệu nghiệp vụ: user, product, order dùng
--       xóa mềm (deleted_at) hoặc đổi trạng thái (cancelled).
--   R2. FK trỏ tới dữ liệu "đã phát sinh giao dịch" => RESTRICT
--       (DB từ chối xóa, buộc backend xử lý có chủ ý).
--   R3. CASCADE chỉ dùng cho dữ liệu "thuộc sở hữu" của cha và không có
--       giá trị riêng: product_specs, product_images, user_addresses,
--       carts, cart_items.
--   R4. SET NULL không còn được dùng: nó âm thầm làm mất liên kết.
--   R5. Khóa chính (id) không bao giờ UPDATE => ON UPDATE = RESTRICT.
--   R6. Sổ cái (inventory_movements, price_history, order_status_history,
--       audit_logs) chỉ INSERT, không sửa/xóa.
--
-- Cần quyền tạo trigger. Nếu bật binary log mà gặp lỗi 1419, chạy:
--   SET GLOBAL log_bin_trust_function_creators = 1;   (hoặc cấp SUPER)
-- Lưu ý: InnoDB coi NO ACTION và RESTRICT là một; script viết RESTRICT
-- tường minh cho dễ đọc.
-- =====================================================================

USE laptop_shop;

-- ---------------------------------------------------------------------
-- 0. DỌN DỮ LIỆU MẪU VI PHẠM QUY TẮC MỚI
-- Sản phẩm id=41 (stock=0, sold=0) bị file gốc ghi 1 dòng nhập kho số
-- lượng 0, vi phạm "quantity <> 0" bên dưới. Phải xóa TRƯỚC khi tạo trigger
-- chặn xóa sổ kho.
-- ---------------------------------------------------------------------
DELETE FROM inventory_movements WHERE quantity = 0;

-- ---------------------------------------------------------------------
-- 1. KHÓA NGOẠI: viết lại các quy tắc xóa / sửa
-- (DROP cũ + ADD mới cùng một câu lệnh để không có khoảng hở không có FK)
-- ---------------------------------------------------------------------

-- Product - Category / Brand: không xóa được danh mục/hãng còn sản phẩm.
-- Danh mục cha còn con: không xóa được (trước đây SET NULL làm con "nhảy" lên gốc).
ALTER TABLE categories
  DROP FOREIGN KEY fk_cat_parent,
  ADD CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id)
      ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE products
  DROP FOREIGN KEY fk_prod_brand,
  DROP FOREIGN KEY fk_prod_cat,
  DROP FOREIGN KEY fk_prod_user,
  ADD CONSTRAINT fk_products_brand      FOREIGN KEY (brand_id)    REFERENCES brands(id)     ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_products_category   FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_products_created_by FOREIGN KEY (created_by)  REFERENCES users(id)      ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Order - User: user đã có đơn thì không xóa được (chỉ xóa mềm). user_id NULL = khách vãng lai.
ALTER TABLE orders
  DROP FOREIGN KEY fk_ord_user,
  ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE RESTRICT ON UPDATE RESTRICT;

-- OrderDetail - Order / Product: đơn có dòng hàng thì không xóa được; sản phẩm đã bán thì không xóa được.
ALTER TABLE order_details
  DROP FOREIGN KEY fk_od_order,
  DROP FOREIGN KEY fk_od_prod,
  ADD CONSTRAINT fk_order_details_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_order_details_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE order_status_history
  DROP FOREIGN KEY fk_osh_order,
  DROP FOREIGN KEY fk_osh_user,
  ADD CONSTRAINT fk_order_status_history_order      FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_order_status_history_changed_by FOREIGN KEY (changed_by) REFERENCES users(id)  ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Sổ kho: giữ nguyên lịch sử, không để mất liên kết tới đơn / người thao tác.
ALTER TABLE inventory_movements
  DROP FOREIGN KEY fk_inv_order,
  DROP FOREIGN KEY fk_inv_user,
  ADD CONSTRAINT fk_inventory_movements_order      FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_inventory_movements_created_by FOREIGN KEY (created_by) REFERENCES users(id)  ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Lịch sử giá: trước đây changed_by KHÔNG có FK => thêm; product_id CASCADE -> RESTRICT.
ALTER TABLE price_history
  DROP FOREIGN KEY fk_ph_prod,
  ADD CONSTRAINT fk_price_history_product    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_price_history_changed_by FOREIGN KEY (changed_by) REFERENCES users(id)    ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Giữ nguyên (đúng quy tắc R3, CASCADE vì dữ liệu thuộc sở hữu của cha):
--   product_specs.product_id, product_images.product_id -> products
--   user_addresses.user_id, carts.user_id -> users
--   cart_items.cart_id -> carts, cart_items.product_id -> products
-- Giữ nguyên (RESTRICT mặc định): users.role_id -> roles
-- audit_logs.user_id cố ý KHÔNG có FK: log phải tồn tại độc lập với user.

-- ---------------------------------------------------------------------
-- 2. CHECK CONSTRAINTS
-- ---------------------------------------------------------------------

ALTER TABLE users
  ADD CONSTRAINT chk_users_name  CHECK (CHAR_LENGTH(TRIM(full_name)) > 0),
  ADD CONSTRAINT chk_users_email CHECK (REGEXP_LIKE(email, '^[^@ ]+@[^@ ]+[.][^@ ]+$')),
  ADD CONSTRAINT chk_users_phone CHECK (REGEXP_LIKE(phone, '^[+]?[0-9 .()-]{8,20}$')),
  ADD CONSTRAINT chk_users_hash  CHECK (CHAR_LENGTH(password_hash) > 0);

ALTER TABLE brands
  ADD CONSTRAINT chk_brands_name CHECK (CHAR_LENGTH(TRIM(name)) > 0),
  ADD CONSTRAINT chk_brands_slug CHECK (REGEXP_LIKE(slug, '^[a-z0-9]+(-[a-z0-9]+)*$', 'c'));

-- Không CHECK parent_id <> id ở đây vì MySQL cấm CHECK trên cột có FK; dùng trigger (mục 3).
ALTER TABLE categories
  ADD CONSTRAINT chk_cat_name CHECK (CHAR_LENGTH(TRIM(name)) > 0),
  ADD CONSTRAINT chk_cat_slug CHECK (REGEXP_LIKE(slug, '^[a-z0-9]+(-[a-z0-9]+)*$', 'c'));

ALTER TABLE products
  ADD CONSTRAINT chk_prod_name        CHECK (CHAR_LENGTH(TRIM(name)) > 0),
  ADD CONSTRAINT chk_prod_sku         CHECK (REGEXP_LIKE(sku, '^[A-Za-z0-9._-]+$')),
  ADD CONSTRAINT chk_prod_barcode     CHECK (REGEXP_LIKE(barcode, '^[0-9]{8,14}$')),
  ADD CONSTRAINT chk_prod_slug        CHECK (REGEXP_LIKE(slug, '^[a-z0-9]+(-[a-z0-9]+)*$', 'c')),
  ADD CONSTRAINT chk_prod_cost        CHECK (cost_price >= 0),
  ADD CONSTRAINT chk_prod_vat         CHECK (vat_rate BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_prod_condition   CHECK (condition_percent BETWEEN 1 AND 100
                                             AND (condition_type <> 'new' OR condition_percent = 100)),
  ADD CONSTRAINT chk_prod_threshold   CHECK (low_stock_threshold >= 0),
  ADD CONSTRAINT chk_prod_warranty    CHECK (warranty_months <= 120),
  ADD CONSTRAINT chk_prod_sale_window CHECK ((sale_start IS NULL AND sale_end IS NULL)
                                             OR (sale_price IS NOT NULL
                                                 AND (sale_start IS NULL OR sale_end IS NULL OR sale_end > sale_start))),
  ADD CONSTRAINT chk_prod_deleted     CHECK (deleted_at IS NULL OR status IN ('hidden','discontinued'));

ALTER TABLE product_specs
  ADD CONSTRAINT chk_spec_cpu     CHECK ((cpu_cores IS NULL OR cpu_cores > 0)
                                         AND (cpu_threads IS NULL OR cpu_cores IS NULL OR cpu_threads >= cpu_cores)),
  ADD CONSTRAINT chk_spec_ram     CHECK ((ram_gb IS NULL OR ram_gb > 0)
                                         AND (ram_max_gb IS NULL OR ram_gb IS NULL OR ram_max_gb >= ram_gb)),
  ADD CONSTRAINT chk_spec_storage CHECK (storage_gb IS NULL OR storage_gb > 0),
  ADD CONSTRAINT chk_spec_screen  CHECK ((screen_size_inch IS NULL OR screen_size_inch BETWEEN 5 AND 25)
                                         AND (refresh_rate_hz IS NULL OR refresh_rate_hz BETWEEN 30 AND 540)),
  ADD CONSTRAINT chk_spec_power   CHECK ((battery_wh IS NULL OR battery_wh > 0)
                                         AND (charger_w IS NULL OR charger_w > 0)
                                         AND (weight_kg IS NULL OR weight_kg > 0));

ALTER TABLE user_addresses
  ADD CONSTRAINT chk_addr_text  CHECK (CHAR_LENGTH(TRIM(receiver_name)) > 0 AND CHAR_LENGTH(TRIM(address_line)) > 0),
  ADD CONSTRAINT chk_addr_phone CHECK (REGEXP_LIKE(receiver_phone, '^[+]?[0-9 .()-]{8,20}$'));

ALTER TABLE orders
  ADD CONSTRAINT chk_ord_code   CHECK (REGEXP_LIKE(order_code, '^[A-Z0-9-]{6,20}$', 'c')),
  ADD CONSTRAINT chk_ord_method CHECK (REGEXP_LIKE(payment_method, '^[a-z0-9_]+$', 'c')),
  ADD CONSTRAINT chk_ord_email  CHECK (REGEXP_LIKE(customer_email, '^[^@ ]+@[^@ ]+[.][^@ ]+$')),
  ADD CONSTRAINT chk_ord_phones CHECK (REGEXP_LIKE(customer_phone, '^[+]?[0-9 .()-]{8,20}$')
                                       AND REGEXP_LIKE(receiver_phone, '^[+]?[0-9 .()-]{8,20}$')),
  ADD CONSTRAINT chk_ord_names  CHECK (CHAR_LENGTH(TRIM(customer_name)) > 0 AND CHAR_LENGTH(TRIM(receiver_name)) > 0
                                       AND CHAR_LENGTH(TRIM(address_line)) > 0),
  -- mốc thời gian phải khớp với trạng thái
  ADD CONSTRAINT chk_ord_cancelled CHECK ((cancelled_at IS NOT NULL) = (status = 'cancelled')),
  ADD CONSTRAINT chk_ord_confirmed CHECK (status IN ('pending','cancelled') OR confirmed_at IS NOT NULL),
  ADD CONSTRAINT chk_ord_shipped   CHECK (status NOT IN ('shipping','delivered','completed') OR shipped_at IS NOT NULL),
  ADD CONSTRAINT chk_ord_delivered CHECK (status NOT IN ('delivered','completed') OR delivered_at IS NOT NULL),
  ADD CONSTRAINT chk_ord_time      CHECK (shipped_at IS NULL OR delivered_at IS NULL OR delivered_at >= shipped_at);

ALTER TABLE order_details
  ADD CONSTRAINT chk_od_text CHECK (CHAR_LENGTH(TRIM(product_sku)) > 0 AND CHAR_LENGTH(TRIM(product_name)) > 0),
  ADD CONSTRAINT chk_od_vat  CHECK (vat_rate BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_od_cost CHECK (cost_price >= 0),
  ADD CONSTRAINT chk_od_disc CHECK (discount_amount <= unit_price * quantity);   -- line_total không âm

-- Sổ kho: dấu của quantity phải đúng loại; tồn sau = tồn trước + quantity.
ALTER TABLE inventory_movements
  ADD CONSTRAINT chk_inv_sign  CHECK ((type IN ('import','return') AND quantity > 0)
                                      OR (type = 'export' AND quantity < 0)
                                      OR (type = 'adjust' AND quantity <> 0)),
  ADD CONSTRAINT chk_inv_stock CHECK (stock_before >= 0 AND stock_after >= 0 AND stock_after = stock_before + quantity),
  ADD CONSTRAINT chk_inv_cost  CHECK (unit_cost IS NULL OR unit_cost >= 0);

ALTER TABLE price_history
  ADD CONSTRAINT chk_ph_price CHECK (new_price > 0 AND (old_price IS NULL OR old_price > 0)),
  ADD CONSTRAINT chk_ph_sale  CHECK ((new_sale IS NULL OR (new_sale > 0 AND new_sale < new_price))
                                     AND (old_sale IS NULL OR old_sale > 0));

-- ---------------------------------------------------------------------
-- 3. TRIGGER (các quy tắc CHECK/FK không biểu diễn được)
-- ---------------------------------------------------------------------
DELIMITER $$

-- 3.1 Danh mục: không tự làm cha của chính mình, không tạo vòng lặp cha-con.
CREATE TRIGGER trg_categories_bu BEFORE UPDATE ON categories FOR EACH ROW
BEGIN
  DECLARE cur   INT UNSIGNED;
  DECLARE depth INT DEFAULT 0;
  IF NEW.parent_id IS NOT NULL AND NOT (NEW.parent_id <=> OLD.parent_id) THEN
    IF NEW.parent_id = NEW.id THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'categories: a category cannot be its own parent';
    END IF;
    SET cur = NEW.parent_id;
    WHILE cur IS NOT NULL AND depth < 20 DO
      SELECT parent_id INTO cur FROM categories WHERE id = cur;
      IF cur = NEW.id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'categories: parent/child cycle detected';
      END IF;
      SET depth = depth + 1;
    END WHILE;
  END IF;
END$$

-- 3.2 Đơn hàng luôn được tạo ở trạng thái pending.
CREATE TRIGGER trg_orders_bi BEFORE INSERT ON orders FOR EACH ROW
BEGIN
  IF NEW.status <> 'pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'orders: a new order must start as pending';
  END IF;
END$$

-- 3.3 Đơn hàng: máy trạng thái hợp lệ + đóng băng dữ liệu tiền sau khi rời pending.
CREATE TRIGGER trg_orders_bu BEFORE UPDATE ON orders FOR EACH ROW
BEGIN
  IF NEW.id <> OLD.id OR NEW.order_code <> OLD.order_code THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'orders: id and order_code are immutable';
  END IF;

  IF NEW.status <> OLD.status THEN
    IF NOT (   (OLD.status = 'pending'    AND NEW.status IN ('confirmed','cancelled'))
            OR (OLD.status = 'confirmed'  AND NEW.status IN ('processing','cancelled'))
            OR (OLD.status = 'processing' AND NEW.status IN ('shipping','cancelled'))
            OR (OLD.status = 'shipping'   AND NEW.status IN ('delivered','returned'))
            OR (OLD.status = 'delivered'  AND NEW.status IN ('completed','returned'))
            OR (OLD.status = 'completed'  AND NEW.status = 'returned')) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'orders: invalid status transition';
    END IF;
  END IF;

  IF OLD.status <> 'pending' THEN
    IF NEW.subtotal <> OLD.subtotal OR NEW.discount_amount <> OLD.discount_amount
       OR NEW.shipping_fee <> OLD.shipping_fee OR NEW.total_amount <> OLD.total_amount
       OR NOT (NEW.user_id <=> OLD.user_id) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'orders: amounts and owner are frozen once the order leaves pending';
    END IF;
  END IF;
END$$

-- 3.4 Dòng hàng chỉ được thêm/sửa/xóa khi đơn còn pending.
CREATE TRIGGER trg_order_details_bi BEFORE INSERT ON order_details FOR EACH ROW
BEGIN
  DECLARE s VARCHAR(20) DEFAULT NULL;
  SELECT status INTO s FROM orders WHERE id = NEW.order_id;
  IF s IS NULL OR s <> 'pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order_details: order not found or not pending';
  END IF;
END$$

CREATE TRIGGER trg_order_details_bu BEFORE UPDATE ON order_details FOR EACH ROW
BEGIN
  DECLARE s VARCHAR(20) DEFAULT NULL;
  SELECT status INTO s FROM orders WHERE id = OLD.order_id;
  IF NEW.order_id <> OLD.order_id OR NEW.product_id <> OLD.product_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order_details: order_id and product_id are immutable';
  END IF;
  IF s IS NULL OR s <> 'pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order_details: order is no longer pending';
  END IF;
END$$

CREATE TRIGGER trg_order_details_bd BEFORE DELETE ON order_details FOR EACH ROW
BEGIN
  DECLARE s VARCHAR(20) DEFAULT NULL;
  SELECT status INTO s FROM orders WHERE id = OLD.order_id;
  IF s IS NULL OR s <> 'pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order_details: order is no longer pending';
  END IF;
END$$

DELIMITER ;

-- 3.5 Sổ cái chỉ INSERT (R6)
CREATE TRIGGER trg_inv_bu BEFORE UPDATE ON inventory_movements FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'inventory_movements is append-only';
CREATE TRIGGER trg_inv_bd BEFORE DELETE ON inventory_movements FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'inventory_movements is append-only';

CREATE TRIGGER trg_ph_bu BEFORE UPDATE ON price_history FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'price_history is append-only';
CREATE TRIGGER trg_ph_bd BEFORE DELETE ON price_history FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'price_history is append-only';

CREATE TRIGGER trg_osh_bu BEFORE UPDATE ON order_status_history FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order_status_history is append-only';
CREATE TRIGGER trg_osh_bd BEFORE DELETE ON order_status_history FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order_status_history is append-only';

-- audit_logs: cấm sửa; vẫn cho xóa để dọn log theo chính sách lưu trữ.
CREATE TRIGGER trg_audit_bu BEFORE UPDATE ON audit_logs FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs cannot be modified';

-- ---------------------------------------------------------------------
-- 4. NHỮNG QUY TẮC DB KHÔNG ÉP ĐƯỢC (backend bắt buộc làm + QA kiểm bằng
--    các truy vấn đối soát trong laptop_shop_constraint_tests.sql)
--   * Mỗi user tối đa 1 địa chỉ is_default=1; mỗi sản phẩm tối đa 1 ảnh is_thumbnail=1
--   * Giỏ phải có user_id hoặc session_token
--   * orders.subtotal = SUM(unit_price*quantity); orders.discount_amount = SUM(line discount)
--   * Trừ/hoàn kho + ghi inventory_movements trong CÙNG transaction với đổi trạng thái đơn
--   * Sản phẩm đã xóa mềm / hết hàng không được thêm vào giỏ hoặc đơn mới
-- ---------------------------------------------------------------------
