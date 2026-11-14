// ============================================================================
// CYCLE 12: STATE & GAME LOGIC (v3 — Full Interactive Novel + Strategy + Save Slots)
// ============================================================================

import { FACTIONS, PLAYABLE, SUPERWEAPONS, EVENT_POOL } from "../data/lore.js";
import { SECTORS, SECTOR_BY_ID } from "../data/galaxy.js";
import { CHARACTERS, CHAR_BY_ID } from "../data/characters.js";
import { buildFactionDeck, validateDeckForLeader } from "../data/cards.js";

const SAVE_PREFIX = "CYCLE12_SAVE_V3_";

export const ACHIEVEMENTS = [
  { id: "first_blood",   title: "Chiến Thần Sàn Bài",      name: "Chiến Thần Sàn Bài",      desc: "Giành chiến thắng đầu tiên trong Chế Độ Đấu Thẻ Bài.",         rewardCr: 450,  rewardInf: 30,  check: (g) => (g.stats?.battlesWon || 0) >= 1 },
  { id: "gladiator_5",   title: "Bá Chủ Bộ Bài",           name: "Bá Chủ Bộ Bài",           desc: "Thắng 5 trận Đấu Thẻ Bài chiến thuật.",                       rewardCr: 1200, rewardInf: 80,  check: (g) => (g.stats?.battlesWon || 0) >= 5 },
  { id: "void_walker",   title: "Chinh Phục Tháp Hư Không", name: "Chinh Phục Tháp Hư Không", desc: "Vượt qua Tầng 3 trong chế độ sinh tồn Tháp Hư Không.",         rewardCr: 1500, rewardInf: 110, check: (g) => (g.stats?.gauntletMax || 0) >= 3 },
  { id: "first_hybrid",  title: "Kiến Tạo Huyết Thống",    name: "Kiến Tạo Huyết Thống",    desc: "Lai tạo thành công hậu duệ Hybrid đầu tiên trong Phòng Lab.",   rewardCr: 750,  rewardInf: 55,  check: (g) => (g.stats?.hybridsCreated || 0) >= 1 },
  { id: "gene_architect",title: "Bậc Thầy Di Truyền",     name: "Bậc Thầy Di Truyền",     desc: "Sở hữu ít nhất 3 hậu duệ Lai Tạo trong kho gia phả.",          rewardCr: 1800, rewardInf: 140, check: (g) => (g.hybrids?.length || 0) >= 3 },
  { id: "lore_seeker",   title: "Người Xem Sử Thi",         name: "Người Xem Sử Thi",         desc: "Hoàn tất Cutscene Lịch Sử Vũ Trụ Gaiastra.",                  rewardCr: 400,  rewardInf: 45,  check: (g) => (g.stats?.cutscenesWatched || 0) >= 1 },
  { id: "gotterfall_fire",title:"Cơn Thịnh Nộ Vì Sao",     name: "Cơn Thịnh Nộ Vì Sao",     desc: "Khai hỏa một Siêu vũ khí chiến lược cấp hành tinh.",          rewardCr: 600,  rewardInf: 50,  check: (g) => (g.stats?.superweaponsFired || 0) >= 1 },
  { id: "shadow_intel",  title: "Tai Mắt Bóng Đêm",        name: "Tai Mắt Bóng Đêm",        desc: "Thực hiện 2 chiến dịch Tình báo & Phá hoại thành công.",       rewardCr: 450,  rewardInf: 60,  check: (g) => (g.stats?.reconOps || 0) >= 2 },
  { id: "social_bonds",  title: "Tri Kỷ Gaiastra",         name: "Tri Kỷ Gaiastra",         desc: "Đạt Độ tin cậy >= 50 với ít nhất 3 nhân vật.",                rewardCr: 650,  rewardInf: 90,  check: (g) => Object.values(g.vn?.affinity || {}).filter(v => v >= 50).length >= 3 },
  { id: "story_half",    title: "Biên Niên Sử Giữa Kỷ",    name: "Biên Niên Sử Giữa Kỷ",    desc: "Hoàn thành ít nhất 5 chương Cốt truyện Tương tác.",           rewardCr: 900,  rewardInf: 100, check: (g) => (g.vn?.completedChapters?.length || 0) >= 5 },
  { id: "story_master",  title: "Huyền Thoại Cycle 12",    name: "Huyền Thoại Cycle 12",    desc: "Hoàn thành trọn vẹn toàn bộ 11 chương (Khởi Nguyên + I–X)!",  rewardCr: 3000, rewardInf: 300, check: (g) => (g.vn?.completedChapters?.length || 0) >= 11 },
  { id: "hegemon",       title: "Thống Lĩnh Thiên Hà",     name: "Thống Lĩnh Thiên Hà",     desc: "Kiểm soát từ 75% lãnh thổ Gaiastra trở lên.",                 rewardCr: 2200, rewardInf: 220, check: (g) => g.getFactionTerritoryPct(g.playerFaction) >= 75 }
];

