/* ==========================================================================
   STOREFRONT MVC VIEW COMPONENT: Product Card, Image Renderer & Brand Badges
   ========================================================================== */

const vnd = fmt;
const discPct = (p) => (p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0);
const rate = (p) => p.rating || '5.0';

const stockTxt = (p) =>
  p.stock <= 0
    ? '<span class="bd bad">Tạm hết hàng</span>'
    : p.stock <= 5
    ? `<span class="bd warn">Sắp hết (${p.stock})</span>`
    : `<span class="bd ok">Còn hàng (${p.stock})</span>`;

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

function brandLogo(mode = 'full') {
  const isHeader = mode === 'header';
  const isFooter = mode === 'footer';

  const laptopIcoSvg = `<svg width="34" height="26" viewBox="0 0 38 28" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
    <rect x="5" y="2" width="28" height="19" rx="3" stroke="#FFFFFF" stroke-width="2.2" fill="#1E202B"/>
    <rect x="8" y="5" width="22" height="13" rx="1.5" fill="#E11D48"/>
    <path d="M12 9L15 12L12 15" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="17" y1="14" x2="25" y2="14" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M1 23C1 22.4477 1.44772 22 2 22H36C36.5523 22 37 22.4477 37 23V24C37 25.1046 36.1046 26 35 26H3C1.89543 26 1 25.1046 1 24V23Z" fill="#E11D48"/>
    <line x1="16" y1="24" x2="22" y2="24" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;

  if (isHeader) {
    return `<span class="brand-logo-wrap" style="display:inline-flex;align-items:center;gap:10px">
      ${laptopIcoSvg}
      <span style="display:flex;flex-direction:column;line-height:1">
        <span class="brand-title" style="font-size:1.45rem;font-weight:900;letter-spacing:-0.03em;color:#FFFFFF;display:inline-flex;align-items:center">
          <span>LAPTOP</span><span style="color:#E11D48;margin-left:1px">99</span>
        </span>
        <span class="brand-sub-badge" style="font-size:0.56rem;font-weight:700;letter-spacing:0.16em;color:#E11D48;margin-top:4px;text-transform:uppercase">
          UY TÍN TẠO NÊN THƯƠNG HIỆU
        </span>
      </span>
    </span>`;
  }

  if (isFooter) {
    return `<span class="brand-logo-wrap footer-mode" style="display:inline-flex;align-items:center;gap:10px">
      ${laptopIcoSvg}
      <span style="display:flex;flex-direction:column;line-height:1">
        <span class="brand-title" style="font-size:1.35rem;font-weight:900;letter-spacing:-0.03em;color:#FFFFFF;display:inline-flex;align-items:center">
          <span>LAPTOP</span><span style="color:#E11D48;margin-left:1px">99</span>
        </span>
        <span class="brand-sub-badge" style="font-size:0.55rem;font-weight:700;letter-spacing:0.14em;color:#AEB4BF;margin-top:3px;text-transform:uppercase">
          UY TÍN TẠO NÊN THƯƠNG HIỆU
        </span>
      </span>
    </span>`;
  }

  return `<span class="brand-logo-wrap" style="display:inline-flex;align-items:center;gap:10px">
    ${laptopIcoSvg}
    <span style="display:flex;flex-direction:column;line-height:1">
      <span class="brand-title" style="font-size:1.35rem;font-weight:900;letter-spacing:-0.03em;color:#FFFFFF;display:inline-flex;align-items:center">
        <span style="color:#111827">LAPTOP</span><span style="color:#E11D48;margin-left:1px">99</span>
      </span>
      <span class="brand-sub-badge" style="font-size:0.55rem;font-weight:700;letter-spacing:0.14em;color:#E11D48;margin-top:3px;text-transform:uppercase">
        UY TÍN TẠO NÊN THƯƠNG HIỆU
      </span>
    </span>
  </span>`;
}

function pcard(p) {
  const d = discPct(p);
  const inC = (db.compare || []).includes(p.id);
  const inW = (db.wishlist || []).includes(p.id);

  // Badge theo phong cách hiện đại từ screenshot
  let badgeHtml = '';
  if (d > 0) {
    badgeHtml = `<span class="pc-badge pc-badge-sale">Giảm giá</span>`;
  } else if (p.isBestseller || (p.soldCount && p.soldCount > 30)) {
    badgeHtml = `<span class="pc-badge pc-badge-bestseller">Bán chạy</span>`;
  } else if (p.isNew) {
    badgeHtml = `<span class="pc-badge pc-badge-new">Mới</span>`;
  } else {
    badgeHtml = `<span class="pc-badge pc-badge-hot">Hot</span>`;
  }

  // Chuỗi cấu hình rút gọn đẹp mắt: CPU | RAM | SSD | GPU
  const cpuShort = String(p.cpu || 'Core i5').replace(/Intel /i, '').replace(/AMD /i, '');
  const gpuShort = String(p.gpu || 'RTX 4060').replace(/NVIDIA GeForce /i, '').replace(/AMD Radeon /i, '').replace(/Integrated /i, 'Onboard');
  const ramShort = String(p.ram || '16GB').toUpperCase();
  const ssdShort = String(p.ssd || '512GB').toUpperCase();
  
  let specSummary = `${cpuShort} | ${ramShort} | ${ssdShort}`;
  if (gpuShort && gpuShort !== 'Onboard') {
    specSummary += ` | ${gpuShort}`;
  }

  return `<article class="pc pc-modern-card">
    <div class="pc-img-box">
      ${badgeHtml}
      <a href="#/product/${p.id}" class="pc-img-link">
        ${pimg(p)}
      </a>
      <div class="pc-actions-floating">
        <button type="button" class="pc-act-btn wish ${inW ? 'on' : ''}" title="Yêu thích" onclick="event.preventDefault();A.wish('${p.id}')">
          ${ic('heart', 13)}
        </button>
        <button type="button" class="pc-act-btn cmp ${inC ? 'on' : ''}" title="So sánh" onclick="event.preventDefault();A.cmp('${p.id}')">
          ${ic('scale', 13)}
        </button>
      </div>
    </div>

    <div class="pc-body">
      <a href="#/product/${p.id}" class="pc-title" title="${esc(p.name)}">${esc(p.name)}</a>
      <div class="pc-spec-summary" title="${esc(specSummary)}">${esc(specSummary)}</div>

      <div class="pc-price-row">
        <span class="pc-price">${vnd(p.price)}</span>
        ${d > 0 ? `<span class="pc-old">${vnd(p.old)}</span>` : ''}
      </div>

      <div class="pc-footer-row">
        <div class="pc-rating-wrap">
          <span class="pc-star">★</span>
          <span class="pc-star">★</span>
          <span class="pc-star">★</span>
          <span class="pc-star">★</span>
          <span class="pc-star">★</span>
          <span class="pc-rev-count">(${p.reviewCount || 128})</span>
        </div>
        <button type="button" class="pc-cart-btn" onclick="event.preventDefault(); A.add('${p.id}')" title="Thêm vào giỏ hàng" aria-label="Thêm vào giỏ hàng">
          ${ic('cart', 16)}
        </button>
      </div>
    </div>
  </article>`;
}

