/* ==========================================================================
   STOREFRONT MVC CONTROLLER: Home Controller (Carousels, Timers, Smart Filters)
   ========================================================================== */

let heroInterval = null;
let trustInterval = null;
let heroTouchStartX = 0;

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const HomeController = {
  resetHeroProgress() {
    const bar = $('#hero-progress-bar');
    if (!bar) return;
    bar.style.animation = 'none';
    void bar.offsetWidth; // Reflow to restart 5s progress animation
    bar.style.animation = '';
  },

  goHero(idx) {
    const track = $('#hero-track');
    const slides = $$('#hero-slider .hero-slide');
    const dots = $$('#hero-slider .hs-dot');
    const tabs = $$('#hero-slider .hs-tab');
    if (!slides.length) return;
    cache.heroIdx = ((idx % slides.length) + slides.length) % slides.length;
    if (track) {
      track.style.transform = `translateX(-${cache.heroIdx * 100}%)`;
    }
    slides.forEach((s, i) => s.classList.toggle('active', i === cache.heroIdx));
    dots.forEach((d, i) => d.classList.toggle('on', i === cache.heroIdx));
    tabs.forEach((t, i) => t.classList.toggle('active', i === cache.heroIdx));
    this.resetHeroProgress();
  },

  stepHero(dir) {
    this.goHero((cache.heroIdx || 0) + dir);
  },

  pauseHero() {
    if (heroInterval) {
      clearInterval(heroInterval);
      heroInterval = null;
    }
  },

  resumeHero() {
    this.pauseHero();
    if (prefersReducedMotion()) return;
    const slides = $$('#hero-slider .hero-slide');
    if (slides.length <= 1) return;
    const ms = 5000;
    cache.heroAutoplayMs = ms;
    this.resetHeroProgress();
    heroInterval = setInterval(() => {
      if ($('#hero-slider')) this.stepHero(1);
      else this.pauseHero();
    }, ms);
  },

  heroKey(e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.stepHero(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.stepHero(1);
    }
  },

  heroTouchStart(e) {
    if (e.changedTouches && e.changedTouches[0]) {
      heroTouchStartX = e.changedTouches[0].screenX;
    }
  },

  heroTouchEnd(e) {
    if (e.changedTouches && e.changedTouches[0]) {
      const diff = e.changedTouches[0].screenX - heroTouchStartX;
      if (Math.abs(diff) > 40) {
        this.stepHero(diff < 0 ? 1 : -1);
      }
    }
  },

  stepTrust(dir = 1) {
    const msgs = $$('#trust-rotator .tr-msg');
    if (!msgs.length) return;
    cache.trustIdx = (((cache.trustIdx || 0) + dir) % msgs.length + msgs.length) % msgs.length;
    msgs.forEach((m, i) => m.classList.toggle('active', i === cache.trustIdx));
  },

  pauseTrust() {
    if (trustInterval) {
      clearInterval(trustInterval);
      trustInterval = null;
    }
  },

  resumeTrust() {
    this.pauseTrust();
    if (prefersReducedMotion()) return;
    const msgs = $$('#trust-rotator .tr-msg');
    if (msgs.length <= 1) return;
    trustInterval = setInterval(() => {
      if ($('#trust-rotator')) this.stepTrust(1);
      else this.pauseTrust();
    }, 4000);
  },

  setSmartFilter(type, v) {
    if (type === 'cat') cache.smartCat = v;
    if (type === 'brand') cache.smartBrand = v;
    render();
  },

  stepBestSellers(dir) {
    const cats = ['all', '2', 'Apple', '1', '5', '4'];
    let cur = cache.smartCat || 'all';
    if (cache.smartBrand === 'Apple') cur = 'Apple';
    let idx = cats.indexOf(cur);
    if (idx === -1) idx = 0;
    idx = (idx + dir + cats.length) % cats.length;
    const target = cats[idx];
    if (target === 'Apple') {
      cache.smartCat = 'all';
      cache.smartBrand = 'Apple';
    } else {
      cache.smartCat = target;
      cache.smartBrand = 'all';
    }
    render();
  },

  switchBrandCampaign(brand) {
    cache.activeBrandCampaign = brand;
    render();
  },

  toggleContactMenu() {
    const menu = $('#fab-contact-menu');
    if (menu) menu.classList.toggle('open');
  },

  openZaloModal() {
    const menu = $('#fab-contact-menu');
    if (menu) menu.classList.remove('open');
    modal(
      mHead('Liên hệ Zalo Official — Laptop99', 'Hỗ trợ tư vấn mua hàng, báo giá doanh nghiệp & bảo hành S/N') +
        `<div class="gap" style="text-align:center;padding:8px 0">
          <div style="width:72px;height:72px;border-radius:18px;background:#0068FF;color:#fff;font-weight:900;font-size:1.35rem;display:flex;align-items:center;justify-content:center;margin:0 auto;box-shadow:0 8px 20px rgba(0,104,255,0.28)">Zalo</div>
          <div style="font-weight:800;font-size:1.05rem;margin-top:6px">Zalo OA: Hệ Thống Laptop99 Chính Hãng</div>
          <p class="muted sm">Chuyên viên tư vấn phản hồi trực tiếp (8:00 – 22:00 mỗi ngày)</p>
          <div style="background:#F8FAFC;border:1px solid var(--line);border-radius:12px;padding:12px;text-align:left;font-size:.82rem;display:grid;gap:6px">
            <div>📞 <b>Hotline / Zalo Tư vấn mua máy:</b> <span class="acc" style="font-weight:800">0909.998.899</span></div>
            <div>🛡️ <b>Zalo Hỗ trợ Kỹ thuật &amp; Bảo hành S/N:</b> <span style="font-weight:700">1800.6868</span></div>
            <div>🔄 <b>Zalo Định giá Thu cũ lên đời:</b> <span style="font-weight:700">0909.998.877</span></div>
          </div>
          <div class="row" style="justify-content:center;gap:10px;margin-top:8px">
            <a href="https://zalo.me" target="_blank" rel="noopener" class="btn a lg" style="background:#0068FF;border-color:#0068FF">Mở ứng dụng Zalo →</a>
            <button type="button" class="btn lg" onclick="closeModal()">Đóng</button>
          </div>
        </div>`,
      true,
    );
  },

  openHotlineModal() {
    const menu = $('#fab-contact-menu');
    if (menu) menu.classList.remove('open');
    modal(
      mHead('Tổng Đài Hỗ Trợ Miễn Phí — Laptop99', 'Tư vấn cấu hình, đặt hàng nhanh & tra cứu bảo hành S/N') +
        `<div class="gap" style="font-size:.84rem">
          <div class="card" style="padding:12px;background:#FFF1F2;border-color:#FECDD3">
            <div class="xs acc" style="font-weight:800;text-transform:uppercase">Tư vấn mua hàng &amp; Khuyến mãi (Miễn phí)</div>
            <div style="font-size:1.35rem;font-weight:900;color:var(--acc);margin-top:2px">1800.6868 <span class="xs muted" style="font-weight:600">(Nhánh 1 · 8:00 – 22:00)</span></div>
          </div>
          <div class="card" style="padding:12px">
            <div class="xs muted" style="font-weight:800;text-transform:uppercase">Bảo hành điện tử S/N &amp; Đổi trả RMA</div>
            <div style="font-size:1.15rem;font-weight:800;margin-top:2px">1800.6869 <span class="xs muted" style="font-weight:600">(Nhánh 2 · 8:30 – 21:00)</span></div>
          </div>
          <div class="row" style="justify-content:flex-end;gap:8px;margin-top:6px">
            <button type="button" class="btn a" onclick="closeModal()">Đã hiểu</button>
          </div>
        </div>`,
      true,
    );
  },

  copy(t) {
    try {
      navigator.clipboard.writeText(t).then(
        () => toast('Đã sao chép mã ' + t),
        () => toast('Mã khuyến mãi: ' + t),
      );
    } catch (e) {
      toast('Mã khuyến mãi: ' + t);
    }
  },

  savePromo(code, btn) {
    try {
      navigator.clipboard.writeText(code);
    } catch (e) {}
    db.cartCoupon = code;
    save();
    if (btn) {
      btn.textContent = '✓ Đã lưu';
      btn.classList.add('saved');
    }
    toast(`🎉 Đã lưu mã ${code}! Tự động áp dụng tại Giỏ hàng & Thanh toán.`);
  },

  claimAllPromosAndShop() {
    const promos = (cache.promos && cache.promos.length) ? cache.promos : [
      { code: 'SUMMER2026', type: 'pct', value: 10, min: 20000000, desc: 'Khuyến mãi Hè 2026 (Giảm 10%)' }
    ];
    db.cartCoupon = promos[0].code;
    save();
    toast(`🎉 Đã kích hoạt mã ${promos[0].code}! Đang mở danh mục sản phẩm...`);
    closeModal();
    location.hash = '#/products';
  },

  openPromoPopup(force = false, viewMode = 'deal') {
    let promos = cache.promos || [];
    if (!promos.length) {
      promos = [
        { code: 'SUMMER2026', type: 'pct', value: 10, cap: 2000000, min: 20000000, exp: '2026-12-30', desc: 'Khuyến mãi Hè 2026 — Giảm 10% tối đa 2.000.000đ' },
        { code: 'GAMING500K', type: 'fixed', value: 500000, cap: 500000, min: 30000000, exp: '2026-12-30', desc: 'Giảm trực tiếp 500.000đ cho Laptop Gaming' },
        { code: 'BACK2SCHOOL', type: 'pct', value: 8, cap: 1500000, min: 15000000, exp: '2026-11-29', desc: 'Mùa Tựu Trường - Đồng Hành Sinh Viên' },
        { code: 'COMBO_OFFICE', type: 'fixed', value: 500000, cap: 500000, min: 22000000, exp: '2026-12-30', desc: 'Combo Doanh Nhân Văn Phòng Đỉnh Cao' }
      ];
    }
    sessionStorage.setItem('laptop99_promo_popup_seen', '1');

    const entryBanner = (cache.banners || []).find(
      (b) => (b.position === 'entry_popup' || b.position === 'popup_banner') && b.is_active
    );

    // Giao diện Banner Quảng Cáo Đầu Trang (Laptop88 Cyber Style)
    if (entryBanner && viewMode !== 'vouchers') {
      const bannerBadge = esc(entryBanner.badge_text || 'DEAL CỰC SỐC');
      const bannerTitle = esc(entryBanner.title || 'LOQ 2026');
      const bannerHl = esc(entryBanner.highlight_text || 'GIẢM TỚI 6 TRIỆU/MÁY');
      const bannerSub = esc(entryBanner.subtitle || 'SỐ LƯỢNG CÓ HẠN');
      const bannerImg = resolveAssetUrl(
        entryBanner.image_url || '/uploads/products/laptop-gaming-lenovo-loq-15irx9-i5-13450hx-16gb-512gb-rtx-4050-1.jpg'
      );
      const bannerCta = esc(entryBanner.cta_text || 'SĂN DEAL NGAY');
      const bannerLink = entryBanner.cta_link || (entryBanner.product_id ? `#/product/p${entryBanner.product_id}` : '#/products');

      // Phân tích 3 Pills thông số đáy
      let specs = ['Chip Core 5 / 7 ĐỜI MỚI', 'Giá từ 25 TRIỆU', '100% sRGB 165Hz'];
      if (entryBanner.specs_json) {
        const parsed = String(entryBanner.specs_json).split(',').map((s) => s.trim()).filter(Boolean);
        if (parsed.length >= 2) specs = parsed;
      } else if (entryBanner.custom_price) {
        specs[1] = 'Giá từ ' + fmt(entryBanner.custom_price);
      }

      const entryHtml = `
      <div class="entry-popup-container">
        <!-- Nút đóng [X] nổi bật phía trên bên phải -->
        <button type="button" class="ep-close-btn" onclick="closeModal()" title="Đóng quảng cáo" aria-label="Đóng popup">
          ✕
        </button>

        <!-- Thẻ Banner Quảng Cáo Gaming Cao Cấp (Click vào để mở sản phẩm) -->
        <a href="${bannerLink}" class="entry-popup-card" onclick="closeModal()" title="${bannerTitle} — ${bannerHl}">
          <!-- Stickers 3D Gaming Chuyển Động -->
          <span class="ep-sticker ep-stk-1">🕹️</span>
          <span class="ep-sticker ep-stk-2">👾</span>
          <span class="ep-sticker ep-stk-3">🎮</span>
          <span class="ep-sticker ep-stk-4">✨</span>

          <!-- Tag Dẫn Đầu Có Chevrons Neon -->
          <div class="ep-header-tag">
            <span class="ep-chevrons">«««</span>
            <span class="ep-badge-pill">${bannerBadge}</span>
            <span class="ep-chevrons">»»»</span>
          </div>

          <!-- Tiêu Đề Dòng Máy Cỡ Lớn -->
          <h2 class="ep-title">${bannerTitle}</h2>

          <!-- Ruy Băng Nhấn Mạnh Mức Giảm Sốc -->
          <div class="ep-hl-wrap">
            <span class="ep-highlight-ribbon">${bannerHl}</span>
          </div>

          <!-- Ảnh Laptop 3D Có Quầng Sáng Tím Neon -->
          <div class="ep-visual-wrap">
            <div class="ep-spotlight"></div>
            <img src="${bannerImg}" alt="${bannerTitle}" class="ep-img" loading="eager">
          </div>

          <!-- 3 Thẻ Thông Số & Giá Nổi Bật Dưới Chân Máy -->
          <div class="ep-pills-row">
            <div class="ep-pill">
              <span class="ep-pill-text">${esc(specs[0] || 'Chip Core i5/i7')}</span>
            </div>
            <div class="ep-pill ep-pill-hero">
              <span class="ep-pill-text ep-pill-hero-text">${esc(specs[1] || 'Giá từ 25 TRIỆU')}</span>
            </div>
            <div class="ep-pill">
              <span class="ep-pill-text">${esc(specs[2] || '100% sRGB 165Hz')}</span>
            </div>
          </div>

          <!-- Dải Ruy Băng Khẩn Cấp Cuối Cùng -->
          <div class="ep-emergency-wrap">
            <span class="ep-emergency-ribbon">
              <span class="ep-pulse-dot"></span>
              ${bannerSub}
            </span>
          </div>
        </a>

        <!-- Hàng Nút Hành Động Phía Dưới -->
        <div class="ep-actions-bar">
          <a href="${bannerLink}" class="ep-btn-primary" onclick="closeModal()">
            <span>${bannerCta}</span>
            <span class="ep-arrow">→</span>
          </a>
          <button type="button" class="ep-btn-secondary" onclick="A.openPromoPopup(true, 'vouchers')">
            <span>🎟️ Mở Kho Voucher Ưu Đãi (${promos.length} Mã Giảm Sốc)</span>
          </button>
        </div>
      </div>`;

      modal(entryHtml);
      return;
    }

    // Giao diện Kho Voucher Khuyến Mãi (CellphoneS Style)
    const voucherCards = promos
      .map((p, i) => {
        const isPct = p.type === 'pct' || p.type === 'percent';
        const rawVal = Number(p.discount_value != null ? p.discount_value : (p.value != null ? p.value : p.val)) || 0;
        const valTxt = isPct ? `-${rawVal}%` : (rawVal > 0 ? `-${fmt(rawVal)}` : 'QUÀ TẶNG');
        const title = p.title || p.desc || `Voucher giảm ${valTxt}`;
        const minVal = p.min != null ? p.min : (p.min_order_value != null ? p.min_order_value : 0);
        const minTxt = minVal > 0 ? `Đơn từ ${fmt(minVal)}` : 'Mọi đơn hàng';
        const expTxt = p.exp ? p.exp.split('-').reverse().join('/') : (p.end_date ? p.end_date.split('-').reverse().join('/') : '30/12/2026');
        const isSaved = db.cartCoupon === p.code;

        return `
        <div class="promo-voucher-ticket" style="animation-delay:${i * 90}ms">
          <div class="promo-ticket-notch notch-top"></div>
          <div class="promo-ticket-notch notch-bottom"></div>
          <div class="promo-ticket-left">
            <div class="promo-ticket-tag-row">
              <span class="promo-ticket-tag">MÃ ƯU ĐÃI</span>
              <span class="promo-ticket-code" onclick="A.savePromo('${esc(p.code)}', this)" title="Sao chép mã">
                <code>${esc(p.code)}</code>
                <span class="promo-ticket-copy-icon">${ic('copy', 11)}</span>
              </span>
            </div>
            <div class="promo-ticket-title">${esc(title)}</div>
            <div class="promo-ticket-meta">
              <span>Đk: <b>${minTxt}</b></span>
              <span class="promo-dot">•</span>
              <span>HSD: <b>${expTxt}</b></span>
            </div>
          </div>
          <div class="promo-ticket-divider"></div>
          <div class="promo-ticket-right">
            <div class="promo-ticket-val">${valTxt}</div>
            <div class="promo-ticket-type-label">${isPct ? 'GIẢM THEO %' : 'GIẢM TIỀN MẶT'}</div>
            <button type="button" class="promo-ticket-btn ${isSaved ? 'saved' : ''}" onclick="A.savePromo('${esc(p.code)}', this)">
              ${isSaved ? '✓ Đã lưu' : 'Lưu mã'}
            </button>
          </div>
        </div>`;
      })
      .join('');

    const premiumHtml = `
      <div class="promo-popup">
        <button type="button" class="promo-close-btn" onclick="closeModal()" aria-label="Đóng popup">✕</button>

        ${
          entryBanner
            ? `
        <div style="background:#0F172A;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #334155;color:#E2E8F0;font-size:0.75rem;font-weight:700;">
          <span>🔥 Đang có Deal Cực Sốc: <b>${esc(entryBanner.title)}</b></span>
          <button type="button" style="background:#8B5CF6;color:#FFFFFF;border:none;border-radius:999px;font-size:0.72rem;font-weight:800;padding:4px 12px;cursor:pointer;" onclick="A.openPromoPopup(true, 'deal')">
            ← Xem Banner Deal
          </button>
        </div>`
            : ''
        }

        <div class="promo-popup-hero">
          <div class="promo-hero-particles"></div>
          <div class="promo-hero-badge">✨ ĐẶC QUYỀN KHÁCH HÀNG MỚI</div>
          <h2 class="promo-popup-title">🎉 ĐẠI TIỆC VOUCHER LAPTOP99</h2>
          <p class="promo-popup-subtitle">Gói ưu đãi công nghệ độc quyền — Giảm đến 2.000.000đ khi đặt mua online</p>
        </div>

        <div class="promo-countdown-strip">
          <div class="promo-countdown-label">
            <span class="promo-flame">🔥</span>
            <span>Ưu đãi tự động kết thúc sau:</span>
          </div>
          <div class="promo-countdown-digits" id="promo-cd-timer">
            <span class="promo-cd-box" id="pcd-h">04</span><span class="promo-cd-colon">:</span>
            <span class="promo-cd-box" id="pcd-m">38</span><span class="promo-cd-colon">:</span>
            <span class="promo-cd-box" id="pcd-s">45</span>
          </div>
        </div>

        <div class="promo-claimed-bar">
          <div class="promo-claimed-info">
            <span>Đã có <b>89%</b> mã ưu đãi được nhận hôm nay</span>
            <span class="promo-urgency-pill">Sắp hết</span>
          </div>
          <div class="promo-bar-track">
            <div class="promo-bar-fill" style="width:89%"></div>
          </div>
        </div>

        <div class="promo-popup-body">
          <div class="promo-voucher-list">
            ${voucherCards}
          </div>

          <div class="promo-perks-row">
            <div class="promo-perk-item">
              <span class="promo-perk-icon">🎁</span>
              <div class="promo-perk-text">
                <b>Quà Tặng 550K</b>
                <span>Balo + Chuột Gaming</span>
              </div>
            </div>
            <div class="promo-perk-item">
              <span class="promo-perk-icon">🚚</span>
              <div class="promo-perk-text">
                <b>Freeship 100%</b>
                <span>Đồng kiểm khi nhận</span>
              </div>
            </div>
            <div class="promo-perk-item">
              <span class="promo-perk-icon">🛡️</span>
              <div class="promo-perk-text">
                <b>Đổi Mới 15 Ngày</b>
                <span>Bảo hành chuẩn S/N</span>
              </div>
            </div>
          </div>
        </div>

        <div class="promo-popup-footer">
          <button type="button" class="promo-main-cta" onclick="A.claimAllPromosAndShop()">
            <span>SĂN DEAL &amp; ÁP MÃ MUA SẮM NGAY</span>
            <span class="promo-cta-arrow">→</span>
          </button>
          <div class="promo-popup-footnote">
            *Mã đã lưu sẽ tự động kích hoạt giảm trừ trực tiếp tại bước Giỏ hàng &amp; Thanh toán
          </div>
        </div>
      </div>`;

    modal(premiumHtml);

    // Bắt đầu ticker đếm ngược thời gian thực trên popup
    if (window.promoCountdownTimer) clearInterval(window.promoCountdownTimer);
    window.promoCountdownTimer = setInterval(() => {
      const hEl = document.getElementById('pcd-h');
      const mEl = document.getElementById('pcd-m');
      const sEl = document.getElementById('pcd-s');
      if (!hEl || !mEl || !sEl) {
        clearInterval(window.promoCountdownTimer);
        window.promoCountdownTimer = null;
        return;
      }
      const diff = Math.max(0, Math.floor((flashEndTime - Date.now()) / 1000));
      hEl.textContent = String(Math.floor(diff / 3600)).padStart(2, '0');
      mEl.textContent = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      sEl.textContent = String(diff % 60).padStart(2, '0');
    }, 1000);
  },

  /* ========================================================================
     SHOWROOM 3D CONTROLS & INTERACTION
     ======================================================================== */
  initHero3D(canvasId = 'hero-3d-canvas', options = {}) {
    if (typeof Hero3DService !== 'undefined' && Hero3DService.init) {
      Hero3DService.init(canvasId, options);
    }
  },

  setHero3DColor(colorName) {
    if (typeof Hero3DService !== 'undefined' && Hero3DService.setColor) {
      Hero3DService.setColor(colorName);
      document.querySelectorAll('.sh-color-btn').forEach((btn) => {
        if (btn.dataset.color === colorName) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    }
  },

  setHero3DView(viewMode) {
    if (typeof Hero3DService !== 'undefined' && Hero3DService.setView) {
      Hero3DService.setView(viewMode);
      document.querySelectorAll('.sh-view-btn').forEach((btn) => {
        if (btn.dataset.view === viewMode) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    }
  },

  setHero3DScreenImage(urlOrFile) {
    if (urlOrFile instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof Hero3DService !== 'undefined' && Hero3DService.setScreenImage) {
          Hero3DService.setScreenImage(e.target.result);
          toast('Đã dán ảnh lên màn hình Laptop 3D!');
        }
      };
      reader.readAsDataURL(urlOrFile);
    } else if (typeof Hero3DService !== 'undefined' && Hero3DService.setScreenImage) {
      Hero3DService.setScreenImage(urlOrFile);
    }
  },

  /* ========================================================================
     RULE-BASED LAPTOP FINDER ("Gợi ý chọn laptop")
     ======================================================================== */
  finderState: {
    demand: 'all',
    budget: 'all',
    brand: 'all',
  },

  setFinderOpt(type, val) {
    this.finderState = this.finderState || { demand: 'all', budget: 'all', brand: 'all' };
    this.finderState[type] = val;

    // Update active class on buttons
    document.querySelectorAll(`.sh-opt-btn[data-type="${type}"]`).forEach((b) => {
      b.classList.toggle('active', b.dataset.val === val);
    });

    this.renderFinderResults();
  },

  renderFinderResults() {
    const box = document.getElementById('sh-finder-results-grid');
    if (!box) return;

    const all = cache.products || [];
    const { demand, budget, brand } = this.finderState || { demand: 'all', budget: 'all', brand: 'all' };

    // Score and filter real DB products
    const scored = all.map((p) => {
      let score = 70;
      const reasons = [];

      // Budget check
      if (budget === 'under15') {
        if (p.price < 15000000) { score += 20; reasons.push('Dưới 15 Triệu'); }
        else { score -= 30; }
      } else if (budget === '15to25') {
        if (p.price >= 15000000 && p.price <= 25000000) { score += 20; reasons.push('15 - 25 Triệu'); }
        else { score -= 20; }
      } else if (budget === '25to35') {
        if (p.price > 25000000 && p.price <= 35000000) { score += 20; reasons.push('25 - 35 Triệu'); }
        else { score -= 20; }
      } else if (budget === 'over35') {
        if (p.price > 35000000) { score += 20; reasons.push('Phân khúc cao cấp'); }
        else { score -= 20; }
      }

      // Brand check
      if (brand && brand !== 'all') {
        if (p.brand && p.brand.toLowerCase() === brand.toLowerCase()) {
          score += 15;
          reasons.push('Đúng thương hiệu ' + p.brand);
        } else {
          score -= 40;
        }
      }

      // Demand check
      if (demand === 'office') {
        if (p.cat === '1' || p.cat === '6' || p.brand === 'HP' || p.brand === 'Dell') {
          score += 20;
          reasons.push('Văn phòng, mỏng nhẹ, pin tốt');
        }
      } else if (demand === 'gaming') {
        if (p.cat === '2' || (p.gpu && p.gpu.includes('RTX'))) {
          score += 20;
          reasons.push('Đồ họa RTX gaming');
        } else {
          score -= 30;
        }
      } else if (demand === 'student') {
        if (p.cat === '5' || p.price <= 20000000) {
          score += 20;
          reasons.push('Giá tốt cho sinh viên');
        }
      } else if (demand === 'creator') {
        if (p.cat === '4' || p.brand === 'Apple' || (p.ram && parseInt(p.ram) >= 16)) {
          score += 20;
          reasons.push('Màn hình đẹp, RAM lớn');
        }
      } else if (demand === 'slim') {
        if (p.cat === '3' || p.brand === 'Apple') {
          score += 20;
          reasons.push('Mỏng nhẹ cao cấp');
        }
      }

      const finalScore = Math.min(99, Math.max(65, score));
      return { product: p, score: finalScore, reasons };
    });

    scored.sort((a, b) => b.score - a.score || b.product.soldCount - a.product.soldCount);
    const top4 = scored.slice(0, 4);

    if (top4.length === 0) {
      box.innerHTML = `<div class="card center" style="padding:24px;grid-column:1/-1">Chưa tìm thấy máy phù hợp tiêu chí này. Hãy thử nới lỏng mức ngân sách hoặc chọn Tất cả thương hiệu.</div>`;
      return;
    }

    box.innerHTML = top4
      .map(({ product: p, score, reasons }) => {
        return `<div class="sh-match-card-wrap" style="position:relative">
          <div style="position:absolute;top:10px;left:10px;z-index:3">
            <span class="sh-match-badge">🎯 ${score}% Phù hợp</span>
          </div>
          ${pcard(p)}
          ${reasons.length ? `<div style="font-size:0.72rem;color:var(--text-sub);padding:4px 8px;background:var(--bg-sub);border-radius:6px;margin-top:6px;text-align:center">💡 ${esc(reasons.join(' · '))}</div>` : ''}
        </div>`;
      })
      .join('');
  },

  /* ========================================================================
     VOUCHER 1-CLICK COPY
     ======================================================================== */
  copyVoucher(code) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        toast(`Đã lưu mã giảm giá: ${code}! Mã sẽ áp dụng tại bước Giỏ hàng.`);
      }).catch(() => {
        toast(`Mã giảm giá: ${code}`);
      });
    } else {
      toast(`Mã giảm giá: ${code}`);
    }
  },
};

