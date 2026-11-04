const DAY = 86400000;
/* ==========================================================================
   CART, CHECKOUT, ORDER SUCCESS & CUSTOMER ACCOUNT VIEWS (MVC)
   ========================================================================== */

function cartLines(edit = true) {
  return db.cart
    .map((i) => {
      const p = P(i.pid);
      if (!p) return '';
      return `<div class="ci">
      <a href="#/product/${p.id}" class="thumb">${pimg(p, 'thumb-img')}</a>
      <div>
        <a href="#/product/${p.id}" style="font-weight:700;font-size:.92rem;color:var(--fg)">${esc(p.name)}</a>
        <p class="muted xs" style="margin-top:3px">${esc(p.cpu)} · ${esc(p.ram)} · ${esc(p.ssd)}</p>
        <p class="xs" style="margin-top:4px;color:var(--acc);font-weight:600">Đơn giá: ${vnd(p.price)}</p>
        ${
          edit
            ? `<button type="button" class="btn danger sm" style="margin-top:8px;padding:.25rem .6rem;font-size:.73rem" onclick="ask('Xóa ${esc(p.name)} khỏi giỏ hàng?',()=>A.rm('${p.id}'),'Xóa sản phẩm')">${ic('trash', 13)} Xóa</button>`
            : `<p class="muted xs" style="margin-top:4px">Số lượng: <b>${i.qty}</b></p>`
        }
      </div>
      <div class="right">
        ${
          edit
            ? `
          <div class="qty">
            <button type="button" onclick="A.cq('${p.id}',-1)" aria-label="Giảm">${ic('minus', 13)}</button>
            <span>${i.qty}</span>
            <button type="button" onclick="A.cq('${p.id}',1)" aria-label="Tăng">${ic('plus', 13)}</button>
          </div>
        `
            : ''
        }
        <p style="margin-top:8px;font-weight:800;font-size:.98rem;color:var(--promo)">${vnd(p.price * i.qty)}</p>
      </div>
    </div>`;
    })
    .join('');
}

function sumBox(c, btn) {
  return `<div class="card sum">
    <h3 style="font-size:1.1rem;padding-bottom:10px;border-bottom:1px solid var(--line)">Chi tiết thanh toán</h3>
    <div class="row" style="gap:6px;flex-wrap:nowrap">
      <input id="cp" placeholder="Nhập mã giảm giá (VD: SUMMER2026)" value="${esc(db.cartCoupon)}" style="text-transform:uppercase">
      <button type="button" class="btn a sm" onclick="A.coupon()">Áp dụng</button>
    </div>
    ${db.cartCoupon && (!c.promo || !c.promo.valid) ? '<p class="xs" style="color:var(--bad);font-weight:500">Mã giảm giá chưa hợp lệ hoặc chưa đủ điều kiện.</p>' : ''}
    ${c.promo && c.promo.valid ? `<p class="xs" style="color:var(--ok);font-weight:600">✓ Đã áp dụng mã ${esc(c.promo.code)}</p>` : ''}
    <div class="l"><span class="muted">Tạm tính (${db.cart.reduce((s, i) => s + i.qty, 0)} sản phẩm)</span><span style="font-weight:600">${vnd(c.sub)}</span></div>
    ${c.disc ? `<div class="l"><span class="muted">Giảm giá khuyến mãi (${esc(db.cartCoupon)})</span><span style="color:var(--ok);font-weight:700">-${vnd(c.disc)}</span></div>` : ''}
    ${c.ti ? `<div class="l"><span class="muted">Trừ tiền Thu cũ đổi mới</span><span style="color:var(--ok);font-weight:700">-${vnd(c.ti)}</span></div>` : ''}
    <div class="l"><span class="muted">Phí vận chuyển</span><span style="color:var(--ok);font-weight:600">Miễn phí</span></div>
    <div class="l t"><span>Tổng thanh toán</span><span>${vnd(c.total)}</span></div>
    <p class="xs muted right">(Đã bao gồm VAT)</p>
    ${btn}
  </div>`;
}

async function viewCart() {
  if (!db.cart.length) {
    return `<div class="wrap">
      <nav class="bc"><a href="#/">Trang chủ</a> <span class="sep">›</span> <span class="cur">Giỏ hàng</span></nav>
      <div class="card center" style="padding:60px 20px;margin-top:8px">
        <div style="color:var(--acc);margin-bottom:12px">${ic('cart', 44)}</div>
        <h2 style="font-size:1.35rem;margin-bottom:6px">Giỏ hàng của bạn đang trống</h2>
        <p class="muted sm" style="margin-bottom:20px">Hãy khám phá các dòng laptop chính hãng đang có ưu đãi tốt tại Laptop99.</p>
        <a class="btn a lg" href="#/products">Tiếp tục mua sắm ${ic('arrow', 15)}</a>
      </div>
    </div>`;
  }

  for (const it of db.cart) {
    if (!P(it.pid)) {
      try {
        const res = await API.get('/products/' + String(it.pid).replace(/^p/, ''), true);
        const p = mapProduct(res.data);
        if (p) cache.products.push(p);
      } catch (e) {}
    }
  }

  const c = await calcCart();
  return `<div class="wrap">
    <nav class="bc"><a href="#/">Trang chủ</a> <span class="sep">›</span> <span class="cur">Giỏ hàng (${db.cart.reduce((s, i) => s + i.qty, 0)} sản phẩm)</span></nav>
    <div class="row between" style="margin-bottom:14px">
      <h1 style="font-size:1.45rem">Giỏ hàng của bạn</h1>
      <a class="btn sm" href="#/products">← Tiếp tục mua thêm máy</a>
    </div>
    <div class="two">
      <div class="card">${cartLines(true)}</div>
      ${sumBox(
        c,
        `<div class="gap" style="gap:8px">
          <a class="btn a lg block" href="#/checkout">Tiến hành đặt hàng ${ic('arrow', 15)}</a>
          <a class="btn lg block" style="background:#EFF6FF;color:#1D4ED8;border-color:#BFDBFE;font-weight:700" href="#/checkout?pay=bank">📱 Thanh toán nhanh qua Mã QR Ngân hàng / Online</a>
        </div>`,
      )}
    </div>
  </div>`;
}

