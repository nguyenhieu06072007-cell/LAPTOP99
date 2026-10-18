-- =====================================================================
-- laptop_shop  |  TEST TRƯỜNG AUDIT (createDate / updateDate / createBy / updateBy)
-- Chạy SAU laptop_shop_audit_fields.sql:
--     mysql -u root -p -f -vvv laptop_shop < laptop_shop_audit_tests.sql
-- EXPECT: OK | 1062 | 1451 | 1452 | 1644 (lỗi do trigger) | giá trị SELECT mong đợi
-- Phần A chạy trong 1 transaction rồi ROLLBACK. Phần B là truy vấn đối soát (mong đợi 0 dòng).
-- =====================================================================

SET time_zone = '+00:00';
START TRANSACTION;

SET @admin = (SELECT id FROM users WHERE email = 'admin@laptopshop.vn');
SET @sys   = (SELECT id FROM users WHERE email = 'system@laptopshop.local');

INSERT INTO users (id, role_id, full_name, email, password_hash, created_by)
VALUES (900001, 5, 'QA Customer', 'qa.audit@test.vn', 'x', @sys);

-- ===================== A. HÀNH VI CỦA 4 TRƯỜNG =====================
-- [A01] INSERT chỉ truyền created_by => updated_by tự = created_by, created_at = updated_at | EXPECT OK
INSERT INTO products (sku,name,slug,brand_id,category_id,price,created_by)
VALUES ('QA-AUD-1','QA Audit','qa-aud-1',1,1,1000000,@admin);
SELECT created_by = @admin AS created_by_ok, updated_by = @admin AS updated_by_ok,
       created_at = updated_at AS same_time
FROM products WHERE sku = 'QA-AUD-1';                          -- mong đợi 1 | 1 | 1

-- [A02] INSERT truyền updated_by khác created_by thì được giữ nguyên | EXPECT OK
INSERT INTO products (sku,name,slug,brand_id,category_id,price,created_by,updated_by)
VALUES ('QA-AUD-2','QA Audit 2','qa-aud-2',1,1,1000000,@admin,900001);
SELECT updated_by = 900001 AS kept FROM products WHERE sku = 'QA-AUD-2';   -- mong đợi 1

-- [A03] created_by bất biến                                     | EXPECT 1644
UPDATE products SET created_by = 900001 WHERE sku = 'QA-AUD-1';
-- [A04] created_by không được xóa về NULL                       | EXPECT 1644
UPDATE products SET created_by = NULL WHERE sku = 'QA-AUD-1';
-- [A05] created_at bất biến                                     | EXPECT 1644
UPDATE products SET created_at = '2000-01-01 00:00:00' WHERE sku = 'QA-AUD-1';

-- [A06] UPDATE có đổi dữ liệu: updated_at nhảy, updated_by = actor mới, created_* giữ nguyên | EXPECT OK
DO SLEEP(1);
UPDATE products SET name = 'QA Audit changed', updated_by = 900001 WHERE sku = 'QA-AUD-1';
SELECT updated_by = 900001 AS updated_by_ok, created_by = @admin AS created_by_kept,
       updated_at > created_at AS updated_at_moved
FROM products WHERE sku = 'QA-AUD-1';                          -- mong đợi 1 | 1 | 1

-- [A07] UPDATE không đổi giá trị nào => updated_at KHÔNG đổi    | EXPECT OK
SET @t0 = (SELECT updated_at FROM products WHERE sku = 'QA-AUD-1');
DO SLEEP(1);
UPDATE products SET name = name WHERE sku = 'QA-AUD-1';
SELECT updated_at = @t0 AS unchanged FROM products WHERE sku = 'QA-AUD-1';  -- mong đợi 1

-- [A08] created_by / updated_by phải là user tồn tại             | EXPECT 1452 (cả hai)
INSERT INTO products (sku,name,slug,brand_id,category_id,price,created_by)
VALUES ('QA-AUD-3','QA','qa-aud-3',1,1,1000000,99999999);
UPDATE products SET updated_by = 99999999 WHERE sku = 'QA-AUD-1';

-- [A09] xóa user đã được ghi là updated_by của bản ghi           | EXPECT 1451
DELETE FROM users WHERE id = 900001;

-- [A10] xóa mềm: updated_by ghi nhận người xóa                   | EXPECT OK
UPDATE products SET deleted_at = UTC_TIMESTAMP(), updated_by = @admin WHERE sku = 'QA-AUD-1';   -- sản phẩm đang draft: vào thùng rác vẫn giữ draft
SELECT deleted_at IS NOT NULL AS soft_deleted, updated_by = @admin AS deleter_recorded
FROM products WHERE sku = 'QA-AUD-1';                          -- mong đợi 1 | 1

