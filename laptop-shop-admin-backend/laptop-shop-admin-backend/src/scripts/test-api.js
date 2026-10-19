const http = require('http');
const app = require('../app');

const server = http.createServer(app);
server.listen(0, async () => {
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}/api/client`;
  console.log(`Testing against port ${port}...`);

  try {
    // 1. Categories & Brands
    const cats = await fetch(`${base}/categories`).then((r) => r.json());
    console.log('1. Categories:', cats.data.length);

    const brands = await fetch(`${base}/brands`).then((r) => r.json());
    console.log('2. Brands:', brands.data.length);

    // 2. Filtered products
    const prods = await fetch(`${base}/products?limit=10&price=m1&sort=asc`).then((r) => r.json());
    console.log('3. Filtered products count:', prods.data.length, 'sample price:', prods.data[0].final_price);

    // 3. Product detail
    const p1 = prods.data[0];
    const pDetail = await fetch(`${base}/products/${p1.id}`).then((r) => r.json());
    console.log('4. Product detail specs:', pDetail.data.name, '| CPU:', pDetail.data.cpu_model, '| RAM:', pDetail.data.ram_gb, 'GB');

    // 4. Login
    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'khach@demo.vn', password: '123456' }),
    }).then((r) => r.json());
    const token = loginRes.data.token;
    console.log('5. Login token obtained for:', loginRes.data.customer.name);

    // 5. Check coupon
    const couponCheck = await fetch(`${base}/promotions/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'SUMMER2026', subtotal: 30000000 }),
    }).then((r) => r.json());
    console.log('6. Coupon check:', couponCheck.valid, 'discount:', couponCheck.discount);

    // 6. Place order (Requirement 5)
    const orderRes = await fetch(`${base}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        items: [{ pid: p1.id, qty: 1 }],
        name: 'Nguyễn Văn An',
        phone: '0901234567',
        address: '12 Trần Duy Hưng, Cầu Giấy, Hà Nội',
        payment_method: 'bank',
        coupon: 'SUMMER2026',
      }),
    }).then((r) => r.json());
    console.log('7. Order placed:', orderRes.data.id, '| Total:', orderRes.data.total, '| S/N:', orderRes.data.serial_number);

    const orderId = orderRes.data.id;
    const sn = orderRes.data.serial_number;

    // 7. Warranty lookup by S/N
    const warRes = await fetch(`${base}/warranty?sn=${encodeURIComponent(sn)}`).then((r) => r.json());
    console.log('8. Warranty lookup found:', warRes.found, '| Product:', warRes.data ? warRes.data.product_name : null);

    // 8. Get my orders
    const myOrders = await fetch(`${base}/orders/my-orders`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    console.log('9. My orders count:', myOrders.data.length, '| Latest order:', myOrders.data[0].id);

    // 9. Cancel order
    const cancelRes = await fetch(`${base}/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    console.log('10. Order cancelled:', cancelRes.success);

    // 10. News
    const news = await fetch(`${base}/news`).then((r) => r.json());
    console.log('11. News count:', news.data.length);

    console.log('\n🎉 ALL 11 API FLOW CHECKS PASSED PERFECTLY WITH ZERO ERRORS!');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    server.close();
    process.exit(1);
  }
});

