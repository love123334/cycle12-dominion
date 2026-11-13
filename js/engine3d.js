// ============================================================================
// CYCLE 12: AGE OF DOMINION — THREE.JS 3D MULTI-MODE ENGINE
// Supports 4 Seamless 3D Modes:
// 1. 'galaxy'    : 3D Interactive Universe & Sector Conquest Map
// 2. 'arena'     : 3D Real-Time Action Combat (WASD + Flight + Lore Skills)
// 3. 'inspector' : 3D Character Pedestal with 1.70m Scale Reference
// 4. 'breeding'  : 3D DNA Helix & Bio-Incubator Chamber
// ============================================================================

class Cycle12Engine3D {
  constructor(canvasContainerId) {
    this.container = document.getElementById(canvasContainerId);
    this.mode = "galaxy"; // 'galaxy' | 'arena' | 'inspector' | 'breeding'
    this.clock = new THREE.Clock();

    // Core Three.js objects
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050714, 0.0022);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 95, 165);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Camera orbit state
    this.camTarget = new THREE.Vector3(0, 0, 0);
    this.camSpherical = { radius: 185, theta: 0.15, phi: 1.05 };
    this.desiredTarget = new THREE.Vector3(0, 0, 0);
    this.desiredRadius = 185;
    this.isDragging = false;
    this.prevMouse = { x: 0, y: 0 };

    // Raycaster for 3D picking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Mode groups
    this.galaxyGroup = new THREE.Group();
    this.arenaGroup = new THREE.Group();
    this.inspectorGroup = new THREE.Group();
    this.breedingGroup = new THREE.Group();
    this.vfxGroup = new THREE.Group();

    this.scene.add(this.galaxyGroup);
    this.scene.add(this.arenaGroup);
    this.scene.add(this.inspectorGroup);
    this.scene.add(this.breedingGroup);
    this.scene.add(this.vfxGroup);

    this.planetMeshes = [];
    this.activeVFX = [];
    this.keys = {};

    // Arena combat state
    this.arenaState = {
      active: false,
      autoPilot: false,
      playerChar: null,
      enemyChar: null,
      playerMesh: null,
      enemyMesh: null,
      playerHP: 1000,
      playerMaxHP: 1000,
      playerEnergy: 100,
      enemyHP: 1000,
      enemyMaxHP: 1000,
      cooldowns: [0, 0, 0],
      enemyAIWait: 0,
      arenaPlanet: null
    };

    this.initLights();
    this.initStarfield();
    this.buildGalaxyMap();
    this.buildArenaEnvironment();
    this.buildInspectorStage();
    this.buildBreedingChamber();
    this.bindEvents();
    this.setMode("galaxy");

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initLights() {
    const ambient = new THREE.AmbientLight(0x8899bb, 0.75);
    this.scene.add(ambient);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.35);
    this.sunLight.position.set(60, 120, 80);
    this.sunLight.castShadow = true;
    this.scene.add(this.sunLight);

    this.pointLight1 = new THREE.PointLight(0x38bdf8, 1.5, 250);
    this.pointLight1.position.set(0, 30, 0);
    this.scene.add(this.pointLight1);

    this.pointLight2 = new THREE.PointLight(0xf472b6, 1.2, 200);
    this.pointLight2.position.set(-50, 20, 50);
    this.scene.add(this.pointLight2);
  }

  initStarfield() {
    const starCount = 4500;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 300 + Math.random() * 650;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const palette = [
        [0.5, 0.8, 1.0],
        [1.0, 0.9, 0.6],
        [0.9, 0.5, 1.0],
        [1.0, 1.0, 1.0]
      ][Math.floor(Math.random() * 4)];
      colors[i * 3] = palette[0];
      colors[i * 3 + 1] = palette[1];
      colors[i * 3 + 2] = palette[2];
    }

    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });
    this.starField = new THREE.Points(geom, mat);
    this.scene.add(this.starField);
  }

  // ==========================================================================
  // 1. GALAXY 3D MAP BUILDER
  // ==========================================================================
  buildGalaxyMap() {
    const data = window.CYCLE12_DATA;

    // Galactic plane grid & Outer Layer Multiverse ring
    const outerRingGeo = new THREE.RingGeometry(132, 136, 96);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = Math.PI / 2;
    this.galaxyGroup.add(outerRing);

    // Inner grid circles
    [45, 85, 125].forEach((rad) => {
      const rGeo = new THREE.RingGeometry(rad, rad + 0.35, 64);
      const rMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.14
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.rotation.x = Math.PI / 2;
      this.galaxyGroup.add(rMesh);
    });

    // Nadir Dimensional Rift Vortex in Western Nadir
    const riftGeo = new THREE.TorusKnotGeometry(9, 2.2, 90, 16);
    const riftMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.9,
      wireframe: true
    });
    this.nadirRiftMesh = new THREE.Mesh(riftGeo, riftMat);
    this.nadirRiftMesh.position.set(-95, -14, -55);
    this.galaxyGroup.add(this.nadirRiftMesh);

    // Cursew Pact Blood-Cyan Line (Sylvalon <-> Western Nadir)
    const pactPoints = [
      new THREE.Vector3(0, 8, -95),
      new THREE.Vector3(-48, 2, -75),
      new THREE.Vector3(-95, -14, -55)
    ];
    const pactGeo = new THREE.BufferGeometry().setFromPoints(pactPoints);
    const pactMat = new THREE.LineBasicMaterial({
      color: 0xf43f5e,
      linewidth: 3
    });
    const pactLine = new THREE.Line(pactGeo, pactMat);
    this.galaxyGroup.add(pactLine);

    // Warp Lanes between sectors
    const warpPairs = [
      ["kronea", "berlidona"],
      ["kronea", "konstantine"],
      ["kronea", "eris_gate"],
      ["eris_gate", "evernight"],
      ["evernight", "pherone_nexus"],
      ["evernight", "tokyzhou_vander"],
      ["evernight", "wonder_island_mars"],
      ["zero_prozon", "predita"],
      ["zero_prozon", "orthodox_gandora"],
      ["zero_prozon", "kronea"],
      ["nadirius_prime", "zero_prozon"],
      ["nadirius_prime", "western_nadir_gate"]
    ];

    warpPairs.forEach(([idA, idB]) => {
      const pA = data.planets.find((p) => p.id === idA);
      const pB = data.planets.find((p) => p.id === idB);
      if (pA && pB) {
        const pts = [
          new THREE.Vector3(...pA.pos),
          new THREE.Vector3(...pB.pos)
        ];
        const lGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const lMat = new THREE.LineBasicMaterial({
          color: 0x475569,
          transparent: true,
          opacity: 0.45
        });
        this.galaxyGroup.add(new THREE.Line(lGeo, lMat));
      }
    });

    // Build each 3D Planet / Sector Node
    data.planets.forEach((p) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(...p.pos);
      pGroup.userData = { planetId: p.id, planetData: p };

      // Core sphere
      const sGeo = new THREE.SphereGeometry(p.size, 32, 32);
      const sMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(p.color),
        emissive: new THREE.Color(p.color),
        emissiveIntensity: 0.32,
        roughness: 0.4,
        metalness: 0.3
      });
      const sphere = new THREE.Mesh(sGeo, sMat);
      sphere.userData = { planetId: p.id, planetData: p };
      pGroup.add(sphere);

      // Atmosphere halo
      const aGeo = new THREE.SphereGeometry(p.size * 1.25, 24, 24);
      const aMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(p.color),
        transparent: true,
        opacity: 0.16,
        side: THREE.BackSide
      });
      pGroup.add(new THREE.Mesh(aGeo, aMat));

      // Optional Dyson / Planetary Ring
      if (p.ring) {
        const ringGeo = new THREE.RingGeometry(p.size * 1.45, p.size * 2.0, 48);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(p.color),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.4;
        pGroup.add(ring);
      }

      // Vertical beacon pillar to galactic plane
      const beaconPts = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, -p.pos[1], 0)
      ];
      const bGeo = new THREE.BufferGeometry().setFromPoints(beaconPts);
      const bMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(p.color),
        transparent: true,
        opacity: 0.35
      });
      pGroup.add(new THREE.Line(bGeo, bMat));

      // 3D Text Sprite Label above planet
      const labelSprite = this.createTextSprite(p.name, p.color);
      labelSprite.position.set(0, p.size + 4.5, 0);
      pGroup.add(labelSprite);

      this.galaxyGroup.add(pGroup);
      this.planetMeshes.push(sphere);
    });
  }

  createTextSprite(text, borderColor = "#38bdf8") {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(8, 12, 28, 0.85)";
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(12, 20, 488, 84, 18);
    ctx.fill();
    ctx.stroke();

    ctx.font = "bold 30px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 62);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(22, 5.5, 1);
    return sprite;
  }

  // ==========================================================================
  // 2. PROCEDURAL 3D CHARACTER MODEL BUILDER (ACCURATE LORE PROPORTIONS & CR)
  // ==========================================================================
  createCharacterMesh(charData) {
    const root = new THREE.Group();
    root.userData.charData = charData;

    // Height scale: 1 unit = 1 meter (Ceasaria = 3.5m, Veidos = 3.36m, Mr. Mind = 1.3m)
    const h = charData.height || 1.8;
    const scale = h / 1.8;

    // Parse measurements if female (e.g., "129-91-132" or "172-125-171")
    let bustFactor = 1.0;
    let hipFactor = 1.0;
    if (charData.gender === "Female" && charData.measurements) {
      const mMatch = charData.measurements.match(/(\d+)[–-](\d+)[–-](\d+)/);
      if (mMatch) {
        bustFactor = Math.min(1.55, Math.max(0.85, parseInt(mMatch[1], 10) / 96));
        hipFactor = Math.min(1.55, Math.max(0.85, parseInt(mMatch[3], 10) / 96));
      }
    }

    const skinColor =
      charData.id === "parasoid"
        ? 0x9333ea
        : charData.id === "jane"
        ? 0x9ca3af
        : charData.id === "veidos"
        ? 0xe2e8f0
        : charData.id === "ragnaroir"
        ? 0x27272a
        : 0xffd7ba;

    const skinMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.45,
      metalness: 0.1
    });

    const outfitMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(charData.outfitColor || "#38bdf8"),
      roughness: 0.3,
      metalness: 0.45
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(charData.hairColor || "#fde047"),
      roughness: 0.5
    });

    const eyeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(charData.eyeColor || "#38bdf8")
    });

    const bodyGroup = new THREE.Group();
    bodyGroup.scale.set(scale, scale, scale);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.11 * hipFactor, 0.08, 0.85, 16);
    const leftLeg = new THREE.Mesh(legGeo, skinMat);
    leftLeg.position.set(-0.14 * hipFactor, 0.42, 0);
    const rightLeg = new THREE.Mesh(legGeo, skinMat);
    rightLeg.position.set(0.14 * hipFactor, 0.42, 0);
    bodyGroup.add(leftLeg, rightLeg);

    // Boots / Greaves
    const bootGeo = new THREE.CylinderGeometry(0.115, 0.095, 0.38, 16);
    const leftBoot = new THREE.Mesh(bootGeo, outfitMat);
    leftBoot.position.set(-0.14 * hipFactor, 0.19, 0);
    const rightBoot = new THREE.Mesh(bootGeo, outfitMat);
    rightBoot.position.set(0.14 * hipFactor, 0.19, 0);
    bodyGroup.add(leftBoot, rightBoot);

    // Hips / Pelvis
    const hipGeo = new THREE.SphereGeometry(0.24 * hipFactor, 20, 16);
    hipGeo.scale(1.15, 0.75, 0.95);
    const hips = new THREE.Mesh(hipGeo, outfitMat);
    hips.position.set(0, 0.86, 0);
    bodyGroup.add(hips);

    // Torso / Chest
    const isMale = charData.gender === "Male";
    const torsoTop = isMale ? 0.28 : 0.22 * bustFactor;
    const torsoBot = isMale ? 0.21 : 0.15;
    const torsoGeo = new THREE.CylinderGeometry(torsoTop, torsoBot, 0.56, 20);
    const torso = new THREE.Mesh(torsoGeo, outfitMat);
    torso.position.set(0, 1.18, 0);
    bodyGroup.add(torso);

    // Female Bust Sculpture (scaled to lore bust measurement)
    if (!isMale) {
      const bRadius = 0.125 * bustFactor;
      const bustGeo = new THREE.SphereGeometry(bRadius, 20, 20);
      const leftBust = new THREE.Mesh(bustGeo, outfitMat);
      leftBust.position.set(-0.11 * bustFactor, 1.27, 0.14 * bustFactor);
      const rightBust = new THREE.Mesh(bustGeo, outfitMat);
      rightBust.position.set(0.11 * bustFactor, 1.27, 0.14 * bustFactor);
      bodyGroup.add(leftBust, rightBust);
    }

    // Arms
    const armGeo = new THREE.CylinderGeometry(isMale ? 0.09 : 0.068, 0.055, 0.62, 14);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-(torsoTop + 0.09), 1.16, 0);
    leftArm.rotation.z = 0.18;
    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.set(torsoTop + 0.09, 1.16, 0);
    rightArm.rotation.z = -0.18;
    bodyGroup.add(leftArm, rightArm);

    // Head
    const headGeo = new THREE.SphereGeometry(0.18, 24, 24);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 1.62, 0);
    bodyGroup.add(head);

    // Glowing Eyes (or Cyclops eye for Cipheron)
    if (charData.id === "cipheron") {
      const cycEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), eyeMat);
      cycEye.position.set(0, 1.63, 0.165);
      bodyGroup.add(cycEye);
    } else {
      const eGeo = new THREE.SphereGeometry(0.028, 10, 10);
      const lEye = new THREE.Mesh(eGeo, eyeMat);
      lEye.position.set(-0.065, 1.63, 0.16);
      const rEye = new THREE.Mesh(eGeo, eyeMat);
      rEye.position.set(0.065, 1.63, 0.16);
      bodyGroup.add(lEye, rEye);
    }

    // Hair Dome & Long Hair / Ponytail
    const hairCapGeo = new THREE.SphereGeometry(0.195, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
    hairCap.position.set(0, 1.64, -0.01);
    bodyGroup.add(hairCap);

    if (!isMale) {
      const backHairGeo = new THREE.ConeGeometry(0.22, 0.65, 16);
      const backHair = new THREE.Mesh(backHairGeo, hairMat);
      backHair.position.set(0, 1.38, -0.12);
      backHair.rotation.x = 0.25;
      bodyGroup.add(backHair);
    }

    // Special Character Signature Props!
    // 1. Magnatere: Calvary Centaur Armored Mount Body
    if (charData.id === "magnatere") {
      const horseGeo = new THREE.BoxGeometry(0.55, 0.55, 1.25);
      const horseMesh = new THREE.Mesh(horseGeo, outfitMat);
      horseMesh.position.set(0, 0.65, -0.35);
      bodyGroup.add(horseMesh);
    }

    // 2. Arisia Grok: Construct Rings floating behind her back
    if (charData.id === "arisia") {
      const cRingGeo = new THREE.TorusGeometry(0.58, 0.03, 12, 48);
      const cRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const cRing = new THREE.Mesh(cRingGeo, cRingMat);
      cRing.position.set(0, 1.35, -0.25);
      bodyGroup.add(cRing);
    }

    // 3. Weapon Props in Right Hand (Swords, Axes, Rifles, Lances)
    if (
      ["yulina", "sharon", "princesa", "ellie", "dejaylah", "magnatere", "zarcseid", "hailey"].includes(
        charData.id
      )
    ) {
      const wepGeo = new THREE.BoxGeometry(0.06, 0.95, 0.12);
      const wepMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.6,
        metalness: 0.9
      });
      const weapon = new THREE.Mesh(wepGeo, wepMat);
      weapon.position.set(torsoTop + 0.16, 1.15, 0.35);
      weapon.rotation.x = Math.PI / 3;
      bodyGroup.add(weapon);
    }

    // CR Power Aura Ring at feet
    const auraColor =
      charData.cr >= 850
        ? 0xf43f5e
        : charData.cr >= 500
        ? 0x38bdf8
        : 0x22c55e;
    const auraGeo = new THREE.RingGeometry(0.45 * scale, 0.62 * scale, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      color: auraColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    const auraRing = new THREE.Mesh(auraGeo, auraMat);
    auraRing.rotation.x = Math.PI / 2;
    auraRing.position.y = 0.03;
    root.add(auraRing);
    root.userData.auraRing = auraRing;

    // Floating Name & CR Banner Sprite
    const tagSprite = this.createTextSprite(
      `${charData.name} (CR ${charData.cr})`,
      charData.outfitColor || "#38bdf8"
    );
    tagSprite.scale.set(4.2, 1.05, 1);
    tagSprite.position.set(0, h + 0.65, 0);
    root.add(tagSprite);

    root.add(bodyGroup);
    return root;
  }

  // ==========================================================================
  // 3. 3D ACTION ARENA ENVIRONMENT & REAL-TIME COMBAT
  // ==========================================================================
  buildArenaEnvironment() {
    // Glowing Hexagonal / Cyber-Planetary Floor
    const floorGeo = new THREE.CylinderGeometry(48, 52, 2, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.6,
      metalness: 0.4
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -1;
    floor.receiveShadow = true;
    this.arenaGroup.add(floor);

    const grid = new THREE.GridHelper(90, 45, 0x38bdf8, 0x1e293b);
    grid.position.y = 0.02;
    this.arenaGroup.add(grid);

    // Energy Dome Boundary
    const domeGeo = new THREE.SphereGeometry(48, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    });
    this.arenaDome = new THREE.Mesh(domeGeo, domeMat);
    this.arenaGroup.add(this.arenaDome);

    // Crystal / Megastructure Pillars around Arena
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const pGeo = new THREE.CylinderGeometry(0.8, 1.6, 12, 6);
      const pMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: i % 2 === 0 ? 0x0284c7 : 0x7e22ce,
        emissiveIntensity: 0.4
      });
      const pillar = new THREE.Mesh(pGeo, pMat);
      pillar.position.set(Math.cos(angle) * 36, 6, Math.sin(angle) * 36);
      this.arenaGroup.add(pillar);
    }
  }

  startArenaBattle(playerChar, enemyChar, planetData) {
    this.setMode("arena");

    // Clear old fighter meshes
    if (this.arenaState.playerMesh) this.arenaGroup.remove(this.arenaState.playerMesh);
    if (this.arenaState.enemyMesh) this.arenaGroup.remove(this.arenaState.enemyMesh);

    this.arenaState.playerChar = playerChar;
    this.arenaState.enemyChar = enemyChar;
    this.arenaState.arenaPlanet = planetData || window.CYCLE12_DATA.planets[0];

    // Tint arena dome to planet theme
    if (this.arenaDome) {
      this.arenaDome.material.color.set(this.arenaState.arenaPlanet.color || "#38bdf8");
    }

    const pMesh = this.createCharacterMesh(playerChar);
    pMesh.position.set(0, 0, 14);
    pMesh.rotation.y = Math.PI;
    this.arenaGroup.add(pMesh);

    const eMesh = this.createCharacterMesh(enemyChar);
    eMesh.position.set(0, 0, -14);
    this.arenaGroup.add(eMesh);

    const pMax = Math.max(500, playerChar.cr * 10);
    const eMax = Math.max(500, enemyChar.cr * 10);

    this.arenaState.playerMesh = pMesh;
    this.arenaState.enemyMesh = eMesh;
    this.arenaState.playerHP = pMax;
    this.arenaState.playerMaxHP = pMax;
    this.arenaState.playerEnergy = 100;
    this.arenaState.enemyHP = eMax;
    this.arenaState.enemyMaxHP = eMax;
    this.arenaState.cooldowns = [0, 0, 0];
    this.arenaState.active = true;

    // Position camera behind player
    this.desiredTarget.set(0, 2.5, 0);
    this.desiredRadius = 26;
    this.camSpherical.theta = 0;
    this.camSpherical.phi = 1.15;

    if (window.updateArenaHUD) window.updateArenaHUD();
  }

  triggerArenaSkill(skillIndex, isPlayer = true) {
    if (!this.arenaState.active) return;
    const attacker = isPlayer ? this.arenaState.playerChar : this.arenaState.enemyChar;
    const attackerMesh = isPlayer ? this.arenaState.playerMesh : this.arenaState.enemyMesh;
    const defender = isPlayer ? this.arenaState.enemyChar : this.arenaState.playerChar;
    const defenderMesh = isPlayer ? this.arenaState.enemyMesh : this.arenaState.playerMesh;

    if (isPlayer && this.arenaState.cooldowns[skillIndex] > 0) return;

    const skillName =
      (attacker.skills && attacker.skills[skillIndex]) ||
      ["Ultra Eye Beam", "Euphoria / Power Burst", "Gotterfall / Extinction Blast"][skillIndex] ||
      "Hyper Strike";

    // Multipliers & cooldowns
    const mult = skillIndex === 0 ? 1.2 : skillIndex === 1 ? 1.85 : 3.1;
    if (isPlayer) {
      this.arenaState.cooldowns[skillIndex] = skillIndex === 0 ? 1.2 : skillIndex === 1 ? 3.5 : 6.5;
    }

    // Calculate Lore-accurate damage
    let rawDmg = (120 + attacker.cr * 1.45) * mult * (0.9 + Math.random() * 0.25);

    // Lore special passive checks!
    let loreNote = "";
    if (attacker.id === "overlord" && skillIndex === 2) {
      rawDmg *= 1.6;
      loreNote = " [Overlord x2 CR Technique!]";
    } else if (attacker.id === "sarah" && skillIndex === 0) {
      rawDmg += 650;
      loreNote = " [Quantum Grenade Pierces Armor!]";
    } else if (attacker.id === "chunliva" && skillIndex === 0) {
      rawDmg += 900;
      loreNote = " [One Shot Kick!]";
    } else if (attacker.id === "parasoid") {
      const drained = Math.min(150, Math.round(rawDmg * 0.25));
      if (isPlayer) {
        this.arenaState.playerHP = Math.min(this.arenaState.playerMaxHP, this.arenaState.playerHP + drained);
      } else {
        this.arenaState.enemyHP = Math.min(this.arenaState.enemyMaxHP, this.arenaState.enemyHP + drained);
      }
      loreNote = ` [Parasoid CR Drain +${drained}!]`;
    } else if (defender.species.includes("Prozonian")) {
      rawDmg *= 0.82; // Prozonian Iron Body & 80% Cursed Reduction
    }

    const dmg = Math.round(rawDmg);

    // Spawn 3D Beam & Explosion VFX between attacker and defender
    const startPos = attackerMesh.position.clone().add(new THREE.Vector3(0, attacker.height * 0.75, 0));
    const endPos = defenderMesh.position.clone().add(new THREE.Vector3(0, defender.height * 0.6, 0));
    const vfxColor =
      skillIndex === 2 ? 0xf43f5e : skillIndex === 1 ? 0xa855f7 : 0x38bdf8;

    this.spawnBeamVFX(startPos, endPos, vfxColor, skillIndex === 2 ? 1.8 : 0.75);

    if (isPlayer) {
      this.arenaState.enemyHP = Math.max(0, this.arenaState.enemyHP - dmg);
    } else {
      this.arenaState.playerHP = Math.max(0, this.arenaState.playerHP - dmg);
    }

    if (window.onArenaCombatLog) {
      window.onArenaCombatLog(
        `${attacker.name} sử dụng [${skillName}] gây ${dmg.toLocaleString()} sát thương lên ${defender.name}!${loreNote}`,
        isPlayer ? "player" : "enemy"
      );
    }

    if (window.updateArenaHUD) window.updateArenaHUD();

    // Check KO
    if (this.arenaState.enemyHP <= 0 || this.arenaState.playerHP <= 0) {
      this.arenaState.active = false;
      const winner = this.arenaState.enemyHP <= 0 ? this.arenaState.playerChar : this.arenaState.enemyChar;
      const loser = this.arenaState.enemyHP <= 0 ? this.arenaState.enemyChar : this.arenaState.playerChar;
      if (window.onArenaBattleEnd) {
        window.onArenaBattleEnd(winner, loser, this.arenaState.enemyHP <= 0);
      }
    }
  }

  spawnBeamVFX(startVec, endVec, colorHex = 0x38bdf8, radius = 0.8) {
    // Laser beam line
    const dist = startVec.distanceTo(endVec);
    const cylGeo = new THREE.CylinderGeometry(radius * 0.25, radius * 0.25, dist, 12);
    cylGeo.translate(0, dist / 2, 0);
    cylGeo.rotateX(Math.PI / 2);
    const cylMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9
    });
    const beam = new THREE.Mesh(cylGeo, cylMat);
    beam.position.copy(startVec);
    beam.lookAt(endVec);
    this.vfxGroup.add(beam);

    // Impact sphere at target
    const blastGeo = new THREE.SphereGeometry(radius * 2.2, 20, 20);
    const blastMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
      wireframe: false
    });
    const blast = new THREE.Mesh(blastGeo, blastMat);
    blast.position.copy(endVec);
    this.vfxGroup.add(blast);

    this.activeVFX.push({ mesh: beam, life: 0.45, maxLife: 0.45, scaleUp: false });
    this.activeVFX.push({ mesh: blast, life: 0.55, maxLife: 0.55, scaleUp: true });
  }

  // Galactic Superweapon VFX (Gotterfall Cannon / Schwarzbruch Bomb)
  fireGalacticSuperweapon(fromPlanetId, toPlanetId, weaponType = "gotterfall") {
    const pFrom = window.CYCLE12_DATA.planets.find((p) => p.id === fromPlanetId);
    const pTo = window.CYCLE12_DATA.planets.find((p) => p.id === toPlanetId);
    if (!pFrom || !pTo) return;

    const startVec = new THREE.Vector3(...pFrom.pos);
    const endVec = new THREE.Vector3(...pTo.pos);
    const color = weaponType === "gotterfall" ? 0x38bdf8 : 0xa855f7;

    this.spawnBeamVFX(startVec, endVec, color, 4.5);
    this.focusOnPoint(endVec.x, endVec.y, endVec.z, 75);
  }

  // ==========================================================================
  // 4. 3D CHARACTER INSPECTOR STAGE (WITH 1.70m HUMAN SCALE HOLOGRAM)
  // ==========================================================================
  buildInspectorStage() {
    const pedGeo = new THREE.CylinderGeometry(3.2, 3.8, 0.4, 48);
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      metalness: 0.7,
      roughness: 0.2
    });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.y = -0.2;
    this.inspectorGroup.add(ped);

    // Height Measurement Ruler Backdrop (0m to 4.0m)
    for (let m = 1; m <= 4; m++) {
      const linePts = [new THREE.Vector3(-2.8, m, -1.5), new THREE.Vector3(2.8, m, -1.5)];
      const lGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const lMat = new THREE.LineBasicMaterial({ color: 0x334155 });
      this.inspectorGroup.add(new THREE.Line(lGeo, lMat));
    }

    // 1.70m Standard Human Reference Wireframe Hologram on the left
    const refGroup = new THREE.Group();
    const refMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.28
    });
    const refBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 1.4, 12), refMat);
    refBody.position.y = 0.7;
    const refHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), refMat);
    refHead.position.y = 1.55;
    refGroup.add(refBody, refHead);
    refGroup.position.set(-1.85, 0, 0);
    this.inspectorGroup.add(refGroup);
  }

  inspectCharacter3D(charData) {
    if (this.currentInspectedMesh) {
      this.inspectorGroup.remove(this.currentInspectedMesh);
    }
    this.currentInspectedMesh = this.createCharacterMesh(charData);
    this.currentInspectedMesh.position.set(0.35, 0, 0);
    this.inspectorGroup.add(this.currentInspectedMesh);

    const h = charData.height || 1.8;
    this.desiredTarget.set(0, h * 0.55, 0);
    this.desiredRadius = Math.max(5.5, h * 2.5);
  }

  // ==========================================================================
  // 5. 3D GENE LAB & BREEDING INCUBATOR CHAMBER
  // ==========================================================================
  buildBreedingChamber() {
    // Rotating Double-Helix DNA & Bioluminescent Incubator Pod in Center
    this.dnaHelixGroup = new THREE.Group();
    const rungCount = 28;
    for (let i = 0; i < rungCount; i++) {
      const y = (i - rungCount / 2) * 0.32;
      const angle = i * 0.42;
      const x1 = Math.cos(angle) * 1.3;
      const z1 = Math.sin(angle) * 1.3;
      const x2 = Math.cos(angle + Math.PI) * 1.3;
      const z2 = Math.sin(angle + Math.PI) * 1.3;

      const s1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xf472b6 })
      );
      s1.position.set(x1, y + 3.2, z1 - 2.5);

      const s2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      s2.position.set(x2, y + 3.2, z2 - 2.5);

      this.dnaHelixGroup.add(s1, s2);
    }
    this.breedingGroup.add(this.dnaHelixGroup);

    // Pedestals for Mother (-2.6), Father (+2.6), and Hybrid Offspring (0)
    [-2.6, 0, 2.6].forEach((xPos, idx) => {
      const pGeo = new THREE.CylinderGeometry(1.1, 1.3, 0.3, 32);
      const pMat = new THREE.MeshStandardMaterial({
        color: idx === 1 ? 0xf472b6 : 0x1e293b,
        emissive: idx === 1 ? 0xdb2777 : 0x0284c7,
        emissiveIntensity: 0.5
      });
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(xPos, -0.15, 0);
      this.breedingGroup.add(p);
    });
  }

  updateBreedingModels(motherChar, fatherChar, offspringChar = null) {
    if (this.motherMesh) this.breedingGroup.remove(this.motherMesh);
    if (this.fatherMesh) this.breedingGroup.remove(this.fatherMesh);
    if (this.offspringMesh) this.breedingGroup.remove(this.offspringMesh);

    if (motherChar) {
      this.motherMesh = this.createCharacterMesh(motherChar);
      this.motherMesh.position.set(-2.6, 0, 0);
      this.motherMesh.rotation.y = 0.35;
      this.breedingGroup.add(this.motherMesh);
    }
    if (fatherChar) {
      this.fatherMesh = this.createCharacterMesh(fatherChar);
      this.fatherMesh.position.set(2.6, 0, 0);
      this.fatherMesh.rotation.y = -0.35;
      this.breedingGroup.add(this.fatherMesh);
    }
    if (offspringChar) {
      this.offspringMesh = this.createCharacterMesh(offspringChar);
      this.offspringMesh.position.set(0, 0.2, 0.8);
      this.breedingGroup.add(this.offspringMesh);
      this.spawnBeamVFX(
        new THREE.Vector3(-2.6, 1.5, 0),
        new THREE.Vector3(0, 1.2, 0.8),
        0xf472b6,
        0.7
      );
      this.spawnBeamVFX(
        new THREE.Vector3(2.6, 1.5, 0),
        new THREE.Vector3(0, 1.2, 0.8),
        0x38bdf8,
        0.7
      );
    }
  }

  // ==========================================================================
  // MODE SWITCHING & CAMERA / INPUT HANDLING
  // ==========================================================================
  setMode(newMode) {
    this.mode = newMode;
    this.galaxyGroup.visible = newMode === "galaxy";
    this.arenaGroup.visible = newMode === "arena";
    this.inspectorGroup.visible = newMode === "inspector";
    this.breedingGroup.visible = newMode === "breeding";

    if (newMode === "galaxy") {
      this.desiredTarget.set(0, 0, 0);
      this.desiredRadius = 175;
      this.camSpherical.phi = 1.05;
    } else if (newMode === "arena") {
      this.desiredTarget.set(0, 2.2, 0);
      this.desiredRadius = 25;
      this.camSpherical.phi = 1.15;
    } else if (newMode === "inspector") {
      this.desiredTarget.set(0, 1.2, 0);
      this.desiredRadius = 6.2;
      this.camSpherical.phi = 1.35;
    } else if (newMode === "breeding") {
      this.desiredTarget.set(0, 1.4, 0);
      this.desiredRadius = 9.5;
      this.camSpherical.theta = 0;
      this.camSpherical.phi = 1.3;
    }
  }

  focusOnPoint(x, y, z, radius = 38) {
    this.desiredTarget.set(x, y, z);
    this.desiredRadius = radius;
  }

  bindEvents() {
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const dom = this.renderer.domElement;

    dom.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.prevMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouse.x;
      const dy = e.clientY - this.prevMouse.y;
      this.prevMouse = { x: e.clientX, y: e.clientY };

      this.camSpherical.theta -= dx * 0.0065;
      this.camSpherical.phi = Math.max(
        0.2,
        Math.min(Math.PI / 2 - 0.02, this.camSpherical.phi - dy * 0.0065)
      );
    });

    dom.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const factor = this.mode === "galaxy" ? 0.12 : 0.012;
        const minR = this.mode === "galaxy" ? 22 : 2.8;
        const maxR = this.mode === "galaxy" ? 360 : 65;
        this.desiredRadius = Math.max(
          minR,
          Math.min(maxR, this.desiredRadius + e.deltaY * factor)
        );
      },
      { passive: false }
    );

    // Click to select planet in Galaxy Mode or attack in Arena Mode
    dom.addEventListener("click", (e) => {
      if (this.mode === "galaxy") {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hits = this.raycaster.intersectObjects(this.planetMeshes);
        if (hits.length > 0) {
          const pData = hits[0].object.userData.planetData;
          if (pData && window.onSelectPlanet) {
            window.onSelectPlanet(pData.id);
          }
        }
      }
    });

    // Keyboard controls for 3D Arena Combat (WASD + Flight + Skills 1/2/3)
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;

      if (this.mode === "arena" && this.arenaState.active) {
        if (k === "1" || k === "q" || k === "j") this.triggerArenaSkill(0, true);
        if (k === "2" || k === "e" || k === "k") this.triggerArenaSkill(1, true);
        if (k === "3" || k === "r" || k === "l") this.triggerArenaSkill(2, true);
        if (k === "f") {
          this.arenaState.autoPilot = !this.arenaState.autoPilot;
          if (window.updateArenaHUD) window.updateArenaHUD();
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  // ==========================================================================
  // MAIN RENDER & SIMULATION LOOP
  // ==========================================================================
  animate() {
    requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());
    const elapsed = this.clock.getElapsedTime();

    // Rotate starfield slowly
    if (this.starField) {
      this.starField.rotation.y = elapsed * 0.012;
    }

    // Mode-specific updates
    if (this.mode === "galaxy") {
      if (this.nadirRiftMesh) {
        this.nadirRiftMesh.rotation.x = elapsed * 0.6;
        this.nadirRiftMesh.rotation.y = elapsed * 0.4;
      }
      this.planetMeshes.forEach((m, i) => {
        m.rotation.y = elapsed * (0.25 + (i % 4) * 0.08);
      });
    } else if (this.mode === "inspector" && this.currentInspectedMesh) {
      this.currentInspectedMesh.rotation.y = Math.sin(elapsed * 0.6) * 0.45;
    } else if (this.mode === "breeding" && this.dnaHelixGroup) {
      this.dnaHelixGroup.rotation.y = elapsed * 0.85;
      if (this.offspringMesh) {
        this.offspringMesh.rotation.y = elapsed * 1.1;
      }
    } else if (this.mode === "arena") {
      this.updateArenaLoop(dt, elapsed);
    }

    // Update active VFX beams & explosions
    for (let i = this.activeVFX.length - 1; i >= 0; i--) {
      const v = this.activeVFX[i];
      v.life -= dt;
      if (v.life <= 0) {
        this.vfxGroup.remove(v.mesh);
        this.activeVFX.splice(i, 1);
      } else {
        const ratio = v.life / v.maxLife;
        v.mesh.material.opacity = ratio;
        if (v.scaleUp) {
          const s = 1 + (1 - ratio) * 2.2;
          v.mesh.scale.set(s, s, s);
        }
      }
    }

    // Smooth camera interpolation
    this.camTarget.lerp(this.desiredTarget, 0.08);
    this.camSpherical.radius += (this.desiredRadius - this.camSpherical.radius) * 0.08;

    const r = this.camSpherical.radius;
    const phi = this.camSpherical.phi;
    const theta = this.camSpherical.theta;

    this.camera.position.x = this.camTarget.x + r * Math.sin(phi) * Math.sin(theta);
    this.camera.position.y = this.camTarget.y + r * Math.cos(phi);
    this.camera.position.z = this.camTarget.z + r * Math.sin(phi) * Math.cos(theta);
    this.camera.lookAt(this.camTarget);

    this.renderer.render(this.scene, this.camera);
  }

  updateArenaLoop(dt, elapsed) {
    const st = this.arenaState;
    if (!st.playerMesh || !st.enemyMesh) return;

    // Cooldowns tick
    for (let i = 0; i < 3; i++) {
      if (st.cooldowns[i] > 0) {
        st.cooldowns[i] = Math.max(0, st.cooldowns[i] - dt);
      }
    }

    if (!st.active) return;

    const pMesh = st.playerMesh;
    const eMesh = st.enemyMesh;
    const speed = 16 * dt;

    // Player movement (WASD + Space/Shift for 3D Flight)
    if (this.keys["w"] || this.keys["arrowup"]) pMesh.position.z -= speed;
    if (this.keys["s"] || this.keys["arrowdown"]) pMesh.position.z += speed;
    if (this.keys["a"] || this.keys["arrowleft"]) pMesh.position.x -= speed;
    if (this.keys["d"] || this.keys["arrowright"]) pMesh.position.x += speed;
    if (this.keys[" "]) pMesh.position.y = Math.min(18, pMesh.position.y + speed);
    if (this.keys["shift"]) pMesh.position.y = Math.max(0, pMesh.position.y - speed);

    // Clamp to Arena radius
    const pLen = Math.hypot(pMesh.position.x, pMesh.position.z);
    if (pLen > 42) {
      pMesh.position.x *= 42 / pLen;
      pMesh.position.z *= 42 / pLen;
    }

    // Auto-pilot option for player
    if (st.autoPilot) {
      const dir = eMesh.position.clone().sub(pMesh.position);
      if (dir.length() > 8) {
        dir.normalize();
        pMesh.position.addScaledVector(dir, speed * 0.75);
      }
      pMesh.position.y = 1.5 + Math.sin(elapsed * 2.5) * 1.2;
      if (st.cooldowns[2] <= 0) this.triggerArenaSkill(2, true);
      else if (st.cooldowns[1] <= 0) this.triggerArenaSkill(1, true);
      else if (st.cooldowns[0] <= 0) this.triggerArenaSkill(0, true);
    }

    // Face each other
    pMesh.lookAt(eMesh.position.x, pMesh.position.y, eMesh.position.z);
    eMesh.lookAt(pMesh.position.x, eMesh.position.y, pMesh.position.z);

    // Enemy AI movement & attacks
    const toPlayer = pMesh.position.clone().sub(eMesh.position);
    const dist = toPlayer.length();
    if (dist > 7.5) {
      toPlayer.normalize();
      eMesh.position.addScaledVector(toPlayer, speed * 0.65);
    } else {
      // Strafe around player
      eMesh.position.x += Math.cos(elapsed * 2) * speed * 0.5;
      eMesh.position.z += Math.sin(elapsed * 2) * speed * 0.5;
    }
    eMesh.position.y = Math.max(0, 1.2 + Math.sin(elapsed * 3.1) * 1.1);

    st.enemyAIWait -= dt;
    if (st.enemyAIWait <= 0) {
      const rSkill = Math.random() < 0.5 ? 0 : Math.random() < 0.75 ? 1 : 2;
      this.triggerArenaSkill(rSkill, false);
      st.enemyAIWait = 1.65 + Math.random() * 1.2;
    }

    // Camera tracks midpoint between fighters
    this.desiredTarget.lerpVectors(pMesh.position, eMesh.position, 0.45);
    this.desiredTarget.y += 1.8;
  }
}

window.Cycle12Engine3D = Cycle12Engine3D;