function loginForm() {
  return `<div class="gap" style="gap:12px">
    <div style="background:var(--active-bg, #F4EAD8);border:1px solid var(--border-default, #E5E3DD);border-radius:10px;padding:10px 14px;font-size:.82rem;color:var(--gold-dark, #80551F);line-height:1.5">
      <b>Đăng nhập tài khoản:</b> Bạn có thể đăng nhập linh hoạt bằng <b>Địa chỉ Gmail/Email</b> hoặc <b>Số điện thoại</b> đã đăng ký.
    </div>
    <label class="fl2">
      <span>Email (Gmail) hoặc Số điện thoại</span>
      <input id="lg-e" type="text" autocomplete="username" placeholder="Nhập Gmail (user@gmail.com) hoặc SĐT (09xxxxxxxx)" oninput="if($('#lg-err')){$('#lg-err').style.display='none';this.classList.remove('err');$('#lg-p').classList.remove('err')}">
    </label>
    <label class="fl2">
      <span class="row between" style="width:100%">
        <span>Mật khẩu</span>
        <a class="acc xs" style="font-weight:700" href="javascript:void(0)" onclick="A.authModal('forgot')">Quên mật khẩu?</a>
      </span>
      <div style="position:relative">
        <input id="lg-p" type="password" autocomplete="current-password" placeholder="Nhập mật khẩu" oninput="if($('#lg-err')){$('#lg-err').style.display='none';this.classList.remove('err');$('#lg-e').classList.remove('err')}">
        <button type="button" onclick="const i=$('#lg-p');i.type=i.type==='password'?'text':'password'" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--mut)" title="Hiện/Ẩn mật khẩu">${ic('eye', 16)}</button>
      </div>
    </label>
    <!-- Thông báo lỗi khi đăng nhập sai tài khoản hoặc mật khẩu (theo yêu cầu) -->
    <div id="lg-err" style="display:none;margin-top:2px;background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:8px;padding:10px 12px;color:#B91C1C;font-size:.84rem;line-height:1.45;align-items:flex-start;gap:8px">
      <span style="font-size:1.1rem;line-height:1;flex-shrink:0">⚠️</span>
      <span id="lg-err-txt" style="font-weight:600"></span>
    </div>
    <button type="button" id="btn-login" class="btn a lg block" onclick="A.login()">Đăng nhập</button>
    <div class="row between sm muted" style="padding-top:4px;border-top:1px dashed var(--line)">
      <span>Chưa có tài khoản? <a class="acc" style="font-weight:700" href="javascript:void(0)" onclick="A.authModal('reg')">Đăng ký mới</a></span>
      <a class="acc" style="font-weight:700" href="javascript:void(0)" onclick="A.authModal('forgot')">Khôi phục mật khẩu</a>
    </div>
  </div>`;
}

function regForm() {
  return `<div class="gap" style="gap:12px">
    <label class="fl2">Họ và tên<input id="rg-n" autocomplete="name" placeholder="Nguyễn Văn A" oninput="if($('#rg-err'))$('#rg-err').style.display='none'"></label>
    <label class="fl2">Địa chỉ Email (Gmail)<input id="rg-e" type="email" autocomplete="email" placeholder="nguyen@gmail.com" oninput="if($('#rg-err'))$('#rg-err').style.display='none'"></label>
    <label class="fl2">Số điện thoại (10 số)<input id="rg-ph" type="tel" autocomplete="tel" placeholder="0901234567" oninput="if($('#rg-err'))$('#rg-err').style.display='none'"></label>
    <label class="fl2">Mật khẩu (tối thiểu 6 ký tự)
      <div style="position:relative">
        <input id="rg-p" type="password" autocomplete="new-password" placeholder="••••••" oninput="if($('#rg-err'))$('#rg-err').style.display='none'">
        <button type="button" onclick="const i=$('#rg-p');i.type=i.type==='password'?'text':'password'" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--mut)" title="Hiện/Ẩn mật khẩu">${ic('eye', 16)}</button>
      </div>
    </label>
    <div id="rg-err" style="display:none;margin-top:2px;background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:8px;padding:10px 12px;color:#B91C1C;font-size:.84rem;line-height:1.45;align-items:flex-start;gap:8px">
      <span style="font-size:1.1rem;line-height:1;flex-shrink:0">⚠️</span>
      <span id="rg-err-txt" style="font-weight:600"></span>
    </div>
    <button type="button" id="btn-reg" class="btn a lg block" onclick="A.register()">Đăng ký tài khoản</button>
    <p class="sm muted center">Đã có tài khoản? <a class="acc" style="font-weight:700" href="javascript:void(0)" onclick="A.authModal()">Đăng nhập</a></p>
  </div>`;
}

