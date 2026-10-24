/* ==========================================================================
   LAYOUT COMPONENTS LAYER (MVC):
   - Section 3: Top Info Bar (Seamless Marquee)
   - Section 4: Sticky Main Header + Quick Subnav + Mobile Drawer
   - Section 5: Left Category Sidebar with Mega Flyout Submenu
   - Section 8: Trust Message Rotator (Option B)
   - Section 10: 4 Commitment & Benefit Strip
   - Section 12: Multi-Column Footer
   ========================================================================== */

const TOPBAR_MESSAGES = [
  { icon: 'shield', title: '100% Hàng chính hãng', sub: 'Phân phối chính ngạch Apple, Dell, ASUS, Lenovo, HP, MSI, Acer, LG' },
  { icon: 'check', title: 'Bảo hành điện tử theo số Serial (S/N)', sub: 'Kích hoạt tự động & tra cứu trực tuyến 24/7' },
  { icon: 'refresh', title: 'Đổi trả dễ dàng trong 15 ngày', sub: 'Hỗ trợ tạo phiếu đổi trả RMA trực tuyến nếu lỗi NSX' },
  { icon: 'truck', title: 'Miễn phí giao hàng toàn quốc', sub: 'Theo điều kiện áp dụng · Được đồng kiểm khi nhận máy' },
  { icon: 'tag', title: 'Ưu đãi & Mã giảm giá trực tiếp', sub: 'Áp dụng voucher giảm ngay tại bước thanh toán' },
  { icon: 'spark', title: 'Thu cũ lên đời trợ giá cao', sub: 'Định giá minh bạch 3 bước · Trừ thẳng vào đơn hàng mới' },
];

function renderTopInfoBar() {
  return `
  <!-- Thanh chính sách tối giản cao cấp chuẩn giao diện tham chiếu -->
  <div class="top-info-bar-dark">
    <div class="wrap tib-inner">
      <div class="tib-left">
        <span class="tib-item"><span class="tib-icon">${ic('truck', 14)}</span> Miễn phí giao hàng toàn quốc</span>
        <span class="tib-item"><span class="tib-icon">${ic('shield', 14)}</span> Bảo hành chính hãng 100%</span>
        <span class="tib-item"><span class="tib-icon">${ic('refresh', 14)}</span> Đổi trả trong 7 ngày</span>
        <span class="tib-item"><span class="tib-icon">${ic('tag', 14)}</span> Trả góp 0%</span>
      </div>
      <div class="tib-right">
        <a href="tel:18006888" class="tib-item tib-hotline">
          <span class="tib-icon">📞</span> Hotline: <b>1800 6888</b>
        </a>
      </div>
    </div>
  </div>`;
}

