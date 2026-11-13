// ============================================================================
// CYCLE 12: UNIVERSE 3D ENGINE (Three.js r128 — Desktop & Mobile Touch Ready)
// Hỗ trợ:
//  - VN Backdrop Mode (cinematic orbit quanh khu vực của cảnh truyện)
//  - Galaxy Overview & Hierarchical System Zoom (Mặt Trời -> Hành tinh -> Vệ tinh)
//  - 3D-to-2D Label Projection cho hệ sao & thiên thể (bấm chuẩn trên điện thoại)
//  - Superweapon 3D VFX (Gotterfall Beam, Schwarzbruch Singularity, Chaos Cage...)
//  - Character 3D Showcase (dùng đúng màu tóc/mắt/trang phục/chủng tộc + cột 1.70m)
//  - Real-time 3D Action Arena (WASD + Virtual Joystick, Dodge, Race Passives, VFX)
// ============================================================================

import { SECTORS, SECTOR_BY_ID } from "../data/galaxy.js";
import { CHARACTERS, CHAR_BY_ID, RACE_STYLE } from "../data/characters.js";
import { FACTIONS } from "../data/lore.js";

export class UniverseEngine3D {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onSectorSelect = options.onSectorSelect || (() => {});
    this.onBodySelect = options.onBodySelect || (() => {});
    this.onCombatTick = options.onCombatTick || (() => {});
    this.onCombatEnd = options.onCombatEnd || (() => {});
    this.onProjectLabels = options.onProjectLabels || (() => {});
    this.onFloatingDamage = options.onFloatingDamage || (() => {});

    this.currentMode = "vn"; // 'vn' | 'galaxy' | 'arena' | 'inspector' | 'codex'
    this.selectedSectorId = null;
    this.selectedBodyId = null;
    this.inspectedCharId = null;
    this.vnSectorId = "sylvalon";

    this.systemBodies = [];
    this.vfxList = [];
    this.keysDown = new Set();
    this.joystickVec = { x: 0, z: 0 };
    this.cameraShake = 0;
    this.clock = 0;

    this.initThree();
    this.createStarfieldAndNebula();
    this.buildGalaxySectors();
    this.setupInteraction();

