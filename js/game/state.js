// ============================================================================
// CYCLE 12: STATE & GAME LOGIC (v3 — Full Interactive Novel + Strategy + Save Slots)
// ============================================================================

import { FACTIONS, PLAYABLE, SUPERWEAPONS, EVENT_POOL } from "../data/lore.js";
import { SECTORS, SECTOR_BY_ID } from "../data/galaxy.js";
import { CHARACTERS, CHAR_BY_ID } from "../data/characters.js";

const SAVE_PREFIX = "CYCLE12_SAVE_V3_";

export const ACHIEVEMENTS = [
  { id: "first_blood", name: "Chiến Thần Sàn Đấu", desc: "Giành chiến thắng đầu tiên trong Đấu Trường 3D.", rewardCr: 400, rewardInf: 30, check: (g) => (g.stats?.battlesWon || 0) >= 1 },
  { id: "gladiator_5", name: "Bá Chủ Đấu Trường", desc: "Thắng 5 trận đối kháng 3D.", rewardCr: 1200, rewardInf: 80, check: (g) => (g.stats?.battlesWon || 0) >= 5 },
  { id: "gotterfall_fire", name: "Cơn Thịnh Nộ Vì Sao", desc: "Khai hỏa một Siêu vũ khí chiến lược cấp hành tinh.", rewardCr: 500, rewardInf: 45, check: (g) => (g.stats?.superweaponsFired || 0) >= 1 },
  { id: "shadow_intel", name: "Tai Mắt Bóng Đêm", desc: "Thực hiện 2 chiến dịch Tình báo & Phá hoại thành công.", rewardCr: 450, rewardInf: 60, check: (g) => (g.stats?.reconOps || 0) >= 2 },
  { id: "social_bonds", name: "Tri Kỷ Gaiastra", desc: "Đạt Độ tin cậy >= 50 với ít nhất 3 nhân vật.", rewardCr: 600, rewardInf: 90, check: (g) => Object.values(g.vn?.affinity || {}).filter(v => v >= 50).length >= 3 },
  { id: "story_half", name: "Biên Niên Sử Giữa Kỷ", desc: "Hoàn thành ít nhất 4 chương Cốt truyện Tương tác.", rewardCr: 800, rewardInf: 100, check: (g) => (g.vn?.completedChapters?.length || 0) >= 4 },
  { id: "story_master", name: "Huyền Thoại Cycle 12", desc: "Hoàn thành trọn vẹn toàn bộ 8 chương Cốt truyện!", rewardCr: 2500, rewardInf: 250, check: (g) => (g.vn?.completedChapters?.length || 0) >= 8 },
  { id: "hegemon", name: "Thống Lĩnh Thiên Hà", desc: "Kiểm soát từ 75% lãnh thổ Gaiastra trở lên.", rewardCr: 2000, rewardInf: 200, check: (g) => g.getFactionTerritoryPct(g.playerFaction) >= 75 }
];

export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.cycleMajor = 12;
    this.cycleMinor = 1;
    this.playerFaction = "sylvarian";
    this.tension = 45;

    this.pact = {
      active: true,
      turnsRemaining: 10,
      brokenBy: null
    };

    this.resources = {
      sylvarian: { credits: 125000, influence: 520, research: 340, tributes: 40.0 },
      eris: { credits: 98000, influence: 850, research: 990, tributes: 0.0 },
      nadirius: { credits: 64000, influence: 410, research: 280, tributes: 12.0 },
      western_nadir: { credits: 72000, influence: 330, research: 190, tributes: 85.0 },
      salvic: { credits: 55000, influence: 490, research: 360, tributes: 5.0 }
    };

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
      currentChapterId: "ch1_gotterfall",
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
      history: [] // { speaker, text, chapter }
    };

    this.stats = {
      battlesWon: 0,
      superweaponsFired: 0,
      reconOps: 0
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
    const defaults = {
      sylvarian: "arisia",
      eris: "emma",
      nadirius: "magnatere",
      western_nadir: "overlord",
      salvic: "zarcseid"
    };
    return defaults[facId] || "arisia";
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

  // --- SAVE / LOAD MULTI-SLOT ---
  serialize() {
    return JSON.stringify({
      version: 3,
      savedAt: new Date().toLocaleString("vi-VN"),
      cycleMajor: this.cycleMajor,
      cycleMinor: this.cycleMinor,
      playerFaction: this.playerFaction,
      tension: this.tension,
      pact: this.pact,
      resources: this.resources,
      sectors: this.sectors,
      relations: this.relations,
      superweaponCooldowns: this.superweaponCooldowns,
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
      this.playerFaction = data.playerFaction ?? "sylvarian";
      this.tension = data.tension ?? 45;
      if (data.pact) this.pact = data.pact;
      if (data.resources) this.resources = data.resources;
      if (data.sectors) this.sectors = data.sectors;
      if (data.relations) this.relations = data.relations;
      if (data.superweaponCooldowns) this.superweaponCooldowns = data.superweaponCooldowns;
      if (data.vn) this.vn = data.vn;
      if (data.stats) this.stats = data.stats;
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