function renderCategorySidebar(cats = [], allProducts = []) {
  // 9 Danh mục chuẩn theo thiết kế tham chiếu
  const SIDEBAR_ITEMS = [
    {
      name: 'Laptop Gaming',
      sub: 'RTX 4060, 4070, 4080, 4090...',
      href: '#/products?cat=2',
      icon: 'cpu',
      brands: ['ASUS', 'MSI', 'Acer', 'Lenovo', 'Dell'],
      catParam: 'cat=2',
      active: true,
    },
    {
      name: 'MacBook',
      sub: 'MacBook Air, Pro, M1, M2, M3...',
      href: '#/products?brand=Apple',
      icon: 'spark',
      brands: ['Apple'],
      catParam: 'brand=Apple',
    },
    {
      name: 'Laptop Văn Phòng',
      sub: 'Dell, HP, Lenovo, ASUS...',
      href: '#/products?cat=1',
      icon: 'laptop',
      brands: ['Dell', 'HP', 'Lenovo', 'ASUS', 'Acer'],
      catParam: 'cat=1',
    },
    {
      name: 'Laptop Sinh Viên',
      sub: 'Giá tốt, cấu hình ổn định...',
      href: '#/products?cat=5',
      icon: 'tag',
      brands: ['Acer', 'ASUS', 'HP', 'Lenovo'],
      catParam: 'cat=5',
    },
    {
      name: 'Đồ Họa - Kỹ Thuật',
      sub: 'Render, AutoCAD, Photoshop...',
      href: '#/products?cat=4',
      icon: 'box',
      brands: ['Dell', 'Apple', 'ASUS', 'Lenovo'],
      catParam: 'cat=4',
    },
    {
      name: 'Màn Hình - PC',
      sub: 'Màn hình 2K/4K, PC Gaming...',
      href: '#/products?q=man+hinh',
      icon: 'scale',
      brands: ['LG', 'Dell', 'ASUS', 'Samsung'],
      catParam: 'q=man+hinh',
    },
    {
      name: 'Phụ Kiện Laptop',
      sub: 'Chuột, balo, tản nhiệt...',
      href: '#/products?q=phu+kien',
      icon: 'headset',
      brands: ['Logitech', 'Apple', 'ASUS', 'Razer'],
      catParam: 'q=phu+kien',
    },
    {
      name: 'Laptop Cũ',
      sub: 'Chất lượng, bảo hành uy tín...',
      href: '#/products?q=cu',
      icon: 'refresh',
      brands: ['Apple', 'Dell', 'Lenovo', 'HP'],
      catParam: 'q=cu',
    },
    {
      name: 'Dịch Vụ',
      sub: 'Nâng cấp, sửa chữa, vệ sinh...',
      href: '#/services',
      icon: 'book',
      brands: ['Vệ sinh Laptop', 'Cài đặt Windows', 'Nâng cấp RAM/SSD'],
      catParam: '',
    },
  ];

  return `<aside class="cat-sidebar cat-sidebar-dark" aria-label="Danh mục sản phẩm">
    ${SIDEBAR_ITEMS
      .map(
        (item) => {
          const prodsInCat = allProducts.filter((p) => {
            if (item.catParam.startsWith('cat=')) return String(p.cat) === item.catParam.split('=')[1];
            if (item.catParam.startsWith('brand=')) return p.brand === item.catParam.split('=')[1];
            return false;
          });
          const spotProd = prodsInCat[0] || allProducts[0];

          return `<div class="cat-side-row ${item.active ? 'active-row' : ''}">
            <a href="${item.href}" class="cat-side-item">
              <div class="cat-side-l">
                <span class="cat-side-ic">${ic(item.icon, 16)}</span>
                <div class="cat-side-txt">
                  <span class="cat-title">${esc(item.name)}</span>
                  <small class="cat-sub">${esc(item.sub)}</small>
                </div>
              </div>
              <div class="cat-side-r">
                ${ic('chevR', 13)}
              </div>
            </a>
            <div class="cat-mega-flyout">
              <div class="mega-cols">
                <div>
                  <div class="mega-h">Thương hiệu nổi bật</div>
                  <div class="mega-links">
                    ${item.brands
                      .map(
                        (b) =>
                          `<a href="#/products?${item.catParam ? item.catParam + '&' : ''}brand=${encodeURIComponent(b)}"><span>Laptop ${esc(b)}</span> ${ic('chevR', 12)}</a>`,
                      )
                      .join('')}
                  </div>
                </div>
                <div>
                  <div class="mega-h">Chọn theo mức giá</div>
                  <div class="mega-links">
                    <a href="#/products?${item.catParam ? item.catParam + '&' : ''}price=u15"><span>Dưới 15 triệu</span> ${ic('chevR', 12)}</a>
                    <a href="#/products?${item.catParam ? item.catParam + '&' : ''}price=m1"><span>Từ 15 – 25 triệu</span> ${ic('chevR', 12)}</a>
                    <a href="#/products?${item.catParam ? item.catParam + '&' : ''}price=m2"><span>Từ 25 – 40 triệu</span> ${ic('chevR', 12)}</a>
                    <a href="#/products?${item.catParam ? item.catParam + '&' : ''}price=o40"><span>Trên 40 triệu</span> ${ic('chevR', 12)}</a>
                    <a href="#/products?${item.catParam ? item.catParam + '&' : ''}ram=16"><span>RAM 16GB đa nhiệm</span> ${ic('chevR', 12)}</a>
                  </div>
                </div>
              </div>
              ${
                spotProd
                  ? `<div class="mega-spot">
                  <div style="min-width:0">
                    <span class="xs acc" style="font-weight:700;text-transform:uppercase">Sản phẩm tiêu biểu</span>
                    <a href="#/product/${spotProd.id}" style="display:block;font-weight:700;font-size:.84rem;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">${esc(spotProd.name)}</a>
                    <span style="font-size:.86rem;font-weight:800;color:var(--promo)">${vnd(spotProd.price)}</span>
                  </div>
                  <a href="${item.href}" class="btn a sm">Xem tất cả ${ic('arrow', 13)}</a>
                </div>`
                  : ''
              }
            </div>
          </div>`;
        },
      )
      .join('')}
  </aside>`;
}

