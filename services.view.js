/* ==========================================================================
   SERVICES & CONTENT VIEWS (MVC): Trade-in, Warranty S/N, Promotions & News
   ========================================================================== */

function viewTradein() {
  const yrs = [];
  for (let y = 2026; y >= 2016; y--) yrs.push(y);
  return `<div class="wrap" style="padding-bottom:28px">
    <nav class="bc"><a href="#/">Trang chủ</a> <span class="sep">›</span> <span class="cur">Thu cũ đổi mới (Smart Trade-In)</span></nav>
    <div class="pg-head" style="padding-top:4px">
      <h1>Thu cũ đổi mới — Lên đời Laptop chính hãng</h1>
      <p class="muted sm" style="margin-top:6px;max-width:680px">Định giá máy cũ trực tuyến theo 3 bước đơn giản. Giá thu mua thực tế được kỹ thuật viên xác nhận và trừ trực tiếp vào đơn hàng mua máy mới.</p>
    </div>
    <div class="two">
      <div class="card">
        <h3 style="font-size:1.05rem;margin-bottom:14px">Thông tin thiết bị cần định giá</h3>
        <div class="fg">
          <label class="fl2">Bước 1: Chọn thương hiệu máy cũ
            <select id="ti-b" onchange="A.tiEst()">${['Apple', 'ASUS', 'Dell', 'Lenovo', 'HP', 'MSI', 'Acer', 'LG', 'Khác'].map((b) => `<option>${b}</option>`).join('')}</select>
          </label>
          <label class="fl2">Bước 2: Nhập tên dòng máy / Model *
            <input id="ti-m" placeholder="VD: MacBook Air M1 / Dell XPS 9310 / Asus TUF F15">
          </label>
          <label class="fl2">Năm mua máy
            <select id="ti-y" onchange="A.tiEst()">${yrs.map((y) => `<option ${y === 2022 ? 'selected' : ''}>${y}</option>`).join('')}</select>
          </label>
          <label class="fl2">Dung lượng RAM hiện tại
            <select id="ti-r" onchange="A.tiEst()">
              <option value="4">4 GB</option>
              <option value="8" selected>8 GB</option>
              <option value="16">16 GB</option>
              <option value="32">32 GB</option>
            </select>
          </label>
          <label class="fl2 full">Bước 3: Tình trạng ngoại hình &amp; chức năng
            <select id="ti-c" onchange="A.tiEst()">
              <option value="Như mới">Loại A — Như mới (Không trầy xước, pin tốt, đủ chức năng)</option>
              <option value="Tốt" selected>Loại B — Tốt (Xước dăm nhẹ theo thời gian, hoạt động hoàn hảo)</option>
              <option value="Trầy xước">Loại C — Trầy xước rõ hoặc cấn nhẹ vỏ ngoài</option>
              <option value="Lỗi nhẹ">Loại D — Có lỗi nhẹ (Pin chai, đốm màn nhẹ...)</option>
            </select>
          </label>
        </div>
      </div>

      <div class="card sum">
        <span class="bd info" style="width:fit-content">Kết quả định giá sơ bộ</span>
        <p class="muted sm" style="margin-top:4px">Mức giá thu mua tham khảo dự kiến:</p>
        <p id="ti-v" style="font-size:2.2rem;font-weight:800;color:var(--acc)">${vnd(tiEstimate('Apple', 2022, 8, 'Tốt'))}</p>
        <p class="xs muted" style="line-height:1.5">Lưu ý: Đây là mức giá ước tính tự động từ hệ thống. Kỹ thuật viên sẽ kiểm tra máy trực tiếp trong 15 phút để chốt mức giá thu mua cao nhất cho bạn.</p>
        <button class="btn a lg block" onclick="A.tiSubmit()">Gửi yêu cầu định giá &amp; Thu mua</button>
      </div>
    </div>
  </div>`;
}