function forgotForm() {
  return `<div class="gap" style="gap:12px">
    <div style="background:var(--active-bg, #F4EAD8);border:1px solid var(--border-default, #E5E3DD);border-radius:10px;padding:12px 14px;font-size:.82rem;color:var(--gold-dark, #80551F);line-height:1.5">
      <b>Khôi phục mật khẩu tài khoản:</b> Nhập <b>Email (Gmail)</b> hoặc <b>Số điện thoại</b> đã đăng ký. Hệ thống sẽ gửi mã xác thực OTP 6 số (qua SMS hoặc Email) để cấp lại mật khẩu ngay lập tức.
    </div>
    <label class="fl2">
      Email (Gmail) hoặc Số điện thoại đăng ký *
      <input id="fg-e" type="text" placeholder="Nhập Gmail (user@gmail.com) hoặc SĐT (09xxxxxxxx)">
    </label>
    <button type="button" id="btn-fg-otp" class="btn a block" onclick="A.requestResetOtp()">Gửi mã xác thực OTP (qua SMS / Email)</button>

    <div id="fg-step2" class="gap" style="gap:10px;display:none;padding-top:10px;border-top:1px dashed var(--line)">
      <div id="fg-otp-hint" style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:10px 12px;font-size:.82rem;color:#065F46"></div>
      <label class="fl2">Mã xác thực OTP (6 chữ số) *<input id="fg-otp" placeholder="Nhập 6 chữ số OTP" maxlength="6" style="font-weight:800;letter-spacing:3px;text-align:center"></label>
      <label class="fl2">Mật khẩu mới (tối thiểu 6 ký tự) *
        <div style="position:relative">
          <input id="fg-np" type="password" placeholder="Nhập mật khẩu mới">
          <button type="button" onclick="const i=$('#fg-np');i.type=i.type==='password'?'text':'password'" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--mut)">${ic('eye', 16)}</button>
        </div>
      </label>
      <label class="fl2">Nhập lại mật khẩu mới *<input id="fg-cp" type="password" placeholder="Xác nhận mật khẩu mới"></label>
      <button type="button" id="btn-fg-reset" class="btn a lg block" onclick="A.confirmResetPassword()">Xác nhận đổi mật khẩu &amp; Đăng nhập</button>
    </div>

    <p class="sm muted center">Đã nhớ mật khẩu? <a class="acc" style="font-weight:700" href="javascript:void(0)" onclick="A.authModal()">Quay lại Đăng nhập</a></p>
  </div>`;
}

function renderBankQrBox(amount, memo = 'LAPTOP99 THANH TOAN', orderCode = '') {
  const bankKey = cache.qrBank || 'MB';
  const b = BANK_ACCOUNTS[bankKey] || BANK_ACCOUNTS.MB;
  const qrUrl = buildVietQrUrl(bankKey, amount, memo);
  return `<div id="vietqr-box" style="margin-top:12px;background:linear-gradient(180deg,#F8FAFC 0%,#EFF6FF 100%);border:1.5px solid #93C5FD;border-radius:14px;padding:16px">
    <div class="row between" style="margin-bottom:10px;gap:8px">
      <div>
        <span style="display:inline-flex;align-items:center;gap:6px;background:#1D4ED8;color:#fff;font-size:.72rem;font-weight:800;padding:3px 10px;border-radius:99px;text-transform:uppercase">VietQR · Napas 247 Chính Thức</span>
        <h4 style="font-size:.98rem;margin-top:6px;color:#0F172A">Quét Mã QR Ngân Hàng Thanh Toán Tự Động</h4>
      </div>
      <div class="xs muted right">Mở App Ngân hàng bất kỳ hoặc Ví MoMo / ZaloPay / VNPay để quét</div>
    </div>

    <div class="row" style="gap:6px;margin-bottom:12px;flex-wrap:wrap">
      ${Object.values(BANK_ACCOUNTS)
        .map(
          (bk) => `<button type="button" class="btn sm ${bk.key === bankKey ? 'a' : ''}" style="${bk.key === bankKey ? 'background:#1D4ED8;border-color:#1D4ED8;color:#fff' : 'background:#fff'}" onclick="A.selectQrBank('${bk.key}', ${Math.round(amount || 0)}, '${esc(memo)}', '${esc(orderCode)}')">🏦 ${esc(bk.short)}</button>`,
        )
        .join('')}
    </div>

    <div style="display:grid;grid-template-columns:220px 1fr;gap:16px;align-items:center;background:#fff;border:1px solid #DBEAFE;border-radius:12px;padding:14px">
      <div class="center" style="background:#fff;padding:8px;border:1px solid #E2E8F0;border-radius:10px">
        <img id="vietqr-img" src="${esc(qrUrl)}" alt="Mã QR Ngân hàng VietQR ${esc(b.short)}" style="width:100%;max-width:200px;height:auto;display:block;margin:0 auto;border-radius:6px">
        <span class="xs muted" style="display:block;margin-top:6px;font-weight:600">Mã QR động chuẩn Napas 247</span>
      </div>
      <div class="gap" style="gap:8px;font-size:.84rem">
        <div class="row between" style="padding-bottom:6px;border-bottom:1px dashed var(--line)">
          <span class="muted">Ngân hàng thụ hưởng:</span>
          <b style="color:#1D4ED8">${esc(b.name)}</b>
        </div>
        <div class="row between" style="padding-bottom:6px;border-bottom:1px dashed var(--line)">
          <span class="muted">Chủ tài khoản:</span>
          <b>${esc(b.holder)}</b>
        </div>
        <div class="row between" style="padding-bottom:6px;border-bottom:1px dashed var(--line)">
          <span class="muted">Số tài khoản:</span>
          <span class="row" style="gap:6px">
            <b style="font-size:.96rem;color:#0F172A;font-family:monospace">${esc(b.acc)}</b>
            <button type="button" class="btn sm" style="padding:2px 8px;font-size:.72rem" onclick="A.copy('${esc(b.acc)}')">Sao chép</button>
          </span>
        </div>
        <div class="row between" style="padding-bottom:6px;border-bottom:1px dashed var(--line)">
          <span class="muted">Số tiền chuyển khoản:</span>
          <span class="row" style="gap:6px">
            <b style="font-size:1.05rem;color:var(--promo)">${vnd(amount)}</b>
            <button type="button" class="btn sm" style="padding:2px 8px;font-size:.72rem" onclick="A.copy('${Math.round(amount || 0)}')">Sao chép</button>
          </span>
        </div>
        <div class="row between">
          <span class="muted">Nội dung chuyển khoản:</span>
          <span class="row" style="gap:6px">
            <b style="color:#047857;background:#ECFDF5;padding:2px 8px;border-radius:6px;font-family:monospace">${esc(memo)}</b>
            <button type="button" class="btn sm" style="padding:2px 8px;font-size:.72rem" onclick="A.copy('${esc(memo)}')">Sao chép</button>
          </span>
        </div>
        <p class="xs muted" style="margin-top:4px">💡 Khi quét mã QR trên ứng dụng ngân hàng, <b>Số tiền</b> và <b>Nội dung chuyển khoản</b> sẽ được điền tự động chính xác 100%.</p>
        ${
          orderCode
            ? `<div class="row" style="margin-top:6px;gap:8px">
                <button type="button" id="btn-confirm-qr" class="btn a block" style="background:#059669;border-color:#059669" onclick="A.confirmQrPayment('${esc(orderCode)}')">✓ Tôi đã quét QR chuyển khoản thanh toán</button>
              </div>`
            : ''
        }
      </div>
    </div>
  </div>`;
}

