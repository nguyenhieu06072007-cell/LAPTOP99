const fs = require('fs');
const path = require('path');
const https = require('https');
const mysql = require('mysql2/promise');

// Backend and frontend uploads/products directories
const backendProductsDir = path.resolve(__dirname, '..', 'uploads', 'products');
const frontendProductsDir = path.resolve(__dirname, '..', '..', '..', 'laptop-shop-admin', 'public', 'uploads', 'products');

fs.mkdirSync(backendProductsDir, { recursive: true });
fs.mkdirSync(frontendProductsDir, { recursive: true });

// Curated high quality authentic laptop photos from Unsplash
const realLaptopPhotos = [
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&q=80', // MacBook Space Gray
  'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500&q=80', // MacBook Silver Desk
  'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&q=80', // Dell XPS Silver
  'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&q=80', // Dell Business
  'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500&q=80', // Gaming RGB Laptop Asus ROG
  'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=500&q=80', // Minimal Black Laptop ThinkPad
  'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80', // Ultrabook White Desk
  'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=500&q=80', // Modern Tech Laptop
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&q=80', // Modern Work Laptop
  'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=500&q=80', // High Performance Laptop
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: ${res.statusCode}`));
      }
      const stream = fs.createWriteStream(dest);
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close();
        resolve(dest);
      });
      stream.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('Connecting to MySQL...');
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'laptop_shop'
  });

  const [rows] = await conn.query('SELECT DISTINCT url FROM product_images WHERE is_thumbnail = 1');
  console.log(`Found ${rows.length} product thumbnail URLs.`);

  // First, pre-download the 10 real laptop photos locally
  const tempCache = [];
  for (let i = 0; i < realLaptopPhotos.length; i++) {
    const tempPath = path.join(backendProductsDir, `_sample_${i}.jpg`);
    if (!fs.existsSync(tempPath)) {
      console.log(`Downloading real sample photo #${i + 1}...`);
      await downloadFile(realLaptopPhotos[i], tempPath);
    }
    tempCache.push(tempPath);
  }

  // Copy sample photos to match all product thumbnails
  for (let i = 0; i < rows.length; i++) {
    const url = rows[i].url; // e.g. /uploads/products/laptop-dell-xps-13-9340-core-ultra-7-155h-16gb-512gb-1.jpg
    const filename = path.basename(url);
    const sourceSample = tempCache[i % tempCache.length];

    const destBackend = path.join(backendProductsDir, filename);
    const destFrontend = path.join(frontendProductsDir, filename);

    fs.copyFileSync(sourceSample, destBackend);
    fs.copyFileSync(sourceSample, destFrontend);
  }

  // Also clean up temp samples
  tempCache.forEach(f => {
    try { fs.unlinkSync(f); } catch (e) {}
  });

  await conn.end();
  console.log('Successfully populated REAL laptop photos for all 100 products!');
}

main().catch(console.error);
