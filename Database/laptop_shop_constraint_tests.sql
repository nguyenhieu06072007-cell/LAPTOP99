-- =====================================================================
-- laptop_shop  |  BỘ TEST RÀNG BUỘC CHO QA / BACKEND
-- Chạy SAU laptop_shop_constraints.sql.
--
-- Cách chạy (tiếp tục khi gặp lỗi, in từng câu để đối chiếu):
--     mysql -u root -p -f -vvv laptop_shop < laptop_shop_constraint_tests.sql
-- Mỗi test có dạng:  [Txx] mô tả  |  EXPECT = mã lỗi MySQL mong đợi
--     OK   : câu lệnh phải chạy thành công
--     1062 : Duplicate entry (UNIQUE / PK)
--     1048 : Column cannot be null (NOT NULL)
--     1452 : Cannot add or update a child row (FK, thiếu cha)
--     1451 : Cannot delete or update a parent row (FK, RESTRICT)
--     3819 : Check constraint is violated
--     1644 : Lỗi do trigger (SIGNAL 45000), đọc MESSAGE_TEXT để biết lý do
-- Toàn bộ chạy trong 1 transaction và ROLLBACK ở cuối => không để lại rác.
-- Câu lệnh nào KHÔNG báo lỗi như EXPECT = ràng buộc đang thiếu/sai.
-- =====================================================================

START TRANSACTION;

-- ---------- DỮ LIỆU NỀN (tất cả phải OK) ----------
INSERT INTO users (id, role_id, full_name, email, password_hash)
VALUES (900001, 5, 'QA Customer', 'qa.customer@test.vn', 'x');

INSERT INTO orders (id, order_code, user_id, customer_name, customer_email, customer_phone,
                    receiver_name, receiver_phone, province, ward, address_line,
                    subtotal, discount_amount, shipping_fee, total_amount)
VALUES (900001, 'QA-0000001', 900001, 'QA Customer', 'qa.customer@test.vn', '0901234567',
        'QA Receiver', '0901234567', 'Ha Noi', 'Cau Giay', '1 Test Street',
        13990000, 0, 30000, 14020000);

INSERT INTO order_details (order_id, product_id, product_sku, product_name, quantity, original_price, unit_price)
VALUES (900001, 2, 'DELL-INS15-3520', 'Dell Inspiron 15 3520', 1, 14990000, 13990000);

INSERT INTO carts (id, user_id) VALUES (900001, 900001);
INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (900001, 2, 1);

INSERT INTO categories (id, parent_id, name, slug) VALUES (900001, NULL, 'QA A', 'qa-a');
INSERT INTO categories (id, parent_id, name, slug) VALUES (900002, 900001, 'QA B', 'qa-b');

-- ===================== A. UNIQUE / NOT NULL / DEFAULT =====================
-- [T01] SKU trùng sản phẩm mẫu                          | EXPECT 1062
INSERT INTO products (sku,name,slug,brand_id,category_id,price) VALUES ('DELL-XPS13-9340','QA','qa-t01',1,1,1000000);
-- [T02] slug trùng                                      | EXPECT 1062
INSERT INTO products (sku,name,slug,brand_id,category_id,price) VALUES ('QA-T02','QA','laptop-dell-xps-13-9340-core-ultra-7-155h-16gb-512gb',1,1,1000000);
-- [T03] email trùng admin                               | EXPECT 1062
INSERT INTO users (role_id, full_name, email, password_hash) VALUES (5,'QA Dup','admin@laptopshop.vn','x');
-- [T04] order_code trùng                                | EXPECT 1062
INSERT INTO orders (order_code,customer_name,customer_email,customer_phone,receiver_name,receiver_phone,province,ward,address_line,subtotal,total_amount)
VALUES ('QA-0000001','A','a@b.vn','0901234567','A','0901234567','HN','W','addr',1000,1000);
-- [T05] cùng sản phẩm 2 lần trong 1 giỏ                 | EXPECT 1062
INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (900001, 2, 1);
-- [T06] cùng sản phẩm 2 dòng trong 1 đơn (đơn còn pending) | EXPECT 1062
INSERT INTO order_details (order_id, product_id, product_sku, product_name, quantity, original_price, unit_price)
VALUES (900001, 2, 'DELL-INS15-3520', 'Dup', 1, 14990000, 13990000);
-- [T07] NOT NULL: name = NULL                           | EXPECT 1048
INSERT INTO products (sku,name,slug,brand_id,category_id,price) VALUES ('QA-T07',NULL,'qa-t07',1,1,1000000);
-- [T08] DEFAULT: sản phẩm tối thiểu phải nhận default   | EXPECT OK
INSERT INTO products (sku,name,slug,brand_id,category_id,price) VALUES ('QA-T08','QA Default','qa-t08',1,1,1000000);
SELECT status, stock_quantity, vat_rate, warranty_months, condition_type, condition_percent, version
FROM products WHERE sku='QA-T08';   -- mong đợi: draft | 0 | 10.00 | 12 | new | 100 | 1

