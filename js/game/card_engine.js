// ============================================================================
// CYCLE 12: AGE OF DOMINION — 5-LANE × 5-PHASE YU-GI-OH / SNAP TCG ENGINE (v14.0)
// Core Architecture:
// 1. 5 Lanes per Row (Row 1: 5 Combat Slots, Row 2: up to 5 Support/Breeding Slots, Row 3: Representative Leader).
// 2. Opening Hand = 2 Male (♂) + 2 Female (♀) cards. Legal Deck requires >= 2 Male & >= 2 Female cards.
// 3. 5 Explicit Turn Phases:
//    - DRAW PHASE (Rút 1 lá mặc định, hoặc 2 lá nếu có hiệu ứng Meralina; +1⚡ Năng lượng Gen).
//    - SUMMON PHASE (Triệu hồi bài từ tay lên 5 làn Hàng 1 & ẤN kích hoạt Ignition Effect của các lá ở Hàng 2).
//    - EFFECT PHASE (ẤN kích hoạt hiệu ứng của các lá ở Hàng 1 và Hàng 3).
//    - BATTLE PHASE (Giao chiến dọc 5 làn: Thẻ thường thua -> sang Hàng 2 đối phương; Token thua -> biến mất & dồn sát thương vào Hàng 3!).
//    - END PHASE (Kết thúc lượt, dọn hiệu ứng hết hạn, chuyển sang lượt mới).
// 4. Lore-Accurate Custom Character Effects (Ovalina, Meralina, Arisia, Aphrodina, Cynthia & all 72 characters).
// ============================================================================

import {
  CARD_BY_ID,
  resolveCard,
  buildFactionDeck,
  validateDeckForLeader,
  checkDeckLegality,
  hybridToCard,
  H1_KEYWORDS,
  H2_KEYWORDS,
  GENE_SURGE_SKILL,
  LEADER_SKILLS,
  getCardEnergyCost,
  getLeaderSkillForCard
} from "../data/cards.js";
import { FACTIONS } from "../data/lore.js";
import { RACE_STYLE } from "../data/characters.js";

export const DUEL_PHASES = [
  { id: "draw", num: 1, name: "DRAW PHASE", short: "1. Draw", vi: "1. Rút Bài", desc: "Rút 1 lá (hoặc 2 lá nếu có Meralina H1) & +1⚡." },
  { id: "summon", num: 2, name: "SUMMON PHASE", short: "2. Summon & H2", vi: "2. Triệu Hồi & Eff H2", desc: "Đặt bài lên 5 làn Hàng 1 & ẤN kích hoạt hiệu ứng Hàng 2 (Ignition)." },
  { id: "effect", num: 3, name: "EFFECT PHASE", short: "3. Effect H1/H3", vi: "3. Hiệu Ứng H1/H3", desc: "ẤN kích hoạt hiệu ứng các thẻ ở Hàng 1 & Thủ lĩnh Hàng 3." },
  { id: "battle", num: 4, name: "BATTLE PHASE", short: "4. Battle (5 Làn)", vi: "4. Giao Chiến 5 Làn", desc: "Giao chiến dọc 5 làn! Token thua biến mất; thẻ thường thua sang Hàng 2 địch." },
  { id: "end", num: 5, name: "END PHASE", short: "5. End Phase", vi: "5. Kết Lượt", desc: "Kết thúc lượt & sang Draw Phase lượt tiếp theo." }
];

export const LANE_LOCATIONS = [
  { id: "kronea_bastion", name: "Pháo Đài Kronea", desc: "Làn Sylvarian: Thẻ phe Sylvarian +80 CR tại làn này." },
  { id: "pherone_nexus", name: "Pherone Nexus", desc: "Làn Huyết Thống: Thẻ Pherone Nexus / Tamarite & Token +90 CR tại làn này." },
  { id: "predita_line", name: "Chiến Tuyến Predita", desc: "Làn Tử Thủ: Thẻ có CR gốc <= 600 hoặc Salvic được cộng +90 CR." },
  { id: "outer_layer", name: "Vùng Ngoại Eris", desc: "Làn Cân Bằng: Thẻ Eris +90 CR; vô hiệu hóa buff địa hình khác." },
  { id: "abyss_rift", name: "Khe Nứt Vực Thẳm", desc: "Làn Hỗn Mang: Thẻ Nadir / Demon +90 CR tại làn này." },
  { id: "gaiastra_orbit", name: "Quỹ Đạo Gaiastra", desc: "Làn Trung Tâm: Giao chiến chuẩn theo CR & hiệu ứng Hàng 1–2–3." },
  { id: "evernight_tower", name: "Tháp Đêm Evernight", desc: "Làn Đô Thị Ngầm: Thẻ Người / The Supers / Collectors +85 CR." },
  { id: "citadel_throne", name: "Thành Trì Nadirius", desc: "Làn Thiết Luật: Thẻ Nam (♂) hoặc Nadirius +80 CR tại làn này." }
];

export const TACTICAL_DIRECTIVES = [
  {
    id: "shield_matrix",
    name: "Khiên Quang Năng",
    icon: "🛡️",
    cost: 1,
    desc: "1⚡ (Effect Phase): Cấp Khiên Chặn Thua lần đầu cho các thẻ Hàng 1 của bạn (hoặc +80 CR nếu đã có)."
  },
  {
    id: "mutagen_burst",
    name: "Xung Kích Đột Biến",
    icon: "🧬",
    cost: 2,
    desc: "2⚡ (Effect Phase): +120 CR toàn Hàng 1 lượt này & rút +1 lá bài chiến thuật."
  },
  {
    id: "tactical_rescue",
    name: "Giải Cứu Tác Chiến",
    icon: "🔓",
    cost: 2,
    desc: "2⚡ (Effect Phase): Giải cứu 1 thẻ của bạn từ Hàng 2 Địch về tay, hoặc Rút +2 lá nếu H2 Địch trống."
  }
];

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function scaleTacticalDelta(smallVal, referenceCR = 500, customScaled = null) {
  if ((referenceCR || 0) <= 25) return smallVal;
  return customScaled !== null ? customScaled : smallVal * 60;
}

export function hasH1Keyword(card, kwId) {
  if (!card) return false;
  const list = card.h1Keywords || card.row1Effect?.keywords || [];
  return list.includes(kwId);
}

export function hasH2Keyword(card, kwId) {
  if (!card) return false;
  const list = card.h2Keywords || card.row2Effect?.keywords || [];
  return list.includes(kwId);
}

export function isCardUnaffected(card) {
  if (!card) return false;
  return Boolean(
    card.unaffectedByOtherCards ||
    card.row1Effect?.unaffectedByOtherCards ||
    card.id === "aphrodina"
  );
}

// ============================================================================
// PURE LANE RESOLVE FUNCTION (Supports 5 Lanes, First-Battle Immunity & Token Vanish)
// ============================================================================
export function resolveLanePair(pCard, eCard, pEval, eEval, laneIdx = 0) {
  const pTotal = pEval ? pEval.total : (pCard?.cr || 0);
  const eTotal = eEval ? eEval.total : (eCard?.cr || 0);

  if (!pCard && !eCard) {
    return { lane: laneIdx, outcome: "empty", pTotal: 0, eTotal: 0 };
  }
  if (pCard && !eCard) {
    return { lane: laneIdx, outcome: "player_hold", pTotal, eTotal: 0 };
  }
  if (!pCard && eCard) {
    return { lane: laneIdx, outcome: "enemy_hold", pTotal: 0, eTotal };
  }

  if (pTotal > eTotal) {
    const pHasPierce = Boolean(hasH1Keyword(pCard, "pierce") || pCard.row1Effect?.pierceImmunity);
    const eImmune = Boolean((eCard.shieldCharges || 0) > 0 || eCard.firstBattleImmunity);
    if (eImmune && !pHasPierce && !isCardUnaffected(pCard)) {
      return {
        lane: laneIdx,
        outcome: "enemy_shield_block",
        winnerSide: "player",
        blockedSide: "enemy",
        pTotal,
        eTotal,
        shieldBroken: true,
        pierced: false,
        triggeredBreed: false,
        winnerRecoverEnergy: hasH1Keyword(pCard, "recover") ? 1 : 0
      };
    }
    const loserIsToken = Boolean(eCard.isToken);
    const triggeredBreed = !loserIsToken && pCard.gender === "Male" && eCard.gender === "Female";
    return {
      lane: laneIdx,
      outcome: "player_win",
      winnerSide: "player",
      pTotal,
      eTotal,
      overkill: Math.max(0, pTotal - eTotal),
      loserIsToken,
      captured: loserIsToken ? null : eCard.name,
      capturedCard: loserIsToken ? null : eCard,
      destroyedToken: loserIsToken ? eCard : null,
      winnerCard: pCard,
      shieldBroken: false,
      pierced: Boolean(eImmune && pHasPierce),
      triggeredBreed,
      winnerRecoverEnergy: hasH1Keyword(pCard, "recover") ? 1 : 0
    };
  }

  if (eTotal > pTotal) {
    const eHasPierce = Boolean(hasH1Keyword(eCard, "pierce") || eCard.row1Effect?.pierceImmunity);
    const pImmune = Boolean((pCard.shieldCharges || 0) > 0 || pCard.firstBattleImmunity);
    if (pImmune && !eHasPierce && !isCardUnaffected(eCard)) {
      return {
        lane: laneIdx,
        outcome: "player_shield_block",
        winnerSide: "enemy",
        blockedSide: "player",
        pTotal,
        eTotal,
        shieldBroken: true,
        pierced: false,
        triggeredBreed: false,
        winnerRecoverEnergy: hasH1Keyword(eCard, "recover") ? 1 : 0
      };
    }
    const loserIsToken = Boolean(pCard.isToken);
    const triggeredBreed = !loserIsToken && eCard.gender === "Male" && pCard.gender === "Female";
    return {
      lane: laneIdx,
      outcome: "enemy_win",
      winnerSide: "enemy",
      pTotal,
      eTotal,
      overkill: Math.max(0, eTotal - pTotal),
      loserIsToken,
      captured: loserIsToken ? null : pCard.name,
      capturedCard: loserIsToken ? null : pCard,
      destroyedToken: loserIsToken ? pCard : null,
      winnerCard: eCard,
      shieldBroken: false,
      pierced: Boolean(pImmune && eHasPierce),
      triggeredBreed,
      winnerRecoverEnergy: hasH1Keyword(eCard, "recover") ? 1 : 0
    };
  }

  return {
    lane: laneIdx,
    outcome: "tie",
    pTotal,
    eTotal,
    triggeredBreed: false,
    shieldBroken: false,
    pierced: false
  };
}

function makeInstance(card, ownerSide, uidNum, gameStateRef = null) {
  const r1 = card.row1Effect ? { ...card.row1Effect } : { id: "none", isNone: true, tag: "None", bonusFlat: 0, desc: "None" };
  const r2 = card.row2Effect ? { ...card.row2Effect } : { id: "none", isNone: true, tag: "None", crAura: 0, desc: "None" };
  const h1Keywords = [...(card.h1Keywords || r1.keywords || [])];
  const h2Keywords = [...(card.h2Keywords || r2.keywords || [])];
  const cost = typeof card.cost === "number" ? card.cost : getCardEnergyCost(card.cr, card.isToken);
  const starLevel = (ownerSide === "player" && gameStateRef && typeof gameStateRef.getCardStarLevel === "function")
    ? gameStateRef.getCardStarLevel(card.id)
    : (card.starLevel || 0);
  const starBonusCR = (starLevel > 0 && gameStateRef && typeof gameStateRef.getCardStarBonusCR === "function")
    ? gameStateRef.getCardStarBonusCR(card.cr, starLevel)
    : 0;
  return {
    ...card,
    row1Effect: r1,
    row2Effect: r2,
    baseOriginCR: card.cr,
    cr: (card.cr || 100) + starBonusCR,
    starLevel,
    starBonusCR,
    cost,
    h1Keywords,
    h2Keywords,
    unaffectedByOtherCards: Boolean(card.unaffectedByOtherCards || r1.unaffectedByOtherCards || card.id === "aphrodina"),
    firstBattleImmunity: Boolean(r1.selfFirstBattleImmunity),
    shieldCharges: h1Keywords.includes("shield") ? 1 : 0,
    h1EffectActive: false,
    h1ActivatedThisTurn: false,
    h2ActivatedThisTurn: false,
    meralinaHalved: false,
    tempBuffCR: 0,
    tempPenaltyCR: 0,
    nullifiedBuffs: false,
    halvedByEnemy: false,
    battleDamageTaken: 0,
    uid: `${ownerSide}_${card.id}_${uidNum}`,
    ownerSide,
    originalOwnerSide: ownerSide,
    deployedTurn: 0,
    spawnedFromRow2Turn: card.spawnedFromRow2Turn || 0,
    breedingActive: false,
    sireCard: null,
    spawnCount: 0,
    purgeUsed: false,
    captureLane: -1
  };
}

function cloneSideState(side) {
  return JSON.parse(JSON.stringify(side));
}

