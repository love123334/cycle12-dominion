// ============================================================================
// CYCLE 12: STATE & GAME LOGIC (v3 — Full Interactive Novel + Strategy + Save Slots)
// ============================================================================

import { FACTIONS, PLAYABLE, SUPERWEAPONS, EVENT_POOL } from "../data/lore.js";
import { SECTORS, SECTOR_BY_ID } from "../data/galaxy.js";
import { CHARACTERS, CHAR_BY_ID } from "../data/characters.js";
import {
  CARDS,
  CARD_BY_ID,
  resolveCard,
  getFactionCardPool,
  buildFactionDeck,
  validateDeckForLeader,
  getCardPriceInfo,
  CARD_PACKS
} from "../data/cards.js";

const SAVE_PREFIX = "CYCLE12_SAVE_V3_";

export const ACHIEVEMENTS = [
  { id: "first_blood",   title: "Chiến Thần Sàn Bài",      name: "Chiến Thần Sàn Bài",      desc: "Giành chiến thắng đầu tiên trong Chế Độ Đấu Thẻ Bài.",         rewardCr: 450,  rewardInf: 30,  check: (g) => (g.stats?.battlesWon || 0) >= 1 },
  { id: "gladiator_5",   title: "Bá Chủ Bộ Bài",           name: "Bá Chủ Bộ Bài",           desc: "Thắng 5 trận Đấu Thẻ Bài chiến thuật.",                       rewardCr: 1200, rewardInf: 80,  check: (g) => (g.stats?.battlesWon || 0) >= 5 },
  { id: "void_walker",   title: "Chinh Phục Tháp Hư Không", name: "Chinh Phục Tháp Hư Không", desc: "Vượt qua Tầng 3 trong chế độ sinh tồn Tháp Hư Không.",         rewardCr: 1500, rewardInf: 110, check: (g) => (g.stats?.gauntletMax || 0) >= 3 },
  { id: "first_hybrid",  title: "Lai Tạo Thực Chiến",      name: "Lai Tạo Thực Chiến",      desc: "Kích hoạt Hàng 2 sinh Token lên Hàng 1 trong Đấu Thẻ Bài.",       rewardCr: 750,  rewardInf: 55,  check: (g) => (g.stats?.hybridsCreated || 0) >= 1 },
  { id: "gene_architect",title: "Bậc Thầy Huyết Thống",    name: "Bậc Thầy Huyết Thống",    desc: "Sinh ít nhất 3 Token / Hậu Duệ qua Hàng 2 trong Đấu Thẻ Bài.",   rewardCr: 1800, rewardInf: 140, check: (g) => (g.hybrids?.length || 0) >= 3 || (g.stats?.hybridsCreated || 0) >= 3 },
  { id: "lore_seeker",   title: "Người Xem Sử Thi",         name: "Người Xem Sử Thi",         desc: "Hoàn tất Cutscene Lịch Sử Vũ Trụ Gaiastra.",                  rewardCr: 400,  rewardInf: 45,  check: (g) => (g.stats?.cutscenesWatched || 0) >= 1 },
  { id: "gotterfall_fire",title:"Cơn Thịnh Nộ Vì Sao",     name: "Cơn Thịnh Nộ Vì Sao",     desc: "Khai hỏa một Siêu vũ khí chiến lược cấp hành tinh.",          rewardCr: 600,  rewardInf: 50,  check: (g) => (g.stats?.superweaponsFired || 0) >= 1 },
  { id: "shadow_intel",  title: "Tai Mắt Bóng Đêm",        name: "Tai Mắt Bóng Đêm",        desc: "Thực hiện 2 chiến dịch Tình báo & Phá hoại thành công.",       rewardCr: 450,  rewardInf: 60,  check: (g) => (g.stats?.reconOps || 0) >= 2 },
  { id: "social_bonds",  title: "Tri Kỷ Gaiastra",         name: "Tri Kỷ Gaiastra",         desc: "Đạt Độ tin cậy >= 50 với ít nhất 3 nhân vật.",                rewardCr: 650,  rewardInf: 90,  check: (g) => Object.values(g.vn?.affinity || {}).filter(v => v >= 50).length >= 3 },
  { id: "story_half",    title: "Biên Niên Sử Giữa Kỷ",    name: "Biên Niên Sử Giữa Kỷ",    desc: "Hoàn thành ít nhất 5 chương Cốt truyện Tương tác.",           rewardCr: 900,  rewardInf: 100, check: (g) => (g.vn?.completedChapters?.length || 0) >= 5 },
  { id: "story_master",  title: "Huyền Thoại Cycle 12",    name: "Huyền Thoại Cycle 12",    desc: "Hoàn thành từ 11 chương Cốt truyện Sử Thi trở lên!",          rewardCr: 3000, rewardInf: 300, check: (g) => (g.vn?.completedChapters?.length || 0) >= 11 },
  { id: "hegemon",       title: "Thống Lĩnh Thiên Hà",     name: "Thống Lĩnh Thiên Hà",     desc: "Kiểm soát từ 75% lãnh thổ Gaiastra trở lên.",                 rewardCr: 2200, rewardInf: 220, check: (g) => g.getFactionTerritoryPct(g.playerFaction) >= 75 }
];

