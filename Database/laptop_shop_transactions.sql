-- =====================================================================
-- laptop_shop  |  TRANSACTION CHỐNG RACE CONDITION (bản khớp schema thật)  |  MySQL 8.0.16+
-- Thứ tự chạy: 1) laptop_shop.sql  2) laptop_shop_sales_schema.sql
--              3) laptop_shop_constraints.sql  4) laptop_shop_audit_fields.sql
--              5) laptop_shop_product_status.sql
--              6) file này (chạy 1 lần: có ALTER TABLE)
--
-- DÙNG LẠI những gì schema đã có (không tạo bảng trùng):
--   users (khách = role customer; user_id NULL = khách vãng lai) | orders | order_details
--   order_status_history | inventory_movements.order_id | products.version, sold_count
-- THÊM MỚI (tối thiểu):
--   products.reserved_quantity      số lượng đang bị đơn 'pending' giữ chỗ
--   orders.expires_at               hạn giữ hàng của đơn pending (NULL = không hết hạn, vd COD)
--   payment_transactions            sổ ghi giao dịch tiền, chống webhook gọi lặp
--   order_code_counters             bộ đếm mã đơn theo ngày (LS260713-0001)
--
-- NGUYÊN TẮC
--  1. Kiểm tra + cập nhật kho trong CÙNG 1 câu UPDATE rồi xét ROW_COUNT(); không "đọc rồi ghi" ở backend.
--  2. Tạo đơn  => GIỮ HÀNG  (reserved_quantity += qty). Đơn pending không đụng stock_quantity.
--     Xác nhận => TRỪ KHO THẬT (stock -= qty, reserved -= qty) + ghi inventory_movements 'export'.
--     Hủy đơn pending => nhả giữ hàng. Hủy đơn confirmed/processing => hoàn kho + movement 'return'.
--  3. Thứ tự khóa cố định: orders trước, rồi products theo product_id tăng dần => không deadlock.
--  4. Chuyển trạng thái kiểu compare-and-set (khóa dòng đơn rồi kiểm tra status) => webhook lặp,
--     thanh toán vs hết hạn, hủy 2 lần đều an toàn. Máy trạng thái của trg_orders_bu vẫn là chốt chặn cuối.
--  5. Idempotency: orders.idempotency_key UNIQUE (có sẵn) và UNIQUE(provider, provider_txn_id).
--  6. Tuân thủ quy ước hiện có: created_by/updated_by = actor (NULL => tài khoản system), giờ UTC,
--     "hết hạn" = trạng thái cancelled + cancel_reason (orders không có trạng thái 'expired').
--
-- LƯU Ý SỬ DỤNG
--  * Kết nối backend phải SET time_zone = '+00:00' và gọi procedure ở autocommit,
--    KHÔNG bọc thêm transaction bên ngoài (procedure tự START TRANSACTION, dùng READ COMMITTED).
--  * Gặp lỗi 1213 (deadlock) / 1205 (lock wait timeout): backend retry cả lời gọi.
--  * CHƯA hỗ trợ đặt trước (allow_backorder = 1): hết hàng vẫn bị từ chối vì chk_stock không cho tồn âm.
--  * Giảm giá/coupon chưa có: discount_amount của đơn và dòng đặt = 0.
--  * Hoàn tiền thực tế, đổi trạng thái 'returned' và nhập lại kho cho hàng trả: ngoài phạm vi file này.
-- =====================================================================

USE laptop_shop;

-- ---------------------------------------------------------------------
-- 1. SỬA BẢNG CÓ SẴN
-- ---------------------------------------------------------------------
ALTER TABLE products
  ADD COLUMN reserved_quantity INT NOT NULL DEFAULT 0 AFTER stock_quantity,
  ADD CONSTRAINT chk_prod_reserved CHECK (reserved_quantity >= 0 AND reserved_quantity <= stock_quantity);
-- có thể bán = stock_quantity - reserved_quantity

ALTER TABLE orders
  ADD COLUMN expires_at DATETIME NULL AFTER placed_at,
  ADD INDEX idx_ord_expire (status, expires_at);

-- ---------------------------------------------------------------------
-- 2. BẢNG MỚI
-- ---------------------------------------------------------------------
-- Sổ ghi tiền (append-only như các sổ cái khác, theo quy tắc R6)
CREATE TABLE payment_transactions (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id        BIGINT UNSIGNED NOT NULL,
  provider        VARCHAR(30)  NOT NULL,              -- vnpay | momo | bank_transfer ...
  provider_txn_id VARCHAR(100) NOT NULL,
  amount          DECIMAL(15,0) NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by      INT UNSIGNED NULL,
  CONSTRAINT fk_payment_transactions_order      FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_payment_transactions_created_by FOREIGN KEY (created_by) REFERENCES users(id)  ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_pay_amount   CHECK (amount > 0),
  CONSTRAINT chk_pay_provider CHECK (REGEXP_LIKE(provider, '^[a-z0-9_]+$', 'c') AND CHAR_LENGTH(TRIM(provider_txn_id)) > 0),
  UNIQUE KEY uq_pay_txn (provider, provider_txn_id),  -- chặn webhook gọi lặp
  INDEX idx_pay_order (order_id)
) ENGINE=InnoDB;