async function viewCheckout() {
  if (!db.cart.length) return viewCart();
  const u = me();
  if (!u) {
    return `<div class="wrap">
      <nav class="bc"><a href="#/">Trang chủ</a> <span class="sep">›</span> <a href="#/cart">Giỏ hàng</a> <span class="sep">›</span> <span class="cur">Đăng nhập đặt hàng</span></nav>
      <div class="two" style="margin-top:8px">
        <div class="card">
          <h2 style="font-size:1.25rem;margin-bottom:8px">Đăng nhập để hoàn tất đặt hàng</h2>
          <p class="muted sm" style="margin-bottom:16px">Hệ thống cần gắn mã Serial (S/N) của laptop trực tiếp vào tài khoản của bạn để kích hoạt bảo hành điện tử và hỗ trợ đổi trả RMA.</p>
          ${loginForm()}
        </div>
        ${sumBox(await calcCart(), '')}
      </div>
    </div>`;
  }

  let tis = [];
  try {
    const tiRes = await API.get('/trade-in/my-requests', true);
    tis = (tiRes.data || []).filter((t) => t.status === 'Đã định giá');
    cache.tradeins = tiRes.data || [];
  } catch (e) {}

  const r = route();
  if (r.q.pay && PAY[r.q.pay]) {
    cache.checkoutPay = r.q.pay;
  }
  const selectedPay = cache.checkoutPay || 'cod';

  const c = await calcCart();
  const previewMemo = `LAPTOP99 ${u.phone || 'THANHTOAN'}`;
  return `<div class="wrap">
    <nav class="bc"><a href="#/">Trang chủ</a> <span class="sep">›</span> <a href="#/cart">Giỏ hàng</a> <span class="sep">›</span> <span class="cur">Thanh toán &amp; Đặt hàng</span></nav>
    <h1 style="font-size:1.45rem;margin-bottom:14px">Thông tin đặt hàng &amp; Thanh toán</h1>
    <div class="two">
      <div class="gap" style="gap:16px">
        <div class="card">
          <h3 style="font-size:1.05rem;margin-bottom:14px">1. Thông tin người nhận hàng</h3>
          <div class="fg">
            <label class="fl2">Họ và tên người nhận *
              <input id="co-n" value="${esc(u.name)}" oninput="this.classList.remove('err');$('#err-n').textContent=''">
              <span class="field-err" id="err-n"></span>
            </label>
            <label class="fl2">Số điện thoại liên hệ *
              <input id="co-p" value="${esc(u.phone)}" placeholder="09xxxxxxxx" oninput="this.classList.remove('err');$('#err-p').textContent=''">
              <span class="field-err" id="err-p"></span>
            </label>
            <label class="fl2 full">
              <span>Địa chỉ nhận hàng chi tiết <span style="color:var(--bad,#ef4444);font-weight:700">* (Bắt buộc để thanh toán)</span></span>
              <input id="co-a" required value="${esc(u.addr || '')}" placeholder="Ví dụ: Số 123 Đường Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh" oninput="this.classList.remove('err');$('#err-a').textContent=''">
              <span class="field-err" id="err-a" style="color:var(--bad,#ef4444);font-weight:600;font-size:.78rem;margin-top:3px;display:block"></span>
              <span class="xs muted" style="margin-top:2px">💡 Shipper Laptop99 sẽ giao máy và phụ kiện tận tay theo đúng địa chỉ này. Bắt buộc điền địa chỉ để tiếp tục đặt hàng và thanh toán.</span>
            </label>
            <label class="fl2 full">Ghi chú đơn hàng (Tùy chọn)
              <textarea id="co-note" style="min-height:64px" placeholder="Thời gian giao hàng thuận tiện, yêu cầu xuất hóa đơn VAT..."></textarea>
            </label>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size:1.05rem;margin-bottom:14px">2. Phương thức thanh toán</h3>
          <div class="gap" style="gap:8px">
            ${Object.entries(PAY)
              .map(
                ([k, v]) => `
              <label class="opt" style="${selectedPay === k ? 'border-color:var(--gold-champagne, #C5A46D);background:var(--active-bg, #F4EAD8)' : ''}">
                <input type="radio" name="pay" value="${k}" ${selectedPay === k ? 'checked' : ''} onchange="A.selectCheckoutPay('${k}')">
                <span>
                  <b class="sm">${v}</b>
                  ${k === 'cod' ? '<br><span class="xs muted">Được mở hộp kiểm tra ngoại hình máy và phụ kiện trước khi thanh toán.</span>' : ''}
                  ${k === 'bank' ? '<br><span class="xs muted">Hiển thị mã QR Ngân hàng VietQR thật (MB Bank, Vietcombank, Techcombank, BIDV) điền sẵn số tiền đơn hàng.</span>' : ''}
                  ${k === 'card' ? '<br><span class="xs muted">Quét mã QR Ngân hàng Napas 247 / Ví điện tử trực tuyến nhanh chóng, an toàn 24/7.</span>' : ''}
                  ${k === 'installment' ? '<br><span class="xs muted">Hỗ trợ trả góp lãi suất 0% qua thẻ tín dụng hoặc công ty tài chính.</span>' : ''}
                </span>
              </label>
            `,
              )
              .join('')}
          </div>

          <div id="checkout-qr-container">
            ${selectedPay === 'bank' || selectedPay === 'card' ? renderBankQrBox(c.total, previewMemo, '') : ''}
          </div>
        </div>

        ${
          tis.length
            ? `
          <div class="card">
            <h3 style="font-size:1.05rem;margin-bottom:10px">3. Áp dụng phiếu Thu cũ đổi mới</h3>
            ${tis
              .map(
                (t) => `
              <label class="opt" style="margin-bottom:8px">
                <input type="radio" name="ti" ${db.cartTI === t.id ? 'checked' : ''} onclick="A.useTI('${t.id}')">
                <span><b class="sm">${esc(t.brand)} ${esc(t.model)}</b><br><span class="xs muted">Mức giá thu mua đã duyệt: <b style="color:var(--ok)">${vnd(t.final)}</b></span></span>
              </label>
            `,
              )
              .join('')}
            ${db.cartTI ? `<button type="button" class="btn sm" onclick="A.useTI('')">Không dùng phiếu thu cũ</button>` : ''}
          </div>
        `
            : ''
        }

        <div class="card">
          <h3 style="font-size:1.05rem;margin-bottom:8px">Danh sách sản phẩm đặt mua</h3>
          ${cartLines(false)}
        </div>
      </div>

      ${sumBox(c, `<button type="button" id="btn-place-order" class="btn a lg block" onclick="A.place()">Xác nhận đặt hàng</button>`)}
    </div>
  </div>`;
}

