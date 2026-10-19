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
      return {
        cart: Array.isArray(parsed.cart) ? parsed.cart : [],
        compare: Array.isArray(parsed.compare) ? parsed.compare : [],
        wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
        viewed: Array.isArray(parsed.viewed) ? parsed.viewed : [],
        cartCoupon: parsed.cartCoupon || '',
        cartTI: parsed.cartTI || '',
        session: parsed.session || null,
      };
    }
  } catch (e) {}
  return { cart: [], compare: [], wishlist: [], viewed: [], cartCoupon: '', cartTI: '', session: null };
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
  if (cache.cats.length) return cache.cats;
  try {
    const res = await (typeof ProductService !== 'undefined' ? ProductService.getCategories() : API.get('/categories', true));
    cache.cats = (res.data || []).map((c) => ({
      id: String(c.id),
      name: c.name,
      slug: c.slug,
      desc: c.description || 'Laptop chính hãng phân phối tại Laptop99',
      count: Number(c.product_count || 0),
    }));
  } catch (e) {}
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