-- Bộ đếm mã đơn theo ngày UTC. Tăng bằng 1 câu autocommit riêng, nên không giữ khóa suốt transaction đặt hàng.
-- (Mã đơn bất biến theo trg_orders_bu nên phải biết mã TRƯỚC khi INSERT đơn.) Có thể trống số nếu đặt hàng lỗi.
CREATE TABLE order_code_counters (
  code_date DATE PRIMARY KEY,
  last_no   INT UNSIGNED NOT NULL
) ENGINE=InnoDB;

DELIMITER $$
CREATE TRIGGER trg_pay_bu BEFORE UPDATE ON payment_transactions FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'payment_transactions is append-only';
END$$
CREATE TRIGGER trg_pay_bd BEFORE DELETE ON payment_transactions FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'payment_transactions is append-only';
END$$
DELIMITER ;

-- ---------------------------------------------------------------------
-- 3. VIEW
--    v_product_status (nguồn sự thật trạng thái): thêm available_quantity ở CUỐI,
--    is_purchasable tính theo hàng còn trống (đã trừ phần đang giữ chỗ).
--    Khối này là bản CREATE OR REPLACE của view trong laptop_shop_product_status.sql.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_product_status AS
SELECT
  p.id                                     AS product_id,
  p.sku,
  p.name,
  p.status                                 AS publish_status,
  CASE WHEN p.deleted_at IS NOT NULL THEN 'trashed' ELSE p.status END AS lifecycle,
  (p.deleted_at IS NOT NULL)               AS is_trashed,
  p.deleted_at,
  p.stock_quantity,
  p.low_stock_threshold,
  p.allow_backorder,
  p.stock_status,
  (p.status = 'active' AND p.deleted_at IS NULL AND b.status = 1 AND c.status = 1)  AS is_visible,
  (p.status = 'active' AND p.deleted_at IS NULL AND b.status = 1 AND c.status = 1
     AND (p.stock_quantity - p.reserved_quantity > 0 OR p.allow_backorder = 1))     AS is_purchasable,
  (p.is_new = 1 AND (p.new_until IS NULL OR p.new_until >= UTC_TIMESTAMP()))        AS is_new,
  p.is_hot                                 AS is_hot,
  p.is_bestseller                          AS is_bestseller,
  p.reserved_quantity                      AS reserved_quantity,
  (p.stock_quantity - p.reserved_quantity) AS available_quantity
FROM products p
JOIN brands b     ON b.id = p.brand_id
JOIN categories c ON c.id = p.category_id;

-- Đối soát: reserved_quantity phải bằng tổng số lượng trong các đơn đang pending.
CREATE OR REPLACE VIEW v_stock_reconciliation AS
SELECT p.id AS product_id, p.sku, p.stock_quantity, p.reserved_quantity,
       COALESCE(r.pending_qty, 0) AS expected_reserved,
       (p.reserved_quantity <> COALESCE(r.pending_qty, 0)) AS mismatch
FROM products p
LEFT JOIN (
  SELECT d.product_id, SUM(d.quantity) AS pending_qty
  FROM order_details d JOIN orders o ON o.id = d.order_id
  WHERE o.status = 'pending'
  GROUP BY d.product_id
) r ON r.product_id = p.id;
-- Kiểm tra định kỳ / sau mỗi deploy (phải 0 dòng):  SELECT * FROM v_stock_reconciliation WHERE mismatch = 1;

-- ---------------------------------------------------------------------
-- 4. PROCEDURES
-- ---------------------------------------------------------------------
DELIMITER $$

