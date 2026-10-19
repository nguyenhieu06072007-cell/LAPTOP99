/* ==========================================================================
   STOREFRONT MVC MODEL: Product Entity Mapper & Spec Parser
   ========================================================================== */

const BRAND_HUE = {
  Apple: 215,
  ASUS: 225,
  Dell: 205,
  Lenovo: 350,
  HP: 200,
  MSI: 355,
  Acer: 145,
  LG: 340,
  Microsoft: 195,
};

/**
 * mapProduct — Chuyển đổi dữ liệu sản phẩm từ MySQL Backend sang đối tượng Model chuẩn của UI
 */
function mapProduct(p) {
  if (!p) return null;
  const salePrice = p.sale_price ? Number(p.sale_price) : null;
  const basePrice = Number(p.price) || 0;
  const finalPrice = salePrice || basePrice;
  const oldPrice = salePrice && basePrice > salePrice ? basePrice : basePrice;

  const ramNum = Number(p.ram_gb) || 16;
  const ramStr = p.ram_type ? `${ramNum}GB ${p.ram_type}` : `${ramNum}GB`;

  const storageNum = Number(p.storage_gb) || 512;
  const storageUnit = storageNum >= 1024 ? `${storageNum / 1024}TB` : `${storageNum}GB`;
  const ssdStr = p.storage_type ? `${storageUnit} ${p.storage_type}` : `${storageUnit} SSD NVMe`;

  const screenParts = [];
  if (p.screen_size_inch) screenParts.push(`${p.screen_size_inch}"`);
  if (p.screen_resolution) screenParts.push(p.screen_resolution);
  if (p.refresh_rate_hz) screenParts.push(`${p.refresh_rate_hz}Hz`);
  const screenStr = screenParts.length ? screenParts.join(' ') : '15.6" FHD';

  const weightStr = p.weight_kg ? `${p.weight_kg} kg` : '1.5 kg';

  const reviews = Array.isArray(p.reviews)
    ? p.reviews.map((r) => ({
        by: r.customer_id || 'u',
        name: r.customer_name || 'Khách hàng',
        star: Number(r.rating) || 5,
        text: r.comment || r.title || '',
        verified: Boolean(r.verified_purchase),
        reply: r.admin_reply || null,
        at: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
      }))
    : [];

  const rawThumb = p.thumbnail || p.thumbnail_url || (Array.isArray(p.images) && p.images[0] ? p.images[0].url : '');
  const thumbUrl = resolveAssetUrl(rawThumb);

  const images = Array.isArray(p.images) && p.images.length
    ? p.images.map((im) => ({ ...im, url: resolveAssetUrl(im.url) }))
    : (thumbUrl ? [{ id: 0, url: thumbUrl, alt_text: p.name, is_thumbnail: 1 }] : []);

  return {
    id: String(p.id),
    rawId: Number(p.id),
    sku: p.sku || `LP-${p.id}`,
    name: p.name,
    brand: p.brand || 'Laptop',
    cat: String(p.category_id || '1'),
    catName: p.category || '',
    catSlug: p.category_slug || '',
    price: finalPrice,
    old: oldPrice,
    stock: Number(p.stock_quantity ?? 0),
    warranty: Number(p.warranty_months || 12),
    cpu: p.cpu_model || 'Intel Core i5',
    cpuBrand: p.cpu_brand || '',
    cpuCores: p.cpu_cores ? `${p.cpu_cores} nhân / ${p.cpu_threads || p.cpu_cores * 2} luồng` : '',
    ram: ramStr,
    ramGb: ramNum,
    ramMax: p.ram_max_gb ? `Tối đa ${p.ram_max_gb}GB` : '',
    ssd: ssdStr,
    storageGb: storageNum,
    gpu: p.gpu_model || 'Đồ họa tích hợp',
    gpuType: p.gpu_type || '',
    screen: screenStr,
    panel: p.screen_panel || 'IPS',
    refreshRate: p.refresh_rate_hz ? `${p.refresh_rate_hz}Hz` : '60Hz',
    weight: weightStr,
    battery: p.battery_wh ? `${p.battery_wh}Wh` : '',
    charger: p.charger_w ? `Sạc ${p.charger_w}W` : '',
    os: p.os || 'Windows 11 Bản quyền',
    ports: p.ports || 'USB-C, USB-A 3.2, HDMI, Audio 3.5mm',
    wifi: p.wifi || 'Wi-Fi 6E',
    bluetooth: p.bluetooth || 'Bluetooth 5.3',
    color: p.color || 'Chính hãng',
    material: p.material || 'Hợp kim cao cấp',
    dimensions: p.dimensions || '',
    hue: BRAND_HUE[p.brand] || 215,
    desc: p.short_description || p.description || '',
    fullDesc: p.description || p.short_description || '',
    thumbnail: thumbUrl,
    images,
    rating: Number(p.avg_rating || 5).toFixed(1),
    reviewCount: Number(p.review_count ?? reviews.length),
    soldCount: Number(p.sold_count || 0),
    isBestseller: Boolean(p.is_bestseller),
    isNew: Boolean(p.is_new),
    reviews,
  };
}