export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.cycleMajor = 12;
    this.cycleMinor = 1;
    this.protagonistId = "arisia";
    this.starterPicked = false;
    this.playerFaction = "sylvarian";
    this.tension = 45;

    this.pact = {
      active: true,
      turnsRemaining: 10,
      brokenBy: null
    };

    this.resources = {
      sylvarian:     { credits: 125000, influence: 520, research: 340, tributes: 40.0 },
      eris:          { credits: 98000,  influence: 850, research: 990, tributes: 0.0 },
      nadirius:      { credits: 64000,  influence: 410, research: 280, tributes: 12.0 },
      western_nadir: { credits: 72000,  influence: 330, research: 190, tributes: 85.0 },
      salvic:        { credits: 55000,  influence: 490, research: 360, tributes: 5.0 },
      tamarite:      { credits: 92000,  influence: 600, research: 880, tributes: 20.0 },
      collectors:    { credits: 84000,  influence: 460, research: 640, tributes: 15.0 },
      independent:   { credits: 48000,  influence: 450, research: 410, tributes: 0.0 }
    };

    this.hybrids = [];
    this.customDeck = buildFactionDeck(this.protagonistId, this.hybrids);

    this.sectors = {};
    for (const s of SECTORS) {
      this.sectors[s.id] = {
        owner: s.owner,
        defense: s.defense || 50,
        maxDefense: Math.max(100, (s.defense || 50) + 30),
        stability: s.stability || 80,
        frozenTurns: 0,
        garrison: []
      };
    }

    for (const c of CHARACTERS) {
      const secId = this.resolveSectorForChar(c);
      if (secId && this.sectors[secId]) {
        this.sectors[secId].garrison.push(c.id);
      }
    }

    this.relations = {
      "sylvarian:eris": 10,
      "sylvarian:nadirius": -45,
      "sylvarian:western_nadir": 35,
      "sylvarian:salvic": -30,
      "eris:nadirius": 5,
      "eris:western_nadir": -20,
      "eris:salvic": 20,
      "nadirius:western_nadir": -85,
      "nadirius:salvic": 30,
      "western_nadir:salvic": -70
    };

    this.superweaponCooldowns = {
      gotterfall: 0,
      schwarzbruch: 0,
      chaos_lock: 0,
      rachnitere: 0,
      infestation_gate: 0,
      predita_veterans: 0
    };

    // Visual Novel & RPG State
    this.vn = {
      currentChapterId: "ch0_origin",
      currentNodeId: "start",
      completedChapters: [],
      flags: {},
      affinity: {
        arisia: 25,
        ojamon: 20,
        emma: 15,
        magnatere: 10,
        zarcseid: 20,
        felicia: 25,
        meralina: 15,
        ovalina: 10
      },
      history: [], // { kind, speaker, text, chapter, cycle }
      aiMemory: [] // Long-term plot & AI story continuity beats
    };

    this.stats = {
      battlesWon: 0,
      superweaponsFired: 0,
      reconOps: 0,
      hybridsCreated: 0,
      gauntletMax: 0,
      cutscenesWatched: 0
    };
    this.unlockedAchievements = [];

    this.eventLog = [];
    this.logInitialState();
  }

  resolveSectorForChar(c) {
    if (SECTOR_BY_ID[c.loc]) return c.loc;
    for (const s of SECTORS) {
      if ((s.places || []).some(p => p.id === c.loc)) return s.id;
      for (const b of (s.bodies || [])) {
        if (b.id === c.loc) return s.id;
        if ((b.places || []).some(p => p.id === c.loc)) return s.id;
        for (const m of (b.moons || [])) {
          if (m.id === c.loc) return s.id;
          if ((m.places || []).some(p => p.id === c.loc)) return s.id;
        }
      }
    }
    return null;
  }

  logInitialState() {
    this.eventLog.push({
      turn: `Cycle ${this.cycleMajor}.${this.cycleMinor}`,
      type: "pact",
      title: "Hiệp ước Cursew Pact đang có hiệu lực",
      desc: "Nữ hoàng Arisia Grok và Overlord duy trì lệnh ngừng bắn tạm thời. Magnatere và Salvic Union bày tỏ phẫn nộ sâu sắc."
    });
  }

  // --- QUERY HELPERS ---
  ownerOf(secId) {
    return this.sectors[secId] ? this.sectors[secId].owner : null;
  }

  sectorName(secId) {
    return SECTOR_BY_ID[secId] ? SECTOR_BY_ID[secId].name : secId;
  }

  facName(facId) {
    return FACTIONS[facId] ? FACTIONS[facId].name : (facId || "Trung lập");
  }

  getChampionForFaction(facId) {
    if (facId === this.playerFaction && this.protagonistId) return this.protagonistId;
    const defaults = {
      sylvarian: "arisia",
      eris: "emma",
      nadirius: "magnatere",
      western_nadir: "overlord",
      salvic: "zarcseid",
      tamarite: "ovalina",
      collectors: "mrmind",
      independent: "felicia"
    };
    return defaults[facId] || "arisia";
  }

  getProtagonist() {
    if (CHAR_BY_ID[this.protagonistId]) return CHAR_BY_ID[this.protagonistId];
    const hy = (this.hybrids || []).find((h) => h.id === this.protagonistId);
    if (hy) {
      return {
        id: hy.id,
        name: hy.name,
        title: "Hậu Duệ Chủ Tướng Hybrid",
        fac: hy.fac || this.playerFaction,
        species: hy.species,
        race: hy.race,
        cr: hy.cr,
        loc: "sylvalon",
        isHybrid: true
      };
    }
    return CHAR_BY_ID.arisia;
  }

  selectProtagonist(charId, restartStory = false) {
    const ch = CHAR_BY_ID[charId];
    const hy = (this.hybrids || []).find((h) => h.id === charId);
    const subj = ch || hy;
    if (!subj) return false;

    this.protagonistId = subj.id;
    this.starterPicked = true;
    this.playerFaction = subj.fac && FACTIONS[subj.fac] ? subj.fac : "independent";
    if (!this.resources[this.playerFaction]) {
      this.resources[this.playerFaction] = { credits: 50000, influence: 400, research: 350, tributes: 0 };
    }
    this.customDeck = buildFactionDeck(subj.id, this.hybrids);

    if (restartStory) {
      this.vn.currentChapterId = "ch0_origin";
      this.vn.currentNodeId = "start";
    }
    this.addChronicle(`⭐ ${subj.name} (${this.facName(this.playerFaction)}) trở thành Nhân Vật Chính dẫn dắt Cycle ${this.cycleMajor}.${this.cycleMinor}.`);
    this.saveToSlot("auto");
    return true;
  }

  addChronicle(desc, title = "Biên Niên Sử", type = "lore") {
    this.eventLog.unshift({
      turn: `Cycle ${this.cycleMajor}.${this.cycleMinor}`,
      type,
      title,
      desc
    });
    if (this.eventLog.length > 60) this.eventLog.length = 60;
  }

  recordGauntletFloor(floor) {
    if (!this.stats) this.stats = {};
    this.stats.gauntletMax = Math.max(this.stats.gauntletMax || 0, floor);
    this.saveToSlot("auto");
  }

  recordCutsceneWatched() {
    if (!this.stats) this.stats = {};
    this.stats.cutscenesWatched = (this.stats.cutscenesWatched || 0) + 1;
    this.saveToSlot("auto");
  }

  getFactionTerritoryPct(facId) {
    let total = 0;
    let owned = 0;
    for (const s of SECTORS) {
      if (!s.weight) continue;
      total += s.weight;
      if (this.ownerOf(s.id) === facId) owned += s.weight;
    }
    if (total === 0) return 0;
    return Math.round((owned / total) * 100);
  }

  // --- VN FLAGS & AFFINITY ---
  setFlag(k, v = true) {
    this.vn.flags[k] = v;
  }
  getFlag(k) {
    return this.vn.flags[k];
  }
  getAffinity(charId) {
    return this.vn.affinity[charId] ?? 10;
  }
  addAffinity(charId, delta) {
    const cur = this.getAffinity(charId);
    this.vn.affinity[charId] = Math.max(0, Math.min(100, cur + delta));
  }

  // --- RELATIONS & RESOURCES ---
  getRelation(facA, facB) {
    if (facA === facB) return 100;
    return this.relations[`${facA}:${facB}`] ?? this.relations[`${facB}:${facA}`] ?? 0;
  }

  addRelation(facA, facB, delta) {
    if (facA === facB) return;
    const k1 = `${facA}:${facB}`;
    const k2 = `${facB}:${facA}`;
    const key = this.relations[k1] !== undefined ? k1 : (this.relations[k2] !== undefined ? k2 : k1);
    this.relations[key] = Math.max(-100, Math.min(100, (this.relations[key] || 0) + delta));
  }

  addRes(facId, type, amount) {
    if (this.resources[facId] && this.resources[facId][type] !== undefined) {
      this.resources[facId][type] = Math.max(0, this.resources[facId][type] + amount);
    }
  }

  addDefense(secId, delta) {
    if (this.sectors[secId]) {
      const cap = this.sectors[secId].maxDefense || 150;
      this.sectors[secId].defense = Math.max(0, Math.min(cap, this.sectors[secId].defense + delta));
    }
  }

  addStability(secId, delta) {
    if (this.sectors[secId]) {
      this.sectors[secId].stability = Math.max(0, Math.min(100, this.sectors[secId].stability + delta));
    }
  }

  addTension(delta) {
    this.tension = Math.max(0, Math.min(100, this.tension + delta));
  }

  randomBorderSector() {
    const list = ["western_march", "nadirius_march", "prussireich", "predita", "orthodox"];
    return list[Math.floor(Math.random() * list.length)];
  }

  // --- DIPLOMACY & SECTOR MANAGEMENT ACTIONS ---
  improveRelation(targetFac) {
    if (targetFac === this.playerFaction) return { ok: false, msg: "Không thể tự ngoại giao với chính mình." };
    const cost = 40;
    if ((this.resources[this.playerFaction]?.influence || 0) < cost) {
      return { ok: false, msg: `Cần ${cost} Ảnh hưởng để cử sứ giả ngoại giao.` };
    }
    this.addRes(this.playerFaction, "influence", -cost);
    this.addRelation(this.playerFaction, targetFac, 14);
    this.addTension(-3);
    const msg = `Phái sứ giả tới ${this.facName(targetFac)}: Quan hệ +14, Căng thẳng -3.`;
    this.eventLog.unshift({ turn: `Cycle ${this.cycleMajor}.${this.cycleMinor}`, type: "diplomacy", title: "Ngoại Giao Thành Công", desc: msg });
    return { ok: true, msg };
  }

  denounceFaction(targetFac) {
    if (targetFac === this.playerFaction) return { ok: false, msg: "Không hợp lệ." };
    const cost = 25;
    if ((this.resources[this.playerFaction]?.influence || 0) < cost) {
      return { ok: false, msg: `Cần ${cost} Ảnh hưởng.` };
    }
    this.addRes(this.playerFaction, "influence", -cost);
    this.addRelation(this.playerFaction, targetFac, -20);
    this.addTension(6);
    const msg = `${this.facName(this.playerFaction)} công khai lên án ${this.facName(targetFac)}! Quan hệ -20, Căng thẳng +6.`;
    this.eventLog.unshift({ turn: `Cycle ${this.cycleMajor}.${this.cycleMinor}`, type: "war", title: "Cảnh Báo Ngoại Giao", desc: msg });
    return { ok: true, msg };
  }

  toggleCursewPact() {
    const turnStr = `Cycle ${this.cycleMajor}.${this.cycleMinor}`;
    if (this.pact.active) {
      this.pact.active = false;
      this.pact.brokenBy = this.playerFaction;
      this.addRelation("sylvarian", "western_nadir", -50);
      this.addRelation("nadirius", this.playerFaction, 20);
      this.addRelation("salvic", this.playerFaction, 15);
      this.addTension(20);
      const msg = `${this.facName(this.playerFaction)} tuyên bố xé bỏ Hiệp ước Cursew Pact! Căng thẳng +20.`;
      this.eventLog.unshift({ turn: turnStr, type: "war", title: "Hiệp Ước Cursew Bị Xé Bỏ!", desc: msg });
      return { ok: true, msg };
    } else {
      const cost = 120;
      if ((this.resources[this.playerFaction]?.influence || 0) < cost) {
        return { ok: false, msg: `Cần ${cost} Ảnh hưởng để tái đàm phán Hiệp ước ngừng bắn.` };
      }
      this.addRes(this.playerFaction, "influence", -cost);
      this.pact.active = true;
      this.pact.turnsRemaining = 8;
      this.pact.brokenBy = null;
      this.addRelation("sylvarian", "western_nadir", 30);
      this.addTension(-15);
      const msg = `Hiệp ước Cursew được tái lập trong 8 chu kỳ! Căng thẳng -15.`;
      this.eventLog.unshift({ turn: turnStr, type: "pact", title: "Tái Lập Hiệp Ước Cursew", desc: msg });
      return { ok: true, msg };
    }
  }

  fortifySector(secId) {
    const sec = this.sectors[secId];
    const sData = SECTOR_BY_ID[secId];
    if (!sec || !sData) return { ok: false, msg: "Không tìm thấy phân khu." };
    if (sec.owner !== this.playerFaction) return { ok: false, msg: "Chỉ gia cố được phân khu do phe bạn kiểm soát." };
    const cost = 450;
    if ((this.resources[this.playerFaction]?.credits || 0) < cost) {
      return { ok: false, msg: `Cần ${cost} Tín dụng để nâng cấp phòng tuyến.` };
    }
    this.addRes(this.playerFaction, "credits", -cost);
    this.addDefense(secId, 20);
    return { ok: true, msg: `Gia cố ${sData.name}: Phòng thủ +20 (${sec.defense}/${sec.maxDefense}).` };
  }

  stabilizeSector(secId) {
    const sec = this.sectors[secId];
    const sData = SECTOR_BY_ID[secId];
    if (!sec || !sData) return { ok: false, msg: "Không tìm thấy phân khu." };
    if (sec.owner !== this.playerFaction) return { ok: false, msg: "Chỉ ổn định được phân khu do phe bạn kiểm soát." };
    const cost = 35;
    if ((this.resources[this.playerFaction]?.influence || 0) < cost) {
      return { ok: false, msg: `Cần ${cost} Ảnh hưởng để bình ổn dân tâm.` };
    }
    this.addRes(this.playerFaction, "influence", -cost);
    this.addStability(secId, 18);
    return { ok: true, msg: `Bình ổn ${sData.name}: Ổn định +18% (${sec.stability}%).` };
  }

  sabotageSector(secId) {
    const sec = this.sectors[secId];
    const sData = SECTOR_BY_ID[secId];
    if (!sec || !sData) return { ok: false, msg: "Không tìm thấy phân khu." };
    if (sData.neutral || sData.lost) return { ok: false, msg: "Không thể phá hoại vùng trung lập hoặc đã biến mất." };
    if (sec.owner === this.playerFaction) return { ok: false, msg: "Đây là phân khu của phe bạn." };
    const cost = 25;
    if ((this.resources[this.playerFaction]?.influence || 0) < cost) {
      return { ok: false, msg: `Cần ${cost} Ảnh hưởng cho chiến dịch Tình báo & Phá hoại.` };
    }
    this.addRes(this.playerFaction, "influence", -cost);
    this.addDefense(secId, -16);
    this.addStability(secId, -12);
    this.stats.reconOps = (this.stats.reconOps || 0) + 1;
    const msg = `Gián điệp đột nhập ${sData.name}: Phòng thủ giảm còn ${sec.defense}, Ổn định ${sec.stability}%!`;
    this.eventLog.unshift({ turn: `Cycle ${this.cycleMajor}.${this.cycleMinor}`, type: "intel", title: `Chiến dịch Tình báo: ${sData.name}`, desc: msg });
    this.saveToSlot("auto");
    return { ok: true, msg };
  }

  recordBattleWin() {
    this.stats.battlesWon = (this.stats.battlesWon || 0) + 1;
    this.saveToSlot("auto");
  }

  evaluateAchievements() {
    const newlyUnlocked = [];
    for (const ach of ACHIEVEMENTS) {
      if (!this.unlockedAchievements.includes(ach.id) && ach.check(this)) {
        this.unlockedAchievements.push(ach.id);
        this.addRes(this.playerFaction, "credits", ach.rewardCr);
        this.addRes(this.playerFaction, "influence", ach.rewardInf);
        newlyUnlocked.push(ach);
        this.eventLog.unshift({
          turn: `Cycle ${this.cycleMajor}.${this.cycleMinor}`,
          type: "achievement",
          title: `🏅 Thành tựu: ${ach.name}`,
          desc: `${ach.desc} (+${ach.rewardCr} Cr, +${ach.rewardInf} Ảnh hưởng)`
        });
      }
    }
    if (newlyUnlocked.length > 0) this.saveToSlot("auto");
    return newlyUnlocked;
  }

  // --- BƯỚC SANG CHU KỲ MỚI (NEXT TURN) ---
  nextTurn() {
    this.cycleMinor++;
    if (this.cycleMinor > 12) {
      this.cycleMajor++;
      this.cycleMinor = 1;
    }
    const currentTurnStr = `Cycle ${this.cycleMajor}.${this.cycleMinor}`;

    for (const [secId, sState] of Object.entries(this.sectors)) {
      if (sState.frozenTurns > 0) sState.frozenTurns--;
      const sData = SECTOR_BY_ID[secId];
      if (sState.owner && this.resources[sState.owner] && sData && sData.income) {
        const factor = Math.max(0.25, sState.stability / 100);
        this.resources[sState.owner].credits += Math.round((sData.income.credits || 0) * factor);
        this.resources[sState.owner].influence += Math.round((sData.income.influence || 0) * factor);
        this.resources[sState.owner].research += Math.round((sData.income.research || 0) * factor);
      }
      // Tự hồi nhẹ phòng thủ theo chu kỳ
      if (sState.owner && sState.defense < (sData?.defense || 50)) {
        sState.defense = Math.min(sData.defense, sState.defense + 3);
      }
    }

    for (const k of Object.keys(this.superweaponCooldowns)) {
      if (this.superweaponCooldowns[k] > 0) this.superweaponCooldowns[k]--;
    }

    if (this.pact.active) {
      this.pact.turnsRemaining--;
      if (this.pact.turnsRemaining <= 0) {
        this.pact.active = false;
        this.eventLog.unshift({
          turn: currentTurnStr,
          type: "war",
          title: "HIỆP ƯỚC CURSEW PACT ĐÃ HẾT HẠN!",
          desc: "Khoảng lặng tạm thời giữa Sylvarian và Western Nadir chấm dứt! Căng thẳng leo thang vũ bão."
        });
        this.addTension(25);
      }
    }

    // AI Border Skirmishes khi căng thẳng cao hoặc mất pact
    if ((!this.pact.active || this.tension >= 70) && Math.random() < 0.45) {
      const hotId = this.randomBorderSector();
      const sState = this.sectors[hotId];
      if (sState && sState.frozenTurns <= 0) {
        sState.defense = Math.max(10, sState.defense - 10);
        sState.stability = Math.max(20, sState.stability - 8);
        this.eventLog.unshift({
          turn: currentTurnStr,
          type: "skirmish",
          title: `Xung đột biên giới tại ${this.sectorName(hotId)}`,
          desc: `Các đội tàu tuần tra đụng độ ác liệt! Phòng thủ và ổn định của khu vực bị suy giảm.`
        });
      }
    }

    const triggeredEvent = this.rollEvent();
    let eventSummary = null;
    if (triggeredEvent) {
      const outcome = triggeredEvent.run(this);
      eventSummary = {
        title: triggeredEvent.title,
        desc: `${triggeredEvent.text} (${outcome})`
      };
      this.eventLog.unshift({
        turn: currentTurnStr,
        type: "event",
        title: triggeredEvent.title,
        desc: `${triggeredEvent.text} • ${outcome}`
      });
    }

    if (this.eventLog.length > 60) this.eventLog.length = 60;
    this.saveToSlot("auto");

    return { turn: currentTurnStr, event: eventSummary };
  }

  rollEvent() {
    const valid = EVENT_POOL.filter(e => !e.cond || e.cond(this));
    if (valid.length === 0) return null;
    const totalWeight = valid.reduce((acc, cur) => acc + (cur.weight || 1), 0);
    let r = Math.random() * totalWeight;
    for (const ev of valid) {
      r -= (ev.weight || 1);
      if (r <= 0) return ev;
    }
    return valid[0];
  }

  // --- KÍCH HOẠT SIÊU VŨ KHÍ (TẤT CẢ CÁC PHE) ---
  fireSuperweapon(swId, targetSectorId) {
    const sw = SUPERWEAPONS[swId];
    if (!sw) return { ok: false, msg: "Không tìm thấy vũ khí!" };
    if (sw.owner !== this.playerFaction) return { ok: false, msg: "Phe của bạn không sở hữu vũ khí này!" };
    if (this.superweaponCooldowns[swId] > 0) {
      return { ok: false, msg: `${sw.name} đang hồi nạp (${this.superweaponCooldowns[swId]} chu kỳ)!` };
    }
    const cost = sw.cost || 500;
    if ((this.resources[this.playerFaction]?.credits || 0) < cost) {
      return { ok: false, msg: `Không đủ tài nguyên! Cần ${cost} Tín dụng.` };
    }

    const sec = this.sectors[targetSectorId];
    const sData = SECTOR_BY_ID[targetSectorId];
    if (!sec || !sData) return { ok: false, msg: "Mục tiêu không hợp lệ!" };
    if (sData.neutral || sData.lost) return { ok: false, msg: "Không thể tấn công khu vực trung lập hoặc đã biến mất." };

    this.resources[this.playerFaction].credits -= cost;
    this.superweaponCooldowns[swId] = sw.cooldown;
    this.stats.superweaponsFired = (this.stats.superweaponsFired || 0) + 1;
    this.addTension(sw.tension || 10);

    const turnStr = `Cycle ${this.cycleMajor}.${this.cycleMinor}`;
    let resultMsg = "";

    if (swId === "gotterfall") {
      sec.defense = Math.max(0, Math.round(sec.defense * (1 - sw.power)));
      sec.stability = Math.max(10, sec.stability - 30);
      resultMsg = `Pháo Gotterfall oanh kích ${sData.name}! Phòng thủ sụt còn ${sec.defense}.`;
    } else if (swId === "schwarzbruch") {
      sec.defense = 0;
      sec.stability = 10;
      resultMsg = `Bom hố đen Schwarzbruch xóa sổ hoàn toàn phòng thủ ${sData.name}!`;
    } else if (swId === "chaos_lock") {
      sec.frozenTurns = sw.freeze || 2;
      resultMsg = `Eris Union kích hoạt Phong Ấn Chaos tại ${sData.name} trong 2 chu kỳ!`;
    } else if (swId === "predita_veterans") {
      sec.defense = Math.min(150, sec.defense + 45);
      sec.stability = Math.min(100, sec.stability + 15);
      resultMsg = `Cựu binh Predita gia cố ${sData.name}: Phòng thủ +45, Ổn định +15%!`;
    } else if (swId === "rachnitere" || swId === "infestation_gate") {
      sec.defense = Math.max(5, Math.round(sec.defense * 0.6));
      sec.stability = Math.max(15, sec.stability - 25);
      resultMsg = `${sw.name} tàn phá ${sData.name}! Phòng thủ còn ${sec.defense}.`;
    }

    // Hạ quan hệ với chủ sở hữu mục tiêu nếu khác phe
    if (sec.owner && sec.owner !== this.playerFaction && FACTIONS[sec.owner]?.playable) {
      this.addRelation(this.playerFaction, sec.owner, -25);
    }

    this.eventLog.unshift({ turn: turnStr, type: "superweapon", title: `${sw.name} Khai Hỏa!`, desc: resultMsg });
    this.saveToSlot("auto");

    return { ok: true, msg: resultMsg };
  }

  conquerSector(secId, winnerFaction) {
    const sData = SECTOR_BY_ID[secId];
    if (!this.sectors[secId] || !sData) return false;
    if (sData.neutral || sData.lost) return false;
    const oldOwner = this.sectors[secId].owner;
    this.sectors[secId].owner = winnerFaction;
    this.sectors[secId].defense = 35;
    this.sectors[secId].stability = 50;

    if (oldOwner && oldOwner !== winnerFaction && FACTIONS[oldOwner]?.playable) {
      this.addRelation(winnerFaction, oldOwner, -20);
    }
    this.addTension(8);

    this.eventLog.unshift({
      turn: `Cycle ${this.cycleMajor}.${this.cycleMinor}`,
      type: "conquest",
      title: `Chiếm đóng: ${sData.name}`,
      desc: `${this.facName(winnerFaction)} đã kiểm soát khu vực từ tay ${this.facName(oldOwner)}!`
    });
    this.saveToSlot("auto");
    return true;
  }

  recordStoryBeat({ kind = "node", chapterId = "", chapter = "", speaker = "", text = "", choiceLabel = "" } = {}) {
    if (!this.vn) return;
    if (!Array.isArray(this.vn.history)) this.vn.history = [];
    const cleanText = String(text || "").trim();
    const last = this.vn.history[this.vn.history.length - 1];
    if (last && last.kind === kind && last.speaker === speaker && last.text === cleanText && last.choiceLabel === choiceLabel) {
      return;
    }
    this.vn.history.push({
      kind,
      chapterId,
      chapter,
      speaker,
      choiceLabel,
      text: cleanText,
      cycle: `${this.cycleMajor}.${this.cycleMinor}`
    });
    if (this.vn.history.length > 90) {
      this.vn.history = this.vn.history.slice(-90);
    }
  }

  recordAIMemory(note, tag = "") {
    if (!this.vn || !note) return;
    if (!Array.isArray(this.vn.aiMemory)) this.vn.aiMemory = [];
    const clean = String(note).replace(/\s+/g, " ").trim();
    if (!clean) return;
    const prefix = tag ? `[${tag}] ` : `[C${this.cycleMajor}.${this.cycleMinor}] `;
    const line = `${prefix}${clean}`;
    if (this.vn.aiMemory[this.vn.aiMemory.length - 1] === line) return;
    this.vn.aiMemory.push(line);
    if (this.vn.aiMemory.length > 28) {
      this.vn.aiMemory = this.vn.aiMemory.slice(-28);
    }
  }

  // --- SAVE / LOAD MULTI-SLOT ---
  serialize() {
    return JSON.stringify({
      version: 5,
      savedAt: new Date().toLocaleString("vi-VN"),
      cycleMajor: this.cycleMajor,
      cycleMinor: this.cycleMinor,
      protagonistId: this.protagonistId,
      starterPicked: this.starterPicked,
      playerFaction: this.playerFaction,
      tension: this.tension,
      pact: this.pact,
      resources: this.resources,
      sectors: this.sectors,
      relations: this.relations,
      superweaponCooldowns: this.superweaponCooldowns,
      hybrids: this.hybrids,
      customDeck: this.customDeck,
      vn: this.vn,
      stats: this.stats,
      unlockedAchievements: this.unlockedAchievements,
      eventLog: this.eventLog
    });
  }

  saveToSlot(slot = "auto") {
    try {
      localStorage.setItem(SAVE_PREFIX + slot, this.serialize());
      return true;
    } catch {
      return false;
    }
  }

  loadFromSlot(slot = "auto") {
    const raw = localStorage.getItem(SAVE_PREFIX + slot);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      this.cycleMajor = data.cycleMajor ?? 12;
      this.cycleMinor = data.cycleMinor ?? 1;
      this.protagonistId = data.protagonistId ?? "arisia";
      this.starterPicked = Boolean(data.starterPicked);
      this.playerFaction = data.playerFaction ?? "sylvarian";
      this.tension = data.tension ?? 45;
      if (data.pact) this.pact = data.pact;
      if (data.resources) {
        this.resources = {
          tamarite: { credits: 92000, influence: 600, research: 880, tributes: 20.0 },
          collectors: { credits: 84000, influence: 460, research: 640, tributes: 15.0 },
          independent: { credits: 48000, influence: 450, research: 410, tributes: 0.0 },
          ...data.resources
        };
      }
      if (data.sectors) this.sectors = data.sectors;
      if (data.relations) this.relations = data.relations;
      if (data.superweaponCooldowns) this.superweaponCooldowns = data.superweaponCooldowns;
      this.hybrids = Array.isArray(data.hybrids) ? data.hybrids : [];
      const validated = Array.isArray(data.customDeck) && data.customDeck.length > 0
        ? validateDeckForLeader(data.customDeck, this.protagonistId, this.hybrids)
        : [];
      this.customDeck = validated.length >= 6
        ? validated
        : buildFactionDeck(this.protagonistId, this.hybrids);
      if (data.vn) {
        this.vn = {
          currentChapterId: "ch0_origin",
          currentNodeId: "start",
          completedChapters: [],
          flags: {},
          affinity: {},
          history: [],
          aiMemory: [],
          ...data.vn
        };
        if (!Array.isArray(this.vn.history)) this.vn.history = [];
        if (!Array.isArray(this.vn.aiMemory)) this.vn.aiMemory = [];
      }
      this.stats = { battlesWon: 0, superweaponsFired: 0, reconOps: 0, hybridsCreated: 0, gauntletMax: 0, cutscenesWatched: 0, ...(data.stats || {}) };
      if (Array.isArray(data.unlockedAchievements)) this.unlockedAchievements = data.unlockedAchievements;
      if (data.eventLog) this.eventLog = data.eventLog;
      return true;
    } catch (e) {
      console.error("Load failed:", e);
      return false;
    }
  }

  getSlotMeta(slot) {
    const raw = localStorage.getItem(SAVE_PREFIX + slot);
    if (!raw) return null;
    try {
      const d = JSON.parse(raw);
      return {
        savedAt: d.savedAt || "Không rõ",
        turn: `Cycle ${d.cycleMajor}.${d.cycleMinor}`,
        faction: this.facName(d.playerFaction),
        chapters: (d.vn?.completedChapters || []).length
      };
    } catch {
      return null;
    }
  }
}
