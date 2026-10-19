/* ==========================================================================
   STOREFRONT MVC VIEW COMPONENT: Common UI Components (Modal, Toast, Badges, Skeletons)
   ========================================================================== */

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
  m.innerHTML = `<div class="mb ${sm ? 'sm' : ''} ${isPromo ? 'mb-promo' : ''}" onclick="event.stopPropagation()">${html}</div>`;
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