async function viewWarranty(r) {
  const sn = (r.q.sn || '').trim().toUpperCase();
  let res = '';
  if (sn) {
    try {
      const wRes = await API.get('/warranty?sn=' + encodeURIComponent(sn));
      if (wRes.found && wRes.data) {
        const w = wRes.data;
        res = `<div class="card" style="margin-top:18px;border-color:var(--acc-border)">
          <div class="row between" style="padding-bottom:12px;border-bottom:1px solid var(--line)">
            <div>
              <span class="xs muted" style="font-weight:700;text-transform:uppercase">Chứng nhận bảo hành điện tử</span>
              <h3 style="font-size:1.2rem;margin-top:2px">${esc(w.product_name)}</h3>
            </div>
            ${w.is_valid ? '<span class="bd ok">✓ Còn hạn bảo hành chính hãng</span>' : '<span class="bd bad">Đã hết hạn bảo hành</span>'}
          </div>
          <table class="spec" style="margin-top:10px">
            <tr><td>Số Serial Number (S/N)</td><td><b>${esc(w.sn)}</b></td></tr>
            <tr><td>Mã đơn hàng gốc</td><td>${esc(w.oid)}</td></tr>
            <tr><td>Ngày kích hoạt mua hàng</td><td>${sd(w.at)}</td></tr>
            <tr><td>Thời hạn bảo hành</td><td>${w.months} tháng (Đến hết ngày <b>${sd(w.end_date)}</b>)</td></tr>
          </table>
        </div>`;
      } else {
        res = `<div class="card center" style="margin-top:18px;padding:36px 20px">
          <h3 style="font-size:1.15rem">Không tìm thấy thông tin cho số S/N "${esc(sn)}"</h3>
          <p class="muted sm" style="margin-top:6px">Vui lòng kiểm tra lại dãy số Serial ở mặt dưới của máy hoặc trong hóa đơn điện tử.</p>
        </div>`;
      }
    } catch (err) {
      res = `<div class="card center bad" style="margin-top:18px">Lỗi tra cứu hệ thống: ${esc(err.message)}</div>`;
    }
  }
  return `<div class="wrap" style="max-width:740px;padding-bottom:36px">
    <nav class="bc"><a href="#/">Trang chủ</a> <span class="sep">›</span> <span class="cur">Tra cứu bảo hành S/N</span></nav>
    <div class="card" style="padding:28px">
      <div class="row" style="gap:10px;margin-bottom:8px">
        <span style="color:var(--acc)">${ic('shield', 26)}</span>
        <h1 style="font-size:1.4rem">Tra cứu bảo hành Laptop theo số Serial (S/N)</h1>
      </div>
      <p class="muted sm" style="margin-bottom:18px">Nhập mã Serial Number (S/N) được cấp khi mua máy tại Laptop99 để kiểm tra ngày kích hoạt và thời hạn bảo hành chính hãng.</p>
      <div class="row" style="flex-wrap:nowrap;gap:8px">
        <input id="sn" placeholder="Nhập mã S/N (Ví dụ: SN-2026-001)" value="${esc(sn)}" onkeydown="if(event.key==='Enter')A.war()">
        <button class="btn a lg" onclick="A.war()">${ic('search', 16)} Kiểm tra ngay</button>
      </div>
      <div class="row xs muted" style="margin-top:10px;gap:6px">
        <span>Gợi ý mã S/N có sẵn trong DB để kiểm tra:</span>
        <a href="#/warranty?sn=SN-2026-001" class="sug-tag">SN-2026-001</a>
        <a href="#/warranty?sn=SN-2026-002" class="sug-tag">SN-2026-002</a>
        <a href="#/warranty?sn=SN-2026-004" class="sug-tag">SN-2026-004</a>
      </div>
    </div>
    ${res}
  </div>`;
}

