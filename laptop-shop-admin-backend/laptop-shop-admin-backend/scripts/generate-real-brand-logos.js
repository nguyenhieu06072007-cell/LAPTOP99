const fs = require('fs');
const path = require('path');

const brandsDir = path.resolve(__dirname, '..', 'uploads', 'brands');
fs.mkdirSync(brandsDir, { recursive: true });

const svgs = {
  'dell.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60" width="160" height="60">
    <rect width="160" height="60" rx="8" fill="#ffffff" />
    <circle cx="80" cy="30" r="26" fill="none" stroke="#0076CE" stroke-width="3" />
    <text x="80" y="38" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="20" fill="#0076CE" text-anchor="middle" letter-spacing="2">DELL</text>
  </svg>`,

  'hp.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60" width="160" height="60">
    <rect width="160" height="60" rx="8" fill="#ffffff" />
    <circle cx="80" cy="30" r="26" fill="#0096D6" />
    <text x="78" y="38" font-family="'Trebuchet MS', 'Arial Black', sans-serif" font-weight="bold" font-style="italic" font-size="28" fill="#ffffff" text-anchor="middle">hp</text>
  </svg>`,

  'asus.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60" width="160" height="60">
    <rect width="160" height="60" rx="8" fill="#ffffff" />
    <text x="80" y="39" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="28" fill="#00539F" text-anchor="middle" letter-spacing="3">ASUS</text>
    <line x1="40" y1="29" x2="120" y2="29" stroke="#ffffff" stroke-width="2.5" />
  </svg>`,

  'lenovo.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60" width="160" height="60">
    <rect width="160" height="60" rx="8" fill="#ffffff" />
    <rect x="20" y="14" width="120" height="32" rx="4" fill="#E2231A" />
    <text x="80" y="37" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold" font-size="20" fill="#ffffff" text-anchor="middle" letter-spacing="1">lenovo</text>
  </svg>`,

  'acer.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60" width="160" height="60">
    <rect width="160" height="60" rx="8" fill="#ffffff" />
    <text x="80" y="39" font-family="'Century Gothic', Arial, sans-serif" font-weight="bold" font-size="28" fill="#83B81A" text-anchor="middle" letter-spacing="1">acer</text>
  </svg>`,

  'apple.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60" width="160" height="60">
    <rect width="160" height="60" rx="8" fill="#ffffff" />
    <g transform="translate(67, 12) scale(0.07)">
      <path fill="#333333" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 66.2 37.9 135.2c19.7 34.6 46.2 73.1 79.2 71.9 26.1-.9 36.6-17.1 68.2-17.1 31.2 0 41.2 17.1 68.2 16.6 33.6-.5 57.5-35.7 77.2-70.3 22.8-39.7 32.2-78.2 32.7-80.2-.7-.7-62.8-25.1-63.7-60.9zM252.1 97.4c15.2-19.4 25.6-46.4 22.8-73.4-23.7 1-52.6 15.6-67.8 35-13.3 16.6-25.1 43.6-22 70.2 26.6 2 53.7-13.3 67-31.8z"/>
    </g>
    <text x="105" y="37" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="600" font-size="16" fill="#333333">Apple</text>
  </svg>`,

  'msi.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60" width="160" height="60">
    <rect width="160" height="60" rx="8" fill="#ffffff" />
    <rect x="25" y="14" width="110" height="32" rx="4" fill="#ED1C24" />
    <text x="80" y="38" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="22" fill="#ffffff" text-anchor="middle" font-style="italic" letter-spacing="3">msi</text>
  </svg>`,

  'lg.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60" width="160" height="60">
    <rect width="160" height="60" rx="8" fill="#ffffff" />
    <circle cx="58" cy="30" r="18" fill="#A50034" />
    <circle cx="51" cy="24" r="2.5" fill="#ffffff" />
    <path d="M 58 20 L 58 35 L 68 35" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    <text x="96" y="37" font-family="'Arial Black', sans-serif" font-weight="bold" font-size="20" fill="#A50034">LG</text>
  </svg>`,

  'microsoft.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60" width="160" height="60">
    <rect width="160" height="60" rx="8" fill="#ffffff" />
    <g transform="translate(18, 17)">
      <rect x="0" y="0" width="12" height="12" fill="#F25022"/>
      <rect x="14" y="0" width="12" height="12" fill="#7FBA00"/>
      <rect x="0" y="14" width="12" height="12" fill="#00A4EF"/>
      <rect x="14" y="14" width="12" height="12" fill="#FFB900"/>
    </g>
    <text x="52" y="36" font-family="'Segoe UI', Arial, sans-serif" font-weight="600" font-size="16" fill="#5E5E5E">Microsoft</text>
  </svg>`,
};

for (const [filename, content] of Object.entries(svgs)) {
  const filePath = path.join(brandsDir, filename);
  fs.writeFileSync(filePath, content.trim());
  console.log('Saved:', filePath);
}

// Also save with .png extension so if anything queries .png it works via mime or SVG payload
for (const [filename, content] of Object.entries(svgs)) {
  const pngName = filename.replace('.svg', '.png');
  const filePath = path.join(brandsDir, pngName);
  fs.writeFileSync(filePath, content.trim());
}

console.log('Done generating brand SVG/PNG files!');
