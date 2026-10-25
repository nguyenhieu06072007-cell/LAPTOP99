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

  // Phân loại banner theo vị trí từ CSDL
  const heroBanners = dbBanners.filter((b) => !b.position || b.position === 'hero');
  const flashSaleBanner = dbBanners.find((b) => b.position === 'flash_sale');
  const brandBanners = dbBanners.filter((b) => b.position === 'brand_showcase');
  const hotDealBanner = dbBanners.find((b) => b.position === 'hot_deal');

  let heroCampaigns = [];
  const bannersForHero = heroBanners.length > 0 ? heroBanners : (dbBanners.length > 0 ? dbBanners.slice(0, 4) : []);
  if (bannersForHero.length > 0) {
    heroCampaigns = bannersForHero.map((b) => {
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

  // Tích hợp dữ liệu Chuyên trang Thương hiệu từ Database (Admin CMS)
  const BG_THEME_MAP = {
    dark: 'linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #334155 100%)',
    crimson: 'linear-gradient(135deg, #18090C 0%, #2A0F17 50%, #BE123C 100%)',
    indigo: 'linear-gradient(135deg, #171A21 0%, #25161C 50%, #BE123C 100%)',
    blue: 'linear-gradient(135deg, #0C4A6E 0%, #0284C7 55%, #1E3A8A 100%)',
    emerald: 'linear-gradient(135deg, #064E3B 0%, #059669 55%, #0F172A 100%)',
    purple: 'linear-gradient(135deg, #2E1065 0%, #7C3AED 55%, #0F172A 100%)',
    amber: 'linear-gradient(135deg, #451A03 0%, #B45309 55%, #1C1917 100%)',
  };

  brandBanners.forEach((dbB) => {
    if (!dbB.brand) return;
    const matchKey = Object.keys(BRAND_CAMPAIGNS).find(
      (k) => k.toLowerCase() === dbB.brand.toLowerCase()
    );
    if (matchKey && BRAND_CAMPAIGNS[matchKey]) {
      const c = BRAND_CAMPAIGNS[matchKey];
      if (dbB.badge_text) c.badge = dbB.badge_text;
      if (dbB.title) c.title = dbB.title;
      if (dbB.subtitle) c.desc = dbB.subtitle;
      if (dbB.image_url) c.realImg = resolveAssetUrl(dbB.image_url);
      if (dbB.cta_link) c.ctaHref = dbB.cta_link;
      if (dbB.cta_text) c.ctaText = dbB.cta_text;
      if (dbB.secondary_cta_text) c.secondaryCtaText = dbB.secondary_cta_text;
      if (dbB.secondary_cta_link) c.secondaryCtaLink = dbB.secondary_cta_link;
      if (dbB.bg_theme && BG_THEME_MAP[dbB.bg_theme]) c.bg = BG_THEME_MAP[dbB.bg_theme];
      if (dbB.product_id) c.linkedProd = P('p' + dbB.product_id) || all.find((p) => p.rawId === Number(dbB.product_id));
      if (dbB.custom_price) c.customPrice = Number(dbB.custom_price);
      if (dbB.perks_json) {
        try {
          const arr = typeof dbB.perks_json === 'string' ? JSON.parse(dbB.perks_json) : dbB.perks_json;
          if (Array.isArray(arr) && arr.length) c.perks = arr;
        } catch (e) {}
      }
    }
  });

  const activeBrandKey = cache.activeBrandCampaign && BRAND_CAMPAIGNS[cache.activeBrandCampaign] ? cache.activeBrandCampaign : 'Apple';
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

  // Chuẩn bị danh sách 5 sản phẩm bán chạy tiêu biểu (hoặc lọc theo tab)
  let bestSellerList = [...all];
  if (activeSmartCat !== 'all') {
    bestSellerList = bestSellerList.filter((p) => String(p.cat) === String(activeSmartCat));
  }
  if (activeSmartBrand !== 'all') {
    bestSellerList = bestSellerList.filter((p) => p.brand.toLowerCase() === activeSmartBrand.toLowerCase());
  }
  if (!bestSellerList.length) bestSellerList = all;
  const bestSellers5 = bestSellerList.slice(0, 5);

  return `
  <div class="wrap modern-home-wrap">
    <!-- SECTION HERO 3 CỘT: DANH MỤC TRÁI + BANNER MSI RAIDER GIỮA + KHỐI TIỆN ÍCH PHẢI -->
    <section class="cps-hero-sec modern-hero-sec reveal-on-scroll">
      <div class="cps-hero-grid modern-hero-grid">
        <!-- Cột 1 (Trái): 9 Danh mục sản phẩm theme tối sang trọng -->
        ${renderCategorySidebar(cats, all)}

        <!-- Cột 2 (Giữa): Banner Game MSI RAIDER GE78HX 13VH Đẳng Cấp -->
        <div class="hero-center-col modern-hero-banner" id="hero-slider" tabindex="0" aria-label="Banner chiến dịch nổi bật"
             onmouseenter="A.pauseHero()" onmouseleave="A.resumeHero()">
          
          <div class="mhb-card">
            <div class="mhb-top-row">
              <div class="mhb-brand-logo">
                <svg width="78" height="26" viewBox="0 0 100 32" fill="none">
                  <path d="M12 4L4 12V28H12V14L20 22L28 14V28H36V12L28 4L20 12L12 4Z" fill="#E11D48"/>
                  <text x="44" y="24" fill="#FFFFFF" font-family="'Inter',sans-serif" font-weight="900" font-size="22">msi</text>
                </svg>
              </div>
              <span class="mhb-bestseller-badge">BEST SELLER</span>
            </div>

            <div class="mhb-content-wrap">
              <div class="mhb-text-box">
                <h2 class="mhb-main-title">RAIDER GE78HX 13VH</h2>
                <p class="mhb-sub-title">Sức mạnh tối thượng cho game thủ</p>
                
                <div class="mhb-specs-grid">
                  <div class="mhb-spec-box">
                    <span class="mhb-sb-val">i9 13980HX</span>
                    <span class="mhb-sb-lbl">Intel Core™</span>
                  </div>
                  <div class="mhb-spec-box">
                    <span class="mhb-sb-val">32GB</span>
                    <span class="mhb-sb-lbl">DDR5 RAM</span>
                  </div>
                  <div class="mhb-spec-box">
                    <span class="mhb-sb-val">2TB</span>
                    <span class="mhb-sb-lbl">SSD</span>
                  </div>
                  <div class="mhb-spec-box">
                    <span class="mhb-sb-val">RTX 4080</span>
                    <span class="mhb-sb-lbl">Laptop GPU</span>
                  </div>
                </div>

                <a href="#/products?cat=2" class="mhb-cta-btn">
                  <span>Xem chi tiết</span> &rarr;
                </a>
              </div>

              <div class="mhb-visual-box">
                <img src="${resolveAssetUrl('/uploads/msi_raider_laptop_seamless.png')}" alt="MSI Raider GE78HX" class="mhb-laptop-img">
              </div>
            </div>

            <!-- Left / Right Navigation Arrows -->
            <button type="button" class="mhb-nav-arrow prev" onclick="event.stopPropagation(); A.stepHero(-1)" aria-label="Banner trước">${ic('chevL', 16)}</button>
            <button type="button" class="mhb-nav-arrow next" onclick="event.stopPropagation(); A.stepHero(1)" aria-label="Banner tiếp theo">${ic('chevR', 16)}</button>

            <!-- Bottom feature pills -->
            <div class="mhb-bottom-features">
              <div class="mhb-bf-item"><span class="mhb-bf-ico">⚡</span> Hiệu năng vượt trội</div>
              <div class="mhb-bf-item"><span class="mhb-bf-ico">❄️</span> Tản nhiệt Cooler Boost</div>
              <div class="mhb-bf-item"><span class="mhb-bf-ico">🖥️</span> Màn hình 240Hz</div>
              <div class="mhb-bf-item"><span class="mhb-bf-ico">💎</span> Thiết kế đẳng cấp</div>
            </div>
          </div>
        </div>

        <!-- Cột 3 (Phải): 4 Box Widget Đăng nhập + Ưu đãi + Thu cũ + Phụ kiện -->
        <div class="hero-right-col modern-right-col">
          <!-- Widget 1: Box Xin chào Quý khách -->
          <div class="mrc-user-card">
            <div class="mrc-user-top">
              <div class="mrc-avatar-circle">${ic('user', 20)}</div>
              <div class="mrc-user-info">
                <div class="mrc-user-greeting">${u ? 'Hi, ' + esc(u.name) : 'Xin chào Quý khách!'}</div>
                <div class="mrc-user-sub">${u ? 'Thành viên S-Member VIP' : 'Đăng nhập để có trải nghiệm tốt hơn'}</div>
              </div>
            </div>
            <div class="mrc-btn-row">
              ${
                u
                  ? `<a href="#/account?tab=orders" class="mrc-btn-login" style="text-decoration:none">Đơn hàng</a>
                     <a href="#/account?tab=warranty" class="mrc-btn-reg" style="text-decoration:none">Bảo hành S/N</a>`
                  : `<button type="button" class="mrc-btn-login" onclick="A.authModal()">Đăng nhập</button>
                     <button type="button" class="mrc-btn-reg" onclick="A.authModal('reg')">Đăng ký</button>`
              }
            </div>
          </div>

          <!-- Widget 2: Khối Ưu đãi sinh viên & Deal hot -->
          <div class="mrc-promo-card">
            <a href="#/products?cat=5" class="mrc-promo-row">
              <div class="mrc-pr-icon-red">🎓</div>
              <div class="mrc-pr-text">
                <div class="mrc-pr-title">Ưu đãi cho sinh viên</div>
                <div class="mrc-pr-desc">Giảm thêm đến 5% khi mua laptop</div>
              </div>
              <span class="mrc-pr-arrow">Xem ngay &gt;</span>
            </a>
            <a href="#/promos" class="mrc-promo-row">
              <div class="mrc-pr-icon-red">🏷️</div>
              <div class="mrc-pr-text">
                <div class="mrc-pr-title">Deal hot mỗi ngày</div>
                <div class="mrc-pr-desc">Sản phẩm giá tốt, số lượng có hạn</div>
              </div>
            </a>
            <a href="#/tradein" class="mrc-promo-row">
              <div class="mrc-pr-icon-red">🔄</div>
              <div class="mrc-pr-text">
                <div class="mrc-pr-title">Laptop cũ đổi mới</div>
                <div class="mrc-pr-desc">Trợ giá lên đến 3 triệu</div>
              </div>
            </a>
          </div>

          <!-- Widget 3: Thu cũ lên đời giá tốt nhất -->
          <div class="mrc-tradein-card">
            <a href="#/tradein" class="mrc-tradein-row">
              <div class="mrc-pr-icon-red">🔄</div>
              <div class="mrc-pr-text">
                <div class="mrc-pr-title">Thu cũ lên đời - Giá tốt nhất</div>
                <div class="mrc-pr-desc">Định giá nhanh - Thu mua tận nơi</div>
              </div>
              <span class="mrc-pr-arrow">Xem ngay &gt;</span>
            </a>
          </div>

          <!-- Widget 4: Banner Phụ kiện giảm đến 50% -->
          <div class="mrc-mini-banner">
            <a href="#/products?q=phu+kien" class="mrc-mb-link">
              <div class="mrc-mb-text">
                <div class="mrc-mb-badge">Giảm đến 50%</div>
                <div class="mrc-mb-title">Phụ kiện · Balo · Chuột · Túi chống sốc</div>
                <div class="mrc-mb-cta">Mua ngay &gt;</div>
              </div>
              <div class="mrc-mb-thumb">
                <img src="${resolveAssetUrl('/uploads/accessory_thumb.png')}" alt="Phụ kiện" class="mrc-mb-img">
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- DẢI LOGO THƯƠNG HIỆU NỔI BẬT (ASUS, ACER, DELL, HP, LENOVO, APPLE, MSI) -->
    <section class="sec brand-logos-strip-sec reveal-on-scroll">
      <div class="brand-logos-card">
        <span class="blc-title">THƯƠNG HIỆU NỔI BẬT</span>
        <div class="blc-logos-track">
          <a href="#/products?brand=ASUS" class="blc-item" title="Laptop ASUS"><img src="${resolveAssetUrl('/uploads/brands/asus.svg')}" alt="ASUS" onerror="this.src='uploads/brands/asus.png'"></a>
          <a href="#/products?brand=Acer" class="blc-item" title="Laptop Acer"><img src="${resolveAssetUrl('/uploads/brands/acer.svg')}" alt="Acer" onerror="this.src='uploads/brands/acer.png'"></a>
          <a href="#/products?brand=Dell" class="blc-item" title="Laptop Dell"><img src="${resolveAssetUrl('/uploads/brands/dell.svg')}" alt="Dell" onerror="this.src='uploads/brands/dell.png'"></a>
          <a href="#/products?brand=HP" class="blc-item" title="Laptop HP"><img src="${resolveAssetUrl('/uploads/brands/hp.svg')}" alt="HP" onerror="this.src='uploads/brands/hp.png'"></a>
          <a href="#/products?brand=Lenovo" class="blc-item" title="Laptop Lenovo"><img src="${resolveAssetUrl('/uploads/brands/lenovo.svg')}" alt="Lenovo" onerror="this.src='uploads/brands/lenovo.png'"></a>
          <a href="#/products?brand=Apple" class="blc-item" title="MacBook Apple"><img src="${resolveAssetUrl('/uploads/brands/apple.svg')}" alt="Apple" onerror="this.src='uploads/brands/apple.png'"></a>
          <a href="#/products?brand=MSI" class="blc-item" title="Laptop MSI"><img src="${resolveAssetUrl('/uploads/brands/msi.svg')}" alt="MSI" onerror="this.src='uploads/brands/msi.png'"></a>
        </div>
      </div>
    </section>

    <!-- SẢN PHẨM BÁN CHẠY (TẤT CẢ, GAMING, MACBOOK, VĂN PHÒNG, SINH VIÊN, ĐỒ HỌA) -->
    <section class="sec best-sellers-sec reveal-on-scroll">
      <div class="bss-head">
        <div class="bss-left">
          <h2 class="bss-title">SẢN PHẨM BÁN CHẠY</h2>
          <div class="bss-tabs">
            <button type="button" class="bss-tab ${activeSmartCat === 'all' && activeSmartBrand === 'all' ? 'active' : ''}" onclick="A.setSmartFilter('cat','all'); A.setSmartFilter('brand','all')">Tất cả</button>
            <button type="button" class="bss-tab ${activeSmartCat === '2' ? 'active' : ''}" onclick="A.setSmartFilter('cat','2')">Laptop Gaming</button>
            <button type="button" class="bss-tab ${activeSmartBrand === 'Apple' ? 'active' : ''}" onclick="A.setSmartFilter('brand','Apple')">MacBook</button>
            <button type="button" class="bss-tab ${activeSmartCat === '1' ? 'active' : ''}" onclick="A.setSmartFilter('cat','1')">Laptop Văn Phòng</button>
            <button type="button" class="bss-tab ${activeSmartCat === '5' ? 'active' : ''}" onclick="A.setSmartFilter('cat','5')">Laptop Sinh Viên</button>
            <button type="button" class="bss-tab ${activeSmartCat === '4' ? 'active' : ''}" onclick="A.setSmartFilter('cat','4')">Đồ Họa - Kỹ Thuật</button>
          </div>
        </div>
        <div class="bss-nav-arrows">
          <button type="button" class="bss-arrow" onclick="A.stepBestSellers(-1)" aria-label="Trước">${ic('chevL', 14)}</button>
          <button type="button" class="bss-arrow" onclick="A.stepBestSellers(1)" aria-label="Tiếp">${ic('chevR', 14)}</button>
        </div>
      </div>

      <!-- Lưới 5 Cột Sản Phẩm Bán Chạy -->
      <div class="pg pg-5cols">
        ${bestSellers5.map(pcard).join('')}
      </div>
    </section>

    <!-- BANNER NGANG TOÀN KHUNG: MACBOOK PRO 16" M3 PRO SANG TRỌNG -->
    <section class="sec reveal-on-scroll">
      <div class="macbook-showcase-banner">
        <div class="msb-left">
          <img src="${resolveAssetUrl('/uploads/banner_macbook_laptop_seamless.png')}" alt="MacBook Pro 16 M3 Pro" class="msb-img">
        </div>
        <div class="msb-center">
          <div class="msb-title-row">
            <span class="msb-apple-logo">🍎</span>
            <h3 class="msb-title">MacBook Pro 16" M3 Pro</h3>
          </div>
          <p class="msb-sub">Hiệu năng vượt trội - Sáng tạo không giới hạn</p>
          
          <div class="msb-specs-row">
            <div class="msb-spec-chip">
              <span class="msb-sc-ico">⚡</span>
              <div>
                <div class="msb-sc-v">M3 Pro</div>
                <div class="msb-sc-l">Chip Apple</div>
              </div>
            </div>
            <div class="msb-spec-chip">
              <span class="msb-sc-ico">🧠</span>
              <div>
                <div class="msb-sc-v">18GB</div>
                <div class="msb-sc-l">Unified Memory</div>
              </div>
            </div>
            <div class="msb-spec-chip">
              <span class="msb-sc-ico">💾</span>
              <div>
                <div class="msb-sc-v">512GB</div>
                <div class="msb-sc-l">SSD</div>
              </div>
            </div>
          </div>

          <a href="#/products?brand=Apple" class="msb-cta-btn">
            <span>Khám phá ngay</span> &rarr;
          </a>
        </div>
        <div class="msb-right">
          <div class="msb-feature-col">
            <div class="msb-feat-ico">⚡</div>
            <div class="msb-feat-txt">Hiệu suất mạnh mẽ</div>
          </div>
          <div class="msb-feature-col">
            <div class="msb-feat-ico">🖥️</div>
            <div class="msb-feat-txt">Màn hình Liquid Retina XDR</div>
          </div>
          <div class="msb-feature-col">
            <div class="msb-feat-ico">🔋</div>
            <div class="msb-feat-txt">Pin bền bỉ cả ngày</div>
          </div>
          <div class="msb-feature-col">
            <div class="msb-feat-ico">💎</div>
            <div class="msb-feat-txt">Thiết kế tinh tế</div>
          </div>
        </div>
      </div>
    </section>

    <!-- BANNER NGANG FLASH SALE KÈM ĐỒNG HỒ ĐẾM NGƯỢC (ĐỒNG BỘ TỪ ADMIN CMS) -->
    <section class="sec flash-sale-sec reveal-on-scroll">
      ${(() => {
        const fsTitle = flashSaleBanner ? esc(flashSaleBanner.title) : 'ĐẠI TIỆC LAPTOP CHÍNH HÃNG';
        const fsHl = flashSaleBanner && flashSaleBanner.highlight_text ? ('— ' + esc(flashSaleBanner.highlight_text)) : '— GIẢM ĐẾN 35% + TRẢ GÓP 0%';
        const fsBadge = flashSaleBanner?.badge_text ? esc(flashSaleBanner.badge_text) : '⚡ FLASH SALE GIỜ VÀNG • ĐỘC QUYỀN HÔM NAY';
        let fsSubHtml = '<span>Đặc quyền S-Student</span> • <span>Thu cũ trợ giá 3 Triệu</span> • <span>Bảo hành điện tử S/N 24 tháng</span>';
        if (flashSaleBanner && flashSaleBanner.perks_json) {
          try {
            const p = typeof flashSaleBanner.perks_json === 'string' ? JSON.parse(flashSaleBanner.perks_json) : flashSaleBanner.perks_json;
            if (Array.isArray(p) && p.length) {
              fsSubHtml = p.map((x) => '<span>' + esc(x) + '</span>').join(' • ');
            }
          } catch(e) {}
        } else if (flashSaleBanner && flashSaleBanner.subtitle) {
          fsSubHtml = '<span>' + esc(flashSaleBanner.subtitle) + '</span>';
        }
        const fsImg = resolveAssetUrl(flashSaleBanner?.image_url || '/uploads/products/real-asus-rog.jpg');
        const fsCtaText = flashSaleBanner?.cta_text || 'SĂN VOUCHER NGAY';
        const fsCtaLink = flashSaleBanner?.cta_link || '#/promos';

        return `
      <div class="festival-banner reveal-on-scroll">
        <div class="fb-left">
          <span class="fb-badge-premium"><span class="fb-pulse-dot"></span> <i class="fs-lightning-anim">⚡</i> ${fsBadge}</span>
          <div class="fb-text-content">
            <div class="fb-title">${fsTitle} <span class="fb-title-hl">${fsHl}</span></div>
            <div class="fb-sub">
              ${fsSubHtml}
            </div>
          </div>
        </div>
        <div class="fb-right">
          <div class="fb-visual-wrap">
            <img src="${fsImg}" alt="Laptop Flash Sale" class="fb-hero-img" loading="lazy">
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
          <a href="${fsCtaLink}" class="fb-cta-premium" style="text-decoration:none">
            <span>${esc(fsCtaText)}</span> ${ic('arrow', 14)}
          </a>
        </div>
      </div>`;
      })()}

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
              <img src="${esc(curCampaign.realImg || curCampaign.linkedProd?.thumbnail || displayBrandProds[0]?.thumbnail || resolveAssetUrl('/uploads/products/real-macbook-pro.jpg'))}" alt="${esc(curCampaign.brand)}" class="bcb-real-img" loading="lazy">
            </div>
            <div class="bcb-visual-info">
              <span class="bcb-visual-badge">Tâm điểm ${esc(curCampaign.brand)}</span>
              <div class="bcb-visual-title">${esc(curCampaign.linkedProd?.name || displayBrandProds[0]?.name || curCampaign.title)}</div>
              <div class="bcb-visual-price">${vnd(curCampaign.customPrice || curCampaign.linkedProd?.price || displayBrandProds[0]?.price || 19990000)}</div>
              <a href="#/product/${curCampaign.linkedProd?.id || displayBrandProds[0]?.id || 'p1'}" class="bcb-visual-link">Khám phá cấu hình chi tiết →</a>
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
            ? (() => {
          const dealProd = (hotDealBanner && hotDealBanner.product_id ? P('p' + hotDealBanner.product_id) : null) || highlightDeal;
          if (!dealProd) return '';
          const dealBadge = hotDealBanner?.badge_text || ('🔥 Deal Tâm Điểm Giờ Vàng • Tiết kiệm ' + vnd((dealProd.old || 0) - (dealProd.price || 0)));
          const dealPrice = Number(hotDealBanner?.custom_price) || dealProd.price;
          const dealOldPrice = Number(hotDealBanner?.custom_old_price) || dealProd.old;
          const dealTitle = hotDealBanner?.title || dealProd.name;
          const dealImg = resolveAssetUrl(hotDealBanner?.image_url || dealProd.thumbnail);
          const dealSpecs = hotDealBanner?.specs_json
            ? hotDealBanner.specs_json.split(',').map((s) => s.trim()).filter(Boolean)
            : [dealProd.cpu, 'RAM ' + dealProd.ram, dealProd.ssd, dealProd.gpu, dealProd.screen].filter(Boolean);
          const dealCta = hotDealBanner?.cta_text || 'Mua ngay giá sốc';
          const dealLink = hotDealBanner?.cta_link || ('#/product/' + dealProd.id);
          const dealSecCta = hotDealBanner?.secondary_cta_text || 'Thêm vào giỏ';

          return `
        <div class="highlight-deal-card">
          <a href="${dealLink}" class="hdc-thumb-frame" title="${esc(dealTitle)}">
            <img src="${dealImg}" alt="${esc(dealTitle)}" class="hdc-img" loading="lazy">
          </a>
          <div>
            <div class="row" style="gap:8px;align-items:center;margin-bottom:6px">
              <span class="hdc-badge-fire">${dealBadge}</span>
            </div>
            <div class="hdc-price-row">
              <div class="hdc-price">${vnd(dealPrice)}</div>
              ${dealOldPrice > dealPrice ? '<div class="hdc-old">' + vnd(dealOldPrice) + '</div>' : ''}
              ${dealOldPrice > dealPrice ? '<span class="hdc-discount-tag">-' + Math.round((1 - dealPrice / dealOldPrice) * 100) + '%</span>' : ''}
            </div>
            <div class="hdc-progress-bar-wrap" title="Tỷ lệ xuất kho khung giờ vàng">
              <div class="hdc-progress-fill" style="width: 82%"></div>
            </div>
            <a href="${dealLink}" class="hdc-title-link">${esc(dealTitle)}</a>
            <div class="hdc-specs-chips">
              ${dealSpecs.map((sp) => '<span class="hdc-spec-chip">' + esc(sp) + '</span>').join('')}
            </div>
          </div>
          <div class="gap" style="gap:10px;min-width:185px">
            <a class="btn a lg" href="${dealLink}" style="box-shadow:0 4px 18px rgba(225,29,72,0.45);font-weight:800;text-decoration:none">
              ${esc(dealCta)} ${ic('arrow', 15)}
            </a>
            <button type="button" class="btn lg" style="background:rgba(255,255,255,0.12);color:#FFFFFF;border-color:rgba(255,255,255,0.25);backdrop-filter:blur(8px)" onclick="A.add('${dealProd.id}')">
              ${ic('cart', 15)} ${esc(dealSecCta)}
            </button>
          </div>
        </div>`;
        })()
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

