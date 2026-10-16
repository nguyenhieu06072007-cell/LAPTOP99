/* ==========================================================================
   STOREFRONT MVC MODEL: Cart Calculations, QR Code & Trade-In Appraisal Model
   ========================================================================== */

const PAY = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  bank: 'Chuyển khoản ngân hàng 24/7 (Mã QR Ngân hàng VietQR)',
  card: 'Thanh toán Online (Quét mã QR Ngân hàng Napas 247 / Ví điện tử)',
  installment: 'Trả góp 0% lãi suất',
};

const BANK_ACCOUNTS = {
  MB: {
    key: 'MB',
    bin: 'MB',
    name: 'MB Bank (Ngân hàng Quân Đội)',
    short: 'MB Bank',
    acc: '0909998899',
    holder: 'CONG TY TNHH LAPTOP99 VIET NAM',
    branch: 'CN TP. Hồ Chí Minh',
  },
  VCB: {
    key: 'VCB',
    bin: 'VCB',
    name: 'Vietcombank (Ngân hàng Ngoại Thương)',
    short: 'Vietcombank',
    acc: '1029998899',
    holder: 'CONG TY TNHH LAPTOP99 VIET NAM',
    branch: 'CN Sài Gòn',
  },
  TCB: {
    key: 'TCB',
    bin: 'TCB',
    name: 'Techcombank (Ngân hàng Kỹ Thương)',
    short: 'Techcombank',
    acc: '19039988999018',
    holder: 'CONG TY TNHH LAPTOP99 VIET NAM',
    branch: 'CN Thắng Lợi',
  },
  BIDV: {
    key: 'BIDV',
    bin: 'BIDV',
    name: 'BIDV (Đầu tư & Phát triển VN)',
    short: 'BIDV',
    acc: '31410009988999',
    holder: 'CONG TY TNHH LAPTOP99 VIET NAM',
    branch: 'CN Đông Sài Gòn',
  },
};

function buildVietQrUrl(bankKey = 'MB', amount = 0, memo = 'LAPTOP99 THANH TOAN') {
  const b = BANK_ACCOUNTS[bankKey] || BANK_ACCOUNTS.MB;
  const amt = Math.max(0, Math.round(Number(amount) || 0));
  const cleanMemo = String(memo || 'LAPTOP99').replace(/[^a-zA-Z0-9 \-]/g, ' ').trim();
  return `https://img.vietqr.io/image/${b.bin}-${b.acc}-compact2.png?amount=${amt}&addInfo=${encodeURIComponent(cleanMemo)}&accountName=${encodeURIComponent(b.holder)}`;
}

let lastCouponCheck = null;

async function calcCart() {
  const sub = db.cart.reduce((s, i) => {
    const p = P(i.pid);
    return s + (p ? p.price * i.qty : 0);
  }, 0);

  let disc = 0;
  let promo = null;
  if (db.cartCoupon && sub > 0) {
    try {
      const res = await PromotionsService.checkCoupon(db.cartCoupon, sub);
      if (res && res.valid) {
        disc = Number(res.discount) || 0;
        promo = res;
        lastCouponCheck = res;
      } else {
        lastCouponCheck = null;
      }
    } catch (e) {
      lastCouponCheck = null;
    }
  }

  const tiObj = db.cartTI ? cache.tradeins.find((t) => t.id === db.cartTI && t.status === 'Đã định giá') : null;
  const ti = tiObj ? Number(tiObj.final || 0) : 0;
  return { sub, disc, ti, total: Math.max(0, sub - disc - ti), promo };
}

function tiEstimate(brand, year, ram, cond) {
  const base = { Apple: 12e6, ASUS: 8e6, MSI: 8e6, Dell: 7e6, Lenovo: 6e6, HP: 5e6, Acer: 5e6, LG: 6e6, Khác: 3.5e6 }[brand] || 3.5e6;
  const f = Math.max(0.2, 1 - (2026 - year) * 0.14);
  const c = { 'Như mới': 1, 'Tốt': 0.85, 'Trầy xước': 0.68, 'Lỗi nhẹ': 0.45 }[cond] || 0.8;
  const r = ram >= 16 ? 1.12 : ram >= 8 ? 1 : 0.85;
  return Math.round((base * f * c * r) / 1e5) * 1e5;
}