-- =====================================================================
-- 4.1 ĐẶT HÀNG: giữ hàng nguyên tử + chụp giá/sản phẩm + idempotent
--   p_user_id         NULL = khách vãng lai
--   p_idempotency_key bắt buộc (UUID do client sinh), duy nhất toàn hệ thống
--   p_items           '[{"product_id":1,"quantity":2},{"product_id":7,"quantity":1}]'
--   p_customer        '{"name":"..","email":"..","phone":"..","receiver_name":"..","receiver_phone":"..",
--                       "province":"..","district":null,"ward":"..","address_line":"..","note":".."}'
--                     (district, note không bắt buộc)
--   p_hold_minutes    giữ hàng bao lâu (thanh toán online); NULL = không hết hạn (COD)
--   p_actor_id        người thao tác; NULL => tài khoản system
--   Lỗi nghiệp vụ (SIGNAL 45000/45001):
--     INVALID_IDEMPOTENCY_KEY | INVALID_ITEMS | INVALID_CUSTOMER_INFO | INVALID_QUANTITY
--     INVALID_SHIPPING_FEE | INVALID_HOLD_MINUTES
--     IDEMPOTENCY_KEY_CONFLICT          key đã dùng cho đơn của người khác
--     OUT_OF_STOCK_OR_UNAVAILABLE:product_id=N   hết hàng / không bán / hãng-danh mục đang tắt
--   p_replayed = 1 nếu là lần gửi lại cùng key (trả lại đơn cũ, không giữ hàng thêm).
-- =====================================================================
DROP PROCEDURE IF EXISTS sp_place_order$$
CREATE PROCEDURE sp_place_order(
  IN  p_user_id         INT UNSIGNED,
  IN  p_idempotency_key VARCHAR(64),
  IN  p_items           JSON,
  IN  p_customer        JSON,
  IN  p_payment_method  VARCHAR(30),
  IN  p_hold_minutes    INT,
  IN  p_shipping_fee    DECIMAL(15,0),
  IN  p_actor_id        INT UNSIGNED,
  OUT p_order_id        BIGINT UNSIGNED,
  OUT p_order_code      VARCHAR(20),
  OUT p_replayed        TINYINT
)
main: BEGIN
  DECLARE v_done       TINYINT DEFAULT 0;
  DECLARE v_actor      INT UNSIGNED;
  DECLARE v_pid        INT UNSIGNED;
  DECLARE v_qty        INT;
  DECLARE v_n          INT;
  DECLARE v_sku        VARCHAR(50);
  DECLARE v_name       VARCHAR(255);
  DECLARE v_thumb      VARCHAR(255);
  DECLARE v_list       DECIMAL(15,0);
  DECLARE v_price      DECIMAL(15,0);
  DECLARE v_cost       DECIMAL(15,0);
  DECLARE v_vat        DECIMAL(4,2);
  DECLARE v_subtotal   DECIMAL(15,0) DEFAULT 0;
  DECLARE v_ship       DECIMAL(15,0);
  DECLARE v_no         INT UNSIGNED;
  DECLARE v_found_user INT UNSIGNED;
  DECLARE v_msg        VARCHAR(128);
  DECLARE v_c_name     VARCHAR(100);
  DECLARE v_c_email    VARCHAR(150);
  DECLARE v_c_phone    VARCHAR(20);
  DECLARE v_r_name     VARCHAR(100);
  DECLARE v_r_phone    VARCHAR(20);
  DECLARE v_province   VARCHAR(100);
  DECLARE v_district   VARCHAR(100);
  DECLARE v_ward       VARCHAR(100);
  DECLARE v_addr       VARCHAR(255);
  DECLARE v_note       VARCHAR(500);

  -- gom trùng product_id và SẮP XẾP tăng dần => khóa theo thứ tự cố định, chống deadlock
  DECLARE cur CURSOR FOR
    SELECT jt.product_id, SUM(jt.quantity)
    FROM JSON_TABLE(p_items, '$[*]' COLUMNS (
           product_id INT UNSIGNED PATH '$.product_id',
           quantity   INT          PATH '$.quantity')) AS jt
    GROUP BY jt.product_id
    ORDER BY jt.product_id;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  -- Hai request cùng idempotency_key chạy song song: request đến sau bị chặn ở UNIQUE,
  -- đợi request đầu commit rồi nhận 1062 => trả lại đơn của request đầu.
  DECLARE EXIT HANDLER FOR 1062
  BEGIN
    ROLLBACK;
    SET p_order_id = NULL;
    SELECT id, order_code, user_id INTO p_order_id, p_order_code, v_found_user
      FROM orders WHERE idempotency_key = p_idempotency_key;
    IF p_order_id IS NULL THEN
      RESIGNAL;                                   -- 1062 do nguyên nhân khác (vd trùng order_code)
    END IF;
    IF NOT (v_found_user <=> p_user_id) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'IDEMPOTENCY_KEY_CONFLICT';
    END IF;
    SET p_replayed = 1;
  END;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET p_order_id = NULL;
  SET p_order_code = NULL;
  SET p_replayed = 0;

  -- ---- kiểm tra đầu vào (trước khi mở transaction) ----
  IF p_idempotency_key IS NULL OR CHAR_LENGTH(TRIM(p_idempotency_key)) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_IDEMPOTENCY_KEY';
  END IF;
  IF p_items IS NULL OR JSON_TYPE(p_items) <> 'ARRAY' OR JSON_LENGTH(p_items) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_ITEMS';
  END IF;
  IF p_customer IS NULL OR JSON_TYPE(p_customer) <> 'OBJECT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_CUSTOMER_INFO';
  END IF;
  IF p_hold_minutes IS NOT NULL AND p_hold_minutes <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_HOLD_MINUTES';
  END IF;
  SET v_ship = IFNULL(p_shipping_fee, 0);
  IF v_ship < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_SHIPPING_FEE';
  END IF;

  SET v_c_name   = JSON_UNQUOTE(JSON_EXTRACT(p_customer, '$.name'));
  SET v_c_email  = JSON_UNQUOTE(JSON_EXTRACT(p_customer, '$.email'));
  SET v_c_phone  = JSON_UNQUOTE(JSON_EXTRACT(p_customer, '$.phone'));
  SET v_r_name   = JSON_UNQUOTE(JSON_EXTRACT(p_customer, '$.receiver_name'));
  SET v_r_phone  = JSON_UNQUOTE(JSON_EXTRACT(p_customer, '$.receiver_phone'));
  SET v_province = JSON_UNQUOTE(JSON_EXTRACT(p_customer, '$.province'));
  SET v_district = NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_customer, '$.district')), 'null');
  SET v_ward     = JSON_UNQUOTE(JSON_EXTRACT(p_customer, '$.ward'));
  SET v_addr     = JSON_UNQUOTE(JSON_EXTRACT(p_customer, '$.address_line'));
  SET v_note     = NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_customer, '$.note')), 'null');
  IF v_c_name IS NULL OR v_c_email IS NULL OR v_c_phone IS NULL OR v_r_name IS NULL OR v_r_phone IS NULL
     OR v_province IS NULL OR v_ward IS NULL OR v_addr IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_CUSTOMER_INFO';
  END IF;

  SET v_actor = COALESCE(p_actor_id, (SELECT id FROM users WHERE email = 'system@laptopshop.local'));

  -- ---- đường nhanh: request lặp lại đã có kết quả ----
  SELECT id, order_code, user_id INTO p_order_id, p_order_code, v_found_user
    FROM orders WHERE idempotency_key = p_idempotency_key;
  SET v_done = 0;
  IF p_order_id IS NOT NULL THEN
    IF NOT (v_found_user <=> p_user_id) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'IDEMPOTENCY_KEY_CONFLICT';
    END IF;
    SET p_replayed = 1;
    LEAVE main;
  END IF;

  -- ---- sinh mã đơn (autocommit, ngoài transaction) ----
  INSERT INTO order_code_counters (code_date, last_no)
  VALUES (UTC_DATE(), LAST_INSERT_ID(1))
  ON DUPLICATE KEY UPDATE last_no = LAST_INSERT_ID(last_no + 1);
  SET v_no = LAST_INSERT_ID();
  SET p_order_code = CONCAT('LS', DATE_FORMAT(UTC_DATE(), '%y%m%d'), '-', LPAD(v_no, 4, '0'));

  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;   -- ít gap lock, ít deadlock hơn REPEATABLE READ
  START TRANSACTION;

  -- đơn tạo ở pending (trg_orders_bi); tiền tạm = phí ship để thỏa chk_ord_money, cập nhật lại ở cuối
  INSERT INTO orders (order_code, user_id, idempotency_key, payment_method,
                      customer_name, customer_email, customer_phone,
                      receiver_name, receiver_phone, province, district, ward, address_line,
                      subtotal, discount_amount, shipping_fee, total_amount,
                      customer_note, expires_at, created_by)
  VALUES (p_order_code, p_user_id, p_idempotency_key, COALESCE(p_payment_method, 'cod'),
          v_c_name, v_c_email, v_c_phone,
          v_r_name, v_r_phone, v_province, v_district, v_ward, v_addr,
          0, 0, v_ship, v_ship,
          v_note,
          IF(p_hold_minutes IS NULL, NULL, UTC_TIMESTAMP() + INTERVAL p_hold_minutes MINUTE),
          v_actor);
  SET p_order_id = LAST_INSERT_ID();

  INSERT INTO order_status_history (order_id, from_status, to_status, note, created_by)
  VALUES (p_order_id, NULL, 'pending', 'Tạo đơn, giữ hàng', v_actor);

  OPEN cur;
  items_loop: LOOP
    FETCH cur INTO v_pid, v_qty;
    IF v_done = 1 THEN LEAVE items_loop; END IF;

    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 100 THEN       -- trần 100/dòng, chỉnh theo nhu cầu
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_QUANTITY';
    END IF;

    SET v_msg = CONCAT('OUT_OF_STOCK_OR_UNAVAILABLE:product_id=', IFNULL(v_pid, 0));

    -- hãng / danh mục phải đang bật (đọc không khóa, theo quy tắc is_visible của product_status)
    SELECT COUNT(*) INTO v_n
      FROM products p JOIN brands b ON b.id = p.brand_id JOIN categories c ON c.id = p.category_id
     WHERE p.id = v_pid AND b.status = 1 AND c.status = 1;
    IF v_n = 0 THEN
      SIGNAL SQLSTATE '45001' SET MESSAGE_TEXT = v_msg;
    END IF;

    -- KIỂM TRA + GIỮ HÀNG TRONG 1 CÂU LỆNH. InnoDB khóa dòng sản phẩm; giao dịch đến sau phải chờ
    -- rồi đọc lại giá trị mới nhất => không bán lố.
    UPDATE products
       SET reserved_quantity = reserved_quantity + v_qty,
           version           = version + 1,
           updated_by        = v_actor
     WHERE id = v_pid
       AND status = 'active'
       AND deleted_at IS NULL
       AND stock_quantity - reserved_quantity >= v_qty;

    IF ROW_COUNT() = 0 THEN
      SIGNAL SQLSTATE '45001' SET MESSAGE_TEXT = v_msg;
    END IF;

    -- dòng đã bị ta khóa: đọc giá hiện hành (sale_price nếu đang trong khung khuyến mãi) và snapshot
    SELECT p.sku, p.name, p.price, p.cost_price, p.vat_rate,
           CASE WHEN p.sale_price IS NOT NULL
                 AND (p.sale_start IS NULL OR p.sale_start <= UTC_TIMESTAMP())
                 AND (p.sale_end   IS NULL OR p.sale_end   >= UTC_TIMESTAMP())
                THEN p.sale_price ELSE p.price END,
           (SELECT i.url FROM product_images i WHERE i.product_id = p.id AND i.is_thumbnail = 1 LIMIT 1)
      INTO v_sku, v_name, v_list, v_cost, v_vat, v_price, v_thumb
      FROM products p WHERE p.id = v_pid;

    INSERT INTO order_details (order_id, product_id, product_sku, product_name, thumbnail_url,
                               quantity, original_price, unit_price, discount_amount, vat_rate, cost_price, created_by)
    VALUES (p_order_id, v_pid, v_sku, v_name, v_thumb,
            v_qty, v_list, v_price, 0, v_vat, v_cost, v_actor);

    SET v_subtotal = v_subtotal + v_price * v_qty;
  END LOOP;
  CLOSE cur;

  -- chốt tiền khi đơn còn pending (sau đó trigger đóng băng)
  UPDATE orders
     SET subtotal = v_subtotal, total_amount = v_subtotal + v_ship, updated_by = v_actor
   WHERE id = p_order_id;

  COMMIT;
