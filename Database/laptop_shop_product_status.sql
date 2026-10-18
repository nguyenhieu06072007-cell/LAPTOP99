-- =====================================================================
-- laptop_shop  |  QUY ƯỚC TRẠNG THÁI SẢN PHẨM / KHO  |  MySQL 8.0.16+
-- Thứ tự chạy: 1) laptop_shop.sql  2) laptop_shop_sales_schema.sql
--              3) laptop_shop_constraints.sql  4) laptop_shop_audit_fields.sql
--              5) file này (chạy 1 lần)
--
-- 4 TRỤC TRẠNG THÁI ĐỘC LẬP (không gộp thành 1 cột)
--   A. Vòng đời đăng bán  (LƯU)    products.status      draft | active | inactive | discontinued
--   B. Thùng rác          (LƯU)    products.deleted_at  NULL = bình thường, có giờ = trong thùng rác
--   C. Tình trạng kho     (SUY RA) products.stock_status in_stock | low_stock | out_of_stock
--   D. Nhãn tiếp thị      (LƯU)    is_new (+new_until) | is_hot | is_bestseller
--
-- MÃ CHUNG cho DB = API = frontend = QA (frontend chỉ đổi mã -> nhãn hiển thị)
--   Trục A  draft        Nháp, chưa đăng bán
--           active       Active   : đang đăng bán
--           inactive     Inactive : tạm ẩn, bật lại được bất cứ lúc nào
--           discontinued Ngừng kinh doanh (không nhập thêm)
--   Trục B  trashed      Thùng rác ("Remove"). Chỉ là xóa mềm, KHÔNG xóa thật
--   Trục C  in_stock | low_stock | out_of_stock
--   Trục D  new | hot | bestseller
--   Mã "hidden" CŨ đã đổi thành "inactive" ở bước 2 bên dưới.
--
-- QUY TẮC
--   Q1. Kho KHÔNG bao giờ đổi trục A. Hết hàng vẫn là Active + out_of_stock.
--   Q2. stock_status do DB tính từ stock_quantity và low_stock_threshold. Không ai được ghi.
--         out_of_stock : stock_quantity = 0
--         low_stock    : 0 < stock_quantity <= low_stock_threshold
--         in_stock     : stock_quantity > low_stock_threshold
--       allow_backorder là cờ riêng: out_of_stock + allow_backorder = 1 vẫn mua (đặt trước) được.
--   Q3. Cho phép chuyển trục A (trigger ép):
--         draft -> active
--         active -> inactive | discontinued
--         inactive -> active | discontinued
--         discontinued -> inactive
--       Không bao giờ quay lại draft. Chuyển sang active (đăng bán / bật lại) yêu cầu:
--       brand và category đang bật (status = 1) và sản phẩm có ít nhất 1 ảnh.
--   Q4. Thùng rác (trục B), có ràng buộc "đã vào thùng rác thì status <> active":
--         Vào thùng rác : status = IF(status='active','inactive',status), deleted_at = UTC_TIMESTAMP(),
--                         updated_by = actor            (updated_by = người xóa)
--         Khôi phục     : deleted_at = NULL, updated_by = actor
--                         status giữ nguyên (không tự bật lại; muốn bán phải chuyển active theo Q3)
--       Sản phẩm trong thùng rác: ẩn khỏi cửa hàng, khỏi giỏ (backend xóa cart_items cùng
--       transaction), vẫn giữ SKU/slug (không bị chiếm lại). Không có "xóa vĩnh viễn": sổ kho
--       và đơn hàng đang RESTRICT. Sản phẩm chưa từng có giao dịch mới xóa cứng được.
--   Q5. is_visible (cửa hàng được hiển thị) = status='active' AND deleted_at IS NULL
--                                             AND brand.status=1 AND category.status=1
--       is_purchasable (bấm mua được)      = is_visible AND (stock_quantity > 0 OR allow_backorder = 1)
--       Cửa hàng liệt kê theo is_visible; hết hàng vẫn hiện kèm nhãn out_of_stock.
--       Chỉ hiển thị nhãn tiếp thị (new/hot/bestseller) khi is_visible = 1.
--   Q6. Nhãn tiếp thị:
--         new        : is_new = 1 và (new_until IS NULL hoặc new_until >= UTC_TIMESTAMP()).
--                      Khi bật, backend đặt new_until = UTC_TIMESTAMP() + 30 ngày (cấu hình được).
--         hot        : is_hot = 1, admin bật/tắt thủ công.
--         bestseller : is_bestseller = 1, admin bật/tắt thủ công.
--       Nếu sau này có job tự động, job chạy với actor 'system' và ghi cùng các cột này,
--       không đổi schema. Mỗi nhãn chỉ nên có 1 chủ (thủ công hoặc job) để tránh ghi đè nhau.
--       is_featured không thuộc nhóm này, giữ nguyên (dùng cho banner/trang chủ nếu cần).
--   Q7. Backend/ORM phải khai báo stock_status là CHỈ ĐỌC (không INSERT/UPDATE),
--       nếu không MySQL báo lỗi 3105.
--
-- NGUỒN SỰ THẬT DUY NHẤT: view v_product_status (mục 5) và bảng product_state_codes (mục 4).
-- View cũ v_product_full vẫn chạy nhưng nhãn tiếng Việt cũ của nó là:
--   'Còn hàng' = in_stock, 'Sắp hết' = low_stock, 'Hết hàng' = out_of_stock  -> frontend chuyển sang dùng mã.
-- =====================================================================

