/* ==========================================================================
   CATALOG, PRODUCT DETAIL, COMPARE & WISHLIST VIEWS (MVC)
   ========================================================================== */

async function viewProducts(r) {
  await ensureCategories();
  const q = r.q;

  const params = new URLSearchParams();
  if (q.cat) params.set('cat', q.cat);
  if (q.brand) params.set('brand', q.brand);
  if (q.price) params.set('price', q.price);
  if (q.ram) params.set('ram', q.ram);
  if (q.q) params.set('q', q.q);
  if (q.sort && q.sort !== 'rate') params.set('sort', q.sort);
  if (q.cpu) params.set('cpu', q.cpu);
  if (q.ssd) params.set('ssd', q.ssd);
  params.set('limit', '200');

  const prodsRes = await API.get('/products?' + params.toString());
  let L = (prodsRes.data || []).map(mapProduct);
  L.forEach((p) => {
    if (!P(p.id)) cache.products.push(p);
  });

  if (q.cpu) {
    const cpuKey = q.cpu.toLowerCase();
    L = L.filter((p) => p.cpu.toLowerCase().includes(cpuKey));
  }

  if (q.ssd) {
    const ssdGb = Number(q.ssd);
    if (ssdGb) L = L.filter((p) => p.storageGb === ssdGb);
  }

  const sort = q.sort || 'pop';
  if (sort === 'rate') {
    L.sort((a, b) => Number(b.rating) - Number(a.rating));
  }

  const pageSize = Number(q.size) || 9;
  const totalItems = L.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const curPage = Math.min(totalPages, Math.max(1, Number(q.page) || 1));
  const pagedList = L.slice((curPage - 1) * pageSize, curPage * pageSize);

  const brands = ['Apple', 'ASUS', 'Dell', 'Lenovo', 'HP', 'MSI', 'Acer', 'LG', 'Microsoft'];
  const prices = [
    ['', 'Tất cả mức giá'],
    ['u15', 'Dưới 15 triệu'],
    ['m1', 'Từ 15 – 25 triệu'],
    ['m2', 'Từ 25 – 40 triệu'],
    ['o40', 'Trên 40 triệu'],
  ];
  const cpus = [
    ['', 'Tất cả'],
    ['Core i5', 'Intel Core i5'],
    ['Core i7', 'Intel Core i7'],
    ['Core i9', 'Intel Core i9'],
    ['Core Ultra', 'Intel Core Ultra'],
    ['Ryzen 5', 'AMD Ryzen 5'],
    ['Ryzen 7', 'AMD Ryzen 7'],
    ['Apple M', 'Apple M-Series'],
  ];
  const rams = [
    ['', 'Tất cả'],
    ['8', '8 GB'],
    ['16', '16 GB'],
    ['32', '32 GB+'],
  ];
  const ssds = [
    ['', 'Tất cả'],
    ['256', '256 GB'],
    ['512', '512 GB'],
    ['1024', '1 TB'],
  ];

  const activeTags = [];
  if (q.cat) activeTags.push({ k: 'cat', label: `Danh mục: ${catName(q.cat)}` });
  if (q.brand) activeTags.push({ k: 'brand', label: `Hãng: ${q.brand}` });
  if (q.price) {
    const prObj = prices.find((x) => x[0] === q.price);
    if (prObj) activeTags.push({ k: 'price', label: `Giá: ${prObj[1]}` });
  }
  if (q.cpu) activeTags.push({ k: 'cpu', label: `CPU: ${q.cpu}` });
  if (q.ram) activeTags.push({ k: 'ram', label: `RAM: ${q.ram}GB` });
  if (q.ssd) activeTags.push({ k: 'ssd', label: `SSD: ${q.ssd === '1024' ? '1TB' : q.ssd + 'GB'}` });
  if (q.q) activeTags.push({ k: 'q', label: `Từ khóa: "${q.q}"` });

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

  return `<div class="wrap">
    <nav class="bc" aria-label="Breadcrumb">
      <a href="#/">Trang chủ</a>
      <span class="sep">›</span>
      <a href="#/products">Laptop chính hãng</a>
      ${q.cat ? `<span class="sep">›</span><span class="cur">${esc(catName(q.cat))}</span>` : ''}
      ${q.brand ? `<span class="sep">›</span><span class="cur">Laptop ${esc(q.brand)}</span>` : ''}
    </nav>

    <div class="brand-strip" style="margin-top:0">
      ${brandLogos
        .map(
          (b) => `
        <button type="button" class="brand-pill ${q.brand === b.name ? 'on' : ''}" onclick="setQ('brand','${q.brand === b.name ? '' : b.name}')" title="Lọc Laptop ${esc(b.name)}">
          <img src="${resolveAssetUrl('/uploads/brands/' + b.slug + '.svg')}" alt="${esc(b.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'">
          <span style="display:none;font-weight:700;font-size:.82rem">${esc(b.name)}</span>
        </button>
      `,
        )
        .join('')}
    </div>

    ${
      activeTags.length
        ? `
      <div class="active-filters-bar">
        <span class="xs muted" style="font-weight:700">Đang lọc theo:</span>
        ${activeTags
          .map(
            (t) => `
          <span class="af-tag">
            ${esc(t.label)}
            <button type="button" onclick="setQ('${t.k}','')" aria-label="Bỏ lọc">×</button>
          </span>
        `,
          )
          .join('')}
        <button type="button" class="btn sm danger" style="padding:.22rem .65rem;font-size:.74rem" onclick="location.hash='#/products'">Xóa tất cả bộ lọc</button>
      </div>
    `
        : ''
    }

    <div class="catalog-layout">
      <aside class="filter-sidebar" id="cat-filter-drawer">
        <div class="fs-header">
          <span>${ic('filter', 16)} Bộ lọc tìm kiếm</span>
          ${activeTags.length ? `<button type="button" style="color:#fff;font-size:.75rem;text-decoration:underline" onclick="location.hash='#/products'">Đặt lại</button>` : ''}
        </div>

        <div class="fs-group">
          <div class="fs-title"><span>Hãng sản xuất</span></div>
          <div class="fs-list">
            <label class="fs-check">
              <input type="radio" name="f_brand" ${!q.brand ? 'checked' : ''} onchange="setQ('brand','')">
              <span>Tất cả thương hiệu</span>
            </label>
            ${brands
              .map(
                (b) => `
              <label class="fs-check">
                <input type="radio" name="f_brand" ${q.brand === b ? 'checked' : ''} onchange="setQ('brand','${b}')">
                <span>Laptop ${esc(b)}</span>
              </label>
            `,
              )
              .join('')}
          </div>
        </div>

        <div class="fs-group">
          <div class="fs-title"><span>Nhu cầu / Danh mục</span></div>
          <div class="fs-list">
            <label class="fs-check">
              <input type="radio" name="f_cat" ${!q.cat ? 'checked' : ''} onchange="setQ('cat','')">
              <span>Tất cả danh mục</span>
            </label>
            ${(cache.cats || [])
              .map(
                (c) => `
              <label class="fs-check">
                <input type="radio" name="f_cat" ${q.cat === c.id ? 'checked' : ''} onchange="setQ('cat','${c.id}')">
                <span>${esc(c.name)} ${c.count ? `(${c.count})` : ''}</span>
              </label>
            `,
              )
              .join('')}
          </div>
        </div>

        <div class="fs-group">
          <div class="fs-title"><span>Mức giá</span></div>
          <div class="fs-list">
            ${prices
              .map(
                (pr) => `
              <label class="fs-check">
                <input type="radio" name="f_price" ${(q.price || '') === pr[0] ? 'checked' : ''} onchange="setQ('price','${pr[0]}')">
                <span>${esc(pr[1])}</span>
              </label>
            `,
              )
              .join('')}
          </div>
        </div>

        <div class="fs-group">
          <div class="fs-title"><span>Dòng vi xử lý (CPU)</span></div>
          <div class="fs-chips">
            ${cpus
              .map(
                (c) => `
              <button type="button" class="fchip ${(q.cpu || '') === c[0] ? 'on' : ''}" onclick="setQ('cpu','${c[0]}')">${esc(c[1])}</button>
            `,
              )
              .join('')}
          </div>
        </div>

        <div class="fs-group">
          <div class="fs-title"><span>Dung lượng RAM</span></div>
          <div class="fs-chips">
            ${rams
              .map(
                (rm) => `
              <button type="button" class="fchip ${(q.ram || '') === rm[0] ? 'on' : ''}" onclick="setQ('ram','${rm[0]}')">${esc(rm[1])}</button>
            `,
              )
              .join('')}
          </div>
        </div>

        <div class="fs-group">
          <div class="fs-title"><span>Ổ cứng SSD</span></div>
          <div class="fs-chips">
            ${ssds
              .map(
                (sdItem) => `
              <button type="button" class="fchip ${(q.ssd || '') === sdItem[0] ? 'on' : ''}" onclick="setQ('ssd','${sdItem[0]}')">${esc(sdItem[1])}</button>
            `,
              )
              .join('')}
          </div>
        </div>

        <div style="padding:12px 16px;display:none" id="mobile-filter-close">
          <button type="button" class="btn a block" onclick="$('#cat-filter-drawer').classList.remove('mobile-open')">Áp dụng (${totalItems} máy)</button>
        </div>
      </aside>

      <div>
        <div class="catalog-toolbar">
          <div class="row" style="gap:8px">
            <button type="button" class="btn sm mnu" onclick="$('#cat-filter-drawer').classList.add('mobile-open');$('#mobile-filter-close').style.display='block'">
              ${ic('filter', 14)} Bộ lọc
            </button>
            <span class="sm">Tìm thấy <b style="color:var(--acc)">${totalItems}</b> mẫu laptop chính hãng</span>
          </div>

          <div class="sort-pills">
            <span class="xs muted" style="font-weight:600">Sắp xếp:</span>
            <button type="button" class="fchip ${sort === 'pop' ? 'on' : ''}" onclick="setQ('sort','pop')">Phổ biến</button>
            <button type="button" class="fchip ${sort === 'new' ? 'on' : ''}" onclick="setQ('sort','new')">Mới nhất</button>
            <button type="button" class="fchip ${sort === 'asc' ? 'on' : ''}" onclick="setQ('sort','asc')">Giá thấp → cao</button>
            <button type="button" class="fchip ${sort === 'desc' ? 'on' : ''}" onclick="setQ('sort','desc')">Giá cao → thấp</button>
            <button type="button" class="fchip ${sort === 'rate' ? 'on' : ''}" onclick="setQ('sort','rate')">Đánh giá cao</button>
            <select style="width:auto;padding:.3rem .6rem;font-size:.76rem" onchange="setQ('size',this.value)" aria-label="Số sản phẩm mỗi trang">
              ${[6, 9, 12, 24].map((sz) => `<option value="${sz}" ${pageSize === sz ? 'selected' : ''}>Hiển thị ${sz}</option>`).join('')}
            </select>
          </div>
        </div>

        ${
          pagedList.length
            ? `
          <div class="pg three-col">
            ${pagedList.map(pcard).join('')}
          </div>
        `
            : `
          <div class="card center" style="padding:56px 24px">
            <div style="color:var(--acc);margin-bottom:10px">${ic('search', 36)}</div>
            <h3 style="font-size:1.15rem;margin-bottom:6px">Không tìm thấy sản phẩm phù hợp với tiêu chí lọc</h3>
            <p class="muted sm" style="margin-bottom:18px">Hãy thử gỡ bớt một vài điều kiện lọc hoặc tìm kiếm với từ khóa khác.</p>
            <button type="button" class="btn a" onclick="location.hash='#/products'">Xem toàn bộ sản phẩm</button>
          </div>
        `
        }

        ${
          totalPages > 1
            ? `
          <nav class="pagination" aria-label="Phân trang">
            <button type="button" class="page-btn" ${curPage <= 1 ? 'disabled' : ''} onclick="setQ('page','${curPage - 1}')">«</button>
            ${Array.from({ length: totalPages }, (_, i) => i + 1)
              .map(
                (pg) => `
              <button type="button" class="page-btn ${pg === curPage ? 'on' : ''}" onclick="setQ('page','${pg}')">${pg}</button>
            `,
              )
              .join('')}
            <button type="button" class="page-btn" ${curPage >= totalPages ? 'disabled' : ''} onclick="setQ('page','${curPage + 1}')">»</button>
          </nav>
        `
            : ''
        }
      </div>
    </div>
  </div>`;
}

