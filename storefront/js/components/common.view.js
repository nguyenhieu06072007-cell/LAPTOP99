/* ==========================================================================
   SHARED COMPONENTS LAYER (MVC): Icons, Formatters, Modals & ProductCard
   ========================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const val = (id) => {
  const e = document.getElementById(id);
  return e ? e.value.trim() : '';
};
const vnd = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0)) + ' ₫';
const sd = (t) => new Date(t).toLocaleDateString('vi-VN');
const sdt = (t) => new Date(t).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

const I = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.8-3.6 5-5.5 8-5.5s6.2 1.9 8 5.5"/>',
  scale: '<path d="M12 3v18M5 7h14M5 7l-3 6h6l-3-6Zm14 0-3 6h6l-3-6ZM8 21h8"/>',
  heart: '<path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 1 1 12 6a5 5 0 1 1 7.5 6.6Z"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Zm-1 12-3-3 1.4-1.4 1.6 1.6 3.6-3.6L16 10l-5 5Z"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15.4-6.4L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.4 6.4L3 16M3 21v-5h5"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  truck: '<path d="M1 4h13v12H1zM14 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/>',
  box: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5M12 12v10M12 12 3 7"/>',
  dollar: '<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  news: '<path d="M4 4h14v16H4zM18 8h3v10a2 2 0 0 1-2 2H6M8 8h6M8 12h6M8 16h4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  chevR: '<path d="m9 6 6 6-6 6"/>',
  chevL: '<path d="m15 6-6 6 6 6"/>',
  chevD: '<path d="m6 9 6 6 6-6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  laptop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4-2v-4L3 5Z"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 1v3m6-3v3M9 20v3m6-3v3M1 9h3m-3 6h3m16-6h3m-3 6h3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  zoom: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
  spark: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/>',
};

const ic = (n, s = 17) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${I[n] || ''}</svg>`;

function pimg(p, cls = '') {
  const c1 = `hsl(${p.hue || 215}, 75%, 52%)`;
  const c2 = `hsl(${((p.hue || 215) + 35) % 360}, 70%, 45%)`;
  const svgFallback = `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" class="svg-fallback" style="width:100%;height:100%;max-height:150px">
    <defs><linearGradient id="g${p.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect x="52" y="18" width="216" height="134" rx="10" fill="#1e293b" stroke="#94a3b8" stroke-width="2"/>
    <rect x="60" y="26" width="200" height="118" rx="5" fill="url(#g${p.id})"/>
    <text x="160" y="84" text-anchor="middle" fill="#ffffff" font-family="Inter,sans-serif" font-weight="800" font-size="18">${esc(p.brand)}</text>
    <text x="160" y="106" text-anchor="middle" fill="rgba(255,255,255,.88)" font-family="Inter,sans-serif" font-size="10">${esc(p.gpu)}</text>
    <path d="M26 154 H294 L278 168 H42 Z" fill="#94a3b8"/>
  </svg>`;

  if (p.thumbnail) {
    return `<img src="${esc(p.thumbnail)}" alt="${esc(p.name)}" class="prod-real-img ${cls}" loading="lazy" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='block'">
            <div style="display:none;width:100%;height:100%">${svgFallback}</div>`;
  }
  return svgFallback;
}

const discPct = (p) => (p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0);
const rate = (p) => p.rating || '5.0';
const stars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

const stockTxt = (p) =>
  p.stock <= 0
    ? '<span class="bd bad">Tạm hết hàng</span>'
    : p.stock <= 5
    ? `<span class="bd warn">Sắp hết (${p.stock})</span>`
    : `<span class="bd ok">Còn hàng (${p.stock})</span>`;

function badge(s) {
  const m = {
    'Hoàn thành': 'ok',
    'Đã duyệt': 'ok',
    'Đã hoàn tiền': 'ok',
    'Đã định giá': 'info',
    'Đã xác nhận': 'info',
    'Đang giao': 'info',
    'Chờ xác nhận': 'warn',
    'Chờ duyệt': 'warn',
    'Chờ định giá': 'warn',
    'Đã hủy': 'bad',
    'Từ chối': 'bad',
  };
  return `<span class="bd ${m[s] || 'mut'}">${esc(s)}</span>`;
}

function toast(msg, err) {
  const d = document.createElement('div');
  d.className = 'tst' + (err ? ' err' : '');
  d.textContent = msg;
  const box = $('#toasts');
  if (box) box.appendChild(d);
  setTimeout(() => d.remove(), 3200);
}

function modal(html, sm) {
  const m = $('#modal');
  if (!m) return;
  m.className = 'open';
  const isPromo = typeof html === 'string' && html.includes('promo-popup');
  const isEntryPopup = typeof html === 'string' && html.includes('entry-popup-container');
  m.innerHTML = `<div class="mb ${sm ? 'sm' : ''} ${isPromo ? 'mb-promo' : ''} ${isEntryPopup ? 'mb-entry-popup' : ''}" onclick="event.stopPropagation()">${html}</div>`;
  m.onclick = closeModal;
}

function closeModal() {
  const m = $('#modal');
  if (m) {
    m.className = '';
    m.innerHTML = '';
  }
}

const mHead = (t, sub = '') =>
  `<div class="row between" style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--line)"><div><h3 style="font-size:1.15rem">${t}</h3>${sub ? `<p class="muted xs" style="margin-top:2px">${sub}</p>` : ''}</div><button class="ib" onclick="closeModal()" aria-label="Đóng">${ic('x', 16)}</button></div>`;

function ask(msg, fn, label = 'Xác nhận', danger = true) {
  window._cf = () => {
    closeModal();
    fn();
  };
  modal(
    mHead('Xác nhận thao tác') +
      `<p class="muted" style="margin-bottom:20px">${msg}</p><div class="row" style="justify-content:flex-end"><button class="btn" onclick="closeModal()">Hủy bỏ</button><button class="btn ${danger ? 'danger' : 'a'}" onclick="_cf()">${label}</button></div>`,
    true,
  );
}

function route() {
  const h = location.hash.slice(1) || '/';
  const [p, qs] = h.split('?');
  const q = Object.fromEntries(new URLSearchParams(qs || ''));
  return { path: p, parts: p.split('/').filter(Boolean), q };
}

function setQ(k, v) {
  const r = route();
  if (v === '' || v == null) delete r.q[k];
  else r.q[k] = v;
  if (k !== 'page') delete r.q.page;
  const s = new URLSearchParams(r.q).toString();
  location.hash = r.path + (s ? '?' + s : '');
}

/**
 * ProductCard (Section 11):
 * - Ảnh sản phẩm, nhãn giảm giá / bán chạy / mới
 * - Nút yêu thích (♥) & Nút so sánh (⚖)
 * - Tên sản phẩm tối đa 2 dòng
 * - Cấu hình nổi bật (CPU, RAM, SSD)
 * - Giá bán hiện tại, Giá gốc & % giảm giá
 * - Nhãn trả góp 0% ước tính
 * - Đánh giá & trạng thái kho + Nút Thêm vào giỏ / Xem chi tiết
 */
