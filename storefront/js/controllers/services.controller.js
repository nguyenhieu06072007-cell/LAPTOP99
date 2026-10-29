/* ==========================================================================
   STOREFRONT MVC CONTROLLER: Services, Warranty, Trade-In & RMA Controller
   ========================================================================== */

const ServicesController = {
  tiEst() {
    const el = $('#ti-v');
    if (el) el.textContent = vnd(tiEstimate(val('ti-b'), +val('ti-y'), +val('ti-r'), val('ti-c')));
  },

  async tiSubmit() {
    const u = me();
    if (!u) return A.authModal();
    const m = val('ti-m');
    if (m.length < 2) return toast('Vui lòng nhập tên dòng máy / Model cụ thể', 1);
    const b = val('ti-b');
    const y = +val('ti-y');
    const r = +val('ti-r');
    const c = val('ti-c');
    const est = tiEstimate(b, y, r, c);
    try {
      await (typeof PromotionsService !== 'undefined'
        ? PromotionsService.submitTradeIn({
            brand: b,
            model: m,
            year: y,
            ram: r,
            condition_desc: c,
            estimated_price: est,
          })
        : API.post('/trade-in', {
            brand: b,
            model: m,
            year: y,
            ram: r,
            condition_desc: c,
            estimated_price: est,
          }));
      toast('Đã gửi yêu cầu định giá thành công!');
      location.hash = '#/account?tab=tradein';
    } catch (err) {}
  },

  war() {
    const s = val('sn');
    if (!s) return toast('Vui lòng nhập mã Serial Number (S/N)', 1);
    location.hash = '#/warranty?sn=' + encodeURIComponent(s);
  },

  rmaModal(oid) {
    const o = (cache.myOrders || []).find((x) => x.id === oid);
    if (!o) return;
    modal(
      mHead('Gửi yêu cầu đổi trả (RMA)', 'Đơn hàng: ' + oid) +
        `<div class="gap" style="gap:12px"><label class="fl2">Chọn sản phẩm cần hỗ trợ<select id="rm-p">${o.items
          .map((i) => `<option value="${i.pid}">${esc(i.name)}</option>`)
          .join('')}</select></label><label class="fl2">Hình thức yêu cầu<select id="rm-t"><option>Đổi</option><option>Trả</option></select></label><label class="fl2">Mô tả tình trạng lỗi / Lý do *<textarea id="rm-r" placeholder="Mô tả chi tiết biểu hiện lỗi phần cứng hoặc lý do đổi trả (tối thiểu 8 ký tự)"></textarea></label><button class="btn a lg" onclick="A.rmaSubmit('${oid}')">Gửi yêu cầu RMA</button></div>`,
      true,
    );
  },

  async rmaSubmit(oid) {
    const r = val('rm-r');
    if (r.length < 8) return toast('Vui lòng mô tả lý do chi tiết hơn (tối thiểu 8 ký tự)', 1);
    try {
      await (typeof PromotionsService !== 'undefined'
        ? PromotionsService.submitRma({
            order_code: oid,
            product_id: val('rm-p'),
            type: val('rm-t'),
            reason: r,
          })
        : API.post('/rma', {
            order_code: oid,
            product_id: val('rm-p'),
            type: val('rm-t'),
            reason: r,
          }));
      closeModal();
      toast('Đã gửi yêu cầu đổi trả RMA thành công!');
      location.hash = '#/account?tab=rma';
    } catch (err) {}
  },

  async review(pid) {
    const u = me();
    const t = val('rv-t');
    if (!u) return A.authModal();
    if (t.length < 5) return toast('Vui lòng nhập nội dung đánh giá tối thiểu 5 ký tự', 1);
    try {
      await (typeof PromotionsService !== 'undefined'
        ? PromotionsService.submitReview({ product_id: pid, rating: +val('rv-s'), comment: t })
        : API.post('/reviews', { product_id: pid, rating: +val('rv-s'), comment: t }));
      toast('Cảm ơn bạn đã gửi đánh giá sản phẩm!');
      const ta = $('#rv-t');
      if (ta) ta.value = '';
      render();
    } catch (err) {}
  },

  async saveProfile() {
    const u = me();
    if (!u) return;
    const n = val('ac-n');
    const ph = val('ac-p');
    const ad = val('ac-a');
    if (n.length < 2) return toast('Vui lòng nhập họ và tên', 1);
    try {
      const res = await (typeof AuthService !== 'undefined'
        ? AuthService.updateProfile({ full_name: n, name: n, phone: ph, address: ad })
        : API.put('/auth/profile', { full_name: n, name: n, phone: ph, address: ad }));
      const d = res.data || {};
      db.session.name = d.full_name || d.name || n;
      db.session.phone = d.phone !== undefined ? d.phone : ph;
      db.session.addr = d.address !== undefined ? d.address : ad;
      save();
      toast('Đã lưu thông tin cá nhân');
      render();
    } catch (err) {
      if (err && err.message) toast(err.message, 1);
    }
  },
};