-- [A11] users tự tham chiếu (tự đăng ký => created_by = system) | EXPECT OK
INSERT INTO users (role_id, full_name, email, password_hash, created_by)
VALUES (5, 'QA Self Reg', 'qa.selfreg@test.vn', 'x', @sys);

-- [A12] bảng sổ cái dùng created_at / created_by                | EXPECT OK (không lỗi "Unknown column")
SELECT created_at, created_by FROM price_history LIMIT 1;
SELECT created_at, created_by FROM order_status_history LIMIT 1;
SELECT created_at, created_by FROM inventory_movements LIMIT 1;

-- [A13] tài khoản system tồn tại, không đăng nhập được           | EXPECT: locked | system
SELECT u.status, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = @sys;

-- [A14] áp dụng cho bảng con của sản phẩm                        | EXPECT OK
INSERT INTO product_images (product_id, url, created_by) SELECT id, '/uploads/qa.jpg', @admin FROM products WHERE sku = 'QA-AUD-2';
SELECT updated_by = @admin AS child_default_ok FROM product_images WHERE url = '/uploads/qa.jpg';   -- mong đợi 1

ROLLBACK;

-- =====================================================================
-- B. TRUY VẤN ĐỐI SOÁT (mỗi truy vấn phải trả 0 dòng). Chạy định kỳ / sau mỗi deploy.
-- =====================================================================

-- [B1] Bản ghi thiếu người tạo hoặc người cập nhật (bug backend, hoặc dữ liệu cũ chưa backfill)
SELECT 'roles' AS tbl, id AS row_id FROM roles WHERE created_by IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'users' AS tbl, id AS row_id FROM users WHERE created_by IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'brands' AS tbl, id AS row_id FROM brands WHERE created_by IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'categories' AS tbl, id AS row_id FROM categories WHERE created_by IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'products' AS tbl, id AS row_id FROM products WHERE created_by IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'product_specs' AS tbl, product_id AS row_id FROM product_specs WHERE created_by IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'product_images' AS tbl, id AS row_id FROM product_images WHERE created_by IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'user_addresses' AS tbl, id AS row_id FROM user_addresses WHERE created_by IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'orders' AS tbl, id AS row_id FROM orders WHERE created_by IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'order_details' AS tbl, id AS row_id FROM order_details WHERE created_by IS NULL OR updated_by IS NULL;

-- [B2] Bảng sổ cái thiếu created_by
SELECT 'inventory_movements' AS tbl, id AS row_id FROM inventory_movements WHERE created_by IS NULL
UNION ALL
SELECT 'price_history' AS tbl, id AS row_id FROM price_history WHERE created_by IS NULL
UNION ALL
SELECT 'order_status_history' AS tbl, id AS row_id FROM order_status_history WHERE created_by IS NULL;

-- [B3] Mốc cập nhật nhỏ hơn mốc tạo (sai múi giờ kết nối hoặc ghi tay)
SELECT 'roles' AS tbl, id AS row_id FROM roles WHERE updated_at < created_at
UNION ALL
SELECT 'users' AS tbl, id AS row_id FROM users WHERE updated_at < created_at
UNION ALL
SELECT 'brands' AS tbl, id AS row_id FROM brands WHERE updated_at < created_at
UNION ALL
SELECT 'categories' AS tbl, id AS row_id FROM categories WHERE updated_at < created_at
UNION ALL
SELECT 'products' AS tbl, id AS row_id FROM products WHERE updated_at < created_at
UNION ALL
SELECT 'product_specs' AS tbl, product_id AS row_id FROM product_specs WHERE updated_at < created_at
UNION ALL
SELECT 'product_images' AS tbl, id AS row_id FROM product_images WHERE updated_at < created_at
UNION ALL
SELECT 'user_addresses' AS tbl, id AS row_id FROM user_addresses WHERE updated_at < created_at
UNION ALL
SELECT 'orders' AS tbl, id AS row_id FROM orders WHERE updated_at < created_at
UNION ALL
SELECT 'order_details' AS tbl, id AS row_id FROM order_details WHERE updated_at < created_at;

-- [B4] Tài khoản system bị đăng nhập / bị dùng như user thường (cần = 0)
SELECT id FROM users u WHERE email = 'system@laptopshop.local' AND (status <> 'locked' OR last_login_at IS NOT NULL);

-- [B5] updated_by lệch với người thực hiện được ghi trong audit_logs (backend quên set updated_by)
--      Chỉ áp dụng cho thao tác backend có ghi audit_logs (entity = 'product').
SELECT p.id, p.updated_by, a.user_id AS audit_actor, a.created_at AS audit_time
FROM products p
JOIN audit_logs a ON a.entity = 'product' AND a.entity_id = p.id
WHERE a.created_at >= p.updated_at - INTERVAL 5 SECOND
  AND a.action IN ('update','delete','restore')
  AND a.user_id <> p.updated_by;
