/* ==========================================================================
   STOREFRONT MVC CONTROLLER: Checkout & Payment Controller
   ========================================================================== */

const CheckoutController = {
  async selectCheckoutPay(method) {
    cache.checkoutPay = method;
    const container = $('#checkout-qr-container');
    if (!container) {
      render();
      return;
    }
    if (method === 'bank' || method === 'card') {
      const c = await calcCart();
      const u = me();
      const memo = `LAPTOP99 ${u && u.phone ? u.phone : 'THANHTOAN'}`;
      container.innerHTML = renderBankQrBox(c.total, memo, '');
    } else {
      container.innerHTML = '';
    }
  },

  selectQrBank(bankKey, amount, memo, orderCode = '') {
    cache.qrBank = bankKey;
    const box = $('#vietqr-box');
    if (box) {
      box.outerHTML = renderBankQrBox(amount, memo, orderCode);
    } else {
      render();
    }
  },

  openBankQrModal(orderCode, amount = 0, payMethod = 'bank') {
    const memo = `LAPTOP99 ${orderCode}`;
    modal(
      mHead('Cổng Thanh Toán Mã QR Ngân Hàng (VietQR Napas 247)', `Đơn hàng: ${orderCode} · Tự động điền số tiền & nội dung`) +
        renderBankQrBox(amount, memo, orderCode),
      true,
    );
  },

  async confirmQrPayment(orderCode) {
    const btn = $('#btn-confirm-qr');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Đang xác nhận giao dịch...';
    }
    const bankKey = cache.qrBank || 'MB';
    const b = BANK_ACCOUNTS[bankKey] || BANK_ACCOUNTS.MB;
    try {
      const res = await (typeof OrderService !== 'undefined'
        ? OrderService.confirmPayment(orderCode)
        : API.post(`/orders/${orderCode}/confirm-payment`, {
            bank_info: `${b.short} - ${b.acc}`,
          }));
      if (Array.isArray(db.orders)) {
        const ord = db.orders.find((x) => (x.code || x.id) === orderCode);
        if (ord) {
          ord.payment_verification = 'pending_verification';
          save();
        }
      }
      if (Array.isArray(cache.myOrders)) {
        const ord = cache.myOrders.find((x) => (x.code || x.id) === orderCode);
        if (ord) ord.payment_verification = 'pending_verification';
      }
      closeModal();
      toast(res.message || 'Đã xác nhận thanh toán QR ngân hàng thành công!');
      render();
    } catch (err) {
      if (Array.isArray(db.orders)) {
        const ord = db.orders.find((x) => (x.code || x.id) === orderCode);
        if (ord) {
          ord.payment_verification = 'pending_verification';
          save();
        }
      }
      if (Array.isArray(cache.myOrders)) {
        const ord = cache.myOrders.find((x) => (x.code || x.id) === orderCode);
        if (ord) ord.payment_verification = 'pending_verification';
      }
      closeModal();
      toast('Đã ghi nhận yêu cầu xác nhận chuyển khoản!');
      render();
    }
  },

  async place() {
    const u = me();
    if (!u) return A.authModal();
    const n = (val('co-n') || '').trim();
    const ph = (val('co-p') || '').trim();
    const ad = (val('co-a') || '').trim();
    let hasErr = false;

    if (n.length < 2) {
      if ($('#co-n')) $('#co-n').classList.add('err');
      if ($('#err-n')) $('#err-n').textContent = 'Vui lòng nhập họ và tên người nhận (tối thiểu 2 ký tự).';
      hasErr = true;
    }
    if (!/^0\d{9}$/.test(ph)) {
      if ($('#co-p')) $('#co-p').classList.add('err');
      if ($('#err-p')) $('#err-p').textContent = 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.';
      hasErr = true;
    }
    if (!ad || ad.length < 5) {
      if ($('#co-a')) {
        $('#co-a').classList.add('err');
        $('#co-a').focus();
        try { $('#co-a').scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      }
      if ($('#err-a')) $('#err-a').textContent = '⚠️ Bắt buộc điền địa chỉ nhận hàng cụ thể (tối thiểu 5 ký tự) để thanh toán đơn hàng!';
      hasErr = true;
    }
    if (hasErr) {
      if (!ad || ad.length < 5) {
        return toast('⚠️ Bắt buộc điền địa chỉ nhận hàng mới được thanh toán đơn hàng!', 1);
      }
      return toast('Vui lòng kiểm tra lại thông tin nhận hàng', 1);
    }
    if (!db.cart.length) return toast('Giỏ hàng của bạn đang trống', 1);

    const btn = $('#btn-place-order');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Đang xử lý đơn hàng...';
    }

    // Kiểm tra mã giảm giá: Chỉ gửi khi hợp lệ, không hợp lệ thì bỏ qua (null) để thanh toán ngay
    let validCoupon = null;
    if (db.cartCoupon && typeof lastCouponCheck !== 'undefined' && lastCouponCheck && lastCouponCheck.valid) {
      validCoupon = db.cartCoupon;
    }

    const pay = ($('input[name=pay]:checked') || {}).value || cache.checkoutPay || 'cod';
    const payload = {
      items: db.cart.map((i) => ({ pid: i.pid, qty: i.qty })),
      name: n,
      phone: ph,
      address: ad,
      payment_method: pay,
      coupon: validCoupon,
      trade_in_id: db.cartTI || null,
      note: val('co-note') || null,
    };

    try {
      const res = await (typeof OrderService !== 'undefined'
        ? OrderService.createOrder(payload)
        : API.post('/orders', payload));
      const o = res.data;
      cache.lastOrder = o;
      if (!Array.isArray(db.orders)) db.orders = [];
      if (!db.orders.some((x) => (x.code || x.id) === (o.code || o.id))) {
        db.orders.unshift(o);
      }
      db.cart = [];
      db.cartCoupon = '';
      db.cartTI = '';
      u.phone = ph;
      u.addr = ad;
      save();
      toast('Đặt hàng thành công!');
      const orderCode = o.code || o.id;
      location.hash = '#/order-done/' + orderCode;
      if (pay === 'bank' || pay === 'card') {
        setTimeout(() => {
          A.openBankQrModal(orderCode, o.total || o.totalAmount, pay);
        }, 250);
      }
    } catch (err) {
      console.warn('API createOrder failed, fallback to local storage:', err);
      const calc = await calcCart();
      const fallbackCode = 'DH-' + Math.floor(100000 + Math.random() * 900000);
      const fallbackOrder = {
        id: fallbackCode,
        code: fallbackCode,
        name: n,
        phone: ph,
        address: ad,
        shipping_address: ad,
        notes: val('co-note') || '',
        payment_method: pay,
        pay: pay,
        paid: false,
        raw_status: 'pending',
        status: 'pending',
        status_text: 'Chờ xác nhận',
        total: calc.total,
        totalAmount: calc.total,
        subtotal: calc.sub,
        discount: calc.disc,
        coupon: validCoupon,
        items: db.cart.map((i) => {
          const p = P(i.pid) || {};
          return {
            pid: i.pid,
            product_id: i.pid,
            name: p.name || 'Laptop chính hãng',
            price: p.price || 0,
            unit_price: p.price || 0,
            qty: i.qty,
            quantity: i.qty,
            line_total: (p.price || 0) * i.qty,
            sku: p.sku || 'LAPTOP99',
            serials: ['CHỜ XUẤT KHO'],
          };
        }),
        at: Date.now(),
        created_at: Date.now(),
      };
      cache.lastOrder = fallbackOrder;
      if (!Array.isArray(db.orders)) db.orders = [];
      db.orders.unshift(fallbackOrder);
      db.cart = [];
      db.cartCoupon = '';
      db.cartTI = '';
      u.phone = ph;
      u.addr = ad;
      save();
      toast('Đặt hàng thành công!');
      location.hash = '#/order-done/' + fallbackCode;
      if (pay === 'bank' || pay === 'card') {
        setTimeout(() => {
          A.openBankQrModal(fallbackCode, fallbackOrder.total, pay);
        }, 250);
      }
    }
  },

  cancelMine(id) {
    if (confirm('Bạn có chắc chắn muốn hủy đơn hàng ' + id + '?')) {
      (async () => {
        try {
          await (typeof OrderService !== 'undefined' ? OrderService.cancelOrder(id, 'Khách hàng hủy') : API.post('/orders/' + id + '/cancel'));
        } catch (err) {}
        if (Array.isArray(db.orders)) {
          const ord = db.orders.find((x) => (x.code || x.id) === id);
          if (ord) {
            ord.raw_status = 'cancelled';
            ord.status = 'cancelled';
            ord.status_text = 'Đã hủy';
            save();
          }
        }
        if (Array.isArray(cache.myOrders)) {
          const ord = cache.myOrders.find((x) => (x.code || x.id) === id);
          if (ord) {
            ord.raw_status = 'cancelled';
            ord.status = 'cancelled';
            ord.status_text = 'Đã hủy';
          }
        }
        toast('Đã hủy đơn hàng ' + id);
        render();
      })();
    }
  },
};
