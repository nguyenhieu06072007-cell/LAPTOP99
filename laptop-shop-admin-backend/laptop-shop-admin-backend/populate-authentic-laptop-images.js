const fs = require('fs');
const path = require('path');
const https = require('https');
const mysql = require('mysql2/promise');

const backendUploadDir = path.resolve(__dirname, 'uploads', 'products');
const frontendUploadDir = path.resolve(__dirname, '..', '..', 'laptop-shop-admin', 'public', 'uploads', 'products');

fs.mkdirSync(backendUploadDir, { recursive: true });
fs.mkdirSync(frontendUploadDir, { recursive: true });

// Catalog of curated, authentic real laptop photos for each specific laptop family
const curatedImages = [
  {
    key: 'macbook-pro',
    url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('MacBook Pro')
  },
  {
    key: 'macbook-air',
    url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('MacBook Air') || name.includes('Apple')
  },
  {
    key: 'dell-xps',
    url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('XPS')
  },
  {
    key: 'dell-alienware',
    url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('Alienware') || (name.includes('Dell') && name.includes('gaming'))
  },
  {
    key: 'dell-inspiron',
    url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('Dell')
  },
  {
    key: 'asus-rog',
    url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('ROG') || name.includes('Strix') || name.includes('Zephyrus')
  },
  {
    key: 'asus-tuf',
    url: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('TUF')
  },
  {
    key: 'asus-zenbook',
    url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('Zenbook') || name.includes('Vivobook') || name.includes('Asus')
  },
  {
    key: 'lenovo-thinkpad',
    url: 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('ThinkPad')
  },
  {
    key: 'lenovo-legion',
    url: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('Legion') || name.includes('LOQ')
  },
  {
    key: 'lenovo-ideapad',
    url: 'https://images.unsplash.com/photo-1544731612-de7f96afe55f?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('IdeaPad') || name.includes('Yoga') || name.includes('Lenovo')
  },
  {
    key: 'hp-omen-victus',
    url: 'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('Victus') || name.includes('Omen')
  },
  {
    key: 'hp-envy-spectre',
    url: 'https://images.unsplash.com/photo-1504707748692-419802cf939d?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('Envy') || name.includes('Spectre') || name.includes('Pavilion') || name.includes('HP')
  },
  {
    key: 'acer-predator',
    url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('Predator') || name.includes('Nitro')
  },
  {
    key: 'acer-aspire-swift',
    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('Acer')
  },
  {
    key: 'msi-gaming',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('MSI') && (name.includes('gaming') || name.includes('Katana') || name.includes('Raider') || name.includes('Cyborg'))
  },
  {
    key: 'msi-modern',
    url: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('MSI')
  },
  {
    key: 'lg-gram',
    url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('LG') || name.includes('Gram')
  },
  {
    key: 'microsoft-surface',
    url: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800&auto=format&fit=crop&q=80',
    matches: (name) => name.includes('Surface') || name.includes('Microsoft')
  },
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Status ${res.statusCode}`));
      }
      const stream = fs.createWriteStream(dest);
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close();
        resolve();
      });
      stream.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  console.log('1. Downloading authentic real laptop photos for each series...');
  const keyToFilename = {};

  for (const item of curatedImages) {
    const filename = `real-${item.key}.jpg`;
    const backendDest = path.join(backendUploadDir, filename);
    const frontendDest = path.join(frontendUploadDir, filename);

    if (!fs.existsSync(backendDest) || fs.statSync(backendDest).size < 1000) {
      console.log(`Downloading ${item.key}...`);
      try {
        await downloadFile(item.url, backendDest);
      } catch (e) {
        console.error(`Failed to download ${item.key}:`, e.message);
      }
    }
    if (fs.existsSync(backendDest)) {
      fs.copyFileSync(backendDest, frontendDest);
      keyToFilename[item.key] = filename;
    }
  }

  console.log('2. Updating MySQL database with matched photos...');
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'laptop_shop',
  });

  const [products] = await conn.query('SELECT p.id, p.name, b.name AS brand FROM products p JOIN brands b ON b.id = p.brand_id');

  for (const p of products) {
    let matchedItem = curatedImages.find(ci => ci.matches(p.name));
    if (!matchedItem) {
      matchedItem = curatedImages.find(ci => ci.matches(p.brand)) || curatedImages[0];
    }

    const assignedFilename = keyToFilename[matchedItem.key] || 'real-dell-inspiron.jpg';
    const assignedUrl = `/uploads/products/${assignedFilename}`;

    // Update thumbnail in product_images
    const [existing] = await conn.query('SELECT id FROM product_images WHERE product_id = ? AND is_thumbnail = 1', [p.id]);
    if (existing.length > 0) {
      await conn.query('UPDATE product_images SET url = ? WHERE id = ?', [assignedUrl, existing[0].id]);
    } else {
      await conn.query(
        'INSERT INTO product_images (product_id, url, alt_text, is_thumbnail, sort_order) VALUES (?, ?, ?, 1, 1)',
        [p.id, assignedUrl, p.name]
      );
    }
  }

  console.log(`Successfully mapped ${products.length} products to their authentic laptop photos!`);
  await conn.end();
  process.exit(0);
}

run().catch(console.error);