export class CardBattleEngine {
  constructor({
    playerLeaderId = "arisia",
    playerDeckIds = null,
    enemyLeaderId = "overlord",
    enemyDeckIds = null,
    hybrids = [],
    difficulty = 1,
    gauntletFloor = 0,
    isDraftMode = false,
    sectorId = null,
    gameStateRef = null
  } = {}) {
    this.maxLanes = 5;
    this.maxRow2 = 5;
    this.hybrids = hybrids;
    this.difficulty = difficulty;
    this.gauntletFloor = gauntletFloor || 0;
    this.isBossFloor = this.gauntletFloor > 0 && this.gauntletFloor % 5 === 0;
    this.isDraftMode = Boolean(isDraftMode);
    this.sectorId = sectorId;
    this.gameStateRef = gameStateRef;
    this.uidCounter = 1;
    this.turn = 1;
    this.activeSide = "player";
    this.battleDoneThisTurn = false;
    this.phase = "summon"; // Turn 1 begins in Summon Phase right after Opening Hand (2♂ + 2♀) is drawn!
    this.maxTurns = 28;
    this.log = [];
    this.lastNewTokens = [];
    this.lastLaneResults = [];
    this.over = false;
    this.winner = null; // "player" | "enemy"
    this.winReason = null; // "capture_5" | "leader_breach" | "tiebreak"
    this.selectedHandIdx = null;
    this.maxHandSize = 9;
    this.turnHistory = [];

    // Roll 5 Cosmic Locations for the 5 Vertical Lanes
    const shuffledLocs = shuffle(LANE_LOCATIONS);
    this.lanes = shuffledLocs.slice(0, 5);

    const pLeaderCard = resolveCard(playerLeaderId, hybrids) || CARD_BY_ID.arisia;
    const eLeaderCard = resolveCard(enemyLeaderId, []) || CARD_BY_ID.overlord;

    const legalPDeck = (playerDeckIds && playerDeckIds.length)
      ? (this.isDraftMode
        ? playerDeckIds.filter((id) => Boolean(resolveCard(id, hybrids)))
        : validateDeckForLeader(playerDeckIds, pLeaderCard.id, hybrids))
      : buildFactionDeck(pLeaderCard.id, hybrids);
    const legalityCheck = checkDeckLegality(legalPDeck, hybrids);
    const finalPDeckIds = (legalPDeck.length >= 10 && legalityCheck.hasMinGender)
      ? legalPDeck
      : buildFactionDeck(pLeaderCard.id, hybrids);

    const legalEDeck = (enemyDeckIds && enemyDeckIds.length)
      ? validateDeckForLeader(enemyDeckIds, eLeaderCard.id, [])
      : buildFactionDeck(eLeaderCard.id, []);
    const finalEDeckIds = legalEDeck.length >= 10 ? legalEDeck : buildFactionDeck(eLeaderCard.id, []);

    this.player = {
      side: "player",
      energy: 4,
      maxEnergy: 8,
      mulliganUsed: false,
      directiveUsedThisTurn: false,
      geneSurgeUsed: false,
      geneSurgeActiveThisTurn: false,
      leaderSkillUsed: false,
      leaderSkillBuffCR: 0,
      leaderSkillEnemyPenaltyCR: 0,
      leaderSkillBreedBoost: 0,
      summonLockedOnTurn: 0,
      ovalinaH1Active: false,
      meralinaDrawTwoActive: false,
      arisiaTokenBuffActive: false,
      leader: makeInstance(pLeaderCard, "player", this.uidCounter++, gameStateRef),
      row1: [null, null, null, null, null],
      row2: [],
      graveyard: [],
      hand: [],
      totalTokensBred: 0,
      deck: shuffle(finalPDeckIds.map((id) => makeInstance(resolveCard(id, hybrids) || CARD_BY_ID.tr_syl_guard, "player", this.uidCounter++, gameStateRef)))
    };

    this.enemy = {
      side: "enemy",
      energy: this.isBossFloor ? 5 : 4,
      maxEnergy: 8,
      mulliganUsed: false,
      directiveUsedThisTurn: false,
      geneSurgeUsed: false,
      geneSurgeActiveThisTurn: false,
      leaderSkillUsed: false,
      leaderSkillBuffCR: 0,
      leaderSkillEnemyPenaltyCR: 0,
      leaderSkillBreedBoost: 0,
      summonLockedOnTurn: 0,
      ovalinaH1Active: false,
      meralinaDrawTwoActive: false,
      arisiaTokenBuffActive: false,
      leader: makeInstance(eLeaderCard, "enemy", this.uidCounter++),
      row1: [null, null, null, null, null],
      row2: [],
      graveyard: [],
      hand: [],
      totalTokensBred: 0,
      deck: shuffle(finalEDeckIds.map((id) => makeInstance(resolveCard(id, []) || CARD_BY_ID.tr_wn_raider, "enemy", this.uidCounter++)))
    };

    // Opening Hand Rule: Strictly 2 Male (♂) + 2 Female (♀) cards!
    this.drawOpeningHand("player");
    this.drawOpeningHand("enemy");
    this.ensureTurn1PlayableHand("player");
    this.ensureTurn1PlayableHand("enemy");

    const pFacName = (FACTIONS[pLeaderCard.fac] && FACTIONS[pLeaderCard.fac].name) || pLeaderCard.fac;
    const eFacName = (FACTIONS[eLeaderCard.fac] && FACTIONS[eLeaderCard.fac].name) || eLeaderCard.fac;
    const bossTag = this.isBossFloor ? ` [👑 BOSS TẦNG ${this.gauntletFloor}]` : "";
    this.pushLog(`⚔️ Khai chiến 5 Làn! ${pLeaderCard.name} [${pFacName}] vs ${eLeaderCard.name} [${eFacName}]${bossTag}. Tay khởi đầu: 2 ♂ Nam + 2 ♀ Nữ!`);
    this.pushLog(`🧭 Chu trình 5 Phase: [1. Draw] → [2. Summon & Ấn Eff H2] → [3. Effect H1/H3] → [4. Battle 5 Làn] → [5. End Phase].`);
  }

  // Draws exactly 2 Male (♂) and 2 Female (♀) cards for the Opening Hand
  drawOpeningHand(sideKey) {
    const s = this.getSide(sideKey);
    let mCount = 0;
    let fCount = 0;

    for (let i = 0; i < s.deck.length && mCount < 2; ) {
      if (s.deck[i].gender === "Male") {
        s.hand.push(s.deck.splice(i, 1)[0]);
        mCount++;
      } else {
        i++;
      }
    }
    for (let i = 0; i < s.deck.length && fCount < 2; ) {
      if (s.deck[i].gender === "Female") {
        s.hand.push(s.deck.splice(i, 1)[0]);
        fCount++;
      } else {
        i++;
      }
    }
    while (s.hand.length < 4 && s.deck.length > 0) {
      s.hand.push(s.deck.shift());
    }
  }

  ensureTurn1PlayableHand(sideKey) {
    const s = this.getSide(sideKey);
    if (s.hand.some((c) => (c.cost || 1) <= s.energy)) return;
    if (s.hand.length > 0) {
      s.hand[0].cost = Math.min(s.hand[0].cost || 3, s.energy);
    }
  }

  saveTurnSnapshot(actionLabel = "Thao tác") {
    this.turnHistory.push({
      actionLabel,
      phase: this.phase,
      uidCounter: this.uidCounter,
      selectedHandIdx: this.selectedHandIdx,
      log: [...this.log],
      player: cloneSideState(this.player),
      enemy: cloneSideState(this.enemy)
    });
  }

  canUndo() {
    return !this.over && this.turnHistory.length > 0;
  }

  undoLastAction() {
    if (!this.canUndo()) {
      return { ok: false, reason: "Không có thao tác nào trong lượt này để hoàn tác." };
    }
    const snap = this.turnHistory.pop();
    this.phase = snap.phase || "summon";
    this.uidCounter = snap.uidCounter;
    this.selectedHandIdx = null;
    this.log = snap.log;
    this.player = snap.player;
    this.enemy = snap.enemy;
    this.pushLog(`↩️ Đã hoàn tác: ${snap.actionLabel} (Phục hồi Phase & vị trí thẻ).`);
    return { ok: true, actionLabel: snap.actionLabel, remainingUndos: this.turnHistory.length };
  }

  pushLog(msg) {
    this.log.push(msg);
    if (this.log.length > 90) this.log.shift();
  }

  getSide(sideKey) {
    return sideKey === "player" ? this.player : this.enemy;
  }

  getOpp(sideKey) {
    return sideKey === "player" ? this.enemy : this.player;
  }

  addEnergy(sideKey, amount = 1) {
    const s = this.getSide(sideKey);
    const prev = s.energy || 0;
    s.energy = Math.max(0, Math.min(s.maxEnergy || 8, prev + amount));
    return s.energy - prev;
  }

  drawCards(sideKey, count = 1) {
    const s = this.getSide(sideKey);
    let drawn = 0;
    for (let i = 0; i < count; i++) {
      if (s.deck.length === 0 || s.hand.length >= this.maxHandSize) break;
      s.hand.push(s.deck.shift());
      drawn++;
    }
    return drawn;
  }

  getRow1Cards(sideKey) {
    return this.getSide(sideKey).row1.filter(Boolean);
  }

  getSideBreedingContext(sideKey = "player") {
    const s = this.getSide(sideKey);
    const activeBreeders = s.row2.filter((c) => Boolean(c.row2Effect && !c.row2Effect.isNone && c.row2Effect.id !== "none"));
    const row1Tokens = s.row1.filter((c) => c && c.isToken);
    const hasDick =
      s.leader?.id === "dick" ||
      s.row1.some((c) => c && c.id === "dick") ||
      s.row2.some((c) => c && c.id === "dick");
    const r2SymbiosisBonus = s.row2.reduce((sum, c) => sum + (c.row2Effect?.symbiosisR2Boost || 0), 0) + (s.leaderSkillBreedBoost || 0);
    return {
      activeBreeders,
      activeBreedCount: activeBreeders.length,
      row1Tokens,
      row1TokenCount: row1Tokens.length,
      totalTokensBred: s.totalTokensBred || 0,
      hasActiveBreed: activeBreeders.length > 0,
      hasRow1Token: row1Tokens.length > 0,
      hasTokenOrBreed: activeBreeders.length > 0 || row1Tokens.length > 0 || (s.totalTokensBred || 0) > 0,
      hasDick,
      r2SymbiosisBonus
    };
  }

  isConditionMet(card, oppCard = null, sideKey = "player") {
    if (!card) return false;
    const r1 = card.row1Effect || {};
    if (r1.isNone || r1.id === "none") return false;
    const ctx = this.getSideBreedingContext(sideKey);
    const s = this.getSide(sideKey);
    if (card.id === "ovalina") return s.row2.length > 0;
    if (card.id === "meralina") return s.row1.some((u) => u && u.id === "ragnaroir") || s.leader?.id === "ragnaroir";
    if (card.id === "arisia") return ctx.hasRow1Token || s.row1.some(Boolean);
    if (r1.condType) {
      return ctx.hasTokenOrBreed || ctx.hasDick;
    }
    return Boolean(card.h1EffectActive);
  }

  getRow2SupportAura(sideKey) {
    const s = this.getSide(sideKey);
    const ctx = this.getSideBreedingContext(sideKey);
    return s.row2.reduce((sum, cap) => {
      if (!cap.row2Effect || cap.row2Effect.isNone || cap.row2Effect.id === "none") return sum;
      let aura = cap.row2Effect.crAura || 0;
      if (cap.row2Effect.doubleIfTokenBred && (ctx.hasRow1Token || ctx.totalTokensBred > 0)) {
        aura *= 2;
      }
      return sum + aura;
    }, 0);
  }

  getRow3LeaderAura(sideKey, targetCard) {
    const s = this.getSide(sideKey);
    const leader = s.leader;
    if (!leader || !targetCard || targetCard.uid === leader.uid) return 0;
    if ((targetCard.cr || 0) <= 25) return 0;
    if (isCardUnaffected(targetCard)) return 0;
    const r1 = leader.row1Effect || {};
    if (r1.isNone || r1.id === "none") return 0;
    if (leader.h1EffectActive) {
      return Math.round((r1.bonusFlat || 80) * 0.4);
    }
    return Math.round((r1.bonusFlat || 60) * 0.25);
  }

  // ==========================================================================
  // PHASE MANAGEMENT: DRAW -> SUMMON -> EFFECT -> BATTLE -> END
  // ==========================================================================
  setPhase(targetPhaseId) {
    if (this.over) return { ok: false, reason: "Trận đấu đã kết thúc." };
    const order = ["draw", "summon", "effect", "battle", "end"];
    const curIdx = order.indexOf(this.phase);
    const tgtIdx = order.indexOf(targetPhaseId);
    if (tgtIdx < 0) return { ok: false, reason: "Phase không hợp lệ." };
    if (tgtIdx < curIdx) {
      return { ok: false, reason: `Không thể lùi về ${targetPhaseId.toUpperCase()} PHASE (hãy dùng nút Hoàn Tác ↩️ nếu muốn quay lại)!` };
    }
    if (targetPhaseId === "effect" && this.phase === "summon") {
      this.saveTurnSnapshot("Chuyển sang Effect Phase");
      this.phase = "effect";
      this.selectedHandIdx = null;
      this.pushLog(`✨ [Lượt ${this.turn} • EFFECT PHASE] Hãy ấn vào thẻ ở Hàng 1 hoặc Hàng 3 (hoặc bấm '✨ Bật Eff H1/H3') để kích hoạt hiệu ứng!`);
      return { ok: true, phase: this.phase };
    }
    return { ok: true, phase: this.phase };
  }

  // Helper to spawn a Token onto a side's Row 1 (up to 5 slots)
  createAndPlaceToken(sideKey, {
    name = "Token Chiến Binh",
    species = null,
    race = null,
    fac = null,
    gender = null,
    cr = 400,
    unaffected = false,
    firstBattleImmunity = false,
    handeAuraBonus = 0,
    handeAuraExpireTurn = 0,
    drawOnDestroyOwner = null,
    drawOnDestroyCount = 0,
    maleParent = null,
    femaleParent = null,
    tag = "Token Trực Chiến",
    desc = "Token triệu hồi lên Hàng 1 (Nếu thua giao chiến sẽ biến mất thay vì vào Hàng 2)."
  } = {}) {
    const s = this.getSide(sideKey);
    const targetLane = s.row1.findIndex((slot) => slot === null);
    const finalGender = gender || (Math.random() < 0.5 ? "Male" : "Female");

    // Universal Token Inheritance Rule:
    // By default, a spawned Token inherits the species of BOTH the Male and Female cards,
    // and ALWAYS belongs to the Male card's faction (unless a card explicitly overrides species/faction).
    let resolvedSpecies = species;
    let resolvedRace = race;
    let resolvedFac = fac;
    if (maleParent || femaleParent) {
      if (!resolvedSpecies) {
        if (maleParent && femaleParent) {
          resolvedSpecies = maleParent.species === femaleParent.species
            ? maleParent.species
            : `Lai ${maleParent.species}–${femaleParent.species}`;
        } else {
          resolvedSpecies = (maleParent || femaleParent).species || "Chiến Binh Lai";
        }
      }
      if (!resolvedRace) {
        resolvedRace = maleParent?.race || femaleParent?.race || "hybrid";
      }
      if (!resolvedFac) {
        resolvedFac = maleParent?.fac || femaleParent?.fac || s.leader.fac;
      }
    }
    resolvedSpecies = resolvedSpecies || "Token";
    resolvedRace = resolvedRace || "hybrid";
    const finalFac = resolvedFac || s.leader.fac;

    const style = RACE_STYLE[resolvedRace] || { aura: "#38bdf8" };
    const finalCR = Math.max(20, Math.round(cr));

    const tokenObj = {
      id: `tok_${this.turn}_${this.uidCounter}`,
      isToken: true,
      name,
      fac: finalFac,
      species: resolvedSpecies,
      race: resolvedRace,
      gender: finalGender,
      cr: finalCR,
      cost: 1,
      h: 1.85,
      auraA: style.aura,
      auraB: "#f472b6",
      unaffectedByOtherCards: unaffected,
      h1Keywords: unaffected ? [] : ["charge"],
      h2Keywords: [],
      row1Effect: {
        id: unaffected ? "token_unaffected" : "token_standard",
        tag: unaffected ? "🛡️ Kháng Hiệu Ứng Bài Khác" : tag,
        bonusFlat: 0,
        unaffectedByOtherCards: unaffected,
        desc
      },
      row2Effect: {
        id: "none",
        isNone: true,
        tier: "none",
        crAura: 0,
        tag: "Token (Biến mất khi thua)",
        desc: "Token không thể bị đặt vào Hàng 2 mà biến mất khi thua giao chiến."
      }
    };

    const inst = makeInstance(hybridToCard(tokenObj), sideKey, this.uidCounter++, this.gameStateRef);
    inst.isToken = true;
    inst.fromRow2Breeding = true;
    inst.unaffectedByOtherCards = unaffected;
    inst.firstBattleImmunity = Boolean(firstBattleImmunity);
    inst.handeAuraBonus = handeAuraBonus;
    inst.handeAuraExpireTurn = handeAuraExpireTurn;
    inst.drawOnDestroyOwner = drawOnDestroyOwner;
    inst.drawOnDestroyCount = drawOnDestroyCount;
    inst.spawnedFromRow2Turn = this.turn;
    inst.deployedTurn = this.turn;

    if (targetLane >= 0) {
      inst.spawnedZone = "row1";
      inst.spawnedLane = targetLane;
      s.row1[targetLane] = inst;
      s.totalTokensBred = (s.totalTokensBred || 0) + 1;
      if (sideKey === "player") this.lastNewTokens.push(inst);
      return { placed: true, lane: targetLane, token: inst };
    }
    return { placed: false, lane: -1, token: inst };
  }

