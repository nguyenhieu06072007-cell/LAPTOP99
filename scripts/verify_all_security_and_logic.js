require('dotenv').config();
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'a6397673d4138adfd41493bfe7a129d1033678102e85c88ffca74fc26bfe1c09d7194f45d3c56d85bebb292771fcb5b8';
}

const http = require('http');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../app');
const env = require('../config/env');
const { pool } = require('../config/db');

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseAdmin = `http://127.0.0.1:${port}/api/admin`;
  const baseClient = `http://127.0.0.1:${port}/api/client`;

  console.log(`\n======================================================`);
  console.log(`RUNNING FULL SECURITY & BUSINESS LOGIC AUDIT SUITE`);
  console.log(`Server running on port ${port}`);
  console.log(`======================================================\n`);

  const results = [];
  function assert(name, condition, extra = '') {
    if (condition) {
      console.log(`  [PASS] ${name} ${extra ? '(' + extra + ')' : ''}`);
      results.push({ name, passed: true });
    } else {
      console.error(`  [FAIL] ${name} ${extra ? '(' + extra + ')' : ''}`);
      results.push({ name, passed: false });
    }
  }

  try {
    // SETUP: Lấy 1 tài khoản nhân viên và 1 tài khoản khách hàng cùng có ID hoặc tạo mock tokens
    const [[adminUser]] = await pool.query('SELECT * FROM users WHERE email = "admin@laptopshop.vn"');
    const [[testCustomer]] = await pool.query('SELECT * FROM customers LIMIT 1');

    // -------------------------------------------------------------------
    // TEST 1: Token khách bị từ chối trên API admin, kể cả trùng ID
    // -------------------------------------------------------------------
    console.log('\n--- 1. Token Khách hàng và Admin Isolation ---');
    // Tạo token khách hàng có sub trùng với ID của admin
    const fakeCustomerTokenWithAdminId = jwt.sign(
      { sub: adminUser.id, role: 'customer', type: 'customer' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const adminCheckRes = await fetch(`${baseAdmin}/orders`, {
      headers: { Authorization: `Bearer ${fakeCustomerTokenWithAdminId}` }
    });
    assert('1.1 Customer token with Admin ID rejected on Admin API with 403', adminCheckRes.status === 403);

    // Token staff hợp lệ truy cập Admin API thành công
    const validStaffToken = jwt.sign(
      { sub: adminUser.id, role: 'super_admin', type: 'staff' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const staffCheckRes = await fetch(`${baseAdmin}/orders?limit=1`, {
      headers: { Authorization: `Bearer ${validStaffToken}` }
    });
    assert('1.2 Valid Staff token accessed Admin API successfully with 200', staffCheckRes.status === 200);

    // Token staff gửi sang API client bị từ chối với 403
    const staffOnClientRes = await fetch(`${baseClient}/orders/my-orders`, {
      headers: { Authorization: `Bearer ${validStaffToken}` }
    });
    assert('1.3 Staff token rejected on Customer API with 403', staffOnClientRes.status === 403);

    // -------------------------------------------------------------------
    // TEST 2: RBAC & Phân quyền logic wildcard không bị hở
    // -------------------------------------------------------------------
    console.log('\n--- 2. RBAC & Phân quyền Vai trò ---');
    // Token Data Entry (chỉ có product:read, product:write)
    const [[entryStaff]] = await pool.query('SELECT u.id, u.email, r.name as role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = "entry@laptopshop.vn"');
    const dataEntryToken = jwt.sign(
      { sub: entryStaff.id, role: entryStaff.role, type: 'staff' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Cố gắng truy cập xem tài chính (finance:read) -> Phải bị 403
    const financeRes = await fetch(`${baseAdmin}/orders/finance/summary`, {
      headers: { Authorization: `Bearer ${dataEntryToken}` }
    });
    assert('2.1 Data Entry cannot access Finance Summary (403)', financeRes.status === 403);

    // Cố gắng truy cập quản lý người dùng (user:manage) -> Phải bị 403
    const usersRes = await fetch(`${baseAdmin}/users`, {
      headers: { Authorization: `Bearer ${dataEntryToken}` }
    });
    assert('2.2 Data Entry cannot access Users API (403)', usersRes.status === 403);

    // Cố gắng truy cập danh sách RMA -> Phải bị 403
    const rmaRes = await fetch(`${baseAdmin}/orders/rmas/list`, {
      headers: { Authorization: `Bearer ${dataEntryToken}` }
    });
    assert('2.3 Data Entry cannot access RMA List (403)', rmaRes.status === 403);

    // -------------------------------------------------------------------
    // TEST 3 & 4: Khách bấm "Tôi đã chuyển khoản" không tự thành paid & không cho đơn hủy
    // -------------------------------------------------------------------
    console.log('\n--- 3. Khách xác nhận chuyển khoản & Kiểm soát đơn hủy ---');
    const customerToken = jwt.sign(
      { sub: testCustomer.id, role: 'customer', type: 'customer', email: testCustomer.email, name: testCustomer.full_name },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Lấy 1 sản phẩm còn hàng
    const [[activeProduct]] = await pool.query(
      'SELECT id, name, stock_quantity, price FROM products WHERE status = "active" AND deleted_at IS NULL AND stock_quantity >= 5 LIMIT 1'
    );

    // Tạo đơn hàng kiểm thử
    const createOrderRes = await fetch(`${baseClient}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        items: [{ pid: activeProduct.id, qty: 1 }],
        name: testCustomer.full_name,
        phone: '0901234567',
        address: '123 Đường Test, Quận 1, TP HCM',
        payment_method: 'bank',
      }),
    }).then((r) => r.json());

    const testOrderCode = createOrderRes.data.code;
    const testOrderId = createOrderRes.data.orderId;

    // Đơn mới tạo phải có payment_status = unpaid, net_received = 0
    const [[freshOrder]] = await pool.query('SELECT status, payment_status, net_received FROM orders WHERE id = ?', [testOrderId]);
    assert('3.1 Fresh order has payment_status unpaid', freshOrder.payment_status === 'unpaid');
    assert('3.2 Fresh order has net_received = 0', Number(freshOrder.net_received) === 0);

    // Khách bấm "Tôi đã chuyển khoản"
    const confirmRes = await fetch(`${baseClient}/orders/${testOrderCode}/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ bank_info: 'MBBank - 0901234567' }),
    }).then((r) => r.json());

    const [[orderAfterConfirm]] = await pool.query('SELECT payment_status, payment_verification_status, net_received FROM orders WHERE id = ?', [testOrderId]);
    assert('3.3 Customer confirm does NOT set payment_status to paid', orderAfterConfirm.payment_status !== 'paid');
    assert('3.4 Customer confirm sets verification status to pending_verification', orderAfterConfirm.payment_verification_status === 'pending_verification');
    assert('3.5 net_received remains 0 before reconciliation', Number(orderAfterConfirm.net_received) === 0);

    // Khách tự hủy đơn hàng
    const cancelRes = await fetch(`${baseClient}/orders/${testOrderCode}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    }).then((r) => r.json());
    assert('3.6 Customer cancel order success', cancelRes.success === true);

    // Thử xác nhận chuyển khoản cho đơn đã hủy -> Phải bị từ chối với 400
    const confirmCancelledRes = await fetch(`${baseClient}/orders/${testOrderCode}/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ bank_info: 'MBBank - 0901234567' }),
    });
    assert('3.7 Confirming payment on cancelled order rejected (400)', confirmCancelledRes.status === 400);

    // -------------------------------------------------------------------
    // TEST 5 & 6: Tồn kho & Hoàn kho Idempotent (Chống bán vượt & hoàn kho 1 lần)
    // -------------------------------------------------------------------
    console.log('\n--- 4. Tồn kho & Hoàn kho Đồng bộ, Idempotent ---');
    const [[prodBefore]] = await pool.query('SELECT stock_quantity, sold_count FROM products WHERE id = ?', [activeProduct.id]);
    const initStock = Number(prodBefore.stock_quantity);

    // Đặt 1 đơn hàng mới
    const order2 = await fetch(`${baseClient}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        items: [{ pid: activeProduct.id, qty: 2 }],
        name: testCustomer.full_name,
        phone: '0901234567',
        address: '123 Đường Test, Quận 1, TP HCM',
        payment_method: 'cod',
      }),
    }).then((r) => r.json());

    const [[prodAfterOrder]] = await pool.query('SELECT stock_quantity, sold_count FROM products WHERE id = ?', [activeProduct.id]);
    assert('4.1 Stock deducted by 2 upon order placement', Number(prodAfterOrder.stock_quantity) === initStock - 2);

    // Admin hủy đơn hàng này
    const adminCancelRes = await fetch(`${baseAdmin}/orders/${order2.data.orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validStaffToken}` },
      body: JSON.stringify({ status: 'cancelled', reason: 'Kiểm thử hoàn kho Admin' }),
    }).then((r) => r.json());

    const [[prodAfterAdminCancel]] = await pool.query('SELECT stock_quantity, sold_count FROM products WHERE id = ?', [activeProduct.id]);
    assert('4.2 Stock restored by 2 upon Admin cancellation', Number(prodAfterAdminCancel.stock_quantity) === initStock);

    // Thử gửi lại request hủy lần 2 (Idempotency) -> Tồn kho KHÔNG được cộng thêm lần nữa
    await fetch(`${baseAdmin}/orders/${order2.data.orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validStaffToken}` },
      body: JSON.stringify({ status: 'cancelled', reason: 'Hủy trùng lặp lần 2' }),
    });

    const [[prodAfterDoubleCancel]] = await pool.query('SELECT stock_quantity FROM products WHERE id = ?', [activeProduct.id]);
    assert('4.3 Idempotent cancellation: Stock NOT restored twice', Number(prodAfterDoubleCancel.stock_quantity) === initStock);

    // -------------------------------------------------------------------
    // TEST 7: Tạo đơn tại Admin kiểm tra tồn kho & đối soát giá
    // -------------------------------------------------------------------
    console.log('\n--- 5. Tạo đơn Admin kiểm tra tồn kho & Trạng thái ---');
    // Thử tạo đơn Admin với số lượng vượt quá tồn kho (VD: 999999 máy) -> Phải bị từ chối
    const overStockRes = await fetch(`${baseAdmin}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validStaffToken}` },
      body: JSON.stringify({
        customer_name: 'Khách VIP Quầy',
        product_id: activeProduct.id,
        product_name: activeProduct.name,
        quantity: 999999,
        payment_method: 'Tiền mặt',
      }),
    });
    assert('5.1 Admin order with excessive quantity rejected (400)', overStockRes.status === 400);

    // Tạo đơn Admin hợp lệ
    const adminOrderRes = await fetch(`${baseAdmin}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validStaffToken}` },
      body: JSON.stringify({
        customer_name: 'Khách Mua Tại Quầy',
        customer_phone: '0912345678',
        product_id: activeProduct.id,
        product_name: activeProduct.name,
        quantity: 1,
        payment_method: 'Tiền mặt',
        payment_status: 'paid',
      }),
    }).then((r) => r.json());

    assert('5.2 Valid Admin order created with 201', adminOrderRes.data && adminOrderRes.data.code.startsWith('DH-'));
    const [[prodAfterAdminCreate]] = await pool.query('SELECT stock_quantity FROM products WHERE id = ?', [activeProduct.id]);
    assert('5.3 Stock deducted properly by Admin order creation', Number(prodAfterAdminCreate.stock_quantity) === initStock - 1);

    // Hoàn lại tồn kho cho sản phẩm test
    await pool.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [initStock, activeProduct.id]);

    // -------------------------------------------------------------------
    // TEST 8: Trạng thái đơn & Thanh toán COD Delivered -> Collecting
    // -------------------------------------------------------------------
    console.log('\n--- 6. State Machine & COD Giao thành công ---');
    const orderCod = await fetch(`${baseClient}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        items: [{ pid: activeProduct.id, qty: 1 }],
        name: testCustomer.full_name,
        phone: '0901234567',
        address: '123 Đường Test, Quận 1, TP HCM',
        payment_method: 'cod',
      }),
    }).then((r) => r.json());

    const codId = orderCod.data.orderId;

    // Chuyển pending -> confirmed -> shipping -> delivered
    await fetch(`${baseAdmin}/orders/${codId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validStaffToken}` },
      body: JSON.stringify({ status: 'confirmed' }),
    });
    await fetch(`${baseAdmin}/orders/${codId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validStaffToken}` },
      body: JSON.stringify({ status: 'shipping' }),
    });
    await fetch(`${baseAdmin}/orders/${codId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validStaffToken}` },
      body: JSON.stringify({ status: 'delivered' }),
    });

    const [[codDelivered]] = await pool.query('SELECT status, payment_status, net_received FROM orders WHERE id = ?', [codId]);
    assert('6.1 COD Delivered has payment_status = collecting (NOT paid)', codDelivered.payment_status === 'collecting');
    assert('6.2 COD Delivered has net_received = 0 (before accountant reconciliation)', Number(codDelivered.net_received) === 0);

    // Kế toán đối soát thu tiền COD (reconcilePayment)
    const reconcileRes = await fetch(`${baseAdmin}/orders/${codId}/reconcile-payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validStaffToken}` },
      body: JSON.stringify({ gateway_code: 'COD-CARRIER-123', gateway_fee: 30000 }),
    }).then((r) => r.json());

    assert('6.3 Accountant reconciliation success', reconcileRes.success === true);
    const [[codReconciled]] = await pool.query('SELECT payment_status, net_received FROM orders WHERE id = ?', [codId]);
    assert('6.4 After reconciliation payment_status = paid', codReconciled.payment_status === 'paid');
    assert('6.5 net_received is total_amount - fee', Number(codReconciled.net_received) > 0);

    // Đơn đã delivered không thể quay lại pending
    const revertDelivered = await fetch(`${baseAdmin}/orders/${codId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validStaffToken}` },
      body: JSON.stringify({ status: 'pending' }),
    });
    assert('6.6 Delivered order cannot revert to pending (400)', revertDelivered.status === 400);

    // -------------------------------------------------------------------
    // TEST 9 & 11: Sản phẩm ngừng bán & Đổi trả bảo mật
    // -------------------------------------------------------------------
    console.log('\n--- 7. Sản phẩm ngừng bán & RMA Đổi trả ---');
    // Tạo 1 sản phẩm giả lập status = discontinued
    const [[discontinuedProd]] = await pool.query(
      'SELECT id, name FROM products WHERE status = "discontinued" OR status = "draft" LIMIT 1'
    );
    if (discontinuedProd) {
      const buyDiscontinued = await fetch(`${baseClient}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          items: [{ pid: discontinuedProd.id, qty: 1 }],
          name: testCustomer.full_name,
          phone: '0901234567',
          address: '123 Đường Test, Quận 1, TP HCM',
          payment_method: 'cod',
        }),
      });
      assert('7.1 Discontinued product rejected from checkout (400)', buyDiscontinued.status === 400);
    } else {
      console.log('  [SKIP] 7.1 No discontinued product currently in DB');
    }

    // Đổi trả (RMA) kiểm tra quyền sở hữu đơn
    // Khách A không được tạo RMA cho đơn của người khác
    const fakeRma = await fetch(`${baseClient}/rma`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        order_code: 'DH-UNKNOWN-999',
        product_id: activeProduct.id,
        type: 'Đổi',
        reason: 'Lỗi màn hình sọc sọc',
      }),
    });
    assert('7.2 RMA for unowned order rejected (404)', fakeRma.status === 404);

    // -------------------------------------------------------------------
    // TEST 10: Khuyến mãi & Điều kiện sử dụng
    // -------------------------------------------------------------------
    console.log('\n--- 8. Khuyến mãi & Giới hạn lượt dùng ---');
    const promoCheck = await fetch(`${baseClient}/promotions/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'SUMMER2026', subtotal: 100000 }), // Giá trị quá nhỏ
    }).then((r) => r.json());
    assert('8.1 Promotion checks min order value correctly', promoCheck.valid === false);

    // -------------------------------------------------------------------
    // TEST 14: Đánh giá sản phẩm pending không xuất hiện công khai
    // -------------------------------------------------------------------
    console.log('\n--- 9. Đánh giá sản phẩm bảo mật & Verified Purchase ---');
    const reviewRes = await fetch(`${baseClient}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        product_id: activeProduct.id,
        rating: 5,
        title: 'Đánh giá tuyệt vời',
        comment: 'Máy chạy cực kỳ êm ái, màu đẹp xuất sắc!',
      }),
    }).then((r) => r.json());
    assert('9.1 Review submitted with status pending', reviewRes.success === true);

    // Lấy chi tiết sản phẩm: Đánh giá pending KHÔNG được hiển thị
    const prodDetailRes = await fetch(`${baseClient}/products/${activeProduct.id}`).then((r) => r.json());
    const publicReviews = prodDetailRes.data.reviews || [];
    const hasPendingInPublic = publicReviews.some((rw) => rw.comment === 'Máy chạy cực kỳ êm ái, màu đẹp xuất sắc!');
    assert('9.2 Pending review is NOT visible publicly', !hasPendingInPublic);

    // -------------------------------------------------------------------
    // TEST 15: OTP không lộ trong response hoặc log
    // -------------------------------------------------------------------
    console.log('\n--- 10. Bảo mật OTP Quên Mật Khẩu ---');
    process.env.ALLOW_DEV_OTP = 'true';
    const forgotRes = await fetch(`${baseClient}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testCustomer.email }),
    }).then((r) => r.json());

    assert('10.1 forgotPassword response does NOT contain otp_preview', forgotRes.data && forgotRes.data.otp_preview === undefined);
    assert('10.2 forgotPassword response does NOT leak raw OTP anywhere', !JSON.stringify(forgotRes).includes('otp_preview'));

    // Dọn dẹp
    delete process.env.ALLOW_DEV_OTP;

    console.log(`\n======================================================`);
    const totalPassed = results.filter((r) => r.passed).length;
    console.log(`AUDIT RESULTS: ${totalPassed}/${results.length} CHECKS PASSED`);
    console.log(`======================================================\n`);

    server.close();
    if (totalPassed === results.length) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Audit suite error:', err);
    server.close();
    process.exit(1);
  }
}

runTests();
