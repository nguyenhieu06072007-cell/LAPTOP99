/* ==========================================================================
   STOREFRONT MVC CONTROLLER: Main Application Controller & Route Dispatcher
   ========================================================================== */

const A = {
  toggleMenu() {
    const d = $('#m-drawer');
    if (d) d.classList.toggle('open');
  },

  ...HomeController,
  ...CatalogController,
  ...CartController,
  ...CheckoutController,
  ...AuthController,
  ...ServicesController,
  ...ChatbotController,
};

async function storeRoute(r) {
  const m = {
    '': viewHome,
    products: viewProducts,
    product: viewProduct,
    cart: viewCart,
    checkout: viewCheckout,
    'order-done': viewDone,
    account: viewAccount,
    tradein: viewTradein,
    warranty: viewWarranty,
    promos: viewPromos,
    news: viewNews,
    compare: viewCompare,
    wishlist: viewWishlist,
  };
  const fn = m[r.parts[0] || ''] || viewHome;
  return await fn(r);
}

/* ---------- Live Flash Sale Countdown Ticker ---------- */
let flashEndTime = Date.now() + (4 * 3600 + 38 * 60 + 45) * 1000;
setInterval(() => {
  const hEl = document.getElementById('fc-h');
  const mEl = document.getElementById('fc-m');
  const sEl = document.getElementById('fc-s');
  if (!hEl || !mEl || !sEl) return;
  let diffSec = Math.max(0, Math.floor((flashEndTime - Date.now()) / 1000));
  if (diffSec <= 0) {
    flashEndTime = Date.now() + 5 * 3600 * 1000;
    diffSec = 5 * 3600;
  }
  const hh = String(Math.floor(diffSec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
  const ss = String(diffSec % 60).padStart(2, '0');
  hEl.textContent = hh;
  mEl.textContent = mm;
  sEl.textContent = ss;
}, 1000);

/* ---------- Sleek Route Progress Bar & Page Transitions ---------- */
function startRouteProgress() {
  let bar = document.getElementById('route-progress-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'route-progress-bar';
    document.body.appendChild(bar);
  }
  bar.className = 'active';
  bar.style.width = '0%';
  bar.style.opacity = '1';
  requestAnimationFrame(() => {
    bar.style.width = '35%';
    setTimeout(() => {
      if (bar.classList.contains('active')) bar.style.width = '75%';
    }, 120);
  });
}

function finishRouteProgress() {
  const bar = document.getElementById('route-progress-bar');
  if (!bar) return;
  bar.style.width = '100%';
  setTimeout(() => {
    bar.style.opacity = '0';
    setTimeout(() => {
      bar.className = '';
      bar.style.width = '0%';
    }, 220);
  }, 100);
}

/* ---------- Main Async Render Loop with Smooth Transitions ---------- */
let lastPath = null;
let renderSeq = 0;

async function render() {
  const mySeq = ++renderSeq;
  const r = route();
  if (r.parts[0] === 'admin' || r.parts[0] === 'banners') {
    location.hash = '#/';
    return;
  }

  const y = window.scrollY;
  const isNewPage = !lastPath || lastPath !== r.path;

  // Cleanup active timers before re-render
  A.pauseHero();
  A.pauseTrust();

  if (isNewPage) {
    startRouteProgress();
    const oldMain = document.getElementById('main-content');
    if (oldMain && lastPath) {
      oldMain.classList.add('main-transition-out');
    }
  }

  // Nếu tải trang lần đầu, render khung skeleton ngay lập tức tránh màn hình trắng
  if (!lastPath) {
    $('#app').innerHTML = storeShell(
      `<div class="wrap" style="padding:20px 16px 60px">
        <div class="skel" style="height:28px;width:240px;margin-bottom:16px"></div>
        ${renderSkeletonGrid(4)}
      </div>`,
      r,
    );
  }

  try {
    const inner = await storeRoute(r);
    if (mySeq !== renderSeq) return;
    $('#app').innerHTML = storeShell(inner, r);
  } catch (err) {
    if (mySeq !== renderSeq) return;
    const errHtml = `<div class="wrap" style="padding:60px 16px">
      <div class="card center" style="padding:48px 24px;max-width:560px;margin:0 auto">
        <h2 style="font-size:1.35rem;color:var(--bad)">Không thể kết nối dữ liệu từ máy chủ</h2>
        <p class="muted sm" style="margin:10px 0 20px">${esc(err.message || 'Vui lòng kiểm tra kết nối mạng hoặc dịch vụ Backend tại cổng 4000.')}</p>
        <button class="btn a" onclick="render()">Thử tải lại trang</button>
      </div>
    </div>`;
    $('#app').innerHTML = storeShell(errHtml, r);
  }

  // Kích hoạt hiệu ứng xuất hiện mềm mại (fade-in + slide-up) cho nội dung trang mới
  const newMain = document.getElementById('main-content');
  if (newMain && isNewPage) {
    newMain.classList.add('main-transition-in');
  }

  if (isNewPage) {
    finishRouteProgress();
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else {
    window.scrollTo(0, y);
  }

  lastPath = r.path;

  // Initialize Scroll Reveal animation on sections entering viewport
  initScrollReveal();

  // Initialize Marquees
  initMarquees();

  if ((r.parts[0] || '') === '') {
    A.resumeHero();
    A.resumeTrust();
    if (r.q && r.q.nopopup) sessionStorage.setItem('laptop99_promo_popup_seen', '1');
    if (!sessionStorage.getItem('laptop99_promo_popup_seen')) {
      setTimeout(() => {
        if (!sessionStorage.getItem('laptop99_promo_popup_seen')) {
          A.openPromoPopup();
        }
      }, 650);
    }
  }
}

/* ---------- Scroll Reveal (IntersectionObserver System) ---------- */
function initScrollReveal() {
  if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
    $$('.reveal-on-scroll').forEach((el) => el.classList.add('is-revealed'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -40px 0px', threshold: 0.05 },
  );
  $$('.reveal-on-scroll:not(.is-revealed)').forEach((el) => observer.observe(el));
}

/* ---------- Section 3: Continuous Marquee System ---------- */
let marqueeResizeTimer = null;

function initMarquees() {
  const DEFAULT_SPEED_PX_PER_SEC = 60;
  const containers = document.querySelectorAll('.marquee-container');

  containers.forEach((container) => {
    const track = container.querySelector('.marquee-track');
    if (!track) return;

    const group1 = track.querySelector('.marquee-group:not([aria-hidden="true"])');
    if (!group1) return;

    const oldClone = track.querySelector('.marquee-group[aria-hidden="true"]');
    if (oldClone) oldClone.remove();

    if (!group1.dataset.baseHtml) {
      group1.dataset.baseHtml = group1.innerHTML;
    } else {
      group1.innerHTML = group1.dataset.baseHtml;
    }

    const containerWidth = container.offsetWidth || window.innerWidth || 1200;
    const baseHtml = group1.dataset.baseHtml;

    let safetyCounter = 0;
    while (group1.scrollWidth < containerWidth + 240 && safetyCounter < 10) {
      group1.insertAdjacentHTML('beforeend', baseHtml);
      safetyCounter++;
    }

    const group2 = group1.cloneNode(true);
    group2.setAttribute('aria-hidden', 'true');
    track.appendChild(group2);

    const speed = parseFloat(container.dataset.speed) || DEFAULT_SPEED_PX_PER_SEC;
    const singleGroupWidth = group1.scrollWidth || group1.offsetWidth;
    const duration = (singleGroupWidth / speed).toFixed(2);

    track.style.animationDuration = `${duration}s`;

    if (!container.dataset.marqueeTouchBound) {
      container.dataset.marqueeTouchBound = 'true';
      container.addEventListener('touchstart', () => {
        track.style.animationPlayState = 'paused';
      }, { passive: true });
      container.addEventListener('touchend', () => {
        track.style.animationPlayState = 'running';
      }, { passive: true });
    }
  });
}

window.addEventListener('resize', () => {
  clearTimeout(marqueeResizeTimer);
  marqueeResizeTimer = setTimeout(initMarquees, 150);
});

/* ---------- Global Event Listeners (Zero-Jank rAF Scroll) ---------- */
let lastScrollY = window.scrollY;
let scrollTicking = false;
window.addEventListener(
  'scroll',
  () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        const sy = window.scrollY;
        const navEl = $('#nav');
        const bttEl = $('#back-to-top');

        if (bttEl) {
          bttEl.classList.toggle('visible', sy > 350);
        }

        if (navEl) {
          if (sy > 36) navEl.classList.add('scrolled');
          else if (sy < 10) navEl.classList.remove('scrolled');

          if (sy > 120 && sy > lastScrollY + 6) {
            navEl.classList.add('nav-compact');
          } else if (sy < lastScrollY - 6 || sy <= 120) {
            navEl.classList.remove('nav-compact');
          }
        }
        lastScrollY = sy;
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  },
  { passive: true },
);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && e.target && e.target.id === 'lg-p') A.login();
});