  // Triggered when a non-token card loses in Battle Phase and is placed into opponent's Row 2
  onCardPlacedIntoRow2(capturerSideKey, captiveCard, sireCard = null, laneIdx = 0) {
    const capturer = this.getSide(capturerSideKey);
    const originalOwnerKey = capturerSideKey === "player" ? "enemy" : "player";

    // Rule: Tokens CANNOT be placed into Row 2 — they disappear!
    if (captiveCard.isToken) {
      this.getSide(originalOwnerKey).graveyard.push(captiveCard);
      const tokNotes = [`💨 Token ${captiveCard.name} bị đánh bại và biến mất khỏi sân!`];
      if (captiveCard.drawOnDestroyOwner) {
        const d = this.drawCards(captiveCard.drawOnDestroyOwner, captiveCard.drawOnDestroyCount || 1);
        if (d > 0) {
          const whoD = captiveCard.drawOnDestroyOwner === "player" ? "Bạn" : "Địch";
          tokNotes.push(`🃏 Hiệu ứng Token Bryce Dallas: ${whoD} rút +${d} lá!`);
        }
      }
      return { vanishedToken: true, notes: tokNotes };
    }

    captiveCard.ownerSide = `captured_by_${capturerSideKey}`;
    captiveCard.captureLane = laneIdx;
    captiveCard.capturedOnTurn = this.turn;
    captiveCard.h2ActivatedThisTurn = false;
    if (sireCard && sireCard.gender === "Male" && captiveCard.gender === "Female") {
      captiveCard.breedingActive = true;
      captiveCard.sireCard = sireCard;
    }

    const notes = [];
    const r2 = captiveCard.row2Effect || {};
    const r1 = captiveCard.row1Effect || {};

    // 1. OVALINA H2 Mandatory Trigger: "người chơi k thể triệu hồi card vào lượt tiếp theo sau khi lá này dc đặt vào hàng 2"
    if (captiveCard.id === "ovalina" || r2.lockNextTurnSummon) {
      capturer.summonLockedOnTurn = this.turn + 1;
      notes.push(`🔒 Hiệu ứng H2 Ovalina: Khóa Triệu Hồi lượt kế tiếp (Lượt ${this.turn + 1}) của bên giữ Hàng 2!`);
    }

    // 2. APHRODINA H2 Mandatory Trigger: "khi lá này được đặt vào hàng 2, đối thủ được rút 1 lá (player control ban đầu là người rút lá đó)"
    if (captiveCard.id === "aphrodina" || r2.onCaptureOriginalOwnerDraw) {
      const drawn = this.drawCards(originalOwnerKey, r2.onCaptureOriginalOwnerDraw || 1);
      if (drawn > 0) {
        const whoLbl = originalOwnerKey === "player" ? "Bạn (Chủ ban đầu của Aphrodina)" : "Địch (Chủ ban đầu của Aphrodina)";
        notes.push(`🃏 Hiệu ứng H2 Aphrodina khi vào Hàng 2: ${whoLbl} được rút ngay +${drawn} lá bài!`);
      }
    }

    // 3. CYNTHIA H2 & HANDE ERSOY H1 Mandatory Trigger: Return to original owner's Row 2 instead of opponent's Row 2
    if (captiveCard.id === "cynthia" || r2.returnToOriginalOwnerRow2 || captiveCard.id === "hande" || r1.returnToOriginalOwnerRow2) {
      const ownerSideObj = this.getSide(originalOwnerKey);
      captiveCard.ownerSide = `returned_to_${originalOwnerKey}`;
      ownerSideObj.row2.push(captiveCard);
      const ownerLbl = originalOwnerKey === "player" ? "Hàng 2 Sân Ta" : "Hàng 2 Sân Địch";
      notes.push(`🔄 Hiệu ứng ${captiveCard.name}: Tự động chuyển về ${ownerLbl} (sân chủ sở hữu ban đầu) thay vì sân đối thủ!`);
      return { vanishedToken: false, returnedToOwnerRow2: true, targetRow2Side: originalOwnerKey, notes };
    }

    capturer.row2.push(captiveCard);
    return { vanishedToken: false, returnedToOwnerRow2: false, targetRow2Side: capturerSideKey, notes };
  }

  // ==========================================================================
  // SUMMON PHASE: ROW 2 IGNITION EFFECTS (Must be clicked during Summon Phase!)
  // ==========================================================================
  canActivateRow2Ignition(row2Idx, sideKey = "player") {
    if (this.over) return { ok: false, reason: "Trận đấu đã kết thúc." };
    if (sideKey === "player" && this.phase !== "summon") {
      return { ok: false, reason: "Hiệu ứng Hàng 2 (Ignition) CHỈ được kích hoạt trong SUMMON PHASE (Pha 2)!" };
    }
    const s = this.getSide(sideKey);
    const card = s.row2[row2Idx];
    if (!card) return { ok: false, reason: "Không tìm thấy lá bài ở Hàng 2." };
    const r2 = card.row2Effect || {};
    if (r2.isNone || r2.id === "none") {
      return { ok: false, reason: `${card.name} có Hiệu ứng Hàng 2: None (Không có hiệu ứng).` };
    }
    if (card.h2ActivatedThisTurn) {
      return { ok: false, reason: `${card.name} đã kích hoạt hiệu ứng Hàng 2 trong lượt này rồi (1 lần/lượt)!` };
    }
    const emptySlots = s.row1.filter((slot) => slot === null).length;
    if (emptySlots === 0 && r2.id !== "ovalina_h2") {
      return { ok: false, reason: "Hàng 1 đã đầy 5/5 ô, không còn chỗ trống để triệu hồi Token!" };
    }
    return { ok: true, card, r2 };
  }

