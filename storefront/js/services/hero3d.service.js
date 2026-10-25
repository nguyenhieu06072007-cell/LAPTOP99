/* ==========================================================================
   AURA × LAPTOP99: HERO 3D WEBGL STUDIO SERVICE (Three.js WebGL Interactive Studio)
   - Awwwards Site of the Year Standard 3D WebGL Flagship
   - Procedural CNC Anodized Titanium Unibody Laptop with diamond-cut bevels
   - 2 Fluid 3D Glass Ribbon Loops (MeshPhysicalMaterial transmission: 0.94, ior: 1.52)
   - 4 Holographic Light Trails (Cyan #6CE8FF, Gold #FFCF78, Violet #A37CFF)
   - 320 Floating Bokeh Stardust Particles with soft motion drift
   - 360-Degree Damped Mouse Drag Orbit & Gyroscopic Mouse Tilt
   - View Modes: Hero Angle (-24° cinematic), Exploded View (Layer separation), MSI Raider RGB
   - Performance: IntersectionObserver pauses rendering when off-screen
   ========================================================================== */

const Hero3DService = (function () {
  let scene, camera, renderer, animFrameId;
  let laptopGroup, baseGroup, lidGroup, keyboardDeckMesh, screenMesh, shadowMesh;
  let glassRibbonGroup, lightTrailGroup, stardustPoints;
  let chassisMaterials = [];
  let lightTrailMaterials = [];

  let isDragging = false;
  let prevMouseX = 0, prevMouseY = 0;
  let targetRotationY = -0.38, targetRotationX = 0.18;
  let currentRotationY = -0.38, currentRotationX = 0.18;
  let mouseTiltX = 0, mouseTiltY = 0;
  let targetTiltX = 0, targetTiltY = 0;
  let isPaused = false;
  let observer = null;
  let containerEl = null;

  // View Presets & Exploded Animation Interpolation
  let currentViewMode = 'hero'; // 'hero' | 'exploded' | 'rgb'
  let targetExplodedFactor = 0;
  let currentExplodedFactor = 0;

  const COLOR_PALETTE = {
    titanium: { name: 'Titanium Raw', hex: 0x98a0a8, rgb: '#98A0A8' },
    space_gray: { name: 'Space Obsidian', hex: 0x2e3238, rgb: '#2E3238' },
    silver: { name: 'Liquid Silver', hex: 0xd8dbe0, rgb: '#D8DBE0' },
    midnight: { name: 'Midnight Cosmic', hex: 0x0f172a, rgb: '#0F172A' },
    champagne: { name: 'Champagne Gold', hex: 0xd2ba96, rgb: '#D2BA96' },
  };

  let activeColor = 'titanium';

  function isWebGLAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (e) {
      return false;
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Soft Bokeh Stardust Particle Texture
  function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const rad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    rad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    rad.addColorStop(0.25, 'rgba(108, 232, 255, 0.85)');
    rad.addColorStop(0.6, 'rgba(163, 124, 255, 0.35)');
    rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  // Dynamic High-Resolution AURA X OLED Screen Wallpaper
  function createScreenTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // Deep Obsidian Nebula Gradient
    const grad = ctx.createLinearGradient(0, 0, 1280, 800);
    grad.addColorStop(0, '#04060D');
    grad.addColorStop(0.35, '#0B1328');
    grad.addColorStop(0.7, '#151028');
    grad.addColorStop(1, '#04060D');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 800);

    // Optical Cyan & Gold Plasma Glow
    const glowGrad1 = ctx.createRadialGradient(640, 400, 30, 640, 400, 520);
    glowGrad1.addColorStop(0, 'rgba(108, 232, 255, 0.28)');
    glowGrad1.addColorStop(0.4, 'rgba(255, 207, 120, 0.16)');
    glowGrad1.addColorStop(0.8, 'rgba(163, 124, 255, 0.10)');
    glowGrad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad1;
    ctx.fillRect(0, 0, 1280, 800);

    // Subtle Precision Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 40; x < 1280; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 800);
      ctx.stroke();
    }
    for (let y = 40; y < 800; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1280, y);
      ctx.stroke();
    }

    // Top macOS / Studio Status Bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.fillRect(0, 0, 1280, 42);

    // Window Dots (Red, Yellow, Green)
    const dots = ['#E11D48', '#F59E0B', '#10B981'];
    dots.forEach((color, idx) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(32 + idx * 22, 21, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Center Status Text
    ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.textAlign = 'center';
    ctx.fillText('AURA OS 2026.1 • TITANIUM PRO ARCHITECTURE', 640, 26);

    // Brand Headline: THE AURA X
    ctx.font = '300 68px "Cormorant Garamond", Georgia, serif';
    const goldGrad = ctx.createLinearGradient(400, 260, 880, 340);
    goldGrad.addColorStop(0, '#FFFDF9');
    goldGrad.addColorStop(0.5, '#FFCF78');
    goldGrad.addColorStop(1, '#D2BA96');
    ctx.fillStyle = goldGrad;
    ctx.textAlign = 'center';
    ctx.fillText('THE AURA X', 640, 310);

    // Subtitle
    ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#6CE8FF';
    ctx.letterSpacing = '4px';
    ctx.fillText('BEYOND ULTIMATE • BORN TO DOMINATE', 640, 360);

    // Technical Spec Badges Row
    const specs = ['INTEL ULTRA 9 285H', 'RTX 5090 16GB', '32GB LPDDR5X', '2TB NVME GEN5', '240HZ 3.2K OLED'];
    const totalW = specs.length * 165;
    const startX = (1280 - totalW) / 2;
    specs.forEach((sp, i) => {
      const bx = startX + i * 165;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = 'rgba(108, 232, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, 420, 150, 42, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(sp, bx + 75, 446);
    });

    // Elegant Cyber Waveform visualizer at bottom
    ctx.strokeStyle = 'rgba(108, 232, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 200; x <= 1080; x += 10) {
      const y = 600 + Math.sin(x * 0.02) * 25 * Math.sin(x * 0.005);
      if (x === 200) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('LAPTOP99 FLAGSHIP SHOWROOM EDITION', 640, 720);

    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false;
    tex.anisotropy = 8;
    return tex;
  }

  // Soft Contact Shadow Texture
  function createShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const rad = ctx.createRadialGradient(256, 256, 20, 256, 256, 230);
    rad.addColorStop(0, 'rgba(4, 6, 13, 0.75)');
    rad.addColorStop(0.4, 'rgba(11, 19, 40, 0.35)');
    rad.addColorStop(0.8, 'rgba(108, 232, 255, 0.05)');
    rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 512, 512);
    return new THREE.CanvasTexture(canvas);
  }

  // Dựng mô hình 3D Laptop Titan CNC, 2 Fluid Glass Ribbons, 4 Holographic Trails & 320 Particles
  function buildAuraStudio(colorKey) {
    chassisMaterials = [];
    lightTrailMaterials = [];

    const colorHex = (COLOR_PALETTE[colorKey] || COLOR_PALETTE.titanium).hex;

    laptopGroup = new THREE.Group();

    // 1. CNC Anodized Titanium Material
    const titaniumMat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      metalness: 0.92,
      roughness: 0.17,
      clearcoat: 0.55,
      clearcoatRoughness: 0.12,
      reflectivity: 0.85,
    });
    chassisMaterials.push(titaniumMat);

    // Beveled Edge Dark Accent Material
    const darkAccentMat = new THREE.MeshStandardMaterial({
      color: 0x141820,
      metalness: 0.85,
      roughness: 0.25,
    });

    // ==========================================
    // 2. BASE ASSEMBLY (Thân máy dưới CNC)
    // ==========================================
    baseGroup = new THREE.Group();

    // Main bottom slab (2.7 x 0.08 x 1.8)
    const baseGeo = new THREE.BoxGeometry(2.7, 0.08, 1.8);
    const baseMesh = new THREE.Mesh(baseGeo, titaniumMat);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    baseGroup.add(baseMesh);

    // Diamond-cut bevel edge strip around the perimeter
    const bevelTopGeo = new THREE.BoxGeometry(2.71, 0.015, 1.81);
    const bevelTopMesh = new THREE.Mesh(bevelTopGeo, darkAccentMat);
    bevelTopMesh.position.set(0, 0.038, 0);
    baseGroup.add(bevelTopMesh);

    // Right-edge Cutouts: 2x USB-C / Thunderbolt & 1x 3.5mm Headphone Jack
    const portCutoutMat = new THREE.MeshBasicMaterial({ color: 0x05070a });

    // Thunderbolt 1 & 2
    const tbGeo = new THREE.BoxGeometry(0.02, 0.025, 0.07);
    const tb1 = new THREE.Mesh(tbGeo, portCutoutMat);
    tb1.position.set(1.351, 0.01, -0.25);
    baseGroup.add(tb1);

    const tb2 = new THREE.Mesh(tbGeo, portCutoutMat);
    tb2.position.set(1.351, 0.01, -0.4);
    baseGroup.add(tb2);

    // 3.5mm Jack Cutout
    const jackGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.02, 16);
    const jack = new THREE.Mesh(jackGeo, portCutoutMat);
    jack.rotation.z = Math.PI / 2;
    jack.position.set(1.351, 0.01, 0.25);
    baseGroup.add(jack);

    // Left-edge HDMI / MagSafe ports
    const portLeft1 = new THREE.Mesh(tbGeo, portCutoutMat);
    portLeft1.position.set(-1.351, 0.01, -0.3);
    baseGroup.add(portLeft1);

    // Recessed Keyboard Deck Well
    const kbDeckGeo = new THREE.BoxGeometry(2.28, 0.01, 0.95);
    const kbDeckMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f14,
      roughness: 0.65,
      metalness: 0.3,
    });
    const kbDeckWell = new THREE.Mesh(kbDeckGeo, kbDeckMat);
    kbDeckWell.position.set(0, 0.041, -0.22);
    baseGroup.add(kbDeckWell);

    // Keyboard Key Matrix (Laser-etched with subtle luminescence)
    keyboardDeckMesh = new THREE.Group();
    const keyRows = 5;
    const keyCols = 14;
    const keyWidth = 2.18 / keyCols;
    const keyDepth = 0.85 / keyRows;
    const keyGeo = new THREE.BoxGeometry(keyWidth * 0.84, 0.022, keyDepth * 0.8);
    const keyMat = new THREE.MeshStandardMaterial({
      color: 0x161a22,
      emissive: 0x6ce8ff,
      emissiveIntensity: 0.18,
      roughness: 0.4,
      metalness: 0.4,
    });

    for (let r = 0; r < keyRows; r++) {
      for (let c = 0; c < keyCols; c++) {
        // Spacebar on bottom row
        if (r === keyRows - 1 && c >= 4 && c <= 9) {
          if (c === 4) {
            const spaceGeo = new THREE.BoxGeometry(keyWidth * 5.2, 0.022, keyDepth * 0.8);
            const spaceMesh = new THREE.Mesh(spaceGeo, keyMat);
            spaceMesh.position.set(0, 0.052, -0.22 + (r - 2) * keyDepth);
            keyboardDeckMesh.add(spaceMesh);
          }
          continue;
        }
        const kMesh = new THREE.Mesh(keyGeo, keyMat);
        const posX = (c - (keyCols - 1) / 2) * keyWidth;
        const posZ = -0.22 + (r - 2) * keyDepth;
        kMesh.position.set(posX, 0.052, posZ);
        keyboardDeckMesh.add(kMesh);
      }
    }
    baseGroup.add(keyboardDeckMesh);

    // OLED Screen Violet/Cyan Reflection Plane on Keyboard Deck
    const reflectGeo = new THREE.PlaneGeometry(2.2, 0.9);
    const reflectMat = new THREE.MeshBasicMaterial({
      color: 0x6ce8ff,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
    });
    const reflectMesh = new THREE.Mesh(reflectGeo, reflectMat);
    reflectMesh.rotation.x = -Math.PI / 2;
    reflectMesh.position.set(0, 0.065, -0.22);
    baseGroup.add(reflectMesh);

    // Large VisionOS Optical Glass Trackpad
    const trackpadGeo = new THREE.BoxGeometry(0.92, 0.006, 0.56);
    const trackpadMat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      metalness: 0.7,
      roughness: 0.12,
      clearcoat: 0.8,
    });
    chassisMaterials.push(trackpadMat);
    const trackpadMesh = new THREE.Mesh(trackpadGeo, trackpadMat);
    trackpadMesh.position.set(0, 0.044, 0.52);
    baseGroup.add(trackpadMesh);

    // Thin Cylindrical Titanium Hinge
    const hingeGeo = new THREE.CylinderGeometry(0.032, 0.032, 2.4, 24);
    const hingeMat = new THREE.MeshStandardMaterial({
      color: 0x1f242d,
      metalness: 0.95,
      roughness: 0.2,
    });
    const hingeMesh = new THREE.Mesh(hingeGeo, hingeMat);
    hingeMesh.rotation.z = Math.PI / 2;
    hingeMesh.position.set(0, 0.04, -0.9);
    baseGroup.add(hingeMesh);

    laptopGroup.add(baseGroup);

    // ==========================================
    // 3. LID & OLED DISPLAY ASSEMBLY
    // ==========================================
    lidGroup = new THREE.Group();
    // Pivot lid at hinge point
    lidGroup.position.set(0, 0.04, -0.9);

    // Outer Titanium Lid Shell
    const lidGeo = new THREE.BoxGeometry(2.7, 0.045, 1.8);
    const lidMesh = new THREE.Mesh(lidGeo, titaniumMat);
    lidMesh.position.set(0, 0, 0.9);
    lidMesh.castShadow = true;
    lidGroup.add(lidMesh);

    // Center Recessed Circular Glossy Black Emblem on Outer Lid
    const emblemGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.005, 32);
    const emblemMat = new THREE.MeshStandardMaterial({
      color: 0x05070a,
      metalness: 0.98,
      roughness: 0.05,
    });
    const emblemMesh = new THREE.Mesh(emblemGeo, emblemMat);
    emblemMesh.position.set(0, -0.024, 0.9);
    lidGroup.add(emblemMesh);

    // Front Bezel Frame (Ultra-thin 4-sided borders)
    const bezelGeo = new THREE.PlaneGeometry(2.64, 1.74);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x07080a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    bezelMesh.position.set(0, 0.024, 0.9);
    bezelMesh.rotation.x = -Math.PI / 2;
    lidGroup.add(bezelMesh);

    // Active Display Screen with Procedural Canvas Wallpaper
    const screenGeo = new THREE.PlaneGeometry(2.54, 1.64);
    const screenMat = new THREE.MeshBasicMaterial({
      map: createScreenTexture(),
    });
    screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 0.026, 0.9);
    screenMesh.rotation.x = -Math.PI / 2;
    lidGroup.add(screenMesh);

    // Webcam Indicator Dot (Subtle Green LED)
    const camGeo = new THREE.CircleGeometry(0.01, 16);
    const camMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const camMesh = new THREE.Mesh(camGeo, camMat);
    camMesh.position.set(0, 0.025, 1.76);
    camMesh.rotation.x = -Math.PI / 2;
    lidGroup.add(camMesh);

    // Rotate lid open to realistic viewing angle (~112° / 1.95 rad)
    lidGroup.rotation.x = Math.PI * 0.62;

    laptopGroup.add(lidGroup);

    // ==========================================
    // 4. CONTACT SHADOW
    // ==========================================
    const shadowGeo = new THREE.PlaneGeometry(4.2, 3.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: createShadowTexture(),
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -0.25, 0.1);
    laptopGroup.add(shadowMesh);

    // Dynamic initial tilt: -24° dynamic presentation
    laptopGroup.rotation.set(0.18, -0.38, -0.06);

    // ==========================================
    // 5. 2 FLUID 3D GLASS RIBBON LOOPS
    // ==========================================
    glassRibbonGroup = new THREE.Group();

    const glassRibbonMat = new THREE.MeshPhysicalMaterial({
      color: 0xeef8ff,
      transmission: 0.94,
      ior: 1.52,
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: 0.88,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9,
    });

    // Ribbon Loop 1: Orbiting around laptop from rear to front-right
    const curve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.4, -0.4, 1.4),
      new THREE.Vector3(-1.2, 1.4, 0.8),
      new THREE.Vector3(1.5, 1.0, -1.0),
      new THREE.Vector3(2.4, -0.6, -0.3),
      new THREE.Vector3(0.6, -1.3, 1.5),
    ], true);
    const ribbonGeo1 = new THREE.TubeGeometry(curve1, 100, 0.045, 16, true);
    const ribbonMesh1 = new THREE.Mesh(ribbonGeo1, glassRibbonMat);
    glassRibbonGroup.add(ribbonMesh1);

    // Ribbon Loop 2: Opposing dynamic spiral loop
    const curve2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.2, 0.9, 1.2),
      new THREE.Vector3(0.8, -1.1, -1.3),
      new THREE.Vector3(-2.0, -0.5, -0.7),
      new THREE.Vector3(-1.4, 1.5, 1.0),
      new THREE.Vector3(1.4, 0.3, 1.6),
    ], true);
    const ribbonGeo2 = new THREE.TubeGeometry(curve2, 100, 0.038, 16, true);
    const ribbonMesh2 = new THREE.Mesh(ribbonGeo2, glassRibbonMat);
    glassRibbonGroup.add(ribbonMesh2);

    // ==========================================
    // 6. 4 HOLOGRAPHIC LIGHT TRAILS
    // ==========================================
    lightTrailGroup = new THREE.Group();

    const trailColors = [0x6ce8ff, 0xffcf78, 0xa37cff, 0xffffff];
    const trailCurves = [
      // Trail 1: Optical Cyan (#6CE8FF)
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.6, 0.2, 1.6),
        new THREE.Vector3(-0.8, 1.6, 0.4),
        new THREE.Vector3(1.8, 0.8, -1.2),
        new THREE.Vector3(2.6, -0.8, 0.2),
        new THREE.Vector3(0.2, -1.4, 1.8),
      ], true),
      // Trail 2: Warm Gold (#FFCF78)
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(2.4, 0.6, 1.4),
        new THREE.Vector3(0.5, -1.3, -1.1),
        new THREE.Vector3(-1.9, -0.7, -0.8),
        new THREE.Vector3(-1.5, 1.3, 1.2),
        new THREE.Vector3(1.2, 0.5, 1.7),
      ], true),
      // Trail 3: Violet / Plasma (#A37CFF)
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.8, -1.2, 1.0),
        new THREE.Vector3(-2.2, 1.1, -0.6),
        new THREE.Vector3(0.4, 1.7, -1.4),
        new THREE.Vector3(2.2, -0.3, 1.2),
        new THREE.Vector3(0.8, -1.5, 0.5),
      ], true),
      // Trail 4: Holographic White / Specular Spark
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(1.9, 1.4, -0.5),
        new THREE.Vector3(2.5, -0.4, 0.9),
        new THREE.Vector3(-0.4, -1.5, 1.6),
        new THREE.Vector3(-2.4, 0.6, 0.8),
        new THREE.Vector3(-0.5, 1.5, -1.1),
      ], true),
    ];

    trailCurves.forEach((crv, idx) => {
      const trailMat = new THREE.MeshBasicMaterial({
        color: trailColors[idx],
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
      });
      lightTrailMaterials.push(trailMat);
      const trailGeo = new THREE.TubeGeometry(crv, 80, 0.016, 8, true);
      const trailMesh = new THREE.Mesh(trailGeo, trailMat);
      lightTrailGroup.add(trailMesh);
    });

    // ==========================================
    // 7. 320 BOKEH STARDUST PARTICLES
    // ==========================================
    const particleCount = 320;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 7.5;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 5.5;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 5.5;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.07,
      map: createParticleTexture(),
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    stardustPoints = new THREE.Points(particleGeo, particleMat);

    const auraStage = new THREE.Group();
    auraStage.add(laptopGroup);
    auraStage.add(glassRibbonGroup);
    auraStage.add(lightTrailGroup);
    auraStage.add(stardustPoints);

    return auraStage;
  }

  function init(containerId, options = {}) {
    containerEl = document.getElementById(containerId);
    if (!containerEl) return false;

    if (!isWebGLAvailable()) {
      showFallback(containerEl);
      return false;
    }

    destroy();

    const width = containerEl.clientWidth || 640;
    const height = containerEl.clientHeight || 520;

    // 1. Scene
    scene = new THREE.Scene();

    // 2. Camera
    camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.85, 4.3);
    camera.lookAt(0, 0.1, 0);

    // 3. Renderer with ACES Filmic Tone Mapping & High Performance
    const isDirectCanvas = containerEl.tagName && containerEl.tagName.toLowerCase() === 'canvas';
    if (isDirectCanvas) {
      renderer = new THREE.WebGLRenderer({
        canvas: containerEl,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } else {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      containerEl.innerHTML = '';
      containerEl.appendChild(renderer.domElement);
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Procedural Studio HDRI Lighting
    // Ambient Deep Obsidian Space Tint
    const ambientLight = new THREE.AmbientLight(0x0b1328, 1.2);
    scene.add(ambientLight);

    // Key Light (Pure White Specular from top-right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(3.5, 4.5, 3.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    // Optical Cyan Rim Light (#6CE8FF) from rear-left
    const cyanRim = new THREE.DirectionalLight(0x6ce8ff, 1.5);
    cyanRim.position.set(-3.5, 2.5, -2.8);
    scene.add(cyanRim);

    // Champagne Fill Light (#FFCF78) from front-left
    const champFill = new THREE.DirectionalLight(0xffcf78, 0.95);
    champFill.position.set(-3.0, 3.0, 2.8);
    scene.add(champFill);

    // Violet Accent Light (#A37CFF) from bottom-back
    const violetAccent = new THREE.DirectionalLight(0xa37cff, 0.85);
    violetAccent.position.set(0.5, -2.5, -3.5);
    scene.add(violetAccent);

    // 5. Build AURA Studio
    activeColor = options.defaultColor || 'titanium';
    const studio = buildAuraStudio(activeColor);
    scene.add(studio);

    if (options && options.screenImageUrl) {
      setScreenImage(options.screenImageUrl);
    }

    // Default Cinematic Angle (-24° tilt)
    currentRotationY = -0.38;
    currentRotationX = 0.18;
    targetRotationY = -0.38;
    targetRotationX = 0.18;

    // 6. Interaction Listeners
    setupInteractions(containerEl);

    // 7. Intersection Observer for battery/performance
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          isPaused = !e.isIntersecting;
        });
      }, { threshold: 0.1 });
      observer.observe(containerEl);
    }

    window.addEventListener('resize', onResize);

    // 8. Render Loop
    animate(0);

    return true;
  }

  function setupInteractions(el) {
    window.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseDrag);

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
  }

  function onMouseMove(e) {
    if (!containerEl || isPaused) return;
    const rect = containerEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const normX = (e.clientX - centerX) / (window.innerWidth / 2);
    const normY = (e.clientY - centerY) / (window.innerHeight / 2);

    targetTiltY = normX * 0.22;
    targetTiltX = normY * 0.14;
  }

  function onMouseDown(e) {
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  }

  function onMouseUp() {
    isDragging = false;
  }

  function onMouseDrag(e) {
    if (!isDragging || !laptopGroup) return;
    const deltaX = e.clientX - prevMouseX;
    const deltaY = e.clientY - prevMouseY;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;

    targetRotationY += deltaX * 0.008;
    targetRotationX += deltaY * 0.006;
    targetRotationX = Math.max(-0.35, Math.min(0.65, targetRotationX));
  }

  let touchStartX = 0;
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
    }
  }

  function onTouchEnd() {}

  function onTouchMove(e) {
    if (e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - touchStartX;
      touchStartX = e.touches[0].clientX;
      targetRotationY += deltaX * 0.006;
    }
  }

  function onResize() {
    if (!containerEl || !renderer || !camera) return;
    const width = containerEl.clientWidth;
    const height = containerEl.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function animate(timestamp) {
    animFrameId = requestAnimationFrame(animate);
    if (isPaused || !laptopGroup || !renderer || !scene || !camera) return;

    const time = timestamp * 0.001;

    // Smooth lerp for orbit rotations
    currentRotationY += (targetRotationY - currentRotationY) * 0.07;
    currentRotationX += (targetRotationX - currentRotationX) * 0.07;
    mouseTiltX += (targetTiltX - mouseTiltX) * 0.05;
    mouseTiltY += (targetTiltY - mouseTiltY) * 0.05;

    // Subtle gentle floating oscillation
    const floatOffset = prefersReducedMotion() ? 0 : Math.sin(time * 1.6) * 0.038;

    laptopGroup.position.y = 0.05 + floatOffset;
    laptopGroup.rotation.y = currentRotationY + mouseTiltY;
    laptopGroup.rotation.x = currentRotationX + mouseTiltX;
    laptopGroup.rotation.z = prefersReducedMotion() ? 0 : Math.sin(time * 0.9) * 0.015;

    // Fluid Glass Ribbons gentle orbital drift
    if (glassRibbonGroup && !prefersReducedMotion()) {
      glassRibbonGroup.rotation.y = time * 0.08;
      glassRibbonGroup.rotation.x = Math.sin(time * 0.5) * 0.05;
    }

    // Holographic Light Trails rotation & pulse
    if (lightTrailGroup && !prefersReducedMotion()) {
      lightTrailGroup.rotation.y = -time * 0.12;
      lightTrailGroup.rotation.z = Math.cos(time * 0.6) * 0.06;
    }

    // 320 Stardust Particles Slow Drift
    if (stardustPoints && !prefersReducedMotion()) {
      stardustPoints.rotation.y = time * 0.03;
      stardustPoints.rotation.x = Math.sin(time * 0.02) * 0.04;
    }

    // Exploded View Smooth Interpolation
    currentExplodedFactor += (targetExplodedFactor - currentExplodedFactor) * 0.08;
    if (baseGroup && lidGroup) {
      baseGroup.position.y = -currentExplodedFactor * 0.38;
      lidGroup.position.y = 0.04 + currentExplodedFactor * 0.72;
      lidGroup.position.z = -0.9 - currentExplodedFactor * 0.22;
      if (keyboardDeckMesh) {
        keyboardDeckMesh.position.y = currentExplodedFactor * 0.28;
      }
    }

    // RGB Mode Dynamic Hue Wave
    if (currentViewMode === 'rgb' && lightTrailMaterials.length) {
      const baseHue = (time * 0.18) % 1;
      lightTrailMaterials.forEach((mat, i) => {
        mat.color.setHSL((baseHue + i * 0.25) % 1, 0.95, 0.65);
      });
      if (keyboardDeckMesh && keyboardDeckMesh.children[0]) {
        keyboardDeckMesh.children[0].material.emissive.setHSL(baseHue, 0.85, 0.3);
      }
    }

    renderer.render(scene, camera);
  }

  function setScreenImage(imageUrlOrData) {
    if (!screenMesh || !imageUrlOrData) return;
    const resolvedUrl = typeof resolveAssetUrl === 'function' ? resolveAssetUrl(imageUrlOrData) : imageUrlOrData;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      resolvedUrl,
      (texture) => {
        texture.flipY = false;
        texture.anisotropy = 8;
        texture.generateMipmaps = true;
        screenMesh.material.map = texture;
        screenMesh.material.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.warn('Could not load custom screen texture, keeping AURA wallpaper:', err);
      }
    );
  }

  // Real-time Material Color Switcher
  function setColor(colorKey) {
    activeColor = colorKey;
    const colorHex = (COLOR_PALETTE[colorKey] || COLOR_PALETTE.titanium).hex;
    chassisMaterials.forEach((mat) => {
      mat.color.setHex(colorHex);
    });

    document.querySelectorAll('.aura-color-btn, .sh-color-btn').forEach((btn) => {
      if (btn.dataset.color === colorKey) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  // Switch View Mode: 'hero' | 'exploded' | 'rgb'
  function setView(viewMode) {
    currentViewMode = viewMode;

    if (viewMode === 'exploded') {
      targetExplodedFactor = 1.0;
      targetRotationX = 0.28;
      targetRotationY = -0.42;
    } else if (viewMode === 'rgb') {
      targetExplodedFactor = 0.0;
      targetRotationX = 0.18;
      targetRotationY = -0.38;
    } else {
      // Default Hero Angle
      targetExplodedFactor = 0.0;
      targetRotationX = 0.18;
      targetRotationY = -0.38;
      // Reset trail signature colors
      const signatureColors = [0x6ce8ff, 0xffcf78, 0xa37cff, 0xffffff];
      lightTrailMaterials.forEach((m, idx) => {
        m.color.setHex(signatureColors[idx] || 0x6ce8ff);
      });
      if (keyboardDeckMesh && keyboardDeckMesh.children[0]) {
        keyboardDeckMesh.children[0].material.emissive.setHex(0x6ce8ff);
      }
    }

    document.querySelectorAll('.aura-3d-view-btn, .hero-3d-view-btn').forEach((btn) => {
      if (btn.dataset.view === viewMode) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  function showFallback(container) {
    container.innerHTML = `
      <div class="hero-3d-fallback-wrap">
        <img src="uploads/msi_raider_laptop_seamless.png" alt="AURA X 3D Flagship" class="hero-3d-fallback-img">
        <p class="hero-3d-fallback-note">Trải nghiệm không gian 3D tối ưu trên trình duyệt hỗ trợ WebGL</p>
      </div>
    `;
  }

  function destroy() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('mousemove', onMouseDrag);

    if (renderer && renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer = null;
    scene = null;
    camera = null;
    laptopGroup = null;
    glassRibbonGroup = null;
    lightTrailGroup = null;
    stardustPoints = null;
  }

  return {
    init,
    setColor,
    setScreenImage,
    setView,
    destroy,
    COLOR_PALETTE,
    isWebGLAvailable,
  };
})();

// Attach to window for global access
window.Hero3DService = Hero3DService;