-- ===================== B. KHÓA NGOẠI (thiếu cha) =====================
-- [T09] sản phẩm trỏ category không tồn tại             | EXPECT 1452
INSERT INTO products (sku,name,slug,brand_id,category_id,price) VALUES ('QA-T09','QA','qa-t09',1,99999,1000000);
-- [T10] sản phẩm trỏ brand không tồn tại                | EXPECT 1452
INSERT INTO products (sku,name,slug,brand_id,category_id,price) VALUES ('QA-T10','QA','qa-t10',99999,1,1000000);
-- [T11] đơn trỏ user không tồn tại                      | EXPECT 1452
INSERT INTO orders (order_code,user_id,customer_name,customer_email,customer_phone,receiver_name,receiver_phone,province,ward,address_line,subtotal,total_amount)
VALUES ('QA-0000002',99999999,'A','a@b.vn','0901234567','A','0901234567','HN','W','addr',1000,1000);
-- [T12] dòng hàng trỏ sản phẩm không tồn tại            | EXPECT 1452
INSERT INTO orders (id,order_code,customer_name,customer_email,customer_phone,receiver_name,receiver_phone,province,ward,address_line,subtotal,total_amount)
VALUES (900002,'QA-0000003','Guest','g@b.vn','0901234567','Guest','0901234567','HN','W','addr',1000,1000);   -- khách vãng lai: user_id NULL => OK
INSERT INTO order_details (order_id, product_id, product_sku, product_name, quantity, original_price, unit_price)
VALUES (900002, 99999999, 'X', 'X', 1, 1000, 1000);
-- [T13] dòng hàng trỏ đơn không tồn tại                 | EXPECT 1644 (trigger chạy trước FK)
INSERT INTO order_details (order_id, product_id, product_sku, product_name, quantity, original_price, unit_price)
VALUES (99999999, 2, 'X', 'X', 1, 1000, 1000);
-- [T14] user với role không tồn tại                     | EXPECT 1452
INSERT INTO users (role_id, full_name, email, password_hash) VALUES (99999,'QA','qa.role@test.vn','x');