export const TCG_QUESTS = [
  {
    id: "q_win_1",
    icon: "⚔️",
    title: "Chiến Công Mở Màn",
    desc: "Thắng ít nhất 1 trận Đấu Thẻ Bài 3 Hàng.",
    rewardCredits: 900,
    rewardDust: 50,
    progress: (g) => ({ cur: Math.min(1, g.stats?.battlesWon || 0), max: 1 })
  },
  {
    id: "q_breed_1",
    icon: "🧬",
    title: "Khai Sinh Hậu Duệ Hàng 2",
    desc: "Kích hoạt Lai Tạo Hàng 2 (♂ thắng ♀) sinh Token lên Hàng 1.",
    rewardCredits: 1200,
    rewardDust: 65,
    progress: (g) => ({ cur: Math.min(1, g.stats?.hybridsCreated || 0), max: 1 })
  },
  {
    id: "q_star_1",
    icon: "🌟",
    title: "Thức Tỉnh Tinh Anh ★",
    desc: "Cường hóa ít nhất 1 thẻ bài lên cấp ★ Tinh Anh (Foil Mastery).",
    rewardCredits: 1400,
    rewardDust: 80,
    progress: (g) => ({ cur: Math.min(1, Object.keys(g.cardStars || {}).filter((k) => g.cardStars[k] > 0).length), max: 1 })
  },
  {
    id: "q_draft_1",
    icon: "🎲",
    title: "Chiến Binh Tuyển Chọn (Draft)",
    desc: "Hoàn thành 1 bộ bài Draft 16 lá hoặc thắng 1 trận tại Đấu Trường Draft.",
    rewardCredits: 1600,
    rewardDust: 95,
    progress: (g) => ({ cur: ((g.stats?.draftWins || 0) >= 1 || (g.draftState?.cards?.length || 0) >= 16) ? 1 : 0, max: 1 })
  },
  {
    id: "q_tower_3",
    icon: "🗼",
    title: "Chinh Phục Tháp Hư Không",
    desc: "Vượt qua Tầng 3+ trong chế độ Tháp Hư Không.",
    rewardCredits: 2200,
    rewardDust: 120,
    progress: (g) => ({ cur: Math.min(3, g.stats?.gauntletMax || 0), max: 3 })
  },
  {
    id: "q_story_5",
    icon: "📖",
    title: "Biên Niên Sử Chu Kỳ 12",
    desc: "Hoàn thành ít nhất 3 chương trong 19 Chương Cốt Truyện Sử Thi.",
    rewardCredits: 2000,
    rewardDust: 110,
    progress: (g) => ({ cur: Math.min(3, (g.vn?.completedChapters || []).length), max: 3 })
  }
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
    this.collection = {};
    this.cardStars = {};
    this.claimedQuests = [];
    this.draftState = {
      active: false,
      phase: "idle",
      leaderId: null,
      cards: [],
      currentChoices: [],
      wins: 0,
      losses: 0
    };
    this.cardDust = 260;
    this.decks = [];
    this.activeDeckId = "deck_1";
    this.grantStarterCollectionFor(this.protagonistId);
    this.ensureDecksInitialized();
    this.customDeck = this.getActiveDeck().cards;

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
    this.grantStarterCollectionFor(subj.id);
    const active = this.getActiveDeck();
    if (active) {
      active.leaderId = subj.id;
      active.cards = buildFactionDeck(subj.id, this.hybrids, this.collection);
      this.customDeck = active.cards;
    } else {
      this.ensureDecksInitialized();
    }

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

    // Chinh phục khu vực giúp chiêu mộ ngẫu nhiên 1 tướng đồn trú tại đây hoặc nhận Mảnh Gen
    const garrison = this.sectors[secId].garrison || [];
    const recruitable = garrison.find((cid) => this.getOwnedCount(cid) === 0 && CARD_BY_ID[cid]);
    let spoilMsg = "";
    if (recruitable) {
      this.unlockCard(recruitable, 1);
      spoilMsg = ` • Đã thu phục thẻ ${CARD_BY_ID[recruitable].name}!`;
    } else {
      this.cardDust = (this.cardDust || 0) + 45;
      spoilMsg = " • +45 Mảnh Gen Rèn Thẻ!";
    }

    this.eventLog.unshift({
      turn: `Cycle ${this.cycleMajor}.${this.cycleMinor}`,
      type: "conquest",
      title: `Chiếm đóng: ${sData.name}`,
      desc: `${this.facName(winnerFaction)} đã kiểm soát khu vực từ tay ${this.facName(oldOwner)}!${spoilMsg}`
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

  recordTokenBred(tok) {
    if (!this.stats) this.stats = {};
    this.stats.hybridsCreated = (this.stats.hybridsCreated || 0) + 1;
    if (tok && tok.cr >= 300) {
      if (!Array.isArray(this.hybrids)) this.hybrids = [];
      const exist = this.hybrids.some((h) => h.name === tok.name && h.fac === tok.fac);
      if (!exist) {
        this.hybrids.push({
          id: `hyb_duel_${this.stats.hybridsCreated}_${Date.now().toString(36)}`,
          name: tok.name,
          fac: tok.fac,
          species: tok.species || "Token Lai",
          race: tok.race || "hybrid",
          gender: tok.gender || "Female",
          cr: tok.cr,
          h: tok.h || 1.85,
          auraA: tok.auraA || "#38bdf8",
          auraB: tok.auraB || "#f472b6",
          mutated: Boolean(tok.mutated),
          parentsLabel: tok.parentsLabel || "Hàng 2 Đấu Thẻ Bài",
          createdCycle: `${this.cycleMajor}.${this.cycleMinor}`,
          signatureSkill: tok.row1Effect?.tag || "Huyết Thống Thực Chiến"
        });
        if (this.hybrids.length > 24) this.hybrids.shift();
      }
    }
    this.saveToSlot("auto");
  }

  // --- CARD COLLECTION, SHOP, PACKS, CRAFT & MULTI-DECK SYSTEM (v10) ---
  getOwnedCount(cardId) {
    if (!cardId) return 0;
    if ((this.hybrids || []).some((h) => h.id === cardId)) return 1;
    return this.collection?.[cardId] || 0;
  }

  getMaxCopies(card) {
    if (!card) return 1;
    return card.unique || card.isHybrid ? 1 : 3;
  }

  unlockCard(cardId, delta = 1) {
    if (!this.collection) this.collection = {};
    const card = resolveCard(cardId, this.hybrids);
    if (!card) return { ok: false, added: 0, overflowDust: 0, count: 0 };
    const maxCap = this.getMaxCopies(card);
    const cur = this.collection[cardId] || 0;
    const room = Math.max(0, maxCap - cur);
    const added = Math.min(delta, room);
    const overflow = Math.max(0, delta - added);
    this.collection[cardId] = cur + added;
    let overflowDust = 0;
    if (overflow > 0) {
      const price = getCardPriceInfo(card);
      overflowDust = price.dustYield * overflow;
      this.cardDust = (this.cardDust || 0) + overflowDust;
    }
    return { ok: true, added, overflowDust, count: this.collection[cardId] };
  }

  grantStarterCollectionFor(leaderId = "arisia") {
    if (!this.collection) this.collection = {};
    const leader = resolveCard(leaderId, this.hybrids) || CARD_BY_ID.arisia;
    const fac = leader.fac || "sylvarian";
    this.collection[leader.id] = Math.max(1, this.collection[leader.id] || 0);

    const pool = getFactionCardPool(fac, this.hybrids).filter((c) => c.id !== leader.id);
    // Grant x2-x3 starter reserve troops so every faction always has 16+ legal deck cards
    const troops = pool.filter((c) => !c.unique);
    const smallFaction = pool.length <= 12;
    for (const t of troops) {
      const targetQty = smallFaction ? 3 : 2;
      this.collection[t.id] = Math.max(this.collection[t.id] || 0, targetQty);
    }

    // Unlock low-to-mid CR starter characters (keep high CR >= 700 Legends/Mythics collectible in Shop/Packs!)
    const starters = pool
      .filter((c) => c.unique && c.cr < 700)
      .sort((a, b) => a.cr - b.cr);
    for (const ch of starters) {
      if (this.getFactionOwnedCapacity(fac, leader.id) >= 16) break;
      this.collection[ch.id] = Math.max(1, this.collection[ch.id] || 0);
    }

    // Guarantee at least 16 legal deck slots for starter leader if pool is tiny
    if (this.getFactionOwnedCapacity(fac, leader.id) < 16) {
      for (const t of troops) {
        this.collection[t.id] = 3;
      }
      const asc = pool.filter((c) => c.unique).sort((a, b) => a.cr - b.cr);
      for (const c of asc) {
        if (this.getFactionOwnedCapacity(fac, leader.id) >= 16) break;
        this.collection[c.id] = 1;
      }
    }
  }

  getFactionOwnedCapacity(facId, excludeId = null) {
    return getFactionCardPool(facId, this.hybrids)
      .filter((c) => c.id !== excludeId)
      .reduce((sum, c) => sum + Math.min(this.getMaxCopies(c), this.getOwnedCount(c.id)), 0);
  }

  ensureDecksInitialized() {
    if (!Array.isArray(this.decks) || this.decks.length === 0) {
      const lid = this.protagonistId || "arisia";
      const lead = resolveCard(lid, this.hybrids) || CARD_BY_ID.arisia;
      this.decks = [{
        id: "deck_1",
        name: `Khởi Nguyên (${lead.name.split(" ")[0]})`,
        leaderId: lead.id,
        cards: buildFactionDeck(lead.id, this.hybrids, this.collection)
      }];
      this.activeDeckId = "deck_1";
    }
    for (const d of this.decks) {
      if (!d.leaderId || !resolveCard(d.leaderId, this.hybrids)) d.leaderId = this.protagonistId || "arisia";
      d.cards = validateDeckForLeader(d.cards || [], d.leaderId, this.hybrids, this.collection);
      if (d.cards.length === 0) {
        d.cards = buildFactionDeck(d.leaderId, this.hybrids, this.collection);
      }
    }
    const active = this.getActiveDeck();
    this.activeDeckId = active.id;
    this.customDeck = active.cards;
    return this.decks;
  }

  getActiveDeck() {
    if (!Array.isArray(this.decks) || this.decks.length === 0) this.ensureDecksInitialized();
    return this.decks.find((d) => d.id === this.activeDeckId) || this.decks[0];
  }

  syncActiveDeckRef() {
    const active = this.getActiveDeck();
    active.cards = validateDeckForLeader(active.cards || [], active.leaderId, this.hybrids, this.collection);
    this.customDeck = active.cards;
    return active;
  }

  createDeck(name = null, leaderId = null, autoFill = true) {
    const lid = leaderId || this.getActiveDeck()?.leaderId || this.protagonistId || "arisia";
    this.grantStarterCollectionFor(lid);
    const lead = resolveCard(lid, this.hybrids) || CARD_BY_ID.arisia;
    const cleanName = String(name || "").trim() || `Bộ Bài #${this.decks.length + 1} (${lead.name.split(" ")[0]})`;
    const newId = `deck_${Date.now().toString(36)}_${this.decks.length + 1}`;
    const cards = autoFill ? buildFactionDeck(lead.id, this.hybrids, this.collection) : [];
    const deck = { id: newId, name: cleanName, leaderId: lead.id, cards };
    this.decks.push(deck);
    this.activeDeckId = newId;
    this.customDeck = deck.cards;
    this.saveToSlot("auto");
    return deck;
  }

  selectActiveDeck(deckId) {
    const target = (this.decks || []).find((d) => d.id === deckId);
    if (!target) return null;
    this.activeDeckId = target.id;
    this.syncActiveDeckRef();
    this.saveToSlot("auto");
    return target;
  }

  setActiveDeckLeader(leaderId) {
    const lead = resolveCard(leaderId, this.hybrids);
    if (!lead || this.getOwnedCount(lead.id) <= 0) {
      return { ok: false, msg: "Bạn chưa sở hữu thẻ Tướng này để đặt làm Thủ Lĩnh Hàng 3!" };
    }
    const active = this.getActiveDeck();
    active.leaderId = lead.id;
    this.grantStarterCollectionFor(lead.id);
    active.cards = buildFactionDeck(lead.id, this.hybrids, this.collection);
    this.customDeck = active.cards;
    this.saveToSlot("auto");
    return { ok: true, deck: active, leader: lead };
  }

  renameActiveDeck(newName) {
    const clean = String(newName || "").trim();
    if (!clean) return { ok: false, msg: "Tên bộ bài không được để trống." };
    const active = this.getActiveDeck();
    active.name = clean.slice(0, 42);
    this.saveToSlot("auto");
    return { ok: true, deck: active };
  }

  deleteActiveDeck() {
    if (!this.decks || this.decks.length <= 1) {
      return { ok: false, msg: "Cần giữ lại ít nhất 1 Bộ Bài chiến đấu!" };
    }
    this.decks = this.decks.filter((d) => d.id !== this.activeDeckId);
    this.activeDeckId = this.decks[0].id;
    this.syncActiveDeckRef();
    this.saveToSlot("auto");
    return { ok: true, deck: this.getActiveDeck() };
  }

  addCardToActiveDeck(cardId) {
    const active = this.getActiveDeck();
    const leader = resolveCard(active.leaderId, this.hybrids) || CARD_BY_ID.arisia;
    const card = resolveCard(cardId, this.hybrids);
    if (!card) return { ok: false, msg: "Không tìm thấy thẻ bài." };
    if (card.id === leader.id) return { ok: false, msg: `${card.name} đang trấn thủ Hàng 3 của Bộ Bài này!` };
    if (card.fac !== leader.fac) {
      return { ok: false, msg: `Luật Phe: Thủ lĩnh ${leader.name} chỉ dùng thẻ thuộc phe ${this.facName(leader.fac)}!` };
    }
    if (active.cards.length >= 16) return { ok: false, msg: "Bộ bài đã đủ tối đa 16 lá — hãy gỡ bớt lá trước khi thêm." };
    const owned = this.getOwnedCount(cardId);
    const inDeck = active.cards.filter((id) => id === cardId).length;
    const maxCap = this.getMaxCopies(card);
    if (owned <= 0) return { ok: false, msg: `Bạn chưa sở hữu ${card.name}! Hãy mua, mở gói hoặc rèn từ Mảnh Gen.` };
    if (inDeck >= maxCap) {
      return { ok: false, msg: maxCap === 1 ? `${card.name} là Nhân Vật Độc Nhất (tối đa 1 lá/bộ).` : "Mỗi đơn vị Dự Bị tối đa 3 bản sao." };
    }
    if (inDeck >= owned) {
      return { ok: false, msg: `Bạn mới sở hữu ${owned} bản ${card.name}. Hãy mua/mở thêm bản sao!` };
    }
    active.cards.push(cardId);
    this.customDeck = active.cards;
    this.saveToSlot("auto");
    return { ok: true, card };
  }

  removeCardFromActiveDeck(idx) {
    const active = this.getActiveDeck();
    if (idx < 0 || idx >= active.cards.length) return false;
    active.cards.splice(idx, 1);
    this.customDeck = active.cards;
    this.saveToSlot("auto");
    return true;
  }

  autoBuildActiveDeck() {
    const active = this.getActiveDeck();
    active.cards = buildFactionDeck(active.leaderId, this.hybrids, this.collection);
    this.customDeck = active.cards;
    this.saveToSlot("auto");
    return active.cards;
  }

  buyCardWithCredits(cardId) {
    const card = resolveCard(cardId, this.hybrids);
    if (!card) return { ok: false, msg: "Thẻ bài không tồn tại." };
    const maxCap = this.getMaxCopies(card);
    const owned = this.getOwnedCount(cardId);
    if (owned >= maxCap) {
      return { ok: false, msg: `Đã sở hữu tối đa (${owned}/${maxCap}) bản ${card.name}!` };
    }
    const price = getCardPriceInfo(card);
    const facRes = this.resources[this.playerFaction] || (this.resources[this.playerFaction] = { credits: 0, influence: 0, research: 0, tributes: 0 });
    if ((facRes.credits || 0) < price.credits) {
      return { ok: false, msg: `Không đủ Credits! Cần ${price.credits.toLocaleString()} Cr (Hiện có: ${(facRes.credits || 0).toLocaleString()}).` };
    }
    facRes.credits -= price.credits;
    const res = this.unlockCard(cardId, 1);
    this.addChronicle(`🛒 Mua thẻ bài ${card.name} (CR ${card.cr}) với giá ${price.credits.toLocaleString()} Credits.`, "Chợ Thẻ Bài", "trade");
    this.saveToSlot("auto");
    return { ok: true, card, cost: price.credits, count: res.count };
  }

  craftCardWithDust(cardId) {
    const card = resolveCard(cardId, this.hybrids);
    if (!card) return { ok: false, msg: "Thẻ bài không tồn tại." };
    const maxCap = this.getMaxCopies(card);
    const owned = this.getOwnedCount(cardId);
    if (owned >= maxCap) return { ok: false, msg: `Đã đủ số lượng tối đa ${card.name}!` };
    const price = getCardPriceInfo(card);
    if ((this.cardDust || 0) < price.dust) {
      return { ok: false, msg: `Thiếu Mảnh Gen! Cần ${price.dust} Mảnh (Hiện có: ${this.cardDust || 0}).` };
    }
    this.cardDust -= price.dust;
    const res = this.unlockCard(cardId, 1);
    this.saveToSlot("auto");
    return { ok: true, card, costDust: price.dust, count: res.count };
  }

  dismantleCard(cardId) {
    const card = resolveCard(cardId, this.hybrids);
    if (!card) return { ok: false, msg: "Không tìm thấy thẻ." };
    const owned = this.getOwnedCount(cardId);
    if (owned <= 0) return { ok: false, msg: "Bạn chưa có bản sao nào để phân giải." };
    if (card.id === this.protagonistId) return { ok: false, msg: "Không thể phân giải Nhân Vật Chính đang chọn." };
    const inAnyDeck = (this.decks || []).some((d) => d.leaderId === card.id || (d.cards || []).filter((id) => id === card.id).length >= owned);
    if (inAnyDeck) {
      return { ok: false, msg: "Thẻ đang được dùng tối đa trong Bộ Bài! Hãy gỡ khỏi Bộ Bài trước hoặc chỉ phân giải bản dư." };
    }
    const yieldDust = getCardPriceInfo(card).dustYield;
    this.collection[cardId] = owned - 1;
    this.cardDust = (this.cardDust || 0) + yieldDust;
    this.saveToSlot("auto");
    return { ok: true, card, dustGained: yieldDust, remaining: this.collection[cardId] };
  }

  recruitCharacterCard(charId) {
    const card = CARD_BY_ID[charId];
    if (!card) return { ok: false, msg: "Không tìm thấy thẻ nhân vật." };
    if (this.getOwnedCount(charId) >= 1) return { ok: false, msg: `Bạn đã sở hữu thẻ ${card.name}!` };
    const aff = this.getAffinity(charId);
    const infCost = aff >= 35 ? 0 : (card.cr >= 750 ? 90 : 45);
    const facRes = this.resources[this.playerFaction] || { credits: 0, influence: 0, research: 0 };
    if (infCost > 0 && (facRes.influence || 0) < infCost) {
      return { ok: false, msg: `Cần Độ tin cậy >= 35 (Miễn phí) hoặc ${infCost} Ảnh Hưởng để chiêu mộ ${card.name}!` };
    }
    if (infCost > 0) facRes.influence -= infCost;
    this.unlockCard(charId, 1);
    this.addChronicle(`🤝 Chiêu mộ thành công thẻ bài ${card.name} (${card.species} • CR ${card.cr}) vào Kho Thẻ!`, "Chiêu Mộ", "diplomacy");
    this.saveToSlot("auto");
    return { ok: true, card, infCost };
  }

  openCardPack(packId, preferredFac = null) {
    const pack = CARD_PACKS.find((p) => p.id === packId);
    if (!pack) return { ok: false, msg: "Gói thẻ không hợp lệ." };
    const facRes = this.resources[this.playerFaction] || (this.resources[this.playerFaction] = { credits: 0, influence: 0, research: 0, tributes: 0 });
    if ((facRes.credits || 0) < pack.costCredits) {
      return { ok: false, msg: `Thiếu Credits! Cần ${pack.costCredits.toLocaleString()} Cr.` };
    }
    if ((facRes.influence || 0) < pack.costInfluence) {
      return { ok: false, msg: `Thiếu Ảnh Hưởng! Cần ${pack.costInfluence} Ảnh hưởng.` };
    }
    if ((facRes.research || 0) < pack.costResearch) {
      return { ok: false, msg: `Thiếu Nghiên Cứu! Cần ${pack.costResearch} Nghiên cứu.` };
    }

    facRes.credits -= pack.costCredits;
    facRes.influence -= pack.costInfluence;
    facRes.research -= pack.costResearch;

    const targetFac = preferredFac || resolveCard(this.getActiveDeck()?.leaderId, this.hybrids)?.fac || this.playerFaction;
    const allCards = [...CARDS];

    const pickFrom = (pool, preferUnowned = true) => {
      const unowned = pool.filter((c) => this.getOwnedCount(c.id) < this.getMaxCopies(c));
      const src = (preferUnowned && unowned.length > 0 && Math.random() < 0.82) ? unowned : pool;
      return src[Math.floor(Math.random() * src.length)] || allCards[0];
    };

    const rewards = [];
    let totalDustGained = 0;

    for (let i = 0; i < pack.count; i++) {
      let pool = allCards;
      if (pack.mode === "faction") {
        pool = allCards.filter((c) => c.fac === targetFac);
      } else if (pack.mode === "gene") {
        pool = allCards.filter((c) => c.row1Effect?.condType || c.row2Effect?.omniWomb || c.row2Effect?.tier === "tamarite" || c.row2Effect?.symbiosisR2Boost || c.row2Effect?.doubleIfTokenBred);
      } else if (pack.mode === "mythic") {
        pool = i === 0 ? allCards.filter((c) => c.cr >= 700 && c.unique) : allCards.filter((c) => c.cr >= 500);
      } else if (pack.mode === "scout") {
        pool = allCards.filter((c) => c.fac === targetFac || c.fac === "independent" || c.fac === "sylvarian" || c.fac === "tamarite");
      }
      if (pool.length === 0) pool = allCards;

      const chosen = pickFrom(pool, true);
      const prev = this.getOwnedCount(chosen.id);
      const res = this.unlockCard(chosen.id, 1);
      totalDustGained += res.overflowDust;
      rewards.push({
        card: chosen,
        isNew: prev === 0 && res.added > 0,
        added: res.added,
        overflowDust: res.overflowDust,
        ownedAfter: res.count
      });
    }

    this.addChronicle(`📦 Mở ${pack.name}: nhận ${rewards.map((r) => r.card.name).join(", ")}${totalDustGained > 0 ? ` (+${totalDustGained} Mảnh Gen)` : ""}.`, "Mở Gói Thẻ", "pack");
    this.saveToSlot("auto");
    return { ok: true, pack, rewards, totalDustGained };
  }

  grantBattleSpoil(enemyLeaderId, bonusChance = 0.45) {
    const enemyFac = resolveCard(enemyLeaderId, this.hybrids)?.fac || "western_nadir";
    const pool = getFactionCardPool(enemyFac, this.hybrids).filter((c) => !c.isHybrid);
    const unowned = pool.filter((c) => this.getOwnedCount(c.id) < this.getMaxCopies(c));
    const playerUnowned = CARDS.filter((c) => c.fac === this.playerFaction && this.getOwnedCount(c.id) < this.getMaxCopies(c));
    const candidates = unowned.length > 0 && Math.random() < 0.65 ? unowned : (playerUnowned.length > 0 ? playerUnowned : unowned);

    if (candidates.length > 0 && Math.random() < bonusChance) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      this.unlockCard(pick.id, 1);
      this.cardDust = (this.cardDust || 0) + 30;
      this.saveToSlot("auto");
      return { card: pick, dust: 30 };
    }
    const dust = 55;
    this.cardDust = (this.cardDust || 0) + dust;
    this.saveToSlot("auto");
    return { card: null, dust };
  }

  // --- v13.0: CARD STAR MASTERY (★1 -> ★★ -> ★★★ FOIL), TCG QUESTS & DRAFT ARENA ---
  getCardStarLevel(cardId) {
    return Math.max(0, Math.min(3, Number(this.cardStars?.[cardId] || 0)));
  }

  getCardStarBonusCR(baseCR, starLevel = 0) {
    const s = Math.max(0, Math.min(3, Number(starLevel || 0)));
    if (s <= 0) return 0;
    const pct = s === 1 ? 0.08 : (s === 2 ? 0.16 : 0.25);
    const minFlat = s === 1 ? 25 : (s === 2 ? 55 : 95);
    return Math.max(minFlat, Math.round((baseCR || 100) * pct));
  }

  getCardStarUpgradeCost(currentStar = 0) {
    if (currentStar <= 0) return 60;
    if (currentStar === 1) return 120;
    if (currentStar === 2) return 220;
    return 0;
  }

  upgradeCardStar(cardId, free = false) {
    const card = resolveCard(cardId, this.hybrids);
    if (!card) return { ok: false, msg: "Không tìm thấy thẻ bài." };
    if (!this.cardStars || typeof this.cardStars !== "object") this.cardStars = {};
    const cur = this.getCardStarLevel(cardId);
    if (cur >= 3) {
      return { ok: false, msg: `${card.name} đã đạt cấp Tinh Anh tối đa (★★★ Vũ Trụ)!` };
    }
    const cost = free ? 0 : this.getCardStarUpgradeCost(cur);
    if (!free && (this.cardDust || 0) < cost) {
      return { ok: false, msg: `Cần ${cost} Mảnh Gen để cường hóa ${card.name} lên ★${cur + 1} (Hiện có ${this.cardDust || 0} Mảnh).` };
    }
    if (!free) this.cardDust -= cost;
    if (this.getOwnedCount(cardId) < 1) {
      this.unlockCard(cardId, 1);
    }
    const nextStar = cur + 1;
    this.cardStars[cardId] = nextStar;
    this.stats.cardsUpgraded = (this.stats.cardsUpgraded || 0) + 1;
    const bonusCR = this.getCardStarBonusCR(card.cr, nextStar);
    this.addChronicle(`🌟 Cường hóa thẻ ${card.name} lên cấp ${"★".repeat(nextStar)} (+${bonusCR} CR & +${nextStar * 3}% tỷ lệ Lai H2)!`, "Cường Hóa Thẻ", "upgrade");
    this.saveToSlot("auto");
    return { ok: true, card, star: nextStar, bonusCR, cost };
  }

  claimTCGQuest(questId) {
    const q = TCG_QUESTS.find((item) => item.id === questId);
    if (!q) return { ok: false, msg: "Nhiệm vụ không tồn tại." };
    if (!Array.isArray(this.claimedQuests)) this.claimedQuests = [];
    if (this.claimedQuests.includes(questId)) {
      return { ok: false, msg: "Bạn đã nhận thưởng nhiệm vụ này rồi!" };
    }
    const prog = q.progress(this);
    if (prog.cur < prog.max) {
      return { ok: false, msg: `Chưa hoàn thành tiến độ (${prog.cur}/${prog.max})!` };
    }
    this.claimedQuests.push(questId);
    this.addRes(this.playerFaction, "credits", q.rewardCredits);
    this.cardDust = (this.cardDust || 0) + q.rewardDust;
    this.addChronicle(`🎁 Hoàn thành nhiệm vụ TCG "${q.title}": +${q.rewardCredits.toLocaleString()} Credits & +${q.rewardDust} Mảnh Gen!`, "Nhiệm Vụ TCG", "reward");
    this.saveToSlot("auto");
    return { ok: true, quest: q };
  }

  rollDraftPool(count = 3, leadersOnly = false) {
    const pool = leadersOnly
      ? CARDS.filter((c) => c.unique && c.cr >= 650)
      : [...CARDS, ...(this.hybrids || [])];
    const picked = [];
    const copy = [...pool];
    while (picked.length < count && copy.length > 0) {
      const idx = Math.floor(Math.random() * copy.length);
      picked.push(copy.splice(idx, 1)[0].id);
    }
    return picked;
  }

  startNewDraftRun() {
    this.draftState = {
      active: true,
      phase: "leader_pick",
      leaderId: null,
      cards: [],
      currentChoices: this.rollDraftPool(3, true),
      wins: 0,
      losses: 0
    };
    this.saveToSlot("auto");
    return this.draftState;
  }

  pickDraftChoice(cardId) {
    if (!this.draftState || !this.draftState.active) return { ok: false, msg: "Chưa khởi tạo lượt Draft." };
    if (!this.draftState.currentChoices.includes(cardId)) return { ok: false, msg: "Lựa chọn không hợp lệ." };
    const card = resolveCard(cardId, this.hybrids);
    if (!card) return { ok: false, msg: "Thẻ bài không hợp lệ." };

    if (this.draftState.phase === "leader_pick") {
      this.draftState.leaderId = cardId;
      this.draftState.phase = "card_pick";
      this.draftState.currentChoices = this.rollDraftPool(3, false);
      this.saveToSlot("auto");
      return { ok: true, picked: card, isLeader: true, draftState: this.draftState };
    }

    if (this.draftState.phase === "card_pick") {
      // Each pick adds 2 copies to complete a 16-card draft deck in 8 quick picks
      this.draftState.cards.push(cardId);
      if (this.draftState.cards.length < 16) {
        this.draftState.cards.push(cardId);
      }
      if (this.draftState.cards.length >= 16) {
        this.draftState.cards = this.draftState.cards.slice(0, 16);
        this.draftState.phase = "ready";
        this.draftState.currentChoices = [];
      } else {
        this.draftState.currentChoices = this.rollDraftPool(3, false);
      }
      this.saveToSlot("auto");
      return { ok: true, picked: card, isLeader: false, draftState: this.draftState };
    }
    return { ok: false, msg: "Bộ bài Draft đã hoàn tất 16/16 lá!" };
  }

  recordDraftMatchResult(didWin) {
    if (!this.draftState || !this.draftState.active) return null;
    if (didWin) {
      this.draftState.wins = (this.draftState.wins || 0) + 1;
      this.stats.draftWins = (this.stats.draftWins || 0) + 1;
    } else {
      this.draftState.losses = (this.draftState.losses || 0) + 1;
    }

    let runEnded = false;
    let grandPrize = null;
    if (this.draftState.wins >= 5 || this.draftState.losses >= 2) {
      runEnded = true;
      const w = this.draftState.wins;
      const prizeCr = 1000 + w * 900;
      const prizeDust = 45 + w * 35;
      this.addRes(this.playerFaction, "credits", prizeCr);
      this.cardDust = (this.cardDust || 0) + prizeDust;
      grandPrize = { wins: w, losses: this.draftState.losses, credits: prizeCr, dust: prizeDust };
      this.addChronicle(`🎲 Kết thúc Đấu Trường Draft (${w} Thắng - ${this.draftState.losses} Thua): nhận +${prizeCr.toLocaleString()} Credits & +${prizeDust} Mảnh Gen!`, "Đấu Trường Draft", "draft");
      this.draftState.active = false;
      this.draftState.phase = "idle";
    }
    this.saveToSlot("auto");
    return { runEnded, grandPrize, draftState: this.draftState };
  }

  // --- SAVE / LOAD MULTI-SLOT ---
  serialize() {
    return JSON.stringify({
      version: 6,
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
      collection: this.collection,
      cardStars: this.cardStars,
      claimedQuests: this.claimedQuests,
      draftState: this.draftState,
      cardDust: this.cardDust,
      decks: this.decks,
      activeDeckId: this.activeDeckId,
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
      this.collection = (data.collection && typeof data.collection === "object") ? { ...data.collection } : {};
      this.cardStars = (data.cardStars && typeof data.cardStars === "object") ? { ...data.cardStars } : {};
      this.claimedQuests = Array.isArray(data.claimedQuests) ? [...data.claimedQuests] : [];
      this.draftState = (data.draftState && typeof data.draftState === "object")
        ? { active: false, phase: "idle", leaderId: null, cards: [], currentChoices: [], wins: 0, losses: 0, ...data.draftState }
        : { active: false, phase: "idle", leaderId: null, cards: [], currentChoices: [], wins: 0, losses: 0 };
      this.cardDust = typeof data.cardDust === "number" ? data.cardDust : 260;

      // Migrate or restore collection & multi-deck store cleanly
      this.grantStarterCollectionFor(this.protagonistId);
      if (Array.isArray(data.customDeck)) {
        for (const cid of data.customDeck) {
          if (resolveCard(cid, this.hybrids) && (this.collection[cid] || 0) < 1) {
            this.unlockCard(cid, 1);
          }
        }
      }

      if (Array.isArray(data.decks) && data.decks.length > 0) {
        this.decks = data.decks.map((d) => ({
          id: d.id || `deck_${Math.random().toString(36).slice(2, 7)}`,
          name: d.name || "Bộ Bài Tùy Chỉnh",
          leaderId: d.leaderId || this.protagonistId,
          cards: Array.isArray(d.cards) ? [...d.cards] : []
        }));
        for (const d of this.decks) {
          for (const cid of d.cards) {
            if (resolveCard(cid, this.hybrids) && (this.collection[cid] || 0) < 1) {
              this.unlockCard(cid, 1);
            }
          }
        }
        this.activeDeckId = data.activeDeckId || this.decks[0].id;
      } else {
        const lead = resolveCard(this.protagonistId, this.hybrids) || CARD_BY_ID.arisia;
        const legacyCards = Array.isArray(data.customDeck) && data.customDeck.length > 0
          ? validateDeckForLeader(data.customDeck, this.protagonistId, this.hybrids, this.collection)
          : buildFactionDeck(this.protagonistId, this.hybrids, this.collection);
        this.decks = [{
          id: "deck_1",
          name: `Khởi Nguyên (${lead.name.split(" ")[0]})`,
          leaderId: lead.id,
          cards: legacyCards
        }];
        this.activeDeckId = "deck_1";
      }
      this.ensureDecksInitialized();
      this.customDeck = this.getActiveDeck().cards;
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