END$$


-- =====================================================================
-- 4.2 XÁC NHẬN ĐƠN (pending -> confirmed): TRỪ KHO THẬT, nhả giữ chỗ, ghi sổ kho.
--   Dùng cho 2 trường hợp:
--     * Thanh toán online (webhook): truyền p_provider, p_txn_id, p_amount => ghi payment_transactions,
--       payment_status = 'paid', đồng thời xác nhận đơn.
--     * COD / nhân viên xác nhận tay: p_txn_id = NULL (payment_status giữ nguyên).
--   Nếu tiền về khi đơn pending nhưng đã quá expires_at (job chưa quét) vẫn xác nhận: khách đã trả tiền.
--   p_result:
--     OK
--     ALREADY_CONFIRMED            đơn đã qua pending (nếu có tiền thì vẫn ghi nhận paid)
--     DUPLICATE_PAYMENT            cùng (provider, txn_id) đã xử lý, không làm gì thêm
--     CANCELLED_REFUND_NEEDED      đơn đã hủy/hết hạn nhưng tiền đã về => cần hoàn tiền
--     ORDER_CANCELLED              xác nhận tay một đơn đã hủy
--     AMOUNT_MISMATCH | ORDER_NOT_FOUND
-- =====================================================================
DROP PROCEDURE IF EXISTS sp_confirm_order$$
CREATE PROCEDURE sp_confirm_order(
  IN  p_order_id BIGINT UNSIGNED,
  IN  p_actor_id INT UNSIGNED,
  IN  p_provider VARCHAR(30),
  IN  p_txn_id   VARCHAR(100),
  IN  p_amount   DECIMAL(15,0),
  OUT p_result   VARCHAR(40)
)
main: BEGIN
  DECLARE v_done   TINYINT DEFAULT 0;
  DECLARE v_actor  INT UNSIGNED;
  DECLARE v_status VARCHAR(20);
  DECLARE v_paystat VARCHAR(20);
  DECLARE v_total  DECIMAL(15,0);
  DECLARE v_code   VARCHAR(20);
  DECLARE v_pid    INT UNSIGNED;
  DECLARE v_qty    INT;
  DECLARE v_cost   DECIMAL(15,0);
  DECLARE v_after  INT;
  DECLARE v_msg    VARCHAR(128);

  DECLARE cur CURSOR FOR
    SELECT product_id, quantity, cost_price
      FROM order_details WHERE order_id = p_order_id ORDER BY product_id;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;
  DECLARE EXIT HANDLER FOR 1062
  BEGIN
    ROLLBACK;
    SET p_result = 'DUPLICATE_PAYMENT';
  END;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET p_result = NULL;
  SET v_actor = COALESCE(p_actor_id, (SELECT id FROM users WHERE email = 'system@laptopshop.local'));

  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION;

  -- (1) khóa dòng đơn trước: mọi thao tác trên cùng 1 đơn được xếp hàng
  SELECT status, payment_status, total_amount, order_code
    INTO v_status, v_paystat, v_total, v_code
    FROM orders WHERE id = p_order_id FOR UPDATE;
  SET v_done = 0;

  IF v_status IS NULL THEN
    ROLLBACK; SET p_result = 'ORDER_NOT_FOUND'; LEAVE main;
  END IF;

  -- (2) ghi nhận tiền (nếu có); trùng (provider, txn_id) => 1062 => DUPLICATE_PAYMENT
  IF p_txn_id IS NOT NULL THEN
    IF p_amount IS NULL OR p_amount <> v_total THEN
      ROLLBACK; SET p_result = 'AMOUNT_MISMATCH'; LEAVE main;
    END IF;
    INSERT INTO payment_transactions (order_id, provider, provider_txn_id, amount, created_by)
    VALUES (p_order_id, p_provider, p_txn_id, p_amount, v_actor);
  END IF;

  -- (3) đơn không còn pending
  IF v_status = 'cancelled' THEN
    COMMIT;
    SET p_result = IF(p_txn_id IS NOT NULL, 'CANCELLED_REFUND_NEEDED', 'ORDER_CANCELLED');
    LEAVE main;
  END IF;
  IF v_status <> 'pending' THEN
    IF p_txn_id IS NOT NULL AND v_paystat <> 'paid' THEN
      UPDATE orders SET payment_status = 'paid', version = version + 1, updated_by = v_actor
       WHERE id = p_order_id;
    END IF;
    COMMIT;
    SET p_result = 'ALREADY_CONFIRMED';
    LEAVE main;
  END IF;

  -- (4) đơn pending: trừ kho thật, nhả giữ chỗ, ghi sổ kho (theo product_id tăng dần)
  OPEN cur;
  items_loop: LOOP
    FETCH cur INTO v_pid, v_qty, v_cost;
    IF v_done = 1 THEN LEAVE items_loop; END IF;

    UPDATE products
       SET stock_quantity    = stock_quantity    - v_qty,
           reserved_quantity = reserved_quantity - v_qty,
           sold_count        = sold_count        + v_qty,
           version           = version + 1,
           updated_by        = v_actor
     WHERE id = v_pid
       AND stock_quantity    >= v_qty
       AND reserved_quantity >= v_qty;

    IF ROW_COUNT() = 0 THEN
      SET v_msg = CONCAT('INVENTORY_INCONSISTENT:product_id=', v_pid);
      SIGNAL SQLSTATE '45002' SET MESSAGE_TEXT = v_msg;
    END IF;

    SELECT stock_quantity INTO v_after FROM products WHERE id = v_pid;

    INSERT INTO inventory_movements
      (product_id, order_id, type, quantity, stock_before, stock_after, unit_cost, reason, created_by)
    VALUES
      (v_pid, p_order_id, 'export', -v_qty, v_after + v_qty, v_after, v_cost, CONCAT('Đơn ', v_code), v_actor);
  END LOOP;
  CLOSE cur;

  -- (5) chuyển trạng thái (trg_orders_bu kiểm tra thêm máy trạng thái)
  UPDATE orders
     SET status         = 'confirmed',
         confirmed_at   = UTC_TIMESTAMP(),
         expires_at     = NULL,
         payment_status = IF(p_txn_id IS NOT NULL, 'paid', payment_status),
         version        = version + 1,
         updated_by     = v_actor
   WHERE id = p_order_id AND status = 'pending';

  INSERT INTO order_status_history (order_id, from_status, to_status, note, created_by)
  VALUES (p_order_id, 'pending', 'confirmed',
          IF(p_txn_id IS NULL, 'Xác nhận đơn', CONCAT('Thanh toán ', p_provider, ' ', p_txn_id)), v_actor);

  COMMIT;
  SET p_result = 'OK';
