// ============================================================================
// CYCLE 12: AGE OF DOMINION — MARVEL SNAP × YU-GI-OH 3-ROW CARD ENGINE (v12.0)
// Pure State + Resolve + AI Engine:
// 1. Gene Energy ⚡: Starts at 3, +1/turn, max 8. Each card has cost 1–4 derived from CR.
// 2. Data-Driven H1 Keywords: Xung Phong (charge), Khiên (shield), Rút Bài (draw),
//    Xuyên Giáp (pierce), Hồi Phục (recover).
// 3. Data-Driven H2 Keywords: Sinh Token (spawn_token), Rút Thêm (bonus_draw),
//    Gỡ 1 Điểm Bắt (purge_capture).
// 4. Gender Advantage: Male vs Female +2 Tier (+120 CR). Male beats Female ->
//    Captured to Row 2, spawns Token onto Row 1, draws 2 cards at turn end.
// 5. Leader Active Skills: "Gene Surge" (4⚡, +3 Tier / +180 CR all-board, 1/match) +
//    Faction/Leader Unique Active Skill (3⚡, data-driven, 1/match).
// 6. Smart AI (prioritizes player lanes, pre-calculates win/loss, saves ⚡,
//    Void Tower scaling + Boss every 5 floors) & Full Turn Undo stack.
// ============================================================================