-- ===================== C. QUY TẮC XÓA / SỬA KHÓA =====================
-- [T15] xóa category còn sản phẩm                       | EXPECT 1451
DELETE FROM categories WHERE id = 3;
-- [T16] xóa category còn category con                   | EXPECT 1451
DELETE FROM categories WHERE id = 900001;
-- [T17] xóa brand còn sản phẩm                          | EXPECT 1451
DELETE FROM brands WHERE id = 1;
-- [T18] xóa user đã có đơn                              | EXPECT 1451
DELETE FROM users WHERE id = 900001;
-- [T19] xóa sản phẩm đã nằm trong đơn                   | EXPECT 1451
DELETE FROM products WHERE id = 2;
-- [T20] xóa đơn còn dòng hàng                           | EXPECT 1451
DELETE FROM orders WHERE id = 900001;
-- [T21] xóa role đang được user dùng                    | EXPECT 1451
DELETE FROM roles WHERE id = 5;
-- [T22] đổi khóa chính của bản ghi đang được tham chiếu | EXPECT 1451
UPDATE products SET id = 999999 WHERE id = 2;
-- [T23] xóa giỏ => cart_items tự xóa theo (CASCADE)     | EXPECT OK
DELETE FROM carts WHERE id = 900001;
SELECT COUNT(*) AS cart_items_left FROM cart_items WHERE cart_id = 900001;   -- mong đợi 0
-- [T24] xóa sản phẩm mới tạo, chưa có đơn/sổ kho nào      | EXPECT OK
--       (specs/images của nó, nếu có, tự xóa theo CASCADE)
DELETE FROM products WHERE sku = 'QA-T08';

-- ===================== D. CHECK =====================
-- [T25] price = 0                                       | EXPECT 3819
INSERT INTO products (sku,name,slug,brand_id,category_id,price) VALUES ('QA-T25','QA','qa-t25',1,1,0);
-- [T26] sale_price >= price                             | EXPECT 3819
INSERT INTO products (sku,name,slug,brand_id,category_id,price,sale_price) VALUES ('QA-T26','QA','qa-t26',1,1,1000000,1000000);
-- [T27] stock âm                                        | EXPECT 3819
INSERT INTO products (sku,name,slug,brand_id,category_id,price,stock_quantity) VALUES ('QA-T27','QA','qa-t27',1,1,1000000,-1);
-- [T28] slug có chữ hoa                                 | EXPECT 3819
INSERT INTO products (sku,name,slug,brand_id,category_id,price) VALUES ('QA-T28','QA','QA-Upper',1,1,1000000);
-- [T29] máy mới nhưng condition_percent = 90            | EXPECT 3819
INSERT INTO products (sku,name,slug,brand_id,category_id,price,condition_percent) VALUES ('QA-T29','QA','qa-t29',1,1,1000000,90);
-- [T30] sale_end <= sale_start                          | EXPECT 3819
INSERT INTO products (sku,name,slug,brand_id,category_id,price,sale_price,sale_start,sale_end)
VALUES ('QA-T30','QA','qa-t30',1,1,1000000,900000,'2026-10-10','2026-10-01');
-- [T31] sản phẩm xóa mềm nhưng vẫn status=active        | EXPECT 3819
INSERT INTO products (sku,name,slug,brand_id,category_id,price,status,deleted_at)
VALUES ('QA-T31','QA','qa-t31',1,1,1000000,'active',NOW());
-- [T32] email sai định dạng                             | EXPECT 3819
INSERT INTO users (role_id, full_name, email, password_hash) VALUES (5,'QA','not-an-email','x');
-- [T33] số điện thoại sai                               | EXPECT 3819
INSERT INTO users (role_id, full_name, email, phone, password_hash) VALUES (5,'QA','qa.phone@test.vn','abc','x');
-- [T34] số lượng trong giỏ = 0                          | EXPECT 3819
INSERT INTO carts (id, user_id) VALUES (900002, NULL);
INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (900002, 2, 0);
-- [T35] đơn: total <> subtotal - discount + ship        | EXPECT 3819
INSERT INTO orders (order_code,customer_name,customer_email,customer_phone,receiver_name,receiver_phone,province,ward,address_line,subtotal,discount_amount,shipping_fee,total_amount)
VALUES ('QA-0000004','A','a@b.vn','0901234567','A','0901234567','HN','W','addr',1000,0,0,999);
-- [T36] đơn: order_code sai định dạng                   | EXPECT 3819
INSERT INTO orders (order_code,customer_name,customer_email,customer_phone,receiver_name,receiver_phone,province,ward,address_line,subtotal,total_amount)
VALUES ('x','A','a@b.vn','0901234567','A','0901234567','HN','W','addr',1000,1000);
-- [T37] dòng hàng quantity = 0                          | EXPECT 3819   (đơn 900002 đang pending)
INSERT INTO order_details (order_id, product_id, product_sku, product_name, quantity, original_price, unit_price)
VALUES (900002, 1, 'S', 'N', 0, 1000, 1000);
-- [T38] dòng hàng unit_price > original_price           | EXPECT 3819
INSERT INTO order_details (order_id, product_id, product_sku, product_name, quantity, original_price, unit_price)
VALUES (900002, 1, 'S', 'N', 1, 1000, 2000);
-- [T39] dòng hàng giảm giá lớn hơn giá trị dòng         | EXPECT 3819
INSERT INTO order_details (order_id, product_id, product_sku, product_name, quantity, original_price, unit_price, discount_amount)
VALUES (900002, 1, 'S', 'N', 1, 1000, 1000, 5000);
-- [T40] sổ kho: export nhưng quantity dương             | EXPECT 3819
INSERT INTO inventory_movements (product_id, type, quantity, stock_before, stock_after) VALUES (2, 'export', 5, 10, 15);
-- [T41] sổ kho: stock_after sai                         | EXPECT 3819
INSERT INTO inventory_movements (product_id, type, quantity, stock_before, stock_after) VALUES (2, 'import', 5, 10, 99);
-- [T42] lịch sử giá: sale >= price                      | EXPECT 3819
INSERT INTO price_history (product_id, old_price, new_price, new_sale) VALUES (2, 14990000, 14990000, 14990000);