  activateRow2Ignition(row2Idx, sideKey = "player") {
    const check = this.canActivateRow2Ignition(row2Idx, sideKey);
    if (!check.ok) return check;

    const s = this.getSide(sideKey);
    const opp = this.getOpp(sideKey);
    const card = check.card;
    const r2 = check.r2;

    if (sideKey === "player") {
      this.saveTurnSnapshot(`Kích hoạt Eff H2: ${card.name}`);
    }

    const spawnedTokens = [];
    const notes = [];

    // --- 1. OVALINA H2: Send 3 cards from hand/field to Graveyard -> Summon 3 Tokens (CR = sent card CR + 850) ---
    if (card.id === "ovalina" || r2.id === "ovalina_h2") {
      const handPool = s.hand.map((c, idx) => ({ zone: "hand", idx, card: c }));
      const fieldPool = s.row1
        .map((c, idx) => (c ? { zone: "row1", idx, card: c } : null))
        .filter(Boolean);
      const totalAvailable = handPool.length + fieldPool.length;
      if (totalAvailable < 3) {
        if (sideKey === "player") this.turnHistory.pop();
        return {
          ok: false,
          reason: `Hiệu ứng H2 Ovalina cần gửi 3 lá từ tay và/hoặc sân xuống Mộ (Hiện chỉ có ${totalAvailable} lá)!`
        };
      }

      // Pick 3 cards: prioritize hand cards first, then lowest-CR Row 1 cards (so Row 1 opens up slots for the 3 massive Tokens!)
      const sacrificed = [];
      while (sacrificed.length < 3 && s.hand.length > 0) {
        const c = s.hand.shift();
        s.graveyard.push(c);
        sacrificed.push(c);
      }
      if (sacrificed.length < 3) {
        const r1Indices = s.row1
          .map((c, i) => (c ? { c, i } : null))
          .filter(Boolean)
          .sort((a, b) => a.c.cr - b.c.cr);
        for (const item of r1Indices) {
          if (sacrificed.length >= 3) break;
          s.row1[item.i] = null;
          s.graveyard.push(item.c);
          sacrificed.push(item.c);
        }
      }

      for (const sac of sacrificed) {
        const tokCR = (sac.cr || 100) + 850;
        const res = this.createAndPlaceToken(sideKey, {
          name: `Token Ovalina [${sac.name.split(" ")[0]}]`,
          species: "Tamarite Hyper-Token",
          race: "tamarite",
          fac: "tamarite",
          cr: tokCR,
          tag: `Hiến ${sac.name.split(" ")[0]} (+850 CR)`,
          desc: `Token triệu hồi bởi hiệu ứng Hàng 2 của Ovalina (CR gốc ${sac.cr} + 850 = ${tokCR}).`
        });
        if (res.placed) spawnedTokens.push(res.token);
      }
      s.summonLockedOnTurn = Math.max(s.summonLockedOnTurn || 0, this.turn + 1);
      notes.push(`Hiến 3 lá (${sacrificed.map((c) => c.name.split(" ")[0]).join(", ")}) xuống Mộ → Triệu hồi ${spawnedTokens.length} Token (+850 CR mỗi lá) lên Hàng 1 (Khóa Summon lượt ${this.turn + 1})`);
    }
    // --- 2. MERALINA H2: If 1 Male card on Row 1 -> Spawn 1 Token with same Species & Faction, CR = Father CR (3x if Ragnaroir or CR<350 & non-Sylvarian) ---
    else if (card.id === "meralina" || r2.id === "meralina_h2") {
      const malesOnRow1 = s.row1.filter((u) => u && u.gender === "Male");
      if (malesOnRow1.length === 0) {
        if (sideKey === "player") this.turnHistory.pop();
        return {
          ok: false,
          reason: "Điều kiện Meralina H2: Cần có ít nhất 1 card Nam (♂) đang ở Hàng 1 sân ta!"
        };
      }
      // Prioritize Ragnaroir or a <350 non-Sylvarian Male for 3x CR mutation, else highest CR Male
      const sortedMales = [...malesOnRow1].sort((a, b) => {
        const aTriple = a.id === "ragnaroir" || ((a.cr || 0) < 350 && !(a.species || "").toLowerCase().includes("sylvarian") && a.race !== "sylvarian");
        const bTriple = b.id === "ragnaroir" || ((b.cr || 0) < 350 && !(b.species || "").toLowerCase().includes("sylvarian") && b.race !== "sylvarian");
        const aVal = aTriple ? a.cr * 3 : a.cr;
        const bVal = bTriple ? b.cr * 3 : b.cr;
        return bVal - aVal;
      });
      const father = sortedMales[0];
      const fEval = this.evalCardCombatCR(father, null, sideKey);
      const fatherCR = fEval.total || father.cr;
      const isTriple =
        father.id === "ragnaroir" ||
        (fatherCR < 350 && !(father.species || "").toLowerCase().includes("sylvarian") && father.race !== "sylvarian");
      const tokCR = isTriple ? fatherCR * 3 : fatherCR;

      const res = this.createAndPlaceToken(sideKey, {
        name: `Hậu Duệ ${father.name.split(" ")[0]}${isTriple ? " [×3 Đột Biến]" : ""}`,
        species: father.species,
        race: father.race,
        fac: father.fac,
        cr: tokCR,
        tag: isTriple ? `Đột Biến ×3 CR Cha (${tokCR})` : `Kế Thừa CR Cha (${tokCR})`,
        desc: `Token sinh bởi Meralina H2 cùng loài (${father.species}) & phe (${father.fac}) với ${father.name}.`
      });
      if (res.placed) spawnedTokens.push(res.token);
      notes.push(`Kết hợp cùng ♂ ${father.name} → Sinh Token ${res.token.name} (CR ${tokCR}${isTriple ? " — Nhân 3 CR!" : ""})`);
    }
    // --- 3. APHRODINA H2: Each Summon Phase, spawn 1 Token with CR = any 1 Row 1 card on either side, and that Token is unaffected by other card effects ---
    else if (card.id === "aphrodina" || r2.id === "aphrodina_h2") {
      const allRow1 = [
        ...this.player.row1.filter(Boolean).map((u) => ({ u, side: "player" })),
        ...this.enemy.row1.filter(Boolean).map((u) => ({ u, side: "enemy" }))
      ];
      if (allRow1.length === 0) {
        if (sideKey === "player") this.turnHistory.pop();
        return {
          ok: false,
          reason: "Điều kiện Aphrodina H2: Cần có ít nhất 1 lá bài đang đứng trên Hàng 1 (của bất kỳ bên nào) để sao chép CR!"
        };
      }
      // Pick the highest combat CR unit across both Row 1s
      allRow1.sort((a, b) => {
        const crA = this.evalCardCombatCR(a.u, null, a.side).total;
        const crB = this.evalCardCombatCR(b.u, null, b.side).total;
        return crB - crA;
      });
      const target = allRow1[0];
      const copiedCR = this.evalCardCombatCR(target.u, null, target.side).total || target.u.cr;
      const res = this.createAndPlaceToken(sideKey, {
        name: `Token Phản Chiếu [${target.u.name.split(" ")[0]}]`,
        species: card.species || "Prozonian",
        race: card.race || "prozonian",
        fac: s.leader.fac,
        cr: copiedCR,
        unaffected: true,
        tag: `🛡️ Kháng Eff • Sao chép ${copiedCR} CR`,
        desc: `Token của Aphrodina: Sao chép CR của ${target.u.name} (${copiedCR} CR) và không bị ảnh hưởng bởi hiệu ứng bài khác ở Hàng 1!`
      });
      if (res.placed) spawnedTokens.push(res.token);
      notes.push(`Sao chép CR của ${target.u.name} → Sinh Token ${copiedCR} CR (Kháng mọi hiệu ứng bài khác ở Hàng 1!)`);
    }
    // --- 4. CYNTHIA H2: Discard entire hand -> Summon N Tokens (CR = 200 * N) ---
    else if (card.id === "cynthia" || r2.id === "cynthia_h2") {
      const discardCount = s.hand.length;
      if (discardCount === 0) {
        if (sideKey === "player") this.turnHistory.pop();
        return {
          ok: false,
          reason: "Điều kiện Cynthia H2: Bạn cần có ít nhất 1 lá bài trên tay để bỏ xuống Mộ!"
        };
      }
      while (s.hand.length > 0) {
        s.graveyard.push(s.hand.pop());
      }
      const tokCR = 200 * discardCount;
      for (let k = 0; k < discardCount; k++) {
        const res = this.createAndPlaceToken(sideKey, {
          name: `Token Thám Hiểm Cynthia #${k + 1}`,
          species: "Người Thám Hiểm",
          race: "human",
          fac: s.leader.fac,
          cr: tokCR,
          tag: `Bỏ ${discardCount} lá (200×${discardCount} = ${tokCR} CR)`,
          desc: `Token triệu hồi bởi Cynthia H2 khi bỏ ${discardCount} lá trên tay (CR = 200 × ${discardCount} = ${tokCR}).`
        });
        if (res.placed) spawnedTokens.push(res.token);
      }
      notes.push(`Bỏ toàn bộ ${discardCount} lá trên tay → Triệu hồi ${spawnedTokens.length} Token (Mỗi Token ${tokCR} CR) lên Hàng 1!`);
    }
    // --- 4B. KIM SANTOS H2: Summon 1 Token with CR = (player.hand.length + enemy.hand.length) * 125 ---
    else if (card.id === "kim" || r2.id === "kim_h2") {
      const totalHand = this.player.hand.length + this.enemy.hand.length;
      const tokCR = Math.max(125, totalHand * 125);
      const maleParent = card.sireCard || s.row1.find((u) => u && u.gender === "Male") || null;
      const res = this.createAndPlaceToken(sideKey, {
        name: `Token Tình Báo Kim`,
        maleParent,
        femaleParent: card,
        cr: tokCR,
        tag: `Tay 2 Bên (${totalHand}×125 = ${tokCR} CR)`,
        desc: `Token triệu hồi bởi Kim Santos H2 (Tổng bài trên tay 2 bên: ${totalHand} × 125 = ${tokCR} CR).`
      });
      if (res.placed) spawnedTokens.push(res.token);
      notes.push(`Tổng bài trên tay 2 bên = ${totalHand} → Triệu hồi 1 Token (${tokCR} CR) lên Hàng 1!`);
    }
    // --- 4C. HANDE ERSOY H2: Summon 1 Token (first battle destruction immunity) + other Row 1 allies gain +200 CR while token is on field until end of opponent's turn ---
    else if (card.id === "hande" || r2.id === "hande_h2") {
      const maleParent = card.sireCard || s.row1.find((u) => u && u.gender === "Male") || null;
      const res = this.createAndPlaceToken(sideKey, {
        name: `Token Bất Khuất Hande`,
        maleParent,
        femaleParent: card,
        cr: 480,
        firstBattleImmunity: true,
        handeAuraBonus: 200,
        handeAuraExpireTurn: this.turn + 1,
        tag: `🛡️ Bất Tử Lần Đầu • +200 CR Đồng Đội H1`,
        desc: `Token của Hande Ersoy: Lần đầu tiên sắp bị tiêu diệt bởi chiến đấu, không bị tiêu diệt; các thẻ khác trên Hàng 1 ta được +200 CR khi Token này còn trên sân đến hết lượt đối thủ!`
      });
      if (res.placed) spawnedTokens.push(res.token);
      notes.push(`Triệu hồi Token Bất Tử Lần Đầu (480 CR) & cộng +200 CR cho toàn bộ thẻ khác trên Hàng 1 ta!`);
    }
    // --- 4D. BRYCE DALLAS H2: Target 1 Male card on Row 1, summon 1 Male Token with CR = Bryce CR + Male CR; if destroyed, draw 1 card ---
    else if (card.id === "bryce" || r2.id === "bryce_h2") {
      const malesOnRow1 = s.row1.filter((u) => u && u.gender === "Male");
      if (malesOnRow1.length === 0) {
        if (sideKey === "player") this.turnHistory.pop();
        return {
          ok: false,
          reason: "Điều kiện Bryce Dallas H2: Cần có ít nhất 1 thẻ Nam (♂) trên Hàng 1 sân ta để hợp nhất CR!"
        };
      }
      const maleTarget = [...malesOnRow1].sort((a, b) => this.evalCardCombatCR(b, null, sideKey).total - this.evalCardCombatCR(a, null, sideKey).total)[0];
      const maleCR = this.evalCardCombatCR(maleTarget, null, sideKey).total || maleTarget.cr;
      const tokCR = (card.cr || 560) + maleCR;
      const res = this.createAndPlaceToken(sideKey, {
        name: `Token ♂ ${maleTarget.name.split(" ")[0]}×Bryce`,
        maleParent: maleTarget,
        femaleParent: card,
        gender: "Male",
        cr: tokCR,
        drawOnDestroyOwner: sideKey,
        drawOnDestroyCount: 1,
        tag: `♂ Hợp Nhất (${tokCR} CR) • Vỡ → Rút 1`,
        desc: `Token Nam (♂) triệu hồi bởi Bryce Dallas H2 (CR = Bryce ${card.cr} + ${maleTarget.name} ${maleCR} = ${tokCR}). Nếu bị tiêu diệt, bạn được rút 1 lá!`
      });
      if (res.placed) spawnedTokens.push(res.token);
      notes.push(`Chọn ♂ ${maleTarget.name} (${maleCR} CR) → Triệu hồi Token ♂ ${res.token.name} (${tokCR} CR, Vỡ → Rút 1 lá)!`);
    }
    // --- 5. OTHER CUSTOM CHARACTERS & FACTION TROOPS H2 IGNITION ---
    else if (r2.id === "uterussa_h2") {
      const sac = s.hand.shift() || s.row1.find(Boolean);
      const baseCR = sac ? sac.cr : 450;
      if (sac && s.row1.includes(sac)) s.row1[s.row1.indexOf(sac)] = null;
      if (sac) s.graveyard.push(sac);
      for (let k = 0; k < 2; k++) {
        const res = this.createAndPlaceToken(sideKey, {
          name: `Omni-Token Uterussa #${k + 1}`,
          species: "Omni-Tamarite",
          race: "tamarite",
          fac: s.leader.fac,
          cr: baseCR + 450,
          tag: `Omni-Womb (${baseCR + 450} CR)`
        });
        if (res.placed) spawnedTokens.push(res.token);
      }
      notes.push(`Omni-Womb triệu hồi ${spawnedTokens.length} Token (${baseCR + 450} CR) lên Hàng 1!`);
    } else if (r2.id === "emma_h2") {
      if (s.graveyard.length > 0 && s.hand.length < this.maxHandSize) {
        const rev = s.graveyard.pop();
        s.hand.push(rev);
        notes.push(`Thu hồi ${rev.name} từ Mộ về tay`);
      }
      const res = this.createAndPlaceToken(sideKey, {
        name: "Token Thiên Sứ Eris",
        species: "Erisian",
        race: "erisian",
        fac: s.leader.fac,
        cr: 650,
        unaffected: true,
        tag: "Thiên Sứ Eris (650 CR • Kháng Eff)"
      });
      if (res.placed) spawnedTokens.push(res.token);
      notes.push(`Triệu hồi Token Thiên Sứ Eris (650 CR, Kháng Hiệu Ứng)`);
    } else {
      // General Lore / Species Ignition Token Spawn
      const sire = card.sireCard || s.row1.find((u) => u && u.gender === "Male") || s.leader;
      const baseTokenCR = Math.max(380, Math.round(((sire?.cr || 500) * 0.45 + (card.cr || 500) * 0.55) * (r2.crMult || 0.95)));
      const countToSpawn = (r2.id === "tsunadia_h2" || r2.id === "atomina_h2" || r2.id === "qiyana_h2" || r2.id === "trang_h2" || r2.id === "carnavex_h2" || r2.id === "sentrion_h2" || r2.id === "exorotic_h2" || r2.id === "eremite_h2" || r2.id === "mrmind_h2" || r2.id === "bill_h2" || r2.id === "dick_h2") ? 2 : 1;
      for (let k = 0; k < countToSpawn; k++) {
        const res = this.createAndPlaceToken(sideKey, {
          name: `Token ${card.name.split(" ")[0]} #${k + 1}`,
          species: card.species || "Token",
          race: card.race || "hybrid",
          fac: s.leader.fac,
          cr: baseTokenCR,
          tag: r2.tag || `Token H2 (${baseTokenCR} CR)`
        });
        if (res.placed) spawnedTokens.push(res.token);
      }
      if (r2.id === "brigitte_h2" || r2.id === "sofie_h2" || r2.id === "jorduyn_h2" || r2.id === "yulia_h2" || r2.id === "mina_h2" || r2.id === "jokar_h2" || r2.id === "ojamon_h2" || r2.id === "jose_h2") {
        const d = this.drawCards(sideKey, 1);
        if (d > 0) notes.push(`Rút +${d} lá bài`);
      }
      if (r2.id === "emily_h2" || r2.id === "parasoid_h2") {
        const pen = r2.id === "parasoid_h2" ? 200 : 100;
        opp.row1.forEach((u) => {
          if (u && !isCardUnaffected(u)) u.tempPenaltyCR = (u.tempPenaltyCR || 0) + pen;
        });
        notes.push(`Giảm -${pen} CR toàn Hàng 1 địch`);
      }
      notes.push(`Triệu hồi ${spawnedTokens.length} Token (${baseTokenCR} CR) lên Hàng 1`);
    }

    card.h2ActivatedThisTurn = true;
    card.spawnCount = (card.spawnCount || 0) + spawnedTokens.length;
    const who = sideKey === "player" ? "Ta" : "Địch";
    this.pushLog(`🧬 [Summon Phase • Ignition H2 ${who}: ${card.name}] ${notes.join(" • ")}!`);
    return { ok: true, card, spawnedTokens, notes };
  }

  // ==========================================================================
  // EFFECT PHASE: ROW 1 & ROW 3 EFFECT ACTIVATION (Only usable in Effect Phase!)
  // ==========================================================================
  canActivateCardEffect(zone, idx = 0, sideKey = "player") {
    if (this.over) return { ok: false, reason: "Trận đấu đã kết thúc." };
    if (sideKey === "player" && this.phase !== "effect") {
      return { ok: false, reason: "Hiệu ứng Hàng 1 & Hàng 3 CHỈ được kích hoạt trong EFFECT PHASE (Pha 3)!" };
    }
    const s = this.getSide(sideKey);
    const opp = this.getOpp(sideKey);
    const card = zone === "row3" ? s.leader : s.row1[idx];
    if (!card) return { ok: false, reason: "Không tìm thấy lá bài." };
    const r1 = card.row1Effect || {};
    if (r1.isNone || r1.id === "none") {
      return { ok: false, reason: `${card.name} có Hiệu ứng Hàng 1: None (Không có hiệu ứng).` };
    }
    if (card.h1ActivatedThisTurn) {
      return { ok: false, reason: `${card.name} đã kích hoạt hiệu ứng trong Effect Phase lượt này rồi!` };
    }
    if (r1.id === "bryce_h1" || r1.sacrificeR2ToDestroyEnemyR1) {
      if (s.row2.length === 0) {
        return { ok: false, reason: "Điều kiện Bryce Dallas H1: Cần có ít nhất 1 thẻ ở Hàng 2 sân bạn để tiêu diệt!" };
      }
      if (!opp.row1.some(Boolean)) {
        return { ok: false, reason: "Điều kiện Bryce Dallas H1: Hàng 1 đối phương không có thẻ nào để tiêu diệt!" };
      }
    }
    return { ok: true, card, r1 };
  }