function viewDone(r) {
  const oid = r.parts[1];
  const u = me() || {};
  const lastOrd = cache.lastOrder && cache.lastOrder.id === oid ? cache.lastOrder : null;
  const isQrPay = lastOrd ? (lastOrd.pay === 'bank' || lastOrd.pay === 'card' || String(lastOrd.pay).includes('QR') || String(lastOrd.pay).includes('Chuyển khoản')) : true;
  const amount = lastOrd ? lastOrd.total : 0;
  const memo = `LAPTOP99 ${oid}`;

  return `<div class="wrap" style="max-width:780px;padding:32px 16px">
    <div class="card center" style="padding:32px 24px">
      <div style="width:64px;height:64px;border-radius:50%;background:var(--ok-bg);color:var(--ok);display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px">${ic('check', 34)}</div>
      <h1 style="font-size:1.5rem">Đặt hàng thành công!</h1>
      <p class="muted sm" style="margin:10px 0 18px">Cảm ơn bạn đã mua sắm tại <b>Laptop99</b>. Mã đơn hàng của bạn là <b style="color:var(--acc)">${esc(oid)}</b>.</p>
      <div style="text-align:left;background:#F8FAFC;border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin-bottom:18px">
        <p class="xs muted" style="text-transform:uppercase;font-weight:700">📦 Chi tiết người nhận &amp; Địa chỉ giao hàng</p>
        <div style="margin-top:8px;font-size:.88rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px">
          <div>👤 <b>Người nhận:</b> ${esc((lastOrd && (lastOrd.name || lastOrd.customer_name)) || u.name)}</div>
          <div>📞 <b>Số điện thoại:</b> ${esc((lastOrd && (lastOrd.phone || lastOrd.customer_phone)) || u.phone)}</div>
          <div style="grid-column:1/-1">📍 <b>Địa chỉ nhận hàng:</b> <b style="color:var(--acc)">${esc((lastOrd && (lastOrd.shipping_address || lastOrd.address)) || u.addr || 'Giao hàng tận nơi')}</b></div>
        </div>
        <p class="sm" style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--line)">
          Hệ thống đã tự động cấp phát mã <b>Serial Number (S/N)</b> chính hãng cho sản phẩm trong đơn hàng <b class="acc">${esc(oid)}</b>${lastOrd && lastOrd.serial_number ? ` (<b style="font-family:monospace;color:#047857">${esc(lastOrd.serial_number)}</b>)` : ''}. Đơn hàng đã được đồng bộ thời gian thực lên hệ thống Quản trị Admin.
        </p>
      </div>

      ${
        isQrPay && amount > 0
          ? `<div style="text-align:left;margin-bottom:20px">${renderBankQrBox(amount, memo, oid)}</div>`
          : `<div style="margin-bottom:18px">
              <button type="button" class="btn sm" style="background:#EFF6FF;color:#1D4ED8;border-color:#BFDBFE;font-weight:700" onclick="A.openBankQrModal('${esc(oid)}', ${amount || 0})">📱 Mở Mã QR Ngân Hàng (VietQR) để chuyển khoản trước</button>
            </div>`
      }

      <div class="row" style="justify-content:center;gap:10px">
        <a class="btn a" href="#/account">Xem chi tiết đơn hàng</a>
        <a class="btn" href="#/products">Tiếp tục mua sắm</a>
      </div>
    </div>
  </div>`;
}