document.addEventListener('click', (e) => {
  const sbWrap = $('#sb-wrap');
  if (sbWrap && !sbWrap.contains(e.target)) {
    A.hideSuggest();
  }
  const catWrap = $('.cat-dropdown-wrap');
  if (catWrap && !catWrap.contains(e.target)) {
    catWrap.classList.remove('open');
  }
  const fabWrap = $('#fab-contact-wrap');
  if (fabWrap && !fabWrap.contains(e.target)) {
    const fabMenu = $('#fab-contact-menu');
    if (fabMenu) fabMenu.classList.remove('open');
  }
});

window.addEventListener('hashchange', render);

// Tự động cập nhật dữ liệu mới nhất khi người dùng chuyển từ tab Admin sang tab Storefront
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const r = route();
    if (r.path === '/' || !r.path) {
      render();
    }
  }
});

// Đồng bộ session khách hàng khi tải trang
if (API.getToken() && db.session) {
  API.get('/auth/me', true)
    .then((res) => {
      if (res && res.data) {
        db.session.name = res.data.full_name;
        db.session.email = res.data.email;
        db.session.phone = res.data.phone;
        db.session.addr = res.data.address;
        save();
      }
    })
    .catch(() => {
      API.setToken(null);
      db.session = null;
      save();
    });
}

render();