-- ===================== E. TRIGGER: máy trạng thái & bất biến =====================
-- [T43] tạo đơn với status != pending                   | EXPECT 1644
INSERT INTO orders (order_code,status,customer_name,customer_email,customer_phone,receiver_name,receiver_phone,province,ward,address_line,subtotal,total_amount)
VALUES ('QA-0000005','confirmed','A','a@b.vn','0901234567','A','0901234567','HN','W','addr',1000,1000);
-- [T44] nhảy trạng thái pending -> shipping             | EXPECT 1644
UPDATE orders SET status='shipping', confirmed_at=NOW(), shipped_at=NOW() WHERE id = 900001;
-- [T45] đổi order_code                                  | EXPECT 1644
UPDATE orders SET order_code = 'QA-9999999' WHERE id = 900001;
-- [T46] pending -> confirmed hợp lệ                     | EXPECT OK
UPDATE orders SET status='confirmed', confirmed_at=NOW() WHERE id = 900001;
-- [T47] confirmed nhưng thiếu confirmed_at              | EXPECT 3819   (đơn 900002: pending -> confirmed không kèm mốc thời gian)
UPDATE orders SET status='confirmed' WHERE id = 900002;
-- [T48] thêm dòng hàng vào đơn đã confirmed             | EXPECT 1644
INSERT INTO order_details (order_id, product_id, product_sku, product_name, quantity, original_price, unit_price)
VALUES (900001, 1, 'S', 'N', 1, 1000, 1000);
-- [T49] sửa số lượng dòng hàng của đơn đã confirmed     | EXPECT 1644
UPDATE order_details SET quantity = 5 WHERE order_id = 900001;
-- [T50] xóa dòng hàng của đơn đã confirmed              | EXPECT 1644
DELETE FROM order_details WHERE order_id = 900001;
-- [T51] sửa tiền của đơn đã confirmed                   | EXPECT 1644
UPDATE orders SET shipping_fee = 0, total_amount = 13990000 WHERE id = 900001;
-- [T52] hủy đơn nhưng thiếu cancelled_at                | EXPECT 3819
UPDATE orders SET status='cancelled' WHERE id = 900001;
-- [T53] hủy đơn đúng cách                               | EXPECT OK
UPDATE orders SET status='cancelled', cancelled_at=NOW(), cancel_reason='QA test' WHERE id = 900001;
-- [T54] đơn đã hủy không được mở lại                    | EXPECT 1644
UPDATE orders SET status='pending', cancelled_at=NULL WHERE id = 900001;