END$$


-- =====================================================================
-- 4.3 HỦY / HẾT HẠN ĐƠN
--   p_is_expiry = 1: chỉ hủy nếu đơn còn pending và đã quá expires_at (job quét hết hạn).
--   - Đơn pending            : nhả reserved_quantity.
--   - Đơn confirmed/processing: hoàn stock_quantity, giảm sold_count, ghi movement 'return'.
--   - Từ shipping trở đi không hủy được (máy trạng thái) => NOT_CANCELLABLE.
--   p_result: OK | OK_REFUND_NEEDED (đơn đã paid, backend xử lý hoàn tiền) | ORDER_NOT_FOUND |
--             NOT_CANCELLABLE | NOT_EXPIRABLE
-- =====================================================================
DROP PROCEDURE IF EXISTS sp_cancel_order$$
CREATE PROCEDURE sp_cancel_order(
  IN  p_order_id  BIGINT UNSIGNED,
  IN  p_actor_id  INT UNSIGNED,
  IN  p_reason    VARCHAR(255),
  IN  p_is_expiry TINYINT,
  OUT p_result    VARCHAR(30)
)
main: BEGIN
  DECLARE v_done    TINYINT DEFAULT 0;
  DECLARE v_actor   INT UNSIGNED;
  DECLARE v_status  VARCHAR(20);
  DECLARE v_paystat VARCHAR(20);
  DECLARE v_expires DATETIME;
  DECLARE v_code    VARCHAR(20);
  DECLARE v_pid     INT UNSIGNED;
  DECLARE v_qty     INT;
  DECLARE v_cost    DECIMAL(15,0);
  DECLARE v_after   INT;
  DECLARE v_msg     VARCHAR(128);

  DECLARE cur CURSOR FOR
    SELECT product_id, quantity, cost_price
      FROM order_details WHERE order_id = p_order_id ORDER BY product_id;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET p_result = NULL;
  SET v_actor = COALESCE(p_actor_id, (SELECT id FROM users WHERE email = 'system@laptopshop.local'));

  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION;

  -- khóa đơn trước (cùng thứ tự với sp_confirm_order => thanh toán vs hết hạn chỉ 1 bên thắng)
  SELECT status, payment_status, expires_at, order_code
    INTO v_status, v_paystat, v_expires, v_code
    FROM orders WHERE id = p_order_id FOR UPDATE;
  SET v_done = 0;

  IF v_status IS NULL THEN
    ROLLBACK; SET p_result = 'ORDER_NOT_FOUND'; LEAVE main;
  END IF;
  IF p_is_expiry = 1
     AND (v_status <> 'pending' OR v_expires IS NULL OR v_expires > UTC_TIMESTAMP()) THEN
    ROLLBACK; SET p_result = 'NOT_EXPIRABLE'; LEAVE main;
  END IF;
  IF v_status NOT IN ('pending','confirmed','processing') THEN
    ROLLBACK; SET p_result = 'NOT_CANCELLABLE'; LEAVE main;
  END IF;

  OPEN cur;
  items_loop: LOOP
    FETCH cur INTO v_pid, v_qty, v_cost;
    IF v_done = 1 THEN LEAVE items_loop; END IF;

    IF v_status = 'pending' THEN                   -- chưa trừ kho: chỉ nhả phần giữ chỗ
      UPDATE products
         SET reserved_quantity = reserved_quantity - v_qty,
             version           = version + 1,
             updated_by        = v_actor
       WHERE id = v_pid AND reserved_quantity >= v_qty;

      IF ROW_COUNT() = 0 THEN
        SET v_msg = CONCAT('INVENTORY_INCONSISTENT:product_id=', v_pid);
        SIGNAL SQLSTATE '45002' SET MESSAGE_TEXT = v_msg;
      END IF;
    ELSE                                           -- confirmed/processing: đã trừ kho => cộng trả lại
      UPDATE products
         SET stock_quantity = stock_quantity + v_qty,
             sold_count     = GREATEST(CAST(sold_count AS SIGNED) - v_qty, 0),
             version        = version + 1,
             updated_by     = v_actor
       WHERE id = v_pid;

      SELECT stock_quantity INTO v_after FROM products WHERE id = v_pid;

      INSERT INTO inventory_movements
        (product_id, order_id, type, quantity, stock_before, stock_after, unit_cost, reason, created_by)
      VALUES
        (v_pid, p_order_id, 'return', v_qty, v_after - v_qty, v_after, v_cost, CONCAT('Hủy đơn ', v_code), v_actor);
    END IF;
  END LOOP;
  CLOSE cur;

  UPDATE orders
     SET status        = 'cancelled',
         cancelled_at  = UTC_TIMESTAMP(),
         cancel_reason = COALESCE(p_reason, IF(p_is_expiry = 1, 'Hết hạn giữ hàng', 'Hủy đơn')),
         expires_at    = NULL,
         version       = version + 1,
         updated_by    = v_actor
   WHERE id = p_order_id;

  INSERT INTO order_status_history (order_id, from_status, to_status, note, created_by)
  VALUES (p_order_id, v_status, 'cancelled',
          COALESCE(p_reason, IF(p_is_expiry = 1, 'Hết hạn giữ hàng', 'Hủy đơn')), v_actor);

  COMMIT;
  SET p_result = IF(v_paystat = 'paid', 'OK_REFUND_NEEDED', 'OK');