async function viewProduct(r) {
  await ensureCategories();
  const idParam = r.parts[1];
  let p = null;

  try {
    const res = await API.get('/products/' + encodeURIComponent(idParam));
    p = mapProduct(res.data);
    if (p) {
      const idx = cache.products.findIndex((x) => x.id === p.id);
      if (idx >= 0) cache.products[idx] = p;
      else cache.products.push(p);
      trackViewed(p.id);
    }
  } catch (e) {}

  if (!p) {
    return `<div class="wrap" style="padding:48px 16px">
      <div class="card center" style="padding:56px 24px">
        <h2 style="margin-bottom:8px">Không tìm thấy sản phẩm</h2>
        <p class="muted sm" style="margin-bottom:18px">Sản phẩm có thể đã ngừng kinh doanh hoặc đường dẫn không tồn tại.</p>
        <a class="btn a" href="#/products">Quay lại danh sách Laptop</a>
      </div>
    </div>`;
  }

  let rel = cache.products.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4);
  if (rel.length < 4) {
    try {
      const relRes = await API.get('/products?cat=' + encodeURIComponent(p.cat) + '&limit=6', true);
      const list = (relRes.data || []).map(mapProduct);
      list.forEach((item) => {
        if (!P(item.id)) cache.products.push(item);
      });
      rel = list.filter((x) => x.id !== p.id).slice(0, 4);
    } catch (e) {}
  }

  const d = discPct(p);
  const inC = (db.compare || []).includes(p.id);
  const inW = (db.wishlist || []).includes(p.id);
  const u = me();
  const viewedOther = (db.viewed || [])
    .filter((id) => String(id) !== String(p.id))
    .map((id) => P(id))
    .filter(Boolean)
    .slice(0, 4);

  const specRows = [
    ['Thương hiệu', p.brand],
    ['Mã sản phẩm (SKU)', p.sku],
    ['Phân khúc', p.catName || catName(p.cat)],
    ['Bộ vi xử lý (CPU)', p.cpu],
    ['Số nhân / Luồng', p.cpuCores],
    ['Bộ nhớ RAM', p.ram + (p.ramMax ? ` (${p.ramMax})` : '')],
    ['Ổ cứng lưu trữ', p.ssd],
    ['Card đồ họa (GPU)', p.gpu],
    ['Màn hình', p.screen + (p.panel ? ` · Tấm nền ${p.panel}` : '')],
    ['Pin & Bộ sạc', [p.battery, p.charger].filter(Boolean).join(' · ')],
    ['Cổng kết nối', p.ports],
    ['Kết nối không dây', [p.wifi, p.bluetooth].filter(Boolean).join(' · ')],
    ['Hệ điều hành', p.os],
    ['Trọng lượng & Kích thước', [p.weight, p.dimensions].filter(Boolean).join(' · ')],
    ['Chất liệu & Màu sắc', [p.material, p.color].filter(Boolean).join(' · ')],
    ['Chế độ bảo hành', `${p.warranty} tháng chính hãng theo số Serial (S/N)`],
  ].filter((row) => row[1] && String(row[1]).trim() !== '');

  return `<div class="wrap" style="padding-bottom:24px">
    <nav class="bc" aria-label="Breadcrumb">
      <a href="#/">Trang chủ</a> <span class="sep">›</span>
      <a href="#/products">Laptop</a> <span class="sep">›</span>
      <a href="#/products?cat=${p.cat}">${esc(p.catName || catName(p.cat))}</a> <span class="sep">›</span>
      <span class="cur">${esc(p.name)}</span>
    </nav>

    <div class="pd-main-card">
      <div>
        <div class="pd-gallery-frame" onclick="A.zoomImg($('.pd-main-img') ? $('.pd-main-img').src : '${esc(p.thumbnail || '')}', '${esc(p.name)}')">
          ${pimg(p, 'pd-main-img')}
          <span class="xs muted" style="display:inline-flex;align-items:center;gap:4px;margin-top:8px">${ic('zoom', 14)} Nhấn vào ảnh để phóng to</span>
        </div>
        ${
          p.images && p.images.length > 1
            ? `
          <div class="pd-dots">
            ${p.images.map((im, idx) => `<span class="pd-dot ${idx === 0 ? 'on' : ''}" onclick="A.switchPdImg(${idx}, '${esc(im.url)}')"></span>`).join('')}
          </div>
          <div class="pd-thumbs">
            ${p.images
              .map(
                (im, idx) => `
              <img src="${esc(im.url)}" alt="${esc(im.alt_text || p.name)}" class="pd-thumb-img ${idx === 0 ? 'on' : ''}" onclick="A.switchPdImg(${idx}, '${esc(im.url)}')" onerror="if(!this.dataset.retried&&this.src.indexOf('onrender.com')!==-1){this.dataset.retried='1';this.src='https://laptop99.vercel.app/'+this.src.replace(/^https?:\\/\\/[^\\/]+\\//,'');}else if(!this.dataset.retried&&this.src.indexOf('onrender.com')===-1){this.dataset.retried='1';this.src='https://laptop99-ejug.onrender.com/'+this.getAttribute('src').replace(/^\\//,'');}">
            `,
              )
              .join('')}
          </div>
        `
            : ''
        }
      </div>

      <div>
        <div class="row between" style="margin-bottom:6px">
          <span class="xs muted" style="font-weight:700;text-transform:uppercase">${esc(p.brand)} · SKU: ${esc(p.sku)}</span>
          ${stockTxt(p)}
        </div>

        <h1 style="font-size:clamp(1.35rem,2.4vw,1.75rem);font-weight:800;line-height:1.28;color:var(--fg)">
          ${esc(p.name)}
        </h1>

        <p class="muted sm" style="margin-top:6px;font-weight:500">
          (${esc(p.cpu)} / RAM ${esc(p.ram)} / ${esc(p.ssd)} / ${esc(p.gpu)} / Màn hình ${esc(p.screen)} / ${esc(p.weight)})
        </p>

        <div class="row" style="margin-top:12px;gap:10px">
          <span class="pd-rate-badge">${rate(p)} ★</span>
          <span class="sm muted">(${p.reviews.length} đánh giá khách hàng · Đã bán ${p.soldCount} máy)</span>
        </div>

        <div class="pd-price-block">
          ${d > 0 ? `<span class="pd-off-label">(Tiết kiệm ${d}% · Giảm ngay ${vnd(p.old - p.price)})</span>` : `<span class="pd-off-label">Giá bán chính thức đã bao gồm VAT · Hỗ trợ trả góp 0%</span>`}
          <div class="row" style="align-items:baseline;gap:12px">
            <span style="font-size:1.95rem;font-weight:800;color:${d > 0 ? 'var(--promo)' : 'var(--fg)'}">${vnd(p.price)}</span>
            ${d > 0 ? `<span class="old" style="font-size:1.05rem">${vnd(p.old)}</span>` : ''}
          </div>
        </div>

        <div class="pd-spec-grid">
          <div class="pd-spec-cell"><small>Vi xử lý</small><b title="${esc(p.cpu)}">${esc(p.cpu)}</b></div>
          <div class="pd-spec-cell"><small>Bộ nhớ RAM</small><b>${esc(p.ram)}</b></div>
          <div class="pd-spec-cell"><small>Ổ cứng</small><b>${esc(p.ssd)}</b></div>
          <div class="pd-spec-cell"><small>Đồ họa</small><b title="${esc(p.gpu)}">${esc(p.gpu)}</b></div>
          <div class="pd-spec-cell"><small>Màn hình</small><b title="${esc(p.screen)}">${esc(p.screen)}</b></div>
          <div class="pd-spec-cell"><small>Bảo hành</small><b>${p.warranty} tháng S/N</b></div>
        </div>

        ${p.desc ? `<p class="muted sm" style="margin:12px 0;line-height:1.6">${esc(p.desc)}</p>` : ''}

        <div class="row" style="margin-top:18px;gap:10px">
          <div class="qty" aria-label="Số lượng">
            <button type="button" onclick="A.pq(-1)" aria-label="Giảm">${ic('minus', 14)}</button>
            <span id="pq">1</span>
            <button type="button" onclick="A.pq(1)" aria-label="Tăng">${ic('plus', 14)}</button>
          </div>
          <button type="button" class="ib" style="width:42px;height:42px;border-radius:10px;${inW ? 'background:var(--promo);color:#fff;border-color:var(--promo)' : ''}" title="Yêu thích" onclick="A.wish('${p.id}')">
            ${ic('heart', 18)}
          </button>
          <button type="button" class="ib" style="width:42px;height:42px;border-radius:10px;${inC ? 'background:var(--acc);color:#fff;border-color:var(--acc)' : ''}" title="So sánh cấu hình" onclick="A.cmp('${p.id}')">
            ${ic('scale', 18)}
          </button>
          <button type="button" class="btn a lg grow" ${p.stock <= 0 ? 'disabled' : ''} onclick="A.buyNow('${p.id}',+$('#pq').textContent)">
            Mua ngay ${ic('arrow', 16)}
          </button>
          <button type="button" class="btn soft lg grow" ${p.stock <= 0 ? 'disabled' : ''} onclick="A.add('${p.id}',+$('#pq').textContent)">
            Thêm vào giỏ ${ic('cart', 16)}
          </button>
        </div>

        <div class="card" style="margin-top:16px;padding:14px;background:#F8FAFC;display:grid;gap:8px">
          <div class="row sm"><span style="color:var(--acc)">${ic('shield', 16)}</span> <span>Bảo hành chính hãng <b>${p.warranty} tháng</b> định danh theo mã Serial (S/N).</span></div>
          <div class="row sm"><span style="color:var(--ok)">${ic('refresh', 16)}</span> <span>Hỗ trợ đổi trả trong <b>15 ngày</b> nếu phát sinh lỗi phần cứng từ nhà sản xuất.</span></div>
          <div class="row sm"><span style="color:var(--warn)">${ic('dollar', 16)}</span> <span>Có laptop cũ? <a class="acc" style="font-weight:600" href="#/tradein">Định giá thu cũ đổi mới</a> để trừ trực tiếp vào đơn hàng này.</span></div>
        </div>
      </div>
    </div>

    <div class="two" style="margin-top:20px">
      <div class="gap" style="gap:20px">
        <div class="card">
          <h2 style="font-size:1.15rem;margin-bottom:12px">Đặc điểm nổi bật &amp; Mô tả sản phẩm</h2>
          <p style="color:var(--fg);line-height:1.7;white-space:pre-line">${esc(p.fullDesc || p.desc || 'Sản phẩm chính hãng phân phối tại hệ thống Laptop99, đầy đủ phụ kiện tiêu chuẩn từ nhà sản xuất.')}</p>
        </div>

        <div class="card">
          <h2 style="font-size:1.15rem;margin-bottom:14px">Đánh giá &amp; Nhận xét từ khách hàng (${p.reviews.length})</h2>
          ${
            p.reviews.length
              ? p.reviews
                  .map(
                    (v) => `
            <div style="padding:12px 0;border-bottom:1px solid var(--line)">
              <div class="row between">
                <div class="row" style="gap:8px">
                  <b class="sm">${esc(v.name)}</b>
                  ${v.verified ? '<span class="bd ok" style="font-size:.65rem;padding:.1rem .45rem">Đã mua tại Laptop99</span>' : ''}
                </div>
                <span class="dim xs">${sd(v.at)}</span>
              </div>
              <div class="stars" style="margin-top:4px">${stars(v.star)}</div>
              <p class="sm" style="margin-top:6px;color:var(--fg)">${esc(v.text)}</p>
              ${v.reply ? `<div style="margin-top:8px;background:var(--acc-light);border-left:3px solid var(--acc);padding:8px 12px;border-radius:6px;font-size:.8rem"><b>Phản hồi từ Laptop99:</b> ${esc(v.reply)}</div>` : ''}
            </div>
          `,
                  )
                  .join('')
              : '<p class="muted sm" style="margin-bottom:16px">Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên chia sẻ trải nghiệm!</p>'
          }

          <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--line)">
            <h3 style="font-size:.98rem;margin-bottom:10px">Gửi đánh giá của bạn</h3>
            ${
              u
                ? `
              <div class="gap" style="gap:10px">
                <select id="rv-s">
                  <option value="5">★★★★★ — 5 sao (Rất hài lòng)</option>
                  <option value="4">★★★★☆ — 4 sao (Hài lòng)</option>
                  <option value="3">★★★☆☆ — 3 sao (Bình thường)</option>
                  <option value="2">★★☆☆☆ — 2 sao (Chưa tốt)</option>
                  <option value="1">★☆☆☆☆ — 1 sao (Không hài lòng)</option>
                </select>
                <textarea id="rv-t" placeholder="Chia sẻ cảm nhận thực tế của bạn về hiệu năng, màn hình, thời lượng pin..."></textarea>
                <div><button class="btn a" onclick="A.review('${p.id}')">Gửi đánh giá</button></div>
              </div>
            `
                : `
              <p class="muted sm" style="margin-bottom:10px">Vui lòng đăng nhập tài khoản khách hàng để gửi đánh giá sản phẩm.</p>
              <button class="btn a sm" onclick="A.authModal()">Đăng nhập ngay</button>
            `
            }
          </div>
        </div>
      </div>

      <div class="card">
        <h2 style="font-size:1.15rem;margin-bottom:12px">Thông số kỹ thuật chi tiết</h2>
        <table class="spec">
          ${specRows.map((row) => `<tr><td>${esc(row[0])}</td><td>${esc(row[1])}</td></tr>`).join('')}
        </table>
      </div>
    </div>

    ${
      rel.length
        ? `
      <div class="sec-box" style="margin-top:20px">
        <div class="sec-head">
          <h2 class="sec-title">SẢN PHẨM TƯƠNG TỰ CÙNG PHÂN KHÚC</h2>
          <a class="btn sm" href="#/products?cat=${p.cat}">Xem thêm ${ic('chevR', 14)}</a>
        </div>
        <div class="pg">${rel.map(pcard).join('')}</div>
      </div>
    `
        : ''
    }

    ${
      viewedOther.length
        ? `
      <div class="sec-box" style="margin-top:20px">
        <div class="sec-head">
          <h2 class="sec-title">${ic('eye', 18)} SẢN PHẨM ĐÃ XEM GẦN ĐÂY</h2>
        </div>
        <div class="pg">${viewedOther.map(pcard).join('')}</div>
      </div>
    `
        : ''
    }
  </div>`;
}

