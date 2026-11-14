// ============================================================================
// CYCLE 12: AGE OF DOMINION — MARVEL SNAP × YU-GI-OH 3-ROW CARD ENGINE (v9)
// Rules:
// - Faction Lock: Leaders only command cards of their Faction (16-card deck).
// - Draw 2 Cards From Deck Every Turn End (4 opening hand).
// - Row 1 (3 Vertical Cosmic Lanes): Direct CR + Species/Faction combat + Breeding Conditionals.
// - Row 2 (Capture & Auto-Breeding Chambers):
//   * Loser of each vertical lane moves to WINNER's Row 2 (cannot return to Row 1).
//   * Male beats Female -> Female enters Winner's Row 2 in ACTIVE GESTATION,
//     rolling Token synthesis at Turn End DIRECTLY ONTO EMPTY ROW 1 LANES
//     (or reinforcing Row 1 allies if all 3 lanes are full) AND unlocking
//     Row 1 / Row 2 conditional passives of allied cards!
//   * Tamarite = 100% strong Token; Omni-Womb = multi-variant/twin Tokens + Row 2 boost;
//     Alien = 40%-96% random; Pure Human = 32% & -28% CR Debuff (canceled by Dick).
// - Row 3 (Outer Leader Slot): Protected while ANY card stays on Row 1.
// ============================================================================

import {
  CARD_BY_ID,
  resolveCard,
  buildFactionDeck,
  validateDeckForLeader,
  hybridToCard
} from "../data/cards.js";
import { FACTIONS } from "../data/lore.js";
import { RACE_STYLE } from "../data/characters.js";

