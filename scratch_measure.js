const r = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const b = el.getBoundingClientRect();
  return { left: Math.round(b.left), right: Math.round(b.right), width: Math.round(b.width), height: Math.round(b.height), top: Math.round(b.top), bottom: Math.round(b.bottom) };
};
console.log(JSON.stringify({
  grid: r('.cps-hero-grid'),
  sidebar: r('.cat-sidebar'),
  center: r('.hero-center-col'),
  sub3: document.querySelectorAll('.hcs-card')[2] ? (() => { const b = document.querySelectorAll('.hcs-card')[2].getBoundingClientRect(); return { left: Math.round(b.left), right: Math.round(b.right), width: Math.round(b.width) }; })() : null,
  right: r('.hero-right-col'),
  miniCard: r('.mini-promo-card-wide'),
  mpwContent: r('.mpw-content')
}, null, 2));