  activateCardEffect(zone, idx = 0, sideKey = "player") {
    const check = this.canActivateCardEffect(zone, idx, sideKey);
    if (!check.ok) return check;

    const s = this.getSide(sideKey);
    const opp = this.getOpp(sideKey);
    const card = check.card;
    const r1 = check.r1;
    const oppCard = zone === "row1" ? opp.row1[idx] : null;

    if (sideKey === "player") {
      this.saveTurnSnapshot(`Kích hoạt Eff ${zone.toUpperCase()}: ${card.name}`);
    }

    card.h1EffectActive = true;
    card.h1ActivatedThisTurn = true;
    const notes = [];

    // --- 0A. KIM SANTOS H1: Shuffle self on field to deck, add 1 Male card from deck to hand ---
    if (card.id === "kim" || r1.shuffleToSearchMale) {
      if (zone === "row1" && s.row1[idx] === card) {
        s.row1[idx] = null;
        s.deck.push(card);
        for (let i = s.deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [s.deck[i], s.deck[j]] = [s.deck[j], s.deck[i]];
        }
        const mIdx = s.deck.findIndex((c) => c.gender === "Male");
        if (mIdx >= 0) {
          const [maleCard] = s.deck.splice(mIdx, 1);
          s.hand.push(maleCard);
          notes.push(`🔄 Xào ${card.name} về Bộ bài → Thêm ♂ ${maleCard.name} từ Bộ bài lên tay!`);
        } else {
          notes.push(`🔄 Xào ${card.name} về Bộ bài (Không còn thẻ Nam ♂ trong Bộ bài).`);
        }
      }
    }
    // --- 0B. BRYCE DALLAS H1: Destroy 1 card in your Row 2, then destroy 1 card in opponent's Row 1, but cannot attack this turn ---
    else if (card.id === "bryce" || r1.sacrificeR2ToDestroyEnemyR1) {
      const r2Sac = s.row2.shift();
      if (r2Sac) s.graveyard.push(r2Sac);
      const enemyTargets = opp.row1
        .map((u, i) => (u ? { u, i, cr: this.evalCardCombatCR(u, null, sideKey === "player" ? "enemy" : "player", { laneIdx: i }).total } : null))
        .filter(Boolean)
        .sort((a, b) => b.cr - a.cr);
      const target = enemyTargets[0];
      if (target) {
        opp.row1[target.i] = null;
        opp.graveyard.push(target.u);
      }
      card.cannotAttackThisTurn = true;
      notes.push(`💥 Tiêu diệt ${r2Sac?.name || "1 thẻ H2"} & phá hủy ${target?.u?.name || "1 thẻ H1 địch"} (Bryce không thể tấn công lượt này)!`);
    }
    // --- 1. OVALINA H1: +180 CR all friendly units + 80 CR per card in Row 2, minus 50 CR per non-Pherone-Nexus card on Row 1 ---
    else if (card.id === "ovalina" || r1.id === "ovalina_h1") {
      s.ovalinaH1Active = true;
      const r2Bonus = s.row2.length * 80;
      const nonPheroneCount = s.row1.filter((u) => u && u.fac !== "tamarite").length;
      const pen = nonPheroneCount * 50;
      notes.push(`+180 CR toàn quân + ${r2Bonus} CR (${s.row2.length} lá H2)`);
      if (pen > 0) notes.push(`Phạt -${pen} CR toàn sân do có ${nonPheroneCount} lá Hàng 1 khác phe Pherone Nexus`);
    }
    // --- 2. MERALINA H1: Self halves CR, draws 2 cards/turn in Draw Phase; if Ragnaroir on our field, Ragnaroir gains Immunity + 250 CR ---
    else if (card.id === "meralina" || r1.id === "meralina_h1") {
      card.meralinaHalved = true;
      s.meralinaDrawTwoActive = true;
      notes.push("Bản thân giảm 1/2 CR → Mỗi Draw Phase rút 2 lá thay vì 1");
      let ragBuffed = false;
      s.row1.forEach((u) => {
        if (u && u.id === "ragnaroir") {
          u.unaffectedByOtherCards = true;
          u.tempBuffCR = (u.tempBuffCR || 0) + 250;
          ragBuffed = true;
        }
      });
      if (s.leader?.id === "ragnaroir") {
        s.leader.unaffectedByOtherCards = true;
        s.leader.tempBuffCR = (s.leader.tempBuffCR || 0) + 250;
        ragBuffed = true;
      }
      if (ragBuffed) notes.push("🐺 Ragnaroir trên sân nhận Kháng Hiệu Ứng + 250 CR!");
    }
    // --- 3. ARISIA H1: Friendly Row 1 cards cannot be destroyed in first battle; Tokens from Row 2 get +200 CR until end of next turn ---
    else if (card.id === "arisia" || r1.id === "arisia_h1") {
      s.arisiaTokenBuffActive = true;
      s.row1.forEach((u) => {
        if (u) u.firstBattleImmunity = true;
      });
      notes.push("🛡️ Toàn bộ thẻ Hàng 1 không thể bị tiêu diệt trong chiến đấu lần đầu • Token sinh từ Hàng 2 nhận +200 CR đến hết lượt sau!");
    }
    // --- 4. APHRODINA H1: Unaffected by other card effects ---
    else if (card.id === "aphrodina" || r1.id === "aphrodina_h1") {
      card.unaffectedByOtherCards = true;
      card.tempPenaltyCR = 0;
      card.halvedByEnemy = false;
      notes.push("🛡️ Kháng tuyệt đối mọi hiệu ứng của bài khác!");
    }
    // --- 5. ALL OTHER LORE-DRIVEN H1 EFFECTS ---
    else {
      if (r1.firstBattleImmunityAllRow1) {
        s.row1.forEach((u) => {
          if (u) u.firstBattleImmunity = true;
        });
        notes.push("🛡️ Toàn Hàng 1 bất tử chiến đấu lần đầu");
      }
      if (r1.selfFirstBattleImmunity) {
        card.firstBattleImmunity = true;
        notes.push("🛡️ Bất tử chiến đấu lần đầu");
      }
      if (r1.drawOnEffect) {
        const d = this.drawCards(sideKey, r1.drawOnEffect);
        if (d > 0) notes.push(`🃏 Rút +${d} lá`);
      }
      if (r1.allyAllBonus) {
        s.row1.forEach((u) => {
          if (u) u.tempBuffCR = (u.tempBuffCR || 0) + r1.allyAllBonus;
        });
        notes.push(`+${r1.allyAllBonus} CR toàn Hàng 1 ta`);
      }
      if (r1.boostAllTokens) {
        s.row1.forEach((u) => {
          if (u && u.isToken) u.tempBuffCR = (u.tempBuffCR || 0) + r1.boostAllTokens;
        });
        notes.push(`+${r1.boostAllTokens} CR cho mọi Token phe ta`);
      }
      if (r1.enemyAllPenalty) {
        opp.row1.forEach((u) => {
          if (u && !isCardUnaffected(u)) u.tempPenaltyCR = (u.tempPenaltyCR || 0) + r1.enemyAllPenalty;
        });
        notes.push(`-${r1.enemyAllPenalty} CR toàn Hàng 1 địch`);
      }
      if (r1.oppPenalty && oppCard && !isCardUnaffected(oppCard)) {
        oppCard.tempPenaltyCR = (oppCard.tempPenaltyCR || 0) + r1.oppPenalty;
        notes.push(`-${r1.oppPenalty} CR vào ${oppCard.name}`);
      }
      if (r1.halveOppositeCR && oppCard && !isCardUnaffected(oppCard)) {
        oppCard.halvedByEnemy = true;
        notes.push(`Giảm 1/2 CR của ${oppCard.name}`);
      }
      if (r1.nullifyOppositeBuffs && oppCard && !isCardUnaffected(oppCard)) {
        oppCard.nullifiedBuffs = true;
        oppCard.tempBuffCR = 0;
        notes.push(`Xóa mọi buff CR của ${oppCard.name}`);
      }
      if (r1.destroyEnemyToken) {
        const tokIdx = opp.row1.findIndex((u) => u && u.isToken && !isCardUnaffected(u));
        if (tokIdx >= 0) {
          const destroyed = opp.row1[tokIdx];
          opp.row1[tokIdx] = null;
          opp.graveyard.push(destroyed);
          notes.push(`💥 Tiêu diệt ngay Token ${destroyed.name} của địch!`);
        }
      }
      if (r1.spawnCloneCR) {
        const res = this.createAndPlaceToken(sideKey, {
          name: `Phân Thân ${card.name.split(" ")[0]}`,
          species: card.species,
          race: card.race,
          fac: card.fac,
          cr: r1.spawnCloneCR,
          tag: `Phân Thân (${r1.spawnCloneCR} CR)`
        });
        if (res.placed) notes.push(`Triệu hồi ${res.token.name} (${r1.spawnCloneCR} CR) lên Làn ${res.lane + 1}`);
      }
      if (notes.length === 0 && r1.bonusFlat) {
        notes.push(`Kích hoạt ${r1.tag || "Chiến kỹ"} (+${r1.bonusFlat} CR)`);
      }
    }

    const who = sideKey === "player" ? "Ta" : "Địch";
    this.pushLog(`✨ [Effect Phase • ${zone.toUpperCase()} ${who}: ${card.name}] ${notes.join(" • ")}!`);
    return { ok: true, card, notes };
  }

  activateAllEffectsInPhase(sideKey = "player") {
    if (this.over) return { ok: false, reason: "Trận đấu đã kết thúc." };
    if (sideKey === "player" && this.phase !== "effect") {
      return { ok: false, reason: "Chỉ có thể kích hoạt hiệu ứng Hàng 1 & Hàng 3 trong EFFECT PHASE!" };
    }
    const s = this.getSide(sideKey);
    const activated = [];
    // Activate Row 3 Leader effect first, then all Row 1 units
    if (!s.leader.h1ActivatedThisTurn && s.leader.row1Effect && !s.leader.row1Effect.isNone && s.leader.row1Effect.id !== "none") {
      const r = this.activateCardEffect("row3", 0, sideKey);
      if (r.ok) activated.push(s.leader.name);
    }
    for (let i = 0; i < this.maxLanes; i++) {
      const u = s.row1[i];
      if (u && !u.h1ActivatedThisTurn && u.row1Effect && !u.row1Effect.isNone && u.row1Effect.id !== "none") {
        const r = this.activateCardEffect("row1", i, sideKey);
        if (r.ok) activated.push(u.name);
      }
    }
    return { ok: true, activated, notes: activated };
  }

  // ==========================================================================
  // TRANSPARENT COMBAT CR EVALUATION (Respects Effect Phase, Unaffected & Custom Lore Rules)
  // ==========================================================================
  evalCardCombatCR(card, oppCard = null, sideKey = "player", opts = {}) {
    if (!card) return { total: 0, base: 0, r1Bonus: 0, keywordBonus: 0, genderBonus: 0, surgeBonus: 0, laneBonus: 0, leaderAura: 0, row2Aura: 0, penalty: 0, triggeredConditionals: [] };
    const s = this.getSide(sideKey);
    const opp = this.getOpp(sideKey);
    const isSmallScale = (card.cr || 0) <= 25 && (!oppCard || (oppCard.cr || 0) <= 25);
    const unaffected = isCardUnaffected(card);
    const r1 = card.row1Effect || {};
    const laneLoc = (typeof opts.laneIdx === "number" && this.lanes[opts.laneIdx]) ? this.lanes[opts.laneIdx] : null;

    let base = Math.max(10, (card.cr || 100) + (card.tokenBoostCR || 0) - (card.battleDamageTaken || 0));
    const triggeredConditionals = [];

    if (unaffected) {
      triggeredConditionals.push("🛡️ Kháng Hiệu Ứng Bài Khác");
    }

    // Meralina H1 self-halving (only when Meralina's own H1 effect was activated!)
    if ((card.id === "meralina" || r1.halfSelfCR) && card.h1EffectActive) {
      base = Math.max(10, Math.floor(base * 0.5));
      triggeredConditionals.push("🌗 Meralina H1: Giảm 1/2 CR (Đổi lấy Rút 2 lá/lượt)");
    }

    // Enemy Hailey H1 halving (if not unaffected)
    if (card.halvedByEnemy && !unaffected) {
      base = Math.max(10, Math.floor(base * 0.5));
      triggeredConditionals.push("❄️ Trúng Đạn Absolute Zero (-50% CR)");
    }

    let r1Bonus = 0;
    let keywordBonus = 0;
    let genderBonus = 0;
    let surgeBonus = 0;
    let laneBonus = 0;

    // H1 Effects apply when activated in Effect Phase (or previewed)
    const effectActive = Boolean(card.h1EffectActive || opts.previewDeploy || isSmallScale);
    if (effectActive && !r1.isNone && r1.id !== "none" && (!card.nullifiedBuffs || unaffected)) {
      r1Bonus += isSmallScale ? (r1.smallBonus || 0) : (r1.bonusFlat || 0);

      if (!isSmallScale) {
        if (r1.perUniqueSpeciesBonus) {
          const allUnits = [...this.player.row1, ...this.enemy.row1].filter(Boolean);
          const uniqueSpecs = new Set(allUnits.map((u) => u.species)).size;
          r1Bonus += uniqueSpecs * r1.perUniqueSpeciesBonus;
          if (uniqueSpecs > 0) triggeredConditionals.push(`🌌 ${uniqueSpecs} Chủng tộc (+${uniqueSpecs * r1.perUniqueSpeciesBonus} CR)`);
        }
        if (r1.copyHalfEnemyLeaderCR && opp.leader) {
          const copied = Math.round((opp.leader.cr || 500) * 0.5);
          r1Bonus += copied;
          triggeredConditionals.push(`📖 Sao chép 50% CR Tướng Địch (+${copied} CR)`);
        }
        if (r1.absorbHigherOppCR && oppCard && (oppCard.cr || 0) > base) {
          const diff = Math.round(((oppCard.cr || 0) - base) * 0.6);
          r1Bonus += diff;
          triggeredConditionals.push(`⚛️ Hấp thụ chênh lệch CR (+${diff} CR)`);
        }
        if (r1.zarcseidSynergy && [...s.row1, ...opp.row1].some((u) => u && (u.id === "zarcseid" || u.race === "prozonian"))) {
          r1Bonus += r1.zarcseidSynergy;
          triggeredConditionals.push(`💞 Cộng hưởng Prozonian (+${r1.zarcseidSynergy} CR)`);
        }
        if (r1.veidosSynergy && (s.row1.some((u) => u && u.id === "veidos") || s.leader?.id === "veidos")) {
          r1Bonus += r1.veidosSynergy;
          triggeredConditionals.push(`🪓 Sát cánh cùng Veidos (+${r1.veidosSynergy} CR)`);
        }
      }
    }

    if (!card.nullifiedBuffs || unaffected) {
      r1Bonus += card.tempBuffCR || 0;
    }

    // Ovalina H1 global field aura & non-Pherone-Nexus penalty
    if (s.ovalinaH1Active && !isSmallScale && !unaffected) {
      const ovBonus = 180 + s.row2.length * 80;
      const nonPheroneCount = s.row1.filter((u) => u && u.fac !== "tamarite").length;
      const ovPen = nonPheroneCount * 50;
      const netOv = ovBonus - ovPen;
      r1Bonus += netOv;
      triggeredConditionals.push(`💗 Aura Ovalina H1 (${netOv >= 0 ? "+" : ""}${netOv} CR)`);
    }

    // Arisia H1 Token buff (+200 CR to Tokens spawned from Row 2 until end of turn after summon)
    if (s.arisiaTokenBuffActive && card.isToken && card.fromRow2Breeding && (this.turn <= (card.spawnedFromRow2Turn || 0) + 1) && !unaffected) {
      r1Bonus += 200;
      triggeredConditionals.push("👑 Arisia H1: Token Hàng 2 (+200 CR)");
    }

    // Hande Ersoy H2 Token aura (+200 CR to other Row 1 allies while Hande Token is on field until end of opponent's turn)
    if (!unaffected && !isSmallScale && s.row1.some((u) => u && u !== card && u.handeAuraBonus > 0 && this.turn <= (u.handeAuraExpireTurn || 0))) {
      r1Bonus += 200;
      triggeredConditionals.push("🛡️ Hào Quang Token Hande (+200 CR)");
    }

    // Standardized H1 Keywords
    const deployedNow = opts.previewDeploy || card.deployedTurn === this.turn;
    if (hasH1Keyword(card, "charge") && deployedNow) {
      const chBonus = scaleTacticalDelta(H1_KEYWORDS.charge.smallBonus, card.cr, H1_KEYWORDS.charge.scaledBonus);
      keywordBonus += chBonus;
      triggeredConditionals.push(`⚡ Xung Phong (+${chBonus} CR)`);
    }
    if (hasH1Keyword(card, "pierce") && (opts.attackingRow3 || (oppCard && ((oppCard.shieldCharges || 0) > 0 || oppCard.firstBattleImmunity)))) {
      const pBonus = scaleTacticalDelta(H1_KEYWORDS.pierce.smallBonus, card.cr, H1_KEYWORDS.pierce.scaledBonus);
      keywordBonus += pBonus;
      triggeredConditionals.push(`🗡️ Xuyên Giáp (+${pBonus} CR)`);
    }
    if ((card.shieldCharges || 0) > 0 || card.firstBattleImmunity) {
      triggeredConditionals.push("🛡️ Bất Tử / Chặn Thua Lần Đầu");
    }

    // Gender Advantage: Male vs Female (+2 Tier / +120 CR)
    if (card.gender === "Male" && oppCard && oppCard.gender === "Female") {
      genderBonus = scaleTacticalDelta(2, card.cr, 120);
      triggeredConditionals.push(`♂>♀ Ưu Thế Giới Tính (+${genderBonus} CR)`);
    }

    // Leader Active Skills
    if (s.geneSurgeActiveThisTurn && !unaffected) {
      const gBonus = scaleTacticalDelta(GENE_SURGE_SKILL.smallBonus, card.cr, GENE_SURGE_SKILL.scaledBonus);
      surgeBonus += gBonus;
      triggeredConditionals.push(`🔥 Gene Surge (+${gBonus} CR)`);
    }
    if (s.leaderSkillBuffCR > 0 && !unaffected) {
      const lBonus = isSmallScale ? 2 : s.leaderSkillBuffCR;
      surgeBonus += lBonus;
      triggeredConditionals.push(`👑 Tuyệt Kỹ Phe (+${lBonus} CR)`);
    }

    // Cosmic Lane modifiers
    if (laneLoc && !isSmallScale && !unaffected) {
      if (laneLoc.id === "kronea_bastion" && card.fac === "sylvarian") laneBonus += 80;
      else if (laneLoc.id === "pherone_nexus" && (card.fac === "tamarite" || card.isToken)) laneBonus += 90;
      else if (laneLoc.id === "predita_line" && ((card.cr || 100) <= 600 || card.fac === "salvic")) laneBonus += 90;
      else if (laneLoc.id === "outer_layer" && card.fac === "eris") laneBonus += 90;
      else if (laneLoc.id === "abyss_rift" && (card.fac === "western_nadir" || card.race === "nadir" || card.race === "demon")) laneBonus += 90;
      else if (laneLoc.id === "evernight_tower" && (card.race === "human" || card.fac === "collectors" || card.fac === "independent")) laneBonus += 85;
      else if (laneLoc.id === "citadel_throne" && (card.gender === "Male" || card.fac === "nadirius")) laneBonus += 80;
    }

    // Penalties (Ignored if card is unaffectedByOtherCards!)
    let penalty = 0;
    if (!unaffected && !isSmallScale) {
      penalty += card.tempPenaltyCR || 0;
      if (opp.leaderSkillEnemyPenaltyCR > 0) penalty += opp.leaderSkillEnemyPenaltyCR;
    }

    const row2Aura = (isSmallScale || unaffected) ? 0 : this.getRow2SupportAura(sideKey);
    const leaderAura = (isSmallScale || unaffected || card.uid === s.leader.uid) ? 0 : this.getRow3LeaderAura(sideKey, card);
    const towerBonus = (sideKey === "enemy" && !isSmallScale)
      ? Math.round((this.difficulty - 1) * 40) + (this.gauntletFloor > 1 ? (this.gauntletFloor - 1) * 35 : 0) + (this.isBossFloor ? 120 : 0)
      : 0;

    const minFloor = isSmallScale ? 1 : 20;
    const total = Math.max(minFloor, base + r1Bonus + keywordBonus + genderBonus + surgeBonus + laneBonus + leaderAura + row2Aura + towerBonus - penalty);
    return {
      total,
      base,
      r1Bonus,
      keywordBonus,
      genderBonus,
      surgeBonus,
      laneBonus,
      leaderAura,
      row2Aura,
      penalty,
      breakdown: {
        base,
        "Hiệu ứng H1": r1Bonus,
        "Từ khóa & ♂>♀": keywordBonus + genderBonus,
        "Kỹ năng Tướng": surgeBonus,
        "Địa hình Làn": laneBonus,
        "Aura H2/H3": leaderAura + row2Aura,
        "Buff Tháp/Độ khó": towerBonus,
        "Trừ CR": -penalty
      },
      triggeredConditionals
    };
  }