const TRUST_MESSAGES = [
  { icon: 'refresh', title: 'Đổi trả trong 15 ngày theo chính sách', sub: 'Hỗ trợ tạo yêu cầu đổi trả (RMA) trực tuyến nhanh chóng ngay trong trang Tài khoản' },
  { icon: 'check', title: 'Bảo hành điện tử theo số Serial (S/N)', sub: 'Kích hoạt tự động & tra cứu thời hạn bảo hành minh bạch 24/7' },
  { icon: 'shield', title: 'Sản phẩm Chính hãng 100% xuất VAT đầy đủ', sub: 'Phân phối ủy quyền từ Apple, Dell, ASUS, Lenovo, HP, MSI, Acer' },
  { icon: 'truck', title: 'Giao nhanh - Miễn phí đơn 300k', sub: 'Được mở hộp đồng kiểm ngoại hình & phụ kiện trước khi thanh toán' },
];

function renderTrustSlider() {
  const cur = cache.trustIdx || 0;
  return `<div class="trust-rotator-bar" id="trust-rotator" onmouseenter="A.pauseTrust()" onmouseleave="A.resumeTrust()">
    <span class="tr-badge">${ic('spark', 12)} CAM KẾT LAPTOP99</span>
    <div class="tr-stage" aria-live="polite">
      ${TRUST_MESSAGES.map(
        (m, idx) => `<div class="tr-msg ${idx === cur ? 'active' : ''}" data-trust-idx="${idx}">
          <span class="tr-msg-ic">${ic(m.icon, 15)}</span>
          <b>${esc(m.title)}</b>
          <span class="sub">— ${esc(m.sub)}</span>
        </div>`,
      ).join('')}
    </div>
    <div class="tr-controls">
      <button type="button" class="tr-btn" onclick="A.stepTrust(-1)" aria-label="Thông điệp trước">${ic('chevL', 13)}</button>
      <button type="button" class="tr-btn" onclick="A.stepTrust(1)" aria-label="Thông điệp tiếp theo">${ic('chevR', 13)}</button>
    </div>
  </div>`;
}

function renderPolicyStrip() {
  return `<div class="policy-strip">
    <div class="pol-item">
      <div class="pol-ic">${ic('shield', 22)}</div>
      <div class="pol-txt">
        <b>Hàng chính hãng 100%</b>
        <span>Nguyên seal, đầy đủ phụ kiện chuẩn NSX</span>
      </div>
    </div>
    <div class="pol-item">
      <div class="pol-ic">${ic('check', 22)}</div>
      <div class="pol-txt">
        <b>Bảo hành điện tử S/N</b>
        <span>Định danh theo số Serial máy 12–24 tháng</span>
      </div>
    </div>
    <div class="pol-item">
      <div class="pol-ic">${ic('refresh', 22)}</div>
      <div class="pol-txt">
        <b>Đổi trả theo chính sách</b>
        <span>1 đổi 1 trong 15 ngày nếu lỗi phần cứng</span>
      </div>
    </div>
    <div class="pol-item">
      <div class="pol-ic">${ic('truck', 22)}</div>
      <div class="pol-txt">
        <b>Giao hàng &amp; Hỗ trợ tận tâm</b>
        <span>Miễn phí vận chuyển, hỗ trợ trả góp 0%</span>
      </div>
    </div>
  </div>`;
}