USE laptop_shop;

-- ---------------------------------------------------------------------
-- 1. GỠ CHECK CŨ (còn nhắc tới giá trị 'hidden')
-- ---------------------------------------------------------------------
ALTER TABLE products DROP CHECK chk_prod_deleted;

-- ---------------------------------------------------------------------
-- 2. ĐỔI MÃ 'hidden' -> 'inactive' (3 bước để không mất dữ liệu)
--    "updated_at = updated_at" để không làm nhảy mốc cập nhật.
-- ---------------------------------------------------------------------
ALTER TABLE products
  MODIFY status ENUM('draft','active','hidden','inactive','discontinued') NOT NULL DEFAULT 'draft';

UPDATE products SET status = 'inactive', updated_at = updated_at WHERE status = 'hidden';

ALTER TABLE products
  MODIFY status ENUM('draft','active','inactive','discontinued') NOT NULL DEFAULT 'draft';

-- Thùng rác: không được vừa active vừa nằm trong thùng rác (draft vẫn giữ nguyên khi vào/ra thùng rác).
ALTER TABLE products
  ADD CONSTRAINT chk_prod_trashed CHECK (deleted_at IS NULL OR status <> 'active');

-- ---------------------------------------------------------------------
-- 3. CỘT MỚI: is_hot, new_until, stock_status (cột tự tính)
-- ---------------------------------------------------------------------
ALTER TABLE products
  ADD COLUMN is_hot       TINYINT(1) NOT NULL DEFAULT 0 AFTER is_bestseller,
  ADD COLUMN new_until    DATETIME   NULL AFTER is_hot,
  ADD COLUMN stock_status VARCHAR(12)
        GENERATED ALWAYS AS (
          CASE WHEN stock_quantity <= 0                  THEN 'out_of_stock'
               WHEN stock_quantity <= low_stock_threshold THEN 'low_stock'
               ELSE 'in_stock' END
        ) STORED AFTER allow_backorder,
  ADD INDEX idx_products_stock_status (stock_status),
  ADD CONSTRAINT chk_prod_new_until CHECK (is_new = 1 OR new_until IS NULL);

-- Backfill: sản phẩm đang is_new=1 được hưởng 30 ngày kể từ lúc tạo.
UPDATE products
SET new_until = DATE_ADD(created_at, INTERVAL 30 DAY), updated_at = updated_at
WHERE is_new = 1 AND new_until IS NULL;

-- ---------------------------------------------------------------------
-- 4. BẢNG TỪ ĐIỂN MÃ (frontend lấy nhãn qua API; QA đối chiếu mã)
-- ---------------------------------------------------------------------
CREATE TABLE product_state_codes (
  group_code  VARCHAR(20)  NOT NULL,       -- publish_status | lifecycle | stock_status | badge
  code        VARCHAR(20)  NOT NULL,
  label_vi    VARCHAR(60)  NOT NULL,
  label_en    VARCHAR(60)  NOT NULL,
  description VARCHAR(255) NULL,
  sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,   -- với badge: thứ tự ưu tiên hiển thị
  PRIMARY KEY (group_code, code)
) ENGINE=InnoDB;

