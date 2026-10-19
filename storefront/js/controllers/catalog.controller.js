/* ==========================================================================
   STOREFRONT MVC CONTROLLER: Catalog, Search & Product Interaction Controller
   ========================================================================== */

const CatalogController = {
  POPULAR_SEARCHES: [
    'MacBook Air M2',
    'Dell XPS',
    'Lenovo ThinkPad',
    'Asus Vivobook',
    'Laptop Gaming RTX',
    'Core i7',
    'Laptop 16GB RAM',
    'Acer Swift',
  ],

  sugTimer: null,

  switchPdImg(idx, url) {
    const mainImg = $('.pd-main-img');
    if (mainImg && url) mainImg.src = url;
    $$('.pd-dot').forEach((d, i) => d.classList.toggle('on', i === idx));
    $$('.pd-thumb-img').forEach((t, i) => t.classList.toggle('on', i === idx));
  },

  zoomImg(url, title) {
    if (!url) return;
    modal(
      mHead(title || 'Hình ảnh sản phẩm', 'Chế độ xem phóng to độ phân giải cao') +
        `<div class="center" style="background:#F8FAFC;border:1px solid var(--line);border-radius:12px;padding:20px">
        <img src="${esc(url)}" alt="${esc(title || '')}" style="max-height:70vh;width:auto;margin:0 auto;object-fit:contain">
      </div>`,
    );
  },

  showSuggest() {
    const sug = $('#search-sug');
    if (!sug) return;
    const q = val('nq');
    if (!q) {
      this.renderPopularSuggest();
    } else {
      this.liveSuggest(q);
    }
  },

  renderPopularSuggest() {
    const sug = $('#search-sug');
    if (!sug) return;
    sug.innerHTML = `
      <div class="sug-header">Tìm kiếm phổ biến</div>
      <div class="sug-tags">
        ${this.POPULAR_SEARCHES.map((t) => `<span class="sug-tag" onclick="A.pickSuggest('${esc(t)}')">${esc(t)}</span>`).join('')}
      </div>
      <div class="sug-header" style="margin-top:8px">Danh mục đề xuất</div>
      <div class="sug-tags">
        ${(cache.cats || [])
          .slice(0, 6)
          .map((c) => `<span class="sug-tag" onclick="location.hash='#/products?cat=${c.id}';A.hideSuggest()">${esc(c.name)}</span>`)
          .join('')}
      </div>
    `;
    sug.style.display = 'block';
  },

  liveSuggest(q) {
    const sug = $('#search-sug');
    const clearBtn = $('#nq-clear');
    if (clearBtn) clearBtn.style.display = q ? 'inline-flex' : 'none';
    if (!sug) return;

    if (!q || !q.trim()) {
      this.renderPopularSuggest();
      return;
    }

    sug.innerHTML = `<div class="sug-empty">
      <span style="display:inline-block;width:16px;height:16px;border:2px solid var(--line2);border-top-color:var(--acc);border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:6px"></span>
      Đang tìm kiếm <b>"${esc(q.trim())}"</b>...
    </div>`;
    sug.style.display = 'block';

    clearTimeout(this.sugTimer);
    this.sugTimer = setTimeout(async () => {
      try {
        const res = await (typeof ProductService !== 'undefined'
          ? ProductService.getProducts({ search: q.trim(), limit: 6 })
          : API.get('/products?limit=6&q=' + encodeURIComponent(q.trim()), true));
        const list = res.data || [];
        if (!list.length) {
          sug.innerHTML = `
            <div class="sug-empty">Không tìm thấy sản phẩm phù hợp với <b>"${esc(q)}"</b></div>
            <div class="sug-header">Gợi ý từ khóa phổ biến</div>
            <div class="sug-tags">
              ${this.POPULAR_SEARCHES.slice(0, 4)
                .map((t) => `<span class="sug-tag" onclick="A.pickSuggest('${esc(t)}')">${esc(t)}</span>`)
                .join('')}
            </div>
          `;
        } else {
          sug.innerHTML = `
            <div class="sug-header">Sản phẩm gợi ý (${list.length})</div>
            <div class="sug-items">
              ${list
                .map((p) => {
                  const rawImg = p.thumbnail || p.thumbnail_url || (p.images && p.images[0] ? p.images[0].url : '') || '';
                  const fullImg = resolveAssetUrl(rawImg);
                  return `
                  <a href="#/product/${p.id}" class="sug-item" onclick="A.hideSuggest()">
                    ${
                      fullImg
                        ? `<img src="${esc(fullImg)}" class="sug-thumb" alt="${esc(p.name)}">`
                        : `<div class="sug-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--dim)">${ic('laptop', 20)}</div>`
                    }
                    <div class="sug-meta">
                      <div class="sug-name">${esc(p.name)}</div>
                      <div class="sug-sub">${esc(p.brand)} · ${esc(p.cpu_model || '')} · ${p.ram_gb ? p.ram_gb + 'GB' : ''}</div>
                    </div>
                    <div class="sug-price">${vnd(p.final_price || p.sale_price || p.price)}</div>
                  </a>
                `;
                })
                .join('')}
            </div>
            <a href="#/products?q=${encodeURIComponent(q.trim())}" class="sug-footer" onclick="A.hideSuggest()">
              Xem tất cả kết quả cho "${esc(q)}" →
            </a>
          `;
        }
        sug.style.display = 'block';
      } catch (err) {
        sug.innerHTML = `<div class="sug-empty" style="color:var(--bad)">Không thể tải gợi ý tìm kiếm. Nhấn Enter để tìm trực tiếp.</div>`;
        sug.style.display = 'block';
      }
    }, 180);
  },

  hideSuggest() {
    const sug = $('#search-sug');
    if (sug) sug.style.display = 'none';
  },

  pickSuggest(text) {
    const inp = $('#nq');
    if (inp) inp.value = text;
    this.hideSuggest();
    location.hash = '#/products?q=' + encodeURIComponent(text);
  },

  clearSearch() {
    const inp = $('#nq');
    if (inp) {
      inp.value = '';
      inp.focus();
    }
    const clearBtn = $('#nq-clear');
    if (clearBtn) clearBtn.style.display = 'none';
    this.renderPopularSuggest();
  },

  searchKey(e) {
    const sug = $('#search-sug');
    if (!sug || sug.style.display === 'none') {
      if (e.key === 'ArrowDown') this.showSuggest();
      return;
    }
    const items = $$('.sug-item, .sug-tag', sug);
    if (!items.length) return;
    const activeIdx = items.findIndex((it) => it.classList.contains('active'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (activeIdx + 1) % items.length;
      items.forEach((it, i) => it.classList.toggle('active', i === nextIdx));
      items[nextIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = (activeIdx - 1 + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle('active', i === prevIdx));
      items[prevIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0) {
        e.preventDefault();
        items[activeIdx].click();
      }
    } else if (e.key === 'Escape') {
      this.hideSuggest();
    }
  },

  backToTop() {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  },

  nsearch(e) {
    e.preventDefault();
    this.hideSuggest();
    const q = val('nq');
    location.hash = '#/products?q=' + encodeURIComponent(q);
    return false;
  },

  wish(pid) {
    if (!Array.isArray(db.wishlist)) db.wishlist = [];
    const idx = db.wishlist.indexOf(String(pid));
    if (idx >= 0) {
      db.wishlist.splice(idx, 1);
      toast('Đã bỏ khỏi danh sách yêu thích');
    } else {
      db.wishlist.push(String(pid));
      toast('Đã thêm vào danh sách yêu thích ♥');
    }
    save();
    render();
  },

  async cmp(pid) {
    const i = db.compare.indexOf(pid);
    if (i >= 0) {
      db.compare.splice(i, 1);
      toast('Đã xóa khỏi danh sách so sánh');
    } else if (db.compare.length >= 3) {
      return toast('Chỉ so sánh được tối đa 3 mẫu laptop cùng lúc', 1);
    } else {
      db.compare.push(pid);
      if (!P(pid)) {
        try {
          const res = await (typeof ProductService !== 'undefined'
            ? ProductService.getProductDetail(String(pid).replace(/^p/, ''))
            : API.get('/products/' + String(pid).replace(/^p/, ''), true));
          const p = mapProduct(res.data);
          if (p) cache.products.push(p);
        } catch (e) {}
      }
      toast('Đã thêm vào danh sách so sánh (' + db.compare.length + '/3)');
    }
    save();
    render();
  },
};