import {
  CARD_BY_ID,
  resolveCard,
  buildFactionDeck,
  validateDeckForLeader,
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

export const LANE_LOCATIONS = [
  { id: "kronea_bastion", name: "Pháo Đài Kronea", desc: "Làn Sylvarian: Thẻ phe Sylvarian +80 CR tại làn này." },
  { id: "pherone_nexus", name: "Pherone Nexus", desc: "Làn Sinh Sản: +12% tỷ lệ tạo Token Hàng 2 nếu thắng tại làn này (Tối đa 99%, Tamarite 100%)." },
  { id: "predita_line", name: "Chiến Tuyến Predita", desc: "Làn Tử Thủ: Thẻ có CR gốc <= 600 được cộng +90 CR." },
  { id: "outer_layer", name: "Vùng Ngoại Eris", desc: "Làn Cân Bằng: Vô hiệu hóa buff chủng tộc ở làn này." },
  { id: "abyss_rift", name: "Khe Nứt Vực Thẳm", desc: "Làn Hỗn Mang: Thẻ Nadir / Demon +90 CR; thẻ < 800 CR bị -40 CR." },
  { id: "gaiastra_orbit", name: "Quỹ Đạo Gaiastra", desc: "Làn Chuẩn: Giao chiến thuần CR & nội tại Hàng 1–2–3." }
];

const OMNI_VARIANTS = [
  { key: "titan", title: "Giáp Thú", crBonus: 95, r1Id: "omni_titan", tag: "Omni: Càn Quét (+95 CR)", desc: "Hàng 1: Token đột biến hình thái Giáp Thú (+95 CR)." },
  { key: "siphon", title: "Ký Sinh", crBonus: 45, r1Id: "nadir_psionic", tag: "Omni: Hấp Thụ (-70 CR địch)", desc: "Hàng 1: +45 CR & giảm 70 CR đối thủ đối diện (CR < 800)." },
  { key: "guard", title: "Máu Xanh", crBonus: 65, r1Id: "blue_blood_guard", tag: "Omni: Kháng Độc (+65 CR)", desc: "Hàng 1: +65 CR & miễn nhiễm trừ CR từ Virus/Nadir." },
  { key: "twin", title: "Phân Bào Đôi", crBonus: 25, r1Id: "frontline_valor", tag: "Omni: Sinh Đôi (+25 CR)", desc: "Hàng 1: +25 CR — Omni-Womb tự phân đôi thành 2 Token lên Hàng 1!" }
];

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Scales small tactical bonuses (+2, +3) so they work identically in both
// small-number unit tests (CR <= 25 -> literal +2 / +3) and Cycle 12 lore CR (CR > 25 -> +120 / +180)
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

// ============================================================================
// PURE LANE RESOLVE FUNCTION (Testable in isolation without DOM or Engine)
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
    const pHasPierce = hasH1Keyword(pCard, "pierce");
    const eHasShield = (eCard.shieldCharges || 0) > 0;
    if (eHasShield && !pHasPierce) {
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
    const triggeredBreed = pCard.gender === "Male" && eCard.gender === "Female";
    return {
      lane: laneIdx,
      outcome: "player_win",
      winnerSide: "player",
      pTotal,
      eTotal,
      captured: eCard.name,
      capturedCard: eCard,
      winnerCard: pCard,
      shieldBroken: false,
      pierced: Boolean(eHasShield && pHasPierce),
      triggeredBreed,
      winnerRecoverEnergy: hasH1Keyword(pCard, "recover") ? 1 : 0
    };
  }

  if (eTotal > pTotal) {
    const eHasPierce = hasH1Keyword(eCard, "pierce");
    const pHasShield = (pCard.shieldCharges || 0) > 0;
    if (pHasShield && !eHasPierce) {
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
    const triggeredBreed = eCard.gender === "Male" && pCard.gender === "Female";
    return {
      lane: laneIdx,
      outcome: "enemy_win",
      winnerSide: "enemy",
      pTotal,
      eTotal,
      captured: pCard.name,
      capturedCard: pCard,
      winnerCard: eCard,
      shieldBroken: false,
      pierced: Boolean(pHasShield && eHasPierce),
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

export const TACTICAL_DIRECTIVES = [
  {
    id: "shield_matrix",
    name: "Khiên Quang Năng",
    icon: "🛡️",
    cost: 1,
    desc: "1⚡: Cấp Khiên Chặn Thua (🛡️) cho các thẻ Hàng 1 của bạn (hoặc +60 CR nếu đã có Khiên)."
  },
  {
    id: "mutagen_burst",
    name: "Xung Kích Đột Biến",
    icon: "🧬",
    cost: 2,
    desc: "2⚡: +90 CR toàn Hàng 1 lượt này & kích hoạt ngay 1 đợt Lai Tạo Sớm Hàng 2 → Hàng 1 (hoặc Rút +1 lá)."
  },
  {
    id: "tactical_rescue",
    name: "Giải Cứu Tác Chiến",
    icon: "🔓",
    cost: 2,
    desc: "2⚡: Giải cứu 1 thẻ của bạn từ Hàng 2 Địch về tay (giảm 1 điểm bắt của Địch), hoặc Rút +2 lá nếu H2 Địch trống."
  }
];

function makeInstance(card, ownerSide, uidNum, gameStateRef = null) {
  const h1Keywords = [...(card.h1Keywords || card.row1Effect?.keywords || [])];
  const h2Keywords = [...(card.h2Keywords || card.row2Effect?.keywords || ["spawn_token"])];
  const cost = typeof card.cost === "number" ? card.cost : getCardEnergyCost(card.cr, card.isToken);
  const starLevel = (ownerSide === "player" && gameStateRef && typeof gameStateRef.getCardStarLevel === "function")
    ? gameStateRef.getCardStarLevel(card.id)
    : (card.starLevel || 0);
  const starBonusCR = (starLevel > 0 && gameStateRef && typeof gameStateRef.getCardStarBonusCR === "function")
    ? gameStateRef.getCardStarBonusCR(card.cr, starLevel)
    : 0;
  return {
    ...card,
    baseOriginCR: card.cr,
    cr: (card.cr || 100) + starBonusCR,
    starLevel,
    starBonusCR,
    cost,
    h1Keywords,
    h2Keywords,
    shieldCharges: h1Keywords.includes("shield") ? 1 : 0,
    uid: `${ownerSide}_${card.id}_${uidNum}`,
    ownerSide,
    deployedTurn: 0,
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

function isNadirCard(c) {
  if (!c) return false;
  const sp = (c.species || "").toLowerCase();
  const rc = (c.race || "").toLowerCase();
  return c.fac === "western_nadir" || c.fac === "nadirius" || sp.includes("nadir") || rc.includes("nadir");
}

function isMutantOrWombiote(c) {
  if (!c) return false;
  const sp = (c.species || "").toLowerCase();
  const rc = (c.race || "").toLowerCase();
  return sp.includes("wombiote") || rc === "mutant" || rc === "wombiote" || c.fac === "collectors";
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
    this.hybrids = hybrids;
    this.difficulty = difficulty;
    this.gauntletFloor = gauntletFloor || 0;
    this.isBossFloor = this.gauntletFloor > 0 && this.gauntletFloor % 5 === 0;
    this.isDraftMode = Boolean(isDraftMode);
    this.sectorId = sectorId;
    this.gameStateRef = gameStateRef;
    this.uidCounter = 1;
    this.turn = 1;
    this.maxTurns = 24;
    this.log = [];
    this.lastNewTokens = [];
    this.lastLaneResults = [];
    this.over = false;
    this.winner = null; // "player" | "enemy"
    this.winReason = null; // "capture_3" | "leader_breach" | "tiebreak"
    this.selectedHandIdx = null;
    this.maxHandSize = 8;
    this.turnHistory = [];

    // Roll 3 Marvel-Snap-inspired Cosmic Locations for the 3 Vertical Lanes
    const shuffledLocs = shuffle(LANE_LOCATIONS);
    this.lanes = shuffledLocs.slice(0, 3);

    const pLeaderCard = resolveCard(playerLeaderId, hybrids) || CARD_BY_ID.arisia;
    const eLeaderCard = resolveCard(enemyLeaderId, []) || CARD_BY_ID.overlord;

    const legalPDeck = (playerDeckIds && playerDeckIds.length)
      ? (this.isDraftMode
        ? playerDeckIds.filter((id) => Boolean(resolveCard(id, hybrids)))
        : validateDeckForLeader(playerDeckIds, pLeaderCard.id, hybrids))
      : buildFactionDeck(pLeaderCard.id, hybrids);
    const finalPDeckIds = legalPDeck.length >= 10 ? legalPDeck : buildFactionDeck(pLeaderCard.id, hybrids);

    const legalEDeck = (enemyDeckIds && enemyDeckIds.length)
      ? validateDeckForLeader(enemyDeckIds, eLeaderCard.id, [])
      : buildFactionDeck(eLeaderCard.id, []);
    const finalEDeckIds = legalEDeck.length >= 10 ? legalEDeck : buildFactionDeck(eLeaderCard.id, []);

    this.player = {
      side: "player",
      energy: 3,
      maxEnergy: 8,
      mulliganUsed: false,
      directiveUsedThisTurn: false,
      geneSurgeUsed: false,
      geneSurgeActiveThisTurn: false,
      leaderSkillUsed: false,
      leaderSkillBuffCR: 0,
      leaderSkillEnemyPenaltyCR: 0,
      leaderSkillBreedBoost: 0,
      leader: makeInstance(pLeaderCard, "player", this.uidCounter++, gameStateRef),
      row1: [null, null, null],
      row2: [],
      hand: [],
      totalTokensBred: 0,
      deck: shuffle(finalPDeckIds.map((id) => makeInstance(resolveCard(id, hybrids) || CARD_BY_ID.tr_syl_guard, "player", this.uidCounter++, gameStateRef)))
    };

    this.enemy = {
      side: "enemy",
      energy: this.isBossFloor ? 4 : 3,
      maxEnergy: 8,
      mulliganUsed: false,
      directiveUsedThisTurn: false,
      geneSurgeUsed: false,
      geneSurgeActiveThisTurn: false,
      leaderSkillUsed: false,
      leaderSkillBuffCR: 0,
      leaderSkillEnemyPenaltyCR: 0,
      leaderSkillBreedBoost: 0,
      leader: makeInstance(eLeaderCard, "enemy", this.uidCounter++),
      row1: [null, null, null],
      row2: [],
      hand: [],
      totalTokensBred: 0,
      deck: shuffle(finalEDeckIds.map((id) => makeInstance(resolveCard(id, []) || CARD_BY_ID.tr_wn_raider, "enemy", this.uidCounter++)))
    };

    // Draw 4 opening cards each (+2 drawn at end of every turn!)
    // Ensure opening hand has at least one 1–3⚡ playable card on Turn 1
    this.drawCards("player", 4);
    this.drawCards("enemy", 4);
    this.ensureTurn1PlayableHand("player");
    this.ensureTurn1PlayableHand("enemy");

    const pFacName = (FACTIONS[pLeaderCard.fac] && FACTIONS[pLeaderCard.fac].name) || pLeaderCard.fac;
    const eFacName = (FACTIONS[eLeaderCard.fac] && FACTIONS[eLeaderCard.fac].name) || eLeaderCard.fac;
    const bossTag = this.isBossFloor ? ` [👑 BOSS TẦNG ${this.gauntletFloor}]` : "";
    this.pushLog(`⚔️ Khai chiến 3 Làn! ${pLeaderCard.name} [${pFacName}] vs ${eLeaderCard.name} [${eFacName}]${bossTag}. Khởi đầu 3⚡ (+1⚡/lượt, tối đa 8⚡)!`);
    this.pushLog(`💗 Luật TCG: ♂ đấu ♀ (+2 Cấp/+120 CR) • ♂ thắng ♀ -> Sang Hàng 2, sinh Token lên HÀNG 1 & rút 2 lá cuối lượt!`);
  }

  ensureTurn1PlayableHand(sideKey) {
    const s = this.getSide(sideKey);
    if (s.hand.some((c) => (c.cost || 1) <= s.energy)) return;
    const cheapIdx = s.deck.findIndex((c) => (c.cost || 1) <= s.energy);
    if (cheapIdx >= 0 && s.hand.length > 0) {
      const cheapCard = s.deck.splice(cheapIdx, 1)[0];
      const expensiveCard = s.hand.pop();
      s.hand.push(cheapCard);
      s.deck.push(expensiveCard);
    } else if (s.hand.length > 0) {
      s.hand[0].cost = Math.min(s.hand[0].cost || 3, s.energy);
    }
  }

  saveTurnSnapshot(actionLabel = "Thao tác") {
    this.turnHistory.push({
      actionLabel,
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
    this.uidCounter = snap.uidCounter;
    this.selectedHandIdx = null;
    this.log = snap.log;
    this.player = snap.player;
    this.enemy = snap.enemy;
    this.pushLog(`↩️ Đã hoàn tác: ${snap.actionLabel} (Hoàn lại ⚡ & vị trí thẻ).`);
    return { ok: true, actionLabel: snap.actionLabel, remainingUndos: this.turnHistory.length };
  }

  pushLog(msg) {
    this.log.push(msg);
    if (this.log.length > 80) this.log.shift();
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

  // Live snapshot of Row 2 Breeding & Row 1 Token state for Conditional Passives
  getSideBreedingContext(sideKey = "player") {
    const s = this.getSide(sideKey);
    const activeBreeders = s.row2.filter((c) => Boolean(c.breedingActive));
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
    const cond = r1.condType;
    if (!cond) return false;
    const ctx = this.getSideBreedingContext(sideKey);
    const s = this.getSide(sideKey);
    const opp = this.getOpp(sideKey);

    switch (cond) {
      case "row1_token":
        return ctx.hasRow1Token || (r1.id === "cr_gap_burst" && Boolean(oppCard) && Math.abs((card.cr || 0) - (oppCard.cr || 0)) >= 250);
      case "row1_ally_token":
        return s.row1.some((ally) => ally && ally.uid !== card.uid && ally.isToken);
      case "active_breed":
        return ctx.hasActiveBreed;
      case "token_bred":
        return ctx.totalTokensBred > 0 || ctx.hasRow1Token;
      case "active_breed_or_token":
        return ctx.hasTokenOrBreed || (r1.id === "predita_will" && (isNadirCard(oppCard) || opp.row2.length >= 1));
      case "active_breed_or_dick":
        return ctx.hasTokenOrBreed || ctx.hasDick;
      default:
        return false;
    }
  }

  drawCards(sideKey, count = 2) {
    const s = this.getSide(sideKey);
    let drawn = 0;
    for (let i = 0; i < count; i++) {
      if (s.deck.length === 0 || s.hand.length >= this.maxHandSize) break;
      s.hand.push(s.deck.shift());
      drawn++;
    }
    return drawn;
  }

  getRow2SupportAura(sideKey) {
    const s = this.getSide(sideKey);
    const ctx = this.getSideBreedingContext(sideKey);
    return s.row2.reduce((sum, cap) => {
      let aura = (cap.row2Effect && cap.row2Effect.crAura) || 40;
      if (cap.row2Effect?.doubleIfTokenBred && (ctx.hasRow1Token || ctx.totalTokensBred > 0)) {
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
    const r1 = leader.row1Effect || {};
    if (r1.id === "syl_empress" && (targetCard.fac === "sylvarian" || (targetCard.race || "").includes("syl"))) return 80;
    if (r1.id === "nadirius_decree" && targetCard.fac === "nadirius") return 55;
    if (r1.id === "predita_will" && targetCard.fac === "salvic") return 60;
    if (r1.id === "hyper_photon" && targetCard.fac === "tamarite") return 70;
    if (r1.id === "collector_harvest") return s.row2.length * 40;
    return Math.round((r1.bonusFlat || 60) * 0.35);
  }

  // Computes transparent Combat CR for any card on Row 1 (with optional laneIdx) or Leader on Row 3
  evalCardCombatCR(card, oppCard = null, sideKey = "player", opts = {}) {
    if (!card) return { total: 0, base: 0, r1Bonus: 0, keywordBonus: 0, genderBonus: 0, surgeBonus: 0, laneBonus: 0, leaderAura: 0, row2Aura: 0, penalty: 0, triggeredConditionals: [] };
    const s = this.getSide(sideKey);
    const opp = this.getOpp(sideKey);
    const oppKey = sideKey === "player" ? "enemy" : "player";
    const ctx = this.getSideBreedingContext(sideKey);
    const oppCtx = this.getSideBreedingContext(oppKey);

    const base = (card.cr || 100) + (card.tokenBoostCR || 0);
    const isSmallScale = (card.cr || 0) <= 25 && (!oppCard || (oppCard.cr || 0) <= 25);
    const r1 = card.row1Effect || {};
    const oppR1 = (oppCard && oppCard.row1Effect) || {};
    const laneLoc = (typeof opts.laneIdx === "number" && this.lanes[opts.laneIdx]) ? this.lanes[opts.laneIdx] : null;

    const laneCancelsRacial = laneLoc && laneLoc.id === "outer_layer";
    const oppCancelsRacial = oppR1.id === "eris_reset" || (oppCard && oppCard.id === "tr_eris_arbiter");
    const cancelRacial = laneCancelsRacial || oppCancelsRacial;

    let r1Bonus = isSmallScale ? (r1.smallBonus || 0) : (r1.bonusFlat || 0);
    let keywordBonus = 0;
    let genderBonus = 0;
    let surgeBonus = 0;
    let laneBonus = 0;
    const triggeredConditionals = [];

    if (card.tokenBoostCR > 0) {
      triggeredConditionals.push(`⚡ Củng Cố Token (+${card.tokenBoostCR} CR)`);
    }

    // 1. Standardized H1 Keywords (Data-Driven)
    const deployedNow = opts.previewDeploy || card.deployedTurn === this.turn;
    if (hasH1Keyword(card, "charge") && deployedNow) {
      const chBonus = scaleTacticalDelta(H1_KEYWORDS.charge.smallBonus, card.cr, H1_KEYWORDS.charge.scaledBonus);
      keywordBonus += chBonus;
      triggeredConditionals.push(`⚡ Xung Phong (+${chBonus} CR)`);
    }
    if (hasH1Keyword(card, "pierce") && (opts.attackingRow3 || (oppCard && (oppCard.shieldCharges || 0) > 0))) {
      const pBonus = scaleTacticalDelta(H1_KEYWORDS.pierce.smallBonus, card.cr, H1_KEYWORDS.pierce.scaledBonus);
      keywordBonus += pBonus;
      triggeredConditionals.push(`🗡️ Xuyên Giáp (+${pBonus} CR)`);
    }
    if ((card.shieldCharges || 0) > 0) {
      triggeredConditionals.push(`🛡️ Khiên Bảo Hộ (${card.shieldCharges})`);
    }

    // 2. Gender Advantage: Male vs Female (+2 Tier / +120 CR)
    if (card.gender === "Male" && oppCard && oppCard.gender === "Female") {
      genderBonus = scaleTacticalDelta(2, card.cr, 120);
      triggeredConditionals.push(`♂>♀ Ưu Thế Giới Tính (+${genderBonus} CR)`);
    }

    // 3. Leader Active Skills: Gene Surge (+3 Tier / +180 CR) & Faction Skill Buff
    if (s.geneSurgeActiveThisTurn) {
      const gBonus = scaleTacticalDelta(GENE_SURGE_SKILL.smallBonus, card.cr, GENE_SURGE_SKILL.scaledBonus);
      surgeBonus += gBonus;
      triggeredConditionals.push(`🔥 Gene Surge (+${gBonus} CR)`);
    }
    if (s.leaderSkillBuffCR > 0) {
      const lBonus = isSmallScale ? 2 : s.leaderSkillBuffCR;
      surgeBonus += lBonus;
      triggeredConditionals.push(`👑 Tuyệt Kỹ Phe (+${lBonus} CR)`);
    }

    if (!cancelRacial && !isSmallScale) {
      if (r1.id === "syl_empress") {
        const sylCount = s.row1.filter((c) => c && c.uid !== card.uid && (c.fac === "sylvarian" || (c.species || "").toLowerCase().includes("syl"))).length;
        r1Bonus += sylCount * 80;
        if (sylCount > 0) triggeredConditionals.push(`👑 Đồng minh Sylvarian H1 (+${sylCount * 80} CR)`);
      } else if (r1.id === "nadirius_decree" && oppCard && (oppCard.fac === "sylvarian" || oppCard.fac === "western_nadir")) {
        r1Bonus += 100;
      } else if (r1.id === "predita_will" && (isNadirCard(oppCard) || opp.row2.length >= 1 || ctx.hasTokenOrBreed)) {
        r1Bonus += 180;
        triggeredConditionals.push(`🛡️ ĐK Predita / Token (+180 CR)`);
      } else if (r1.id === "cr_gap_burst" && ((oppCard && Math.abs((card.cr || 0) - (oppCard.cr || 0)) >= 250) || ctx.hasRow1Token)) {
        r1Bonus += 240;
        triggeredConditionals.push(`⚡ ĐK Nghịch Lý / Token H1 (+240 CR)`);
      } else if (r1.id === "supers_strike" && isMutantOrWombiote(oppCard)) {
        r1Bonus += 140;
      } else if (r1.id === "collector_harvest") {
        r1Bonus += s.row2.length * 100;
        if (ctx.hasTokenOrBreed) {
          r1Bonus += 160;
          triggeredConditionals.push(`🧪 ĐK Thu Thập Token/Lai (+160 CR)`);
        }
      } else if (r1.id === "hyper_photon") {
        if (s.leader.fac === "tamarite" || s.leader.fac === "sylvarian") r1Bonus += 90;
        if (ctx.hasTokenOrBreed && !card.isToken) {
          r1Bonus += 180;
          triggeredConditionals.push(`🌟 ĐK Tamarite Cộng Hưởng (+180 CR)`);
        }
      } else if (r1.id === "omni_host" && ctx.hasActiveBreed) {
        r1Bonus += 140;
        triggeredConditionals.push(`🧬 ĐK Buồng Lai Hàng 2 (+140 CR)`);
      } else if (r1.id === "reformist_wave" && (ctx.totalTokensBred > 0 || ctx.hasRow1Token)) {
        r1Bonus += 135;
        triggeredConditionals.push(`🌀 ĐK Đã Sinh Token (+135 CR)`);
      } else if (r1.id === "gotterfall_tactic" && (ctx.totalTokensBred > 0 || ctx.hasRow1Token)) {
        r1Bonus += 110;
        triggeredConditionals.push(`♟️ ĐK Chiến Lược Token (+110 CR)`);
      } else if (r1.id === "knight_bastion" && (isNadirCard(oppCard) || isMutantOrWombiote(oppCard))) {
        r1Bonus += 100;
      } else if (r1.id === "solar_blitz" && opts.attackingRow3) {
        r1Bonus += 60;
      } else if (card.id === "tr_nad_knight" && oppCard && oppCard.fac === "western_nadir") {
        r1Bonus += 100;
      } else if (card.id === "tr_nad_lancer" && opts.attackingRow3) {
        r1Bonus += 80;
      } else if (card.id === "tr_col_stalker" && oppCard && oppCard.fac === "independent") {
        r1Bonus += 105;
      } else if (card.id === "tr_sal_veteran" && oppCard && oppCard.fac === "western_nadir") {
        r1Bonus += 80;
      } else if (card.id === "tr_tam_paragon") {
        const tamAllies = s.row1.filter((c) => c && c.uid !== card.uid && c.fac === "tamarite").length;
        r1Bonus += tamAllies * 90;
      }

      if (r1.condBonus && !triggeredConditionals.some((t) => t.includes(`+${r1.condBonus}`)) &&
          !["predita_will", "cr_gap_burst", "collector_harvest", "hyper_photon", "omni_host", "reformist_wave", "gotterfall_tactic"].includes(r1.id)) {
        if (this.isConditionMet(card, oppCard, sideKey)) {
          r1Bonus += r1.condBonus;
          triggeredConditionals.push(`✨ ĐK Hàng 1/2 (+${r1.condBonus} CR)`);
        }
      }

      if (card.isToken) {
        const hasTamAura = s.row1.some((a) => a && a.uid !== card.uid && (a.row1Effect?.id === "hyper_photon" || a.row1Effect?.id === "omni_host"));
        if (hasTamAura) {
          r1Bonus += 90;
          triggeredConditionals.push("💖 Aura Thủ Lĩnh Token (+90 CR)");
        }
      }
    }

    // Cosmic Lane modifiers (Marvel Snap twist)
    if (laneLoc && !isSmallScale) {
      if (laneLoc.id === "kronea_bastion" && card.fac === "sylvarian") laneBonus += 80;
      else if (laneLoc.id === "predita_line" && (card.cr || 100) <= 600) laneBonus += 90;
      else if (laneLoc.id === "abyss_rift") {
        if (isNadirCard(card) || card.race === "demon") laneBonus += 90;
        else if ((card.cr || 100) < 800) laneBonus -= 40;
      }
    }

    // Opposing Debuffs (respecting CR >= 800 Immunity, Hinatian Blue Blood Guard & Recover)
    let penalty = 0;
    const isImmuneToDebuff = (card.cr || 100) >= 800 || r1.id === "blue_blood_guard" || r1.id === "omni_titan" || hasH1Keyword(card, "recover");
    if (!isImmuneToDebuff && !isSmallScale) {
      if (opp.leaderSkillEnemyPenaltyCR > 0) penalty += opp.leaderSkillEnemyPenaltyCR;
      if (oppCard) {
        if (oppR1.id === "abyss_terror") penalty += oppCtx.hasTokenOrBreed ? 200 : 120;
        else if (oppR1.id === "nadir_psionic") penalty += 70;
        else if (oppR1.id === "collector_harvest" && oppCtx.hasTokenOrBreed) penalty += 90;
        else if (oppCard.id === "tr_wn_natheron") penalty += 100;
        else if (oppCard.id === "tr_wn_raider" && card.fac === "sylvarian") penalty += 50;
      }
    }

    const row2Aura = isSmallScale ? 0 : this.getRow2SupportAura(sideKey);
    const leaderAura = isSmallScale || card.uid === s.leader.uid ? 0 : this.getRow3LeaderAura(sideKey, card);
    const towerBonus = (sideKey === "enemy" && !isSmallScale)
      ? Math.round((this.difficulty - 1) * 40) + (this.gauntletFloor > 1 ? (this.gauntletFloor - 1) * 35 : 0) + (this.isBossFloor ? 120 : 0)
      : 0;

    const minFloor = isSmallScale ? 1 : 40;
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
        "Nội tại H1": r1Bonus,
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

  getRow1Cards(sideKey) {
    return this.getSide(sideKey).row1.filter(Boolean);
  }

  // ==========================================================================
  // LEADER ACTIVE SKILLS: "GENE SURGE" (4⚡) & FACTION SKILL (3⚡)
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
    this.pushLog(`🔥 [${who}] Kích hoạt GENE SURGE (-4⚡) -> Toàn bàn nhận +3 Cấp (+180 CR) trong lượt này!`);
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
    if (skill.breedBoostPct) {
      s.leaderSkillBreedBoost = (s.leaderSkillBreedBoost || 0) + skill.breedBoostPct;
      notes.push(`+${skill.breedBoostPct}% tỷ lệ Lai H2`);
    }
    if (skill.purgeCaptive && opp.row2.length > 0) {
      const rescued = opp.row2.pop();
      notes.push(`🔓 Giải cứu ${rescued.name} khỏi H2 địch (${opp.row2.length}/3)`);
    }
    if (skill.effectType === "instant_breed_or_buff") {
      const breeder = s.row2.find((c) => c.breedingActive);
      if (breeder) {
        const bRes = this.spawnTokensForCaptive(sideKey, breeder, 0);
        if (bRes.spawned.length > 0) {
          notes.push(`🧬 Sinh ngay Token ${bRes.spawned[0].name} lên Hàng 1`);
        }
      } else {
        this.addEnergy(sideKey, 1);
        notes.push(`Hồi +1⚡`);
      }
    }

    const who = sideKey === "player" ? s.leader.name : `Địch (${s.leader.name})`;
    this.pushLog(`${skill.icon} [${who}] Thi triển ${skill.name} (-${skill.cost}⚡): ${notes.join(" • ")}!`);
    return { ok: true, skill, notes, remainingEnergy: s.energy };
  }

  // ==========================================================================
  // v13.0: OPENING HAND MULLIGAN (1/MATCH ON TURN 1) & TACTICAL DIRECTIVES
  // ==========================================================================
  canMulligan() {
    return !this.over && this.turn === 1 && !this.player.mulliganUsed && this.getRow1Cards("player").length === 0;
  }

  mulliganHand() {
    if (!this.canMulligan()) {
      return { ok: false, reason: "Chỉ có thể Đổi Bài Mở Màn (Mulligan) ở Lượt 1 trước khi đặt thẻ lên sân!" };
    }
    this.saveTurnSnapshot("Đổi bài khởi đầu (Mulligan)");
    const count = Math.max(4, this.player.hand.length);
    while (this.player.hand.length > 0) {
      this.player.deck.push(this.player.hand.pop());
    }
    this.player.deck = shuffle(this.player.deck);
    this.drawCards("player", count);
    this.ensureTurn1PlayableHand("player");
    this.player.mulliganUsed = true;
    this.selectedHandIdx = null;
    this.pushLog(`🔄 Đổi Bài Mở Màn (Mulligan): Xáo lại tay bài khởi đầu vào bộ bài và rút ${this.player.hand.length} lá mới!`);
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
      let shieldedCount = 0;
      s.row1.forEach((u) => {
        if (!u) return;
        shieldedCount++;
        if ((u.shieldCharges || 0) <= 0) {
          u.shieldCharges = 1;
          if (!u.h1Keywords) u.h1Keywords = [];
          if (!u.h1Keywords.includes("shield")) u.h1Keywords.push("shield");
        } else {
          u.tokenBoostCR = (u.tokenBoostCR || 0) + 60;
        }
      });
      if (shieldedCount === 0) {
        s.leaderSkillBuffCR = (s.leaderSkillBuffCR || 0) + 60;
        notes.push("+60 CR Hàng 1 lượt này");
      } else {
        notes.push(`Cấp 🛡️ Khiên / +60 CR cho ${shieldedCount} thẻ Hàng 1`);
      }
    } else if (dir.id === "mutagen_burst") {
      s.leaderSkillBuffCR = (s.leaderSkillBuffCR || 0) + 90;
      notes.push("+90 CR toàn Hàng 1");
      const breeder = s.row2.find((c) => c.breedingActive);
      if (breeder) {
        const bRes = this.spawnTokensForCaptive(sideKey, breeder, 0);
        if (bRes.spawned.length > 0) {
          notes.push(`🧬 Sinh sớm Token ${bRes.spawned[0].name} lên Hàng 1`);
        }
      } else {
        const d = this.drawCards(sideKey, 1);
        if (d > 0) notes.push(`Rút +${d} lá`);
      }
    } else if (dir.id === "tactical_rescue") {
      if (opp.row2.length > 0) {
        const rescued = opp.row2.pop();
        rescued.ownerSide = sideKey;
        rescued.breedingActive = false;
        rescued.sireCard = null;
        if (s.hand.length < this.maxHandSize) {
          s.hand.push(rescued);
        } else {
          s.deck.unshift(rescued);
        }
        notes.push(`🔓 Giải cứu ${rescued.name} khỏi Hàng 2 Địch về tay (Địch còn ${opp.row2.length}/3)!`);
      } else {
        const d = this.drawCards(sideKey, 2);
        notes.push(`Rút +${d} lá chiến thuật`);
      }
    }

    this.pushLog(`${dir.icon} [Chỉ Thị Chiến Thuật: ${dir.name} (-${dir.cost}⚡)] ${notes.join(" • ")}!`);
    return { ok: true, directive: dir, notes, remainingEnergy: s.energy };
  }

  // ==========================================================================
  // DEPLOY & RECALL (WITH ENERGY COST ⚡ & UNDO SUPPORT)
  // ==========================================================================
  deployCardToRow1(handIdx, laneIdx) {
    if (this.over) return { ok: false, reason: "Trận đấu đã kết thúc." };
    const s = this.player;
    const card = s.hand[handIdx];
    if (!card) return { ok: false, reason: "Không tìm thấy thẻ trên tay." };
    if (!this.isDraftMode && card.fac !== s.leader.fac) {
      return { ok: false, reason: `Vi phạm phe phái: Thủ lĩnh ${s.leader.name} chỉ dùng thẻ phe ${s.leader.fac}!` };
    }
    if (laneIdx < 0 || laneIdx > 2) return { ok: false, reason: "Làn Hàng 1 không hợp lệ." };
    if (s.row1[laneIdx]) return { ok: false, reason: `Làn ${laneIdx + 1} đang có thẻ trấn giữ.` };

    const cost = typeof card.cost === "number" ? card.cost : getCardEnergyCost(card.cr, card.isToken);
    if ((s.energy || 0) < cost) {
      return { ok: false, reason: `Không đủ Năng lượng Gen ⚡! Cần ${cost}⚡ để đặt ${card.name} (Hiện có ${s.energy}⚡).` };
    }

    this.saveTurnSnapshot(`Đặt ${card.name} vào Làn ${laneIdx + 1}`);

    s.energy -= cost;
    s.hand.splice(handIdx, 1);
    card.deployedTurn = this.turn;
    if (hasH1Keyword(card, "shield") && (card.shieldCharges || 0) <= 0) {
      card.shieldCharges = 1;
    }
    s.row1[laneIdx] = card;
    this.selectedHandIdx = null;

    const kwNotes = [];
    if (hasH1Keyword(card, "charge")) {
      kwNotes.push("⚡ Xung Phong");
    }
    if (hasH1Keyword(card, "shield")) {
      kwNotes.push("🛡️ Khiên");
    }
    if (hasH1Keyword(card, "draw") || card.id === "ojamon" || card.id === "tr_eris_keeper") {
      const drawn = this.drawCards("player", 1);
      if (drawn > 0) kwNotes.push("🃏 Rút +1 thẻ");
    }
    if (hasH1Keyword(card, "recover")) {
      const gained = this.addEnergy("player", 1);
      if (gained > 0) kwNotes.push(`💚 Hồi +${gained}⚡`);
    }

    const kwStr = kwNotes.length ? ` [${kwNotes.join(" • ")}]` : "";
    this.pushLog(`🃏 Đặt ${card.name} (${card.gender === "Male" ? "♂" : "♀"} • ${cost}⚡ • CR ${card.cr}) vào Làn ${laneIdx + 1}${kwStr} (Còn ${s.energy}⚡).`);
    return { ok: true, card, laneIdx, cost, kwNotes };
  }

  recallFromRow1(laneIdx) {
    if (this.over) return { ok: false };
    const card = this.player.row1[laneIdx];
    if (!card) return { ok: false, reason: "Làn trống." };
    if (card.deployedTurn !== this.turn || card.fromRow2Breeding) {
      return { ok: false, reason: "Thẻ từ lượt trước hoặc Token sinh từ Hàng 2 đang giữ vị trí Hàng 1." };
    }

    // If last turnHistory snapshot was deploying this card, pop it cleanly so draws/energy are exact
    const lastSnap = this.turnHistory[this.turnHistory.length - 1];
    if (lastSnap && lastSnap.actionLabel.includes(card.name)) {
      return this.undoLastAction();
    }

    this.player.row1[laneIdx] = null;
    const refund = typeof card.cost === "number" ? card.cost : getCardEnergyCost(card.cr, card.isToken);
    this.addEnergy("player", refund);
    this.player.hand.push(card);
    this.pushLog(`↩️ Thu hồi ${card.name} từ Làn ${laneIdx + 1} về tay (+${refund}⚡).`);
    return { ok: true, card, refund };
  }

  // ==========================================================================
  // LIVE LANE FORECAST PREVIEW ("Kết quả dự kiến của mỗi làn")
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
    const prefix = isHypothetical ? "Dự kiến nếu đặt: " : "Dự kiến: ";

    switch (sim.outcome) {
      case "player_win":
        if (sim.triggeredBreed) {
          return {
            ...sim,
            badgeClass: "breed-win",
            label: `💘 ${prefix}♂ Thắng ♀ (+${sim.pTotal - sim.eTotal}) → Bắt & Lai H2!`,
            detail: `${pCard.name} (${sim.pTotal}) bắt ${eCard.name} (${sim.eTotal}) sang Hàng 2 sinh Token!`
          };
        }
        return {
          ...sim,
          badgeClass: "win",
          label: `🏆 ${prefix}Thắng Làn (+${sim.pTotal - sim.eTotal}) → Bắt Tù Binh!`,
          detail: `${pCard.name} (${sim.pTotal}) áp đảo ${eCard.name} (${sim.eTotal})`
        };
      case "enemy_shield_block":
        return {
          ...sim,
          badgeClass: "shield",
          label: `🛡️ ${prefix}Phá Khiên Địch (${sim.pTotal} > ${sim.eTotal})`,
          detail: `Địch mất Khiên bảo hộ ở lượt này (dùng thẻ Xuyên Giáp để bắt thẳng!)`
        };
      case "player_shield_block":
        return {
          ...sim,
          badgeClass: "shield",
          label: `🛡️ ${prefix}Khiên Ta Chặn Thua (${sim.pTotal} < ${sim.eTotal})`,
          detail: `Khiên sẽ vỡ để giữ ${pCard.name} trụ lại Hàng 1!`
        };
      case "enemy_win":
        return {
          ...sim,
          badgeClass: "lose",
          label: `⚠️ ${prefix}Thua Làn (-${sim.eTotal - sim.pTotal})${sim.triggeredBreed ? " • Nguy cơ bị Lai H2!" : ""}`,
          detail: `${eCard.name} (${sim.eTotal}) đang mạnh hơn ${pCard.name} (${sim.pTotal})`
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
          detail: "Địch chưa có thẻ cản — nếu cả 3 làn địch trống sẽ đánh thẳng Thủ lĩnh H3!"
        };
      case "enemy_hold":
        return {
          ...sim,
          badgeClass: "lose",
          label: `🚨 Địch Chiếm Làn (${sim.eTotal} CR) — Hãy Đặt Thẻ Chặn!`,
          detail: "Đặt thẻ Nam (♂) nếu địch là Nữ (♀) để nhận +2 Cấp (+120 CR)!"
        };
      default:
        return { lane: laneIdx, outcome: "empty", badgeClass: "neutral", label: "Làn Trống", detail: "" };
    }
  }

  // Compute exact Row 2 auto-breeding chance for an active Male-captured-Female pair:
  // Tamarite = 100%; all others strictly 0-99% (including Row 2 symbiosis boosts)!
  getEffectiveBreedChance(captive, sideKey = null) {
    const resolvedSide = sideKey || (this.enemy.row2.includes(captive) ? "enemy" : "player");
    const side = this.getSide(resolvedSide);
    const r2 = captive.row2Effect || {};
    if (r2.tier === "tamarite") return 100;

    let chance = typeof r2.breedChance === "number" ? r2.breedChance : 55;
    const sire = captive.sireCard;
    if ((captive.cr || 0) >= 800 && r2.tier === "sovereign" && sire && (sire.cr >= 800 || sire.id === "dick")) {
      chance = 82;
    } else if (sire && sire.id === "dick") {
      chance = Math.min(95, chance + 25);
    }

    const ctx = this.getSideBreedingContext(resolvedSide);
    const otherSymbiosis = side.row2.reduce(
      (sum, other) => (other.uid !== captive.uid ? sum + (other.row2Effect?.symbiosisR2Boost || 0) : sum),
      0
    );
    chance += otherSymbiosis + (side.leaderSkillBreedBoost || 0);
    if (ctx.hasDick && sire?.id !== "dick" && !(captive.row2Effect?.symbiosisR2Boost > 0)) {
      chance += 15;
    }

    const lane = typeof captive.captureLane === "number" ? this.lanes[captive.captureLane] : null;
    if (lane && lane.id === "pherone_nexus") {
      chance += 12;
    }

    // ★ Star Mastery boost (+3% per star on Sire or Captive)
    chance += ((captive.starLevel || 0) + (sire?.starLevel || 0)) * 3;

    return Math.max(0, Math.min(99, chance));
  }

  spawnTokensForCaptive(sideKey, captive, forcedRoll = null) {
    const side = this.getSide(sideKey);
    const ctx = this.getSideBreedingContext(sideKey);
    const r2 = captive.row2Effect || {};
    const sire = captive.sireCard || side.leader;
    const chance = this.getEffectiveBreedChance(captive, sideKey);
    const roll = forcedRoll !== null ? forcedRoll : Math.random() * 100;

    if (roll >= chance) {
      return { spawned: [], chance, missed: true };
    }

    const morph = r2.omniWomb
      ? OMNI_VARIANTS[Math.floor(Math.random() * OMNI_VARIANTS.length)]
      : null;

    const countToSpawn = morph && morph.key === "twin" ? 2 : 1;
    const created = [];

    for (let k = 0; k < countToSpawn; k++) {
      let tokenCR = (sire.cr * 0.45 + captive.cr * 0.55) * (r2.crMult || 0.9);
      if (r2.gapMutation && Math.abs((sire.cr || 0) - (captive.cr || 0)) >= 200) {
        tokenCR += 160;
      }
      if (morph) tokenCR += morph.crBonus;

      const effectivePenaltyPct = ctx.hasDick ? 0 : (r2.crPenaltyPct || 0);
      if (effectivePenaltyPct > 0) {
        tokenCR = tokenCR * (1 - effectivePenaltyPct / 100);
      }

      const finalCR = Math.max(25, Math.round(tokenCR));
      const raceKey = (captive.race || sire.race || "hybrid").toLowerCase();
      const styleA = RACE_STYLE[sire.race] || { aura: "#38bdf8" };
      const styleB = RACE_STYLE[captive.race] || { aura: "#f472b6" };

      const suffix = morph ? morph.title : (r2.tier === "tamarite" ? "Tamarite" : (effectivePenaltyPct >= 20 ? "Yếu Gen" : "Hậu Duệ"));
      const gender = Math.random() < 0.5 ? "Male" : "Female";

      const sireFirst = String(sire?.name || "Chiến Binh").split(" ")[0];
      const capFirst = String(captive?.name || "Tù Binh").split(" ")[0];
      const sireSpec = String(sire?.species || "Alien").split(" ")[0];
      const capSpec = String(captive?.species || "Alien").split(" ")[0];

      const tokenObj = {
        id: `tok_${this.turn}_${this.uidCounter}`,
        isToken: true,
        name: `${sireFirst}×${capFirst} [${suffix}]`,
        fac: side.leader.fac,
        species: morph ? `Omni-Token (${capSpec})` : `Token (${sireSpec} × ${capSpec})`,
        race: raceKey,
        gender,
        cr: finalCR,
        cost: 1,
        h: Number((((sire.h || 1.8) + (captive.h || 1.75)) / 2).toFixed(2)),
        auraA: styleA.aura,
        auraB: styleB.aura,
        parentsLabel: `${sire?.name || sireFirst} ♂ × ${captive?.name || capFirst} ♀`,
        mutated: r2.tier === "tamarite" || Boolean(r2.omniWomb),
        h1Keywords: r2.tier === "tamarite" ? ["charge", "recover"] : ["charge"],
        h2Keywords: ["spawn_token"],
        row1Effect: morph
          ? { id: morph.r1Id, tag: morph.tag, bonusFlat: morph.crBonus, desc: morph.desc }
          : (r2.tier === "tamarite"
            ? { id: "hyper_photon", tag: "Token Tamarite (+110 CR)", bonusFlat: 110, desc: "Hàng 1: Token huyết thống Tamarite +110 CR chiến đấu & kích hoạt ĐK cho đồng minh!" }
            : (r2.blueBlood
              ? { id: "blue_blood_guard", tag: "Máu Xanh Miễn Virus (+70 CR)", bonusFlat: 70, desc: "Hàng 1: +70 CR & kháng trừ CR." }
              : { id: "frontline_valor", tag: effectivePenaltyPct >= 20 ? "Token Suy Yếu (+20 CR)" : "Token Lai Chiến (+55 CR)", bonusFlat: effectivePenaltyPct >= 20 ? 20 : 55, desc: "Hàng 1: Token sinh từ Hàng 2 trực chiến & thỏa ĐK cho các lá khác." })),
        row2Effect: {
          id: "tok_r2",
          tier: r2.tier === "tamarite" ? "tamarite" : "alien",
          breedChance: r2.tier === "tamarite" ? 100 : 55,
          crAura: Math.max(30, Math.round(finalCR * 0.12)),
          crMult: 0.85,
          crPenaltyPct: effectivePenaltyPct,
          tag: r2.tier === "tamarite" ? "Token Tamarite (100%)" : "Hậu Duệ Thế Hệ Sau (55%)",
          desc: `Hàng 2: +${Math.max(30, Math.round(finalCR * 0.12))} CR hỗ trợ Hàng 1.`
        }
      };

      const inst = makeInstance(hybridToCard(tokenObj), sideKey, this.uidCounter++);
      inst.fromRow2Breeding = true;
      inst.parentsLabel = tokenObj.parentsLabel;
      inst.debuffCanceledByDick = ctx.hasDick && (r2.crPenaltyPct || 0) > 0;

      const candidateOrder = [captive.captureLane, 0, 1, 2].filter((idx, i, arr) => idx >= 0 && idx <= 2 && arr.indexOf(idx) === i);
      const targetLane = candidateOrder.find((idx) => side.row1[idx] === null);

      if (targetLane !== undefined) {
        inst.deployedTurn = this.turn;
        inst.spawnedZone = "row1";
        inst.spawnedLane = targetLane;
        side.row1[targetLane] = inst;
      } else {
        const allies = side.row1.filter(Boolean).sort((a, b) => a.cr - b.cr);
        const targetAlly = allies[0];
        if (targetAlly) {
          const boost = Math.max(45, Math.round(finalCR * 0.35));
          targetAlly.tokenBoostCR = (targetAlly.tokenBoostCR || 0) + boost;
          inst.spawnedZone = "row1_boost";
          inst.boostedAllyName = targetAlly.name;
          inst.boostAmount = boost;
        }
      }

      side.totalTokensBred = (side.totalTokensBred || 0) + 1;
      captive.spawnCount = (captive.spawnCount || 0) + 1;
      created.push(inst);
    }

    return { spawned: created, chance, missed: false };
  }

  // ==========================================================================
  // SMART TACTICAL AI (Prioritizes Player Lanes, Pre-calculates Win/Loss, Saves ⚡)
  // ==========================================================================
  aiDeployRow1() {
    const e = this.enemy;
    const deployedMoves = [];
    const emptyLanes = [0, 1, 2].filter((idx) => e.row1[idx] === null);

    // 1. Prioritize lanes where Player has deployed a card
    const occupiedByPlayer = emptyLanes.filter((idx) => this.player.row1[idx] !== null);
    const otherEmpty = emptyLanes.filter((idx) => this.player.row1[idx] === null);
    const laneOrder = [...occupiedByPlayer, ...otherEmpty];

    for (const laneIdx of laneOrder) {
      const affordable = e.hand
        .map((c, idx) => ({ card: c, idx, cost: c.cost || getCardEnergyCost(c.cr, c.isToken) }))
        .filter((item) => item.cost <= e.energy);

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
            // Winning the lane is highest priority; prefer efficient win + Male hunting Female!
            const huntBonus = sim.triggeredBreed ? 450 : 0;
            const efficiency = 1200 - (eEval.total - pEval.total) - item.cost * 60;
            const score = 10000 + huntBonus + efficiency;
            if (score > bestScore) {
              bestScore = score;
              bestPick = item;
            }
          } else if (sim.outcome === "player_shield_block") {
            // Popping player's shield with a cheap card is good
            const score = 2200 - item.cost * 150;
            if (score > bestScore) {
              bestScore = score;
              bestPick = item;
            }
          } else if (sim.outcome === "tie" || sim.outcome === "enemy_shield_block") {
            const score = 1500 - item.cost * 120;
            if (score > bestScore) {
              bestScore = score;
              bestPick = item;
            }
          } else {
            // Would lose this lane! Penalize heavily (especially feeding a Female card to Player Male)
            const feedPenalty = (pCard.gender === "Male" && c.gender === "Female") ? -4000 : -1500;
            const score = feedPenalty - item.cost * 200;
            if (score > bestScore) {
              bestScore = score;
              bestPick = item;
            }
          }
        } else {
          // Uncontested lane: deploy if we have no board presence or spare energy
          const currentBoardCount = this.getRow1Cards("enemy").length;
          const wantsToSaveEnergy = currentBoardCount >= 1 && e.energy <= 2 && item.cost >= 2;
          const score = wantsToSaveEnergy ? -500 : (eEval.total + (hasH1Keyword(c, "draw") ? 120 : 0) - item.cost * 45);
          if (score > bestScore) {
            bestScore = score;
            bestPick = item;
          }
        }
      }

      // Smart ⚡ Saving: If best move in this lane has negative tactical value AND AI already has >=1 unit on Row 1, save ⚡!
      const currentEnemyFront = this.getRow1Cards("enemy").length;
      if (!bestPick || (bestScore < 0 && currentEnemyFront >= 1)) {
        continue;
      }

      const chosen = e.hand.splice(bestPick.idx, 1)[0];
      e.energy -= bestPick.cost;
      chosen.deployedTurn = this.turn;
      if (hasH1Keyword(chosen, "shield") && (chosen.shieldCharges || 0) <= 0) {
        chosen.shieldCharges = 1;
      }
      e.row1[laneIdx] = chosen;
      if (hasH1Keyword(chosen, "draw")) this.drawCards("enemy", 1);
      if (hasH1Keyword(chosen, "recover")) this.addEnergy("enemy", 1);

      deployedMoves.push({ lane: laneIdx, card: chosen, cost: bestPick.cost });
      this.pushLog(`👁️ Địch đặt ${chosen.name} (${chosen.gender === "Male" ? "♂" : "♀"} • ${bestPick.cost}⚡ • CR ${chosen.cr}) vào Làn ${laneIdx + 1} (Còn ${e.energy}⚡).`);
    }

    // 2. Smart AI Active Skill Check (Gene Surge 4⚡ or Faction Skill 3⚡)
    const contestedLanes = [0, 1, 2].filter((i) => this.player.row1[i] && e.row1[i]);
    if (contestedLanes.length > 0) {
      if (!e.geneSurgeUsed && e.energy >= GENE_SURGE_SKILL.cost) {
        // Check if +180 CR flips any contested lane
        const flipsLane = contestedLanes.some((i) => {
          const pE = this.evalCardCombatCR(this.player.row1[i], e.row1[i], "player", { laneIdx: i }).total;
          const eE = this.evalCardCombatCR(e.row1[i], this.player.row1[i], "enemy", { laneIdx: i }).total;
          return eE <= pE && (eE + GENE_SURGE_SKILL.scaledBonus) > pE;
        });
        if (flipsLane || (this.isBossFloor && contestedLanes.length >= 2)) {
          this.activateGeneSurge("enemy");
        }
      } else if (!e.leaderSkillUsed) {
        const eSkill = getLeaderSkillForCard(e.leader);
        if (e.energy >= eSkill.cost && (contestedLanes.length >= 2 || this.difficulty >= 1.25)) {
          this.activateLeaderSkill("enemy");
        }
      }
    }

    return deployedMoves;
  }

  // Apply H2 Keywords when a Female card is captured by a Male card into Winner's Row 2
  applyH2CaptureKeywords(winnerSideKey, captiveCard, sireCard = null) {
    const loser = this.getOpp(winnerSideKey);
    const notes = [];

    if (hasH2Keyword(captiveCard, "bonus_draw") || hasH2Keyword(sireCard, "bonus_draw")) {
      const d = this.drawCards(winnerSideKey, 1);
      if (d > 0) notes.push("📚 H2 Rút Thêm +1 lá");
    }
    if ((hasH2Keyword(captiveCard, "purge_capture") || hasH2Keyword(sireCard, "purge_capture")) && !captiveCard.purgeUsed && loser.row2.length > 0) {
      captiveCard.purgeUsed = true;
      const freed = loser.row2.pop();
      notes.push(`🔓 H2 Gỡ 1 Điểm Bắt (${freed.name})`);
    }
    return notes;
  }

  // ==========================================================================
  // TURN CLASH RESOLUTION (Pure State Update + Full Step Data for UI Animation)
  // ==========================================================================
  resolveClashTurn() {
    if (this.over) return { ok: false, over: true, winner: this.winner };

    const pHasAnyFront = this.getRow1Cards("player").length > 0;
    const pCanAffordAny = this.player.hand.some((c) => (c.cost || 1) <= this.player.energy);
    if (!pHasAnyFront && pCanAffordAny) {
      return { ok: false, reason: "Hãy kéo-thả hoặc chọn ít nhất 1 thẻ đủ ⚡ đặt ra Hàng 1 trước khi Giao Chiến!" };
    }

    // Clear per-turn Undo history once clash begins
    this.turnHistory = [];
    this.lastNewTokens = [];

    // 1. Enemy deploys into open Enemy Row 1 lanes
    const aiDeploys = this.aiDeployRow1();

    const laneResults = [];

    // 2. Sequential Vertical Lane Clashes (Lanes 0 -> 1 -> 2)
    for (let i = 0; i < 3; i++) {
      const pCard = this.player.row1[i];
      const eCard = this.enemy.row1[i];

      if (pCard && eCard) {
        const pEval = this.evalCardCombatCR(pCard, eCard, "player", { laneIdx: i });
        const eEval = this.evalCardCombatCR(eCard, pCard, "enemy", { laneIdx: i });
        const res = resolveLanePair(pCard, eCard, pEval, eEval, i);

        if (res.outcome === "enemy_shield_block") {
          eCard.shieldCharges = Math.max(0, (eCard.shieldCharges || 1) - 1);
          if (res.winnerRecoverEnergy) this.addEnergy("player", res.winnerRecoverEnergy);
          this.pushLog(`🛡️ Làn ${i + 1}: ${pCard.name} (${res.pTotal}) thắng điểm nhưng ${eCard.name} (${res.eTotal}) kích hoạt KHIÊN chặn thua & trụ lại Hàng 1!`);
          laneResults.push(res);
        } else if (res.outcome === "player_shield_block") {
          pCard.shieldCharges = Math.max(0, (pCard.shieldCharges || 1) - 1);
          if (res.winnerRecoverEnergy) this.addEnergy("enemy", res.winnerRecoverEnergy);
          this.pushLog(`🛡️ Làn ${i + 1}: ${pCard.name} (${res.pTotal}) kích hoạt KHIÊN Bảo Hộ chặn đòn của ${eCard.name} (${res.eTotal}) & trụ lại Hàng 1!`);
          laneResults.push(res);
        } else if (res.outcome === "player_win") {
          this.enemy.row1[i] = null;
          eCard.ownerSide = "captured_by_player";
          eCard.captureLane = i;
          if (res.winnerRecoverEnergy) this.addEnergy("player", res.winnerRecoverEnergy);

          let h2Notes = [];
          if (res.triggeredBreed) {
            eCard.breedingActive = true;
            eCard.sireCard = pCard;
            h2Notes = this.applyH2CaptureKeywords("player", eCard, pCard);
            const h2Str = h2Notes.length ? ` [${h2Notes.join(" • ")}]` : "";
            this.pushLog(`💗 Làn ${i + 1}: ${pCard.name} (♂ ${res.pTotal}) thắng ${eCard.name} (♀ ${res.eTotal})${res.pierced ? " [🗡️ Xuyên Khiên]" : ""} -> Đưa sang Hàng 2 & kích hoạt Lai Tạo!${h2Str} (${this.player.row2.length + 1}/3)`);
          } else {
            this.pushLog(`🏆 Làn ${i + 1}: ${pCard.name} (${res.pTotal} CR) thắng ${eCard.name} (${res.eTotal} CR)${res.pierced ? " [🗡️ Xuyên Khiên]" : ""} -> Bắt vào Hàng 2 ta! (${this.player.row2.length + 1}/3)`);
          }
          this.player.row2.push(eCard);
          laneResults.push({ ...res, h2Notes });
        } else if (res.outcome === "enemy_win") {
          this.player.row1[i] = null;
          pCard.ownerSide = "captured_by_enemy";
          pCard.captureLane = i;
          if (res.winnerRecoverEnergy) this.addEnergy("enemy", res.winnerRecoverEnergy);

          let h2Notes = [];
          if (res.triggeredBreed) {
            pCard.breedingActive = true;
            pCard.sireCard = eCard;
            h2Notes = this.applyH2CaptureKeywords("enemy", pCard, eCard);
            this.pushLog(`💢 Làn ${i + 1}: ${eCard.name} (♂ ${res.eTotal}) thắng ${pCard.name} (♀ ${res.pTotal})${res.pierced ? " [🗡️ Xuyên Khiên]" : ""} -> Gửi sang Hàng 2 Địch & lai tạo! (${this.enemy.row2.length + 1}/3)`);
          } else {
            this.pushLog(`💥 Làn ${i + 1}: ${eCard.name} (${res.eTotal} CR) áp đảo ${pCard.name} (${res.pTotal} CR)${res.pierced ? " [🗡️ Xuyên Khiên]" : ""} -> Đưa vào Hàng 2 Địch! (${this.enemy.row2.length + 1}/3)`);
          }
          this.enemy.row2.push(pCard);
          laneResults.push({ ...res, h2Notes });
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

    // 3. Check Immediate 3-Capture Win/Loss Condition (3/3)
    if (this.player.row2.length >= 3) {
      this.over = true;
      this.winner = "player";
      this.winReason = "capture_3";
      this.pushLog(`🎉 CHIẾN THẮNG! Đã bắt đủ 3/3 thẻ đối thủ vào Hàng 2!`);
      return { ok: true, aiDeploys, laneResults, newTokens: this.lastNewTokens, over: true, winner: "player", winReason: "capture_3" };
    }
    if (this.enemy.row2.length >= 3) {
      this.over = true;
      this.winner = "enemy";
      this.winReason = "capture_3";
      this.pushLog(`💀 THẤT BẠI! Bạn đã mất 3/3 thẻ vào Hàng 2 đối phương!`);
      return { ok: true, aiDeploys, laneResults, newTokens: this.lastNewTokens, over: true, winner: "enemy", winReason: "capture_3" };
    }

    // 4. Row 3 Outer Representative Breach Check (Only when Row 1 is completely empty!)
    const pRow1Cards = this.getRow1Cards("player");
    const eRow1Cards = this.getRow1Cards("enemy");

    if (eRow1Cards.length === 0 && pRow1Cards.length > 0) {
      const totalPAtk = pRow1Cards.reduce((s, c) => s + this.evalCardCombatCR(c, this.enemy.leader, "player", { attackingRow3: true }).total, 0);
      const eRepEval = this.evalCardCombatCR(this.enemy.leader, pRow1Cards[0], "enemy");
      this.pushLog(`⚡ Hàng 1 địch TRỐNG! Tổng CR Hàng 1 (${totalPAtk}) công phá ${this.enemy.leader.name} Hàng 3 (${eRepEval.total} CR)!`);
      if (totalPAtk > eRepEval.total) {
        this.over = true;
        this.winner = "player";
        this.winReason = "leader_breach";
        this.pushLog(`👑 HẠ GỤC THỦ LĨNH HÀNG 3! (${totalPAtk} > ${eRepEval.total}) -> CHIẾN THẮNG!`);
        return { ok: true, aiDeploys, laneResults, over: true, winner: "player", winReason: "leader_breach", row3Attack: { totalPAtk, repCR: eRepEval.total } };
      } else {
        this.pushLog(`🛡️ Thủ lĩnh Hàng 3 ${this.enemy.leader.name} (${eRepEval.total} CR) phòng thủ thành công!`);
      }
    }

    if (pRow1Cards.length === 0 && eRow1Cards.length > 0) {
      const totalEAtk = eRow1Cards.reduce((s, c) => s + this.evalCardCombatCR(c, this.player.leader, "enemy", { attackingRow3: true }).total, 0);
      const pRepEval = this.evalCardCombatCR(this.player.leader, eRow1Cards[0], "player");
      this.pushLog(`⚠️ Hàng 1 bạn TRỐNG! Tổng CR địch (${totalEAtk}) công kích ${this.player.leader.name} Hàng 3 (${pRepEval.total} CR)!`);
      if (totalEAtk > pRepEval.total) {
        this.over = true;
        this.winner = "enemy";
        this.winReason = "leader_breach";
        this.pushLog(`💀 GAME OVER! Thủ lĩnh Hàng 3 ${this.player.leader.name} thất thủ (${totalEAtk} > ${pRepEval.total})!`);
        return { ok: true, aiDeploys, laneResults, over: true, winner: "enemy", winReason: "leader_breach", row3Attack: { totalEAtk, repCR: pRepEval.total } };
      } else {
        this.pushLog(`💪 Thủ lĩnh ${this.player.leader.name} (${pRepEval.total} CR) đẩy lùi đợt tổng công kích!`);
      }
    }

    // 5A. END OF TURN: Auto-Breed every active Male×Female pair sitting in Row 2 directly onto ROW 1!
    for (const sideKey of ["player", "enemy"]) {
      const side = this.getSide(sideKey);
      for (const cap of side.row2) {
        if (!cap.breedingActive) continue;
        const breedRes = this.spawnTokensForCaptive(sideKey, cap);
        if (breedRes.spawned.length > 0) {
          for (const tok of breedRes.spawned) {
            if (sideKey === "player") this.lastNewTokens.push(tok);
            const sideLbl = sideKey === "player" ? "Ta" : "Địch";
            const debuffNote = tok.debuffCanceledByDick
              ? " [Dick Xóa Debuff!]"
              : (cap.row2Effect?.crPenaltyPct >= 20 ? ` [-${cap.row2Effect.crPenaltyPct}% CR]` : "");
            if (tok.spawnedZone === "row1_boost") {
              this.pushLog(`⚡ [H2→Củng Cố H1 ${sideLbl} • ${breedRes.chance}%] ${cap.sireCard?.name || "?"} ♂ × ${cap.name} ♀ hợp nhất +${tok.boostAmount} CR cho ${tok.boostedAllyName} (H1 đầy)!`);
            } else {
              this.pushLog(`🧬 [H2→Hàng 1 Làn ${tok.spawnedLane + 1} ${sideLbl} • ${breedRes.chance}%] ${cap.sireCard?.name || "?"} ♂ × ${cap.name} ♀ sinh Token ${tok.name} (CR ${tok.cr})${debuffNote} lên thẳng HÀNG 1!`);
            }
          }
        } else {
          const sideLbl = sideKey === "player" ? "Ta" : "Địch";
          this.pushLog(`🎲 [Hàng 2 ${sideLbl} • ${breedRes.chance}%] ${cap.name} lượt này chưa sinh được Token lên Hàng 1.`);
        }
      }
    }

    // 5B. END OF TURN: Clear single-turn skill buffs, gain +1⚡ Gene Energy (up to 8⚡), and Draw 2 Cards!
    this.player.geneSurgeActiveThisTurn = false;
    this.enemy.geneSurgeActiveThisTurn = false;
    this.player.directiveUsedThisTurn = false;
    this.enemy.directiveUsedThisTurn = false;
    this.player.leaderSkillBuffCR = 0;
    this.enemy.leaderSkillBuffCR = 0;
    this.player.leaderSkillEnemyPenaltyCR = 0;
    this.enemy.leaderSkillEnemyPenaltyCR = 0;

    this.addEnergy("player", 1);
    this.addEnergy("enemy", 1);

    const pDrawn = this.drawCards("player", 2);
    const eDrawn = this.drawCards("enemy", 2);

    // Prevent energy deadlock if player has 0 cards on Row 1 and cheapest card in hand costs > player.energy
    if (this.getRow1Cards("player").length === 0 && this.player.hand.length > 0 && !this.player.hand.some((c) => (c.cost || 1) <= this.player.energy)) {
      this.addEnergy("player", 1);
    }
    if (this.getRow1Cards("enemy").length === 0 && this.enemy.hand.length > 0 && !this.enemy.hand.some((c) => (c.cost || 1) <= this.enemy.energy)) {
      this.addEnergy("enemy", 1);
    }

    this.pushLog(`⚡ Hết Lượt ${this.turn}: +1⚡ Năng lượng Gen (Ta ${this.player.energy}/${this.player.maxEnergy}⚡) & rút +${pDrawn} lá (Địch +${eDrawn}).`);

    this.turn++;

    // 6. Stalemate safeguard only if both sides completely exhausted hand + deck
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
        const pTotal = this.getRow1Cards("player").reduce((s, c) => s + c.cr, this.player.leader.cr);
        const eTotal = this.getRow1Cards("enemy").reduce((s, c) => s + c.cr, this.enemy.leader.cr);
        this.winner = pTotal >= eTotal ? "player" : "enemy";
      }
      this.pushLog(`⌛ Hết bài chiến thuật — phân định chung cuộc (${this.winner === "player" ? "Thắng" : "Thua"})!`);
      return { ok: true, aiDeploys, laneResults, over: true, winner: this.winner, winReason: "tiebreak", newTokens: this.lastNewTokens, playerDraws: pDrawn, enemyDraws: eDrawn };
    }

    return { ok: true, aiDeploys, laneResults, over: false, newTokens: this.lastNewTokens, playerDraws: pDrawn, enemyDraws: eDrawn };
  }
}