function renderAIComparisonAnalysis(L) {
  if (!L || L.length < 2) return '';

  const analysis = L.map((p) => {
    const rawGpu = (p.gpu || '').toLowerCase();
    const rawCpu = (p.cpu || '').toLowerCase();
    const rawRam = parseInt(p.ram, 10) || 16;
    const rawWeight = parseFloat(p.weight) || 1.8;
    const isGamingGpu = rawGpu.includes('rtx') || rawGpu.includes('gtx') || rawGpu.includes('rx') || rawGpu.includes('radeon');
    const isDedicated = isGamingGpu;

    let gamingScore = 55;
    if (rawGpu.includes('4070') || rawGpu.includes('4080')) gamingScore = 96;
    else if (rawGpu.includes('4060')) gamingScore = 89;
    else if (rawGpu.includes('4050') || rawGpu.includes('3050')) gamingScore = 78;
    else if (p.brand === 'Apple') gamingScore = 75;
    else if (rawGpu.includes('arc') || rawGpu.includes('iris')) gamingScore = 60;

    let workScore = 70;
    if (rawRam >= 32) workScore += 18;
    else if (rawRam >= 16) workScore += 12;
    if (rawCpu.includes('ultra') || rawCpu.includes('i7') || rawCpu.includes('i9') || rawCpu.includes('ryzen 7') || rawCpu.includes('m3') || rawCpu.includes('m2')) workScore += 10;
    workScore = Math.min(99, workScore);

    let mobilityScore = 70;
    if (rawWeight <= 1.25) mobilityScore = 98;
    else if (rawWeight <= 1.45) mobilityScore = 90;
    else if (rawWeight <= 1.75) mobilityScore = 80;
    else if (rawWeight <= 2.1) mobilityScore = 68;
    else mobilityScore = 55;

    const rawScreen = (p.screen || '').toLowerCase();
    let displayScore = 75;
    if (rawScreen.includes('oled') || rawScreen.includes('retina') || rawScreen.includes('2.8k') || rawScreen.includes('3k')) displayScore = 96;
    else if (rawScreen.includes('144hz') || rawScreen.includes('165hz') || rawScreen.includes('120hz') || rawScreen.includes('fhd+')) displayScore = 88;

    const pros = [];
    const cons = [];

    if (isDedicated) pros.push(`Card đồ họa rời ${p.gpu || 'mạnh mẽ'}, chơi mượt game 3D & render video`);
    else if (p.brand === 'Apple') pros.push('Hệ điều hành macOS tối ưu cực kỳ mượt mà, thời lượng pin cả ngày');
    else pros.push('Tiết kiệm điện năng, máy chạy mát mẻ và yên tĩnh');

    if (rawRam >= 16) pros.push(`RAM ${rawRam}GB thoải mái đa nhiệm hơn 30 tabs Chrome`);
    else cons.push('RAM 8GB có thể bị tràn bộ nhớ khi mở nhiều ứng dụng nặng');

    if (rawWeight <= 1.4) pros.push(`Trọng lượng siêu nhẹ chỉ ${p.weight}, rất tiện mang đi học/đi làm`);
    else if (rawWeight >= 2.0) cons.push(`Máy nặng ${p.weight}, củ sạc lớn khi mang balo đường dài`);

    if (rawScreen.includes('120hz') || rawScreen.includes('144hz') || rawScreen.includes('165hz')) {
      pros.push(`Màn hình tần số quét cao ${p.screen}, cuộn lướt siêu mượt`);
    }

    if (!isDedicated && (p.cat === '2' || (p.catName || '').toLowerCase().includes('gaming'))) {
      cons.push('Không có card rời, khó chơi các tựa game AAA hạng nặng');
    }

    return {
      product: p,
      gamingScore,
      workScore,
      mobilityScore,
      displayScore,
      pros: pros.slice(0, 3),
      cons: cons.length ? cons.slice(0, 2) : ['Giá niêm yết có thể biến động theo thời điểm'],
    };
  });

  let bestGaming = analysis[0];
  let bestMobility = analysis[0];
  let bestPrice = analysis[0];

  for (const a of analysis) {
    if (a.gamingScore > bestGaming.gamingScore) bestGaming = a;
    if (a.mobilityScore > bestMobility.mobilityScore) bestMobility = a;
    if (a.product.price < bestPrice.product.price) bestPrice = a;
  }

  return `
    <div class="card" style="margin-bottom:20px;border:1.5px solid #3b82f6;background:linear-gradient(180deg, rgba(59,130,246,0.04) 0%, rgba(255,255,255,0) 100%);padding:20px 22px;border-radius:14px;box-shadow:0 4px 20px rgba(59,130,246,0.08)">
      <div class="row between" style="margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div class="row" style="gap:10px;align-items:center">
          <div style="width:38px;height:38px;border-radius:10px;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.25rem;box-shadow:0 4px 12px rgba(37,99,235,0.3)">
            🤖
          </div>
          <div>
            <div style="font-size:1.05rem;font-weight:800;color:var(--fg);display:flex;align-items:center;gap:8px">
              <span>LAPTOP99 AI Engine · Đánh Giá &amp; So Sánh Chuyên Sâu</span>
              <span class="bd ok" style="font-size:10px;padding:2px 7px;font-weight:700">Live AI Analysis</span>
            </div>
            <div class="muted sm" style="font-size:12px;margin-top:2px">Thuật toán AI tự động phân tích cấu hình phần cứng, đối chiếu điểm hiệu năng và chỉ ra ưu/nhược điểm thực tế.</div>
          </div>
        </div>
        <button class="btn sm" onclick="A.openChat('Hãy so sánh chi tiết ưu nhược điểm giữa ${L.map((p) => p.name).join(' và ')} cho tôi')" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;font-weight:700">
          💬 Hỏi thêm Trợ lý AI
        </button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-bottom:18px">
        ${analysis.map((a) => `
          <div style="background:var(--bg-card, #fff);border:1px solid var(--border);border-radius:12px;padding:16px">
            <div style="font-weight:800;font-size:.92rem;color:var(--fg);margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
              <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px">${esc(a.product.name)}</span>
              <span style="color:var(--promo);font-size:.9rem">${vnd(a.product.price)}</span>
            </div>

            <div style="display:flex;flex-direction:column;gap:8px;font-size:11px">
              <div>
                <div class="row between muted" style="margin-bottom:3px">
                  <span>🎮 Gaming &amp; Đồ họa 3D</span>
                  <b style="color:var(--fg)">${a.gamingScore}/100</b>
                </div>
                <div style="height:6px;background:#f1f5f9;border-radius:99px;overflow:hidden">
                  <div style="height:100%;width:${a.gamingScore}%;background:${a.gamingScore > 80 ? '#10b981' : a.gamingScore > 65 ? '#3b82f6' : '#f59e0b'};border-radius:99px"></div>
                </div>
              </div>

              <div>
                <div class="row between muted" style="margin-bottom:3px">
                  <span>💼 Đa nhiệm &amp; Lập trình</span>
                  <b style="color:var(--fg)">${a.workScore}/100</b>
                </div>
                <div style="height:6px;background:#f1f5f9;border-radius:99px;overflow:hidden">
                  <div style="height:100%;width:${a.workScore}%;background:${a.workScore > 80 ? '#10b981' : '#3b82f6'};border-radius:99px"></div>
                </div>
              </div>

              <div>
                <div class="row between muted" style="margin-bottom:3px">
                  <span>🚀 Tính di động &amp; Pin</span>
                  <b style="color:var(--fg)">${a.mobilityScore}/100</b>
                </div>
                <div style="height:6px;background:#f1f5f9;border-radius:99px;overflow:hidden">
                  <div style="height:100%;width:${a.mobilityScore}%;background:${a.mobilityScore > 80 ? '#10b981' : a.mobilityScore > 65 ? '#3b82f6' : '#f59e0b'};border-radius:99px"></div>
                </div>
              </div>

              <div>
                <div class="row between muted" style="margin-bottom:3px">
                  <span>🖥️ Màn hình &amp; Hiển thị</span>
                  <b style="color:var(--fg)">${a.displayScore}/100</b>
                </div>
                <div style="height:6px;background:#f1f5f9;border-radius:99px;overflow:hidden">
                  <div style="height:100%;width:${a.displayScore}%;background:#8b5cf6;border-radius:99px"></div>
                </div>
              </div>
            </div>

            <div style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--border);display:flex;flex-direction:column;gap:6px;font-size:11px">
              ${a.pros.map((pr) => `<div style="color:#059669;display:flex;align-items:flex-start;gap:6px"><span>✓</span><span>${esc(pr)}</span></div>`).join('')}
              ${a.cons.map((cn) => `<div style="color:#dc2626;display:flex;align-items:flex-start;gap:6px"><span>✕</span><span>${esc(cn)}</span></div>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;font-size:12px;line-height:1.6;color:#334155">
        <div style="font-weight:800;color:#0f172a;margin-bottom:6px;display:flex;align-items:center;gap:6px">
          <span style="color:#eab308">💡</span> <b>KẾT LUẬN &amp; TƯ VẤN CHỌN MUA TỪ AI:</b>
        </div>
        <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">
          <li><b>Nếu bạn ưu tiên Chơi Game / Dựng đồ họa 3D / Kỹ thuật:</b> Nên chọn <b>${esc(bestGaming.product.name)}</b> nhờ trang bị GPU và hiệu năng đồ họa dẫn đầu (${bestGaming.gamingScore} điểm).</li>
          <li><b>Nếu bạn là Sinh viên / Dân văn phòng hay di chuyển:</b> Nên chọn <b>${esc(bestMobility.product.name)}</b> để tối ưu độ mỏng nhẹ (${bestMobility.product.weight}) và thời lượng pin (${bestMobility.mobilityScore} điểm).</li>
          <li><b>Lựa chọn tiết kiệm chi phí nhất:</b> <b>${esc(bestPrice.product.name)}</b> với mức giá chỉ ${vnd(bestPrice.product.price)}, rất phù hợp với ngân sách vừa phải.</li>
        </ul>
      </div>
    </div>
  `;
}

async function viewCompare() {
  const pids = db.compare || [];
  if (!pids.length) {
    return `<div class="wrap">
      <nav class="bc"><a href="#/">Trang chủ</a> <span class="sep">›</span> <span class="cur">So sánh sản phẩm</span></nav>
      <div class="card center" style="margin-top:8px;padding:56px 20px">
        <div style="color:var(--acc);margin-bottom:10px">${ic('scale', 40)}</div>
        <h2 style="font-size:1.3rem;margin-bottom:6px">Chưa có sản phẩm nào trong danh sách so sánh</h2>
        <p class="muted sm" style="margin-bottom:18px">Bạn có thể chọn tối đa 3 mẫu laptop bằng nút biểu tượng chiếc cân trên mỗi thẻ sản phẩm.</p>
        <a class="btn a" href="#/products">Chọn Laptop để so sánh</a>
      </div>
    </div>`;
  }

  for (const pid of pids) {
    if (!P(pid)) {
      try {
        const res = await API.get('/products/' + String(pid).replace(/^p/, ''), true);
        const p = mapProduct(res.data);
        if (p) cache.products.push(p);
      } catch (e) {}
    }
  }

  const L = pids.map(P).filter(Boolean);
  if (!L.length) {
    return `<div class="wrap pg-head"><h1>So sánh</h1><div class="card center" style="margin-top:20px;padding:50px"><p class="muted">Không tìm thấy sản phẩm cần so sánh.</p><a class="btn a" href="#/products">Chọn laptop</a></div></div>`;
  }

  const rows = [
    ['Mức giá hiện tại', (p) => vnd(p.price)],
    ['Thương hiệu', (p) => p.brand],
    ['Phân khúc', (p) => p.catName || catName(p.cat)],
    ['Bộ vi xử lý (CPU)', (p) => p.cpu],
    ['Dung lượng RAM', (p) => p.ram],
    ['Ổ cứng SSD', (p) => p.ssd],
    ['Card đồ họa (GPU)', (p) => p.gpu],
    ['Màn hình', (p) => p.screen],
    ['Trọng lượng', (p) => p.weight],
    ['Chế độ bảo hành', (p) => p.warranty + ' tháng theo S/N'],
    ['Đánh giá trung bình', (p) => p.rating + ' ★'],
  ];

  return `<div class="wrap" style="padding-bottom:28px">
    <nav class="bc"><a href="#/">Trang chủ</a> <span class="sep">›</span> <span class="cur">So sánh cấu hình Laptop (${L.length}/3)</span></nav>
    <div class="row between" style="margin-bottom:14px">
      <h1 style="font-size:1.45rem">So sánh chi tiết cấu hình &amp; Giá bán</h1>
      <div class="row" style="gap:12px">
        <label class="row sm" style="gap:6px;cursor:pointer">
          <input type="checkbox" ${cache.diffOnly ? 'checked' : ''} onchange="cache.diffOnly=this.checked;render()">
          <span>Làm nổi bật thông số khác nhau</span>
        </label>
        <button class="btn sm danger" onclick="db.compare=[];save();render()">Xóa tất cả</button>
      </div>
    </div>
    ${renderAIComparisonAnalysis(L)}
    <div class="card tw" style="padding:0;overflow:hidden">
      <table class="tbl" style="min-width:640px">
        <tr>
          <th style="width:180px">Thông số</th>
          ${L.map(
            (p) => `
            <th style="width:${80 / L.length}%;text-align:center;text-transform:none">
              <div style="width:130px;margin:0 auto 8px">${pimg(p, 'cmp-img')}</div>
              <a href="#/product/${p.id}" style="color:var(--fg);font-size:.88rem;font-weight:700;white-space:normal;display:block;min-height:2.4em">${esc(p.name)}</a>
              <div style="color:var(--promo);font-size:1rem;font-weight:800;margin:6px 0">${vnd(p.price)}</div>
              <div class="row" style="justify-content:center;gap:6px;margin-top:6px">
                <button class="btn a sm" onclick="A.add('${p.id}')">${ic('cart', 13)} Thêm giỏ</button>
                <button class="btn danger sm" onclick="A.cmp('${p.id}')">Bỏ</button>
              </div>
            </th>
          `,
          ).join('')}
        </tr>
        ${rows
          .map((r) => {
            const vals = L.map((p) => String(r[1](p) || ''));
            const isDiff = L.length > 1 && new Set(vals).size > 1;
            return `<tr class="${cache.diffOnly && isDiff ? 'diff-row' : ''}">
            <td class="muted" style="font-weight:600">${esc(r[0])}</td>
            ${L.map((p) => `<td style="text-align:center;font-weight:${isDiff && cache.diffOnly ? '700' : '500'}">${esc(r[1](p))}</td>`).join('')}
          </tr>`;
          })
          .join('')}
      </table>
    </div>
  </div>`;
}

async function viewWishlist() {
  const pids = db.wishlist || [];
  if (!pids.length) {
    return `<div class="wrap">
      <nav class="bc"><a href="#/">Trang chủ</a> <span class="sep">›</span> <span class="cur">Sản phẩm yêu thích</span></nav>
      <div class="card center" style="margin-top:8px;padding:56px 20px">
        <div style="color:var(--promo);margin-bottom:10px">${ic('heart', 40)}</div>
        <h2 style="font-size:1.3rem;margin-bottom:6px">Danh sách yêu thích đang trống</h2>
        <p class="muted sm" style="margin-bottom:18px">Nhấn vào biểu tượng trái tim (♥) trên các mẫu laptop bạn quan tâm để lưu lại xem sau.</p>
        <a class="btn a" href="#/products">Khám phá Laptop ngay</a>
      </div>
    </div>`;
  }

  for (const pid of pids) {
    if (!P(pid)) {
      try {
        const res = await API.get('/products/' + String(pid).replace(/^p/, ''), true);
        const p = mapProduct(res.data);
        if (p) cache.products.push(p);
      } catch (e) {}
    }
  }

  const L = pids.map(P).filter(Boolean);
  return `<div class="wrap" style="padding-bottom:28px">
    <nav class="bc"><a href="#/">Trang chủ</a> <span class="sep">›</span> <span class="cur">Sản phẩm yêu thích (${L.length})</span></nav>
    <div class="row between" style="margin-bottom:14px">
      <h1 style="font-size:1.45rem">Sản phẩm bạn đã yêu thích (${L.length})</h1>
      <button class="btn sm danger" onclick="db.wishlist=[];save();render()">Xóa danh sách</button>
    </div>
    <div class="pg">${L.map(pcard).join('')}</div>
  </div>`;
}

