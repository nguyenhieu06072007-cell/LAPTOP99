/**
 * Image URL resolver & fallback handler for Admin CMS
 * Resolves static seed images from Storefront Vercel and dynamic uploads from Render backend.
 */

export function resolveAdminImageUrl(url) {
  if (!url) return '/laptop-placeholder.svg';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }
  const clean = url.startsWith('/') ? url.slice(1) : url;

  // Dynamic uploads (products or banners uploaded via Admin to Render)
  if (
    clean.includes('product-') ||
    clean.includes('banner-') ||
    clean.startsWith('uploads/banners/') ||
    clean.startsWith('uploads/temp/')
  ) {
    return `https://laptop99-ejug.onrender.com/${clean}`;
  }

  // Static seed products on Storefront Vercel
  return `https://laptop99.vercel.app/${clean}`;
}

export function handleImageError(e) {
  const currentSrc = e.currentTarget.src || '';
  if (!e.currentTarget.dataset.fallbackTried) {
    e.currentTarget.dataset.fallbackTried = '1';
    if (currentSrc.includes('onrender.com')) {
      e.currentTarget.src = currentSrc.replace('https://laptop99-ejug.onrender.com', 'https://laptop99.vercel.app');
      return;
    } else if (currentSrc.includes('vercel.app')) {
      e.currentTarget.src = currentSrc.replace('https://laptop99.vercel.app', 'https://laptop99-ejug.onrender.com');
      return;
    }
  }
  e.currentTarget.src = '/laptop-placeholder.svg';
}