    this.switchMode("vn");
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x040714, 0.00085);

    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.4, 3200);
    this.camera.position.set(0, 220, 350);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    // Ánh sáng
    this.ambientLight = new THREE.AmbientLight(0x475569, 1.35);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.7);
    this.dirLight.position.set(140, 220, 120);
    this.scene.add(this.dirLight);

    this.rimLight = new THREE.PointLight(0x38bdf8, 1.4, 600);
    this.rimLight.position.set(-100, 60, -100);
    this.scene.add(this.rimLight);

    // Groups
    this.galaxyGroup = new THREE.Group();
    this.systemGroup = new THREE.Group();
    this.vfxGroup = new THREE.Group();
    this.inspectorGroup = new THREE.Group();
    this.arenaGroup = new THREE.Group();

    this.scene.add(this.galaxyGroup);
    this.scene.add(this.systemGroup);
    this.scene.add(this.vfxGroup);
    this.scene.add(this.inspectorGroup);
    this.scene.add(this.arenaGroup);

    this.camTarget = new THREE.Vector3(0, 0, 0);
    this.camPosTarget = new THREE.Vector3(0, 220, 350);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    // Orbit state
    this.isDragging = false;
    this.dragMoved = 0;
    this.prevMouse = { x: 0, y: 0 };
    this.pinchDist = 0;
    this.orbitAngles = { theta: 0.35, phi: 0.78 };
    this.orbitRadius = 380;

    window.addEventListener("resize", () => this.onWindowResize());
    window.addEventListener("keydown", (e) => this.keysDown.add(e.key.toLowerCase()));
    window.addEventListener("keyup", (e) => this.keysDown.delete(e.key.toLowerCase()));
  }

  // --- NỀN THIÊN HÀ XOẮN ỐC, BỤI SAO & MẶT PHẲNG NADIR ---
  createStarfieldAndNebula() {
    const starCount = 7500;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color("#38bdf8"),
      new THREE.Color("#a855f7"),
      new THREE.Color("#facc15"),
      new THREE.Color("#f472b6"),
      new THREE.Color("#e2e8f0")
    ];

    for (let i = 0; i < starCount; i++) {
      if (i < 5500) {
        // Đĩa xoắn ốc Gaiastra
        const arms = 3;
        const arm = i % arms;
        const r = Math.pow(Math.random(), 1.7) * 420 + 14;
        const angle = (arm * (Math.PI * 2 / arms)) + r * 0.013 + (Math.random() - 0.5) * 0.85;
        positions[i * 3] = Math.cos(angle) * r;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 38 * Math.exp(-r * 0.003);
        positions[i * 3 + 2] = Math.sin(angle) * r;
      } else {
        // Nền sao sâu đa hướng + vệt Nadir phía dưới
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const rad = 520 + Math.random() * 550;
        positions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = rad * Math.cos(phi);
        positions[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
      }

      const col = palette[i % palette.length];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 2.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.galaxyStars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.galaxyStars);

    // Vòng lưới tọa độ Gaiastra
    const gridRing1 = new THREE.RingGeometry(120, 121.2, 72);
    const gridRing2 = new THREE.RingGeometry(240, 241.5, 96);
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.12 });
    [gridRing1, gridRing2].forEach(g => {
      const m = new THREE.Mesh(g, gridMat);
      m.rotation.x = Math.PI / 2;
      this.galaxyGroup.add(m);
    });

    // Vòng xoáy chiều không gian Nadir (phía dưới y = -120)
    const nadirRing = new THREE.Mesh(
      new THREE.RingGeometry(95, 175, 48),
      new THREE.MeshBasicMaterial({ color: 0x991b1b, side: THREE.DoubleSide, transparent: true, opacity: 0.14 })
    );
    nadirRing.rotation.x = Math.PI / 2;
    nadirRing.position.y = -120;
    this.galaxyGroup.add(nadirRing);

    // Đám mây tinh vân phát sáng tạo chiều sâu không gian
    const nebulaColors = [0x0284c7, 0x7e22ce, 0xf43f5e, 0xfacc15];
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const rad = 85 + (i % 4) * 72;
      const cloud = new THREE.Mesh(
        new THREE.SphereGeometry(24 + (i % 3) * 14, 14, 14),
        new THREE.MeshBasicMaterial({
          color: nebulaColors[i % nebulaColors.length],
          transparent: true,
          opacity: 0.045,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      cloud.position.set(Math.cos(ang) * rad, (i % 2 === 0 ? 12 : -14), Math.sin(ang) * rad);
      this.galaxyGroup.add(cloud);
    }
  }

  // --- DỰNG CÁC SECTOR TRÊN BẢN ĐỒ NGÂN HÀ ---
  buildGalaxySectors() {
    this.sectorMeshes = [];
    const drawnPairs = new Set();
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending
    });

    for (const sec of SECTORS) {
      const pos = new THREE.Vector3(...sec.pos);
      const radius = sec.lost ? 4.2 : (sec.weight || 4) * 1.15 + 4.8;
      const colHex = sec.owner && FACTIONS[sec.owner] ? FACTIONS[sec.owner].color : (sec.lost ? "#f472b6" : "#94a3b8");

      const geo = sec.kind === "domain"
        ? new THREE.OctahedronGeometry(radius, 1)
        : (sec.kind === "edge" ? new THREE.IcosahedronGeometry(radius, 0) : new THREE.SphereGeometry(radius, 28, 28));

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colHex),
        emissive: new THREE.Color(colHex),
        emissiveIntensity: sec.capital ? 0.65 : 0.35,
        roughness: 0.32,
        metalness: 0.55,
        wireframe: !!sec.lost
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.userData = { sectorId: sec.id, isSector: true };
      this.galaxyGroup.add(mesh);
      this.sectorMeshes.push(mesh);

      // Aura wireframe nhẹ
      const glowMesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.38, 14, 14),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(colHex),
          transparent: true,
          opacity: sec.capital ? 0.22 : 0.11,
          wireframe: true,
          blending: THREE.AdditiveBlending
        })
      );
      mesh.add(glowMesh);

      if (sec.kind === "system" || sec.capital) {
        const ringMesh = new THREE.Mesh(
          new THREE.RingGeometry(radius * 1.55, radius * 2.15, 36),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(colHex),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.32
          })
        );
        ringMesh.rotation.x = Math.PI / 2 + 0.25;
        mesh.add(ringMesh);
      }

      // Tuyến kết nối
      for (const targetId of (sec.links || [])) {
        const target = SECTOR_BY_ID[targetId];
        if (!target) continue;
        const pairKey = [sec.id, targetId].sort().join("<->");
        if (drawnPairs.has(pairKey)) continue;
        drawnPairs.add(pairKey);

        const pts = [pos, new THREE.Vector3(...target.pos)];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);

        const isCursewBorder =
          (sec.id === "western_march" && (targetId === "berlidona" || targetId === "prussireich" || targetId === "tyrania"));

        const matLink = isCursewBorder
          ? new THREE.LineDashedMaterial({ color: 0xef4444, dashSize: 7, gapSize: 4, transparent: true, opacity: 0.85 })
          : lineMat;

        const line = new THREE.Line(lineGeo, matLink);
        if (matLink.isLineDashedMaterial) line.computeLineDistances();
        this.galaxyGroup.add(line);
      }
    }
  }

  updateSectorColors(gameState) {
    for (const mesh of this.sectorMeshes) {
      const secId = mesh.userData.sectorId;
      const curOwner = gameState.ownerOf(secId);
      const sec = SECTOR_BY_ID[secId];
      const colHex = curOwner && FACTIONS[curOwner]
        ? FACTIONS[curOwner].color
        : (sec?.lost ? "#f472b6" : "#94a3b8");
      mesh.material.color.set(colHex);
      mesh.material.emissive.set(colHex);
    }
  }

  // --- ZOOM VÀO HỆ SAO / KHU VỰC ---
  zoomToSector(sectorId) {
    const sec = SECTOR_BY_ID[sectorId];
    if (!sec) return;
    this.selectedSectorId = sectorId;
    this.selectedBodyId = null;

    const targetPos = new THREE.Vector3(...sec.pos);
    this.camTarget.copy(targetPos);
    this.orbitAngles = { theta: 0.4, phi: 0.82 };
    this.orbitRadius = sec.kind === "system" ? 95 : 68;

    this.clearGroup(this.systemGroup);
    this.systemBodies = [];

    if (sec.kind === "system" && sec.bodies && sec.bodies.length > 0) {
      if (sec.star) {
        const starSize = sec.star.size || 5;
        const starMesh = new THREE.Mesh(
          new THREE.SphereGeometry(starSize, 32, 32),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(sec.star.color || "#ffffff") })
        );
        starMesh.position.copy(targetPos);
        this.systemGroup.add(starMesh);

        // Corona 2 lớp
        const corona1 = new THREE.Mesh(
          new THREE.SphereGeometry(starSize * 1.45, 20, 20),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(sec.star.color || "#ffffff"),
            transparent: true,
            opacity: 0.28,
            blending: THREE.AdditiveBlending
          })
        );
        const corona2 = new THREE.Mesh(
          new THREE.SphereGeometry(starSize * 2.1, 16, 16),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(sec.star.color || "#ffffff"),
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending
          })
        );
        starMesh.add(corona1);
        starMesh.add(corona2);
      }

      sec.bodies.forEach((b, idx) => {
        const orbR = (b.orbit || 20) * 0.65;
        const curve = new THREE.EllipseCurve(targetPos.x, targetPos.z, orbR, orbR, 0, Math.PI * 2, false, 0);
        const pts = curve.getPoints(72).map(p => new THREE.Vector3(p.x, targetPos.y, p.y));
        const orbitLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: b.kind === "megastructure" ? 0xfacc15 : 0x475569, transparent: true, opacity: 0.42 })
        );
        this.systemGroup.add(orbitLine);

        const bSize = Math.max(0.8, (b.size || 1.5) * 1.05);
        const bGeo = b.kind === "asteroid"
          ? new THREE.DodecahedronGeometry(bSize, 0)
          : (b.kind === "megastructure" ? new THREE.OctahedronGeometry(bSize * 0.95, 0) : new THREE.SphereGeometry(bSize, 24, 24));

        const bMesh = new THREE.Mesh(
          bGeo,
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(b.color || "#38bdf8"),
            emissive: new THREE.Color(b.color || "#38bdf8"),
            emissiveIntensity: b.kind === "megastructure" ? 0.55 : 0.16,
            roughness: 0.5,
            metalness: 0.25
          })
        );

        const initAngle = idx * 1.35 + 0.5;
        bMesh.position.set(
          targetPos.x + Math.cos(initAngle) * orbR,
          targetPos.y,
          targetPos.z + Math.sin(initAngle) * orbR
        );
        bMesh.userData = { isBody: true, sectorId: sec.id, bodyId: b.id, bodyData: b };
        this.systemGroup.add(bMesh);

        if (b.ring) {
          const rMesh = new THREE.Mesh(
            new THREE.RingGeometry(bSize * 1.45, bSize * 2.4, 32),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(b.color), side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
          );
          rMesh.rotation.x = Math.PI / 2 + 0.35;
          bMesh.add(rMesh);
        }

        // Mặt trăng quay quanh hành tinh (nếu có)
        const moons = [];
        for (const m of (b.moons || [])) {
          const mOrbit = Math.max(bSize * 1.8, (m.orbit || 3) * 0.85);
          const mMesh = new THREE.Mesh(
            new THREE.SphereGeometry(Math.max(0.42, (m.size || 0.4) * 1.1), 16, 16),
            new THREE.MeshStandardMaterial({ color: new THREE.Color(m.color || "#d4d4d8"), roughness: 0.8 })
          );
          bMesh.add(mMesh);
          moons.push({ mesh: mMesh, orbit: mOrbit, angle: 0.8, speed: 0.8, data: m });
        }

        this.systemBodies.push({
          mesh: bMesh,
          center: targetPos,
          orbit: orbR,
          angle: initAngle,
          speed: 0.22 / Math.sqrt(Math.max(5, orbR)),
          bodyData: b,
          moons
        });
      });
    }
  }

  zoomToBody(sectorId, bodyId) {
    if (this.selectedSectorId !== sectorId) {
      this.zoomToSector(sectorId);
    }
    this.selectedBodyId = bodyId;
    const entry = this.systemBodies.find(e => e.bodyData.id === bodyId);
    if (entry) {
      this.camTarget.copy(entry.mesh.position);
      this.orbitRadius = Math.max(12, (entry.bodyData.size || 1.5) * 8);
    }
  }

  resetGalaxyCamera() {
    this.selectedSectorId = null;
    this.selectedBodyId = null;
    this.camTarget.set(0, 0, 0);
    this.orbitRadius = 380;
    this.orbitAngles = { theta: 0.35, phi: 0.78 };
    this.clearGroup(this.systemGroup);
    this.systemBodies = [];
  }

  // --- VN STAGE BACKDROP ---
  setVNBackdrop(sectorId, moodColor = "#38bdf8") {
    this.vnSectorId = sectorId || "sylvalon";
    const sec = SECTOR_BY_ID[this.vnSectorId];
    if (sec) {
      this.zoomToSector(sec.id);
      this.orbitRadius = sec.kind === "system" ? 78 : 55;
      this.rimLight.color.set(moodColor || FACTIONS[sec.owner]?.color || "#38bdf8");
    }
  }

  // --- SUPERWEAPON 3D VFX ---
  playSuperweaponVFX(swId, sectorId) {
    const sec = SECTOR_BY_ID[sectorId];
    if (!sec) return;
    const pos = new THREE.Vector3(...sec.pos);
    this.cameraShake = 0.75;

    if (swId === "gotterfall") {
      // Cột sáng hủy diệt thẳng đứng + vòng xung kích
      const beamGeo = new THREE.CylinderGeometry(2.5, 2.5, 260, 20);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.copy(pos);
      this.vfxGroup.add(beam);

      const wave = new THREE.Mesh(
        new THREE.RingGeometry(2, 5, 36),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
      );
      wave.rotation.x = Math.PI / 2;
      wave.position.copy(pos);
      this.vfxGroup.add(wave);

      this.vfxList.push({
        age: 0, maxAge: 2.2,
        update: (t) => {
          beam.scale.set(1 - t * 0.75, 1, 1 - t * 0.75);
          beam.material.opacity = Math.max(0, 1 - t);
          wave.scale.setScalar(1 + t * 14);
          wave.material.opacity = Math.max(0, 1 - t);
        },
        cleanup: () => { this.vfxGroup.remove(beam); this.vfxGroup.remove(wave); }
      });
    } else if (swId === "schwarzbruch") {
      const hole = new THREE.Mesh(
        new THREE.SphereGeometry(6, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0x020617 })
      );
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(9, 1.2, 12, 48),
        new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })
      );
      rim.rotation.x = Math.PI / 2.4;
      hole.position.copy(pos);
      rim.position.copy(pos);
      this.vfxGroup.add(hole);
      this.vfxGroup.add(rim);

      this.vfxList.push({
        age: 0, maxAge: 2.6,
        update: (t) => {
          const s = t < 0.5 ? 1 + t * 3.5 : Math.max(0.05, 2.75 - (t - 0.5) * 5.2);
          hole.scale.setScalar(s);
          rim.scale.setScalar(s * 1.25);
          rim.rotation.z += 0.14;
        },
        cleanup: () => { this.vfxGroup.remove(hole); this.vfxGroup.remove(rim); }
      });
    } else {
      const col = swId === "chaos_lock" ? 0xfacc15 : (swId === "predita_veterans" ? 0x818cf8 : 0xef4444);
      const cage = new THREE.Mesh(
        new THREE.IcosahedronGeometry(14, 1),
        new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
      );
      cage.position.copy(pos);
      this.vfxGroup.add(cage);

      this.vfxList.push({
        age: 0, maxAge: 2.2,
        update: (t) => {
          cage.rotation.y += 0.06;
          cage.scale.setScalar(0.6 + Math.sin(t * Math.PI) * 0.9);
          cage.material.opacity = Math.max(0, 1 - t);
        },
        cleanup: () => { this.vfxGroup.remove(cage); }
      });
    }
  }

  // --- DỰNG MÔ HÌNH NHÂN VẬT 3D CHUYÊN SÂU (DÙNG ĐÚNG MÀU c.hair, c.eye, c.outfit) ---
  createCharacterRig(c, highlightColor = null) {
    const group = new THREE.Group();
    const h = c.h || c.height || 1.75;
    const style = RACE_STYLE[c.race] || { aura: "#38bdf8", skin: "#f1dccf" };
    const facCol = FACTIONS[c.fac]?.color || style.aura;
    const outfitCol = new THREE.Color(c.outfit || facCol);
    const hairCol = new THREE.Color(c.hair || "#18181b");
    const eyeCol = new THREE.Color(c.eye || "#38bdf8");
    const skinCol = new THREE.Color(style.skin || "#f1dccf");
    const auraCol = new THREE.Color(highlightColor || style.aura || "#38bdf8");
    const isFemale = c.g === "F";

    const wScale = isFemale ? 1.0 : 1.22;
    const scaleY = h / 1.75;

    const bodyPivot = new THREE.Group();
    group.add(bodyPivot);

    // Chân trái & phải
    const legGeo = new THREE.CylinderGeometry(0.11 * wScale, 0.08 * wScale, 0.78 * scaleY, 12);
    const legMat = new THREE.MeshStandardMaterial({ color: outfitCol.clone().multiplyScalar(0.75), metalness: 0.45, roughness: 0.45 });
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.15 * wScale, 0.39 * scaleY, 0);
    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.15 * wScale, 0.39 * scaleY, 0);
    bodyPivot.add(legL, legR);

    // Thân giáp
    const torsoGeo = new THREE.CylinderGeometry(isFemale ? 0.25 : 0.34, isFemale ? 0.17 : 0.24, 0.62 * scaleY, 14);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: outfitCol,
      emissive: auraCol,
      emissiveIntensity: 0.16,
      metalness: 0.55,
      roughness: 0.35
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.08 * scaleY;
    bodyPivot.add(torso);

    // Vai giáp / Áo choàng
    const shoulderGeo = new THREE.BoxGeometry(isFemale ? 0.58 : 0.76, 0.14 * scaleY, 0.28);
    const shoulders = new THREE.Mesh(shoulderGeo, torsoMat);
    shoulders.position.y = 1.34 * scaleY;
    bodyPivot.add(shoulders);

    // Tay trái & phải
    const armGeo = new THREE.CylinderGeometry(0.07 * wScale, 0.06 * wScale, 0.56 * scaleY, 10);
    const skinMat = new THREE.MeshStandardMaterial({ color: skinCol, roughness: 0.7 });
    const armL = new THREE.Mesh(armGeo, skinMat);
    armL.position.set(-0.34 * wScale, 1.05 * scaleY, 0);
    armL.rotation.z = 0.12;
    const armR = new THREE.Mesh(armGeo, skinMat);
    armR.position.set(0.34 * wScale, 1.05 * scaleY, 0);
    armR.rotation.z = -0.12;
    bodyPivot.add(armL, armR);

    // Đầu
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19 * Math.sqrt(scaleY), 20, 20), skinMat);
    head.position.y = 1.56 * scaleY;
    bodyPivot.add(head);

    // Mắt phát sáng
    const eyeMat = new THREE.MeshBasicMaterial({ color: eyeCol });
    const eyeGeo = new THREE.SphereGeometry(0.028 * Math.sqrt(scaleY), 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.065, 1.57 * scaleY, 0.16 * Math.sqrt(scaleY));
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.065, 1.57 * scaleY, 0.16 * Math.sqrt(scaleY));
    bodyPivot.add(eyeL, eyeR);

    // Tóc
    const hairMat = new THREE.MeshStandardMaterial({ color: hairCol, roughness: 0.4 });
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.205 * Math.sqrt(scaleY), 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
      hairMat
    );
    hairTop.position.y = 1.58 * scaleY;
    bodyPivot.add(hairTop);

    if (isFemale) {
      const hairBack = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.55 * scaleY, 12),
        hairMat
      );
      hairBack.position.set(0, 1.38 * scaleY, -0.12);
      hairBack.rotation.x = 0.2;
      bodyPivot.add(hairBack);
    }

    // Đặc trưng chủng tộc & trang bị vũ khí 3D
    let accentRing = null;
    if (c.id === "arisia" || c.race === "tamarite" || c.race === "erisian" || c.race === "demigod") {
      accentRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.62 * scaleY, 0.028, 10, 36),
        new THREE.MeshBasicMaterial({ color: auraCol, transparent: true, opacity: 0.85 })
      );
      accentRing.position.set(0, 1.25 * scaleY, -0.25);
      bodyPivot.add(accentRing);

      // Cánh năng lượng đôi
      const wingGeo = new THREE.BoxGeometry(0.72 * wScale, 0.24 * scaleY, 0.03);
      const wingMat = new THREE.MeshBasicMaterial({ color: auraCol, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending });
      const wL = new THREE.Mesh(wingGeo, wingMat);
      wL.position.set(-0.55 * wScale, 1.32 * scaleY, -0.22);
      wL.rotation.z = 0.35;
      const wR = new THREE.Mesh(wingGeo, wingMat);
      wR.position.set(0.55 * wScale, 1.32 * scaleY, -0.22);
      wR.rotation.z = -0.35;
      bodyPivot.add(wL, wR);
    } else if (c.race === "nadir" || c.race === "demon" || c.race === "chimera") {
      const hornGeo = new THREE.ConeGeometry(0.05, 0.28 * scaleY, 8);
      const hornMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: auraCol, emissiveIntensity: 0.65 });
      const hL = new THREE.Mesh(hornGeo, hornMat);
      hL.position.set(-0.14, 1.75 * scaleY, 0);
      hL.rotation.z = 0.35;
      const hR = new THREE.Mesh(hornGeo, hornMat);
      hR.position.set(0.14, 1.75 * scaleY, 0);
      hR.rotation.z = -0.35;
      bodyPivot.add(hL, hR);

      // Áo choàng bóng tối
      const cape = new THREE.Mesh(
        new THREE.ConeGeometry(0.45 * wScale, 1.2 * scaleY, 8, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x09090b, emissive: auraCol, emissiveIntensity: 0.12, side: THREE.DoubleSide })
      );
      cape.position.set(0, 0.78 * scaleY, -0.18);
      bodyPivot.add(cape);
    } else if (c.race === "cyborg") {
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.07 * Math.sqrt(scaleY), 0.14),
        new THREE.MeshBasicMaterial({ color: eyeCol })
      );
      visor.position.set(0, 1.57 * scaleY, 0.14 * Math.sqrt(scaleY));
      bodyPivot.add(visor);
    }

    // Vũ khí năng lượng trên tay phải theo vai trò chiến đấu
    const skillStr = (c.skills || []).join(" ").toLowerCase();
    if (skillStr.includes("kiếm") || skillStr.includes("thương") || skillStr.includes("rìu") || c.race === "prozonian") {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 1.05 * scaleY, 0.08),
        new THREE.MeshBasicMaterial({ color: auraCol, transparent: true, opacity: 0.9 })
      );
      blade.position.set(0.04, -0.36 * scaleY, 0.42);
      blade.rotation.x = Math.PI * 0.36;
      armR.add(blade);
    }

    // Khiên năng lượng (hiện khi Né đòn / Shield active)
    const shieldDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.95 * scaleY, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x34d399, wireframe: true, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })
    );
    shieldDome.position.y = 0.95 * scaleY;
    shieldDome.visible = false;
    group.add(shieldDome);

    // Vòng chân năng lượng
    const baseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.82, 32),
      new THREE.MeshBasicMaterial({ color: auraCol, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.03;
    group.add(baseRing);

    group.userData = { bodyPivot, armL, armR, legL, legR, accentRing, shieldDome, scaleY };
    return group;
  }

  // --- MODE 3: CHARACTER INSPECTOR SHOWCASE ---
  showcaseCharacter(charId) {
    const c = CHAR_BY_ID[charId];
    if (!c) return;
    this.inspectedCharId = charId;
    this.clearGroup(this.inspectorGroup);

    const h = c.h || c.height || 1.75;
    this.camTarget.set(0, h * 0.52, 0);
    this.orbitAngles = { theta: 0.25, phi: 1.32 };
    this.orbitRadius = Math.max(4.5, h * 2.55 + 1.8);

    const style = RACE_STYLE[c.race] || { aura: "#38bdf8" };
    const facCol = FACTIONS[c.fac]?.color || style.aura;

    // Bục Hologram
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.7, 0.35, 36),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.9,
        roughness: 0.2,
        emissive: new THREE.Color(facCol),
        emissiveIntensity: 0.25
      })
    );
    pedestal.position.y = -0.18;
    this.inspectorGroup.add(pedestal);

    const holoRing = new THREE.Mesh(
      new THREE.RingGeometry(2.35, 2.55, 48),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(c.outfit || facCol), side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    holoRing.rotation.x = Math.PI / 2;
    holoRing.position.y = 0.02;
    this.inspectorGroup.add(holoRing);

    // Khung dây chuẩn con người 1.70m bên trái để so sánh chiều cao thực
    const refHuman = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.26, 1.70, 12),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.38 })
    );
    refHuman.position.set(-1.35, 0.85, 0);
    this.inspectorGroup.add(refHuman);

    const rig = this.createCharacterRig(c);
    this.charModel = rig;
    this.inspectorGroup.add(rig);
  }

  // --- MODE 2: 3D REAL-TIME ACTION ARENA ---
  setupArenaStage(stageSecId, playerCharId, enemyCharId, options = {}) {
    this.clearGroup(this.arenaGroup);

    const sec = SECTOR_BY_ID[stageSecId] || SECTORS[0];
    const pChar = CHAR_BY_ID[playerCharId] || CHARACTERS[0];
    const eChar = CHAR_BY_ID[enemyCharId] || CHARACTERS[1];
    const buffMult = options.buffMult || 1.0;

    // Cân bằng HP để cả nhân vật CR cao và trung bình đều giao chiến đã tay
    const calcHp = (c, mult = 1.0) => Math.round((600 + c.cr * 9.5) * mult);

    this.arenaState = {
      active: true,
      autoPilot: false,
      stageId: sec.id,
      buffMult,
      player: {
        id: pChar.id,
        char: pChar,
        name: pChar.name,
        cr: pChar.cr,
        maxHp: calcHp(pChar, buffMult),
        hp: calcHp(pChar, buffMult),
        pos: new THREE.Vector3(-14, 0, 0),
        vel: new THREE.Vector3(),
        mesh: null,
        cooldowns: [0, 0, 0],
        dodgeCd: 0,
        shieldTime: 0,
        combo: 0,
        comboTimer: 0,
        overdrive: 0,
        hitFlash: 0
      },
      enemy: {
        id: eChar.id,
        char: eChar,
        name: eChar.name,
        cr: eChar.cr,
        maxHp: calcHp(eChar, 1.0),
        hp: calcHp(eChar, 1.0),
        pos: new THREE.Vector3(14, 0, 0),
        mesh: null,
        aiTimer: 1.0,
        strafeDir: 1,
        hitFlash: 0
      },
      projectiles: [],
      shockwaves: []
    };

    const stageCol = FACTIONS[sec.owner]?.color || "#38bdf8";

    // Sàn đấu lục giác
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(33, 36, 1.4, 6),
      new THREE.MeshStandardMaterial({
        color: 0x090d1b,
        metalness: 0.85,
        roughness: 0.25,
        emissive: new THREE.Color(stageCol),
        emissiveIntensity: 0.14
      })
    );
    floor.position.y = -0.7;
    this.arenaGroup.add(floor);

    const floorRing = new THREE.Mesh(
      new THREE.RingGeometry(30.5, 32.2, 6),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(stageCol), side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
    );
    floorRing.rotation.x = Math.PI / 2;
    floorRing.position.y = 0.03;
    this.arenaGroup.add(floorRing);

    // Lồng năng lượng bảo hộ
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(34, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(stageCol), wireframe: true, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending })
    );
    this.arenaGroup.add(dome);

    const pMesh = this.createCharacterRig(pChar, "#38bdf8");
    pMesh.position.copy(this.arenaState.player.pos);
    this.arenaGroup.add(pMesh);
    this.arenaState.player.mesh = pMesh;

    const eMesh = this.createCharacterRig(eChar, "#fb7185");
    eMesh.position.copy(this.arenaState.enemy.pos);
    this.arenaGroup.add(eMesh);
    this.arenaState.enemy.mesh = eMesh;

    this.camTarget.set(0, 2.5, 0);
    this.orbitAngles = { theta: 0, phi: 1.05 };
    this.orbitRadius = 38;
  }

  setJoystickInput(vx, vz) {
    this.joystickVec.x = vx;
    this.joystickVec.z = vz;
  }

  triggerDodge() {
    if (!this.arenaState || !this.arenaState.active) return { ok: false };
    const p = this.arenaState.player;
    if (p.dodgeCd > 0) return { ok: false, msg: `Né đòn đang hồi (${p.dodgeCd.toFixed(1)}s)` };
    p.dodgeCd = 3.0;
    p.shieldTime = 1.2;

    // Lướt ngang vuông góc hướng địch
    const toEnemy = new THREE.Vector3().subVectors(this.arenaState.enemy.pos, p.pos).normalize();
    const side = new THREE.Vector3(-toEnemy.z, 0, toEnemy.x).multiplyScalar(8);
    p.pos.add(side);
    if (p.pos.length() > 29) p.pos.setLength(29);
    return { ok: true, msg: `💨 ${p.name} né chớp nhoáng & bật khiên 1.2s!` };
  }

  calcSkillDamage(attackerChar, defenderChar, mult) {
    // Khắc chế chủng tộc theo đúng lore!
    const atkEl = RACE_STYLE[attackerChar.race]?.element || "beam";
    let dmg = attackerChar.cr * mult * (0.92 + Math.random() * 0.24) * 9.5;
    let note = "";

    // Prozonian giảm 80% sát thương nguyền (Nadir / Demon / Chimera)
    if (defenderChar.race === "prozonian" && (atkEl === "abyss" || attackerChar.race === "nadir" || attackerChar.race === "demon")) {
      dmg *= 0.25;
      note = " (Prozonian kháng nguyền!)";
    }
    // Tamarite kháng ma thuật
    if (defenderChar.race === "tamarite" && atkEl === "psychic") {
      dmg *= 0.65;
      note = " (Tamarite phản ma thuật!)";
    }
    // Amily / Tyranian sức mạnh cận chiến
    if (attackerChar.race === "tyranian" && mult >= 0.35) {
      dmg *= 1.15;
    }

    return { damage: Math.max(18, Math.round(dmg)), note };
  }

  triggerArenaSkill(slotIndex) {
    if (!this.arenaState || !this.arenaState.active) return null;
    const p = this.arenaState.player;
    const e = this.arenaState.enemy;

    if (p.cooldowns[slotIndex] > 0) {
      return { ok: false, msg: `Kỹ năng đang hồi (${p.cooldowns[slotIndex].toFixed(1)}s)` };
    }

    const pChar = p.char;
    const skillName = (pChar.skills && pChar.skills[slotIndex]) || `Tuyệt kỹ ${slotIndex + 1}`;
    const baseMult = [0.16, 0.30, 0.58][slotIndex] || 0.2;
    const cdTimes = [1.4, 3.2, 6.5][slotIndex] || 2.0;
    p.cooldowns[slotIndex] = cdTimes;

    // Combo multiplier & Overdrive gauge
    p.combo = (p.combo || 0) + 1;
    p.comboTimer = 5.5;
    const comboMult = 1 + Math.min(0.35, (p.combo - 1) * 0.05);

    let overdriveNote = "";
    let odMult = this.arenaState.buffMult || 1.0;
    if (slotIndex === 2 && p.overdrive >= 100) {
      p.overdrive = 0;
      odMult *= 1.5;
      overdriveNote = " ★ OVERDRIVE MAX x1.5!";
    } else {
      p.overdrive = Math.min(100, (p.overdrive || 0) + [20, 32, 45][slotIndex]);
    }

    const { damage: rawDmg, note } = this.calcSkillDamage(pChar, e.char, baseMult);
    const damage = Math.max(18, Math.round(rawDmg * comboMult * odMult));
    e.hp = Math.max(0, e.hp - damage);
    e.hitFlash = 0.25;

    const auraHex = RACE_STYLE[pChar.race]?.aura || "#38bdf8";
    const from = p.pos.clone().add(new THREE.Vector3(0, (pChar.h || pChar.height || 1.7) * 0.65, 0));
    const to = e.pos.clone().add(new THREE.Vector3(0, (e.char.h || e.char.height || 1.7) * 0.65, 0));

    if (slotIndex === 0) {
      this.spawnProjectile(from, to, auraHex, 0.55);
      this.spawnProjectile(from.clone().add(new THREE.Vector3(0, 0.45, 0)), to, "#ffffff", 0.32);
    } else if (slotIndex === 1) {
      this.spawnProjectile(from, to, auraHex, 0.9);
      this.spawnArenaShockwave(e.pos.clone(), auraHex, 9);
    } else {
      this.cameraShake = overdriveNote ? 0.95 : 0.65;
      this.spawnProjectile(from, to, "#facc15", 1.25);
      this.spawnArenaPillar(e.pos.clone(), auraHex);
      this.spawnArenaShockwave(e.pos.clone(), "#facc15", 16);
    }

    this.emitDamagePopup(to, `-${damage}${p.combo >= 3 ? " ×" + p.combo : ""}`, overdriveNote ? "#facc15" : "#38bdf8");

    const logMsg = `⚡ ${p.name} tung [${skillName}] gây ${damage} sát thương${overdriveNote}${note}!`;

    if (e.hp <= 0) {
      this.arenaState.active = false;
      this.onCombatEnd({ winner: "player", p, e, msg: `🏆 ${p.name} đã đánh bại ${e.name}!` });
    }

    return { ok: true, msg: logMsg, p, e };
  }

  spawnArenaShockwave(pos, colorHex, maxRadius = 11) {
    if (!this.arenaState) return;
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.5, 32),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex), side: THREE.DoubleSide, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(pos.x, 0.15, pos.z);
    this.arenaGroup.add(mesh);
    this.arenaState.shockwaves.push({ mesh, age: 0, maxAge: 0.55, maxScale: maxRadius });
  }

  spawnArenaPillar(pos, colorHex) {
    if (!this.arenaState) return;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 2.2, 48, 20),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
    );
    mesh.position.set(pos.x, 24, pos.z);
    this.arenaGroup.add(mesh);
    this.arenaState.shockwaves.push({ mesh, age: 0, maxAge: 0.75, maxScale: 1.8, isPillar: true });
  }

  emitDamagePopup(worldPos, text, color) {
    const v = worldPos.clone().project(this.camera);
    if (v.z > 1) return;
    const x = (v.x * 0.5 + 0.5) * this.width;
    const y = (-v.y * 0.5 + 0.5) * this.height;
    this.onFloatingDamage({ x, y, text, color });
  }

  spawnProjectile(fromPos, toPos, colorHex, radius = 0.65) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 12, 12),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex), blending: THREE.AdditiveBlending })
    );
    mesh.position.copy(fromPos);
    this.arenaGroup.add(mesh);

    this.arenaState.projectiles.push({
      mesh,
      start: fromPos.clone(),
      target: toPos.clone(),
      progress: 0,
      speed: 0.1
    });
  }

  // --- CONTROLS & MOBILE TOUCH ---
  setupInteraction() {
    const el = this.container;

    el.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.dragMoved = 0;
      this.prevMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mouseup", (e) => {
      if (this.isDragging && this.dragMoved < 8) {
        this.handleTap(e.clientX, e.clientY);
      }
      this.isDragging = false;
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouse.x;
      const dy = e.clientY - this.prevMouse.y;
      this.dragMoved += Math.hypot(dx, dy);
      this.prevMouse = { x: e.clientX, y: e.clientY };

      this.orbitAngles.theta -= dx * 0.0055;
      this.orbitAngles.phi = Math.max(0.15, Math.min(Math.PI * 0.48, this.orbitAngles.phi - dy * 0.0055));
    });

    el.addEventListener("wheel", (e) => {
      this.orbitRadius = Math.max(8, Math.min(760, this.orbitRadius + e.deltaY * 0.35));
    }, { passive: true });

    // Touch support cho điện thoại / tablet
    el.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.dragMoved = 0;
        this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        this.pinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    el.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        const dx = e.touches[0].clientX - this.prevMouse.x;
        const dy = e.touches[0].clientY - this.prevMouse.y;
        this.dragMoved += Math.hypot(dx, dy);
        this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        this.orbitAngles.theta -= dx * 0.0065;
        this.orbitAngles.phi = Math.max(0.15, Math.min(Math.PI * 0.48, this.orbitAngles.phi - dy * 0.0065));
      } else if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (this.pinchDist > 0) {
          this.orbitRadius = Math.max(8, Math.min(760, this.orbitRadius - (d - this.pinchDist) * 0.7));
        }
        this.pinchDist = d;
      }
    }, { passive: true });

    el.addEventListener("touchend", (e) => {
      if (e.changedTouches.length === 1 && this.isDragging && this.dragMoved < 12) {
        const t = e.changedTouches[0];
        this.handleTap(t.clientX, t.clientY);
      }
      if (e.touches.length === 0) {
        this.isDragging = false;
        this.pinchDist = 0;
      }
    }, { passive: true });
  }

  handleTap(clientX, clientY) {
    if (this.currentMode !== "galaxy") return;
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / this.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / this.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    // Ưu tiên chọn thiên thể trong hệ nếu đang zoom vào hệ sao
    if (this.selectedSectorId && this.systemBodies.length > 0) {
      const bodyMeshes = this.systemBodies.map(b => b.mesh);
      const bHits = this.raycaster.intersectObjects(bodyMeshes, false);
      if (bHits.length > 0) {
        const bId = bHits[0].object.userData?.bodyId;
        if (bId) {
          this.zoomToBody(this.selectedSectorId, bId);
          this.onBodySelect(this.selectedSectorId, bId);
          return;
        }
      }
    }

    const hits = this.raycaster.intersectObjects(this.sectorMeshes, true);
    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj && !obj.userData?.isSector) obj = obj.parent;
      const secId = obj?.userData?.sectorId;
      if (secId) {
        this.zoomToSector(secId);
        this.onSectorSelect(secId);
      }
    }
  }

  switchMode(mode) {
    this.currentMode = mode;
    const showSpace = (mode === "galaxy" || mode === "vn" || mode === "codex");
    this.galaxyGroup.visible = showSpace;
    this.systemGroup.visible = showSpace;
    this.vfxGroup.visible = showSpace;
    this.inspectorGroup.visible = (mode === "inspector");
    this.arenaGroup.visible = (mode === "arena");

    if (mode === "galaxy" && !this.selectedSectorId) {
      this.resetGalaxyCamera();
    } else if (mode === "vn") {
      this.setVNBackdrop(this.vnSectorId);
    }
  }

  onWindowResize() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  clearGroup(group) {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
  }

  // --- MAIN RENDER LOOP ---
  animate() {
    requestAnimationFrame(this.animate);
    const dt = 0.016;
    this.clock += dt;

    // 1. Xoay thiên hà & quỹ đạo hành tinh
    if (this.galaxyStars) this.galaxyStars.rotation.y += 0.00025;

    if ((this.currentMode === "galaxy" || this.currentMode === "vn") && !this.isDragging) {
      if (this.currentMode === "vn") {
        this.orbitAngles.theta += 0.0022;
      } else if (!this.selectedSectorId) {
        this.orbitAngles.theta += 0.0006;
      }
    }

    // Cập nhật chuyển động quỹ đạo trong System View
    for (const item of this.systemBodies) {
      item.angle += item.speed * dt;
      item.mesh.position.set(
        item.center.x + Math.cos(item.angle) * item.orbit,
        item.center.y,
        item.center.z + Math.sin(item.angle) * item.orbit
      );
      item.mesh.rotation.y += 0.008;
      if (this.selectedBodyId === item.bodyData.id) {
        this.camTarget.copy(item.mesh.position);
      }
      for (const m of item.moons) {
        m.angle += m.speed * dt;
        m.mesh.position.set(Math.cos(m.angle) * m.orbit, 0, Math.sin(m.angle) * m.orbit);
      }
    }

    // 2. Cập nhật VFX siêu vũ khí
    for (let i = this.vfxList.length - 1; i >= 0; i--) {
      const fx = this.vfxList[i];
      fx.age += dt;
      const t = Math.min(1, fx.age / fx.maxAge);
      fx.update(t);
      if (fx.age >= fx.maxAge) {
        fx.cleanup();
        this.vfxList.splice(i, 1);
      }
    }

    // 3. Camera Orbit Smooth Lerp (hỗ trợ mọi mode)
    const cx = this.camTarget.x + this.orbitRadius * Math.sin(this.orbitAngles.phi) * Math.sin(this.orbitAngles.theta);
    const cy = this.camTarget.y + this.orbitRadius * Math.cos(this.orbitAngles.phi);
    const cz = this.camTarget.z + this.orbitRadius * Math.sin(this.orbitAngles.phi) * Math.cos(this.orbitAngles.theta);
    this.camPosTarget.set(cx, cy, cz);

    this.camera.position.lerp(this.camPosTarget, 0.09);
    if (this.cameraShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake * 2.5;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake * 2.5;
      this.cameraShake = Math.max(0, this.cameraShake - dt * 1.8);
    }
    this.camera.lookAt(this.camTarget);

    // 4. Inspector Idle Animation
    if (this.currentMode === "inspector" && this.charModel) {
      if (!this.isDragging) this.charModel.rotation.y += 0.007;
      if (this.charModel.userData.accentRing) {
        this.charModel.userData.accentRing.rotation.z += 0.025;
      }
    }

    // 5. Arena Real-time Movement & Combat
    if (this.currentMode === "arena" && this.arenaState) {
      this.updateArena(dt);
    }

    // 6. Chiếu nhãn nổi 3D->2D trong Galaxy Mode
    if (this.currentMode === "galaxy") {
      this.projectGalaxyLabels();
    } else {
      this.onProjectLabels([]);
    }

    this.renderer.render(this.scene, this.camera);
  }

  projectGalaxyLabels() {
    const labels = [];
    const v = new THREE.Vector3();

    if (this.selectedSectorId && this.systemBodies.length > 0) {
      // Hiện nhãn các thiên thể bên trong hệ sao
      for (const item of this.systemBodies) {
        v.copy(item.mesh.position).add(new THREE.Vector3(0, (item.bodyData.size || 1.5) + 1.8, 0)).project(this.camera);
        if (v.z > 1) continue;
        labels.push({
          id: item.bodyData.id,
          sectorId: this.selectedSectorId,
          kind: "body",
          text: item.bodyData.name,
          color: item.bodyData.color || "#38bdf8",
          x: (v.x * 0.5 + 0.5) * this.width,
          y: (-v.y * 0.5 + 0.5) * this.height
        });
      }
    } else {
      // Hiện nhãn các Sector trên bản đồ ngân hà
      for (const mesh of this.sectorMeshes) {
        const secId = mesh.userData.sectorId;
        const sec = SECTOR_BY_ID[secId];
        if (!sec) continue;
        v.copy(mesh.position).add(new THREE.Vector3(0, 10, 0)).project(this.camera);
        if (v.z > 1) continue;
        labels.push({
          id: secId,
          sectorId: secId,
          kind: "sector",
          text: sec.name,
          color: "#" + mesh.material.color.getHexString(),
          x: (v.x * 0.5 + 0.5) * this.width,
          y: (-v.y * 0.5 + 0.5) * this.height
        });
      }
    }
    this.onProjectLabels(labels);
  }

  updateArena(dt) {
    const st = this.arenaState;
    const p = st.player;
    const e = st.enemy;

    // Cập nhật animation nhân vật & quay mặt về phía nhau
    if (p.mesh && e.mesh) {
      p.mesh.lookAt(e.pos.x, p.pos.y, e.pos.z);
      e.mesh.lookAt(p.pos.x, e.pos.y, p.pos.z);
      if (p.mesh.userData.accentRing) p.mesh.userData.accentRing.rotation.z += 0.04;
      if (e.mesh.userData.accentRing) e.mesh.userData.accentRing.rotation.z -= 0.04;
    }

    if (!st.active) return;

    // Cooldowns
    for (let i = 0; i < 3; i++) {
      if (p.cooldowns[i] > 0) p.cooldowns[i] = Math.max(0, p.cooldowns[i] - dt);
    }
    if (p.dodgeCd > 0) p.dodgeCd = Math.max(0, p.dodgeCd - dt);
    if (p.shieldTime > 0) p.shieldTime = Math.max(0, p.shieldTime - dt);
    if (p.comboTimer > 0) {
      p.comboTimer = Math.max(0, p.comboTimer - dt);
      if (p.comboTimer <= 0) p.combo = 0;
    }

    if (p.mesh?.userData?.shieldDome) {
      p.mesh.userData.shieldDome.visible = p.shieldTime > 0;
      p.mesh.userData.shieldDome.rotation.y += 0.08;
    }

    // Di chuyển Player (WASD / Arrow / Mobile Virtual Joystick)
    let mx = this.joystickVec.x;
    let mz = this.joystickVec.z;
    if (this.keysDown.has("w") || this.keysDown.has("arrowup")) mz -= 1;
    if (this.keysDown.has("s") || this.keysDown.has("arrowdown")) mz += 1;
    if (this.keysDown.has("a") || this.keysDown.has("arrowleft")) mx -= 1;
    if (this.keysDown.has("d") || this.keysDown.has("arrowright")) mx += 1;

    const pMoving = mx !== 0 || mz !== 0 || st.autoPilot;
    if (mx !== 0 || mz !== 0) {
      const move = new THREE.Vector3(mx, 0, mz).normalize().multiplyScalar(18 * dt);
      p.pos.add(move);
      if (p.pos.length() > 30) p.pos.setLength(30);
    } else if (st.autoPilot) {
      // Tự di chuyển vòng quanh giữ tầm tối ưu
      const toE = new THREE.Vector3().subVectors(e.pos, p.pos);
      const dist = toE.length();
      const tangent = new THREE.Vector3(-toE.z, 0, toE.x).normalize().multiplyScalar(10 * dt);
      if (dist > 15) p.pos.add(toE.normalize().multiplyScalar(10 * dt));
      p.pos.add(tangent);
      if (p.pos.length() > 29) p.pos.setLength(29);
    }
    if (p.mesh) {
      p.mesh.position.copy(p.pos);
      if (p.mesh.userData?.legL) {
        const swing = pMoving ? Math.sin(this.clock * 14) * 0.45 : 0;
        p.mesh.userData.legL.rotation.x = swing;
        p.mesh.userData.legR.rotation.x = -swing;
        p.mesh.userData.armL.rotation.x = -swing * 0.7;
        p.mesh.userData.armR.rotation.x = swing * 0.7;
      }
    }

    // Di chuyển AI địch
    const eToP = new THREE.Vector3().subVectors(p.pos, e.pos);
    const eDist = eToP.length();
    const eStrafe = new THREE.Vector3(-eToP.z, 0, eToP.x).normalize().multiplyScalar(6.5 * e.strafeDir * dt);
    if (eDist > 16) e.pos.add(eToP.normalize().multiplyScalar(8 * dt));
    e.pos.add(eStrafe);
    if (e.pos.length() > 29) {
      e.pos.setLength(29);
      e.strafeDir *= -1;
    }
    if (e.mesh) e.mesh.position.copy(e.pos);

    // Đòn đánh của Enemy
    e.aiTimer -= dt;
    if (e.aiTimer <= 0) {
      e.aiTimer = 1.9 + Math.random() * 0.7;
      if (p.shieldTime > 0) {
        this.emitDamagePopup(p.pos.clone().add(new THREE.Vector3(0, 2, 0)), "NÉ ĐÒN!", "#facc15");
        this.onCombatTick({ type: "player_attack", msg: `🛡️ ${p.name} né hoàn toàn đòn công kích của ${e.name}!`, p, e });
      } else {
        const { damage, note } = this.calcSkillDamage(e.char, p.char, 0.21);
        p.hp = Math.max(0, p.hp - damage);
        const from = e.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
        const to = p.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
        this.spawnProjectile(from, to, "#fb7185", 0.7);
        this.emitDamagePopup(to, `-${damage}`, "#fb7185");

        this.onCombatTick({
          type: "enemy_attack",
          msg: `💥 ${e.name} tấn công gây ${damage} sát thương lên ${p.name}${note}!`,
          p, e
        });

        if (p.hp <= 0) {
          st.active = false;
          this.onCombatEnd({ winner: "enemy", p, e, msg: `💀 ${p.name} đã thất trận trước ${e.name}!` });
        }
      }
    }

    // Autopilot auto-cast skills
    if (st.autoPilot && st.active) {
      for (let i = 2; i >= 0; i--) {
        if (p.cooldowns[i] <= 0) {
          const res = this.triggerArenaSkill(i);
          if (res && res.ok) this.onCombatTick({ type: "player_attack", msg: res.msg, p, e });
          break;
        }
      }
    }

    // Projectiles
    for (let i = st.projectiles.length - 1; i >= 0; i--) {
      const pr = st.projectiles[i];
      pr.progress += pr.speed;
      pr.mesh.position.lerpVectors(pr.start, pr.target, pr.progress);
      if (pr.progress >= 1) {
        this.arenaGroup.remove(pr.mesh);
        st.projectiles.splice(i, 1);
      }
    }

    // Shockwaves & Pillars
    for (let i = (st.shockwaves || []).length - 1; i >= 0; i--) {
      const sw = st.shockwaves[i];
      sw.age += dt;
      const t = Math.min(1, sw.age / sw.maxAge);
      if (sw.isPillar) {
        sw.mesh.scale.set(1 + t * 0.6, 1, 1 + t * 0.6);
      } else {
        sw.mesh.scale.setScalar(1 + t * sw.maxScale);
      }
      sw.mesh.material.opacity = Math.max(0, 1 - t);
      if (t >= 1) {
        this.arenaGroup.remove(sw.mesh);
        st.shockwaves.splice(i, 1);
      }
    }
  }
}
