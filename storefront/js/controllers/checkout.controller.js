/* ==========================================================================
   STOREFRONT MVC CONTROLLER: Checkout & Payment Controller
   ========================================================================== */

const CheckoutController = {
  selectCheckoutPay(method) {
    cache.checkoutPay = method;
    const hint = $('#checkout-qr-hint');
    if (hint) hint.hidden = !isQrPayment(method);
  },

  openBankQrModal(orderCode) {
    location.hash = '#/order-done/' + encodeURIComponent(orderCode);
  },

  paymentPoll: null,

  watchPayment(orderCode) {
    if (this.paymentPoll?.orderCode === orderCode) return;
    clearTimeout(this.paymentPoll?.timer);
    this.paymentPoll = null;
    if (!orderCode || !API.getToken()) return;

    const payment = { orderCode, hash: location.hash, timer: null };
    this.paymentPoll = payment;
    const isCurrent = () => this.paymentPoll === payment && location.hash === payment.hash;
    const checkPayment = async () => {
      if (!isCurrent()) return;

      try {
        const { data } = await OrderService.getPaymentStatus(orderCode);
        if (!isCurrent()) return;
        if (data.status === 'cancelled') {
          this.watchPayment(null);
          await render();
          return;
        }
        if (data.payment_status === 'paid') {
          this.watchPayment(null);
          toast('Thanh toán thành công!');
          location.replace('#/account?tab=orders&order=' + encodeURIComponent(orderCode));
          return;
        }
      } catch (err) {
        if (!isCurrent()) return;
        const status = $('#payment-live-status');
        if (err.status === 401 || err.status === 404) {
          this.watchPayment(null);
          if (status) status.textContent = err.message;
          return;
        }
        if (status) status.textContent = 'Đang kết nối lại để kiểm tra thanh toán…';
        payment.timer = setTimeout(checkPayment, 5000);
        return;
      }

      const status = $('#payment-live-status');
      if (status) status.textContent = 'Đang chờ ngân hàng xác nhận thanh toán…';
      payment.timer = setTimeout(checkPayment, 3000);
    };
    checkPayment();
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
      const orderCode = o.code;
      cache.lastOrder = { ...o, name: n, phone: ph, address: ad };
      if (!Array.isArray(db.orders)) db.orders = [];
      if (!db.orders.some((x) => (x.code || x.id) === orderCode)) {
        db.orders.unshift(cache.lastOrder);
      }
      db.cart = [];
      db.cartCoupon = '';
      db.cartTI = '';
      u.phone = ph;
      u.addr = ad;
      save();
      location.hash = '#/order-done/' + encodeURIComponent(orderCode);
    } catch (err) {
      toast(err.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.', 1);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Xác nhận đặt hàng';
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