  // ==========================================================================
  // LEADER ACTIVE SKILLS & DIRECTIVES (Usable in Effect Phase or Summon Phase)
  // ==========================================================================
  activateGeneSurge(sideKey = "player") {
    if (this.over) return { ok: false, reason: "Trận đấu đã kết thúc." };
    const s = this.getSide(sideKey);
    if (s.geneSurgeUsed) {
      return { ok: false, reason: "Gene Surge chỉ dùng được 1 lần mỗi ván!" };
    }
    if ((s.energy || 0) < GENE_SURGE_SKILL.cost) {
      return { ok: false, reason: `Cần ${GENE_SURGE_SKILL.cost}⚡ Năng lượng Gen để kích hoạt Gene Surge (Hiện có ${s.energy}⚡)!` };
    }
    if (sideKey === "player") {
      this.saveTurnSnapshot("Kích hoạt Gene Surge (4⚡)");
    }
    s.energy -= GENE_SURGE_SKILL.cost;
    s.geneSurgeUsed = true;
    s.geneSurgeActiveThisTurn = true;
    const who = sideKey === "player" ? s.leader.name : `Địch (${s.leader.name})`;
    this.pushLog(`🔥 [${who}] Kích hoạt GENE SURGE (-4⚡) -> Toàn bàn nhận +180 CR trong lượt này!`);
    return { ok: true, skill: GENE_SURGE_SKILL, remainingEnergy: s.energy };
  }

  activateLeaderSkill(sideKey = "player") {
    if (this.over) return { ok: false, reason: "Trận đấu đã kết thúc." };
    const s = this.getSide(sideKey);
    const opp = this.getOpp(sideKey);
    const skill = getLeaderSkillForCard(s.leader);
    if (s.leaderSkillUsed) {
      return { ok: false, reason: `Tuyệt kỹ ${skill.name} chỉ dùng được 1 lần mỗi ván!` };
    }
    if ((s.energy || 0) < skill.cost) {
      return { ok: false, reason: `Cần ${skill.cost}⚡ để dùng ${skill.name} (Hiện có ${s.energy}⚡)!` };
    }
    if (sideKey === "player") {
      this.saveTurnSnapshot(`Tuyệt kỹ ${skill.name} (${skill.cost}⚡)`);
    }
    s.energy -= skill.cost;
    s.leaderSkillUsed = true;

    const notes = [];
    if (skill.scaledBonus) {
      s.leaderSkillBuffCR = (s.leaderSkillBuffCR || 0) + skill.scaledBonus;
      notes.push(`+${skill.scaledBonus} CR Hàng 1`);
    }
    if (skill.scaledPenalty) {
      s.leaderSkillEnemyPenaltyCR = (s.leaderSkillEnemyPenaltyCR || 0) + skill.scaledPenalty;
      notes.push(`-${skill.scaledPenalty} CR Hàng 1 địch`);
    }
    if (skill.grantKeyword) {
      s.row1.forEach((u) => {
        if (!u) return;
        if (!u.h1Keywords) u.h1Keywords = [];
        if (!u.h1Keywords.includes(skill.grantKeyword)) u.h1Keywords.push(skill.grantKeyword);
        if (skill.grantKeyword === "shield") u.shieldCharges = Math.max(1, u.shieldCharges || 0);
      });
      notes.push(`Cấp ${H1_KEYWORDS[skill.grantKeyword]?.short || skill.grantKeyword}`);
    }
    if (skill.drawCount) {
      const d = this.drawCards(sideKey, skill.drawCount);
      if (d > 0) notes.push(`Rút +${d} lá`);
    }
    if (skill.energyGain) {
      const g = this.addEnergy(sideKey, skill.energyGain);
      if (g > 0) notes.push(`Hồi +${g}⚡`);
    }
    if (skill.purgeCaptive && opp.row2.length > 0) {
      const rescued = opp.row2.pop();
      notes.push(`🔓 Giải cứu ${rescued.name} khỏi H2 địch`);
    }

    const who = sideKey === "player" ? s.leader.name : `Địch (${s.leader.name})`;
    this.pushLog(`${skill.icon} [${who}] Thi triển ${skill.name} (-${skill.cost}⚡): ${notes.join(" • ")}!`);
    return { ok: true, skill, notes, remainingEnergy: s.energy };
  }

  canMulligan() {
    return !this.over && this.turn === 1 && this.phase === "summon" && !this.player.mulliganUsed && this.getRow1Cards("player").length === 0;
  }

  mulliganHand() {
    if (!this.canMulligan()) {
      return { ok: false, reason: "Chỉ có thể Đổi Bài Mở Màn (Mulligan) ở Lượt 1 trước khi đặt thẻ lên sân!" };
    }
    this.saveTurnSnapshot("Đổi bài khởi đầu (2♂ + 2♀)");
    while (this.player.hand.length > 0) {
      this.player.deck.push(this.player.hand.pop());
    }
    this.player.deck = shuffle(this.player.deck);
    this.drawOpeningHand("player");
    this.ensureTurn1PlayableHand("player");
    this.player.mulliganUsed = true;
    this.selectedHandIdx = null;
    this.pushLog(`🔄 Đổi Bài Mở Màn (Mulligan): Xáo lại bộ bài và rút tay khởi đầu mới gồm 2 ♂ Nam + 2 ♀ Nữ!`);
    return { ok: true, hand: this.player.hand };
  }

  activateTacticalDirective(directiveId, sideKey = "player") {
    if (this.over) return { ok: false, reason: "Trận đấu đã kết thúc." };
    const s = this.getSide(sideKey);
    const opp = this.getOpp(sideKey);
    const dir = TACTICAL_DIRECTIVES.find((d) => d.id === directiveId) || TACTICAL_DIRECTIVES[0];
    if (s.directiveUsedThisTurn) {
      return { ok: false, reason: "Mỗi lượt chỉ được phát động 1 Chỉ Thị Chiến Thuật!" };
    }
    if ((s.energy || 0) < dir.cost) {
      return { ok: false, reason: `Cần ${dir.cost}⚡ Năng lượng Gen để dùng ${dir.name} (Hiện có ${s.energy}⚡)!` };
    }
    if (sideKey === "player") {
      this.saveTurnSnapshot(`Chỉ thị ${dir.name} (${dir.cost}⚡)`);
    }
    s.energy -= dir.cost;
    s.directiveUsedThisTurn = true;
    const notes = [];

    if (dir.id === "shield_matrix") {
      s.row1.forEach((u) => {
        if (!u) return;
        u.firstBattleImmunity = true;
        u.shieldCharges = Math.max(1, u.shieldCharges || 0);
      });
      notes.push("Cấp 🛡️ Khiên / Bất tử lần đầu cho toàn Hàng 1");
    } else if (dir.id === "mutagen_burst") {
      s.leaderSkillBuffCR = (s.leaderSkillBuffCR || 0) + 120;
      const d = this.drawCards(sideKey, 1);
      notes.push(`+120 CR toàn Hàng 1${d > 0 ? ` & Rút +${d} lá` : ""}`);
    } else if (dir.id === "tactical_rescue") {
      if (opp.row2.length > 0) {
        const rescued = opp.row2.pop();
        rescued.ownerSide = sideKey;
        rescued.breedingActive = false;
        if (s.hand.length < this.maxHandSize) s.hand.push(rescued);
        notes.push(`🔓 Giải cứu ${rescued.name} khỏi Hàng 2 Địch về tay!`);
      } else {
        const d = this.drawCards(sideKey, 2);
        notes.push(`Rút +${d} lá chiến thuật`);
      }
    }

    this.pushLog(`${dir.icon} [Chỉ Thị: ${dir.name} (-${dir.cost}⚡)] ${notes.join(" • ")}!`);
    return { ok: true, directive: dir, notes, remainingEnergy: s.energy };
  }

  // ==========================================================================
  // SUMMON PHASE: DEPLOY & RECALL ON 5 LANES
  // ==========================================================================
  deployCardToRow1(handIdx, laneIdx) {
    if (this.over) return { ok: false, reason: "Trận đấu đã kết thúc." };
    if (this.phase !== "summon") {
      return { ok: false, reason: `Chỉ được triệu hồi bài từ tay trong SUMMON PHASE (Hiện đang ở ${this.phase.toUpperCase()} PHASE)!` };
    }
    const s = this.player;
    if (s.summonLockedOnTurn === this.turn) {
      return { ok: false, reason: "🚫 Bạn đang bị khóa Triệu Hồi bài từ tay ở lượt này do hiệu ứng Hàng 2 của Ovalina! (Bạn vẫn có thể ấn kích hoạt Eff H2 của Ovalina!)" };
    }
    const card = s.hand[handIdx];
    if (!card) return { ok: false, reason: "Không tìm thấy thẻ trên tay." };
    if (!this.isDraftMode && card.fac !== s.leader.fac) {
      return { ok: false, reason: `Vi phạm phe phái: Thủ lĩnh ${s.leader.name} chỉ dùng thẻ phe ${s.leader.fac}!` };
    }
    if (laneIdx < 0 || laneIdx >= this.maxLanes) return { ok: false, reason: "Làn Hàng 1 không hợp lệ (1–5)." };
    if (s.row1[laneIdx]) return { ok: false, reason: `Làn ${laneIdx + 1} đang có thẻ trấn giữ.` };

    this.saveTurnSnapshot(`Triệu hồi ${card.name} vào Làn ${laneIdx + 1}`);

    // v15.0: Summoning cards in Summon Phase does NOT consume Energy!
    s.hand.splice(handIdx, 1);
    card.deployedTurn = this.turn;
    if (hasH1Keyword(card, "shield") && (card.shieldCharges || 0) <= 0) {
      card.shieldCharges = 1;
    }
    s.row1[laneIdx] = card;
    this.selectedHandIdx = null;

    const kwNotes = [];
    if (hasH1Keyword(card, "charge")) kwNotes.push("⚡ Xung Phong");
    if (hasH1Keyword(card, "shield") || card.firstBattleImmunity) kwNotes.push("🛡️ Chặn Thua Lần Đầu");
    if (hasH1Keyword(card, "draw")) {
      const drawn = this.drawCards("player", 1);
      if (drawn > 0) kwNotes.push("🃏 Rút +1 thẻ");
    }
    if (hasH1Keyword(card, "recover")) {
      const gained = this.addEnergy("player", 1);
      if (gained > 0) kwNotes.push(`💚 Hồi +${gained}⚡`);
    }

    const kwStr = kwNotes.length ? ` [${kwNotes.join(" • ")}]` : "";
    this.pushLog(`🃏 [Summon Phase] Triệu hồi ${card.name} (${card.gender === "Male" ? "♂" : "♀"} • CR ${card.cr}) vào Làn ${laneIdx + 1}${kwStr}.`);
    return { ok: true, card, laneIdx, cost: 0, kwNotes };
  }