const BRAND_RIBBON_MAP = {
  Apple: { cls: 'apple', text: 'Apple Chính Hãng VN/A · Ưu đãi S-Student', gift: 'Giảm thêm 500K HSSV & Thu cũ trợ giá 2 Triệu' },
  ASUS: { cls: 'asus', text: 'Tuần Lễ ASUS · Sắm máy cân bài', gift: 'Tặng Balo ASUS + Chuột không dây & Voucher 500K' },
  Lenovo: { cls: 'lenovo', text: 'Lenovo AI PC Week · Đỉnh hiệu năng', gift: 'Bảo hành VIP 24 tháng + Tặng Office bản quyền' },
  MSI: { cls: 'msi', text: 'MSI Gaming Fest · Chiến game đỉnh', gift: 'Tặng Chuột Gaming MSI + Balo Dragon Shield' },
  Dell: { cls: 'dell', text: 'Dell ProSupport · Bền bỉ vượt trội', gift: 'Bảo hành On-site 24/7 + Tặng túi chống sốc' },
  HP: { cls: 'hp', text: 'Tuần Lễ HP · Mỏng nhẹ sang trọng', gift: 'Trả góp 0% lãi suất + Giảm thêm 400K qua QR' },
  Acer: { cls: 'acer', text: 'Acer Nitro Day · Giá sốc sinh viên', gift: 'Tặng Balo Gaming Predator + Voucher giảm 500K' },
  LG: { cls: 'dell', text: 'LG Gram Official · Siêu nhẹ dưới 1KG', gift: 'Tặng bao da LG Gram chính hãng + Chuột Bluetooth' },
};