END$$


-- =====================================================================
-- 4.4 JOB QUÉT ĐƠN HẾT HẠN. Nhiều worker chạy song song vẫn an toàn:
--     worker đến sau thấy status <> 'pending' => NOT_EXPIRABLE, bỏ qua.
-- =====================================================================
DROP PROCEDURE IF EXISTS sp_expire_pending_orders$$
CREATE PROCEDURE sp_expire_pending_orders(IN p_limit INT, OUT p_expired INT)
BEGIN
  DECLARE v_done TINYINT DEFAULT 0;
  DECLARE v_id   BIGINT UNSIGNED;
  DECLARE v_res  VARCHAR(30);

  DECLARE cur CURSOR FOR
    SELECT id FROM orders
     WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at <= UTC_TIMESTAMP()
     ORDER BY expires_at
     LIMIT p_limit;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  SET p_expired = 0;
  OPEN cur;
  loop1: LOOP
    FETCH cur INTO v_id;
    IF v_done = 1 THEN LEAVE loop1; END IF;
    CALL sp_cancel_order(v_id, NULL, 'Hết hạn giữ hàng', 1, v_res);   -- actor NULL => system
    IF v_res IN ('OK','OK_REFUND_NEEDED') THEN SET p_expired = p_expired + 1; END IF;
  END LOOP;
  CLOSE cur;
