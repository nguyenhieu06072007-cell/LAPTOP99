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

  openPromoPopup(force = false) {
    let promos = cache.promos || [];
    if (!promos.length) {
      promos = [
        { code: 'SUMMER2026', type: 'pct', value: 10, cap: 2000000, min: 20000000, exp: '2026-12-30', desc: 'Khuyến mãi Hè 2026 — Giảm 10% tối đa 2.000.000đ' },
        { code: 'GAMING500K', type: 'fixed', value: 500000, cap: 500000, min: 30000000, exp: '2026-12-30', desc: 'Giảm trực tiếp 500.000đ cho Laptop Gaming' },
        { code: 'LAPTOP99', type: 'pct', value: 5, cap: 1000000, min: 10000000, exp: '2026-12-30', desc: 'Giảm 5% cho đơn từ 10 triệu đồng' }
      ];
    }
    sessionStorage.setItem('laptop99_promo_popup_seen', '1');

    const voucherCards = promos
      .map((p, i) => {
        const isPct = p.type === 'pct' || p.type === 'percent';
        const rawVal = p.value != null ? p.value : (p.val != null ? p.val : (p.discount_value != null ? p.discount_value : 0));
        const valTxt = isPct ? `-${rawVal}%` : `-${fmt(rawVal)}`;
        const title = p.desc || p.title || `Voucher giảm ${valTxt}`;
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
};