function pcard(p) {
  const d = discPct(p);
  const inC = (db.compare || []).includes(p.id);
  const inW = (db.wishlist || []).includes(p.id);
  const brandInfo = BRAND_RIBBON_MAP[p.brand] || {
    cls: '',
    text: `Chính hãng ${p.brand || 'Laptop99'} · Giá tốt`,
    gift: 'Tặng Balo Laptop99 chống sốc + Chuột không dây',
  };
  const studentPrice = Math.max(0, Math.round((p.price * 0.97) / 10000) * 10000);
  const gpuShort = String(p.gpu || 'Onboard')
    .replace(/NVIDIA GeForce /i, '')
    .replace(/AMD Radeon /i, '')
    .replace(/Integrated /i, '');
  const cpuShort = String(p.cpu || 'Core i5')
    .replace(/Intel /i, '')
    .replace(/AMD /i, '');

  return `<article class="pc">
    <div class="pc-img-box">
      ${
        d > 0
          ? `<span class="pc-ribbon-left">Giảm ${d}%</span>`
          : p.isBestseller
          ? `<span class="pc-ribbon-left">Bán chạy</span>`
          : `<span class="pc-ribbon-left">Giá tốt</span>`
      }
      <span class="pc-ribbon-right">Trả góp 0%</span>

      <a href="#/product/${p.id}" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding-bottom:14px">
        ${pimg(p)}
      </a>

      <div class="pc-brand-ribbon ${brandInfo.cls}" title="${esc(brandInfo.text)}">
        <span>${esc(brandInfo.text)}</span>
      </div>
    </div>

    <div class="pc-body">
      <div class="pc-spec-center">
        <div class="pc-spec-cpu">${esc(cpuShort)} &nbsp;|&nbsp; ${esc(gpuShort)}</div>
        <div class="pc-spec-ram">${esc(p.ram)} &nbsp;|&nbsp; ${esc(p.ssd)} &nbsp;|&nbsp; ${esc((p.screen || '15.6" FHD').split(' ')[0])}</div>
      </div>

      <a href="#/product/${p.id}" class="pc-title" title="${esc(p.name)}">${esc(p.name)}</a>

      <div class="pc-price-wrap">
        <div>
          <span class="pc-price">${vnd(p.price)}</span>
          ${d > 0 ? `<span class="pc-old">${vnd(p.old)}</span>` : ''}
        </div>
        <span class="pc-student-pill">🎓 Giá S-Student: <b>${vnd(studentPrice)}</b></span>
      </div>

      <div class="pc-gift-note">${esc(brandInfo.gift)}</div>

      <div class="pc-sold-bar" title="Số lượng đã bán">
        <div class="pc-sold-fill" style="width:${Math.min(92, Math.max(38, (Number(p.soldCount || 15) * 4) % 95))}%"></div>
        <span class="pc-sold-txt">🔥 Đã bán ${p.soldCount || 18} máy</span>
      </div>

      <div class="pc-meta">
        <span class="pc-rate">★ ${rate(p)} <span class="muted" style="font-weight:400">(${p.reviewCount || 12})</span></span>
        <div class="row" style="gap:4px">
          <button type="button" class="pc-act-btn wish ${inW ? 'on' : ''}" style="width:24px;height:24px" title="Yêu thích" onclick="event.preventDefault();A.wish('${p.id}')">
            ${ic('heart', 12)}
          </button>
          <button type="button" class="pc-act-btn ${inC ? 'on' : ''}" style="width:24px;height:24px" title="So sánh" onclick="event.preventDefault();A.cmp('${p.id}')">
            ${ic('scale', 12)}
          </button>
        </div>
      </div>

      <div class="pc-cta">
        <button type="button" class="btn a sm grow" ${p.stock <= 0 ? 'disabled' : ''} onclick="A.add('${p.id}')">
          ${ic('cart', 13)} ${p.stock <= 0 ? 'Hết hàng' : 'Mua ngay'}
        </button>
        <a class="btn sm" href="#/product/${p.id}" title="Xem chi tiết cấu hình">Chi tiết</a>
      </div>
    </div>
  </article>`;
}