async function viewPromos() {
  const [promoRes, prodsRes] = await Promise.all([API.get('/promotions'), API.get('/products?limit=24&sort=pop')]);
  const promos = promoRes.data || [];
  const sale = (prodsRes.data || []).map(mapProduct).filter((p) => p.old > p.price);
  sale.forEach((p) => {
    if (!P(p.id)) cache.products.push(p);
  });

  return `<div class="wrap" style="padding-bottom:28px">
    <nav class="bc"><a href="#/">Trang chủ</a> <span class="sep">›</span> <span class="cur">Khuyến mãi &amp; Voucher</span></nav>
    <div class="pg-head" style="padding-top:4px">
      <h1>Mã giảm giá &amp; Chương trình Khuyến mãi</h1>
      <p class="muted sm" style="margin-top:4px">Sao chép mã giảm giá bên dưới và nhập tại bước Giỏ hàng / Thanh toán để được giảm trực tiếp.</p>
    </div>
    <div class="three" style="margin-bottom:28px">
      ${promos
        .map(
          (x, i) => `
        <div class="catc ${i === 0 ? 'hot' : ''}">
          <div>
            <div class="row between">
              <span class="bd ${i === 0 ? 'info' : 'ok'}">Mã Voucher</span>
              <span class="xs muted">HSD: ${x.exp.split('-').reverse().join('/')}</span>
            </div>
            <h3 style="font-size:1.35rem;margin-top:10px;color:var(--acc)">${esc(x.code)}</h3>
            <p class="sm" style="margin-top:6px;color:var(--fg)">${esc(x.desc)}</p>
          </div>
          <div class="row between" style="margin-top:14px;padding-top:10px;border-top:1px dashed var(--line2)">
            <span class="xs muted">Áp dụng toàn hệ thống</span>
            <button class="btn a sm" onclick="A.copy('${esc(x.code)}')">${ic('copy', 13)} Sao chép mã</button>
          </div>
        </div>
      `,
        )
        .join('')}
    </div>
    <div class="sec-box">
      <div class="sec-head">
        <h2 class="sec-title">🔥 SẢN PHẨM ĐANG GIẢM GIÁ TRỰC TIẾP</h2>
      </div>
      <div class="pg">${sale.map(pcard).join('')}</div>
    </div>
  </div>`;
}