  recallFromRow1(laneIdx) {
    if (this.over) return { ok: false };
    if (this.phase !== "summon") {
      return { ok: false, reason: "Chỉ có thể thu hồi thẻ vừa đặt khi còn ở SUMMON PHASE!" };
    }
    const card = this.player.row1[laneIdx];
    if (!card) return { ok: false, reason: "Làn trống." };
    if (card.deployedTurn !== this.turn || card.fromRow2Breeding || card.isToken) {
      return { ok: false, reason: "Thẻ từ lượt trước hoặc Token sinh từ Hàng 2 đang giữ vị trí Hàng 1." };
    }

    const lastSnap = this.turnHistory[this.turnHistory.length - 1];
    if (lastSnap && lastSnap.actionLabel.includes(card.name)) {
      return this.undoLastAction();
    }

    this.player.row1[laneIdx] = null;
    this.player.hand.push(card);
    this.pushLog(`↩️ Thu hồi ${card.name} từ Làn ${laneIdx + 1} về tay.`);
    return { ok: true, card, refund: 0 };
  }

  // ==========================================================================
  // LIVE 5-LANE FORECAST PREVIEW
  // ==========================================================================
  getLaneForecast(laneIdx, hypotheticalPlayerCard = null) {
    const pCard = this.player.row1[laneIdx] || hypotheticalPlayerCard;
    const eCard = this.enemy.row1[laneIdx];
    const isHypothetical = !this.player.row1[laneIdx] && Boolean(hypotheticalPlayerCard);

    if (!pCard && !eCard) {
      return {
        lane: laneIdx,
        outcome: "empty",
        badgeClass: "neutral",
        label: "Làn Trống",
        detail: "Kéo thả hoặc chọn thẻ đặt vào làn này"
      };
    }

    const pEval = pCard
      ? this.evalCardCombatCR(pCard, eCard, "player", { laneIdx, previewDeploy: isHypothetical })
      : null;
    const eEval = eCard
      ? this.evalCardCombatCR(eCard, pCard, "enemy", { laneIdx })
      : null;

    const sim = resolveLanePair(pCard, eCard, pEval, eEval, laneIdx);
    const prefix = isHypothetical ? "Nếu đặt: " : "Dự kiến: ";

    switch (sim.outcome) {
      case "player_win":
        if (sim.loserIsToken) {
          return {
            ...sim,
            badgeClass: "win",
            label: `💥 ${prefix}Diệt Token Địch (+${sim.overkill} sát thương H3)`,
            detail: `Token địch biến mất & Hàng 3 địch chịu ${sim.overkill} sát thương tràn!`
          };
        }
        return {
          ...sim,
          badgeClass: sim.triggeredBreed ? "breed-win" : "win",
          label: `🏆 ${prefix}Thắng (+${sim.pTotal - sim.eTotal}) → Đưa vào H2 Ta!`,
          detail: `${pCard.name} (${sim.pTotal}) bắt ${eCard.name} (${sim.eTotal}) sang Hàng 2`
        };
      case "enemy_shield_block":
        return {
          ...sim,
          badgeClass: "shield",
          label: `🛡️ ${prefix}Phá Bất Tử/Khiên Địch (${sim.pTotal} > ${sim.eTotal})`,
          detail: "Địch mất trạng thái chặn thua lần đầu ở lượt này"
        };
      case "player_shield_block":
        return {
          ...sim,
          badgeClass: "shield",
          label: `🛡️ ${prefix}Chặn Thua Lần Đầu (${sim.pTotal} < ${sim.eTotal})`,
          detail: `${pCard.name} kích hoạt Bất Tử Lần Đầu / Khiên để trụ lại Hàng 1!`
        };
      case "enemy_win":
        if (sim.loserIsToken) {
          return {
            ...sim,
            badgeClass: "lose",
            label: `⚠️ ${prefix}Token Ta Vỡ (-${sim.overkill} vào Hàng 3 Ta!)`,
            detail: `Token biến mất và Hàng 3 của bạn phải gánh ${sim.overkill} sát thương!`
          };
        }
        if (pCard && (pCard.id === "cynthia" || pCard.id === "hande" || pCard.row2Effect?.returnToOriginalOwnerRow2 || pCard.row1Effect?.returnToOriginalOwnerRow2)) {
          return {
            ...sim,
            badgeClass: "win",
            label: `🔄 ${prefix}${pCard.name.split(" ")[0]} Thua → Tự Về H2 Sân Ta!`,
            detail: `${pCard.name} bị đánh bại nhưng tự động chuyển về Hàng 2 sân bạn thay vì sân đối thủ!`
          };
        }
        return {
          ...sim,
          badgeClass: "lose",
          label: `⚠️ ${prefix}Thua Làn (-${sim.eTotal - sim.pTotal}) → Bị bắt sang H2 Địch`,
          detail: `${eCard.name} (${sim.eTotal}) mạnh hơn ${pCard.name} (${sim.pTotal})`
        };
      case "tie":
        return {
          ...sim,
          badgeClass: "tie",
          label: `⚖️ ${prefix}Hòa CR (${sim.pTotal} = ${sim.eTotal})`,
          detail: "Hai bên giữ nguyên vị trí tại Hàng 1"
        };
      case "player_hold":
        return {
          ...sim,
          badgeClass: "win",
          label: `⚡ ${prefix}Trấn Giữ (${sim.pTotal} CR) • Uy Hiếp H3`,
          detail: "Nếu Hàng 1 địch trống sẽ đánh thẳng Thủ lĩnh Hàng 3!"
        };
      case "enemy_hold":
        return {
          ...sim,
          badgeClass: "lose",
          label: `🚨 Địch Chiếm Làn (${sim.eTotal} CR) — Hãy Chặn!`,
          detail: "Đặt thẻ chặn để tránh Hàng 3 bị uy hiếp!"
        };
      default:
        return { lane: laneIdx, outcome: "empty", badgeClass: "neutral", label: "Làn Trống", detail: "" };
    }
  }

  getEffectiveBreedChance(captive) {
    const r2 = captive?.row2Effect || {};
    if (r2.isNone || r2.id === "none") return 0;
    return 100; // In v14.0, Row 2 effects are deterministic Yu-Gi-Oh Ignition effects activated in Summon Phase!
  }

  // ==========================================================================
  // SMART TACTICAL AI FOR 5 LANES (Summon Phase + Row 2 Ignition + Effect Phase)
  // ==========================================================================
  aiExecuteTurnPhases() {
    const e = this.enemy;
    const deployedMoves = [];

    // 1. AI Summon Phase: Activate any available Enemy Row 2 Ignition effects first!
    for (let r2Idx = 0; r2Idx < e.row2.length; r2Idx++) {
      const cap = e.row2[r2Idx];
      if (cap && !cap.h2ActivatedThisTurn && cap.row2Effect && !cap.row2Effect.isNone && cap.row2Effect.id !== "none") {
        this.activateRow2Ignition(r2Idx, "enemy");
      }
    }

    // 2. AI Summon Phase: Deploy cards from hand onto the 5 lanes (unless locked by Ovalina H2!)
    if (e.summonLockedOnTurn === this.turn) {
      this.pushLog(`🔒 [AI Summon Phase] Địch bị khóa Triệu Hồi lượt này do hiệu ứng Hàng 2 của Ovalina!`);
    } else {
      const allLanes = [0, 1, 2, 3, 4];
      const emptyLanes = allLanes.filter((idx) => e.row1[idx] === null);
      const occupiedByPlayer = emptyLanes.filter((idx) => this.player.row1[idx] !== null);
      const otherEmpty = emptyLanes.filter((idx) => this.player.row1[idx] === null);
      const laneOrder = [...occupiedByPlayer, ...otherEmpty];

      for (const laneIdx of laneOrder) {
        const affordable = e.hand.map((c, idx) => ({ card: c, idx, cost: 0 }));

        if (affordable.length === 0) break;

        const pCard = this.player.row1[laneIdx];
        let bestPick = null;
        let bestScore = -999999;

        for (const item of affordable) {
          const c = item.card;
          const eEval = this.evalCardCombatCR(c, pCard, "enemy", { laneIdx, previewDeploy: true });
          if (pCard) {
            const pEval = this.evalCardCombatCR(pCard, c, "player", { laneIdx });
            const sim = resolveLanePair(pCard, c, pEval, eEval, laneIdx);
            if (sim.outcome === "enemy_win") {
              const score = 10000 + (sim.loserIsToken ? sim.overkill : 400) - item.cost * 50;
              if (score > bestScore) {
                bestScore = score;
                bestPick = item;
              }
            } else if (sim.outcome === "player_shield_block" || sim.outcome === "tie") {
              const score = 1800 - item.cost * 120;
              if (score > bestScore) {
                bestScore = score;
                bestPick = item;
              }
            } else {
              const score = -2000 - item.cost * 150;
              if (score > bestScore) {
                bestScore = score;
                bestPick = item;
              }
            }
          } else {
            const currentBoardCount = this.getRow1Cards("enemy").length;
            const wantsToSaveEnergy = currentBoardCount >= 2 && e.energy <= 2 && item.cost >= 2;
            const score = wantsToSaveEnergy ? -500 : (eEval.total - item.cost * 40);
            if (score > bestScore) {
              bestScore = score;
              bestPick = item;
            }
          }
        }

        const currentEnemyFront = this.getRow1Cards("enemy").length;
        if (!bestPick || (bestScore < 0 && currentEnemyFront >= 2)) {
          continue;
        }

        const chosen = e.hand.splice(bestPick.idx, 1)[0];
        chosen.deployedTurn = this.turn;
        if (hasH1Keyword(chosen, "shield") && (chosen.shieldCharges || 0) <= 0) {
          chosen.shieldCharges = 1;
        }
        e.row1[laneIdx] = chosen;
        if (hasH1Keyword(chosen, "draw")) this.drawCards("enemy", 1);
        if (hasH1Keyword(chosen, "recover")) this.addEnergy("enemy", 1);

        deployedMoves.push({ lane: laneIdx, card: chosen, cost: 0 });
        this.pushLog(`👁️ [AI Summon] Địch đặt ${chosen.name} (${chosen.gender === "Male" ? "♂" : "♀"} • CR ${chosen.cr}) vào Làn ${laneIdx + 1}.`);
      }
    }

    // 3. AI Effect Phase: Activate all Enemy Row 1 & Row 3 Effects!
    this.activateAllEffectsInPhase("enemy");

    // 4. AI Leader Active Skills check
    const contestedLanes = [0, 1, 2, 3, 4].filter((i) => this.player.row1[i] && e.row1[i]);
    if (contestedLanes.length > 0 && !e.geneSurgeUsed && e.energy >= GENE_SURGE_SKILL.cost) {
      const flipsLane = contestedLanes.some((i) => {
        const pE = this.evalCardCombatCR(this.player.row1[i], e.row1[i], "player", { laneIdx: i }).total;
        const eE = this.evalCardCombatCR(e.row1[i], this.player.row1[i], "enemy", { laneIdx: i }).total;
        return eE <= pE && (eE + GENE_SURGE_SKILL.scaledBonus) > pE;
      });
      if (flipsLane) this.activateGeneSurge("enemy");
    }

    return deployedMoves;
  }

  // ==========================================================================
  // YU-GI-OH TURN FLOW:
  // Turn 1 Player 1: Draw -> Summon & H2 -> Effect -> End Phase (NO Battle Phase!)
  // Turn 1 Player 2 (AI): Draw -> Summon & H2 -> Effect -> Battle Phase -> End Phase
  // Turn 2+ Player 1: Draw -> Summon & H2 -> Effect -> Battle Phase -> End Phase
  // ==========================================================================
  canEnterBattlePhase() {
    if (this.over) return { ok: false, reason: "Trận đấu đã kết thúc." };
    if (this.turn === 1 && this.activeSide === "player") {
      return {
        ok: false,
        reason: "Lượt 1 của Player 1 KHÔNG CÓ Battle Phase! Hãy bấm '⏭️ END PHASE' để chuyển sang lượt Địch."
      };
    }
    if (this.battleDoneThisTurn) {
      return {
        ok: false,
        reason: "Bạn đã hoàn thành Battle Phase ở lượt này! Hãy bấm '⏭️ END PHASE' để kết thúc lượt."
      };
    }
    return { ok: true };
  }