-- ===================== F. TRIGGER: danh mục & sổ cái =====================
-- [T55] danh mục làm cha của chính nó                   | EXPECT 1644
UPDATE categories SET parent_id = 900001 WHERE id = 900001;
-- [T56] vòng lặp A -> B -> A                            | EXPECT 1644
UPDATE categories SET parent_id = 900002 WHERE id = 900001;
-- [T57] sửa sổ kho                                      | EXPECT 1644
UPDATE inventory_movements SET reason = 'hack' ORDER BY id LIMIT 1;
-- [T58] xóa sổ kho                                      | EXPECT 1644
DELETE FROM inventory_movements ORDER BY id LIMIT 1;
-- [T59] sửa / xóa lịch sử giá                           | EXPECT 1644 (cả hai câu)
UPDATE price_history SET new_price = 1 ORDER BY id LIMIT 1;
DELETE FROM price_history ORDER BY id LIMIT 1;

ROLLBACK;

-- =====================================================================
-- G. TRUY VẤN ĐỐI SOÁT: quy tắc DB không ép được. Mỗi truy vấn phải trả 0 dòng.
-- Chạy định kỳ / sau mỗi lần deploy / trong test E2E của backend.
-- =====================================================================

-- [R1] Đơn lệch tiền so với dòng hàng, hoặc đơn không có dòng hàng nào
SELECT o.id, o.order_code, o.subtotal, x.line_subtotal, o.discount_amount, x.line_discount
FROM orders o
LEFT JOIN (SELECT order_id, SUM(unit_price * quantity) AS line_subtotal, SUM(discount_amount) AS line_discount
           FROM order_details GROUP BY order_id) x ON x.order_id = o.id
WHERE x.order_id IS NULL OR o.subtotal <> x.line_subtotal OR o.discount_amount <> x.line_discount;

-- [R2] Tồn kho products lệch dòng cuối của sổ kho
SELECT p.id, p.sku, p.stock_quantity, COALESCE(m.stock_after, 0) AS ledger_stock
FROM products p
LEFT JOIN inventory_movements m
       ON m.id = (SELECT MAX(id) FROM inventory_movements WHERE product_id = p.id)
WHERE p.stock_quantity <> COALESCE(m.stock_after, 0);

-- [R3] User có hơn 1 địa chỉ mặc định
SELECT user_id, COUNT(*) AS default_count
FROM user_addresses WHERE is_default = 1 AND deleted_at IS NULL
GROUP BY user_id HAVING COUNT(*) > 1;

-- [R4] Sản phẩm đang bán không có đúng 1 ảnh thumbnail
SELECT p.id, p.sku, COUNT(i.id) AS thumbnail_count
FROM products p
LEFT JOIN product_images i ON i.product_id = p.id AND i.is_thumbnail = 1
WHERE p.status = 'active' AND p.deleted_at IS NULL
GROUP BY p.id, p.sku HAVING COUNT(i.id) <> 1;

-- [R5] Giỏ không thuộc user nào và cũng không có session_token
SELECT id FROM carts WHERE user_id IS NULL AND session_token IS NULL;

-- [R6] Sản phẩm đã xóa mềm vẫn nằm trong giỏ
SELECT ci.id, ci.cart_id, ci.product_id
FROM cart_items ci JOIN products p ON p.id = ci.product_id
WHERE p.deleted_at IS NOT NULL OR p.status IN ('inactive','discontinued');

-- [R7] Đơn đã chuyển trạng thái nhưng thiếu dòng trong order_status_history
SELECT o.id, o.order_code, o.status
FROM orders o
WHERE o.status <> 'pending'
  AND NOT EXISTS (SELECT 1 FROM order_status_history h WHERE h.order_id = o.id AND h.to_status = o.status);