function renderFooter() {
  return `<footer class="ft">
    <div class="wrap">
      <div class="ftg">
        <div>
          <div style="margin-bottom:10px">
            <a href="#/" class="logo">${brandLogo('footer')}</a>
          </div>
          <p class="sm" style="line-height:1.6;margin-bottom:12px;color:#AEB4BF">
            Hệ thống bán lẻ Laptop chính hãng Văn phòng, Gaming, Đồ họa – Kỹ thuật, Doanh nhân &amp; MacBook. Tích hợp định danh bảo hành điện tử theo số Serial (S/N) và chương trình Thu cũ đổi mới minh bạch.
          </p>
          <div>
            <span class="xs" style="font-weight:700;color:#F9FAFB;text-transform:uppercase">Phương thức thanh toán hỗ trợ:</span>
            <div class="pay-badges">
              <span class="pay-badge">Tiền mặt (COD)</span>
              <span class="pay-badge">Chuyển khoản 24/7</span>
              <span class="pay-badge">Thẻ Tín dụng / Ghi nợ</span>
              <span class="pay-badge">Trả góp 0%</span>
            </div>
          </div>
        </div>
        <div>
          <h4>Danh mục Laptop</h4>
          ${(cache.cats || []).map((c) => `<a href="#/products?cat=${c.id}">${esc(c.name)} ${c.count ? `(${c.count})` : ''}</a>`).join('')}
          <a href="#/products?brand=Apple">MacBook Chính Hãng</a>
        </div>
        <div>
          <h4>Hướng dẫn &amp; Dịch vụ</h4>
          <a href="#/products">Tìm kiếm &amp; Lọc cấu hình</a>
          <a href="#/compare">So sánh chi tiết Laptop</a>
          <a href="#/tradein">Thu cũ đổi mới (Smart Trade-In)</a>
          <a href="#/promos">Săn mã giảm giá &amp; Voucher</a>
          <a href="#/news">Tin công nghệ &amp; Tư vấn mua máy</a>
        </div>
        <div>
          <h4>Chính sách &amp; Bảo hành</h4>
          <a href="#/warranty">Tra cứu bảo hành theo S/N</a>
          <a href="#/account?tab=warranty">Sổ bảo hành điện tử của tôi</a>
          <a href="#/account?tab=rma">Chính sách đổi trả RMA 15 ngày</a>
          <a href="#/account?tab=orders">Chính sách vận chuyển &amp; Kiểm hàng</a>
        </div>
        <div>
          <h4>Tổng đài &amp; Hỗ trợ</h4>
          <div style="background:#1A1E27;border:1px solid #343943;border-radius:8px;padding:8px 10px;font-size:.76rem;color:#F9FAFB;margin-bottom:10px">
            Tư vấn mua hàng: <b style="color:var(--acc)">1800.6868</b><br>
            Bảo hành &amp; Kỹ thuật: <b style="color:var(--acc)">1800.6869</b>
          </div>
          <a href="#/account">Quản lý Tài khoản &amp; Đơn hàng</a>
          <a href="#/wishlist">Danh sách sản phẩm yêu thích</a>
          <a href="#/compare">So sánh cấu hình Laptop</a>
        </div>
      </div>
      <div class="row between xs" style="padding-top:18px;border-top:1px solid #343943;color:#AEB4BF">
        <span>© 2026 Laptop99 — Hệ thống Thương mại Điện tử Laptop Chính hãng.</span>
        <span>Chính hãng 100% · Bảo hành điện tử S/N · Thu cũ lên đời</span>
      </div>
    </div>
  </footer>`;
}

function renderContactWidget() {
  const cmpList = (db.compare || []).map((id) => P(id)).filter(Boolean);

  return `
  <!-- Thanh So Sánh Nhanh Nổi Dưới Đáy Khi Có Sản Phẩm So Sánh -->
  ${
    cmpList.length > 0
      ? `<div class="quick-cmp-bar">
        <span style="font-size:.78rem;font-weight:800;color:var(--acc)">⚖ Đang chọn so sánh (${cmpList.length}/3):</span>
        <div class="row" style="gap:6px">
          ${cmpList
            .map(
              (cp) =>
                `<span class="bd bad" style="background:#FFF1F2">${esc(cp.brand)} ${esc(cp.name.slice(0, 16))}... <button type="button" onclick="A.cmp('${cp.id}')" style="margin-left:3px;font-weight:900">×</button></span>`,
            )
            .join('')}
        </div>
        <a href="#/compare" class="btn a sm">So sánh ngay →</a>
      </div>`
      : ''
  }

  <!-- Floating Contact Button & Menu (Liên hệ Zalo & Hotline tư vấn trực tiếp) -->
  <div class="fab-contact-wrap" id="fab-contact-wrap">
    <div class="fab-contact-menu" id="fab-contact-menu">
      <button type="button" class="fab-menu-item" onclick="A.openZaloModal()">
        <span class="fab-menu-ico zalo">Zalo</span>
        <div>
          <div style="font-weight:800;font-size:.82rem">Liên hệ Zalo Official</div>
          <div class="xs muted" style="font-weight:500">Tư vấn viên hỗ trợ trực tiếp</div>
        </div>
      </button>
      <button type="button" class="fab-menu-item" onclick="A.openHotlineModal()">
        <span class="fab-menu-ico call">📞</span>
        <div>
          <div style="font-weight:800;font-size:.82rem">Gọi Hotline 1800.6868</div>
          <div class="xs muted" style="font-weight:500">Miễn phí cước (8:00 – 22:00)</div>
        </div>
      </button>
    </div>

    <button type="button" class="fab-contact-btn" onclick="A.toggleContactMenu()" aria-label="Liên hệ hỗ trợ">
      <span>Liên hệ</span>
      ${ic('headset', 18)}
    </button>
  </div>`;
}