INSERT INTO product_state_codes (group_code, code, label_vi, label_en, description, sort_order) VALUES
 ('publish_status','draft',        'Nháp',            'Draft',         'Chưa đăng bán',                                  1),
 ('publish_status','active',       'Đang bán',        'Active',        'Đang hiển thị trên cửa hàng',                    2),
 ('publish_status','inactive',     'Tạm ẩn',          'Inactive',      'Đã tắt hiển thị, có thể bật lại',               3),
 ('publish_status','discontinued', 'Ngừng kinh doanh','Discontinued',  'Không nhập thêm, chỉ giữ dữ liệu',              4),
 ('lifecycle',     'trashed',      'Thùng rác',       'Trash',         'Xóa mềm (deleted_at có giá trị); ghi đè hiển thị trục A', 9),
 ('stock_status',  'in_stock',     'Còn hàng',        'In stock',      'stock_quantity > low_stock_threshold',           1),
 ('stock_status',  'low_stock',    'Sắp hết',         'Low stock',     '0 < stock_quantity <= low_stock_threshold',      2),
 ('stock_status',  'out_of_stock', 'Hết hàng',        'Out of stock',  'stock_quantity = 0',                             3),
 ('badge',         'hot',          'Hot',             'Hot',           'products.is_hot',                                1),
 ('badge',         'bestseller',   'Bán chạy',        'Best seller',   'products.is_bestseller',                         2),
 ('badge',         'new',          'Mới',             'New',           'products.is_new và chưa quá new_until',          3);

-- ---------------------------------------------------------------------
-- 5. VIEW NGUỒN SỰ THẬT: mọi API/báo cáo/QA đọc trạng thái từ đây
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_product_status AS
SELECT
  p.id                                     AS product_id,
  p.sku,
  p.name,
  p.status                                 AS publish_status,                       -- trục A
  CASE WHEN p.deleted_at IS NOT NULL THEN 'trashed' ELSE p.status END AS lifecycle, -- tab quản trị
  (p.deleted_at IS NOT NULL)               AS is_trashed,                           -- trục B
  p.deleted_at,
  p.stock_quantity,
  p.low_stock_threshold,
  p.allow_backorder,
  p.stock_status,                                                                   -- trục C
  (p.status = 'active' AND p.deleted_at IS NULL AND b.status = 1 AND c.status = 1)  AS is_visible,
  (p.status = 'active' AND p.deleted_at IS NULL AND b.status = 1 AND c.status = 1
     AND (p.stock_quantity > 0 OR p.allow_backorder = 1))                           AS is_purchasable,
  (p.is_new = 1 AND (p.new_until IS NULL OR p.new_until >= UTC_TIMESTAMP()))        AS is_new,        -- trục D
  p.is_hot                                 AS is_hot,
  p.is_bestseller                          AS is_bestseller
FROM products p
JOIN brands b     ON b.id = p.brand_id
JOIN categories c ON c.id = p.category_id;

-- ---------------------------------------------------------------------
-- 6. TRIGGER: máy trạng thái trục A + điều kiện đăng bán (Q3)
-- ---------------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER trg_products_status_bu BEFORE UPDATE ON products FOR EACH ROW
BEGIN
  DECLARE n INT DEFAULT 0;

  IF NEW.status <> OLD.status THEN
    IF NOT (   (OLD.status = 'draft'        AND NEW.status = 'active')
            OR (OLD.status = 'active'       AND NEW.status IN ('inactive','discontinued'))
            OR (OLD.status = 'inactive'     AND NEW.status IN ('active','discontinued'))
            OR (OLD.status = 'discontinued' AND NEW.status = 'inactive')) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'products: invalid status transition';
    END IF;

    IF NEW.status = 'active' THEN
      SELECT COUNT(*) INTO n
      FROM brands b JOIN categories c ON c.id = NEW.category_id
      WHERE b.id = NEW.brand_id AND b.status = 1 AND c.status = 1;
      IF n = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'products: brand and category must be active to publish';
      END IF;

      SELECT COUNT(*) INTO n FROM product_images WHERE product_id = NEW.id;
      IF n = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'products: at least one image is required to publish';
      END IF;
    END IF;
  END IF;
END$$

DELIMITER ;
