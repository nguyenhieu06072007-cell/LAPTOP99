/* ==========================================================================
   STOREFRONT MVC VIEW COMPONENT: Common UI Components (Modal, Toast, Badges, Skeletons)
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
  // Force reflow then add entrance animation class
  requestAnimationFrame(() => {
    const box = m.querySelector('.mb');
    if (box) box.classList.add('mb-enter');
  });
}

function closeModal() {
  const m = $('#modal');
  if (!m) return;
  if (window.promoCountdownTimer) {
    clearInterval(window.promoCountdownTimer);
    window.promoCountdownTimer = null;
  }
  const box = m.querySelector('.mb');
  if (box) {
    box.classList.add('mb-exit');
    m.classList.add('closing');
    setTimeout(() => {
      m.className = '';
      m.innerHTML = '';
    }, 240);
  } else {
    m.className = '';
    m.innerHTML = '';
  }
}

function mHead(title, sub) {
  return `<div class="row between" style="margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border-default)">
    <div>
      <h3 style="font-size:1.15rem;font-weight:800;color:var(--text-title)">${esc(title)}</h3>
      ${sub ? `<p class="muted xs" style="margin-top:2px">${esc(sub)}</p>` : ''}
    </div>
    <button type="button" class="btn sm" onclick="closeModal()" aria-label="Đóng cửa sổ" style="padding:4px 8px">${ic('x', 14)}</button>
  </div>`;
}

function renderSkeletonCard() {
  return `<div class="skel-pcard">
    <div class="skel skel-pcard-thumb"></div>
    <div class="skel-pcard-body">
      <div class="skel skel-pcard-line" style="width:55%"></div>
      <div class="skel skel-pcard-line" style="width:90%"></div>
      <div class="skel skel-pcard-line" style="width:75%"></div>
      <div class="skel skel-pcard-price"></div>
      <div class="skel skel-pcard-btn"></div>
    </div>
  </div>`;
}

function renderSkeletonGrid(count = 4) {
  return `<div class="pg">${Array.from({ length: count }, () => renderSkeletonCard()).join('')}</div>`;
}

/**
 * brandLogo — Logo thương hiệu chính thức của Hệ thống Laptop99
 */
function brandLogo(mode = 'full') {
  const logoSrc = 'storefront/assets/logo-laptop99.png';
  const sz = mode === 'mini' ? 20 : 38;
  const isHeader = mode === 'header';
  const isFooter = mode === 'footer';

  const imgHtml = `<img src="${logoSrc}" alt="Laptop99 Logo" width="${sz}" height="${sz}" class="brand-logo-img" style="width:${sz}px;height:${sz}px;border-radius:${mode === 'mini' ? '5px' : '9px'};object-fit:cover;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.22);border:1.5px solid rgba(255,255,255,0.75)">`;

  if (mode === 'mini') {
    return `<span class="hs-brand-seal brand-logo-wrap" title="Thương hiệu Laptop99 Chính Hãng">${imgHtml} <span>LAPTOP<span style="color:var(--brand-red)">99</span> OFFICIAL</span></span>`;
  }

  if (isHeader) {
    return `<span class="brand-logo-wrap" style="display:inline-flex;align-items:center;gap:9px">
      ${imgHtml}
      <span style="display:flex;flex-direction:column;line-height:1.05">
        <span class="brand-title" style="font-size:1.32rem;font-weight:900;letter-spacing:-0.03em;color:#FFFFFF;text-shadow:0 1px 3px rgba(0,0,0,0.35);display:inline-flex;align-items:center">
          <span style="color:#FFFFFF">LAPTOP</span><span style="color:#FEF08A;font-weight:900;margin-left:1px;filter:drop-shadow(0 0 6px rgba(254,240,138,0.6))">99</span>
        </span>
        <span class="brand-sub-badge" style="font-size:0.54rem;font-weight:800;letter-spacing:0.1em;color:rgba(255,255,255,0.92);display:inline-flex;align-items:center;gap:4.5px;margin-top:2px">
          CHÍNH HÃNG 100% <i class="pulse-live-beacon"></i>
        </span>
      </span>
    </span>`;
  }

  if (isFooter) {
    return `<span class="brand-logo-wrap footer-mode" style="display:inline-flex;align-items:center;gap:9px">
      ${imgHtml}
      <span style="display:flex;flex-direction:column;line-height:1.05">
        <span class="brand-title" style="font-size:1.24rem;font-weight:900;letter-spacing:-0.03em;color:#FFFFFF;display:inline-flex;align-items:center">
          <span style="color:#FFFFFF">LAPTOP</span><span style="color:var(--brand-red);font-weight:900;margin-left:1px">99</span>
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
      <span class="brand-title" style="font-size:1.22rem;font-weight:900;letter-spacing:-0.03em;color:#171A21;display:inline-flex;align-items:center">
        <span style="color:#171A21">LAPTOP</span><span style="color:var(--brand-red);font-weight:900;margin-left:1px">99</span>
      </span>
      <span class="brand-sub-badge" style="font-size:0.54rem;font-weight:800;letter-spacing:0.12em;color:var(--brand-red);display:inline-flex;align-items:center;gap:4px;margin-top:2px">
        CHÍNH HÃNG 100% <i class="pulse-live-beacon"></i>
      </span>
    </span>
  </span>`;
}

