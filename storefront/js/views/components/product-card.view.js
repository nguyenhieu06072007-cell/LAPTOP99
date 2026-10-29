/* ==========================================================================
   STOREFRONT MVC VIEW COMPONENT: Product Card, Image Renderer & Brand Badges
   ========================================================================== */

const vnd = fmt;
const discPct = (p) => (p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0);
const rate = (p) => (p.reviewCount > 0 && p.rating ? p.rating : null);

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
    return `<img src="${esc(p.thumbnail)}" alt="${esc(p.name)}" class="prod-real-img ${cls}" loading="lazy" onerror="if(!this.dataset.retried&&this.src.indexOf('onrender.com')!==-1){this.dataset.retried='1';this.src='https://laptop99.vercel.app/'+this.src.replace(/^https?:\\/\\/[^\\/]+\\//,'');}else if(!this.dataset.retried&&this.src.indexOf('onrender.com')===-1){this.dataset.retried='1';this.src='https://laptop99-ejug.onrender.com/'+this.getAttribute('src').replace(/^\\//,'');}else{this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='block';}">
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
        <span class="pc-rate">${p.reviewCount > 0 && p.rating ? `★ ${p.rating} <span class="muted" style="font-weight:400">(${p.reviewCount})</span>` : '<span class="muted" style="font-weight:500;font-size:.73rem">Chưa có đánh giá</span>'}</span></span>
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

