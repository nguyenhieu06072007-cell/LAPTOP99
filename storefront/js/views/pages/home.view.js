/* ==========================================================================
   HOME VIEW (MVC): CellphoneS-Inspired Homepage (Sections 5, 6, 7, 8, 9, 10, 11)
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
  const hotDeals = all.filter((p) => p.old > p.price).slice(0, 8);
  const bestSellers = [...all].sort((a, b) => b.soldCount - a.soldCount).slice(0, 8);
  const newArrivals = [...all].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || b.rawId - a.rawId).slice(0, 4);

  // Sản phẩm đại diện mặc định nếu CSDL banners trống
  const slideMacProd = macbooks[0] || slimProds[0] || all[0];
  const slideGameProd = gamingProds[0] || all[1] || all[0];
  const slideOfficeProd = officeProds[0] || all[2] || all[0];
  const slidePromoProd = hotDeals[0] || all[3] || all[0];

  let heroCampaigns = [];
  if (dbBanners.length > 0) {
    heroCampaigns = dbBanners.map((b) => {
      const linkedProd = b.product_id ? P('p' + b.product_id) || all[0] : all[0];
      const priceVal =
        Number(b.custom_price) ||
        Number(b.product_sale_price) ||
        Number(b.product_base_price) ||
        Number(b.price) ||
        (linkedProd ? linkedProd.price : 22990000);
      const oldVal =
        Number(b.custom_old_price) ||
        Number(b.product_base_price) ||
        Number(b.old_price) ||
        (linkedProd ? linkedProd.old : 0);
      const imgUrl = resolveAssetUrl(b.image_url || b.product_thumb || (linkedProd ? linkedProd.thumbnail : ''));
      const specList = String(b.specs_json || b.specs || '')
        .split(/[|,]/)
        .map((x) => x.trim())
        .filter(Boolean);
      const finalSpecs = specList.length
        ? specList
        : linkedProd
        ? [linkedProd.cpu, 'RAM ' + linkedProd.ram, linkedProd.ssd]
        : ['Chính hãng VN/A', 'Bảo hành S/N', 'Giao nhanh 2H'];

      const badgeCls = b.badge_style === 'blue' ? '' : b.badge_style || '';
      const prodIdVal = b.product_id || (linkedProd ? linkedProd.id : null);
      const targetUrl = prodIdVal ? `#/product/${prodIdVal}` : (b.cta_link || '#/products');

      return {
        id: b.id,
        badge: b.badge_text || b.badge || '⚡ Chiến dịch nổi bật',
        badgeCls,
        theme: b.bg_theme || 'blue',
        titleHtml: `${esc(b.title || '')} ${b.highlight_text ? `<span>${esc(b.highlight_text)}</span>` : ''}`,
        desc: b.subtitle || '',
        ctaText: b.cta_text || 'Khám phá ngay',
        ctaHref: targetUrl,
        targetUrl,
        tabTitle: b.tab_title || b.title || 'Chiến dịch',
        tabSub: b.tab_sub || b.highlight_text || 'Ưu đãi hấp dẫn',
        specs: finalSpecs,
        price: priceVal,
        old: oldVal,
        imgUrl,
        prodId: prodIdVal || 'p1',
        prodName: b.product_name || (linkedProd ? linkedProd.name : b.title),
        prodBrand: b.product_brand || (linkedProd ? linkedProd.brand : 'Laptop'),
        prod: linkedProd,
        autoplayMs: Number(b.autoplay_ms) || 3000,
        imageMode: b.image_mode || 'background',
        contentPosition: b.content_position || 'left',
        imagePosition: b.image_position || 'center center',
        overlayStyle: b.overlay_style || 'gradient_dark',
      };
    });
  } else {
    heroCampaigns = [
      {
        badge: 'CHÍNH HÃNG APPLE VN/A',
        badgeCls: '',
        theme: 'blue',
        titleHtml: 'MacBook Chính Hãng – <span>Hiệu Năng Vượt Trội</span>',
        desc: 'Thiết kế nhôm mỏng nhẹ, chip Apple M3 siêu mượt, đặc quyền HSSV giảm thêm 1.000.000₫.',
        ctaText: 'Xem chi tiết',
        ctaHref: '#/products?brand=Apple',
        targetUrl: '#/products?brand=Apple',
        tabTitle: 'MACBOOK AIR M2',
        tabSub: 'Mỏng nhẹ, mạnh mẽ',
        specs: ['Apple M3 Chip', 'RAM 16GB Unified', 'SSD 512GB Siêu Tốc'],
        price: 27990000,
        old: 31990000,
        imgUrl: resolveAssetUrl('/uploads/products/real-macbook-pro.jpg'),
        prodId: 'p16',
        prodName: 'MacBook Air M3 Chính Hãng',
        prodBrand: 'Apple',
        prod: slideMacProd,
        autoplayMs: 5000,
      },
      {
        badge: 'GEFORCE RTX 40-SERIES',
        badgeCls: 'red',
        theme: 'indigo',
        titleHtml: 'Chiến Game Đỉnh Cao – <span>Bứt Phá Mọi Trận Đấu</span>',
        desc: 'Hiệu năng đồ họa NVIDIA RTX 4060, màn hình 165Hz+, trả góp 0% tặng Balo & Gear Gaming.',
        ctaText: 'Xem chi tiết',
        ctaHref: '#/products?cat=2',
        targetUrl: '#/products?cat=2',
        tabTitle: 'GAMING ROG RTX',
        tabSub: 'Màn hình 165Hz+',
        specs: ['Core i7-14650HX', 'GeForce RTX 4060', 'RAM 16GB DDR5', 'SSD 1TB Gen4'],
        price: 26990000,
        old: 30990000,
        imgUrl: resolveAssetUrl('/uploads/products/real-asus-rog.jpg'),
        prodId: 'p83',
        prodName: 'Laptop Gaming ASUS ROG RTX 4060',
        prodBrand: 'Gaming',
        prod: slideGameProd,
        autoplayMs: 5000,
      },
      {
        badge: 'CHUẨN DOANH NHÂN',
        badgeCls: 'green',
        theme: 'emerald',
        titleHtml: 'Laptop Doanh Nhân – <span>Bền Bỉ Mỗi Ngày</span>',
        desc: 'Mỏng nhẹ cao cấp, màn OLED 3K, bảo hành ProSupport tận nơi 24/7.',
        ctaText: 'Xem chi tiết',
        ctaHref: '#/products?cat=1',
        targetUrl: '#/products?cat=1',
        tabTitle: 'DELL XPS OLED',
        tabSub: 'Chuẩn doanh nhân',
        specs: ['Intel Core Ultra 7', 'OLED 3K Chuẩn Màu', 'RAM 32GB', 'SSD 1TB NVMe'],
        price: 34990000,
        old: 38990000,
        imgUrl: resolveAssetUrl('/uploads/products/real-dell-xps.jpg'),
        prodId: 'p24',
        prodName: 'Dell XPS 13 OLED Core Ultra 7',
        prodBrand: 'Dell',
        prod: slideOfficeProd,
        autoplayMs: 5000,
      },
      {
        badge: 'NEXT-GEN AI PC',
        badgeCls: 'amber',
        theme: 'rose',
        titleHtml: 'Đại Tiệc Laptop AI – <span>Giảm Sâu Đến 35%</span>',
        desc: 'Trải nghiệm NPU AI thông minh hỗ trợ sáng tạo, màn hình OLED 2.8K siêu mượt.',
        ctaText: 'Xem chi tiết',
        ctaHref: '#/promos',
        targetUrl: '#/promos',
        tabTitle: 'ASUS ZENBOOK AI',
        tabSub: 'OLED 2.8K siêu mượt',
        specs: ['NPU AI Boost', 'Màn OLED 2.8K', 'RAM 32GB', 'Trọng lượng 1.2kg'],
        price: 24990000,
        old: 28990000,
        imgUrl: resolveAssetUrl('/uploads/products/real-asus-zenbook.jpg'),
        prodId: 'p16',
        prodName: 'ASUS Zenbook OLED AI Ultrabook',
        prodBrand: 'ASUS',
        prod: slidePromoProd,
        autoplayMs: 5000,
      },
    ];
  }

  cache.heroAutoplayMs = heroCampaigns[0]?.autoplayMs || 3000;
  const curHero = Math.min(cache.heroIdx || 0, Math.max(0, heroCampaigns.length - 1));
  const highlightDeal = hotDeals[0] || all[0];
  const u = me();

  const brandLogos = [
    { name: 'Apple', slug: 'apple' },
    { name: 'Dell', slug: 'dell' },
    { name: 'ASUS', slug: 'asus' },
    { name: 'Lenovo', slug: 'lenovo' },
    { name: 'HP', slug: 'hp' },
    { name: 'MSI', slug: 'msi' },
    { name: 'Acer', slug: 'acer' },
    { name: 'LG', slug: 'lg' },
    { name: 'Microsoft', slug: 'microsoft' },
  ];

  const viewedProds = (db.viewed || []).map((id) => P(id)).filter(Boolean).slice(0, 4);

  // Dữ liệu Chương trình quảng cáo riêng của từng Hãng máy tính (Manufacturer Campaigns)
  const BRAND_CAMPAIGNS = {
    Apple: {
      brand: 'Apple',
      tabLabel: 'Apple MacBook',
      badge: 'CHÍNH HÃNG APPLE VN/A · AUTHORIZED RESELLER',
      title: 'Tuần Lễ MacBook Chính Hãng — Đặc Quyền S-Student Giảm Thêm 1.000.000₫',
      desc: 'Trải nghiệm sức mạnh chip Apple M2 / M3 siêu mượt, thời lượng pin tới 18 giờ. Hỗ trợ Thu cũ lên đời MacBook trợ giá tới 2.500.000₫ & Trả góp 0%.',
      bg: 'linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #334155 100%)',
      perks: ['Giảm thêm 500K – 1 Triệu cho HSSV', 'Thu cũ đổi mới trợ giá 2.5 Triệu', 'Bảo hành chính hãng Apple VN/A 12 tháng'],
      ctaHref: '#/products?brand=Apple',
      realImg: resolveAssetUrl('/uploads/products/real-macbook-pro.jpg'),
    },
    ASUS: {
      brand: 'ASUS',
      tabLabel: 'ASUS / ROG Gaming',
      badge: 'ASUS OFFICIAL CAMPAIGN · TUẦN LỄ ASUS',
      title: 'Tuần Lễ Laptop ASUS — Sắm Máy Cân Bài, Chiến Game Đỉnh Cao',
      desc: 'Từ dòng Zenbook OLED mỏng nhẹ sang trọng, Vivobook đa nhiệm cho tới chiến thần ROG Strix / TUF Gaming RTX 40-Series tần số quét 144Hz–240Hz.',
      bg: 'linear-gradient(135deg, #171A21 0%, #25161C 50%, #BE123C 100%)',
      perks: ['Tặng Balo ASUS ROG + Chuột Gaming', 'Giảm thêm 500K khi thanh toán QR', 'Bảo hành chính hãng ASUS 24 tháng'],
      ctaHref: '#/products?brand=ASUS',
      realImg: resolveAssetUrl('/uploads/products/real-asus-rog.jpg'),
    },
    Lenovo: {
      brand: 'Lenovo',
      tabLabel: 'Lenovo Legion / AI',
      badge: 'LENOVO AI PC FEST · SMARTER TECHNOLOGY',
      title: 'Lễ Hội Laptop AI Lenovo — Đỉnh Cao ThinkPad, IdeaPad &amp; LOQ Gaming',
      desc: 'Bàn phím trứ danh, độ bền chuẩn quân đội Mỹ MIL-STD-810H và tản nhiệt ColdFront mát lạnh trên dòng Lenovo Legion / LOQ Gaming.',
      bg: 'linear-gradient(135deg, #171A21 0%, #201E2B 50%, #E11D48 100%)',
      perks: ['Tặng gói bảo hành Lenovo Premier Support', 'Giảm thêm 3% cho thành viên S-Student', 'Trả góp 0% duyệt hồ sơ 5 phút'],
      ctaHref: '#/products?brand=Lenovo',
      realImg: resolveAssetUrl('/uploads/products/real-lenovo-legion.jpg'),
    },
    MSI: {
      brand: 'MSI',
      tabLabel: 'MSI Gaming Series',
      badge: 'MSI GAMING FESTIVAL · TRUE GAMING',
      title: 'Đại Tiệc MSI Gaming — Sức Mạnh Rồng Đỏ GeForce RTX 40-Series',
      desc: 'Chiến mượt mọi tựa game AAA &amp; Esports cùng MSI Katana, Cyborg và Stealth. Tặng ngay bộ Gear Gaming chính hãng cực chất.',
      bg: 'linear-gradient(135deg, #111318 0%, #1F171A 50%, #9F1239 100%)',
      perks: ['Tặng Balo MSI Dragon + Chuột Gaming', 'Miễn phí vệ sinh & tra keo tản nhiệt trọn đời', 'Trợ giá lên đời Gaming 2 Triệu'],
      ctaHref: '#/products?brand=MSI',
      realImg: resolveAssetUrl('/uploads/products/real-msi-modern.jpg'),
    },
    Dell: {
      brand: 'Dell',
      tabLabel: 'Dell ProSupport',
      badge: 'DELL BRAND WEEK · BỀN BỈ VƯỢT THỜI GIAN',
      title: 'Tuần Lễ Thương Hiệu Dell — Chuẩn Mực Doanh Nhân &amp; Văn Phòng',
      desc: 'Sở hữu Dell Inspiron, Vostro và tuyệt tác XPS với dịch vụ bảo hành tận nơi ProSupport 24/7 uy tín hàng đầu.',
      bg: 'linear-gradient(135deg, #0C4A6E 0%, #0284C7 55%, #1E3A8A 100%)',
      perks: ['Bảo hành tận nơi Dell ProSupport', 'Tặng phần mềm Office + Túi chống sốc', 'Giảm trực tiếp tới 2.000.000₫'],
      ctaHref: '#/products?brand=Dell',
      realImg: resolveAssetUrl('/uploads/products/real-dell-xps.jpg'),
    },
    HP: {
      brand: 'HP',
      tabLabel: 'HP Pavilion / OMEN',
      badge: 'HP TECHNOLOGY WEEK · THIẾT KẾ TINH TẾ',
      title: 'Chuyên Trang Quảng Cáo HP — Mỏng Nhẹ Thanh Lịch, Hiệu Năng Mạnh Mẽ',
      desc: 'Đa dạng lựa chọn từ HP Pavilion, Envy mỏng nhẹ cho tới HP Victus Gaming tản nhiệt OMEN Tempest mạnh mẽ.',
      bg: 'linear-gradient(135deg, #134E4A 0%, #0D9488 55%, #0369A1 100%)',
      perks: ['Ưu đãi HSSV giảm ngay 500.000₫', 'Tặng Chuột không dây HP chính hãng', 'Đổi mới trong 15 ngày đầu'],
      ctaHref: '#/products?brand=HP',
      realImg: resolveAssetUrl('/uploads/products/real-hp-omen-victus.jpg'),
    },
    Acer: {
      brand: 'Acer',
      tabLabel: 'Acer Predator / Swift',
      badge: 'ACER PREDATOR DAY · BẢO HÀNH 3S1',
      title: 'Ngày Hội Acer Chính Hãng — Quốc Dân Gaming Nitro 5 &amp; Swift Go AI',
      desc: 'Hiệu năng trên giá thành tốt nhất phân khúc cùng chế độ bảo hành nhanh 3S1 độc quyền từ Acer Việt Nam.',
      bg: 'linear-gradient(135deg, #14532D 0%, #16A34A 55%, #0F172A 100%)',
      perks: ['Bảo hành nhanh 3S1 (Quá 3 ngày 1 đổi 1)', 'Tặng Balo Gaming Predator SUV', 'Trả góp 0% qua thẻ & CCCD'],
      ctaHref: '#/products?brand=Acer',
      realImg: resolveAssetUrl('/uploads/products/real-acer-predator.jpg'),
    },
  };

  const activeBrandKey = cache.activeBrandCampaign && BRAND_CAMPAIGNS[cache.activeBrandCampaign] ? cache.activeBrandCampaign : 'ASUS';
  const curCampaign = BRAND_CAMPAIGNS[activeBrandKey];
  const brandCampProds = all.filter((p) => p.brand.toLowerCase() === activeBrandKey.toLowerCase());
  const displayBrandProds = (brandCampProds.length ? brandCampProds : all).slice(0, 4);

  // Bộ lọc thông minh tại Smart Showcase (Image 2)
  const activeSmartCat = cache.smartCat || 'all';
  const activeSmartBrand = cache.smartBrand || 'all';
  let smartProds = [...all];
  if (activeSmartCat !== 'all') {
    smartProds = smartProds.filter((p) => String(p.cat) === String(activeSmartCat));
  }
  if (activeSmartBrand !== 'all') {
    smartProds = smartProds.filter((p) => p.brand.toLowerCase() === activeSmartBrand.toLowerCase());
  }
  if (!smartProds.length) smartProds = all;

  return `
  <div class="wrap">
    <!-- SECTION 8: Dải thông tin thương mại điện tử tự chuyển đổi -->
    ${renderTrustSlider()}

    <!-- SECTION 5, 6, 9: Bố cục Hero 3 Cột chuẩn CellphoneS -->
    <section class="cps-hero-sec reveal-on-scroll">
      <div class="cps-hero-grid">
        <!-- Cột Trái (Section 5): 12 Danh mục sản phẩm chuẩn CellphoneS -->
        ${renderCategorySidebar(cats, all)}

        <!-- Cột Giữa (Section 6): Tabs trên + Slider Track Flex 5s + 3 Sub-banners dưới -->
        <div class="hero-center-col" id="hero-slider" tabindex="0" aria-label="Banner chiến dịch nổi bật"
             onmouseenter="A.pauseHero()" onmouseleave="A.resumeHero()"
             onfocusin="A.pauseHero()" onfocusout="A.resumeHero()"
             ontouchstart="A.heroTouchStart(event)" ontouchend="A.heroTouchEnd(event)"
             onkeydown="A.heroKey(event)">

          <!-- 1. Thanh Tab chiến dịch nằm ở PHÍA TRÊN Slider (đồng bộ với slide đang active) -->
          <div class="hs-tabs" style="grid-template-columns: repeat(${Math.min(heroCampaigns.length, 5)}, 1fr)">
            ${heroCampaigns
              .slice(0, 5)
              .map(
                (s, idx) => `
              <div class="hs-tab ${idx === curHero ? 'active' : ''}" onclick="A.goHero(${idx})">
                <div class="hs-tab-title">${esc(s.tabTitle || s.prodName || s.title || 'Chiến dịch')}</div>
                <div class="hs-tab-sub">${esc(s.tabSub || s.badge || 'Ưu đãi hot')}</div>
              </div>
            `,
              )
              .join('')}
          </div>

          <!-- 2. Slider Banner: Container .slider + Track Flex + Caption Overlay + Prev/Next/Dots -->
          <div class="slider">
            <!-- Thanh tiến trình 5s tự động chuyển slide -->
            <div class="hero-progress-track">
              <div class="hero-progress-bar" id="hero-progress-bar"></div>
            </div>

            <!-- Mũi tên chuyển slide nằm đè lên ảnh -->
            <button type="button" class="hs-nav prev" onclick="event.stopPropagation(); event.preventDefault(); A.stepHero(-1)" aria-label="Banner trước">${ic('chevL', 18)}</button>
            <button type="button" class="hs-nav next" onclick="event.stopPropagation(); event.preventDefault(); A.stepHero(1)" aria-label="Banner tiếp theo">${ic('chevR', 18)}</button>

            <!-- Track Flex trượt mượt mà theo trục X -->
            <div class="hero-track" id="hero-track" style="transform: translateX(-${curHero * 100}%)">
              ${heroCampaigns
                .map(
                  (s, idx) => `
                  <a href="${esc(s.targetUrl || s.ctaHref || '#/products')}" 
                     class="hero-slide ${idx === curHero ? 'active' : ''}" 
                     data-slide="${idx}"
                     title="Xem chi tiết ${esc(s.tabTitle || s.prodName || s.title)}">
                    <img src="${esc(s.imgUrl)}" 
                         alt="${esc(s.tabTitle || s.prodName || s.title)}" 
                         class="hero-bg-img" 
                         style="object-position: ${esc(s.imagePosition || 'center center')};"
                         loading="${idx === 0 ? 'eager' : 'lazy'}">
                    ${s.imageMode === 'complete' ? `
                      <!-- Chế độ A: Ảnh poster hoàn chỉnh phủ 100% khung, click toàn banner chuyển trang -->
                    ` : `
                      <!-- Caption góc trái dưới, nền gradient tối mờ, chữ trắng, nút CTA đỏ bo tròn -->
                      <div class="hero-caption">
                        <div class="hero-caption-info">
                          <span class="hero-caption-tag">${esc(s.badge || 'CHÍNH HÃNG APPLE')}</span>
                          <h3 class="hero-caption-title">${esc(s.prodName || s.title)}</h3>
                          <p class="hero-caption-sub">${esc(s.desc || s.tabSub || 'Đặc quyền HSSV giảm 1.000.000₫')}</p>
                        </div>
                        <span class="hero-caption-cta">${esc(s.ctaText || 'Xem chi tiết')} &rarr;</span>
                      </div>
                    `}
                  </a>`,
                )
                .join('')}
            </div>

            <!-- Chấm Indicator chuyển slide -->
            <div class="hs-dots" role="tablist" aria-label="Chỉ báo slide">
              ${heroCampaigns
                .map(
                  (_, idx) =>
                    `<button type="button" class="hs-dot ${idx === curHero ? 'on' : ''}" onclick="event.stopPropagation(); event.preventDefault(); A.goHero(${idx})" aria-label="Chuyển tới banner ${idx + 1}"></button>`,
                )
                .join('')}
            </div>
          </div>

          <!-- 3. Hàng 3 Banner nhỏ ngay dưới slider chính (Hover phóng nhẹ) -->
          <div class="hero-center-subs">
            <a href="#/products?brand=Apple" class="hcs-card">
              <div class="hcs-info">
                <span class="hcs-tag">CHÍNH HÃNG APPLE</span>
                <div class="hcs-title">MacBook Air M3</div>
                <div class="hcs-sub">Đặc quyền HSSV giảm 1.000.000₫</div>
              </div>
              <div class="hcs-thumb">
                <img src="${resolveAssetUrl('/uploads/products/real-macbook-pro.jpg')}" alt="MacBook Chính Hãng VN/A" class="hcs-real-img">
              </div>
            </a>

            <a href="#/products?cat=2" class="hcs-card">
              <div class="hcs-info">
                <span class="hcs-tag">GAMING ROG RTX</span>
                <div class="hcs-title">Chiến Game 165Hz+</div>
                <div class="hcs-sub">Trả góp 0% · Tặng Balo + Gear</div>
              </div>
              <div class="hcs-thumb">
                <img src="${resolveAssetUrl('/uploads/products/real-asus-rog.jpg')}" alt="Laptop Gaming RTX" class="hcs-real-img">
              </div>
            </a>

            <a href="#/products?cat=5" class="hcs-card">
              <div class="hcs-info">
                <span class="hcs-tag">BACK TO SCHOOL</span>
                <div class="hcs-title">Laptop Sinh Viên AI</div>
                <div class="hcs-sub">Giảm trực tiếp đến 2.000.000₫</div>
              </div>
              <div class="hcs-thumb">
                <img src="${resolveAssetUrl('/uploads/products/real-dell-inspiron.jpg')}" alt="Laptop Học Tập Sinh Viên" class="hcs-real-img">
              </div>
            </a>
          </div>
        </div>

        <!-- Cột Phải (Section 9): Box Xin chào + Ưu đãi sinh viên + Thu cũ lên đời + 2 Banner nhỏ -->
        <div class="hero-right-col">
          <!-- 1. Box Tài khoản khách hàng -->
          <div class="member-hero-card">
            ${
              u
                ? `<div class="mhc-top">
                    <div class="mhc-avatar">${esc(u.name.charAt(0).toUpperCase())}</div>
                    <div style="min-width:0">
                      <div style="font-weight:800;font-size:.84rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Hi, ${esc(u.name)}</div>
                      <span class="bd bad" style="font-size:.62rem;padding:1px 6px">Hạng S-Member VIP</span>
                    </div>
                  </div>
                  <div class="row" style="gap:6px;margin-top:6px">
                    <a href="#/account?tab=orders" class="btn a sm grow">Đơn hàng</a>
                    <a href="#/account?tab=warranty" class="btn sm grow">Bảo hành S/N</a>
                  </div>`
                : `<div class="mhc-top">
                    <div class="mhc-avatar">${ic('user', 18)}</div>
                    <div>
                      <div style="font-weight:800;font-size:.84rem">Xin chào Quý khách!</div>
                      <div class="xs muted">Đăng nhập nhận đặc quyền S-Student</div>
                    </div>
                  </div>
                  <div class="row" style="gap:6px;margin-top:6px">
                    <button type="button" class="btn a sm grow" onclick="A.authModal()">Đăng nhập</button>
                    <button type="button" class="btn sm grow" onclick="A.authModal('reg')">Đăng ký</button>
                  </div>`
            }
          </div>

          <!-- 2. Khối Ưu đãi cho sinh viên (3 link có icon) -->
          <div class="priv-box">
            <div class="priv-head">
              <span class="row" style="gap:6px;align-items:center;font-weight:800">${ic('spark', 15)} Ưu đãi cho sinh viên</span>
              <a href="#/products?cat=5"><span class="more">Xem thêm &gt;</span></a>
            </div>
            <a href="#/account" class="priv-item-link">
              <span class="pi-ico">${ic('user', 14)}</span>
              <span>Đăng ký <b>nhận ưu đãi</b></span>
            </a>
            <a href="#/products?cat=5" class="priv-item-link">
              <span class="pi-ico">${ic('tag', 14)}</span>
              <span>Deal hot <b>học sinh sinh viên</b></span>
            </a>
            <a href="#/products?cat=5" class="priv-item-link">
              <span class="pi-ico">${ic('laptop', 14)}</span>
              <span>Laptop <b>ưu đãi khủng</b></span>
            </a>
          </div>

          <!-- 3. Khối Thu cũ lên đời giá hời (2-3 link có icon) -->
          <div class="priv-box">
            <div class="priv-head">
              <span class="row" style="gap:6px;align-items:center;font-weight:800">${ic('refresh', 15)} Thu cũ lên đời giá hời</span>
              <a href="#/tradein"><span class="more">Xem thêm &gt;</span></a>
            </div>
            <a href="#/tradein" class="priv-item-link">
              <span class="pi-ico">${ic('refresh', 14)}</span>
              <span>Định giá máy <b>chuyên sâu trực tuyến</b></span>
            </a>
            <a href="#/tradein" class="priv-item-link">
              <span class="pi-ico">${ic('dollar', 14)}</span>
              <span>Laptop lên đời <b>trợ giá đến 3 Triệu</b></span>
            </a>
            <a href="#/warranty" class="priv-item-link">
              <span class="pi-ico">${ic('shield', 14)}</span>
              <span>Bảo hành điện tử <b>S/N 24 tháng</b></span>
            </a>
          </div>

          <!-- 4. Banner nhỏ khuyến mãi chuẩn CellphoneS Image 2 -->
          <div class="hero-mini-promos">
            <a href="#/promos" class="mini-promo-card-wide">
              <div class="mpw-content">
                <span class="mpw-tag">GIẢM ĐẾN 50% · HOT DEAL</span>
                <div class="mpw-title">Hàng mới đổ bộ</div>
                <div class="mpw-sub">Đại tiệc Voucher Laptop99</div>
              </div>
              <div class="mpw-thumb">
                <img src="${resolveAssetUrl('/uploads/products/real-lenovo-legion.jpg')}" alt="Khuyến mãi" class="mpw-img">
              </div>
            </a>
          </div>
        </div>
      </div>

      <!-- BANNER NGANG FLASH SALE KÈM ĐỒNG HỒ ĐẾM NGƯỢC (THIẾT KẾ CAO CẤP CHUẨN GAMING & E-COMMERCE) -->
      <div class="festival-banner reveal-on-scroll">
        <div class="fb-left">
          <span class="fb-badge-premium"><span class="fb-pulse-dot"></span> <i class="fs-lightning-anim">⚡</i> FLASH SALE GIỜ VÀNG · ĐỘC QUYỀN HÔM NAY</span>
          <div class="fb-text-content">
            <div class="fb-title">ĐẠI TIỆC LAPTOP CHÍNH HÃNG <span class="fb-title-hl">— GIẢM ĐẾN 35% + TRẢ GÓP 0%</span></div>
            <div class="fb-sub">
              <span>Đặc quyền S-Student</span> · <span>Thu cũ trợ giá 3 Triệu</span> · <span>Bảo hành điện tử S/N 24 tháng</span>
            </div>
          </div>
        </div>
        <div class="fb-right">
          <div class="fb-visual-wrap">
            <img src="${resolveAssetUrl('/uploads/products/real-asus-rog.jpg')}" alt="Laptop Flash Sale" class="fb-hero-img">
            <div class="fb-hero-glow"></div>
          </div>
          <div class="fb-countdown-wrap" title="Thời gian còn lại của khung giờ Flash Sale">
            <span class="fb-cd-label">Kết thúc sau:</span>
            <div class="fb-cd-boxes">
              <div class="fc-unit"><span class="fc-num" id="fc-h">04</span><span class="fc-lbl">Giờ</span></div>
              <span class="fc-colon">:</span>
              <div class="fc-unit"><span class="fc-num" id="fc-m">38</span><span class="fc-lbl">Phút</span></div>
              <span class="fc-colon">:</span>
              <div class="fc-unit"><span class="fc-num" id="fc-s">08</span><span class="fc-lbl">Giây</span></div>
            </div>
          </div>
          <button type="button" class="fb-cta-premium" onclick="A.openPromoPopup(true)">
            <span>SĂN VOUCHER NGAY</span> ${ic('arrow', 14)}
          </button>
        </div>
      </div>

      <!-- SECTION 10: Dải 4 Cam Kết & Lợi Ích -->
      ${renderPolicyStrip()}
    </section>

    <!-- KHÁM PHÁ LAPTOP THEO NHU CẦU & THƯƠNG HIỆU (LƯỚI 4 CỘT RÕ RÀNG, TỰ NHIÊN) -->
    <section class="sec reveal-on-scroll">
      <div class="smart-showcase-wrap">
        <div class="sec-head" style="margin-bottom:12px">
          <div class="sec-title-wrap">
            <h2 class="sec-title">💻 KHÁM PHÁ LAPTOP THEO NHU CẦU &amp; THƯƠNG HIỆU</h2>
          </div>
          <div class="sec-quick-links">
            <a href="#/compare" class="btn sm">⚖ So sánh cấu hình</a>
            <a href="#/products" class="btn sm a">Xem tất cả (${all.length}) ${ic('chevR', 14)}</a>
          </div>
        </div>

        <!-- Hàng 1: 6 Nút Danh Mục kèm Icon trực quan -->
        <div class="cat-thumb-pills">
          <button type="button" class="ctp-item ${activeSmartCat === 'all' ? 'active' : ''}" onclick="A.setSmartFilter('cat','all')">
            <span class="ctp-icon">${ic('spark', 16)}</span>
            <span>Tất cả nổi bật</span>
          </button>
          <button type="button" class="ctp-item ${activeSmartCat === '1' ? 'active' : ''}" onclick="A.setSmartFilter('cat','1')">
            <span class="ctp-icon">${ic('laptop', 16)}</span>
            <span>Văn phòng</span>
          </button>
          <button type="button" class="ctp-item ${activeSmartCat === '2' ? 'active' : ''}" onclick="A.setSmartFilter('cat','2')">
            <span class="ctp-icon">${ic('cpu', 16)}</span>
            <span>Gaming</span>
          </button>
          <button type="button" class="ctp-item ${activeSmartCat === '3' ? 'active' : ''}" onclick="A.setSmartFilter('cat','3')">
            <span class="ctp-icon">${ic('scale', 16)}</span>
            <span>Mỏng nhẹ</span>
          </button>
          <button type="button" class="ctp-item ${activeSmartCat === '4' ? 'active' : ''}" onclick="A.setSmartFilter('cat','4')">
            <span class="ctp-icon">${ic('box', 16)}</span>
            <span>Đồ họa - kỹ thuật</span>
          </button>
          <button type="button" class="ctp-item ${activeSmartCat === '5' ? 'active' : ''}" onclick="A.setSmartFilter('cat','5')">
            <span class="ctp-icon">${ic('tag', 16)}</span>
            <span>Sinh viên</span>
          </button>
        </div>

        <!-- Hàng 2: Các Nút Thương Hiệu (MacBook, ASUS, Lenovo, MSI, Acer, HP, Dell, LG) -->
        <div class="brand-filter-pills">
          <button type="button" class="bfp-pill ${activeSmartBrand === 'all' ? 'active' : ''}" onclick="A.setSmartFilter('brand','all')">Tất cả hãng</button>
          <button type="button" class="bfp-pill ${activeSmartBrand === 'Apple' ? 'active' : ''}" onclick="A.setSmartFilter('brand','Apple')">MacBook</button>
          <button type="button" class="bfp-pill ${activeSmartBrand === 'ASUS' ? 'active' : ''}" onclick="A.setSmartFilter('brand','ASUS')">ASUS</button>
          <button type="button" class="bfp-pill ${activeSmartBrand === 'Lenovo' ? 'active' : ''}" onclick="A.setSmartFilter('brand','Lenovo')">Lenovo</button>
          <button type="button" class="bfp-pill ${activeSmartBrand === 'MSI' ? 'active' : ''}" onclick="A.setSmartFilter('brand','MSI')">MSI</button>
          <button type="button" class="bfp-pill ${activeSmartBrand === 'Acer' ? 'active' : ''}" onclick="A.setSmartFilter('brand','Acer')">Acer</button>
          <button type="button" class="bfp-pill ${activeSmartBrand === 'HP' ? 'active' : ''}" onclick="A.setSmartFilter('brand','HP')">HP</button>
          <button type="button" class="bfp-pill ${activeSmartBrand === 'Dell' ? 'active' : ''}" onclick="A.setSmartFilter('brand','Dell')">Dell</button>
          <button type="button" class="bfp-pill ${activeSmartBrand === 'LG' ? 'active' : ''}" onclick="A.setSmartFilter('brand','LG')">LG</button>
          <a href="#/products" class="bfp-pill view-all">Xem tất cả &gt;</a>
        </div>

        <!-- Hàng 3: Lưới sản phẩm 4 cột tự nhiên, cân đối -->
        <div class="pg">
          ${smartProds.slice(0, 8).map(pcard).join('')}
        </div>
      </div>
    </section>

    <!-- CHƯƠNG TRÌNH QUẢNG CÁO RIÊNG DO TỪNG HÃNG MÁY TÍNH TỔ CHỨC -->
    <section class="sec reveal-on-scroll">
      <div class="brand-campaign-section">
        <div class="sec-head" style="margin-bottom:10px">
          <div class="sec-title-wrap">
            <h2 class="sec-title">🏢 CHUYÊN TRANG THƯƠNG HIỆU &amp; QUÀ TẶNG TỪ HÃNG</h2>
          </div>
          <span class="xs muted" style="font-weight:700">Chọn hãng để xem ưu đãi &amp; sản phẩm chính hãng</span>
        </div>

        <!-- Tabs chọn Hãng máy tính -->
        <div class="brand-campaign-tabs">
          ${Object.values(BRAND_CAMPAIGNS)
            .map(
              (c) => `
            <button type="button" class="bct-btn ${c.brand === activeBrandKey ? 'active' : ''}" onclick="A.switchBrandCampaign('${c.brand}')">
              <span>${c.tabLabel}</span>
            </button>
          `,
            )
            .join('')}
        </div>

        <!-- Banner Chiến dịch Quảng cáo riêng của Hãng đang chọn (Thiết kế Flagship Pavilion cao cấp) -->
        <div class="brand-campaign-banner" style="background: ${curCampaign.bg}">
          <div>
            <span class="bcb-badge">${curCampaign.badge}</span>
            <h3 class="bcb-title">${curCampaign.title}</h3>
            <p class="bcb-desc">${curCampaign.desc}</p>
            <div class="bcb-perks">
              ${curCampaign.perks.map((pk) => `<span class="bcb-perk">✓ ${esc(pk)}</span>`).join('')}
            </div>
            <div class="row" style="gap:10px">
              <a href="${curCampaign.ctaHref}" class="btn lg" style="background:#fff;color:#BE123C;border-color:#fff;font-weight:800;box-shadow:0 4px 14px rgba(0,0,0,0.25)">
                Xem toàn bộ Laptop ${esc(curCampaign.brand)} ${ic('arrow', 15)}
              </a>
              <button type="button" class="btn lg" style="background:rgba(255,255,255,0.15);color:#fff;border-color:rgba(255,255,255,0.35);backdrop-filter:blur(8px)" onclick="A.openPromoPopup(true)">
                ${ic('tag', 15)} Săn Voucher ${esc(curCampaign.brand)}
              </button>
            </div>
          </div>
          <div class="bcb-visual">
            <div class="bcb-visual-img-wrap">
              <img src="${esc(curCampaign.realImg || displayBrandProds[0]?.thumbnail || resolveAssetUrl('/uploads/products/real-macbook-pro.jpg'))}" alt="${esc(curCampaign.brand)}" class="bcb-real-img">
            </div>
            <div class="bcb-visual-info">
              <span class="bcb-visual-badge">Tâm điểm ${esc(curCampaign.brand)}</span>
              <div class="bcb-visual-title">${esc(displayBrandProds[0]?.name || curCampaign.title)}</div>
              <div class="bcb-visual-price">${vnd(displayBrandProds[0]?.price || 19990000)}</div>
              <a href="#/product/${displayBrandProds[0]?.id || 'p1'}" class="bcb-visual-link">Khám phá cấu hình chi tiết →</a>
            </div>
          </div>
        </div>

        <!-- Lưới sản phẩm thuộc Chiến dịch của Hãng -->
        <div class="pg">
          ${displayBrandProds.map(pcard).join('')}
        </div>
      </div>
    </section>


    <!-- SECTION 11.1: KHUYẾN MÃI ĐANG DIỄN RA (HOT SALE) -->
    ${
      hotDeals.length
        ? `
    <section class="sec reveal-on-scroll">
      <div class="sec-box hot-deal">
        <div class="sec-head">
          <div class="sec-title-wrap">
            <h2 class="sec-title">🔥 KHUYẾN MÃI ĐANG DIỄN RA — DEAL GIẢM SÂU</h2>
          </div>
          <div class="sec-quick-links">
            <a href="#/promos" class="btn sm" style="background:rgba(255,255,255,0.16);color:#fff;border-color:rgba(255,255,255,0.3)">Săn mã giảm giá</a>
            <a href="#/products?sort=asc" class="btn sm" style="background:#fff;color:var(--acc);border-color:#fff">Xem tất cả ${ic('chevR', 14)}</a>
          </div>
        </div>

        ${
          highlightDeal
            ? `
        <div class="highlight-deal-card">
          <a href="#/product/${highlightDeal.id}" class="hdc-thumb-frame" title="${esc(highlightDeal.name)}">
            ${pimg(highlightDeal, 'hdc-img')}
          </a>
          <div>
            <div class="row" style="gap:8px;align-items:center;margin-bottom:6px">
              <span class="hdc-badge-fire">🔥 Deal Tâm Điểm Giờ Vàng · Tiết kiệm ${vnd(highlightDeal.old - highlightDeal.price)}</span>
            </div>
            <div class="hdc-price-row">
              <div class="hdc-price">${vnd(highlightDeal.price)}</div>
              ${highlightDeal.old > highlightDeal.price ? `<div class="hdc-old">${vnd(highlightDeal.old)}</div>` : ''}
              ${highlightDeal.old > highlightDeal.price ? `<span class="hdc-discount-tag">-${Math.round((1 - highlightDeal.price / highlightDeal.old) * 100)}%</span>` : ''}
            </div>
            <div class="hdc-progress-bar-wrap" title="Tỷ lệ xuất kho khung giờ vàng">
              <div class="hdc-progress-fill" style="width: 82%"></div>
            </div>
            <a href="#/product/${highlightDeal.id}" class="hdc-title-link">${esc(highlightDeal.name)}</a>
            <div class="hdc-specs-chips">
              <span class="hdc-spec-chip">⚡ ${esc(highlightDeal.cpu)}</span>
              <span class="hdc-spec-chip">💾 RAM ${esc(highlightDeal.ram)}</span>
              <span class="hdc-spec-chip">🚀 ${esc(highlightDeal.ssd)}</span>
              <span class="hdc-spec-chip">🎮 ${esc(highlightDeal.gpu)}</span>
              <span class="hdc-spec-chip">🖥 ${esc(highlightDeal.screen)}</span>
            </div>
          </div>
          <div class="gap" style="gap:10px;min-width:185px">
            <a class="btn a lg" href="#/product/${highlightDeal.id}" style="box-shadow:0 4px 18px rgba(225,29,72,0.45);font-weight:800">
              Mua ngay giá sốc ${ic('arrow', 15)}
            </a>
            <button type="button" class="btn lg" style="background:rgba(255,255,255,0.12);color:#FFFFFF;border-color:rgba(255,255,255,0.25);backdrop-filter:blur(8px)" onclick="A.add('${highlightDeal.id}')">
              ${ic('cart', 15)} Thêm vào giỏ
            </button>
          </div>
        </div>`
            : ''
        }

        <div class="pg">${hotDeals.slice(0, 4).map(pcard).join('')}</div>
      </div>
    </section>`
        : ''
    }

    <!-- SECTION 11.2: LAPTOP BÁN CHẠY NHẤT -->
    <section class="sec reveal-on-scroll">
      <div class="sec-box">
        <div class="sec-head">
          <div class="sec-title-wrap">
            <h2 class="sec-title">🏆 LAPTOP BÁN CHẠY NHẤT HỆ THỐNG</h2>
          </div>
          <div class="sec-quick-links">
            ${cats
              .slice(0, 4)
              .map((c) => `<a href="#/products?cat=${c.id}" class="sec-qlink">${esc(c.name)}</a>`)
              .join('')}
            <a href="#/products?sort=pop" class="btn sm a">Xem tất cả ${ic('chevR', 14)}</a>
          </div>
        </div>
        <div class="pg">${bestSellers.slice(0, 8).map(pcard).join('')}</div>
      </div>
    </section>

    <!-- SECTION 11.3: LAPTOP GAMING NỔI BẬT -->
    <section class="sec reveal-on-scroll">
      <div class="sec-box">
        <div class="sec-head">
          <div class="sec-title-wrap">
            <h2 class="sec-title">🎮 LAPTOP GAMING NỔI BẬT</h2>
          </div>
          <div class="sec-quick-links">
            <a href="#/products?cat=2&brand=ASUS" class="sec-qlink">ASUS ROG / TUF</a>
            <a href="#/products?cat=2&brand=MSI" class="sec-qlink">MSI Gaming</a>
            <a href="#/products?cat=2&brand=Acer" class="sec-qlink">Acer Nitro</a>
            <a href="#/products?cat=2&brand=Lenovo" class="sec-qlink">Lenovo LOQ / Legion</a>
            <a href="#/products?cat=2" class="btn sm a">Xem tất cả ${ic('chevR', 14)}</a>
          </div>
        </div>
        <div class="pg">${gamingProds.slice(0, 4).map(pcard).join('')}</div>
      </div>
    </section>

    <!-- SECTION 11.4: MACBOOK CHÍNH HÃNG & MỎNG NHẸ -->
    <section class="sec reveal-on-scroll">
      <div class="sec-box">
        <div class="sec-head">
          <div class="sec-title-wrap">
            <h2 class="sec-title">🍎 MACBOOK CHÍNH HÃNG &amp; LAPTOP MỎNG NHẸ</h2>
          </div>
          <div class="sec-quick-links">
            <a href="#/products?brand=Apple" class="sec-qlink">MacBook Air / Pro</a>
            <a href="#/products?cat=3&brand=ASUS" class="sec-qlink">ASUS Zenbook</a>
            <a href="#/products?cat=3&brand=LG" class="sec-qlink">LG Gram</a>
            <a href="#/products?cat=3" class="btn sm a">Xem tất cả ${ic('chevR', 14)}</a>
          </div>
        </div>
        <div class="pg">${slimProds.slice(0, 4).map(pcard).join('')}</div>
      </div>
    </section>

    <!-- SECTION 11.5: LAPTOP VĂN PHÒNG & DOANH NHÂN -->
    <section class="sec reveal-on-scroll">
      <div class="sec-box">
        <div class="sec-head">
          <div class="sec-title-wrap">
            <h2 class="sec-title">💼 LAPTOP VĂN PHÒNG &amp; DOANH NHÂN</h2>
          </div>
          <div class="sec-quick-links">
            <a href="#/products?cat=1" class="sec-qlink">Laptop Văn Phòng</a>
            <a href="#/products?cat=6" class="sec-qlink">Doanh Nhân Cao Cấp</a>
            <a href="#/products?brand=Dell" class="sec-qlink">Dell Inspiron / XPS</a>
            <a href="#/products?brand=Lenovo" class="sec-qlink">Lenovo ThinkPad</a>
            <a href="#/products?cat=1" class="btn sm a">Xem tất cả ${ic('chevR', 14)}</a>
          </div>
        </div>
        <div class="pg">${officeProds.slice(0, 4).map(pcard).join('')}</div>
      </div>
    </section>

    <!-- SECTION 11.6 & 11.7: LAPTOP SINH VIÊN & ĐỒ HỌA KỸ THUẬT -->
    <section class="sec reveal-on-scroll">
      <div class="sec-box">
        <div class="sec-head">
          <div class="sec-title-wrap">
            <h2 class="sec-title">🎓 LAPTOP SINH VIÊN &amp; ĐỒ HỌA – KỸ THUẬT</h2>
          </div>
          <div class="sec-quick-links">
            <a href="#/products?cat=5" class="sec-qlink">Laptop Sinh Viên</a>
            <a href="#/products?cat=4" class="sec-qlink">Đồ Họa – Kỹ Thuật</a>
            <a href="#/products?price=u15" class="sec-qlink">Dưới 15 triệu</a>
            <a href="#/products?cat=5" class="btn sm a">Xem tất cả ${ic('chevR', 14)}</a>
          </div>
        </div>
        <div class="pg">${[...studentProds, ...creatorProds].slice(0, 4).map(pcard).join('')}</div>
      </div>
    </section>

    <!-- SECTION 11.9: SẢN PHẨM MỚI VỀ -->
    <section class="sec reveal-on-scroll">
      <div class="sec-box">
        <div class="sec-head">
          <div class="sec-title-wrap">
            <h2 class="sec-title">✨ SẢN PHẨM MỚI LÊN KỆ</h2>
          </div>
          <div class="sec-quick-links">
            <a href="#/products?sort=new" class="btn sm a">Xem tất cả máy mới ${ic('chevR', 14)}</a>
          </div>
        </div>
        <div class="pg">${newArrivals.map(pcard).join('')}</div>
      </div>
    </section>

    <!-- SẢN PHẨM ĐÃ XEM GẦN ĐÂY -->
    ${
      viewedProds.length
        ? `
    <section class="sec reveal-on-scroll">
      <div class="sec-box">
        <div class="sec-head">
          <h2 class="sec-title">${ic('eye', 19)} SẢN PHẨM BẠN ĐÃ XEM GẦN ĐÂY</h2>
          <button type="button" class="btn sm" onclick="db.viewed=[];save();render()">Xóa lịch sử xem</button>
        </div>
        <div class="pg">${viewedProds.map(pcard).join('')}</div>
      </div>
    </section>`
        : ''
    }

    <!-- TIN CÔNG NGHỆ & BÁO CHÍ TRONG CÁC TUẦN QUA (LIÊN KẾT BÁO THẬT) -->
    ${
      news.length
        ? `
    <section class="sec reveal-on-scroll" style="padding-bottom:24px">
      <div class="sec-box">
        <div class="sec-head">
          <div class="sec-title-wrap">
            <h2 class="sec-title">${ic('news', 19)} TIN TỨC CÔNG NGHỆ MỚI NHẤT TRONG TUẦN</h2>
          </div>
          <div class="sec-quick-links">
            <a href="https://vnexpress.net/so-hoa" target="_blank" rel="noopener noreferrer" class="sec-qlink">VnExpress Số Hóa ↗</a>
            <a href="https://tinhte.vn/tag/laptop" target="_blank" rel="noopener noreferrer" class="sec-qlink">Tinh Tế ↗</a>
            <a href="https://genk.vn/may-tinh.chn" target="_blank" rel="noopener noreferrer" class="sec-qlink">GenK ↗</a>
            <a class="btn sm a" href="#/news">Tất cả tin công nghệ ${ic('chevR', 14)}</a>
          </div>
        </div>
        <div class="three">
          ${news
            .map((n) => {
              const imgUrl = resolveAssetUrl(n.img || '/uploads/news/news-macbook-pro-m4.jpg');
              const extUrl = n.url || 'https://vnexpress.net/so-hoa/san-pham';
              const srcName = n.source || 'VnExpress Số Hóa';
              return `
            <article class="news-card-editorial">
              <a href="#/news?open=${n.id}" class="news-thumb-box" title="${esc(n.title)}">
                <img src="${esc(imgUrl)}" alt="${esc(n.title)}" class="news-thumb-img" loading="lazy">
                <span class="news-tag-overlay">${esc(n.tag || 'CÔNG NGHỆ')}</span>
              </a>
              <div class="news-content-box">
                <div class="news-meta-row">
                  <span class="news-source-badge">📰 ${esc(srcName)} <i>✓</i></span>
                  <span>${sd(n.at)}</span>
                  <span>⏱ 4 phút đọc</span>
                </div>
                <a href="#/news?open=${n.id}" class="news-title-link">
                  <h3 class="news-title-text">${esc(n.title)}</h3>
                </a>
                <p class="news-body-snippet">${esc(n.body)}</p>
              </div>
              <div class="news-actions-footer">
                <a href="#/news?open=${n.id}" class="news-btn-summary">
                  ${ic('book', 13)} Tóm tắt nhanh
                </a>
                <a href="${esc(extUrl)}" target="_blank" rel="noopener noreferrer" class="news-btn-source">
                  Đọc trên ${esc(srcName)} ↗
                </a>
              </div>
            </article>
          `;
            })
            .join('')}
        </div>
      </div>
    </section>`
        : ''
    }

    <!-- NÚT NỔI SĂN ƯU ĐÃI & VOUCHER KHUYẾN MÃI (BẤM VÀO ĐỂ MỞ POPUP ƯU ĐÃI BẤT KỲ LÚC NÀO) -->
    <button type="button" class="floating-promo-btn" onclick="A.openPromoPopup(true)" title="Xem các voucher và chương trình ưu đãi đang diễn ra">
      ${ic('tag', 16)}
      <span>Ưu Đãi Hot ${promos.length ? `(${promos.length})` : ''}</span>
    </button>
  </div>`;
}