END$$


-- =====================================================================
-- 4.5 CHUYỂN TRẠNG THÁI TIẾP THEO (admin / order_manager), kiểu compare-and-set:
--       confirmed -> processing -> shipping -> delivered -> completed
--     Hai nhân viên cùng bấm: chỉ một người thành công, người kia nhận STATE_CHANGED.
--   p_carrier / p_tracking chỉ dùng khi sang 'shipping'.
--   p_result: OK | STATE_CHANGED | INVALID_TRANSITION | ORDER_NOT_FOUND
--   (Hủy dùng sp_cancel_order. 'returned' ngoài phạm vi file này.)
-- =====================================================================
DROP PROCEDURE IF EXISTS sp_advance_order$$
CREATE PROCEDURE sp_advance_order(
  IN  p_order_id        BIGINT UNSIGNED,
  IN  p_actor_id        INT UNSIGNED,
  IN  p_expected_status VARCHAR(20),
  IN  p_new_status      VARCHAR(20),
  IN  p_carrier         VARCHAR(50),
  IN  p_tracking        VARCHAR(60),
  OUT p_result          VARCHAR(30)
)
main: BEGIN
  DECLARE v_actor  INT UNSIGNED;
  DECLARE v_status VARCHAR(20);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET p_result = NULL;
  SET v_actor = COALESCE(p_actor_id, (SELECT id FROM users WHERE email = 'system@laptopshop.local'));

  IF NOT (   (p_expected_status = 'confirmed'  AND p_new_status = 'processing')
          OR (p_expected_status = 'processing' AND p_new_status = 'shipping')
          OR (p_expected_status = 'shipping'   AND p_new_status = 'delivered')
          OR (p_expected_status = 'delivered'  AND p_new_status = 'completed')) THEN
    SET p_result = 'INVALID_TRANSITION'; LEAVE main;
  END IF;

  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION;

  SELECT status INTO v_status FROM orders WHERE id = p_order_id FOR UPDATE;
  IF v_status IS NULL THEN
    ROLLBACK; SET p_result = 'ORDER_NOT_FOUND'; LEAVE main;
  END IF;
  IF v_status <> p_expected_status THEN
    ROLLBACK; SET p_result = 'STATE_CHANGED'; LEAVE main;
  END IF;

  UPDATE orders
     SET status        = p_new_status,
         shipped_at    = IF(p_new_status = 'shipping',  UTC_TIMESTAMP(), shipped_at),
         delivered_at  = IF(p_new_status = 'delivered', UTC_TIMESTAMP(), delivered_at),
         carrier       = IF(p_new_status = 'shipping',  p_carrier,  carrier),
         tracking_code = IF(p_new_status = 'shipping',  p_tracking, tracking_code),
         version       = version + 1,
         updated_by    = v_actor
   WHERE id = p_order_id;

  INSERT INTO order_status_history (order_id, from_status, to_status, note, created_by)
  VALUES (p_order_id, v_status, p_new_status, NULL, v_actor);

  COMMIT;
  SET p_result = 'OK';