async function viewAccount(r) {
  const u = me();
  if (!u) {
    return `<div class="wrap" style="max-width:480px;padding:28px 16px"><div class="card"><h2 style="font-size:1.3rem;margin-bottom:14px">Đăng nhập tài khoản</h2>${loginForm()}</div></div>`;
  }

  const tab = r.q.tab || 'orders';
  const T = [
    ['orders', 'Đơn hàng của tôi'],
    ['warranty', 'Bảo hành S/N điện tử'],
    ['rma', 'Yêu cầu đổi trả (RMA)'],
    ['tradein', 'Lịch sử thu cũ đổi mới'],
    ['profile', 'Thông tin cá nhân'],
  ];
  let body = '';

  if (tab === 'orders') {
    try {
      const ordRes = await (typeof OrderService !== 'undefined' ? OrderService.getMyOrders() : API.get('/orders/my-orders'));
      const L = ordRes.data || [];
      cache.myOrders = L;
      body = L.length
        ? L.map((o) => {
            const code = o.code || o.id || 'DH-0000';
            const orderTime = o.at || o.created_at || (o.ordered_at ? new Date(o.ordered_at).getTime() : Date.now());
            const receiverName = o.name || o.customer_name || u.name || 'Khách hàng';
            const receiverPhone = o.phone || o.customer_phone || u.phone || 'Chưa cập nhật';
            const receiverAddress = o.shipping_address || o.address || u.addr || 'Chưa cập nhật địa chỉ nhận hàng';
            const rawStatus = o.raw_status || o.status || 'pending';
            const statusTxt = o.status_text || (rawStatus === 'confirmed' ? 'Đã xác nhận' : rawStatus === 'shipping' ? 'Đang giao hàng' : rawStatus === 'delivered' ? 'Giao thành công' : rawStatus === 'cancelled' ? 'Đã hủy' : 'Chờ xác nhận');
            const isPaid = Boolean(o.paid || o.payment_status === 'paid');
            const isVerifying = o.payment_verification === 'pending_verification';
            const payMethodRaw = o.pay || o.payment_method || 'cod';
            const payLabel = PAY[payMethodRaw] || (payMethodRaw === 'cod' ? 'Thanh toán tiền mặt khi nhận hàng (COD)' : payMethodRaw === 'bank' ? 'Chuyển khoản QR Ngân hàng (VietQR Napas 247)' : payMethodRaw === 'card' ? 'Thanh toán thẻ / Ví điện tử trực tuyến' : payMethodRaw);
            const items = Array.isArray(o.items) && o.items.length ? o.items : [];
            const canCancel = rawStatus === 'pending';
            const canRma = rawStatus === 'delivered';
            const needQrPay = !isPaid && rawStatus !== 'cancelled';
            const stepIdx = rawStatus === 'cancelled' ? -1 : rawStatus === 'delivered' ? 3 : rawStatus === 'shipping' ? 2 : rawStatus === 'confirmed' ? 1 : 0;

            const badgeHtml = rawStatus === 'delivered'
              ? '<span class="bd ok" style="font-weight:700">✓ Giao thành công</span>'
              : rawStatus === 'shipping'
              ? '<span class="bd info" style="font-weight:700;background:#EFF6FF;color:#1D4ED8;border-color:#BFDBFE">🚚 Đang giao hàng</span>'
              : rawStatus === 'confirmed'
              ? '<span class="bd info" style="font-weight:700">✓ Đã xác nhận</span>'
              : rawStatus === 'cancelled'
              ? '<span class="bd bad" style="font-weight:700">✕ Đã hủy</span>'
              : '<span class="bd warn" style="font-weight:700">⏳ Chờ xác nhận</span>';

            const paymentBadge = isPaid
              ? '<span class="bd ok" style="font-weight:700">✓ Đã thanh toán</span>'
              : isVerifying
              ? '<span class="bd warn" style="font-weight:700">⏳ Đang đối soát Napas 247</span>'
              : '<span class="bd warn" style="font-weight:700">⚠️ Chưa thanh toán</span>';

            return `
        <div class="card" style="margin-bottom:18px;border:1px solid var(--border-default,#E5E3DD);border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
          <!-- Order Card Header -->
          <div class="row between" style="padding:12px 16px;background:var(--active-bg,#F8FAFC);border-bottom:1px solid var(--line);flex-wrap:wrap;gap:8px">
            <div class="row" style="gap:10px;align-items:center;flex-wrap:wrap">
              <span style="font-size:.95rem">Mã đơn: <b style="font-family:monospace;color:var(--acc);font-size:1.02rem">${esc(code)}</b></span>
              <button type="button" class="btn sm" style="padding:2px 8px;font-size:.72rem" onclick="A.copy('${esc(code)}')" title="Sao chép mã đơn hàng">${ic('copy', 12)} Sao chép</button>
              <span class="dim xs" style="display:inline-flex;align-items:center;gap:4px">🕒 Ngày đặt: <b>${sdt(orderTime)}</b></span>
            </div>
            <div>${badgeHtml}</div>
          </div>

          <!-- Order Timeline Progress (if active) -->
          ${rawStatus !== 'cancelled' ? `
          <div style="padding:12px 16px 6px;border-bottom:1px dashed var(--line);background:#fff">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;text-align:center;font-size:.75rem">
              <div style="color:${stepIdx >= 0 ? '#059669' : 'var(--mut)'};font-weight:${stepIdx >= 0 ? '700' : '500'}">
                <div style="width:22px;height:22px;border-radius:50%;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;background:${stepIdx >= 0 ? '#059669' : '#E2E8F0'};color:#fff;font-size:.7rem">✓</div>
                1. Đã đặt hàng
              </div>
              <div style="color:${stepIdx >= 1 ? '#059669' : 'var(--mut)'};font-weight:${stepIdx >= 1 ? '700' : '500'}">
                <div style="width:22px;height:22px;border-radius:50%;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;background:${stepIdx >= 1 ? '#059669' : '#E2E8F0'};color:#fff;font-size:.7rem">${stepIdx >= 1 ? '✓' : '2'}</div>
                2. Đã duyệt đơn
              </div>
              <div style="color:${stepIdx >= 2 ? '#059669' : 'var(--mut)'};font-weight:${stepIdx >= 2 ? '700' : '500'}">
                <div style="width:22px;height:22px;border-radius:50%;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;background:${stepIdx >= 2 ? '#059669' : '#E2E8F0'};color:#fff;font-size:.7rem">${stepIdx >= 2 ? '✓' : '3'}</div>
                3. Đang vận chuyển
              </div>
              <div style="color:${stepIdx >= 3 ? '#059669' : 'var(--mut)'};font-weight:${stepIdx >= 3 ? '700' : '500'}">
                <div style="width:22px;height:22px;border-radius:50%;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;background:${stepIdx >= 3 ? '#059669' : '#E2E8F0'};color:#fff;font-size:.7rem">${stepIdx >= 3 ? '✓' : '4'}</div>
                4. Đã nhận máy
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Delivery Address & Recipient Info Block (Nổi bật & Bắt buộc theo yêu cầu) -->
          <div style="margin:12px 16px;background:var(--active-bg,#F8FAFC);border:1px solid #E2E8F0;border-left:4px solid var(--acc);border-radius:8px;padding:12px 14px;font-size:.86rem">
            <div class="row between" style="margin-bottom:6px">
              <span style="font-weight:700;color:var(--acc);font-size:.82rem;text-transform:uppercase;letter-spacing:.5px">📍 Thông tin giao nhận hàng</span>
              <span class="xs muted">Vận chuyển: Giao hàng tận nơi (Miễn phí)</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:6px">
              <div>👤 <b>Người nhận:</b> <span style="font-weight:600">${esc(receiverName)}</span></div>
              <div>📞 <b>Số điện thoại:</b> <span style="font-weight:600">${esc(receiverPhone)}</span></div>
              <div style="grid-column:1/-1">
                📍 <b>Địa chỉ nhận hàng:</b> <b style="color:var(--fg);font-size:.9rem">${esc(receiverAddress)}</b>
              </div>
              ${o.notes ? `<div style="grid-column:1/-1;font-size:.8rem;color:var(--mut);margin-top:2px">📝 <b>Ghi chú giao hàng:</b> <i>${esc(o.notes)}</i></div>` : ''}
            </div>
          </div>

          <!-- Product Items List -->
          <div style="padding:4px 16px 12px">
            <p class="xs muted" style="font-weight:700;text-transform:uppercase;margin-bottom:8px">Danh sách sản phẩm trong đơn (${items.length} món)</p>
            ${items.map((i) => {
              const p = P(i.pid) || P(i.product_id);
              const lineUnitPrice = Number(i.unit_price || i.price || (p ? p.price : 0));
              const qty = Number(i.qty || i.quantity || 1);
              const lineTotal = Number(i.line_total || (lineUnitPrice * qty));
              const serials = Array.isArray(i.serials) && i.serials.length ? i.serials : (i.serial_number ? [i.serial_number] : (o.serial_number ? [o.serial_number] : []));

              return `
              <div class="row between" style="padding:8px 0;border-bottom:1px dashed var(--line);align-items:center;gap:12px">
                <div class="row" style="gap:12px;align-items:center;flex:1">
                  <div style="width:52px;height:52px;border-radius:8px;background:#F1F5F9;border:1px solid #E2E8F0;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
                    ${p ? pimg(p, 'thumb-img') : `<span style="color:var(--acc)">${ic('laptop', 26)}</span>`}
                  </div>
                  <div>
                    <a href="#/product/${i.pid || (p ? p.id : '')}" style="font-weight:700;font-size:.92rem;color:var(--fg);text-decoration:none">${esc(i.name || (p ? p.name : 'Laptop chính hãng'))}</a>
                    <div class="xs muted" style="margin-top:2px">
                      ${i.sku ? `SKU: <b>${esc(i.sku)}</b> · ` : ''}Số lượng: <b>${qty}</b>
                      ${p ? ` · ${esc(p.cpu || '')} · ${esc(p.ram || '')}` : ''}
                    </div>
                    ${serials.length && serials[0] !== 'CHỜ XUẤT KHO' ? `
                      <div style="margin-top:4px">
                        <span class="bd" style="background:#ECFDF5;color:#047857;border:1px solid #A7F3D0;font-family:monospace;font-size:.74rem">
                          🛡️ S/N: ${esc(serials.join(', '))}
                        </span>
                      </div>
                    ` : '<div style="margin-top:4px"><span class="bd mut xs">S/N: Kích hoạt khi xuất kho</span></div>'}
                  </div>
                </div>
                <div class="right" style="flex-shrink:0">
                  <div class="xs muted">${vnd(lineUnitPrice)} × ${qty}</div>
                  <div style="font-size:.98rem;font-weight:800;color:var(--promo)">${vnd(lineTotal)}</div>
                </div>
              </div>
              `;
            }).join('')}
          </div>

          <!-- Payment & Financial Summary -->
          <div class="row between" style="padding:12px 16px;background:var(--active-bg,#F8FAFC);border-top:1px solid var(--line);align-items:center;flex-wrap:wrap;gap:10px">
            <div>
              <div class="xs muted">Hình thức: <b style="color:var(--fg)">${esc(payLabel)}</b></div>
              <div style="margin-top:4px">${paymentBadge}</div>
            </div>
            <div class="right">
              ${o.discount > 0 ? `<div class="xs" style="color:var(--ok)">Đã giảm giá: -${vnd(o.discount)}</div>` : ''}
              <div class="xs muted">Phí giao hàng: <span style="color:var(--ok);font-weight:600">Miễn phí</span></div>
              <div style="font-size:1.15rem;font-weight:800;color:var(--promo);margin-top:2px">
                Tổng cộng: ${vnd(o.total)}
              </div>
            </div>
          </div>

          <!-- Action Buttons Footer -->
          <div class="row between" style="padding:10px 16px;border-top:1px solid var(--line);background:#fff;flex-wrap:wrap;gap:8px">
            <div class="row" style="gap:8px;flex-wrap:wrap">
              ${needQrPay ? `
                <button type="button" class="btn sm a" style="background:#1D4ED8;border-color:#1D4ED8;color:#fff;font-weight:700" onclick="A.openBankQrModal('${esc(code)}', ${o.total}, '${esc(payMethodRaw)}')">
                  📱 Quét Mã QR Ngân Hàng (VietQR Napas 247)
                </button>
              ` : ''}
              ${canCancel ? `
                <button type="button" class="btn danger sm" onclick="A.cancelMine('${esc(code)}')">
                  ✕ Hủy đơn hàng
                </button>
              ` : ''}
              ${canRma ? `
                <button type="button" class="btn sm" onclick="A.rmaModal('${esc(code)}')">
                  🔄 Yêu cầu Đổi trả (RMA)
                </button>
                <a class="btn sm" href="#/warranty?sn=${encodeURIComponent(o.serial_number || '')}" style="color:var(--ok);border-color:var(--ok)">
                  🛡️ Tra cứu bảo hành S/N
                </a>
              ` : ''}
            </div>
            <div>
              <button type="button" class="btn sm" onclick="window.print()" title="In hóa đơn đơn hàng">
                🖨️ In đơn hàng
              </button>
            </div>
          </div>
        </div>
            `;
          }).join('')
        : '<div class="card center muted" style="padding:48px"><p style="font-size:1.05rem;margin-bottom:8px">Bạn chưa có đơn hàng nào.</p><a href="#/products" class="btn a sm" style="margin-top:6px">Khám phá sản phẩm ngay →</a></div>';
    } catch (err) {
      body = `<div class="card center bad" style="padding:40px">Không thể tải danh sách đơn hàng: ${esc(err.message)}</div>`;
    }
  }

  if (tab === 'warranty') {
    try {
      const ordRes = await API.get('/orders/my-orders');
      const list = [];
      (ordRes.data || []).forEach((o) => {
        if (o.raw_status !== 'cancelled') {
          o.items.forEach((it) => {
            const sList = it.serials || (o.serial_number ? [o.serial_number] : []);
            sList.forEach((sn) => {
              const months = it.warranty_months || 12;
              const end = o.at + months * 30.44 * DAY;
              list.push({ sn, name: it.name, at: o.at, end, ok: end > Date.now() });
            });
          });
        }
      });
      body = list.length
        ? `<div class="card tw"><table class="tbl"><tr><th>Mã Serial (S/N)</th><th>Sản phẩm</th><th>Ngày kích hoạt</th><th>Hạn bảo hành</th><th>Trạng thái</th></tr>${list
            .map(
              (w) =>
                `<tr><td><a href="#/warranty?sn=${encodeURIComponent(w.sn)}" class="acc" style="font-weight:700">${esc(w.sn)}</a></td><td>${esc(w.name)}</td><td>${sd(w.at)}</td><td>${sd(w.end)}</td><td>${
                  w.ok ? '<span class="bd ok">Còn hạn bảo hành</span>' : '<span class="bd bad">Đã hết hạn</span>'
                }</td></tr>`,
            )
            .join('')}</table></div>`
        : '<div class="card center muted" style="padding:48px">Mã Serial (S/N) bảo hành điện tử sẽ tự động hiển thị tại đây ngay khi bạn đặt mua máy.</div>';
    } catch (err) {
      body = `<div class="card center bad" style="padding:40px">Không thể tải thông tin bảo hành: ${esc(err.message)}</div>`;
    }
  }

  if (tab === 'rma') {
    try {
      const rmaRes = await API.get('/rma/my-requests');
      const L = rmaRes.data || [];
      body = L.length
        ? L.map(
            (x) =>
              `<div class="card" style="margin-bottom:12px"><div class="row between"><b>Mã phiếu: ${esc(x.id)} (${esc(x.type)})</b>${badge(x.status)}</div><p class="xs muted" style="margin-top:4px">Thuộc đơn hàng: <b>${esc(x.oid)}</b></p><p class="sm" style="margin-top:6px">Lý do: ${esc(x.reason)}</p></div>`,
          ).join('')
        : '<div class="card center muted" style="padding:48px">Bạn chưa có yêu cầu đổi trả (RMA) nào. Có thể gửi yêu cầu từ các đơn hàng đã giao thành công.</div>';
    } catch (err) {
      body = `<div class="card center bad" style="padding:40px">Không thể tải danh sách đổi trả: ${esc(err.message)}</div>`;
    }
  }

  if (tab === 'tradein') {
    try {
      const tiRes = await API.get('/trade-in/my-requests');
      const L = tiRes.data || [];
      body =
        `<div class="row between" style="margin-bottom:14px"><span class="muted sm">Danh sách máy cũ bạn đã gửi yêu cầu định giá</span><a class="btn a sm" href="#/tradein">+ Đăng ký định giá máy mới</a></div>` +
        (L.length
          ? L.map(
              (x) =>
                `<div class="card" style="margin-bottom:12px"><div class="row between"><b>${esc(x.brand)} ${esc(x.model)} (Mua năm ${x.year})</b>${badge(x.status)}</div><p class="sm muted" style="margin-top:6px">Ngoại hình: ${esc(x.cond)} · RAM ${x.ram}GB · Giá ước tính: <b>${vnd(x.est)}</b>${
                  x.final ? ` · Giá thu mua chính thức: <b style="color:var(--ok)">${vnd(x.final)}</b>` : ''
                }</p></div>`,
            ).join('')
          : '<div class="card center muted" style="padding:48px">Chưa có yêu cầu thu cũ đổi mới nào.</div>');
    } catch (err) {
      body = `<div class="card center bad" style="padding:40px">Không thể tải danh sách thu cũ: ${esc(err.message)}</div>`;
    }
  }

  if (tab === 'profile') {
    body = `<div class="card">
      <h3 style="font-size:1.05rem;margin-bottom:14px">Cập nhật thông tin tài khoản</h3>
      <div class="fg">
        <label class="fl2">Họ và tên<input id="pf-n" value="${esc(u.name)}"></label>
        <label class="fl2">Số điện thoại<input id="pf-p" value="${esc(u.phone)}"></label>
        <label class="fl2 full">Địa chỉ nhận hàng mặc định<input id="pf-a" value="${esc(u.addr || '')}"></label>
        <label class="fl2 full">Email đăng nhập<input value="${esc(u.email)}" disabled style="background:#F1F5F9;color:var(--mut)"></label>
      </div>
      <div class="row" style="margin-top:16px">
        <button class="btn a" onclick="A.saveProfile()">Lưu thông tin</button>
        <button class="btn danger" onclick="A.logout()">${ic('logout', 15)} Đăng xuất tài khoản</button>
      </div>
    </div>`;
  }

  return `<div class="wrap" style="padding-bottom:24px">
    <nav class="bc"><a href="#/">Trang chủ</a> <span class="sep">›</span> <span class="cur">Tài khoản khách hàng</span></nav>
    <div class="row between" style="margin-bottom:16px">
      <div>
        <h1 style="font-size:1.45rem">Xin chào, ${esc(u.name)}</h1>
        <p class="muted xs">${esc(u.email)} · ${esc(u.phone || '')}</p>
      </div>
      <button class="btn sm" onclick="A.logout()">${ic('logout', 14)} Đăng xuất</button>
    </div>
    <div class="tabs">${T.map((t) => `<button class="fchip ${t[0] === tab ? 'on' : ''}" onclick="setQ('tab','${t[0]}')">${t[1]}</button>`).join('')}</div>
    ${body}
  </div>`;
}

