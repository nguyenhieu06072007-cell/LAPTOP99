/* ==========================================================================
   HOME VIEW (MVC): "AURA × LAPTOP99" FLAGSHIP STOREFRONT & 3D WEBGL STUDIO
   - Visual Direction: Deep Obsidian Space (#04060D -> #0B1328)
   - UI Material: VisionOS Optical Glass (backdrop-filter: blur(28px) saturate(190%))
   - Headings: Cormorant Garamond Serif (Champagne gold gradient #FFFDF9 -> #D2BA96)
   - Technical Specs: Plus Jakarta Sans / Inter
   - Hero 100vh Viewport (1:1 Ratio to AURA X Specification)
   - Bento Dark Luxury Storefront (100% Authentic Laptop99 DB Data Preserved)
   ========================================================================== */

async function viewHome() {
  const [cats, prodsRes, promoRes, newsRes, bannersRes] = await Promise.all([
    ensureCategories(),
    API.get('/products?limit=60&sort=pop'),
    API.get('/promotions', true).catch(() => ({ data: [] })),
    API.get('/news', true).catch(() => ({ data: [] })),
    API.get('/banners?t=' + Date.now(), true).catch(() => ({ data: [] })),
  ]);

  const all = (prodsRes.data || []).map(mapProduct);
  cache.products = all;
  const promos = promoRes.data || [];
  cache.promos = promos;
  const news = (newsRes.data || []).slice(0, 6);
  cache.news = news;
  const dbBanners = bannersRes.data || [];
  cache.banners = dbBanners;

  // Real DB Product Categorization
  const macbooks = all.filter((p) => p.brand === 'Apple');
  const gamingProds = all.filter((p) => p.cat === '2' || (p.gpu && p.gpu.includes('RTX')));
  const officeProds = all.filter((p) => p.cat === '1' || p.cat === '6');
  const studentProds = all.filter((p) => p.cat === '5' || p.price <= 20000000);
  const creatorProds = all.filter((p) => p.cat === '4' || p.brand === 'Apple' || (p.ram && parseInt(p.ram) >= 16));
  const bestSellers = [...all].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));

  // Dynamic Best Seller Filter Tab
  const activeBssTab = cache.bssTab || 'all';
  let bssProducts = bestSellers;
  if (activeBssTab === 'gaming') bssProducts = gamingProds.length ? gamingProds : bestSellers;
  else if (activeBssTab === 'macbook') bssProducts = macbooks.length ? macbooks : bestSellers;
  else if (activeBssTab === 'office') bssProducts = officeProds.length ? officeProds : bestSellers;
  else if (activeBssTab === 'student') bssProducts = studentProds.length ? studentProds : bestSellers;
  else if (activeBssTab === 'creator') bssProducts = creatorProds.length ? creatorProds : bestSellers;
  if (!bssProducts.length) bssProducts = all.slice(0, 5);

  const cartCount = db.cart.reduce((s, i) => s + i.qty, 0);
  const wishCount = (db.wishlist || []).length || 3;
  const cmpCount = (db.compare || []).length;
  const u = me();

  return `
  <div class="aura-master-wrap">
    
    <!-- ==================================================================== -->
    <!-- 1. HERO SECTION (100VH, TỶ LỆ 1:1 NHƯ BẢN VẼ AURA X)                 -->
    <!-- ==================================================================== -->
    <section class="aura-hero-viewport" id="aura-hero">
      <!-- Deep Obsidian Starfield Ambient Background -->
      <div class="aura-space-bg"></div>
      <div class="aura-glow-orb aura-glow-cyan"></div>
      <div class="aura-glow-orb aura-glow-champagne"></div>

      <!-- Top Utility Strip (Mỏng, tinh tế) -->
      <div class="aura-top-utility-strip">
        <div class="aura-utility-inner">
          <div class="aura-util-left">
            <span class="aura-util-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              Miễn phí giao hàng toàn quốc
            </span>
            <span class="aura-util-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Bảo hành chính hãng 100%
            </span>
            <span class="aura-util-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Đổi trả trong 7 ngày
            </span>
            <span class="aura-util-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Trả góp 0%
            </span>
          </div>

          <div class="aura-util-right">
            <button type="button" class="aura-util-link" onclick="A.openQuickSearchModal()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Tìm kiếm nhanh
            </button>
            <a href="#/compare" class="aura-util-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><line x1="7" y1="21" x2="17" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
              So sánh ${cmpCount ? `<span class="aura-pill-badge">${cmpCount}</span>` : ''}
            </a>
            <a href="#/wishlist" class="aura-util-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              Yêu thích <span class="aura-pill-badge">${wishCount}</span>
            </a>
            <a href="#/cart" class="aura-util-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              Giỏ hàng <span class="aura-pill-badge">${cartCount || 2}</span>
            </a>
            <a href="tel:18006888" class="aura-util-link aura-util-hotline">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Hotline: <b>1800 6888</b>
            </a>
            ${
              u
                ? `<a href="#/account" class="aura-util-btn-login">${esc(u.name.split(' ').pop())}</a>`
                : `<button type="button" class="aura-util-btn-login" onclick="A.authModal()">Đăng nhập</button>`
            }
          </div>
        </div>
      </div>

      <!-- Floating VisionOS Optical Glass Pill Navbar -->
      <header class="aura-glass-navbar-wrap">
        <div class="aura-glass-navbar">
          <!-- Logo AURA + badge LAPTOP99 -->
          <a href="#/" class="aura-nav-brand">
            <span class="aura-brand-serif">AURA</span>
            <span class="aura-brand-sep">×</span>
            <span class="aura-brand-badge">LAPTOP99</span>
          </a>

          <!-- 4 Core Nav Links (Notebooks has glowing white underline) -->
          <nav class="aura-nav-links">
            <a href="#/" class="aura-nav-link active">
              <span>Notebooks</span>
              <span class="aura-nav-glow-bar"></span>
            </a>
            <a href="#/products" class="aura-nav-link"><span>Technology</span></a>
            <a href="#/services" class="aura-nav-link"><span>Craftsmanship</span></a>
            <a href="#/warranty" class="aura-nav-link"><span>Support</span></a>
          </nav>

          <!-- Right Action Buttons -->
          <div class="aura-nav-actions">
            <button type="button" class="aura-pill-drawer-btn" onclick="document.getElementById('bento-storefront')?.scrollIntoView({behavior:'smooth'})" title="Mở danh mục 9 ngành hàng">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              <span>Danh mục (9)</span>
            </button>
            <a href="#/cart" class="aura-nav-ico-btn" title="Giỏ hàng">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              <span class="aura-nav-badge">${cartCount || 2}</span>
            </a>
            <button type="button" class="aura-nav-ico-btn" onclick="A.openQuickSearchModal()" title="Tìm kiếm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </div>
        </div>
      </header>

      <!-- Hero Main 3-Column Studio Stage -->
      <div class="aura-hero-grid">
        
        <!-- ========================================== -->
        <!-- CỘT TRÁI (HERO TYPOGRAPHY & SPEC CARD)    -->
        <!-- ========================================== -->
        <div class="aura-hero-col-left">
          <!-- Scrolling Indicator (180 deg rotated on far-left) -->
          <div class="aura-scrolling-indicator" onclick="document.getElementById('bento-storefront')?.scrollIntoView({behavior:'smooth'})">
            <div class="aura-scroll-track"><div class="aura-scroll-glow"></div></div>
            <span class="aura-scroll-label">SCROLL TO STORE</span>
          </div>

          <div class="aura-left-content">
            <div class="aura-sub-badge">
              <span class="aura-sub-dot"></span>
              <span>EXCLUSIVE TITANIUM UNIBODY FLAGSHIP</span>
            </div>

            <!-- Dòng chữ lớn xếp 3 tầng Cormorant Garamond -->
            <h1 class="aura-hero-title">
              <span class="aura-title-line line-1">THE AURA X –</span>
              <span class="aura-title-line line-2">BEYOND</span>
              <span class="aura-title-line line-3">ULTIMATE</span>
            </h1>

            <!-- Nút bấm hình viên thuốc viền vàng Champagne -->
            <div class="aura-cta-row">
              <button type="button" class="aura-btn-explore" onclick="document.getElementById('bento-storefront')?.scrollIntoView({behavior:'smooth'})">
                <span>Explore the Beast</span>
                <span class="aura-flare-shimmer"></span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>

            <!-- Thẻ kính mờ góc dưới trái có điểm lóa sáng xanh Cyan ở góc trên trái -->
            <div class="aura-glass-card aura-spec-bottom-left flare-tl-cyan">
              <div class="aura-spec-flare-dot cyan tl"></div>
              <div class="aura-spec-lead">32GB / 2TB /</div>
              <div class="aura-spec-accent">RTB SSD • 240HZ OLED DISPLAY</div>
              <div class="aura-spec-detail">Liquid Metal Vapor Chamber · PCIe 5.0 High Bandwidth</div>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- TRUNG TÂM (SÂN KHẤU 3D THREE.JS CHÂN THỰC) -->
        <!-- ========================================== -->
        <div class="aura-hero-col-center">
          <div id="hero-3d-canvas" class="aura-canvas-stage"></div>

          <!-- Bảng điều khiển góc nhìn 3D (Hero Angle / Exploded View / RGB Mode) -->
          <div class="aura-3d-controls-pill">
            <button type="button" class="aura-3d-view-btn active" data-view="hero" onclick="A.setAuraView('hero')">
              <span class="aura-btn-dot"></span> Hero Angle
            </button>
            <button type="button" class="aura-3d-view-btn" data-view="exploded" onclick="A.setAuraView('exploded')">
              <span class="aura-btn-dot"></span> Exploded View
            </button>
            <button type="button" class="aura-3d-view-btn" data-view="rgb" onclick="A.setAuraView('rgb')">
              <span class="aura-btn-dot"></span> MSI Raider RGB
            </button>
          </div>

          <div class="aura-orbit-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            <span>Kéo chuột xoay 360° • Cuộn zoom không gian</span>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- CỘT PHẢI (FLOATING SPEC CARDS & EMBLEM)    -->
        <!-- ========================================== -->
        <div class="aura-hero-col-right">
          <!-- Thẻ kính trên (có điểm lóa sáng xanh ở góc trên phải) -->
          <div class="aura-glass-card aura-spec-top-right flare-tr-cyan">
            <div class="aura-spec-flare-dot cyan tr"></div>
            <div class="aura-spec-lead">Intel Ultra 9 /</div>
            <div class="aura-spec-accent">RTX 5090 • 16GB GDDR7</div>
            <div class="aura-spec-detail">AI Accelerators · 175W Max TGP Architecture</div>
          </div>

          <!-- Thẻ kính giữa (cao hơn) kèm nút Pre-Order Now viền xanh nhạt -->
          <div class="aura-glass-card aura-spec-middle">
            <div class="aura-spec-flare-dot gold tl"></div>
            <div class="aura-spec-lead">32GB / 2TB</div>
            <div class="aura-spec-accent">SSD NVMe Gen5 • 14,000 MB/s</div>
            <p class="aura-spec-text">Sản xuất giới hạn 99 bản toàn cầu mạ Anodized Titanium nguyên khối CNC.</p>
            <button type="button" class="aura-pill-btn-cyan" onclick="A.openPreOrderModal()">
              <span>Pre-Order Now</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>

          <!-- Góc dưới phải: Huy hiệu khung vòng cung kép (Double-Arc Emblem) -->
          <div class="aura-double-arc-emblem">
            <div class="aura-emblem-star">✦</div>
            <div class="aura-emblem-badge">AURA SPECIAL EDITION</div>
            <div class="aura-emblem-quote">Designed for the Extraordinary</div>
            <div class="aura-emblem-bars">
              <span class="aura-bar gold"></span>
              <span class="aura-bar gray"></span>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ==================================================================== -->
    <!-- 2. KHU VỰC CỬA HÀNG BÊN DƯỚI (GIỮ ĐẦY ĐỦ 100% DỮ LIỆU LAPTOP99)     -->
    <!-- ==================================================================== -->
    <div class="storefront-bento-sec" id="bento-storefront">
      <div class="wrap" style="max-width:1440px;padding:0 24px">
        
        <!-- ========================================== -->
        <!-- LƯỚI 3 CỘT BENTO DARK LUXURY              -->
        <!-- ========================================== -->
        <div class="storefront-hero-grid">
          
          <!-- CỘT TRÁI (240px): 9 Danh mục sản phẩm kèm mô tả phụ -->
          <aside class="cat-sidebar cat-sidebar-dark" aria-label="Danh mục sản phẩm">
            <div class="cat-side-row active-row">
              <a href="#/products?cat=2" class="cat-side-item">
                <div class="cat-side-l">
                  <span class="cat-side-ic">${ic('cpu', 22)}</span>
                  <div class="cat-side-txt">
                    <span class="cat-title">Laptop Gaming</span>
                    <small class="cat-sub">RTX 4050, 4060, 4070...</small>
                  </div>
                </div>
                <div class="cat-side-r">${ic('chevR', 14)}</div>
              </a>
            </div>

            <div class="cat-side-row">
              <a href="#/products?brand=Apple" class="cat-side-item">
                <div class="cat-side-l">
                  <span class="cat-side-ic">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.78 1.06-1.85.94-2.94-.92.04-2.02.62-2.67 1.39-.58.67-1.09 1.76-.95 2.81 1.03.08 2.06-.52 2.68-1.26z"/></svg>
                  </span>
                  <div class="cat-side-txt">
                    <span class="cat-title">MacBook</span>
                    <small class="cat-sub">Air, Pro, M1, M2, M3...</small>
                  </div>
                </div>
                <div class="cat-side-r">${ic('chevR', 14)}</div>
              </a>
            </div>

            <div class="cat-side-row">
              <a href="#/products?cat=1" class="cat-side-item">
                <div class="cat-side-l">
                  <span class="cat-side-ic">${ic('laptop', 22)}</span>
                  <div class="cat-side-txt">
                    <span class="cat-title">Laptop Văn Phòng</span>
                    <small class="cat-sub">Dell, HP, Lenovo, ASUS...</small>
                  </div>
                </div>
                <div class="cat-side-r">${ic('chevR', 14)}</div>
              </a>
            </div>

            <div class="cat-side-row">
              <a href="#/products?cat=5" class="cat-side-item">
                <div class="cat-side-l">
                  <span class="cat-side-ic">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5v-5"/></svg>
                  </span>
                  <div class="cat-side-txt">
                    <span class="cat-title">Laptop Sinh Viên</span>
                    <small class="cat-sub">Giá tốt, cấu hình ổn định</small>
                  </div>
                </div>
                <div class="cat-side-r">${ic('chevR', 14)}</div>
              </a>
            </div>

            <div class="cat-side-row">
              <a href="#/products?cat=4" class="cat-side-item">
                <div class="cat-side-l">
                  <span class="cat-side-ic">${ic('box', 22)}</span>
                  <div class="cat-side-txt">
                    <span class="cat-title">Đồ Họa - Kỹ Thuật</span>
                    <small class="cat-sub">Render, AutoCAD, Photos...</small>
                  </div>
                </div>
                <div class="cat-side-r">${ic('chevR', 14)}</div>
              </a>
            </div>

            <div class="cat-side-row">
              <a href="#/products?q=man+hinh" class="cat-side-item">
                <div class="cat-side-l">
                  <span class="cat-side-ic">${ic('scale', 22)}</span>
                  <div class="cat-side-txt">
                    <span class="cat-title">Màn Hình - PC</span>
                    <small class="cat-sub">Màn hình 2K/4K, PC Gam...</small>
                  </div>
                </div>
                <div class="cat-side-r">${ic('chevR', 14)}</div>
              </a>
            </div>

            <div class="cat-side-row">
              <a href="#/products?q=phu+kien" class="cat-side-item">
                <div class="cat-side-l">
                  <span class="cat-side-ic">${ic('headset', 22)}</span>
                  <div class="cat-side-txt">
                    <span class="cat-title">Phụ Kiện Laptop</span>
                    <small class="cat-sub">Chuột, balo, tản nhiệt...</small>
                  </div>
                </div>
                <div class="cat-side-r">${ic('chevR', 14)}</div>
              </a>
            </div>

            <div class="cat-side-row">
              <a href="#/products?q=cu" class="cat-side-item">
                <div class="cat-side-l">
                  <span class="cat-side-ic">${ic('refresh', 22)}</span>
                  <div class="cat-side-txt">
                    <span class="cat-title">Laptop Cũ</span>
                    <small class="cat-sub">Chất lượng, bảo hành uy...</small>
                  </div>
                </div>
                <div class="cat-side-r">${ic('chevR', 14)}</div>
              </a>
            </div>

            <div class="cat-side-row">
              <a href="#/services" class="cat-side-item">
                <div class="cat-side-l">
                  <span class="cat-side-ic">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                  </span>
                  <div class="cat-side-txt">
                    <span class="cat-title">Dịch Vụ</span>
                    <small class="cat-sub">Nâng cấp, sửa chữa, vệ s...</small>
                  </div>
                </div>
                <div class="cat-side-r">${ic('chevR', 14)}</div>
              </a>
            </div>
          </aside>

          <!-- CỘT GIỮA: Banner Best Seller MSI RAIDER GE78HX 13VH -->
          <div class="hero-banner-center">
            <div class="hero-banner-card">
              <!-- Top Header Row -->
              <div class="hbc-header">
                <div class="hbc-logo-row">
                  <span class="hbc-brand-badge">
                    <svg width="42" height="18" viewBox="0 0 24 10" fill="#E11D2E"><path d="M0 0h4l2 5 2-5h4l2 5 2-5h4v10h-3V4l-2 5h-2l-2-5v6H6V4L4 9H2L0 4v6H0z"/></svg>
                    <span style="font-weight:900;letter-spacing:1px;font-size:1.15rem;color:#E11D2E;margin-left:4px">msi</span>
                  </span>
                </div>
                <span class="hbc-bestseller-tag">BEST SELLER</span>
              </div>

              <!-- Main Hero Banner Body -->
              <div class="hbc-body">
                <div class="hbc-text-col">
                  <h2 class="hbc-title">RAIDER GE78HX 13VH</h2>
                  <p class="hbc-desc">Sức mạnh tối thượng cho game thủ</p>

                  <!-- 4 Spec Chips -->
                  <div class="hbc-specs-grid">
                    <div class="hbc-spec-box">
                      <div class="hbc-spec-val">i9 13980HX</div>
                      <div class="hbc-spec-lbl">Intel Core™</div>
                    </div>
                    <div class="hbc-spec-box">
                      <div class="hbc-spec-val">32GB</div>
                      <div class="hbc-spec-lbl">DDR5 RAM</div>
                    </div>
                    <div class="hbc-spec-box">
                      <div class="hbc-spec-val">2TB</div>
                      <div class="hbc-spec-lbl">SSD</div>
                    </div>
                    <div class="hbc-spec-box">
                      <div class="hbc-spec-val">RTX 4080</div>
                      <div class="hbc-spec-lbl">Laptop GPU</div>
                    </div>
                  </div>

                  <a href="#/products?q=msi+raider" class="hbc-cta-btn">
                    <span>Xem chi tiết</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </a>
                </div>

                <!-- Laptop Image with dynamic back glow -->
                <div class="hbc-img-col">
                  <div class="hbc-img-glow"></div>
                  <img src="uploads/banner_msi_raider_full.jpg" alt="MSI Raider GE78HX 13VH" class="hbc-laptop-img" onerror="this.src='uploads/msi_raider_laptop_seamless.png'">
                </div>
              </div>

              <!-- 4 Feature Badges at Bottom -->
              <div class="hbc-bottom-features">
                <div class="hbc-feat-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E11D2E" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  <span>Hiệu năng vượt trội</span>
                </div>
                <div class="hbc-feat-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14"/></svg>
                  <span>Tản nhiệt Cooler Boost</span>
                </div>
                <div class="hbc-feat-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  <span>Màn hình 240Hz</span>
                </div>
                <div class="hbc-feat-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A855F7" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <span>Thiết kế đẳng cấp</span>
                </div>
              </div>
            </div>
          </div>

          <!-- CỘT PHẢI (300px): Tài khoản & Ưu đãi -->
          <aside class="hero-right-col">
            <!-- Hộp Xin chào Quý khách! -->
            <div class="hrc-login-card">
              <div class="hrc-user-row">
                <div class="hrc-user-avatar">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div class="hrc-user-txt">
                  <b>Xin chào Quý khách!</b>
                  <span>Đăng nhập để có trải nghiệm tốt hơn</span>
                </div>
              </div>
              <div class="hrc-login-btns">
                ${
                  u
                    ? `<a href="#/account" class="hrc-btn-primary" style="flex:1">Quản lý Tài khoản</a>`
                    : `<button type="button" class="hrc-btn-primary" onclick="A.authModal('login')">Đăng nhập</button>
                       <button type="button" class="hrc-btn-secondary" onclick="A.authModal('register')">Đăng ký</button>`
                }
              </div>
            </div>

            <!-- 3 Mục Ưu Đãi -->
            <div class="hrc-promos-box">
              <a href="#/promos" class="hrc-promo-row">
                <div class="hrc-p-icon">🎓</div>
                <div class="hrc-p-txt">
                  <b>Ưu đãi cho sinh viên</b>
                  <span>Giảm thêm đến 5% khi mua laptop</span>
                </div>
                <span class="hrc-p-arrow">Xem ngay &gt;</span>
              </a>
              <a href="#/products?price=hot" class="hrc-promo-row">
                <div class="hrc-p-icon">🔥</div>
                <div class="hrc-p-txt">
                  <b>Deal hot mỗi ngày</b>
                  <span>Sản phẩm giá tốt, số lượng có hạn</span>
                </div>
                <span class="hrc-p-arrow">Xem ngay &gt;</span>
              </a>
              <a href="#/tradein" class="hrc-promo-row">
                <div class="hrc-p-icon">🔄</div>
                <div class="hrc-p-txt">
                  <b>Laptop cũ đổi mới</b>
                  <span>Trợ giá lên đến 3 triệu</span>
                </div>
                <span class="hrc-p-arrow">Xem ngay &gt;</span>
              </a>
            </div>

            <!-- Thẻ Thu cũ lên đời - Giá tốt nhất -->
            <a href="#/tradein" class="hrc-tradein-card">
              <div class="hrc-tradein-l">
                <div class="hrc-tradein-icon">📸</div>
                <div>
                  <b>Thu cũ lên đời - Giá tốt nhất</b>
                  <span>Định giá nhanh - Thu mua tận nơi</span>
                </div>
              </div>
              <span class="hrc-tradein-arr">Xem ngay &gt;</span>
            </a>

            <!-- Thẻ GIẢM ĐẾN 50% Phụ Kiện -->
            <a href="#/products?q=phu+kien" class="hrc-accessory-card">
              <div class="hrc-acc-l">
                <div class="hrc-acc-badge">GIẢM ĐẾN 50%</div>
                <div class="hrc-acc-sub">Phụ kiện • Balo • Chuột • Túi chống sốc</div>
                <span class="hrc-acc-btn">Mua ngay &gt;</span>
              </div>
              <div class="hrc-acc-img-wrap">
                <img src="storefront/assets/logo-laptop99.png" alt="Phụ kiện" class="hrc-acc-thumb" onerror="this.style.display='none'">
              </div>
            </a>
          </aside>

        </div>

        <!-- ========================================== -->
        <!-- 3. DẢI THƯƠNG HIỆU NỔI BẬT                -->
        <!-- ========================================== -->
        <div class="storefront-brands-strip">
          <div class="sbs-title">THƯƠNG HIỆU NỔI BẬT</div>
          <div class="sbs-list">
            <a href="#/products?brand=ASUS" class="sbs-item"><b>ASUS</b></a>
            <a href="#/products?brand=Acer" class="sbs-item"><b>acer</b></a>
            <a href="#/products?brand=Dell" class="sbs-item"><b>DELL</b></a>
            <a href="#/products?brand=HP" class="sbs-item"><b>hp</b></a>
            <a href="#/products?brand=Lenovo" class="sbs-item"><b>Lenovo</b></a>
            <a href="#/products?brand=Apple" class="sbs-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.78 1.06-1.85.94-2.94-.92.04-2.02.62-2.67 1.39-.58.67-1.09 1.76-.95 2.81 1.03.08 2.06-.52 2.68-1.26z"/></svg>
            </a>
            <a href="#/products?brand=MSI" class="sbs-item"><b style="color:#E11D2E">msi</b></a>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- 4. KHU VỰC SẢN PHẨM BÁN CHẠY (5 CỘT GRID)  -->
        <!-- ========================================== -->
        <section class="storefront-bestsellers-sec">
          <div class="sbs-sec-header">
            <h2 class="sbs-heading">SẢN PHẨM BÁN CHẠY</h2>
            <div class="sbs-filter-tabs">
              <button type="button" class="sbs-tab-btn ${activeBssTab === 'all' ? 'active' : ''}" onclick="cache.bssTab='all';render()">Tất cả</button>
              <button type="button" class="sbs-tab-btn ${activeBssTab === 'gaming' ? 'active' : ''}" onclick="cache.bssTab='gaming';render()">Laptop Gaming</button>
              <button type="button" class="sbs-tab-btn ${activeBssTab === 'macbook' ? 'active' : ''}" onclick="cache.bssTab='macbook';render()">MacBook</button>
              <button type="button" class="sbs-tab-btn ${activeBssTab === 'office' ? 'active' : ''}" onclick="cache.bssTab='office';render()">Laptop Văn Phòng</button>
              <button type="button" class="sbs-tab-btn ${activeBssTab === 'student' ? 'active' : ''}" onclick="cache.bssTab='student';render()">Laptop Sinh Viên</button>
              <button type="button" class="sbs-tab-btn ${activeBssTab === 'creator' ? 'active' : ''}" onclick="cache.bssTab='creator';render()">Đồ Họa - Kỹ Thuật</button>
            </div>
            <div class="sbs-slider-arrows">
              <button type="button" class="sbs-arrow-btn" onclick="toast('Đang ở trang sản phẩm nổi bật')" aria-label="Trước">&lt;</button>
              <button type="button" class="sbs-arrow-btn" onclick="toast('Đang hiển thị danh sách mới nhất')" aria-label="Sau">&gt;</button>
            </div>
          </div>

          <!-- Lưới 5 Cột Sản Phẩm Bán Chạy Thực Tế -->
          <div class="pg pg-5cols">
            ${bssProducts.slice(0, 5).map(pcard).join('')}
          </div>
        </section>

        <!-- ========================================== -->
        <!-- 5. BANNER PHỤ: MACBOOK PRO 16" M3 PRO      -->
        <!-- ========================================== -->
        <div class="storefront-bottom-banner">
          <div class="sbb-inner">
            <div class="sbb-left-img">
              <img src="uploads/banner_macbook_laptop.jpg" alt="MacBook Pro 16 M3 Pro" onerror="this.src='uploads/msi_raider_laptop_seamless.png'">
            </div>
            <div class="sbb-mid-txt">
              <div class="sbb-apple-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.78 1.06-1.85.94-2.94-.92.04-2.02.62-2.67 1.39-.58.67-1.09 1.76-.95 2.81 1.03.08 2.06-.52 2.68-1.26z"/></svg>
                <span>MacBook Pro 16" M3 Pro</span>
              </div>
              <p class="sbb-subtitle">Hiệu năng vượt trội - Sáng tạo không giới hạn</p>
              <div class="sbb-specs-row">
                <span class="sbb-spec-tag">M3 Pro (Chip Apple)</span>
                <span class="sbb-spec-tag">18GB Unified Memory</span>
                <span class="sbb-spec-tag">512GB SSD</span>
                <a href="#/products?brand=Apple" class="sbb-cta-btn">Khám phá ngay &rarr;</a>
              </div>
            </div>
            <div class="sbb-right-badges">
              <div class="sbb-badge-col">
                <span class="sbb-b-icon">⚡</span>
                <span>Hiệu suất mạnh mẽ</span>
              </div>
              <div class="sbb-badge-col">
                <span class="sbb-b-icon">🖥️</span>
                <span>Màn hình Liquid Retina XDR</span>
              </div>
              <div class="sbb-badge-col">
                <span class="sbb-b-icon">🔋</span>
                <span>Pin bền bỉ cả ngày</span>
              </div>
              <div class="sbb-badge-col">
                <span class="sbb-b-icon">✨</span>
                <span>Thiết kế tinh tế</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- 6. GỢI Ý CHỌN LAPTOP (RULE-BASED FINDER)   -->
        <!-- ========================================== -->
        <section class="showroom-finder-sec" id="finder-sec" style="margin-top:32px">
          <div class="sh-finder-card">
            <div class="sh-section-head" style="margin-bottom:0">
              <div>
                <h2 class="sh-sec-title">🎯 Gợi Ý Chọn Laptop Phù Hợp</h2>
                <div class="sh-sec-sub">Chọn 3 tiêu chí đơn giản để hệ thống tự động lọc mẫu máy tối ưu từ kho sản phẩm</div>
              </div>
              <span class="sh-match-badge">Kho máy: ${all.length} sản phẩm sẵn sàng</span>
            </div>

            <div class="sh-finder-wizard">
              <!-- Bước 1: Nhu Cầu -->
              <div class="sh-finder-step">
                <div class="sh-step-num">Bước 1</div>
                <div class="sh-step-title">Nhu cầu chính</div>
                <div class="sh-opt-list">
                  <button type="button" class="sh-opt-btn active" data-type="demand" data-val="all" onclick="A.setFinderOpt('demand','all')">
                    <span>Toàn bộ nhu cầu</span>
                    <span>✓</span>
                  </button>
                  <button type="button" class="sh-opt-btn" data-type="demand" data-val="office" onclick="A.setFinderOpt('demand','office')">
                    <span>Văn phòng – Học tập</span>
                    <span>💼</span>
                  </button>
                  <button type="button" class="sh-opt-btn" data-type="demand" data-val="gaming" onclick="A.setFinderOpt('demand','gaming')">
                    <span>Gaming – Đồ họa nặng</span>
                    <span>🎮</span>
                  </button>
                  <button type="button" class="sh-opt-btn" data-type="demand" data-val="student" onclick="A.setFinderOpt('demand','student')">
                    <span>Sinh viên – Tiết kiệm</span>
                    <span>🎓</span>
                  </button>
                  <button type="button" class="sh-opt-btn" data-type="demand" data-val="creator" onclick="A.setFinderOpt('demand','creator')">
                    <span>Đồ họa – Dựng video</span>
                    <span>🎨</span>
                  </button>
                  <button type="button" class="sh-opt-btn" data-type="demand" data-val="slim" onclick="A.setFinderOpt('demand','slim')">
                    <span>Mỏng nhẹ – Cao cấp</span>
                    <span>✨</span>
                  </button>
                </div>
              </div>

              <!-- Bước 2: Ngân Sách -->
              <div class="sh-finder-step">
                <div class="sh-step-num">Bước 2</div>
                <div class="sh-step-title">Mức ngân sách</div>
                <div class="sh-opt-list">
                  <button type="button" class="sh-opt-btn active" data-type="budget" data-val="all" onclick="A.setFinderOpt('budget','all')">
                    <span>Mọi mức ngân sách</span>
                    <span>✓</span>
                  </button>
                  <button type="button" class="sh-opt-btn" data-type="budget" data-val="under15" onclick="A.setFinderOpt('budget','under15')">
                    <span>Dưới 15 Triệu</span>
                    <span>🏷️</span>
                  </button>
                  <button type="button" class="sh-opt-btn" data-type="budget" data-val="15to25" onclick="A.setFinderOpt('budget','15to25')">
                    <span>Từ 15 – 25 Triệu</span>
                    <span>⚡</span>
                  </button>
                  <button type="button" class="sh-opt-btn" data-type="budget" data-val="25to35" onclick="A.setFinderOpt('budget','25to35')">
                    <span>Từ 25 – 35 Triệu</span>
                    <span>⭐</span>
                  </button>
                  <button type="button" class="sh-opt-btn" data-type="budget" data-val="over35" onclick="A.setFinderOpt('budget','over35')">
                    <span>Trên 35 Triệu</span>
                    <span>💎</span>
                  </button>
                </div>
              </div>

              <!-- Bước 3: Thương Hiệu -->
              <div class="sh-finder-step">
                <div class="sh-step-num">Bước 3</div>
                <div class="sh-step-title">Thương hiệu ưu tiên</div>
                <div class="sh-opt-list">
                  <button type="button" class="sh-opt-btn active" data-type="brand" data-val="all" onclick="A.setFinderOpt('brand','all')">
                    <span>Tất cả thương hiệu</span>
                    <span>✓</span>
                  </button>
                  <button type="button" class="sh-opt-btn" data-type="brand" data-val="Apple" onclick="A.setFinderOpt('brand','Apple')">
                    <span>Apple (MacBook)</span>
                    <span>🍎</span>
                  </button>
                  <button type="button" class="sh-opt-btn" data-type="brand" data-val="Dell" onclick="A.setFinderOpt('brand','Dell')">
                    <span>Dell</span>
                    <span>💻</span>
                  </button>
                  <button type="button" class="sh-opt-btn" data-type="brand" data-val="ASUS" onclick="A.setFinderOpt('brand','ASUS')">
                    <span>ASUS</span>
                    <span>🔥</span>
                  </button>
                  <button type="button" class="sh-opt-btn" data-type="brand" data-val="Lenovo" onclick="A.setFinderOpt('brand','Lenovo')">
                    <span>Lenovo</span>
                    <span>💼</span>
                  </button>
                  <button type="button" class="sh-opt-btn" data-type="brand" data-val="HP" onclick="A.setFinderOpt('brand','HP')">
                    <span>HP</span>
                    <span>✨</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Kết quả lọc thông minh -->
            <div class="sh-finder-results-wrap">
              <div class="sh-results-head">
                <span class="badge ok">Mẫu máy gợi ý tốt nhất theo tiêu chí đã chọn</span>
                <a href="#/products" class="sh-view-all-link">Xem toàn bộ danh mục sản phẩm &rarr;</a>
              </div>
              <div class="pg pg-4cols" id="sh-finder-results-grid"></div>
            </div>
          </div>
        </section>

        <!-- ========================================== -->
        <!-- 7. BỘ SƯU TẬP LAPTOP & MÃ GIẢM GIÁ         -->
        <!-- ========================================== -->
        <section class="showroom-collections-sec" style="margin-top:32px">
          <div class="sh-section-head">
            <div>
              <h2 class="sh-sec-title">Bộ Sưu Tập Laptop &amp; Ưu Đãi Đặc Quyền</h2>
              <div class="sh-sec-sub">Tổng hợp dòng máy chuyên biệt và mã giảm giá áp dụng trực tiếp tại giỏ hàng</div>
            </div>
            <a href="#/promos" class="sh-view-all-link">Xem tất cả khuyến mãi &rarr;</a>
          </div>

          <div class="sh-collections-grid">
            <div class="sh-col-card">
              <div class="sh-col-card-body">
                <span class="sh-col-tag">PREMIUM MACBOOK</span>
                <h3 class="sh-col-title">MacBook Pro &amp; Air Silicon</h3>
                <p class="sh-col-desc">Sức mạnh vượt bậc từ chip Apple M-Series. Màn hình Liquid Retina XDR sắc nét đỉnh cao.</p>
                <div class="sh-col-stat">
                  <span>Kho máy: <b>${macbooks.length} model</b></span>
                  <span>Giá từ: <b>${vnd(macbooks[0]?.price || 18990000)}</b></span>
                </div>
                <a href="#/products?brand=Apple" class="sh-col-cta">Khám phá bộ sưu tập &rarr;</a>
              </div>
            </div>

            <div class="sh-col-card">
              <div class="sh-col-card-body">
                <span class="sh-col-tag">RTX GAMING BEAST</span>
                <h3 class="sh-col-title">Chiến Thần Đồ Họa &amp; Gaming</h3>
                <p class="sh-col-desc">Trang bị GPU NVIDIA GeForce RTX 40-Series. Tần số quét 144Hz–240Hz, tản nhiệt buồng hơi tân tiến.</p>
                <div class="sh-col-stat">
                  <span>Kho máy: <b>${gamingProds.length} model</b></span>
                  <span>Tặng kèm: <b>Balo + Chuột gaming</b></span>
                </div>
                <a href="#/products?cat=2" class="sh-col-cta">Xem dòng Gaming &rarr;</a>
              </div>
            </div>

            <div class="sh-col-card">
              <div class="sh-col-card-body">
                <span class="sh-col-tag">BUSINESS ULTRABOOK</span>
                <h3 class="sh-col-title">Doanh Nhân &amp; Văn Phòng</h3>
                <p class="sh-col-desc">Thời lượng pin lên tới 18 giờ. Trọng lượng siêu nhẹ dưới 1.2kg, bảo mật vân tay &amp; khuôn mặt Windows Hello.</p>
                <div class="sh-col-stat">
                  <span>Kho máy: <b>${officeProds.length} model</b></span>
                  <span>Hỗ trợ: <b>Trả góp 0%</b></span>
                </div>
                <a href="#/products?cat=1" class="sh-col-cta">Khám phá Ultrabook &rarr;</a>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>

  </div>`;
}