function renderSkeletonGrid(count = 4) {
  return `<div class="pg">
    ${Array.from({ length: count })
      .map(
        () => `<div class="card" style="padding:14px">
        <div class="skel" style="height:165px;margin-bottom:12px"></div>
        <div class="skel" style="height:14px;width:45%;margin-bottom:8px"></div>
        <div class="skel" style="height:18px;width:85%;margin-bottom:8px"></div>
        <div class="skel" style="height:22px;width:55%;margin-bottom:12px"></div>
        <div class="skel" style="height:36px"></div>
      </div>`,
      )
      .join('')}
  </div>`;
}

I.edit = '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>';
I.eyeOff = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="m1 1 22 22"/>';
I.headset = '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>';

/**
 * brandLogo — Logo chính thức của Website Laptop99 (Ảnh logo mạch điện 99 người dùng cung cấp)
 */
function brandLogo(mode = 'full') {
  const logoSrc = 'storefront/assets/logo-laptop99.png';
  const sz = mode === 'mini' ? 20 : 38;
  const isHeader = mode === 'header';
  const isFooter = mode === 'footer';

  const imgHtml = `<img src="${logoSrc}" alt="Laptop99 Logo" width="${sz}" height="${sz}" class="brand-logo-img" style="width:${sz}px;height:${sz}px;border-radius:${mode === 'mini' ? '5px' : '9px'};object-fit:cover;flex-shrink:0;box-shadow:0 2px 6px rgba(0,0,0,0.16);border:1.5px solid rgba(255,255,255,0.65)">`;

  if (mode === 'mini') {
    return `<span class="hs-brand-seal brand-logo-wrap" title="Thương hiệu Laptop99 Chính Hãng">${imgHtml} <span>LAPTOP<span style="color:var(--acc)">99</span> OFFICIAL</span></span>`;
  }

  if (isHeader) {
    return `<span class="brand-logo-wrap" style="display:inline-flex;align-items:center;gap:9px">
      ${imgHtml}
      <span style="display:flex;flex-direction:column;line-height:1.05">
        <span class="brand-name-animated" style="font-size:1.24rem;font-weight:900;letter-spacing:-0.03em;text-shadow:0 1px 3px rgba(0,0,0,0.35)">
          LAPTOP<span class="brand-num-glow">99</span>
        </span>
        <span class="brand-sub-badge" style="font-size:0.53rem;font-weight:800;letter-spacing:0.1em;color:rgba(255,255,255,0.92);display:inline-flex;align-items:center;gap:4.5px;margin-top:2px">
          CHÍNH HÃNG 100% <i class="pulse-live-beacon"></i>
        </span>
      </span>
    </span>`;
  }

  if (isFooter) {
    return `<span class="brand-logo-wrap footer-mode" style="display:inline-flex;align-items:center;gap:9px">
      ${imgHtml}
      <span style="display:flex;flex-direction:column;line-height:1.05">
        <span class="brand-name-animated" style="font-size:1.2rem;font-weight:900;letter-spacing:-0.03em">
          LAPTOP<span class="brand-num-glow">99</span>
        </span>
        <span class="brand-sub-badge" style="font-size:0.53rem;font-weight:800;letter-spacing:0.1em;color:#AEB4BF;display:inline-flex;align-items:center;gap:4.5px;margin-top:2px">
          CHÍNH HÃNG 100% <i class="pulse-live-beacon"></i>
        </span>
      </span>
    </span>`;
  }

  return `<span class="brand-logo-wrap" style="display:inline-flex;align-items:center;gap:9px">
    ${imgHtml}
    <span style="display:flex;flex-direction:column;line-height:1.05">
      <span class="brand-name-animated" style="font-size:1.18rem;font-weight:900;letter-spacing:-0.03em">
        LAPTOP<span class="brand-num-glow">99</span>
      </span>
      <span class="brand-sub-badge" style="font-size:0.54rem;font-weight:800;letter-spacing:0.12em;color:var(--mut);display:inline-flex;align-items:center;gap:4.5px;margin-top:2px">
        OFFICIAL STORE <i class="pulse-live-beacon"></i>
      </span>
    </span>
  </span>`;
}

/**
 * renderPromoWelcomeModal — Modal hiển thị các chương trình ưu đãi & Voucher khi vào trang
 */