function storeShell(inner, r) {
  const cc = db.cart.reduce((s, i) => s + i.qty, 0);
  const cm = (db.compare || []).length;
  const cw = (db.wishlist || []).length;
  const u = me();
  const cur = r.parts[0] || '';

  return `
  <!-- Section 3: Top Info Bar Dark Theme -->
  ${renderTopInfoBar()}

  <!-- Section 4: Sticky Main Header Dark Theme -->
  <header class="nav nav-dark" id="nav">
    <div class="wrap nv">
      <!-- 1. Logo Web Laptop99 -->
      <a href="#/" class="logo" title="Trang chủ Laptop99">
        ${brandLogo('header')}
      </a>

      <!-- 2. Thanh tìm kiếm sản phẩm trung tâm (Rounded Pill + Red Circle Button) -->
      <div class="search-box-wrap" id="sb-wrap">
        <form class="ns modern-search-form" onsubmit="return A.nsearch(event)">
          <input id="nq" autocomplete="off" placeholder="Bạn muốn tìm laptop gì hôm nay? (VD: MacBook M3, ASUS, ...)" value="${esc(r.q.q || '')}"
                 onfocus="A.showSuggest()" oninput="A.liveSuggest(this.value)" onkeydown="A.searchKey(event)">
          <button type="button" id="nq-clear" class="ns-clear" style="display:${r.q.q ? 'inline-flex' : 'none'}" onclick="A.clearSearch()" title="Xóa">${ic('x', 14)}</button>
          <button type="submit" class="ns-btn-round" aria-label="Tìm kiếm">${ic('search', 16)}</button>
        </form>
        <div id="search-sug" class="sug-dropdown" style="display:none"></div>
      </div>

      <!-- 3. Nút So sánh, Yêu thích, Giỏ hàng, Tài khoản theo chuẩn thiết kế tham chiếu -->
      <div class="nr nr-modern">
        <a class="nav-act" href="#/compare" title="So sánh sản phẩm">
          <span class="nav-act-ico">${ic('scale', 18)}</span> <span class="lbl">So sánh</span>
          ${cm ? `<i class="nav-badge">${cm}</i>` : ''}
        </a>
        <a class="nav-act" href="#/wishlist" title="Sản phẩm yêu thích">
          <span class="nav-act-ico">${ic('heart', 18)}</span> <span class="lbl">Yêu thích</span>
          <i class="nav-badge">${cw || 3}</i>
        </a>
        <a class="nav-act" href="#/cart" title="Giỏ hàng">
          <span class="nav-act-ico">${ic('cart', 18)}</span> <span class="lbl">Giỏ hàng</span>
          <i class="nav-badge">${cc || 2}</i>
        </a>
        ${
          u
            ? `<a class="nav-btn-login" href="#/account" title="Tài khoản của tôi">${ic('user', 15)} <span>${esc(u.name.split(' ').pop())}</span></a>`
            : `<button type="button" class="nav-btn-login" onclick="A.authModal()">${ic('user', 15)} <span>Đăng nhập</span></button>`
        }
        <button type="button" class="ib mnu" onclick="A.toggleMenu()" aria-label="Mở menu">${ic('menu', 18)}</button>
      </div>
    </div>
  </header>

  <!-- Thanh Sub-navigation theo phân khúc (Có nút Danh mục sản phẩm màu đỏ bên trái) -->
  <div class="subnav-bar subnav-bar-dark">
    <div class="wrap subnav-in">
      <div class="subnav-cat-btn-wrap">
        <div class="cat-dropdown-wrap">
          <button type="button" class="cat-pill-red-btn" onclick="this.parentElement.classList.toggle('open')">
            ${ic('menu', 15)} <span>Danh mục sản phẩm</span> ${ic('chevD', 13)}
          </button>
          <div class="cat-pop">
            ${(cache.cats || [])
              .map(
                (c) => `
              <a href="#/products?cat=${c.id}" class="cat-pop-item">
                <span>${esc(c.name)}</span>
                <span class="cat-pop-cnt">${c.count || ''}</span>
              </a>
            `,
              )
              .join('')}
            <div style="border-top:1px solid rgba(255,255,255,0.1);margin:4px 0"></div>
            <a href="#/products?brand=Apple" class="cat-pop-item" style="color:var(--brand-red)">
              <span>MacBook Chính Hãng</span> ${ic('chevR', 13)}
            </a>
            <a href="#/products" class="cat-pop-item" style="color:var(--brand-red);font-weight:700">
              <span>Xem toàn bộ Laptop</span> ${ic('arrow', 13)}
            </a>
          </div>
        </div>
      </div>
      <div class="subnav-links">
        <a href="#/products?cat=2" class="${r.q.cat === '2' ? 'on' : ''}">Laptop Gaming</a>
        <a href="#/products?brand=Apple" class="${r.q.brand === 'Apple' ? 'on' : ''}">MacBook</a>
        <a href="#/products?cat=1" class="${r.q.cat === '1' ? 'on' : ''}">Laptop Văn Phòng</a>
        <a href="#/products?cat=5" class="${r.q.cat === '5' ? 'on' : ''}">Laptop Sinh Viên</a>
        <a href="#/products?cat=4" class="${r.q.cat === '4' ? 'on' : ''}">Laptop Đồ Họa - Kỹ Thuật</a>
        <a href="#/products?q=phu+kien">Phụ Kiện</a>
        <a href="#/products?q=man+hinh">Màn Hình</a>
        <a href="#/services">Dịch Vụ</a>
      </div>
    </div>
  </div>

  <!-- Mobile Navigation Drawer -->
  <div class="mobile-drawer-backdrop" id="m-drawer" onclick="A.toggleMenu()">
    <div class="mobile-drawer" onclick="event.stopPropagation()">
      <div class="row between" style="padding-bottom:12px;border-bottom:1px solid var(--line);margin-bottom:12px">
        <a href="#/" class="logo" onclick="A.toggleMenu()">${brandLogo('full')}</a>
        <button class="ib" onclick="A.toggleMenu()">${ic('x', 16)}</button>
      </div>
      <div class="gap" style="gap:6px">
        <p class="xs muted" style="font-weight:700;text-transform:uppercase">Điều hướng nhanh</p>
        <a href="#/" class="cat-pop-item" onclick="A.toggleMenu()">Trang chủ</a>
        <a href="#/products" class="cat-pop-item" onclick="A.toggleMenu()">Tất cả Laptop</a>
        <a href="#/products?brand=Apple" class="cat-pop-item" onclick="A.toggleMenu()">MacBook Chính Hãng</a>
        <a href="#/products?cat=2" class="cat-pop-item" onclick="A.toggleMenu()">Laptop Gaming</a>
        <a href="#/products?cat=1" class="cat-pop-item" onclick="A.toggleMenu()">Laptop Văn Phòng</a>
        <a href="#/products?cat=5" class="cat-pop-item" onclick="A.toggleMenu()">Laptop Sinh Viên</a>
        <a href="#/tradein" class="cat-pop-item" onclick="A.toggleMenu()">Thu cũ đổi mới</a>
        <a href="#/promos" class="cat-pop-item" onclick="A.toggleMenu()">Khuyến mãi &amp; Voucher</a>
        <a href="#/warranty" class="cat-pop-item" onclick="A.toggleMenu()">Tra cứu bảo hành S/N</a>
        <a href="#/news" class="cat-pop-item" onclick="A.toggleMenu()">Tin công nghệ</a>
        <a href="#/wishlist" class="cat-pop-item" onclick="A.toggleMenu()">Sản phẩm yêu thích (${cw})</a>
        <a href="#/compare" class="cat-pop-item" onclick="A.toggleMenu()">So sánh sản phẩm (${cm})</a>
        <p class="xs muted" style="font-weight:700;text-transform:uppercase;margin-top:10px">Danh mục sản phẩm</p>
        ${(cache.cats || [])
          .map(
            (c) =>
              `<a href="#/products?cat=${c.id}" class="cat-pop-item" onclick="A.toggleMenu()"><span>${esc(c.name)}</span><span class="cat-pop-cnt">${c.count || ''}</span></a>`,
          )
          .join('')}
      </div>
    </div>
  </div>

  <main id="main-content" class="main-content">${inner}</main>

  <!-- Floating Contact Widget -->
  ${renderContactWidget()}

  <!-- Floating Back-to-Top Button -->
  <button type="button" id="back-to-top" class="back-to-top" onclick="A.backToTop()" aria-label="Lên đầu trang" title="Lên đầu trang">
    ${ic('chevL', 18)}
  </button>

  <!-- Section 12: Footer -->
  ${renderFooter()}`;
}


