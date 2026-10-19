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
      closeModal();
      toast(res.message || 'Đã xác nhận thanh toán QR ngân hàng thành công!');
      render();
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '✓ Tôi đã quét QR chuyển khoản thanh toán';
      }
    }
  },

  async place() {
    const u = me();
    if (!u) return A.authModal();
    const n = val('co-n');
    const ph = val('co-p');
    const ad = val('co-a');
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
    if (ad.length < 8) {
      if ($('#co-a')) $('#co-a').classList.add('err');
      if ($('#err-a')) $('#err-a').textContent = 'Vui lòng nhập địa chỉ giao hàng chi tiết (tối thiểu 8 ký tự).';
      hasErr = true;
    }
    if (hasErr) return toast('Vui lòng kiểm tra lại thông tin nhận hàng', 1);
    if (!db.cart.length) return toast('Giỏ hàng của bạn đang trống', 1);

    const btn = $('#btn-place-order');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Đang xử lý đơn hàng...';
    }

    const pay = ($('input[name=pay]:checked') || {}).value || cache.checkoutPay || 'cod';
    const payload = {
      items: db.cart.map((i) => ({ pid: i.pid, qty: i.qty })),
      name: n,
      phone: ph,
      address: ad,
      payment_method: pay,
      coupon: db.cartCoupon || null,
      note: val('co-note') || null,
    };

    try {
      const res = await (typeof OrderService !== 'undefined'
        ? OrderService.createOrder(payload)
        : API.post('/orders', payload));
      const o = res.data;
      cache.lastOrder = o;
      db.cart = [];
      db.cartCoupon = '';
      db.cartTI = '';
      u.phone = ph;
      u.addr = ad;
      save();
      toast('Đặt hàng thành công!');
      location.hash = '#/order-done/' + o.id;
      if (pay === 'bank' || pay === 'card') {
        setTimeout(() => {
          A.openBankQrModal(o.id, o.total, pay);
        }, 250);
      }
    } catch (err) {
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
          toast('Đã hủy đơn hàng ' + id);
          render();
        } catch (err) {}
      })();
    }
  },
};

