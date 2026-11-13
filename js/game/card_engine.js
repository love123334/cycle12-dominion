// ============================================================================
// CYCLE 12: AGE OF DOMINION — FACTION & 3-ROW CR CARD BATTLE ENGINE (v6)
// Rules:
// - Faction Lock: Leaders only command cards of their own Faction.
// - Row 1 (3 Vertical Lanes): Direct combat using CR + Species/Faction Lore Effects.
// - Row 2 (Capture & Support/Breeding Zone): Losers of vertical clashes move
//   to the WINNER's Row 2. They CANNOT be summoned to Row 1; instead they
//   grant Support CR Aura & enable Field Breeding into your Faction Hand.
// - Row 3 (Outer Representative Slot): Holds each Leader. Protected while ANY
//   card remains on Row 1. Once Row 1 is empty, Attacker's Total Row 1 CR vs
//   Defender Leader Effective CR resolves — if Total Row 1 CR wins, Game Over!
// - Also ends immediately when either side captures 3 enemy cards into Row 2.
// ============================================================================

import {
  CARD_BY_ID,
  resolveCard,
  buildFactionDeck,
  validateDeckForLeader,
  hybridToCard
} from "../data/cards.js";
import { FACTIONS } from "../data/lore.js";
import { executeBreeding } from "./breeding.js";

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
    bredUsed: false
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
    this.over = false;
    this.winner = null; // "player" | "enemy"
    this.winReason = null; // "capture_3" | "leader_breach" | "tiebreak"
    this.selectedHandIdx = null;

    const pLeaderCard = resolveCard(playerLeaderId, hybrids) || CARD_BY_ID.arisia;
    const eLeaderCard = resolveCard(enemyLeaderId, []) || CARD_BY_ID.overlord;

    const legalPDeck = (playerDeckIds && playerDeckIds.length)
      ? validateDeckForLeader(playerDeckIds, pLeaderCard.id, hybrids)
      : buildFactionDeck(pLeaderCard.id, hybrids);
    const finalPDeckIds = legalPDeck.length >= 6 ? legalPDeck : buildFactionDeck(pLeaderCard.id, hybrids);

    const legalEDeck = (enemyDeckIds && enemyDeckIds.length)
      ? validateDeckForLeader(enemyDeckIds, eLeaderCard.id, [])
      : buildFactionDeck(eLeaderCard.id, []);
    const finalEDeckIds = legalEDeck.length >= 6 ? legalEDeck : buildFactionDeck(eLeaderCard.id, []);

    this.player = {
      side: "player",
      leader: makeInstance(pLeaderCard, "player", this.uidCounter++),
      row1: [null, null, null],
      row2: [], // Captives won from Enemy (max 3 -> Instant Victory)
      hand: [],
      deck: shuffle(finalPDeckIds.map((id) => makeInstance(resolveCard(id, hybrids) || CARD_BY_ID.tr_syl_guard, "player", this.uidCounter++))),
      placedThisTurn: 0,
      fieldBreedUsedThisTurn: false
    };

    this.enemy = {
      side: "enemy",
      leader: makeInstance(eLeaderCard, "enemy", this.uidCounter++),
      row1: [null, null, null],
      row2: [], // Captives won from Player (max 3 -> Instant Defeat)
      hand: [],
      deck: shuffle(finalEDeckIds.map((id) => makeInstance(resolveCard(id, []) || CARD_BY_ID.tr_wn_raider, "enemy", this.uidCounter++))),
      placedThisTurn: 0,
      fieldBreedUsedThisTurn: false
    };

    // Draw initial 5 cards each
    this.drawCards("player", 5);
    this.drawCards("enemy", 5);

    const pFacName = (FACTIONS[pLeaderCard.fac] && FACTIONS[pLeaderCard.fac].name) || pLeaderCard.fac;
    const eFacName = (FACTIONS[eLeaderCard.fac] && FACTIONS[eLeaderCard.fac].name) || eLeaderCard.fac;
    this.pushLog(`⚔️ Khai chiến 3 Hàng! Thủ lĩnh ${pLeaderCard.name} [${pFacName}] đối đầu ${eLeaderCard.name} [${eFacName}].`);
    this.pushLog(`📜 Đặt tối đa 3 lá cùng phe ra Hàng 1, sau đó bấm Đấu Theo Chiều Dọc.`);
  }

  pushLog(msg) {
    this.log.push(msg);
    if (this.log.length > 60) this.log.shift();
  }

  getSide(sideKey) {
    return sideKey === "player" ? this.player : this.enemy;
  }

  getOpp(sideKey) {
    return sideKey === "player" ? this.enemy : this.player;
  }

  drawCards(sideKey, count = 1) {
    const s = this.getSide(sideKey);
    let drawn = 0;
    for (let i = 0; i < count; i++) {
      if (s.deck.length === 0 || s.hand.length >= 6) break;
      s.hand.push(s.deck.shift());
      drawn++;
    }
    return drawn;
  }

  getRow2SupportAura(sideKey) {
    const s = this.getSide(sideKey);
    return s.row2.reduce((sum, cap) => sum + ((cap.row2Effect && cap.row2Effect.crAura) || 60), 0);
  }

  getRow3LeaderAura(sideKey, targetCard) {
    const s = this.getSide(sideKey);
    const leader = s.leader;
    if (!leader || !targetCard || targetCard.uid === leader.uid) return 0;
    const r1 = leader.row1Effect || {};
    let aura = 0;
    // Row 3 leader passively projects command aura onto Row 1 frontline
    if (r1.id === "syl_empress" && (targetCard.fac === "sylvarian" || (targetCard.race || "").includes("syl"))) {
      aura += 80;
    } else if (r1.id === "nadirius_decree" && targetCard.fac === "nadirius") {
      aura += 55;
    } else if (r1.id === "predita_will" && targetCard.fac === "salvic") {
      aura += 60;
    } else if (r1.id === "hyper_photon" && targetCard.fac === "tamarite") {
      aura += 70;
    } else if (r1.id === "collector_harvest") {
      aura += s.row2.length * 40;
    } else {
      aura += Math.round((r1.bonusFlat || 60) * 0.35);
    }
    return aura;
  }

  // Computes transparent Combat CR for any card on Row 1 or Leader on Row 3
  evalCardCombatCR(card, oppCard = null, sideKey = "player", opts = {}) {
    if (!card) return { total: 0, base: 0, r1Bonus: 0, leaderAura: 0, row2Aura: 0, penalty: 0 };
    const s = this.getSide(sideKey);
    const opp = this.getOpp(sideKey);
    const base = card.cr || 100;
    const r1 = card.row1Effect || {};
    const oppR1 = (oppCard && oppCard.row1Effect) || {};

    // Check if opponent nullifies racial bonuses (Emma's Outer Layer Loop or Eris Arbiter)
    const oppCancelsRacial = oppR1.id === "eris_reset" || (oppCard && oppCard.id === "tr_eris_arbiter");

    let r1Bonus = r1.bonusFlat || 0;

    // Specific Row 1 & Row 3 Lore Passives
    if (!oppCancelsRacial) {
      if (r1.id === "syl_empress") {
        const sylCount = s.row1.filter((c) => c && c.uid !== card.uid && (c.fac === "sylvarian" || (c.species || "").toLowerCase().includes("syl"))).length;
        r1Bonus += sylCount * 80;
      } else if (r1.id === "nadirius_decree" && oppCard && (oppCard.fac === "sylvarian" || oppCard.fac === "western_nadir")) {
        r1Bonus += 100;
      } else if (r1.id === "predita_will" && (isNadirCard(oppCard) || opp.row2.length >= 1)) {
        r1Bonus += 180;
      } else if (r1.id === "cr_gap_burst" && oppCard && Math.abs(base - (oppCard.cr || 0)) >= 250) {
        r1Bonus += 240;
      } else if (r1.id === "supers_strike" && isMutantOrWombiote(oppCard)) {
        r1Bonus += 140;
      } else if (r1.id === "collector_harvest") {
        r1Bonus += s.row2.length * 100;
      } else if (r1.id === "hyper_photon" && (s.leader.fac === "tamarite" || s.leader.fac === "sylvarian")) {
        r1Bonus += 90;
      } else if (r1.id === "knight_bastion" && (isNadirCard(oppCard) || isMutantOrWombiote(oppCard))) {
        r1Bonus += 100;
      } else if (r1.id === "solar_blitz" && opts.attackingRow3) {
        r1Bonus += 60;
      } else if (card.id === "tr_nad_knight" && oppCard && oppCard.fac === "western_nadir") {
        r1Bonus += 100;
      } else if (card.id === "tr_nad_lancer" && opts.attackingRow3) {
        r1Bonus += 80;
      } else if (card.id === "tr_col_ultrabot" && s.row2.length >= 1) {
        r1Bonus += 75;
      } else if (card.id === "tr_col_stalker" && oppCard && oppCard.fac === "independent") {
        r1Bonus += 105;
      } else if (card.id === "tr_sal_veteran" && oppCard && oppCard.fac === "western_nadir") {
        r1Bonus += 80;
      } else if (card.id === "tr_tam_paragon") {
        const tamAllies = s.row1.filter((c) => c && c.uid !== card.uid && c.fac === "tamarite").length;
        r1Bonus += tamAllies * 90;
      }
    }

    // Opposing Debuffs (respecting CR >= 800 Sovereign Immunity & Hinatian Blue Blood Guard)
    let penalty = 0;
    const isImmuneToDebuff = base >= 800 || r1.id === "blue_blood_guard";
    if (!isImmuneToDebuff && oppCard) {
      if (oppR1.id === "abyss_terror") penalty += 120;
      else if (oppR1.id === "nadir_psionic") penalty += 70;
      else if (oppCard.id === "tr_wn_natheron") penalty += 100;
      else if (oppCard.id === "tr_wn_raider" && card.fac === "sylvarian") penalty += 50;
    }

    const row2Aura = this.getRow2SupportAura(sideKey);
    const leaderAura = card.uid === s.leader.uid ? 0 : this.getRow3LeaderAura(sideKey, card);
    const diffScale = sideKey === "enemy" ? Math.round((this.difficulty - 1) * 35) : 0;

    const total = Math.max(50, base + r1Bonus + leaderAura + row2Aura + diffScale - penalty);
    return {
      total,
      base,
      r1Bonus,
      leaderAura,
      row2Aura,
      penalty
    };
  }

  isRow1Empty(sideKey) {
    return this.getSide(sideKey).row1.every((c) => c === null);
  }

  getRow1Cards(sideKey) {
    return this.getSide(sideKey).row1.filter(Boolean);
  }

  // Player places a card from hand onto Row 1 lane (0, 1, or 2)
  deployCardToRow1(handIdx, laneIdx) {
    if (this.over) return { ok: false, reason: "Trận đấu đã kết thúc." };
    const s = this.player;
    const card = s.hand[handIdx];
    if (!card) return { ok: false, reason: "Không tìm thấy thẻ trên tay." };
    if (card.fac !== s.leader.fac) {
      return { ok: false, reason: `Vi phạm phe phái: Thủ lĩnh ${s.leader.name} chỉ điều khiển được thẻ phe ${s.leader.fac}!` };
    }
    if (laneIdx < 0 || laneIdx > 2) return { ok: false, reason: "Làn Hàng 1 không hợp lệ." };
    if (s.row1[laneIdx]) return { ok: false, reason: `Làn ${laneIdx + 1} đang có thẻ trấn giữ.` };

    s.hand.splice(handIdx, 1);
    card.deployedTurn = this.turn;
    s.row1[laneIdx] = card;
    s.placedThisTurn++;
    this.selectedHandIdx = null;

    // On-deploy draw hooks (Ojamon / Eris Chronos Keeper)
    let bonusMsg = "";
    if (card.id === "ojamon" || card.id === "tr_eris_keeper") {
      const drawn = this.drawCards("player", 1);
      if (drawn > 0) bonusMsg = " (+rút 1 thẻ)";
    }

    this.pushLog(`🃏 Đặt ${card.name} (CR ${card.cr}) vào Hàng 1 - Làn ${laneIdx + 1}${bonusMsg}.`);
    return { ok: true, card, laneIdx };
  }

  // Player can pull back a card placed THIS turn before clicking Clash
  recallFromRow1(laneIdx) {
    if (this.over) return { ok: false };
    const card = this.player.row1[laneIdx];
    if (!card) return { ok: false, reason: "Ô trống." };
    if (card.deployedTurn !== this.turn) {
      return { ok: false, reason: "Thẻ sống sót từ lượt trước đang khóa vị trí Hàng 1." };
    }
    this.player.row1[laneIdx] = null;
    this.player.hand.push(card);
    this.player.placedThisTurn = Math.max(0, this.player.placedThisTurn - 1);
    return { ok: true, card };
  }

  // Row 2 Breeding Effect: Synthesize a playable Hybrid card from a captured card in Row 2!
  breedFromRow2(captiveIdx) {
    if (this.over) return { ok: false, reason: "Trận đã kết thúc." };
    const p = this.player;
    if (p.fieldBreedUsedThisTurn) {
      return { ok: false, reason: "Mỗi lượt chỉ kích hoạt Lai Tạo Tại Trận Hàng 2 được 1 lần." };
    }
    const captive = p.row2[captiveIdx];
    if (!captive) return { ok: false, reason: "Không tìm thấy tù binh ở Hàng 2." };
    if (captive.bredUsed) return { ok: false, reason: `${captive.name} đã hoàn tất chu kỳ lai tạo trận này.` };

    // Sovereign CR >= 800 Immunity unless Dick Pierce bypass or Cosmic Leader >= 850 CR
    const hasBypass = captive.id === "dick" ||
      (p.leader.id === "dick") ||
      p.row2.some((c) => c.row2Effect && c.row2Effect.bypassImmunity) ||
      p.leader.cr >= 850;
    if ((captive.cr || 0) >= 800 && !hasBypass) {
      return {
        ok: false,
        reason: `Gen của ${captive.name} (CR ${captive.cr} >= 800) miễn nhiễm Lai Tạo cưỡng chế! (Cần Dick Pierce hoặc Thủ Lĩnh >= 850 CR).`
      };
    }

    // Generate Faction-pure Hybrid card directly into Hand!
    const mutBonus = (captive.row2Effect && captive.row2Effect.mutBonus) || 20;
    let hybridCard = null;

    // If Story GameState is linked and both have genetic profiles, try persistent Breeding Lab record!
    if (this.gameStateRef && !captive.isHybrid && !captive.troopId && !p.leader.isHybrid && !p.leader.troopId) {
      const catId = (captive.row2Effect && captive.row2Effect.id === "r2_mutator") ? "cat_mutagen" : "cat_photon";
      const prevLen = this.gameStateRef.hybrids.length;
      const res = executeBreeding(this.gameStateRef, p.leader.id, captive.id, catId);
      if (res.ok && res.hybrid) {
        // Ensure match token belongs strictly to Player Leader's faction so they can deploy it on Row 1!
        const tokenData = { ...res.hybrid, fac: p.leader.fac };
        hybridCard = makeInstance(hybridToCard(tokenData), "player", this.uidCounter++);
        if (this.gameStateRef.hybrids.length > prevLen && res.hybrid.fac !== p.leader.fac) {
          res.hybrid.fac = p.leader.fac;
        }
      }
    }

    if (!hybridCard) {
      const tokenCR = Math.round(p.leader.cr * 0.45 + captive.cr * 0.55 + mutBonus * 2.5);
      const tokenH = +(((p.leader.h || 1.75) + (captive.h || 1.75)) / 2).toFixed(2);
      const hObj = {
        id: `field_hyb_${this.uidCounter}`,
        name: `${p.leader.name.split(" ")[0]}-${captive.name.split(" ")[0]} F1`,
        fac: p.leader.fac,
        species: `${p.leader.species.split(" ")[0]}-${captive.species.split(" ")[0]}`,
        race: p.leader.race,
        cr: tokenCR,
        h: tokenH,
        mutated: mutBonus >= 30,
        parentAId: p.leader.id,
        parentBId: captive.id,
        signatureSkill: `Gen ${captive.row2Effect ? captive.row2Effect.tag : "Hợp Nhất"}`
      };
      hybridCard = makeInstance(hybridToCard(hObj), "player", this.uidCounter++);
    }

    captive.bredUsed = true;
    p.fieldBreedUsedThisTurn = true;
    p.hand.push(hybridCard);
    this.pushLog(`🧬 Lai Tạo Tại Trận Hàng 2 (${p.leader.name} × ${captive.name}) -> Sinh ra thẻ ${hybridCard.name} (CR ${hybridCard.cr}, phe ${p.leader.fac}) lên tay!`);
    return { ok: true, hybridCard };
  }

  aiDeployRow1() {
    const e = this.enemy;
    const emptyLanes = [0, 1, 2].filter((idx) => e.row1[idx] === null);
    if (emptyLanes.length === 0 || e.hand.length === 0) return;

    // Sort AI hand by effective CR; contest player occupied lanes with best matching counter!
    const playerOccupiedLanes = emptyLanes.filter((idx) => this.player.row1[idx] !== null);
    const otherEmptyLanes = emptyLanes.filter((idx) => this.player.row1[idx] === null);
    const laneOrder = [...playerOccupiedLanes, ...otherEmptyLanes];

    for (const laneIdx of laneOrder) {
      if (e.hand.length === 0) break;
      const pCard = this.player.row1[laneIdx];
      let bestHandIdx = 0;
      let bestScore = -1;

      e.hand.forEach((c, idx) => {
        const eVal = this.evalCardCombatCR(c, pCard, "enemy").total;
        let score = eVal;
        if (pCard) {
          const pVal = this.evalCardCombatCR(pCard, c, "player").total;
          // Prefer narrow win or strong trade rather than wasting top card on weak lane
          score = eVal > pVal ? 10000 - (eVal - pVal) : eVal;
        }
        if (score > bestScore) {
          bestScore = score;
          bestHandIdx = idx;
        }
      });

      const chosen = e.hand.splice(bestHandIdx, 1)[0];
      chosen.deployedTurn = this.turn;
      e.row1[laneIdx] = chosen;
      this.pushLog(`👁️ Đối thủ đặt ${chosen.name} (CR ${chosen.cr}) vào Hàng 1 - Làn ${laneIdx + 1}.`);
    }
  }

  resolveClashTurn() {
    if (this.over) return { ok: false, over: true, winner: this.winner };

    const pHasAnyFront = this.getRow1Cards("player").length > 0;
    const pCanPlay = this.player.hand.length > 0;
    if (!pHasAnyFront && pCanPlay) {
      return { ok: false, reason: "Hãy đặt ít nhất 1 thẻ ra Hàng 1 trước khi Đấu Theo Chiều Dọc!" };
    }

    // 1. AI deploys into open Enemy Row 1 lanes
    this.aiDeployRow1();

    const laneResults = [];

    // 2. Vertical Lane Clashes (Lanes 0, 1, 2)
    for (let i = 0; i < 3; i++) {
      const pCard = this.player.row1[i];
      const eCard = this.enemy.row1[i];

      if (pCard && eCard) {
        const pEval = this.evalCardCombatCR(pCard, eCard, "player");
        const eEval = this.evalCardCombatCR(eCard, pCard, "enemy");

        if (pEval.total > eEval.total) {
          // Enemy loses -> Captured into Player Row 2! (Cannot be summoned to Row 1)
          this.enemy.row1[i] = null;
          eCard.ownerSide = "captured_by_player";
          this.player.row2.push(eCard);
          this.pushLog(`🏆 Làn ${i + 1}: ${pCard.name} (${pEval.total} CR) thắng ${eCard.name} (${eEval.total} CR) -> BẮT ${eCard.name} vào Hàng 2 của bạn! (${this.player.row2.length}/3)`);
          laneResults.push({ lane: i, outcome: "player_win", pTotal: pEval.total, eTotal: eEval.total, captured: eCard.name });
        } else if (eEval.total > pEval.total) {
          // Player loses -> Captured into Enemy Row 2!
          this.player.row1[i] = null;
          pCard.ownerSide = "captured_by_enemy";
          this.enemy.row2.push(pCard);
          this.pushLog(`💥 Làn ${i + 1}: ${eCard.name} (${eEval.total} CR) áp đảo ${pCard.name} (${pEval.total} CR) -> Bị bắt vào Hàng 2 đối thủ! (${this.enemy.row2.length}/3)`);
          laneResults.push({ lane: i, outcome: "enemy_win", pTotal: pEval.total, eTotal: eEval.total, captured: pCard.name });
        } else {
          // Exact tie: push both back? No, let both clash hold cleanly
          this.pushLog(`⚖️ Làn ${i + 1}: ${pCard.name} hòa ${eCard.name} ở mức ${pEval.total} CR — cả hai giữ nguyên Hàng 1.`);
          laneResults.push({ lane: i, outcome: "tie", pTotal: pEval.total, eTotal: eEval.total });
        }
      } else if (pCard && !eCard) {
        const pEval = this.evalCardCombatCR(pCard, null, "player");
        this.pushLog(`🛡️ Làn ${i + 1}: ${pCard.name} (${pEval.total} CR) kiểm soát làn trống.`);
        laneResults.push({ lane: i, outcome: "player_hold", pTotal: pEval.total, eTotal: 0 });
      } else if (!pCard && eCard) {
        const eEval = this.evalCardCombatCR(eCard, null, "enemy");
        this.pushLog(`⚠️ Làn ${i + 1}: ${eCard.name} (${eEval.total} CR) chiếm làn đối diện.`);
        laneResults.push({ lane: i, outcome: "enemy_hold", pTotal: 0, eTotal: eEval.total });
      }
    }

    // 3. Check Immediate 3-Capture Win/Loss Condition
    if (this.player.row2.length >= 3) {
      this.over = true;
      this.winner = "player";
      this.winReason = "capture_3";
      this.pushLog(`🎉 CHIẾN THẮNG! Bạn đã bắt giữ đủ 3 thẻ của đối phương vào Hàng 2!`);
      return { ok: true, laneResults, over: true, winner: "player", winReason: "capture_3" };
    }
    if (this.enemy.row2.length >= 3) {
      this.over = true;
      this.winner = "enemy";
      this.winReason = "capture_3";
      this.pushLog(`💀 THẤT BẠI! Bạn đã mất 3 thẻ vào Hàng 2 đối phương!`);
      return { ok: true, laneResults, over: true, winner: "enemy", winReason: "capture_3" };
    }

    // 4. Row 3 Representative Attack Rule:
    // Leader in Row 3 CANNOT be attacked while ANY card exists on Row 1.
    // Once a side's Row 1 is completely EMPTY and the opposing Row 1 has attackers:
    // Compare Sum(Attacker Row 1 CR) vs Defender Row 3 Leader Effective CR!
    const pRow1Cards = this.getRow1Cards("player");
    const eRow1Cards = this.getRow1Cards("enemy");

    if (eRow1Cards.length === 0 && pRow1Cards.length > 0) {
      const totalPAtk = pRow1Cards.reduce((s, c) => s + this.evalCardCombatCR(c, this.enemy.leader, "player", { attackingRow3: true }).total, 0);
      const eRepEval = this.evalCardCombatCR(this.enemy.leader, pRow1Cards[0], "enemy");
      this.pushLog(`⚡ Hàng 1 địch TRỐNG! Toàn bộ Hàng 1 (${totalPAtk} CR) tấn công thẳng ${this.enemy.leader.name} ở Hàng 3 (${eRepEval.total} CR)!`);
      if (totalPAtk > eRepEval.total) {
        this.over = true;
        this.winner = "player";
        this.winReason = "leader_breach";
        this.pushLog(`👑 HẠ GỤC THỦ LĨNH HÀNG 3! Tổng CR Hàng 1 (${totalPAtk}) vượt qua ${this.enemy.leader.name} (${eRepEval.total}) -> CHIẾN THẮNG!`);
        return { ok: true, laneResults, over: true, winner: "player", winReason: "leader_breach", row3Attack: { totalPAtk, repCR: eRepEval.total } };
      } else {
        this.pushLog(`🛡️ Thủ lĩnh Hàng 3 ${this.enemy.leader.name} (${eRepEval.total} CR) đứng vững trước đợt công phá (${totalPAtk} CR)!`);
      }
    }

    if (pRow1Cards.length === 0 && eRow1Cards.length > 0) {
      const totalEAtk = eRow1Cards.reduce((s, c) => s + this.evalCardCombatCR(c, this.player.leader, "enemy", { attackingRow3: true }).total, 0);
      const pRepEval = this.evalCardCombatCR(this.player.leader, eRow1Cards[0], "player");
      this.pushLog(`⚠️ Hàng 1 của bạn TRỐNG! Tổng CR địch (${totalEAtk}) công kích thẳng Thủ lĩnh Hàng 3 ${this.player.leader.name} (${pRepEval.total} CR)!`);
      if (totalEAtk > pRepEval.total) {
        this.over = true;
        this.winner = "enemy";
        this.winReason = "leader_breach";
        this.pushLog(`💀 GAME OVER! Thủ lĩnh ${this.player.leader.name} (${pRepEval.total} CR) bị đánh bại bởi Tổng CR Hàng 1 địch (${totalEAtk})!`);
        return { ok: true, laneResults, over: true, winner: "enemy", winReason: "leader_breach", row3Attack: { totalEAtk, repCR: pRepEval.total } };
      } else {
        this.pushLog(`💪 Thủ lĩnh ${this.player.leader.name} (${pRepEval.total} CR) chặn đứng đợt xung kích vào Hàng 3!`);
      }
    }

    // 5. Advance Turn, Replenish Hands up to 5 cards, Check Exhaustion Stalemate
    this.turn++;
    this.player.placedThisTurn = 0;
    this.enemy.placedThisTurn = 0;
    this.player.fieldBreedUsedThisTurn = false;
    this.enemy.fieldBreedUsedThisTurn = false;

    this.drawCards("player", Math.max(0, 5 - this.player.hand.length));
    this.drawCards("enemy", Math.max(0, 5 - this.enemy.hand.length));

    const stalemate = this.turn > this.maxTurns || (
      this.player.hand.length === 0 && this.player.deck.length === 0 &&
      this.enemy.hand.length === 0 && this.enemy.deck.length === 0
    );

    if (stalemate) {
      this.over = true;
      this.winReason = "tiebreak";
      if (this.player.row2.length !== this.enemy.row2.length) {
        this.winner = this.player.row2.length > this.enemy.row2.length ? "player" : "enemy";
        this.pushLog(`⌛ Hết bài chiến thuật — phân định theo số thẻ bắt giữ Hàng 2 (${this.player.row2.length} vs ${this.enemy.row2.length})!`);
      } else {
        const pTotal = this.getRow1Cards("player").reduce((s, c) => s + c.cr, this.player.leader.cr);
        const eTotal = this.getRow1Cards("enemy").reduce((s, c) => s + c.cr, this.enemy.leader.cr);
        this.winner = pTotal >= eTotal ? "player" : "enemy";
        this.pushLog(`⌛ Phân định thắng bại bằng Tổng CR còn lại trên sân (${pTotal} vs ${eTotal})!`);
      }
      return { ok: true, laneResults, over: true, winner: this.winner, winReason: "tiebreak" };
    }

    return { ok: true, laneResults, over: false };
  }
}
