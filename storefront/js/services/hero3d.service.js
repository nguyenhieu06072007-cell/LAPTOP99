/* ==========================================================================
   HERO 3D SHOWROOM SERVICE (Three.js WebGL Interactive Studio)
   - Procedural photorealistic 3D Laptop with metallic chassis, keyboard, screen
   - Mouse tracking tilt & subtle floating animation
   - 360-degree orbit / drag rotation
   - Real-time color switcher (Space Gray, Silver, Midnight, Rose Gold)
   - View angle presets (Perspective, Front, Top)
   - Graceful fallback for non-WebGL / prefers-reduced-motion
   - Performance: IntersectionObserver pauses rendering when off-screen
   ========================================================================== */

const Hero3DService = (function () {
  let scene, camera, renderer, animFrameId;
  let laptopGroup, baseGroup, lidGroup, screenMesh, shadowMesh;
  let chassisMaterials = [];
  let isDragging = false;
  let prevMouseX = 0, prevMouseY = 0;
  let targetRotationY = 0.35, targetRotationX = 0.15;
  let currentRotationY = 0.35, currentRotationX = 0.15;
  let mouseTiltX = 0, mouseTiltY = 0;
  let targetTiltX = 0, targetTiltY = 0;
  let isPaused = false;
  let observer = null;
  let containerEl = null;

  const COLOR_PALETTE = {
    space_gray: { name: 'Space Gray', hex: 0x3a3d42, rgb: '#3A3D42' },
    silver: { name: 'Silver Metallic', hex: 0xd6d8dc, rgb: '#D6D8DC' },
    midnight: { name: 'Midnight Pine', hex: 0x152f38, rgb: '#152F38' },
    rose_gold: { name: 'Rose Gold', hex: 0xd4b5a2, rgb: '#D4B5A2' },
  };

  let activeColor = 'space_gray';

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

  // Create high-res dynamic screen canvas wallpaper
  function createScreenTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');

    // Deep studio gradient background
    const grad = ctx.createLinearGradient(0, 0, 1024, 640);
    grad.addColorStop(0, '#0d1d23');
    grad.addColorStop(0.5, '#152F38');
    grad.addColorStop(1, '#091317');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 640);

    // Subtle aurora glow waves
    const glowGrad = ctx.createRadialGradient(512, 320, 40, 512, 320, 450);
    glowGrad.addColorStop(0, 'rgba(104, 131, 118, 0.45)');
    glowGrad.addColorStop(0.5, 'rgba(219, 86, 61, 0.25)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, 1024, 640);

    // Grid lines for high-tech aesthetic
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 40; x < 1024; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 640);
      ctx.stroke();
    }
    for (let y = 40; y < 640; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Top status bar (macOS / Showroom UI style)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, 0, 1024, 38);

    // Window control dots
    ctx.fillStyle = '#DB563D';
    ctx.beginPath();
    ctx.arc(28, 19, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#EAB308';
    ctx.beginPath();
    ctx.arc(48, 19, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.arc(68, 19, 6, 0, Math.PI * 2);
    ctx.fill();

    // Center screen brand badge
    ctx.font = '800 28px "Manrope", sans-serif';
    ctx.fillStyle = '#F5F5F0';
    ctx.textAlign = 'center';
    ctx.fillText('LAPTOP99 3D SHOWROOM', 512, 260);

    // Subtitle & Specs
    ctx.font = '500 16px "Manrope", sans-serif';
    ctx.fillStyle = '#DCE3D9';
    ctx.fillText('Liquid Retina XDR • ProMotion 120Hz • M3 Max / Intel Ultra', 512, 298);

    // Visual studio waveform or badge
    ctx.fillStyle = 'rgba(219, 86, 61, 0.85)';
    ctx.beginPath();
    ctx.roundRect(432, 330, 160, 36, 18);
    ctx.fill();

    ctx.font = '700 13px "Manrope", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('PREMIUM STUDIO', 512, 353);

    // Bottom dock placeholder
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.roundRect(280, 580, 464, 48, 16);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false;
    tex.anisotropy = 4;
    return tex;
  }

  // Soft contact shadow texture
  function createShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const rad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    rad.addColorStop(0, 'rgba(21, 47, 56, 0.35)');
    rad.addColorStop(0.5, 'rgba(21, 47, 56, 0.15)');
    rad.addColorStop(1, 'rgba(21, 47, 56, 0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  }

  function buildLaptopModel(colorKey) {
    chassisMaterials = [];
    const colorHex = (COLOR_PALETTE[colorKey] || COLOR_PALETTE.space_gray).hex;

    // Metallic material for laptop body
    const metalMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.82,
      roughness: 0.28,
    });
    chassisMaterials.push(metalMat);

    // Darker metal for hinge & ports
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x22262a,
      metalness: 0.9,
      roughness: 0.3,
    });

    laptopGroup = new THREE.Group();

    // ==========================================
    // 1. BASE ASSEMBLY (Thân máy dưới)
    // ==========================================
    baseGroup = new THREE.Group();

    // Bottom chassis slab: Width=2.6, Height=0.07, Depth=1.75
    const baseGeo = new THREE.BoxGeometry(2.6, 0.07, 1.75);
    const baseMesh = new THREE.Mesh(baseGeo, metalMat);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    baseGroup.add(baseMesh);

    // Keyboard well cutout (recessed dark surface)
    const kbWellGeo = new THREE.PlaneGeometry(2.2, 0.9);
    const kbWellMat = new THREE.MeshStandardMaterial({
      color: 0x14171a,
      roughness: 0.6,
      metalness: 0.4,
    });
    const kbWellMesh = new THREE.Mesh(kbWellGeo, kbWellMat);
    kbWellMesh.rotation.x = -Math.PI / 2;
    kbWellMesh.position.set(0, 0.036, -0.22);
    baseGroup.add(kbWellMesh);

    // Individual Chiclet Keys Matrix (Rows of keys)
    const keyRows = 5;
    const keyCols = 14;
    const keyWidth = 2.1 / keyCols;
    const keyDepth = 0.8 / keyRows;
    const keyGeo = new THREE.BoxGeometry(keyWidth * 0.82, 0.02, keyDepth * 0.78);
    const keyMat = new THREE.MeshStandardMaterial({
      color: 0x181a1d,
      roughness: 0.45,
      metalness: 0.2,
    });

    for (let r = 0; r < keyRows; r++) {
      for (let c = 0; c < keyCols; c++) {
        // Spacebar on bottom row
        if (r === keyRows - 1 && c >= 4 && c <= 9) {
          if (c === 4) {
            const spaceGeo = new THREE.BoxGeometry(keyWidth * 5.2, 0.02, keyDepth * 0.78);
            const spaceMesh = new THREE.Mesh(spaceGeo, keyMat);
            spaceMesh.position.set(0, 0.046, -0.22 + (r - 2) * keyDepth);
            baseGroup.add(spaceMesh);
          }
          continue;
        }
        const kMesh = new THREE.Mesh(keyGeo, keyMat);
        const posX = (c - (keyCols - 1) / 2) * keyWidth;
        const posZ = -0.22 + (r - 2) * keyDepth;
        kMesh.position.set(posX, 0.046, posZ);
        baseGroup.add(kMesh);
      }
    }

    // Glass Trackpad
    const trackpadGeo = new THREE.BoxGeometry(0.85, 0.005, 0.52);
    const trackpadMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.5,
      roughness: 0.18,
    });
    chassisMaterials.push(trackpadMat);
    const trackpadMesh = new THREE.Mesh(trackpadGeo, trackpadMat);
    trackpadMesh.position.set(0, 0.036, 0.5);
    baseGroup.add(trackpadMesh);

    // Front edge notch / thumb scoop
    const notchGeo = new THREE.BoxGeometry(0.35, 0.03, 0.03);
    const notchMat = new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.5 });
    const notchMesh = new THREE.Mesh(notchGeo, notchMat);
    notchMesh.position.set(0, 0.025, 0.875);
    baseGroup.add(notchMesh);

    // Cylindrical Hinge
    const hingeGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.3, 16);
    const hingeMesh = new THREE.Mesh(hingeGeo, darkMetalMat);
    hingeMesh.rotation.z = Math.PI / 2;
    hingeMesh.position.set(0, 0.035, -0.875);
    baseGroup.add(hingeMesh);

    laptopGroup.add(baseGroup);

    // ==========================================
    // 2. DISPLAY / LID ASSEMBLY (Màn hình mở góc 112°)
    // ==========================================
    lidGroup = new THREE.Group();
    // Pivot lid at hinge point
    lidGroup.position.set(0, 0.035, -0.875);

    // Lid Back Aluminum Cover
    const lidGeo = new THREE.BoxGeometry(2.6, 0.045, 1.75);
    const lidMesh = new THREE.Mesh(lidGeo, metalMat);
    lidMesh.position.set(0, 0, 0.875);
    lidMesh.castShadow = true;
    lidGroup.add(lidMesh);

    // Apple / LAPTOP99 Logo on back of lid
    const logoGeo = new THREE.CircleGeometry(0.09, 32);
    const logoMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.95,
      roughness: 0.1,
    });
    const logoMesh = new THREE.Mesh(logoGeo, logoMat);
    logoMesh.position.set(0, -0.024, 0.875);
    logoMesh.rotation.x = Math.PI / 2;
    lidGroup.add(logoMesh);

    // Screen Bezel (Front frame)
    const bezelGeo = new THREE.PlaneGeometry(2.52, 1.68);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x07080a,
      roughness: 0.8,
      metalness: 0.1,
    });
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    bezelMesh.position.set(0, 0.024, 0.875);
    bezelMesh.rotation.x = -Math.PI / 2;
    lidGroup.add(bezelMesh);

    // Active Display Screen with Canvas Wallpaper
    const screenGeo = new THREE.PlaneGeometry(2.42, 1.54);
    const screenMat = new THREE.MeshBasicMaterial({
      map: createScreenTexture(),
    });
    screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 0.026, 0.875);
    screenMesh.rotation.x = -Math.PI / 2;
    lidGroup.add(screenMesh);

    // Webcam Indicator Dot
    const camGeo = new THREE.CircleGeometry(0.012, 16);
    const camMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const camMesh = new THREE.Mesh(camGeo, camMat);
    camMesh.position.set(0, 0.025, 1.71);
    camMesh.rotation.x = -Math.PI / 2;
    lidGroup.add(camMesh);

    // Rotate lid open to ~112 degrees (realistic viewing angle)
    lidGroup.rotation.x = Math.PI * 0.62;

    laptopGroup.add(lidGroup);

    // ==========================================
    // 3. CONTACT SHADOW PLANE
    // ==========================================
    const shadowGeo = new THREE.PlaneGeometry(3.6, 2.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: createShadowTexture(),
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -0.22, 0.1);
    laptopGroup.add(shadowMesh);

    return laptopGroup;
  }

  function init(containerId, options = {}) {
    containerEl = document.getElementById(containerId);
    if (!containerEl) return false;

    // Check WebGL availability
    if (!isWebGLAvailable()) {
      showFallback(containerEl);
      return false;
    }

    destroy(); // clean previous instance if any

    const width = containerEl.clientWidth || 640;
    const height = containerEl.clientHeight || 480;

    // 1. Scene
    scene = new THREE.Scene();

    // 2. Camera
    camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.9, 4.2);
    camera.lookAt(0, 0.1, 0);

    // 3. Renderer with antialiasing & tone mapping
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
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // Main key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(3, 4, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    // Sage tinted fill light
    const fillLight = new THREE.DirectionalLight(0xedf0e9, 0.9);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    // Rim highlight from back
    const rimLight = new THREE.DirectionalLight(0x688376, 0.7);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    // 5. Build 3D Model
    activeColor = options.defaultColor || 'space_gray';
    const model = buildLaptopModel(activeColor);
    scene.add(model);

    // Apply custom screen image if provided
    if (options && options.screenImageUrl) {
      setScreenImage(options.screenImageUrl);
    }

    // Initial position & rotation
    laptopGroup.position.set(0, 0.05, 0);
    currentRotationY = 0.38;
    currentRotationX = 0.18;
    targetRotationY = 0.38;
    targetRotationX = 0.18;
    laptopGroup.rotation.y = currentRotationY;
    laptopGroup.rotation.x = currentRotationX;

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

    // 8. Resize Listener
    window.addEventListener('resize', onResize);

    // 9. Start Render Loop
    animate(0);

    return true;
  }

  function setupInteractions(el) {
    // Mouse Move Tilt Tracking
    window.addEventListener('mousemove', onMouseMove);

    // Click & Drag 360 Rotation
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseDrag);

    // Touch events with passive scrolling preservation
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

    targetTiltY = normX * 0.18;
    targetTiltX = normY * 0.12;
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
    targetRotationX = Math.max(-0.25, Math.min(0.55, targetRotationX));
  }

  let touchStartX = 0, touchStartY = 0;
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
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

    // Smooth lerp for rotations
    currentRotationY += (targetRotationY - currentRotationY) * 0.07;
    currentRotationX += (targetRotationX - currentRotationX) * 0.07;
    mouseTiltX += (targetTiltX - mouseTiltX) * 0.05;
    mouseTiltY += (targetTiltY - mouseTiltY) * 0.05;

    // Subtle floating animation (disabled if user prefers reduced motion)
    const floatOffset = prefersReducedMotion() ? 0 : Math.sin(time * 1.6) * 0.035;

    laptopGroup.position.y = 0.05 + floatOffset;
    laptopGroup.rotation.y = currentRotationY + mouseTiltY;
    laptopGroup.rotation.x = currentRotationX + mouseTiltX;
    laptopGroup.rotation.z = prefersReducedMotion() ? 0 : Math.sin(time * 0.9) * 0.012;

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
        texture.anisotropy = 4;
        texture.generateMipmaps = true;
        screenMesh.material.map = texture;
        screenMesh.material.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.warn('Could not load screen texture, keeping default wallpaper:', err);
      }
    );
  }

  // Switch Laptop Color Material in Real-time
  function setColor(colorKey) {
    activeColor = colorKey;
    const colorHex = (COLOR_PALETTE[colorKey] || COLOR_PALETTE.space_gray).hex;
    chassisMaterials.forEach((mat) => {
      mat.color.setHex(colorHex);
    });

    // Update active state on DOM buttons
    document.querySelectorAll('.hero-3d-color-pill').forEach((btn) => {
      if (btn.dataset.color === colorKey) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  // Switch View Angle Preset
  function setView(viewMode) {
    if (!camera) return;
    if (viewMode === 'front') {
      targetRotationX = 0.05;
      targetRotationY = 0;
    } else if (viewMode === 'top') {
      targetRotationX = 0.6;
      targetRotationY = 0;
    } else {
      // Perspective default 3D
      targetRotationX = 0.18;
      targetRotationY = 0.38;
    }

    document.querySelectorAll('.hero-3d-view-btn').forEach((btn) => {
      if (btn.dataset.view === viewMode) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  function showFallback(container) {
    container.innerHTML = `
      <div class="hero-3d-fallback-wrap">
        <img src="uploads/msi_raider_laptop_seamless.png" alt="Showroom Laptop" class="hero-3d-fallback-img">
        <p class="hero-3d-fallback-note">Trải nghiệm tương tác 3D tối ưu trên trình duyệt hỗ trợ WebGL</p>
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