function renderPromoWelcomeModal(promos = []) {
  const activePromos = promos.filter((p) => p.active !== false && p.status !== 'ended');
  const displayList = activePromos.length ? activePromos : [
    { code: 'SUMMER2026', title: 'Khuyến mãi Hè 2026', type: 'percent', discount_value: 10, min_order_value: 20000000 },
    { code: 'BACK2SCHOOL', title: 'Mùa tựu trường', type: 'percent', discount_value: 8, min_order_value: 15000000 },
    { code: 'GAMING500K', title: 'Giảm 500K Laptop Gaming', type: 'cash', discount_value: 500000, min_order_value: 30000000 },
    { code: 'LAPTOP99', title: 'Giảm 5% cho đơn từ 10 triệu', type: 'percent', discount_value: 5, min_order_value: 10000000 },
  ];

  return `
  <div class="promo-modal-card">
    <div class="promo-modal-hero">
      <button type="button" onclick="closeModal()" class="promo-close-btn" aria-label="Đóng" style="position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.28);border:none;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;font-size:1rem;font-weight:900">✕</button>
      <span class="promo-hero-badge">ĐẠI TIỆC VOUCHER THÁNG NÀY</span>
      <h3 class="promo-hero-title">ƯU ĐÃI ĐẶC QUYỀN LAPTOP99</h3>
      <p class="promo-hero-sub">Lưu ngay các mã voucher giảm giá trực tiếp tới <b>2.000.000 ₫</b> khi mua laptop chính hãng!</p>
    </div>

    <div class="promo-modal-body">
      <div class="promo-tickets-grid">
        ${displayList
          .map((p) => {
            const isPercent = p.type === 'percent' || p.type === 'pct';
            const numVal = Number(p.value ?? p.discount_value ?? 0);
            const valTxt = isPercent ? `Giảm ${numVal}%` : `Giảm ${vnd(numVal)}`;
            const minNum = Number(p.min ?? p.min_order_value ?? 0);
            const minTxt = minNum > 0 ? `Đơn từ ${vnd(minNum)}` : 'Mọi đơn hàng';
            const titleTxt = p.desc || p.title || `Voucher ưu đãi ${p.code}`;
            return `
            <div class="promo-ticket">
              <div class="promo-t-left">
                <div class="promo-t-icon">${ic('tag', 18)}</div>
                <div style="min-width:0">
                  <div class="promo-t-code">${esc(p.code)}</div>
                  <div style="font-weight:700;font-size:.82rem;color:var(--fg);margin-top:1px">${esc(titleTxt)}</div>
                  <div class="promo-t-desc"><b style="color:#BE123C">${valTxt}</b> · ${minTxt}</div>
                </div>
              </div>
              <button type="button" class="promo-t-btn" id="cp-btn-${esc(p.code)}" onclick="A.copyVoucher('${esc(p.code)}')">
                Lưu mã
              </button>
            </div>
            `;
          })
          .join('')}
      </div>

      <div class="promo-perks-row">
        <div class="promo-perk-col">
          <b>🎁 Quà Tặng 100% Đơn</b>
          <span>Tặng Balo chống sốc Laptop99 + Chuột không dây chính hãng</span>
        </div>
        <div class="promo-perk-col">
          <b>🚚 Miễn Phí Vận Chuyển</b>
          <span>Giao nhanh toàn quốc · Đồng kiểm tra máy trước khi thanh toán</span>
        </div>
        <div class="promo-perk-col">
          <b>🛡️ Bảo Hành S/N Chuẩn</b>
          <span>1 đổi 1 trong 15 ngày · Bảo hành điện tử theo số Serial 12-24T</span>
        </div>
      </div>

      <div class="row between" style="gap:10px;margin-top:6px;align-items:center">
        <label style="display:inline-flex;align-items:center;gap:6px;font-size:.76rem;color:var(--mut);cursor:pointer">
          <input type="checkbox" id="chk-no-promo-pop" onchange="sessionStorage.setItem('laptop99_promo_popup_seen','1')">
          <span>Không tự động hiện lại trong phiên này</span>
        </label>
        <button type="button" class="btn a" style="padding:8px 22px;font-weight:800" onclick="closeModal();location.hash='#/products'">
          Khám phá sản phẩm ngay →
        </button>
      </div>
    </div>
  </div>`;
}