const LANE_LOCATIONS = [
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

function makeInstance(card, ownerSide, uidNum) {
  return {
    ...card,
    uid: `${ownerSide}_${card.id}_${uidNum}`,
    ownerSide,
    deployedTurn: 0,
    breedingActive: false,
    sireCard: null,
    spawnCount: 0,
    captureLane: -1
  };
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
    sectorId = null,
    gameStateRef = null
  }) {
    this.hybrids = hybrids;
    this.difficulty = difficulty;
    this.sectorId = sectorId;
    this.gameStateRef = gameStateRef;
    this.uidCounter = 1;
    this.turn = 1;
    this.maxTurns = 24;
    this.log = [];
    this.lastNewTokens = [];
    this.over = false;
    this.winner = null; // "player" | "enemy"
    this.winReason = null; // "capture_3" | "leader_breach" | "tiebreak"
    this.selectedHandIdx = null;
    this.maxHandSize = 8;

    // Roll 3 Marvel-Snap-inspired Cosmic Locations for the 3 Vertical Lanes
    const shuffledLocs = shuffle(LANE_LOCATIONS);
    this.lanes = shuffledLocs.slice(0, 3);

    const pLeaderCard = resolveCard(playerLeaderId, hybrids) || CARD_BY_ID.arisia;
    const eLeaderCard = resolveCard(enemyLeaderId, []) || CARD_BY_ID.overlord;

    const legalPDeck = (playerDeckIds && playerDeckIds.length)
      ? validateDeckForLeader(playerDeckIds, pLeaderCard.id, hybrids)
      : buildFactionDeck(pLeaderCard.id, hybrids);
    const finalPDeckIds = legalPDeck.length >= 10 ? legalPDeck : buildFactionDeck(pLeaderCard.id, hybrids);

    const legalEDeck = (enemyDeckIds && enemyDeckIds.length)
      ? validateDeckForLeader(enemyDeckIds, eLeaderCard.id, [])
      : buildFactionDeck(eLeaderCard.id, []);
    const finalEDeckIds = legalEDeck.length >= 10 ? legalEDeck : buildFactionDeck(eLeaderCard.id, []);

    this.player = {
      side: "player",
      leader: makeInstance(pLeaderCard, "player", this.uidCounter++),
      row1: [null, null, null],
      row2: [],
      hand: [],
      totalTokensBred: 0,
      deck: shuffle(finalPDeckIds.map((id) => makeInstance(resolveCard(id, hybrids) || CARD_BY_ID.tr_syl_guard, "player", this.uidCounter++)))
    };

    this.enemy = {
      side: "enemy",
      leader: makeInstance(eLeaderCard, "enemy", this.uidCounter++),
      row1: [null, null, null],
      row2: [],
      hand: [],
      totalTokensBred: 0,
      deck: shuffle(finalEDeckIds.map((id) => makeInstance(resolveCard(id, []) || CARD_BY_ID.tr_wn_raider, "enemy", this.uidCounter++)))
    };

    // Draw 4 opening cards each (+2 drawn at end of every turn!)
    this.drawCards("player", 4);
    this.drawCards("enemy", 4);

    const pFacName = (FACTIONS[pLeaderCard.fac] && FACTIONS[pLeaderCard.fac].name) || pLeaderCard.fac;
    const eFacName = (FACTIONS[eLeaderCard.fac] && FACTIONS[eLeaderCard.fac].name) || eLeaderCard.fac;
    this.pushLog(`⚔️ Khai chiến 3 Làn! ${pLeaderCard.name} [${pFacName}] vs ${eLeaderCard.name} [${eFacName}]. Mỗi lượt rút 2 lá!`);
    this.pushLog(`💗 Luật Hàng 2: ♂ thắng ♀ -> Đưa sang Hàng 2, tự sinh Token lên HÀNG 1 & kích hoạt ĐK Hàng 1/2 cho đồng minh!`);
  }

  pushLog(msg) {
    this.log.push(msg);
    if (this.log.length > 70) this.log.shift();
  }

  getSide(sideKey) {
    return sideKey === "player" ? this.player : this.enemy;
  }

  getOpp(sideKey) {
    return sideKey === "player" ? this.enemy : this.player;
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
    const r2SymbiosisBonus = s.row2.reduce((sum, c) => sum + (c.row2Effect?.symbiosisR2Boost || 0), 0);
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
    if (!card) return { total: 0, base: 0, r1Bonus: 0, laneBonus: 0, leaderAura: 0, row2Aura: 0, penalty: 0, triggeredConditionals: [] };
    const s = this.getSide(sideKey);
    const opp = this.getOpp(sideKey);
    const oppKey = sideKey === "player" ? "enemy" : "player";
    const ctx = this.getSideBreedingContext(sideKey);
    const oppCtx = this.getSideBreedingContext(oppKey);

    const base = (card.cr || 100) + (card.tokenBoostCR || 0);
    const r1 = card.row1Effect || {};
    const oppR1 = (oppCard && oppCard.row1Effect) || {};
    const laneLoc = (typeof opts.laneIdx === "number" && this.lanes[opts.laneIdx]) ? this.lanes[opts.laneIdx] : null;

    const laneCancelsRacial = laneLoc && laneLoc.id === "outer_layer";
    const oppCancelsRacial = oppR1.id === "eris_reset" || (oppCard && oppCard.id === "tr_eris_arbiter");
    const cancelRacial = laneCancelsRacial || oppCancelsRacial;

    let r1Bonus = r1.bonusFlat || 0;
    let laneBonus = 0;
    const triggeredConditionals = [];
    if (card.tokenBoostCR > 0) {
      triggeredConditionals.push(`⚡ Củng Cố Token (+${card.tokenBoostCR} CR)`);
    }

    if (!cancelRacial) {
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

      // Generic fallback conditional evaluator for cards using r1.condType + r1.condBonus
      if (r1.condBonus && !triggeredConditionals.some((t) => t.includes(`+${r1.condBonus}`)) &&
          !["predita_will", "cr_gap_burst", "collector_harvest", "hyper_photon", "omni_host", "reformist_wave", "gotterfall_tactic"].includes(r1.id)) {
        if (this.isConditionMet(card, oppCard, sideKey)) {
          r1Bonus += r1.condBonus;
          triggeredConditionals.push(`✨ ĐK Hàng 1/2 (+${r1.condBonus} CR)`);
        }
      }

      // Row 1 Buff received BY spawned Tokens from Tamarite / Omni-Host allies on Row 1
      if (card.isToken) {
        const hasTamAura = s.row1.some((a) => a && a.uid !== card.uid && (a.row1Effect?.id === "hyper_photon" || a.row1Effect?.id === "omni_host"));
        if (hasTamAura) {
          r1Bonus += 90;
          triggeredConditionals.push("💖 Aura Thủ Lĩnh Token (+90 CR)");
        }
      }
    }

    // Cosmic Lane modifiers (Marvel Snap twist)
    if (laneLoc) {
      if (laneLoc.id === "kronea_bastion" && card.fac === "sylvarian") laneBonus += 80;
      else if (laneLoc.id === "predita_line" && (card.cr || 100) <= 600) laneBonus += 90;
      else if (laneLoc.id === "abyss_rift") {
        if (isNadirCard(card) || card.race === "demon") laneBonus += 90;
        else if ((card.cr || 100) < 800) laneBonus -= 40;
      }
    }

    // Opposing Debuffs (respecting CR >= 800 Immunity & Hinatian Blue Blood Guard)
    let penalty = 0;
    const isImmuneToDebuff = (card.cr || 100) >= 800 || r1.id === "blue_blood_guard" || r1.id === "omni_titan";
    if (!isImmuneToDebuff && oppCard) {
      if (oppR1.id === "abyss_terror") penalty += oppCtx.hasTokenOrBreed ? 200 : 120;
      else if (oppR1.id === "nadir_psionic") penalty += 70;
      else if (oppR1.id === "collector_harvest" && oppCtx.hasTokenOrBreed) penalty += 90;
      else if (oppCard.id === "tr_wn_natheron") penalty += 100;
      else if (oppCard.id === "tr_wn_raider" && card.fac === "sylvarian") penalty += 50;
    }

    const row2Aura = this.getRow2SupportAura(sideKey);
    const leaderAura = card.uid === s.leader.uid ? 0 : this.getRow3LeaderAura(sideKey, card);
    const diffScale = sideKey === "enemy" ? Math.round((this.difficulty - 1) * 35) : 0;

    const total = Math.max(40, base + r1Bonus + laneBonus + leaderAura + row2Aura + diffScale - penalty);
    return { total, base, r1Bonus, laneBonus, leaderAura, row2Aura, penalty, triggeredConditionals };
  }

  getRow1Cards(sideKey) {
    return this.getSide(sideKey).row1.filter(Boolean);
  }

  deployCardToRow1(handIdx, laneIdx) {
    if (this.over) return { ok: false, reason: "Trận đấu đã kết thúc." };
    const s = this.player;
    const card = s.hand[handIdx];
    if (!card) return { ok: false, reason: "Không tìm thấy thẻ trên tay." };
    if (card.fac !== s.leader.fac) {
      return { ok: false, reason: `Vi phạm phe phái: Thủ lĩnh ${s.leader.name} chỉ dùng thẻ phe ${s.leader.fac}!` };
    }
    if (laneIdx < 0 || laneIdx > 2) return { ok: false, reason: "Làn Hàng 1 không hợp lệ." };
    if (s.row1[laneIdx]) return { ok: false, reason: `Làn ${laneIdx + 1} đang có thẻ trấn giữ.` };

    s.hand.splice(handIdx, 1);
    card.deployedTurn = this.turn;
    s.row1[laneIdx] = card;
    this.selectedHandIdx = null;

    let bonusMsg = "";
    if (card.id === "ojamon" || card.id === "tr_eris_keeper") {
      const drawn = this.drawCards("player", 1);
      if (drawn > 0) bonusMsg = " (+rút 1 thẻ)";
    }

    this.pushLog(`🃏 Đặt ${card.name} (${card.gender === "Male" ? "♂" : "♀"} • CR ${card.cr}) vào Làn ${laneIdx + 1}${bonusMsg}.`);
    return { ok: true, card, laneIdx };
  }

  recallFromRow1(laneIdx) {
    if (this.over) return { ok: false };
    const card = this.player.row1[laneIdx];
    if (!card) return { ok: false, reason: "Làn trống." };
    if (card.deployedTurn !== this.turn) {
      return { ok: false, reason: "Thẻ sống sót từ lượt trước đang giữ vị trí Hàng 1." };
    }
    this.player.row1[laneIdx] = null;
    this.player.hand.push(card);
    return { ok: true, card };
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

    // Cross-card Row 2 Synergy: Omni-Womb / Symbiont / Dick on OTHER Row 2 slots (or Dick on Row 1/3) boosts chance!
    const ctx = this.getSideBreedingContext(resolvedSide);
    const otherSymbiosis = side.row2.reduce(
      (sum, other) => (other.uid !== captive.uid ? sum + (other.row2Effect?.symbiosisR2Boost || 0) : sum),
      0
    );
    chance += otherSymbiosis;
    if (ctx.hasDick && sire?.id !== "dick" && !(captive.row2Effect?.symbiosisR2Boost > 0)) {
      chance += 15;
    }

    const lane = typeof captive.captureLane === "number" ? this.lanes[captive.captureLane] : null;
    if (lane && lane.id === "pherone_nexus") {
      chance += 12;
    }

    // Strict rule: Non-Tamarite capped strictly at 0-99%!
    return Math.max(0, Math.min(99, chance));
  }

  // Generate 1 (or 2 if Omni-Womb Twin morph!) Token Hybrid card(s) from Row 2 active breeding pair
  // Spawns Token DIRECTLY ONTO empty Row 1 lane(s) (or reinforces Row 1 ally if Row 1 is full)!
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

      // Apply Human Pure / Unbuffed Negative CR% Debuff (canceled if Dick is present!)
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

      const tokenObj = {
        id: `tok_${this.turn}_${this.uidCounter}`,
        isToken: true,
        name: `${sire.name.split(" ")[0]}×${captive.name.split(" ")[0]} [${suffix}]`,
        fac: side.leader.fac, // Matches Owner Leader Faction & sits on Row 1
        species: morph ? `Omni-Token (${captive.species.split(" ")[0]})` : `Token (${sire.species.split(" ")[0]} × ${captive.species.split(" ")[0]})`,
        race: raceKey,
        gender,
        cr: finalCR,
        h: Number((((sire.h || 1.8) + (captive.h || 1.75)) / 2).toFixed(2)),
        auraA: styleA.aura,
        auraB: styleB.aura,
        parentsLabel: `${sire.name} ♂ × ${captive.name} ♀`,
        mutated: r2.tier === "tamarite" || Boolean(r2.omniWomb),
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

      // Priority 1: Spawn directly onto an open Row 1 Lane (prefer captureLane first!)
      const candidateOrder = [captive.captureLane, 0, 1, 2].filter((idx, i, arr) => idx >= 0 && idx <= 2 && arr.indexOf(idx) === i);
      const targetLane = candidateOrder.find((idx) => side.row1[idx] === null);

      if (targetLane !== undefined) {
        inst.deployedTurn = this.turn;
        inst.spawnedZone = "row1";
        inst.spawnedLane = targetLane;
        side.row1[targetLane] = inst;
      } else {
        // Row 1 completely full (all 3 lanes occupied) -> Reinforce weakest Row 1 ally CR directly!
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

  aiDeployRow1() {
    const e = this.enemy;
    const emptyLanes = [0, 1, 2].filter((idx) => e.row1[idx] === null);
    if (emptyLanes.length === 0 || e.hand.length === 0) return;

    const occupiedByPlayer = emptyLanes.filter((idx) => this.player.row1[idx] !== null);
    const otherEmpty = emptyLanes.filter((idx) => this.player.row1[idx] === null);
    const laneOrder = [...occupiedByPlayer, ...otherEmpty];

    for (const laneIdx of laneOrder) {
      if (e.hand.length === 0) break;
      const pCard = this.player.row1[laneIdx];
      let bestIdx = 0;
      let bestScore = -1;

      e.hand.forEach((c, idx) => {
        const eVal = this.evalCardCombatCR(c, pCard, "enemy", { laneIdx }).total;
        let score = eVal;
        if (pCard) {
          const pVal = this.evalCardCombatCR(pCard, c, "player", { laneIdx }).total;
          const bonusMaleHunt = (c.gender === "Male" && pCard.gender === "Female") ? 180 : 0;
          score = eVal > pVal ? 10000 - (eVal - pVal) + bonusMaleHunt : eVal;
        }
        if (score > bestScore) {
          bestScore = score;
          bestIdx = idx;
        }
      });

      const chosen = e.hand.splice(bestIdx, 1)[0];
      chosen.deployedTurn = this.turn;
      e.row1[laneIdx] = chosen;
      this.pushLog(`👁️ Đối thủ đặt ${chosen.name} (${chosen.gender === "Male" ? "♂" : "♀"} • CR ${chosen.cr}) vào Làn ${laneIdx + 1}.`);
    }
  }

  resolveClashTurn() {
    if (this.over) return { ok: false, over: true, winner: this.winner };

    const pHasAnyFront = this.getRow1Cards("player").length > 0;
    const pCanPlay = this.player.hand.length > 0;
    if (!pHasAnyFront && pCanPlay) {
      return { ok: false, reason: "Hãy đặt ít nhất 1 thẻ ra Hàng 1 trước khi Đấu Theo Chiều Dọc!" };
    }

    this.lastNewTokens = [];

    // 1. Enemy deploys into open Enemy Row 1 lanes
    this.aiDeployRow1();

    const laneResults = [];

    // 2. Vertical Lane Clashes (Lanes 0, 1, 2)
    for (let i = 0; i < 3; i++) {
      const pCard = this.player.row1[i];
      const eCard = this.enemy.row1[i];

      if (pCard && eCard) {
        const pEval = this.evalCardCombatCR(pCard, eCard, "player", { laneIdx: i });
        const eEval = this.evalCardCombatCR(eCard, pCard, "enemy", { laneIdx: i });

        if (pEval.total > eEval.total) {
          this.enemy.row1[i] = null;
          eCard.ownerSide = "captured_by_player";
          eCard.captureLane = i;
          if (pCard.gender === "Male" && eCard.gender === "Female") {
            eCard.breedingActive = true;
            eCard.sireCard = pCard;
            this.pushLog(`💗 Làn ${i + 1}: ${pCard.name} (♂ ${pEval.total}) thắng ${eCard.name} (♀ ${eEval.total}) -> Gửi sang Hàng 2 & kích hoạt Lai Tạo mỗi lượt! (${this.player.row2.length + 1}/3)`);
          } else {
            this.pushLog(`🏆 Làn ${i + 1}: ${pCard.name} (${pEval.total} CR) thắng ${eCard.name} (${eEval.total} CR) -> Bắt vào Hàng 2 ta! (${this.player.row2.length + 1}/3)`);
          }
          this.player.row2.push(eCard);
          laneResults.push({ lane: i, outcome: "player_win", pTotal: pEval.total, eTotal: eEval.total, captured: eCard.name, triggeredBreed: eCard.breedingActive });
        } else if (eEval.total > pEval.total) {
          this.player.row1[i] = null;
          pCard.ownerSide = "captured_by_enemy";
          pCard.captureLane = i;
          if (eCard.gender === "Male" && pCard.gender === "Female") {
            pCard.breedingActive = true;
            pCard.sireCard = eCard;
            this.pushLog(`💢 Làn ${i + 1}: ${eCard.name} (♂ ${eEval.total}) thắng ${pCard.name} (♀ ${pCard.cr}->${pEval.total}) -> Gửi sang Hàng 2 Địch & lai tạo mỗi lượt! (${this.enemy.row2.length + 1}/3)`);
          } else {
            this.pushLog(`💥 Làn ${i + 1}: ${eCard.name} (${eEval.total} CR) áp đảo ${pCard.name} (${pEval.total} CR) -> Đưa vào Hàng 2 Địch! (${this.enemy.row2.length + 1}/3)`);
          }
          this.enemy.row2.push(pCard);
          laneResults.push({ lane: i, outcome: "enemy_win", pTotal: pEval.total, eTotal: eEval.total, captured: pCard.name, triggeredBreed: pCard.breedingActive });
        } else {
          this.pushLog(`⚖️ Làn ${i + 1}: ${pCard.name} hòa ${eCard.name} tại ${pEval.total} CR — giữ nguyên vị trí.`);
          laneResults.push({ lane: i, outcome: "tie", pTotal: pEval.total, eTotal: eEval.total });
        }
      } else if (pCard && !eCard) {
        const pEval = this.evalCardCombatCR(pCard, null, "player", { laneIdx: i });
        laneResults.push({ lane: i, outcome: "player_hold", pTotal: pEval.total, eTotal: 0 });
      } else if (!pCard && eCard) {
        const eEval = this.evalCardCombatCR(eCard, null, "enemy", { laneIdx: i });
        laneResults.push({ lane: i, outcome: "enemy_hold", pTotal: 0, eTotal: eEval.total });
      }
    }

    // 3. Check Immediate 3-Capture Win/Loss Condition
    if (this.player.row2.length >= 3) {
      this.over = true;
      this.winner = "player";
      this.winReason = "capture_3";
      this.pushLog(`🎉 CHIẾN THẮNG! Đã bắt đủ 3 thẻ đối thủ vào Hàng 2!`);
      return { ok: true, laneResults, over: true, winner: "player", winReason: "capture_3" };
    }
    if (this.enemy.row2.length >= 3) {
      this.over = true;
      this.winner = "enemy";
      this.winReason = "capture_3";
      this.pushLog(`💀 THẤT BẠI! Bạn đã mất 3 thẻ vào Hàng 2 đối phương!`);
      return { ok: true, laneResults, over: true, winner: "enemy", winReason: "capture_3" };
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
        return { ok: true, laneResults, over: true, winner: "player", winReason: "leader_breach", row3Attack: { totalPAtk, repCR: eRepEval.total } };
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
        return { ok: true, laneResults, over: true, winner: "enemy", winReason: "leader_breach", row3Attack: { totalEAtk, repCR: pRepEval.total } };
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

    // 5B. END OF TURN: Draw 2 Cards from Deck for BOTH sides!
    const pDrawn = this.drawCards("player", 2);
    const eDrawn = this.drawCards("enemy", 2);
    if (pDrawn > 0 || eDrawn > 0) {
      this.pushLog(`🃏 Hết Lượt ${this.turn}: Rút +${pDrawn} lá từ Bộ Bài (Địch +${eDrawn}).`);
    }

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
      return { ok: true, laneResults, over: true, winner: this.winner, winReason: "tiebreak", newTokens: this.lastNewTokens, playerDraws: pDrawn, enemyDraws: eDrawn };
    }

    return { ok: true, laneResults, over: false, newTokens: this.lastNewTokens, playerDraws: pDrawn, enemyDraws: eDrawn };
  }
}
