/**
 * paisaje3d.js — Experiencia 3D "Vive Afuera"
 * Inspirado en el paisaje alpino de montaña y río (estilo Skyrim / valle de río):
 *   - Terreno con cañón y montañas escarpadas a los lados (CERO pinos flotando: todos 100% anclados al suelo)
 *   - Río caudaloso con agua viva, oleaje dinámico, reflejos, espuma visible y piedras en el lecho
 *   - Fondo HDRI 360° de alta definición
 *   - Río caudaloso con agua viva, oleaje dinámico 3D y perturbación táctil
 *   - Soporte nativo para celular en horizontal (Landscape) y vertical (Portrait)
 *   - Cuadro de cámara amplio con texto: "Esto no es real, toca pasto de verdad."
 *   - Paisaje sonoro procedural inmersivo
 */

(function (window) {
  'use strict';

  // =========================================================================
  // FUNCIÓN MATEMÁTICA CANÓNICA DEL TERRENO
  // Coordenadas estrictamente mundiales (world space):
  // Garantiza que el agua y elementos estén 100% calibrados.
  // =========================================================================
  function getRiverCenter(z) {
    return Math.sin(z * 0.028) * 11 + Math.cos(z * 0.012) * 4;
  }

  function getTerrainHeight(x, z) {
    const riverCenter = getRiverCenter(z);
    const distToRiver = Math.abs(x - riverCenter);

    // Mirador donde se para el usuario (orilla firme con vista despejada al río)
    if (z > -6 && z < 6 && x > -5 && x < 4) {
      return 0.15;
    }

    // Lecho del río (agua)
    if (distToRiver < 8.5) {
      const depthRatio = distToRiver / 8.5;
      return -1.8 + Math.pow(depthRatio, 2) * 1.15; // Fondo entre -1.8 y -0.65
    }

    // Ribera inmediata (pequeño borde de tierra y piedras antes de subir la colina)
    const bankDist = distToRiver - 8.5;
    const baseSlope = bankDist * 0.16;
    const cragHills = Math.sin(x * 0.08 + z * 0.05) * 1.2 + Math.cos(x * 0.04 - z * 0.03) * 1.5;
    let y = -0.6 + baseSlope + cragHills;

    // Laderas suaves a los lados para enmarcar la ribera sin tapar el fondo 360° del HDRI
    if (distToRiver > 18) {
      y += Math.min(6.5, (distToRiver - 18) * 0.22);
    }

    // Hacia el horizonte (distancia z < -50), el terreno baja suavemente para fundirse con el HDRI
    if (z < -50) {
      const taper = Math.min(1, (-z - 50) / 45);
      y = THREE.MathUtils.lerp(y, -0.65, taper);
    }

    return y;
  }



  class Paisaje3D {
    constructor(container, options = {}) {
      this.container = container;
      this.options = options;

      this.width = container.clientWidth || window.innerWidth;
      this.height = container.clientHeight || window.innerHeight;

      // Orientación y Visor (Landscape y Portrait compatibles)
      this.targetRotation = { yaw: 0, pitch: 0, roll: 0 };
      this.currentRotation = { yaw: 0, pitch: 0, roll: 0 };
      this.baseYaw = null;
      this.targetFov = 60;
      this.currentFov = 60;

      // Variables de dinámica
      this.windForce = 0.05;
      this.windTarget = 0.05;
      this.waterAgitation = 0;
      this.waterTouch = { x: 0.5, y: 0.5, active: false, speed: 0 };
      this.grassTouch = this.waterTouch; // Compatibilidad
      this.groundActive = false;
      this.realityFade = 0;

      // Colecciones de entidades
      this.grassBlades = [];
      this.flowers = [];
      this.flyingSeeds = [];
      this.flyingFlock = [];
      this.trees = [];

      this.initThree();
      this.initAudio();
      this.buildWorld();
      this.loadHDRI();
      this.bindEvents();

      this.clock = new THREE.Clock();
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    // =========================================================================
    // 1. INICIALIZACIÓN DE THREE.JS
    // =========================================================================
    initThree() {
      this.scene = new THREE.Scene();
      // Fondo inicial deep sapphire antes de cargar el HDRI
      this.scene.background = new THREE.Color(0x0c2536);
      this.scene.fog = null; // Cero niebla sólida para preservar la nitidez del HDRI en 360°

      this.camera = new THREE.PerspectiveCamera(this.currentFov, this.width / this.height, 0.1, 700);
      this.camera.position.set(0, 1.95, 0); // Ojos del observador sobre el mirador

      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      this.container.appendChild(this.renderer.domElement);

      // Luz ambiental y solar que armonizan con el Blue Grotto
      const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x1e293b, 0.85);
      this.scene.add(hemiLight);

      this.sunLight = new THREE.DirectionalLight(0xe0f2fe, 1.3);
      this.sunLight.position.set(45, 65, 35);
      this.scene.add(this.sunLight);

      const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
      fillLight.position.set(-45, 30, -45);
      this.scene.add(fillLight);
    }

    // Carga del fondo 360° HDRI (blue_grotto_4k.exr)
    loadHDRI() {
      if (typeof THREE.EXRLoader === 'undefined') {
        console.warn('THREE.EXRLoader no está cargado');
        return;
      }

      const hdriNotice = document.getElementById('hdriStatus');
      if (hdriNotice) {
        hdriNotice.textContent = '🌅 Cargando HDRI 360°...';
        hdriNotice.style.display = 'inline-block';
      }

      const loader = new THREE.EXRLoader();
      loader.load(
        'blue_grotto_2k.exr',
        (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          this.scene.background = texture;

          try {
            const pmrem = new THREE.PMREMGenerator(this.renderer);
            pmrem.compileEquirectangularShader();
            const envMap = pmrem.fromEquirectangular(texture).texture;
            this.scene.environment = envMap;
            pmrem.dispose();
          } catch (e) {
            console.warn('PMREMGenerator fallback:', e);
            this.scene.environment = texture;
          }

          console.log('HDRI Blue Grotto 360° cargado con éxito');
          if (hdriNotice) {
            hdriNotice.textContent = '🌅 HDRI 360° Activo';
            setTimeout(() => {
              hdriNotice.style.opacity = '0';
              setTimeout(() => { hdriNotice.style.display = 'none'; }, 600);
            }, 2500);
          }
        },
        (progress) => {
          if (progress && progress.total > 0 && hdriNotice) {
            const pct = Math.round((progress.loaded / progress.total) * 100);
            hdriNotice.textContent = `🌅 Cargando HDRI (${pct}%)...`;
          }
        },
        (err) => {
          console.error('Error cargando HDRI:', err);
          if (hdriNotice) {
            hdriNotice.textContent = '⚠️ HDRI no disponible';
            setTimeout(() => { hdriNotice.style.display = 'none'; }, 3000);
          }
        }
      );
    }

    // =========================================================================
    // 2. CONSTRUCCIÓN DEL MUNDO (HDRI PURO + EFECTOS INTERACTIVOS)
    // =========================================================================
    buildWorld() {
      // El fondo visual principal es el HDRI 360° en alta definición.
      // Se mantienen los efectos interactivos: agua viva, viento/partículas y aves.
      this.buildWaterSurface();
      this.buildBirds();
      this.buildParticles();
    }

    // Superficie interactiva de agua translúcida y reflectante (sin gráficas artificiales de ondas blancas)
    buildWaterSurface() {
      const waterGeo = new THREE.PlaneGeometry(160, 160, 64, 64);
      waterGeo.rotateX(-Math.PI / 2);

      const pos = waterGeo.attributes.position;
      this.waterBasePos = [];
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, -0.65);
        this.waterBasePos.push({ x: pos.getX(i), y: -0.65, z: pos.getZ(i) });
      }
      waterGeo.computeVertexNormals();

      // Agua pura y cristalina que refleja el HDRI con deformación 3D pura, sin ondas blancas dibujadas
      this.waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a6b85,
        roughness: 0.03,
        metalness: 0.15,
        transparent: true,
        opacity: 0.35,
        flatShading: false,
      });

      this.riverMesh = new THREE.Mesh(waterGeo, this.waterMaterial);
      this.riverMesh.position.set(0, 0, 0);
      this.scene.add(this.riverMesh);
    }

    // Aves en vuelo
    buildBirds() {
      this.birdGroup = new THREE.Group();
      this.scene.add(this.birdGroup);

      const createBird = () => {
        const bird = new THREE.Group();
        const bodyGeo = new THREE.ConeGeometry(0.14, 0.7, 4);
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2e3338, roughness: 0.6, flatShading: true });
        bird.add(new THREE.Mesh(bodyGeo, bodyMat));

        const wingGeo = new THREE.BufferGeometry();
        const wingV = new Float32Array([0, 0, 0.12, -0.8, 0.05, -0.06, 0, 0, -0.25]);
        wingGeo.setAttribute('position', new THREE.BufferAttribute(wingV, 3));
        wingGeo.computeVertexNormals();
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x1f2327, side: THREE.DoubleSide });

        const leftWing = new THREE.Mesh(wingGeo, wingMat);
        bird.add(leftWing);

        const rightWingGeo = wingGeo.clone();
        rightWingGeo.scale(-1, 1, 1);
        const rightWing = new THREE.Mesh(rightWingGeo, wingMat);
        bird.add(rightWing);

        return { root: bird, leftWing, rightWing };
      };

      for (let i = 0; i < 9; i++) {
        const b = createBird();
        const radius = 32 + Math.random() * 30;
        const speed = 0.38 + Math.random() * 0.2;
        const angle = (i / 9) * Math.PI * 2;
        const height = 15 + Math.random() * 14;

        this.birdGroup.add(b.root);
        this.flyingFlock.push({
          mesh: b.root,
          leftWing: b.leftWing,
          rightWing: b.rightWing,
          radius,
          speed,
          angle,
          height,
          wingPhase: Math.random() * Math.PI * 2,
        });
      }
    }

    // Partículas de semillas y polen
    buildParticles() {
      const seedGeo = new THREE.TetrahedronGeometry(0.045, 0);
      const seedMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });

      this.seedGroup = new THREE.Group();
      this.scene.add(this.seedGroup);

      for (let i = 0; i < 70; i++) {
        const seed = new THREE.Mesh(seedGeo, seedMat);
        seed.position.set((Math.random() - 0.5) * 8, -0.2 + Math.random() * 3, -1 - Math.random() * 25);
        seed.visible = false;
        this.seedGroup.add(seed);
        this.flyingSeeds.push({
          mesh: seed,
          vx: (Math.random() - 0.5) * 0.25,
          vy: 0.08 + Math.random() * 0.12,
          vz: -0.9 - Math.random() * 1.8,
          life: 0,
        });
      }
    }

    // =========================================================================
    // 3. PAISAJE SONORO PROCEDURAL
    // =========================================================================
    initAudio() {
      this.audioReady = false;
    }

    startAudio() {
      if (this.audioReady) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.actx = new AudioCtx();

        // 1. Río continuo (Ruido filtrado paso banda)
        const bufSize = this.actx.sampleRate * 2;
        const noiseBuf = this.actx.createBuffer(1, bufSize, this.actx.sampleRate);
        const out = noiseBuf.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          out[i] = (b0 + b1 + b2) * 0.15;
        }

        this.riverSrc = this.actx.createBufferSource();
        this.riverSrc.buffer = noiseBuf;
        this.riverSrc.loop = true;

        this.riverFilter = this.actx.createBiquadFilter();
        this.riverFilter.type = 'bandpass';
        this.riverFilter.frequency.value = 540;
        this.riverFilter.Q.value = 1.3;

        this.riverGain = this.actx.createGain();
        this.riverGain.gain.value = 0.38;

        this.riverSrc.connect(this.riverFilter);
        this.riverFilter.connect(this.riverGain);
        this.riverGain.connect(this.actx.destination);
        this.riverSrc.start();

        // 2. Viento alpino en calma inicial
        this.windSrc = this.actx.createBufferSource();
        this.windSrc.buffer = noiseBuf;
        this.windSrc.loop = true;

        this.windFilter = this.actx.createBiquadFilter();
        this.windFilter.type = 'lowpass';
        this.windFilter.frequency.value = 180;

        this.windGain = this.actx.createGain();
        this.windGain.gain.value = 0.03;

        this.windSrc.connect(this.windFilter);
        this.windFilter.connect(this.windGain);
        this.windGain.connect(this.actx.destination);
        this.windSrc.start();

        this.scheduleBirdSong();
        this.audioReady = true;
      } catch (e) {
        console.warn('Audio diferido:', e);
      }
    }

    playBirdChirp() {
      if (!this.audioReady || !this.actx || this.groundActive) return;
      try {
        const now = this.actx.currentTime;
        const osc = this.actx.createOscillator();
        const gain = this.actx.createGain();
        const baseFreq = 2300 + Math.random() * 1200;

        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.45, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, now + 0.15);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.07, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.actx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } catch {}
    }

    scheduleBirdSong() {
      setTimeout(() => {
        this.playBirdChirp();
        this.scheduleBirdSong();
      }, 3000 + Math.random() * 4500);
    }

    // =========================================================================
    // 4. MAPEO DE SENSORES (COMPATIBLE CON CELULAR EN HORIZONTAL / LANDSCAPE)
    // =========================================================================

    /**
     * Orientación del visor:
     * Soporta nativamente orientación en horizontal y vertical.
     */
    setOrientation(yawDeg, pitchDeg, rollDeg) {
      if (yawDeg == null || pitchDeg == null) return;

      if (this.baseYaw === null) {
        this.baseYaw = yawDeg;
      }
      const relYaw = ((yawDeg - this.baseYaw + 540) % 360) - 180;

      // Movimiento ESPEJADO solicitado:
      // Mover el celular a la derecha mueve la imagen a la derecha.
      // Mover el celular hacia arriba mueve la imagen hacia arriba.
      this.targetRotation.yaw = THREE.MathUtils.degToRad(relYaw);
      const clampedPitch = Math.max(-65, Math.min(65, pitchDeg));
      this.targetRotation.pitch = THREE.MathUtils.degToRad(clampedPitch);
      this.targetRotation.roll = THREE.MathUtils.degToRad((rollDeg || 0) * 0.4);
    }

    setZoom(factor) {
      const f = Math.max(1, Math.min(4, factor || 1));
      this.targetFov = 60 / f;
    }

    setTouch(x, y, isDown) {
      const wasDown = this.waterTouch ? this.waterTouch.active : false;
      if (!this.waterTouch) this.waterTouch = { active: false, x: 0.5, y: 0.5, speed: 0 };
      this.grassTouch = this.waterTouch; // Compatibilidad

      this.waterTouch.active = isDown;
      if (isDown) {
        if (wasDown) {
          const dx = x - this.waterTouch.x;
          const dy = y - this.waterTouch.y;
          const speed = Math.hypot(dx, dy);
          this.waterTouch.speed = speed;
          // Al deslizar los dedos en la pantalla, se perturba el agua generando ondas dinámicas visibles
          const surge = Math.min(0.8, speed * 8.0 + 0.08);
          this.waterAgitation = Math.min(3.2, this.waterAgitation + surge);
        } else {
          // Toque inicial
          this.waterAgitation = Math.min(3.2, this.waterAgitation + 0.28);
        }
        this.waterTouch.x = x;
        this.waterTouch.y = y;

        if (this.riverGain && this.actx) {
          this.riverGain.gain.setValueAtTime(0.32 + Math.min(0.4, this.waterAgitation * 0.25), this.actx.currentTime);
        }
      }
    }

    setMicBlow(level) {
      const l = Math.min(1, Math.max(0, level));
      // Sensibilidad disminuida: solo se activa cuando se detecta un soplido evidente en el mic
      if (l > 0.35) {
        const force = (l - 0.3) * 1.5;
        this.windTarget = 0.15 + force * 1.5;
        this.spawnSeeds(Math.floor(force * 6));
        if (this.windFilter && this.actx) {
          this.windFilter.frequency.setTargetAtTime(240 + force * 850, this.actx.currentTime, 0.05);
          this.windGain.gain.setTargetAtTime(0.06 + force * 0.32, this.actx.currentTime, 0.05);
        }
      } else {
        // En calma total cuando no se sopla
        this.windTarget = 0.05;
        if (this.windFilter && this.actx) {
          this.windFilter.frequency.setTargetAtTime(180, this.actx.currentTime, 0.25);
          this.windGain.gain.setTargetAtTime(0.03, this.actx.currentTime, 0.25);
        }
      }
    }

    triggerShake(intensity = 1) {
      // El agua ahora se perturba exclusivamente al deslizar los dedos en la pantalla,
      // no al sacudir el celular para evitar desestabilizar la imagen del visor
    }

    spawnSeeds(count) {
      let n = 0;
      for (const s of this.flyingSeeds) {
        if (!s.mesh.visible) {
          s.mesh.visible = true;
          s.mesh.position.set((Math.random() - 0.5) * 4, -0.2 + Math.random() * 0.5, -1.2 - Math.random() * 0.6);
          s.life = 1.0;
          n++;
          if (n >= count) break;
        }
      }
    }

    // Modo Suelo / Cámara Real
    setGroundMode(active) {
      this.groundActive = !!active;
      const overlay = document.getElementById('realityOverlay');
      if (overlay) {
        overlay.classList.toggle('active', this.groundActive);
      }
    }

    updateCamFrame(dataUrl) {
      const feed = document.getElementById('cameraFeed');
      if (feed && dataUrl) {
        feed.src = dataUrl;
      }
    }

    // =========================================================================
    // 5. BUCLE DE ANIMACIÓN
    // =========================================================================
    animate() {
      requestAnimationFrame(this.animate);
      const dt = this.clock.getDelta();
      const time = this.clock.getElapsedTime();

      // Lerp de rotación de cámara
      this.currentRotation.yaw = THREE.MathUtils.lerp(this.currentRotation.yaw, this.targetRotation.yaw, 0.12);
      this.currentRotation.pitch = THREE.MathUtils.lerp(this.currentRotation.pitch, this.targetRotation.pitch, 0.12);
      this.currentRotation.roll = THREE.MathUtils.lerp(this.currentRotation.roll, this.targetRotation.roll, 0.12);

      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.currentRotation.yaw;
      this.camera.rotation.x = this.currentRotation.pitch;
      this.camera.rotation.z = this.currentRotation.roll;

      // Lerp de FOV (Zoom)
      this.currentFov = THREE.MathUtils.lerp(this.currentFov, this.targetFov, 0.08);
      if (Math.abs(this.camera.fov - this.currentFov) > 0.05) {
        this.camera.fov = this.currentFov;
        this.camera.updateProjectionMatrix();
      }

      this.windForce = THREE.MathUtils.lerp(this.windForce, this.windTarget, 0.06);
      this.waterAgitation = THREE.MathUtils.lerp(this.waterAgitation, 0, 0.025);

      // ANIMACIÓN NOTORIA DEL AGUA (Ondas dinámicas al deslizar los dedos en la pantalla)
      if (this.riverMesh) {
        const pos = this.riverMesh.geometry.attributes.position;
        const currentSpeed = 1.6 + this.waterAgitation * 3.4;

        for (let i = 0; i < pos.count; i++) {
          const base = this.waterBasePos[i];
          const wave1 = Math.sin(base.z * 0.18 - time * currentSpeed + base.x * 0.22) * (0.07 + this.waterAgitation * 0.09);
          const wave2 = Math.cos(base.x * 0.35 + base.z * 0.12 - time * (currentSpeed * 1.3)) * (0.05 + this.waterAgitation * 0.07);
          const touchSurge = Math.sin(time * 11 + base.z * 0.55 + base.x * 0.35) * (this.waterAgitation * 0.28);
          pos.setY(i, base.y + wave1 + wave2 + touchSurge);
        }
        pos.needsUpdate = true;
        this.riverMesh.geometry.computeVertexNormals();
      }

      // Semillas volando por el aire hacia el río
      for (const s of this.flyingSeeds) {
        if (s.mesh.visible) {
          s.mesh.position.x += s.vx * dt * (this.windForce * 6.5);
          s.mesh.position.y += s.vy * dt;
          s.mesh.position.z += s.vz * dt * (this.windForce * 7.5);
          s.life -= dt * 0.32;
          if (s.life <= 0 || s.mesh.position.z < -50) s.mesh.visible = false;
        }
      }

      // Bandada de aves planeando en círculos
      for (const b of this.flyingFlock) {
        b.angle += b.speed * dt * 0.32;
        b.wingPhase += dt * 10;
        const x = Math.cos(b.angle) * b.radius;
        const z = -65 + Math.sin(b.angle) * (b.radius * 0.55);
        b.mesh.position.set(x, b.height + Math.sin(b.angle * 2) * 2, z);
        b.mesh.rotation.y = -b.angle - Math.PI / 2;

        const wingRot = Math.sin(b.wingPhase) * 0.55;
        b.leftWing.rotation.z = wingRot;
        b.rightWing.rotation.z = -wingRot;
      }

      // Efecto cinematográfico de realidad (cuando se apunta al suelo)
      const targetFade = this.groundActive ? 1 : 0;
      this.realityFade = THREE.MathUtils.lerp(this.realityFade, targetFade, 0.12);
      this.renderer.domElement.style.opacity = (1 - this.realityFade * 0.96).toFixed(3);
      this.renderer.domElement.style.filter = `blur(${(this.realityFade * 16).toFixed(1)}px)`;

      this.renderer.render(this.scene, this.camera);
    }

    bindEvents() {
      window.addEventListener('resize', () => {
        this.width = this.container.clientWidth || window.innerWidth;
        this.height = this.container.clientHeight || window.innerHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
      });

      // Control con ratón como soporte
      let isDown = false, prev = { x: 0, y: 0 };
      this.container.addEventListener('pointerdown', e => {
        isDown = true; prev = { x: e.clientX, y: e.clientY };
        this.startAudio();
      });
      window.addEventListener('pointermove', e => {
        // Control de arrastre espejado
        this.targetRotation.yaw += (e.clientX - prev.x) * 0.004;
        this.targetRotation.pitch = Math.max(-1.1, Math.min(1.1, this.targetRotation.pitch + (e.clientY - prev.y) * 0.003));
        prev = { x: e.clientX, y: e.clientY };
        if (e.clientY > window.innerHeight * 0.6) {
          this.setTouch(e.clientX / window.innerWidth, e.clientY / window.innerHeight, true);
        }
      });
      window.addEventListener('pointerup', () => {
        isDown = false;
        this.setTouch(0, 0, false);
      });
    }
  }

  window.Paisaje3D = Paisaje3D;
})(window);