  runLaneClashes() {
    const laneResults = [];
    let playerRow3OverkillDamage = 0;
    let enemyRow3OverkillDamage = 0;

    for (let i = 0; i < this.maxLanes; i++) {
      const pCard = this.player.row1[i];
      const eCard = this.enemy.row1[i];

      if (pCard && eCard) {
        if (pCard.cannotAttackThisTurn && eCard.cannotAttackThisTurn) {
          this.pushLog(`⏸️ Làn ${i + 1}: Cả ${pCard.name} và ${eCard.name} đều bị khóa tấn công lượt này.`);
          laneResults.push({ lane: i, outcome: "tie", pTotal: 0, eTotal: 0 });
          continue;
        }
        const pEval = this.evalCardCombatCR(pCard, eCard, "player", { laneIdx: i });
        const eEval = this.evalCardCombatCR(eCard, pCard, "enemy", { laneIdx: i });
        const res = resolveLanePair(pCard, eCard, pEval, eEval, i);
        if (pCard.cannotAttackThisTurn && res.outcome === "player_win") {
          this.pushLog(`⏸️ Làn ${i + 1}: ${pCard.name} không thể tấn công lượt này (hiệu ứng Bryce Dallas) nên không tiêu diệt/bắt ${eCard.name}.`);
          laneResults.push({ ...res, outcome: "tie" });
          continue;
        }
        if (eCard.cannotAttackThisTurn && res.outcome === "enemy_win") {
          this.pushLog(`⏸️ Làn ${i + 1}: ${eCard.name} không thể tấn công lượt này.`);
          laneResults.push({ ...res, outcome: "tie" });
          continue;
        }

        if (res.outcome === "enemy_shield_block") {
          if (eCard.firstBattleImmunity) eCard.firstBattleImmunity = false;
          else eCard.shieldCharges = Math.max(0, (eCard.shieldCharges || 1) - 1);
          if (res.winnerRecoverEnergy) this.addEnergy("player", res.winnerRecoverEnergy);
          this.pushLog(`🛡️ Làn ${i + 1}: ${pCard.name} (${res.pTotal}) thắng điểm nhưng ${eCard.name} (${res.eTotal}) kích hoạt Bất Tử Lần Đầu/Khiên & trụ lại Hàng 1!`);
          laneResults.push(res);
        } else if (res.outcome === "player_shield_block") {
          if (pCard.firstBattleImmunity) pCard.firstBattleImmunity = false;
          else pCard.shieldCharges = Math.max(0, (pCard.shieldCharges || 1) - 1);
          if (res.winnerRecoverEnergy) this.addEnergy("enemy", res.winnerRecoverEnergy);
          this.pushLog(`🛡️ Làn ${i + 1}: ${pCard.name} (${res.pTotal}) kích hoạt Bất Tử Lần Đầu/Khiên chặn đòn của ${eCard.name} (${res.eTotal}) & trụ lại Hàng 1!`);
          laneResults.push(res);
        } else if (res.outcome === "player_win") {
          this.enemy.row1[i] = null;
          if (res.winnerRecoverEnergy) this.addEnergy("player", res.winnerRecoverEnergy);

          const capInfo = this.onCardPlacedIntoRow2("player", eCard, pCard, i);
          if (capInfo.vanishedToken) {
            const chip = Math.round(res.overkill * 0.65);
            enemyRow3OverkillDamage += chip;
            this.enemy.leader.battleDamageTaken = (this.enemy.leader.battleDamageTaken || 0) + chip;
            this.pushLog(`💨 Làn ${i + 1}: ${pCard.name} (${res.pTotal}) đánh tan Token ${eCard.name} (${res.eTotal}) -> Token biến mất & Hàng 3 Địch ăn ${chip} sát thương tràn!`);
          } else if (capInfo.returnedToOwnerRow2) {
            const extraNotes = capInfo.notes.length ? ` [${capInfo.notes.join(" • ")}]` : "";
            this.pushLog(`🔄 Làn ${i + 1}: ${pCard.name} (${res.pTotal} CR) thắng ${eCard.name} (${res.eTotal} CR) — ${eCard.name} tự chuyển về Hàng 2 Địch (${this.enemy.row2.length}/${this.maxRow2})!${extraNotes}`);
          } else {
            const extraNotes = capInfo.notes.length ? ` [${capInfo.notes.join(" • ")}]` : "";
            this.pushLog(`🏆 Làn ${i + 1}: ${pCard.name} (${res.pTotal} CR) thắng ${eCard.name} (${res.eTotal} CR) -> Đưa vào Hàng 2 Ta (${this.player.row2.length}/${this.maxRow2})!${extraNotes}`);
          }
          laneResults.push({ ...res, h2Notes: capInfo.notes });
        } else if (res.outcome === "enemy_win") {
          this.player.row1[i] = null;
          if (res.winnerRecoverEnergy) this.addEnergy("enemy", res.winnerRecoverEnergy);

          const capInfo = this.onCardPlacedIntoRow2("enemy", pCard, eCard, i);
          if (capInfo.vanishedToken) {
            const chip = Math.round(res.overkill * 0.65);
            playerRow3OverkillDamage += chip;
            this.player.leader.battleDamageTaken = (this.player.leader.battleDamageTaken || 0) + chip;
            this.pushLog(`💥 Làn ${i + 1}: Token ${pCard.name} (${res.pTotal}) bị ${eCard.name} (${res.eTotal}) đánh bay -> Token biến mất & Thủ lĩnh Hàng 3 của bạn phải ăn ${chip} sát thương!`);
          } else if (capInfo.returnedToOwnerRow2) {
            const extraNotes = capInfo.notes.length ? ` [${capInfo.notes.join(" • ")}]` : "";
            this.pushLog(`🔄 Làn ${i + 1}: ${eCard.name} (${res.eTotal} CR) thắng ${pCard.name} (${res.pTotal} CR) — ${pCard.name} tự chuyển về Hàng 2 Sân Ta (${this.player.row2.length}/${this.maxRow2})!${extraNotes}`);
          } else {
            const extraNotes = capInfo.notes.length ? ` [${capInfo.notes.join(" • ")}]` : "";
            this.pushLog(`💢 Làn ${i + 1}: ${eCard.name} (${res.eTotal} CR) thắng ${pCard.name} (${res.pTotal} CR) -> Đưa vào Hàng 2 Địch (${this.enemy.row2.length}/${this.maxRow2})!${extraNotes}`);
          }
          laneResults.push({ ...res, h2Notes: capInfo.notes });
        } else {
          this.pushLog(`⚖️ Làn ${i + 1}: ${pCard.name} hòa ${eCard.name} tại ${res.pTotal} CR — giữ nguyên vị trí.`);
          laneResults.push(res);
        }
      } else if (pCard && !eCard) {
        const pEval = this.evalCardCombatCR(pCard, null, "player", { laneIdx: i });
        laneResults.push({ lane: i, outcome: "player_hold", pTotal: pEval.total, eTotal: 0 });
      } else if (!pCard && eCard) {
        const eEval = this.evalCardCombatCR(eCard, null, "enemy", { laneIdx: i });
        laneResults.push({ lane: i, outcome: "enemy_hold", pTotal: 0, eTotal: eEval.total });
      } else {
        laneResults.push({ lane: i, outcome: "empty", pTotal: 0, eTotal: 0 });
      }
    }

    this.lastLaneResults = laneResults;

    // Row 2 Capture Win/Loss Condition (3 captures)
    const captureWinTarget = 3;
    if (this.player.row2.length >= captureWinTarget) {
      this.over = true;
      this.winner = "player";
      this.winReason = "capture_3";
      this.pushLog(`🎉 CHIẾN THẮNG! Đã bắt giữ ${this.player.row2.length} lá bài thật của đối thủ vào Hàng 2!`);
      return { laneResults, over: true, winner: "player", winReason: "capture_3" };
    }
    if (this.enemy.row2.length >= captureWinTarget) {
      this.over = true;
      this.winner = "enemy";
      this.winReason = "capture_3";
      this.pushLog(`💀 THẤT BẠI! Bạn đã mất ${this.enemy.row2.length} lá bài vào Hàng 2 đối phương!`);
      return { laneResults, over: true, winner: "enemy", winReason: "capture_3" };
    }

    // Row 3 Outer Representative Breach Check
    const pRow1Cards = this.getRow1Cards("player");
    const eRow1Cards = this.getRow1Cards("enemy");
    const eRepEval = this.evalCardCombatCR(this.enemy.leader, pRow1Cards[0] || null, "enemy");
    const pRepEval = this.evalCardCombatCR(this.player.leader, eRow1Cards[0] || null, "player");

    if (enemyRow3OverkillDamage > 0 && (this.enemy.leader.cr - (this.enemy.leader.battleDamageTaken || 0)) <= 0) {
      this.over = true;
      this.winner = "player";
      this.winReason = "leader_breach";
      this.pushLog(`👑 HẠ GỤC THỦ LĨNH HÀNG 3 ĐỊCH (Sát thương xuyên Token)! -> CHIẾN THẮNG!`);
      return { laneResults, over: true, winner: "player", winReason: "leader_breach" };
    }
    if (playerRow3OverkillDamage > 0 && (this.player.leader.cr - (this.player.leader.battleDamageTaken || 0)) <= 0) {
      this.over = true;
      this.winner = "enemy";
      this.winReason = "leader_breach";
      this.pushLog(`💀 GAME OVER! Các Token yếu vỡ trận khiến Thủ lĩnh Hàng 3 ${this.player.leader.name} gục ngã!`);
      return { laneResults, over: true, winner: "enemy", winReason: "leader_breach" };
    }

    if (eRow1Cards.length === 0 && pRow1Cards.length > 0) {
      const totalPAtk = pRow1Cards.reduce((s, c) => s + this.evalCardCombatCR(c, this.enemy.leader, "player", { attackingRow3: true }).total, 0);
      this.pushLog(`⚡ Hàng 1 địch TRỐNG! Tổng CR Hàng 1 (${totalPAtk}) công phá ${this.enemy.leader.name} Hàng 3 (${eRepEval.total} CR)!`);
      if (totalPAtk > eRepEval.total) {
        this.over = true;
        this.winner = "player";
        this.winReason = "leader_breach";
        this.pushLog(`👑 HẠ GỤC THỦ LĨNH HÀNG 3! (${totalPAtk} > ${eRepEval.total}) -> CHIẾN THẮNG!`);
        return { laneResults, over: true, winner: "player", winReason: "leader_breach" };
      } else {
        this.enemy.leader.battleDamageTaken = (this.enemy.leader.battleDamageTaken || 0) + Math.round(totalPAtk * 0.5);
        this.pushLog(`🛡️ Thủ lĩnh Hàng 3 ${this.enemy.leader.name} gắng gượng chống đỡ (mất ${Math.round(totalPAtk * 0.5)} CR)!`);
      }
    }

    if (pRow1Cards.length === 0 && eRow1Cards.length > 0) {
      const totalEAtk = eRow1Cards.reduce((s, c) => s + this.evalCardCombatCR(c, this.player.leader, "enemy", { attackingRow3: true }).total, 0);
      this.pushLog(`⚠️ Hàng 1 bạn TRỐNG! Tổng CR địch (${totalEAtk}) công kích ${this.player.leader.name} Hàng 3 (${pRepEval.total} CR)!`);
      if (totalEAtk > pRepEval.total) {
        this.over = true;
        this.winner = "enemy";
        this.winReason = "leader_breach";
        this.pushLog(`💀 GAME OVER! Thủ lĩnh Hàng 3 ${this.player.leader.name} thất thủ (${totalEAtk} > ${pRepEval.total})!`);
        return { laneResults, over: true, winner: "enemy", winReason: "leader_breach" };
      } else {
        this.player.leader.battleDamageTaken = (this.player.leader.battleDamageTaken || 0) + Math.round(totalEAtk * 0.5);
        this.pushLog(`💪 Thủ lĩnh ${this.player.leader.name} trụ vững nhưng chịu ${Math.round(totalEAtk * 0.5)} sát thương bào mòn!`);
      }
    }

    return { laneResults, over: false };
  }

  cleanupEndPhaseForSide(sideKey) {
    const s = this.getSide(sideKey);
    s.geneSurgeActiveThisTurn = false;
    s.directiveUsedThisTurn = false;
    s.leaderSkillBuffCR = 0;
    s.leaderSkillEnemyPenaltyCR = 0;
    s.ovalinaH1Active = false;
    s.leader.h1ActivatedThisTurn = false;
    s.leader.h1EffectActive = false;
    s.row1.forEach((u) => {
      if (!u) return;
      u.h1ActivatedThisTurn = false;
      u.h1EffectActive = false;
      u.tempBuffCR = 0;
      u.tempPenaltyCR = 0;
      u.nullifiedBuffs = false;
      u.halvedByEnemy = false;
      u.cannotAttackThisTurn = false;
    });
    s.row2.forEach((c) => {
      c.h2ActivatedThisTurn = false;
    });
  }

  executePlayerBattlePhase() {
    const chk = this.canEnterBattlePhase();
    if (!chk.ok) return chk;
    this.phase = "battle";
    this.turnHistory = [];
    this.lastNewTokens = [];
    const res = this.runLaneClashes();
    this.battleDoneThisTurn = true;
    if (!res.over) {
      this.phase = "end";
      this.pushLog(`⚔️ [Lượt ${this.turn} • Battle Phase] Giao chiến hoàn tất → Chuyển sang END PHASE. Hãy bấm '⏭️ END PHASE' để kết thúc lượt!`);
    }
    return { ok: true, ...res };
  }

  endPlayerTurn() {
    if (this.over) return { ok: false, over: true, winner: this.winner };

    // 1. Player 1 End Phase
    this.phase = "end";
    this.turnHistory = [];
    this.cleanupEndPhaseForSide("player");
    this.pushLog(`⏭️ [Lượt ${this.turn} • Player 1 End Phase] Kết thúc lượt Bạn → Chuyển lượt cho Địch (Player 2)!`);

    // 2. Player 2 (Enemy) Turn: Draw -> Summon & H2 -> Effect -> Battle Phase -> End Phase
    this.activeSide = "enemy";
    const eHasMeralina =
      this.enemy.meralinaDrawTwoActive ||
      this.enemy.row1.some((u) => u && u.id === "meralina") ||
      this.enemy.leader?.id === "meralina";
    const eDrawTarget = eHasMeralina ? 2 : 1;
    const eDrawn = this.drawCards("enemy", eDrawTarget);
    this.enemy.meralinaDrawTwoActive = false;

    const aiDeploys = this.aiExecuteTurnPhases();
    // Player 2 DOES have Battle Phase even on Turn 1!
    const enemyBattle = this.runLaneClashes();
    if (enemyBattle.over) {
      return { ok: true, aiDeploys, laneResults: enemyBattle.laneResults, over: true, winner: enemyBattle.winner, winReason: enemyBattle.winReason };
    }
    this.cleanupEndPhaseForSide("enemy");

    // 3. Advance to Next Turn -> Player 1 Draw Phase -> Summon Phase
    this.turn++;
    this.activeSide = "player";
    this.battleDoneThisTurn = false;
    this.phase = "draw";

    const pHasMeralinaDraw =
      this.player.meralinaDrawTwoActive ||
      this.player.row1.some((u) => u && u.id === "meralina") ||
      this.player.leader?.id === "meralina";
    const pDrawTarget = pHasMeralinaDraw ? 2 : 1;
    const pDrawn = this.drawCards("player", pDrawTarget);
    this.player.meralinaDrawTwoActive = false;

    const meralinaNote = pHasMeralinaDraw ? " [Hiệu ứng Meralina: Rút 2 lá!]" : "";
    const lockNote = this.player.summonLockedOnTurn === this.turn ? " ⚠️ [Khóa Triệu Hồi lượt này do Ovalina H2!]" : "";
    this.pushLog(`🌅 [Lượt ${this.turn} • DRAW → SUMMON PHASE] Rút +${pDrawn} lá${meralinaNote}${lockNote}.`);
    this.phase = "summon";

    const stalemate = this.turn > this.maxTurns || (
      this.player.hand.length === 0 && this.player.deck.length === 0 &&
      this.enemy.hand.length === 0 && this.enemy.deck.length === 0
    );
    if (stalemate) {
      this.over = true;
      this.winReason = "tiebreak";
      if (this.player.row2.length !== this.enemy.row2.length) {
        this.winner = this.player.row2.length > this.enemy.row2.length ? "player" : "enemy";
      } else {
        const pTotal = this.getRow1Cards("player").reduce((s, c) => s + c.cr, this.player.leader.cr - (this.player.leader.battleDamageTaken || 0));
        const eTotal = this.getRow1Cards("enemy").reduce((s, c) => s + c.cr, this.enemy.leader.cr - (this.enemy.leader.battleDamageTaken || 0));
        this.winner = pTotal >= eTotal ? "player" : "enemy";
      }
      this.pushLog(`⌛ Hết bài chiến thuật — phân định chung cuộc (${this.winner === "player" ? "Thắng" : "Thua"})!`);
      return { ok: true, aiDeploys, laneResults: enemyBattle.laneResults, over: true, winner: this.winner, winReason: "tiebreak", newTokens: this.lastNewTokens, playerDraws: pDrawn, enemyDraws: eDrawn };
    }

    return { ok: true, aiDeploys, laneResults: enemyBattle.laneResults, over: false, newTokens: this.lastNewTokens, playerDraws: pDrawn, enemyDraws: eDrawn };
  }

  resolveClashTurn() {
    if (this.over) return { ok: false, over: true, winner: this.winner };
    if (this.turn >= 2 && !this.battleDoneThisTurn) {
      const bRes = this.executePlayerBattlePhase();
      if (!bRes.ok) return bRes;
      if (bRes.over) return bRes;
    }
    return this.endPlayerTurn();
  }
}
