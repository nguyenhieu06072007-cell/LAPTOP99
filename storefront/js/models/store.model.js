/* ==========================================================================
   STOREFRONT MVC MODEL: Global State Store & Runtime Cache
   ========================================================================== */

const KEY = 'laptop99_v2_client';

function loadState() {
  try {
    const r = localStorage.getItem(KEY);
    if (r) {
      const parsed = JSON.parse(r);
      if (parsed.session && parsed.session.email === 'khach@demo.vn') {
        parsed.session = null;
        try { API.setToken(null); } catch (e) {}
      }
      // Dọn dẹp mã giảm giá cũ không hợp lệ để không cản trở đặt hàng
      let initCoupon = parsed.cartCoupon || '';
      if (initCoupon === 'GAMING500K') initCoupon = '';

      return {
        cart: Array.isArray(parsed.cart) ? parsed.cart : [],
        compare: Array.isArray(parsed.compare) ? parsed.compare : [],
        wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
        viewed: Array.isArray(parsed.viewed) ? parsed.viewed : [],
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        cartCoupon: initCoupon,
        cartTI: parsed.cartTI || '',
        session: parsed.session || null,
      };
    }
  } catch (e) {}
  return { cart: [], compare: [], wishlist: [], viewed: [], orders: [], cartCoupon: '', cartTI: '', session: null };
}

let db = loadState();

const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {}
};

// Runtime Memory Cache
const cache = {
  cats: [],
  brands: [],
  products: [],
  promos: [],
  news: [],
  myOrders: [],
  tradeins: [],
  rmas: [],
  heroIdx: 0,
  trustIdx: 0,
  diffOnly: false,
};

async function ensureCategories() {
  if (cache.cats && cache.cats.length) return cache.cats;
  try {
    const res = await (typeof ProductService !== 'undefined' ? ProductService.getCategories() : API.get('/categories', true));
    if (res && Array.isArray(res.data) && res.data.length) {
      cache.cats = res.data.map((c) => ({
        id: String(c.id),
        name: c.name,
        slug: c.slug,
        desc: c.description || 'Laptop chính hãng phân phối tại Laptop99',
        count: Number(c.product_count || 0),
      }));
    }
  } catch (e) {}
  if (!cache.cats || !cache.cats.length) {
    cache.cats = [
      { id: '1', name: 'Laptop Văn Phòng', slug: 'laptop-van-phong', desc: 'Máy gọn nhẹ, pin trâu', count: 12 },
      { id: '2', name: 'Laptop Gaming', slug: 'laptop-gaming', desc: 'Cấu hình khủng, màn hình tần số quét cao', count: 18 },
      { id: '3', name: 'MacBook & Mỏng Nhẹ', slug: 'macbook-mong-nhe', desc: 'Mỏng nhẹ cao cấp, màn hình sắc nét', count: 14 },
      { id: '4', name: 'Đồ Họa - Kỹ Thuật', slug: 'do-hoa-ky-thuat', desc: 'Card rời mạnh mẽ, chuẩn màu đồ họa', count: 10 },
      { id: '5', name: 'Laptop Sinh Viên', slug: 'laptop-sinh-vien', desc: 'Giá tốt, độ bền cao, bảo hành dài hạn', count: 16 },
      { id: '6', name: 'Laptop Doanh Nhân', slug: 'laptop-doanh-nhan', desc: 'Bảo mật vân tay, thiết kế sang trọng', count: 8 },
    ];
  }
  return cache.cats;
}

const P = (id) => cache.products.find((p) => String(p.id) === String(id) || String(p.rawId) === String(id).replace(/^p/, ''));
const me = () => (db.session && db.session.role === 'customer' ? db.session : null);

function catName(id) {
  const c = cache.cats.find((x) => String(x.id) === String(id) || x.slug === id);
  return c ? c.name : id;
}

function trackViewed(pid) {
  const s = String(pid);
  db.viewed = [s, ...(db.viewed || []).filter((x) => String(x) !== s)].slice(0, 8);
  save();
}
