/* ==========================================================================
   STOREFRONT MVC FORMATTERS: Currency, Date, Stars & Spec Formatters
   ========================================================================== */

function fmt(n) {
  if (n == null || isNaN(n)) return '0 ₫';
  return Number(n).toLocaleString('vi-VN') + ' ₫';
}

function sd(d) {
  if (!d) return '';
  const dt = typeof d === 'number' ? new Date(d) : new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

const fmtDate = sd;
window.fmtDate = sd;

function stars(n) {
  const v = Math.min(5, Math.max(0, Number(n) || 0));
  const full = Math.floor(v);
  const half = v - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    '<span class="stars" aria-label="' +
    v.toFixed(1) +
    ' trên 5 sao">' +
    '★'.repeat(full) +
    (half ? '½' : '') +
    '☆'.repeat(empty) +
    '</span>'
  );
}