async function viewNews(r) {
  const newsRes = await API.get('/news');
  const L = newsRes.data || [];
  if (r.q.open) {
    const n = L.find((x) => String(x.id) === String(r.q.open));
    if (n) {
      const relatedNews = L.filter((x) => String(x.id) !== String(n.id)).slice(0, 3);
      const extUrl = n.url || 'https://vnexpress.net/so-hoa/san-pham';
      const srcName = n.source || 'VnExpress Số Hóa';
      const imgUrl = resolveAssetUrl(n.img || '/uploads/news/news-macbook-pro-m4.jpg');
      setTimeout(
        () =>
          modal(
            mHead(esc(n.title), `${esc(n.tag || 'CÔNG NGHỆ')} · Nguồn: ${esc(srcName)} · Ngày đăng: ${sd(n.at)}`) +
              `<div style="background:#0F172A;border-radius:12px;overflow:hidden;margin-bottom:16px;max-height:320px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.15)">
                <img src="${esc(imgUrl)}" alt="${esc(n.title)}" style="width:100%;height:100%;max-height:320px;object-fit:cover;display:block">
              </div>` +
              `<div style="line-height:1.75;color:var(--fg);font-size:0.95rem">` +
              n.body
                .split('\n')
                .filter(Boolean)
                .map((t) => `<p style="margin-bottom:14px">${esc(t)}</p>`)
                .join('') +
              `</div>` +
              `<div class="row between" style="margin-top:20px;padding:14px 16px;background:var(--acc-light);border:1px solid var(--acc-border);border-radius:12px;flex-wrap:wrap;gap:10px">
                <span class="sm">Nguồn bài viết gốc: <b>📰 ${esc(srcName)}</b></span>
                <a href="${esc(extUrl)}" target="_blank" rel="noopener noreferrer" class="btn a sm" style="font-weight:700">Đọc bài gốc trên ${esc(srcName)} ↗</a>
              </div>` +
              (relatedNews.length
                ? `
          <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--line)">
            <b class="sm">Tin tức công nghệ liên quan khác:</b>
            <div class="gap" style="gap:8px;margin-top:10px">
              ${relatedNews.map((rn) => `<a href="#/news?open=${rn.id}" onclick="closeModal()" class="acc sm" style="display:block;line-height:1.5">• <b>${esc(rn.title)}</b> <span class="muted xs">(${esc(rn.source || 'Báo Công Nghệ')})</span></a>`).join('')}
            </div>
          </div>
        `
                : ''),
          ),
        0,
      );
    }
  }

  const featured = L[0];
  const rest = L.slice(1);

  return `<div class="wrap" style="padding-bottom:32px">
    <nav class="bc"><a href="#/">Trang chủ</a> <span class="sep">›</span> <span class="cur">Tin tức công nghệ</span></nav>
    <div class="row between" style="padding:4px 0 16px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:1.5rem;font-weight:900;color:var(--text-title);margin-bottom:4px">🔥 Tin Tức &amp; Xu Hướng Công Nghệ Laptop</h1>
        <p class="muted sm">Tuyển chọn các tin tức phần cứng mới nhất (MacBook M4, Lunar Lake, RTX 50, Zen 5) từ các cơ quan báo chí công nghệ hàng đầu.</p>
      </div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <a href="https://vnexpress.net/so-hoa" target="_blank" rel="noopener noreferrer" class="btn sm" style="font-size:0.75rem;padding:6px 12px;border-radius:20px;font-weight:700">📰 VnExpress ↗</a>
        <a href="https://tinhte.vn/tag/laptop" target="_blank" rel="noopener noreferrer" class="btn sm" style="font-size:0.75rem;padding:6px 12px;border-radius:20px;font-weight:700">💡 Tinh Tế ↗</a>
        <a href="https://genk.vn/may-tinh.chn" target="_blank" rel="noopener noreferrer" class="btn sm" style="font-size:0.75rem;padding:6px 12px;border-radius:20px;font-weight:700">⚡ GenK ↗</a>
        <a href="https://cellphones.com.vn/sforum/tag/laptop" target="_blank" rel="noopener noreferrer" class="btn sm" style="font-size:0.75rem;padding:6px 12px;border-radius:20px;font-weight:700">📱 Sforum ↗</a>
      </div>
    </div>
    ${
      featured
        ? `
      <div class="news-featured-card">
        <a href="#/news?open=${featured.id}" class="news-featured-thumb" title="${esc(featured.title)}">
          <img src="${esc(resolveAssetUrl(featured.img || '/uploads/news/news-macbook-pro-m4.jpg'))}" alt="${esc(featured.title)}">
        </a>
        <div>
          <div class="row" style="gap:8px;margin-bottom:10px;flex-wrap:wrap">
            <span class="news-tag-overlay" style="position:static;display:inline-block">${esc(featured.tag || 'TIÊU ĐIỂM')}</span>
            <span class="news-source-badge" style="display:inline-block">📰 ${esc(featured.source || 'VnExpress Số Hóa')} <i>✓</i></span>
            <span class="xs muted" style="font-weight:700;display:inline-flex;align-items:center;gap:4px">📅 ${sd(featured.at)}</span>
          </div>
          <a href="#/news?open=${featured.id}" style="text-decoration:none">
            <h2 style="font-size:1.35rem;font-weight:800;margin-bottom:10px;line-height:1.38;color:var(--text-title)">${esc(featured.title)}</h2>
          </a>
          <p class="muted sm" style="line-height:1.65;margin-bottom:16px">${esc(featured.body.slice(0, 240))}...</p>
          <div class="row" style="gap:12px;flex-wrap:wrap">
            <a href="#/news?open=${featured.id}" class="btn sm" style="background:var(--brand-red);color:#fff;border-color:var(--brand-red);font-weight:700">Đọc tóm tắt chi tiết</a>
            <a href="${esc(featured.url || 'https://vnexpress.net/so-hoa')}" target="_blank" rel="noopener noreferrer" class="btn sm" style="font-weight:700">Đọc bài gốc trên ${esc(featured.source || 'Báo điện tử')} ↗</a>
          </div>
        </div>
      </div>
    `
        : ''
    }
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:20px">
      ${(rest.length ? rest : L)
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
              <span class="news-date-text">📅 ${sd(n.at)}</span>
            </div>
            <a href="#/news?open=${n.id}" class="news-title-link">
              <h3 class="news-title-text">${esc(n.title)}</h3>
            </a>
            <p class="news-body-snippet">${esc(n.body.slice(0, 130))}...</p>
          </div>
          <div class="news-actions-footer">
            <a href="#/news?open=${n.id}" class="news-btn-summary">📄 Tóm tắt nhanh</a>
            <a href="${esc(extUrl)}" target="_blank" rel="noopener noreferrer" class="news-btn-source">Đọc trên ${esc(srcName)} ↗</a>
          </div>
        </article>
      `;
        })
        .join('')}
    </div>
  </div>`;
}