END$$


-- =====================================================================
-- 4.6 ĐIỀU CHỈNH KHO THỦ CÔNG (nhập hàng, kiểm kê, khách trả hàng) - cho admin / product_manager
--   Không cho giảm tồn xuống dưới số đang giữ chỗ (chk_prod_reserved cũng chặn ở tầng cuối).
--   Dấu delta phải khớp chk_inv_sign: import/return > 0, adjust <> 0.
-- =====================================================================
DROP PROCEDURE IF EXISTS sp_adjust_stock$$
CREATE PROCEDURE sp_adjust_stock(
  IN  p_product_id  INT UNSIGNED,
  IN  p_delta       INT,
  IN  p_type        VARCHAR(10),          -- import | adjust | return
  IN  p_unit_cost   DECIMAL(15,0),
  IN  p_reason      VARCHAR(255),
  IN  p_actor_id    INT UNSIGNED,
  OUT p_stock_after INT
)
BEGIN
  DECLARE v_actor INT UNSIGNED;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_delta IS NULL OR p_delta = 0 OR p_type NOT IN ('import','adjust','return')
     OR (p_type IN ('import','return') AND p_delta < 0) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_ADJUSTMENT';
  END IF;

  SET v_actor = COALESCE(p_actor_id, (SELECT id FROM users WHERE email = 'system@laptopshop.local'));

  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION;

  UPDATE products
     SET stock_quantity = stock_quantity + p_delta,
         version        = version + 1,
         updated_by     = v_actor
   WHERE id = p_product_id
     AND stock_quantity + p_delta >= reserved_quantity;

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45003' SET MESSAGE_TEXT = 'CANNOT_ADJUST_BELOW_RESERVED_OR_NOT_FOUND';
  END IF;

  SELECT stock_quantity INTO p_stock_after FROM products WHERE id = p_product_id;

  INSERT INTO inventory_movements
    (product_id, type, quantity, stock_before, stock_after, unit_cost, reason, created_by)
  VALUES
    (p_product_id, p_type, p_delta, p_stock_after - p_delta, p_stock_after, p_unit_cost, p_reason, v_actor);

  COMMIT;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- 5. JOB TỰ ĐỘNG (cần event_scheduler = ON; hoặc gọi sp_expire_pending_orders từ cron/worker backend)
-- ---------------------------------------------------------------------
CREATE EVENT IF NOT EXISTS ev_expire_pending_orders
  ON SCHEDULE EVERY 1 MINUTE
  DO CALL sp_expire_pending_orders(200, @expired_cnt);

-- ---------------------------------------------------------------------
-- 6. KHÓA LẠC QUAN (OPTIMISTIC) KHI ADMIN SỬA SẢN PHẨM / GHI CHÚ ĐƠN
--    Cột version có sẵn ở products và orders. Form gửi kèm version đã đọc; 0 dòng bị ảnh hưởng => HTTP 409.
--    Nhớ ghi updated_by (quy ước audit). Không dùng cho tồn kho: tồn kho đi qua các procedure ở trên.
--
--    UPDATE products
--       SET name = ?, price = ?, sale_price = ?, version = version + 1, updated_by = ?
--     WHERE id = ? AND version = ?;
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 7. VÍ DỤ GỌI (autocommit, time_zone = '+00:00')
-- ---------------------------------------------------------------------
-- CALL sp_place_order(NULL, 'c7d1-uuid-từ-client',
--      '[{"product_id":1,"quantity":1},{"product_id":2,"quantity":2}]',
--      '{"name":"Nguyễn Văn A","email":"a@example.com","phone":"0900000001","receiver_name":"Nguyễn Văn A",
--        "receiver_phone":"0900000001","province":"Hà Nội","ward":"Phường X","address_line":"1 Đường Y"}',
--      'vnpay', 15, 30000, NULL, @oid, @code, @replayed);
-- SELECT @oid, @code, @replayed;
-- CALL sp_confirm_order(@oid, NULL, 'vnpay', 'TXN123456', <tổng tiền đơn>, @r);   SELECT @r;   -- online
-- CALL sp_confirm_order(@oid, <id nhân viên>, NULL, NULL, NULL, @r);              SELECT @r;   -- COD
-- CALL sp_cancel_order(@oid, <id>, 'Khách đổi ý', 0, @r);                         SELECT @r;
-- CALL sp_advance_order(@oid, <id>, 'confirmed', 'processing', NULL, NULL, @r);   SELECT @r;
-- CALL sp_adjust_stock(1, 10, 'import', 37900000, 'Nhập lô mới', <id>, @after);
