/* ==========================================================================
   STOREFRONT MVC CONTROLLER: Cart & Voucher Controller
   ========================================================================== */

const CartController = {
  async add(pid, q = 1) {
    let p = P(pid);
    if (!p) {
      try {
        const res = await (typeof ProductService !== 'undefined'
          ? ProductService.getProductDetail(String(pid).replace(/^p/, ''))
          : API.get('/products/' + String(pid).replace(/^p/, ''), true));
        p = mapProduct(res.data);
        if (p) cache.products.push(p);
      } catch (e) {}
    }
    if (!p || p.stock <= 0) return toast('Sản phẩm hiện đã hết hàng', 1);
    const it = db.cart.find((i) => i.pid === pid);
    const n = (it ? it.qty : 0) + q;
    if (n > p.stock) {
      toast('Chỉ còn ' + p.stock + ' sản phẩm trong kho', 1);
      if (it) it.qty = p.stock;
      else db.cart.push({ pid, qty: p.stock });
    } else {
      if (it) it.qty = n;
      else db.cart.push({ pid, qty: q });
      toast('Đã thêm "' + p.name + '" vào giỏ hàng');
    }
    save();
    await render();
    const badge = $('.nav-badge');
    if (badge) {
      badge.classList.remove('bounce');
      void badge.offsetWidth;
      badge.classList.add('bounce');
    }
  },

  async buyNow(pid) {
    let p = P(pid);
    if (!p) {
      try {
        const res = await (typeof ProductService !== 'undefined'
          ? ProductService.getProductDetail(String(pid).replace(/^p/, ''))
          : API.get('/products/' + String(pid).replace(/^p/, ''), true));
        p = mapProduct(res.data);
        if (p) cache.products.push(p);
      } catch (e) {}
    }
    if (!p || p.stock <= 0) return toast('Sản phẩm hiện đã hết hàng', 1);
    const it = db.cart.find((i) => i.pid === pid);
    const pqEl = $('#pq');
    const q = pqEl ? +pqEl.textContent || 1 : 1;
    if (!it) db.cart.push({ pid, qty: q });
    save();
    location.hash = '#/checkout';
  },

  pq(d) {
    const e = $('#pq');
    if (e) e.textContent = Math.max(1, (+e.textContent || 1) + d);
  },

  rm(pid) {
    db.cart = db.cart.filter((i) => i.pid !== pid);
    save();
    render();
  },

  cq(pid, d) {
    const it = db.cart.find((i) => i.pid === pid);
    const p = P(pid);
    if (!it) return;
    const n = it.qty + d;
    if (n < 1) {
      if (confirm('Xóa sản phẩm này khỏi giỏ hàng?')) {
        this.rm(pid);
      }
      return;
    }
    if (p && n > p.stock) return toast('Chỉ còn ' + p.stock + ' sản phẩm trong kho', 1);
    it.qty = n;
    save();
    render();
  },

  async coupon() {
    const c = val('cp').toUpperCase();
    db.cartCoupon = c;
    save();
    if (c) {
      const sub = db.cart.reduce((s, i) => {
        const p = P(i.pid);
        return s + (p ? p.price * i.qty : 0);
      }, 0);
      try {
        const res = await (typeof PromotionsService !== 'undefined'
          ? PromotionsService.checkCoupon(c, sub)
          : API.post('/promotions/check', { code: c, subtotal: sub }));
        if (res.valid) {
          lastCouponCheck = res;
          toast('Áp dụng thành công mã ' + c + ': giảm ' + vnd(res.discount));
        } else {
          lastCouponCheck = null;
          toast(res.message || 'Mã giảm giá không hợp lệ hoặc chưa đủ điều kiện', 1);
        }
      } catch (err) {
        lastCouponCheck = null;
      }
    } else {
      lastCouponCheck = null;
    }
    render();
  },

  useTI(id) {
    db.cartTI = id;
    save();
    render();
  },
};

