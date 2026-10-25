/* ==========================================================================
   HOME VIEW (MVC): Premium Technology Showroom 3D & Modern Client Experience
   - Direction: Warm Ivory #F5F5F0, Sub #EDF0E9, Navy #152F38, Sage #688376, Terracotta #DB563D
   - Hero: Interactive 3D Laptop with Orbit Tilt, Material Switcher, View Presets
   - Sections: Brands, Need Categories, 5-col Best Sellers, Rule-based Finder, Collections, Vouchers, Trust, News
   - 100% Authentic DB Products, Categories, Promos & News Preserved
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

  // Phân nhóm sản phẩm thực tế từ CSDL MySQL
  const macbooks = all.filter((p) => p.brand === 'Apple');
  const slimProds = all.filter((p) => p.cat === '3' || p.brand === 'Apple');
  const gamingProds = all.filter((p) => p.cat === '2');
  const officeProds = all.filter((p) => p.cat === '1' || p.cat === '6');
  const studentProds = all.filter((p) => p.cat === '5');
  const creatorProds = all.filter((p) => p.cat === '4');
  const hotDeals = all.filter((p) => p.old > p.price).slice(0, 10);
  const bestSellers = [...all].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)).slice(0, 10);

  // Cấu hình Hero 3D Showroom từ Admin DB (nếu có lưu ở banners table)
  const hero3dConfig = dbBanners.find((b) => b.position === 'hero_3d');
  cache.hero3dConfig = hero3dConfig;
  const hero3dEnabled = hero3dConfig ? hero3dConfig.is_active !== 0 : true;
  const heroBadge = hero3dConfig?.badge_text || '✨ SHOWROOM CÔNG NGHỆ 3D • LAPTOP99';
  const heroTitle = hero3dConfig?.title || 'Trải Nghiệm Laptop Tương Tác';
  const heroTitleHl = hero3dConfig?.highlight_text || 'Thế Hệ Mới';
  const heroDesc = hero3dConfig?.subtitle || 'Xoay góc nhìn 360°, chạm đổi màu kim loại và tùy chọn cấu hình trực quan trong không gian showroom ảo trước khi mua sắm.';
  const heroCtaText = hero3dConfig?.cta_text || 'Khám phá sản phẩm';
  const heroCtaLink = hero3dConfig?.cta_link || '#/products';
  const heroDefaultColor = hero3dConfig?.bg_theme || 'space_gray';

  // Lọc sản phẩm bán chạy theo tab đang chọn
  const activeBssTab = cache.bssTab || 'all';
  let bssProducts = bestSellers;
  if (activeBssTab === 'gaming') bssProducts = gamingProds;
  else if (activeBssTab === 'macbook') bssProducts = macbooks;
  else if (activeBssTab === 'office') bssProducts = officeProds;
  else if (activeBssTab === 'student') bssProducts = studentProds;
  else if (activeBssTab === 'creator') bssProducts = creatorProds;
  if (!bssProducts.length) bssProducts = all.slice(0, 5);

  return `
  <div class="showroom-home-wrap">
    
    <!-- ==================================================================== -->
    <!-- 1. HERO 3D INTERACTIVE SHOWROOM                                     -->
    <!-- ==================================================================== -->
    <section class="showroom-hero-sec">
      <div class="wrap">
        <div class="showroom-hero-card">
          <!-- Cột Trái: Thông tin giới thiệu, CTA, Bộ chuyển đổi màu và góc nhìn -->
          <div class="sh-hero-left">
            <div class="sh-hero-badge">
              <span class="sh-hero-badge-dot"></span>
              <span>${esc(heroBadge)}</span>
            </div>

            <h1 class="sh-hero-title">
              ${esc(heroTitle)} <span>${esc(heroTitleHl)}</span>
            </h1>

            <p class="sh-hero-desc">
              ${esc(heroDesc)}
            </p>

            <div class="sh-hero-tags">
              <span class="sh-tag-pill"><span class="icon">✨</span> Màn hình 120Hz Liquid Retina / OLED</span>
              <span class="sh-tag-pill"><span class="icon">⚡</span> Chip Apple M3/M4 &amp; Intel Ultra</span>
              <span class="sh-tag-pill"><span class="icon">🔋</span> Thời lượng pin 12 – 18 giờ</span>
            </div>

            <div class="sh-hero-actions">
              <a href="${esc(heroCtaLink)}" class="sh-btn-primary">
                <span>${esc(heroCtaText)}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              <a href="#finder-sec" class="sh-btn-secondary" onclick="document.getElementById('finder-sec')?.scrollIntoView({behavior:'smooth'})">
                <span>🎯 Gợi ý chọn máy</span>
              </a>
            </div>

            <!-- Bảng điều khiển tương tác 3D: Đổi màu & Góc nhìn -->
            <div class="sh-controls-panel">
              <div class="sh-control-row">
                <span class="sh-control-lbl">Màu vật liệu:</span>
                <div class="sh-color-options">
                  <button type="button" class="sh-color-btn ${heroDefaultColor === 'space_gray' ? 'active' : ''}" data-color="space_gray" onclick="A.setHero3DColor('space_gray')" title="Space Gray">
                    <span class="sh-color-swatch" style="background:#3A3D42"></span>
                    <span>Space Gray</span>
                  </button>
                  <button type="button" class="sh-color-btn ${heroDefaultColor === 'silver' ? 'active' : ''}" data-color="silver" onclick="A.setHero3DColor('silver')" title="Silver Metallic">
                    <span class="sh-color-swatch" style="background:#D6D8DC"></span>
                    <span>Silver</span>
                  </button>
                  <button type="button" class="sh-color-btn ${heroDefaultColor === 'midnight' ? 'active' : ''}" data-color="midnight" onclick="A.setHero3DColor('midnight')" title="Midnight Pine">
                    <span class="sh-color-swatch" style="background:#152F38"></span>
                    <span>Midnight</span>
                  </button>
                  <button type="button" class="sh-color-btn ${heroDefaultColor === 'rose_gold' ? 'active' : ''}" data-color="rose_gold" onclick="A.setHero3DColor('rose_gold')" title="Rose Gold">
                    <span class="sh-color-swatch" style="background:#D4B5A2"></span>
                    <span>Rose Gold</span>
                  </button>
                </div>
              </div>

              <div class="sh-control-row">
                <span class="sh-control-lbl">Góc nhìn 3D:</span>
                <div class="sh-view-options">
                  <button type="button" class="sh-view-btn active" data-view="perspective" onclick="A.setHero3DView('perspective')">Phối cảnh</button>
                  <button type="button" class="sh-view-btn" data-view="front" onclick="A.setHero3DView('front')">Chính diện</button>
                  <button type="button" class="sh-view-btn" data-view="top" onclick="A.setHero3DView('top')">Góc nghiêng</button>
                </div>
              </div>

              <div class="sh-control-row">
                <span class="sh-control-lbl">Ảnh màn hình:</span>
                <div style="display:flex;align-items:center;gap:6px">
                  <label class="sh-view-btn" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px">
                    <span>📷 Đổi ảnh màn hình</span>
                    <input type="file" accept="image/*" style="display:none" onchange="if(this.files[0]) A.setHero3DScreenImage(this.files[0])">
                  </label>
                  <button type="button" class="sh-view-btn" onclick="A.initHero3D('hero-3d-canvas', { defaultColor: '${heroDefaultColor}', screenImageUrl: null })" title="Màn hình mặc định">Mặc định</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Cột Phải: Không gian Canvas 3D tương tác & Thẻ thông số nổi -->
          <div class="sh-hero-canvas-col">
            <div class="sh-canvas-wrap">
              <div id="hero-3d-canvas" class="hero-3d-stage" style="width:100%;height:100%;position:relative" aria-label="Mô hình laptop 3D tương tác Laptop99"></div>

              <!-- Thẻ thông tin nổi 4 góc -->
              <div class="sh-chip top-left">
                <span class="sh-chip-icon">🛡️</span>
                <span>100% Chính Hãng VN/A</span>
              </div>
              <div class="sh-chip top-right">
                <span class="sh-chip-icon">⚡</span>
                <span>Bảo Hành Chuẩn S/N</span>
              </div>
              <div class="sh-chip bot-left">
                <span class="sh-chip-icon">🔄</span>
                <span>Đổi Mới Trong 15 Ngày</span>
              </div>
              <div class="sh-chip bot-right">
                <span class="sh-chip-icon">💳</span>
                <span>Trả Góp 0% Lãi Suất</span>
              </div>

              <!-- Hướng dẫn điều khiển tương tác -->
              <div class="sh-orbit-hint">
                🖱️ Kéo chuột xoay 360° · Cuộn dọc bình thường
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================================================================== -->
    <!-- 2. THƯƠNG HIỆU NỔI BẬT (7 AUTHENTIC BRANDS)                         -->
    <!-- ==================================================================== -->
    <section class="showroom-brands-sec">
      <div class="wrap">
        <div class="sh-section-head">
          <div>
            <h2 class="sh-sec-title">Thương Hiệu Hàng Đầu</h2>
            <div class="sh-sec-sub">Phân phối ủy quyền chính hãng kèm đầy đủ hóa đơn VAT</div>
          </div>
          <a href="#/products" class="sh-btn-secondary" style="font-size:0.82rem;padding:8px 16px">Tất cả thương hiệu &rarr;</a>
        </div>

        <div class="sh-brands-grid">
          <a href="#/products?brand=Apple" class="sh-brand-card" title="Laptop Apple MacBook">
            <img src="uploads/brand_apple.png" alt="Apple" class="sh-brand-logo-img" onerror="this.src='https://cdn.simpleicons.org/apple/152F38'">
            <span class="sh-brand-name">Apple</span>
            <span class="sh-brand-sub">MacBook VN/A</span>
          </a>
          <a href="#/products?brand=ASUS" class="sh-brand-card" title="Laptop ASUS ROG & Zenbook">
            <img src="uploads/brand_asus.png" alt="ASUS" class="sh-brand-logo-img" onerror="this.src='https://cdn.simpleicons.org/asus/152F38'">
            <span class="sh-brand-name">ASUS</span>
            <span class="sh-brand-sub">Zenbook &amp; ROG</span>
          </a>
          <a href="#/products?brand=Dell" class="sh-brand-card" title="Laptop Dell XPS & Inspiron">
            <img src="uploads/brand_dell.png" alt="Dell" class="sh-brand-logo-img" onerror="this.src='https://cdn.simpleicons.org/dell/152F38'">
            <span class="sh-brand-name">Dell</span>
            <span class="sh-brand-sub">XPS &amp; ProSupport</span>
          </a>
          <a href="#/products?brand=HP" class="sh-brand-card" title="Laptop HP Envy & Pavilion">
            <img src="uploads/brand_hp.png" alt="HP" class="sh-brand-logo-img" onerror="this.src='https://cdn.simpleicons.org/hp/152F38'">
            <span class="sh-brand-name">HP</span>
            <span class="sh-brand-sub">Spectre &amp; Envy</span>
          </a>
          <a href="#/products?brand=Lenovo" class="sh-brand-card" title="Laptop Lenovo ThinkPad & Legion">
            <img src="uploads/brand_lenovo.png" alt="Lenovo" class="sh-brand-logo-img" onerror="this.src='https://cdn.simpleicons.org/lenovo/152F38'">
            <span class="sh-brand-name">Lenovo</span>
            <span class="sh-brand-sub">ThinkPad &amp; Legion</span>
          </a>
          <a href="#/products?brand=MSI" class="sh-brand-card" title="Laptop MSI Stealth & Raider">
            <img src="uploads/brand_msi.png" alt="MSI" class="sh-brand-logo-img" onerror="this.src='https://cdn.simpleicons.org/msi/152F38'">
            <span class="sh-brand-name">MSI</span>
            <span class="sh-brand-sub">Gaming &amp; Creator</span>
          </a>
          <a href="#/products?brand=Acer" class="sh-brand-card" title="Laptop Acer Swift & Predator">
            <img src="uploads/brand_acer.png" alt="Acer" class="sh-brand-logo-img" onerror="this.src='https://cdn.simpleicons.org/acer/152F38'">
            <span class="sh-brand-name">Acer</span>
            <span class="sh-brand-sub">Swift &amp; Predator</span>
          </a>
        </div>
      </div>
    </section>

    <!-- ==================================================================== -->
    <!-- 3. DANH MỤC THEO NHU CẦU SỬ DỤNG (6 PHÂN KHÚC)                     -->
    <!-- ==================================================================== -->
    <section class="showroom-cats-sec">
      <div class="wrap">
        <div class="sh-section-head">
          <div>
            <h2 class="sh-sec-title">Danh Mục Theo Nhu Cầu</h2>
            <div class="sh-sec-sub">Tối ưu cấu hình chính xác cho từng mục đích sử dụng thực tế</div>
          </div>
        </div>

        <div class="sh-cats-grid">
          <a href="#/products?cat=2" class="sh-cat-card">
            <div class="sh-cat-icon">🎮</div>
            <div class="sh-cat-name">Laptop Gaming</div>
            <div class="sh-cat-desc">RTX 40-Series, màn hình 144Hz–240Hz mượt mà</div>
          </a>
          <a href="#/products?brand=Apple" class="sh-cat-card">
            <div class="sh-cat-icon">🍎</div>
            <div class="sh-cat-name">MacBook Chính Hãng</div>
            <div class="sh-cat-desc">Apple Silicon M2/M3, mỏng nhẹ, pin trâu cả ngày</div>
          </a>
          <a href="#/products?cat=1" class="sh-cat-card">
            <div class="sh-cat-icon">💼</div>
            <div class="sh-cat-name">Laptop Văn Phòng</div>
            <div class="sh-cat-desc">Gõ êm, màn chống mỏi mắt, xử lý mượt Office &amp; họp trực tuyến</div>
          </a>
          <a href="#/products?cat=5" class="sh-cat-card">
            <div class="sh-cat-icon">🎓</div>
            <div class="sh-cat-name">Laptop Sinh Viên</div>
            <div class="sh-cat-desc">Giá tốt, bền bỉ, hỗ trợ trả góp 0% duyệt CCCD</div>
          </a>
          <a href="#/products?cat=4" class="sh-cat-card">
            <div class="sh-cat-icon">🎨</div>
            <div class="sh-cat-name">Đồ Họa – Kỹ Thuật</div>
            <div class="sh-cat-desc">Màn chuẩn màu 100% sRGB/DCI-P3, CPU xung cao, render nhanh</div>
          </a>
          <a href="#/products?cat=3" class="sh-cat-card">
            <div class="sh-cat-icon">✨</div>
            <div class="sh-cat-name">Mỏng Nhẹ Cao Cấp</div>
            <div class="sh-cat-desc">Zenbook, XPS, Gram dưới 1.2kg vỏ kim loại nguyên khối</div>
          </a>
        </div>
      </div>
    </section>

    <!-- ==================================================================== -->
    <!-- 4. SẢN PHẨM BÁN CHẠY & NỔI BẬT (5 COLUMNS GRID)                     -->
    <!-- ==================================================================== -->
    <section class="showroom-bestsellers-sec">
      <div class="wrap">
        <div class="sh-section-head">
          <div>
            <h2 class="sh-sec-title">Sản Phẩm Bán Chạy &amp; Nổi Bật</h2>
            <div class="sh-sec-sub">Top lựa chọn được khách hàng đánh giá cao nhất trong tháng</div>
          </div>
          <div class="sh-filter-tabs">
            <button type="button" class="sh-filter-tab ${activeBssTab === 'all' ? 'active' : ''}" onclick="cache.bssTab='all';render()">Tất cả</button>
            <button type="button" class="sh-filter-tab ${activeBssTab === 'gaming' ? 'active' : ''}" onclick="cache.bssTab='gaming';render()">Laptop Gaming</button>
            <button type="button" class="sh-filter-tab ${activeBssTab === 'macbook' ? 'active' : ''}" onclick="cache.bssTab='macbook';render()">MacBook</button>
            <button type="button" class="sh-filter-tab ${activeBssTab === 'office' ? 'active' : ''}" onclick="cache.bssTab='office';render()">Laptop Văn Phòng</button>
            <button type="button" class="sh-filter-tab ${activeBssTab === 'student' ? 'active' : ''}" onclick="cache.bssTab='student';render()">Laptop Sinh Viên</button>
            <button type="button" class="sh-filter-tab ${activeBssTab === 'creator' ? 'active' : ''}" onclick="cache.bssTab='creator';render()">Đồ Họa</button>
          </div>
        </div>

        <!-- Lưới 5 Cột Sản Phẩm Chuẩn Thương Mại Điện Tử -->
        <div class="pg pg-5cols">
          ${bssProducts.slice(0, 5).map(pcard).join('')}
        </div>
      </div>
    </section>

    <!-- ==================================================================== -->
    <!-- 5. GỢI Ý CHỌN LAPTOP (RULE-BASED INTERACTIVE RECOMMENDATION TOOL)   -->
    <!-- ==================================================================== -->
    <section class="showroom-finder-sec" id="finder-sec">
      <div class="wrap">
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
                  <span>Creator – Chuẩn màu</span>
                  <span>🎨</span>
                </button>
                <button type="button" class="sh-opt-btn" data-type="demand" data-val="slim" onclick="A.setFinderOpt('demand','slim')">
                  <span>Mỏng nhẹ – Doanh nhân</span>
                  <span>✨</span>
                </button>
              </div>
            </div>

            <!-- Bước 2: Ngân Sách -->
            <div class="sh-finder-step">
              <div class="sh-step-num">Bước 2</div>
              <div class="sh-step-title">Khoảng ngân sách</div>
              <div class="sh-opt-list">
                <button type="button" class="sh-opt-btn active" data-type="budget" data-val="all" onclick="A.setFinderOpt('budget','all')">
                  <span>Mọi mức giá</span>
                  <span>✓</span>
                </button>
                <button type="button" class="sh-opt-btn" data-type="budget" data-val="under15" onclick="A.setFinderOpt('budget','under15')">
                  <span>Dưới 15 Triệu</span>
                  <span>💰</span>
                </button>
                <button type="button" class="sh-opt-btn" data-type="budget" data-val="15to25" onclick="A.setFinderOpt('budget','15to25')">
                  <span>15 – 25 Triệu</span>
                  <span>💎</span>
                </button>
                <button type="button" class="sh-opt-btn" data-type="budget" data-val="25to35" onclick="A.setFinderOpt('budget','25to35')">
                  <span>25 – 35 Triệu</span>
                  <span>🔥</span>
                </button>
                <button type="button" class="sh-opt-btn" data-type="budget" data-val="over35" onclick="A.setFinderOpt('budget','over35')">
                  <span>Trên 35 Triệu</span>
                  <span>👑</span>
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
                <button type="button" class="sh-opt-btn" data-type="brand" data-val="ASUS" onclick="A.setFinderOpt('brand','ASUS')">
                  <span>ASUS</span>
                  <span>⚡</span>
                </button>
                <button type="button" class="sh-opt-btn" data-type="brand" data-val="Dell" onclick="A.setFinderOpt('brand','Dell')">
                  <span>Dell</span>
                  <span>🛡️</span>
                </button>
                <button type="button" class="sh-opt-btn" data-type="brand" data-val="Lenovo" onclick="A.setFinderOpt('brand','Lenovo')">
                  <span>Lenovo</span>
                  <span>🚀</span>
                </button>
                <button type="button" class="sh-opt-btn" data-type="brand" data-val="HP" onclick="A.setFinderOpt('brand','HP')">
                  <span>HP</span>
                  <span>💼</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Khu vực hiển thị kết quả gợi ý theo thời gian thực -->
          <div class="sh-finder-results">
            <div class="sh-results-header">
              <div class="sh-results-title">
                <span>✨ Máy được chấm điểm phù hợp nhất với tiêu chí của bạn:</span>
              </div>
              <a href="#/products" class="btn sm">Xem toàn bộ bộ lọc chi tiết &rarr;</a>
            </div>
            <div class="pg pg-4cols" id="sh-finder-results-grid">
              ${(all.slice(0, 4)).map((p) => `
                <div class="sh-match-card-wrap" style="position:relative">
                  <div style="position:absolute;top:10px;left:10px;z-index:3">
                    <span class="sh-match-badge">🎯 98% Phù hợp</span>
                  </div>
                  ${pcard(p)}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================================================================== -->
    <!-- 6. BỘ SƯU TẬP LAPTOP THEO NHÓM KHÁCH HÀNG                           -->
    <!-- ==================================================================== -->
    <section class="showroom-collections-sec">
      <div class="wrap">
        <div class="sh-section-head">
          <div>
            <h2 class="sh-sec-title">Bộ Sưu Tập Khách Hàng</h2>
            <div class="sh-sec-sub">Gói giải pháp và trang bị phù hợp với từng phân khúc người dùng</div>
          </div>
        </div>

        <div class="sh-collections-grid">
          <a href="#/products?cat=5" class="sh-col-card">
            <div class="sh-col-icon-wrap">🎓</div>
            <div class="sh-col-title">Học Sinh &amp; Sinh Viên</div>
            <div class="sh-col-desc">Trợ giá tựu trường, tặng kèm balo chống sốc, hỗ trợ trả góp 0% duyệt nhanh bằng thẻ CCCD.</div>
            <div class="sh-col-link">Xem bộ sưu tập HSSV &rarr;</div>
          </a>

          <a href="#/products?cat=1" class="sh-col-card">
            <div class="sh-col-icon-wrap">👔</div>
            <div class="sh-col-title">Doanh Nhân &amp; Quản Lý</div>
            <div class="sh-col-desc">Khung hợp kim nhôm nguyên khối, cảm biến vân tay &amp; FaceID, bảo hành On-site 24/7 tận nơi.</div>
            <div class="sh-col-link">Xem máy Doanh nhân &rarr;</div>
          </a>

          <a href="#/products?cat=4" class="sh-col-card">
            <div class="sh-col-icon-wrap">💻</div>
            <div class="sh-col-title">Lập Trình Viên &amp; IT</div>
            <div class="sh-col-desc">Bàn phím hành trình sâu gõ êm, RAM từ 16GB – 32GB chạy mượt Docker, máy ảo và nhiều IDE đồng thời.</div>
            <div class="sh-col-link">Xem máy Lập trình &rarr;</div>
          </a>

          <a href="#/products?cat=4" class="sh-col-card">
            <div class="sh-col-icon-wrap">🎨</div>
            <div class="sh-col-title">Content Creator &amp; Thiết Kế</div>
            <div class="sh-col-desc">Màn hình Liquid Retina / OLED chuẩn màu 100% DCI-P3, card đồ họa RTX Studio hỗ trợ dựng phim 4K.</div>
            <div class="sh-col-link">Xem máy Đồ họa &rarr;</div>
          </a>
        </div>
      </div>
    </section>

    <!-- ==================================================================== -->
    <!-- 7. CHƯƠNG TRÌNH ƯU ĐÃI & VOUCHER ĐỘC QUYỀN                           -->
    <!-- ==================================================================== -->
    <section class="showroom-vouchers-sec">
      <div class="wrap">
        <div class="sh-section-head">
          <div>
            <h2 class="sh-sec-title">Mã Giảm Giá &amp; Ưu Đãi Độc Quyền</h2>
            <div class="sh-sec-sub">Thu thập mã voucher để giảm trực tiếp khi thanh toán tại Giỏ hàng</div>
          </div>
          <a href="#/promos" class="sh-btn-secondary" style="font-size:0.82rem;padding:8px 16px">Tất cả ưu đãi &rarr;</a>
        </div>

        <div class="sh-vouchers-grid">
          <div class="sh-voucher-card">
            <div class="sh-vc-left">
              <span class="sh-vc-code">SHOWROOM99</span>
              <span class="sh-vc-desc">Giảm ngay 500.000₫ cho đơn hàng Laptop từ 15 Triệu</span>
            </div>
            <button type="button" class="sh-vc-btn" onclick="A.copyVoucher('SHOWROOM99')">Lưu mã</button>
          </div>

          <div class="sh-voucher-card">
            <div class="sh-vc-left">
              <span class="sh-vc-code">STUDENT5</span>
              <span class="sh-vc-desc">Giảm thêm 5% tối đa 1.000.000₫ đặc quyền HSSV</span>
            </div>
            <button type="button" class="sh-vc-btn" onclick="A.copyVoucher('STUDENT5')">Lưu mã</button>
          </div>

          <div class="sh-voucher-card">
            <div class="sh-vc-left">
              <span class="sh-vc-code">FREESHIP99</span>
              <span class="sh-vc-desc">Miễn phí giao hàng toàn quốc kèm đồng kiểm khi nhận</span>
            </div>
            <button type="button" class="sh-vc-btn" onclick="A.copyVoucher('FREESHIP99')">Lưu mã</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================================================================== -->
    <!-- 8. DỊCH VỤ & CHÍNH SÁCH CAM KẾT TIN CẬY                             -->
    <!-- ==================================================================== -->
    <section class="showroom-trust-sec">
      <div class="wrap">
        <div class="sh-trust-grid">
          <div class="sh-trust-card">
            <div class="sh-trust-icon">🛡️</div>
            <div>
              <div class="sh-trust-title">100% Chính Hãng VN/A</div>
              <div class="sh-trust-desc">Sản phẩm xuất hóa đơn VAT đầy đủ, phân phối ủy quyền từ các hãng hàng đầu thế giới.</div>
            </div>
          </div>

          <div class="sh-trust-card">
            <div class="sh-trust-icon">🔄</div>
            <div>
              <div class="sh-trust-title">Đổi Mới Trong 15 Ngày</div>
              <div class="sh-trust-desc">Chính sách 1 đổi 1 nhanh chóng nếu phát sinh lỗi phần cứng từ nhà sản xuất.</div>
            </div>
          </div>

          <div class="sh-trust-card">
            <div class="sh-trust-icon">🚚</div>
            <div>
              <div class="sh-trust-title">Giao Nhanh Toàn Quốc</div>
              <div class="sh-trust-desc">Miễn phí giao hàng, đóng gói cẩn thận 3 lớp và hỗ trợ đồng kiểm trực tiếp khi nhận máy.</div>
            </div>
          </div>

          <div class="sh-trust-card">
            <div class="sh-trust-icon">💳</div>
            <div>
              <div class="sh-trust-title">Trả Góp 0% Tiết Kiệm</div>
              <div class="sh-trust-desc">Hỗ trợ trả góp qua thẻ tín dụng và xét duyệt online bằng CCCD chỉ trong 10 phút.</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================================================================== -->
    <!-- 9. CẨM NANG & TIN TỨC CÔNG NGHỆ                                      -->
    <!-- ==================================================================== -->
    <section class="showroom-news-sec">
      <div class="wrap">
        <div class="sh-section-head">
          <div>
            <h2 class="sh-sec-title">Tin Tức &amp; Tư Vấn Mua Sắm</h2>
            <div class="sh-sec-sub">Cập nhật tin công nghệ mới nhất, đánh giá hiệu năng và kinh nghiệm chọn mua</div>
          </div>
          <a href="#/news" class="sh-btn-secondary" style="font-size:0.82rem;padding:8px 16px">Xem toàn bộ bài viết &rarr;</a>
        </div>

        <div class="sh-news-grid">
          ${(news.length ? news.slice(0, 3) : [
            {
              id: 'n1',
              title: 'Đánh giá chi tiết MacBook Pro M3 Pro: Sức mạnh đồ họa vượt trội cho Creator',
              summary: 'Khám phá hiệu năng thực tế của chip M3 Pro trên màn hình Liquid Retina XDR và thời lượng pin ấn tượng lên tới 18 tiếng.',
              thumbnail: 'uploads/products/real-macbook-pro.jpg',
              created_at: '2026-10-24',
            },
            {
              id: 'n2',
              title: 'Top 5 mẫu Laptop Gaming đáng mua nhất 2026: Chiến mượt game AAA với RTX 40-Series',
              summary: 'Tổng hợp các mẫu máy tản nhiệt mát mẻ, bàn phím RGB và màn hình tần số quét cao dành cho game thủ chuyên nghiệp.',
              thumbnail: 'uploads/products/real-asus-tuf.jpg',
              created_at: '2026-10-22',
            },
            {
              id: 'n3',
              title: 'Cẩm nang chọn Laptop Sinh Viên: Ngân sách từ 12 đến 20 Triệu dùng bền suốt 4 năm đại học',
              summary: 'Hướng dẫn lựa chọn cấu hình CPU, dung lượng RAM và cổng kết nối cần thiết cho sinh viên các khối ngành kỹ thuật và kinh tế.',
              thumbnail: 'uploads/products/real-acer-aspire.jpg',
              created_at: '2026-10-20',
            },
          ])
            .map(
              (n) => `
            <a href="#/news/${n.id}" class="sh-news-card">
              <img src="${resolveAssetUrl(n.thumbnail || '/uploads/products/real-macbook-pro.jpg')}" alt="${esc(n.title)}" class="sh-news-thumb" loading="lazy">
              <div class="sh-news-body">
                <div class="sh-news-date">📅 ${sd(n.created_at || Date.now())}</div>
                <div class="sh-news-title">${esc(n.title)}</div>
                <div class="sh-news-summary">${esc(n.summary || '')}</div>
              </div>
            </a>
          `,
            )
            .join('')}
        </div>
      </div>
    </section>

  </div>`;
}
