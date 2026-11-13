// ============================================================================
// CYCLE 12: AGE OF DOMINION — SCI-FI GENETICS & BLOODLINE BREEDING LAB (v5)
// Combines Parent A + Parent B (or Multi-Gen Hybrids) + Racial Catalysts
// to forge playable Hybrid Champion Cards & fortify Galactic Lineages.
// ============================================================================

import { CHAR_BY_ID, RACE_STYLE } from "../data/characters.js";

export const CATALYSTS = [
  { id: "None",      name: "Hợp Nhất Tự Nhiên (Cân bằng 2 dòng máu)", cost: 800,  bonusCr: 1.0,  mutBonus: 0 },
  { id: "Tamarite",  name: "Tamarite Hyper-Photon (Siêu đột biến SSS+)", cost: 2200, bonusCr: 1.25, mutBonus: 0.35 },
  { id: "Sylvarian", name: "Sylvarian Astraum Gene (Bùng nổ ma thuật-vật lý)", cost: 1600, bonusCr: 1.15, mutBonus: 0.2 },
  { id: "Prozonian", name: "Prozonian Knight Helix (Kiên cường & Kháng cự)", cost: 1600, bonusCr: 1.15, mutBonus: 0.15 },
  { id: "Wombiote",  name: "Wombiote Symbiont (Cộng sinh phân nhánh cao)", cost: 1800, bonusCr: 1.12, mutBonus: 0.4 },
  { id: "Natheron",  name: "Natheron Core Catalyst (Vô hiệu nếu Gen A CR >= 800)", cost: 1400, bonusCr: 1.18, mutBonus: 0.3 },
  { id: "Starrer",   name: "Starrer Symbiote Core (Vô hiệu nếu Gen A CR >= 800)", cost: 1400, bonusCr: 1.18, mutBonus: 0.3 }
];

export const CATALYST_BY_ID = Object.fromEntries(CATALYSTS.map((c) => [c.id, c]));

export function resolveGeneticSubject(id, hybrids = []) {
  if (CHAR_BY_ID[id]) return CHAR_BY_ID[id];
  const h = (hybrids || []).find((x) => x.id === id);
  if (!h) return CHAR_BY_ID.arisia;
  return {
    id: h.id,
    name: h.name,
    title: "Hậu Duệ Lai Gen Thế Hệ Mới",
    fac: h.fac,
    species: h.species,
    race: h.race || "Tamarite",
    cr: h.cr,
    h: h.h || 1.9,
    skills: [h.signatureSkill || "Huyết Thống Hợp Nhất"],
    isHybrid: true
  };
}

export function previewBreeding(parentAId, parentBId, catalystId = "None", hybrids = []) {
  const a = resolveGeneticSubject(parentAId, hybrids);
  const b = resolveGeneticSubject(parentBId, hybrids);
  const cat = CATALYST_BY_ID[catalystId] || CATALYSTS[0];
  const crGap = Math.abs(a.cr - b.cr);
  const notes = [];
  let blocked = false;
  let blockReason = "";

  if (a.id === b.id) {
    notes.push("⚠️ Cùng một cá thể gốc: nên ghép hai dòng gen khác nhau để mở khóa đột biến đa chủng.");
  }

  if ((catalystId === "Starrer" || catalystId === "Natheron") && a.cr >= 800) {
    blocked = true;
    blockReason = `${a.name} có CR ${a.cr} (>= 800) nên hoàn toàn miễn nhiễm với xúc tác ký sinh ${catalystId}!`;
    notes.push(`🛡️ Miễn Nhiễm Đỉnh Cao (CR 800+): ${blockReason}`);
  }

  if ((a.species || "").includes("Hinatian") && catalystId !== "None") {
    notes.push("💙 Huyết Thống Máu Xanh Hinatian: Chuyển hóa xúc tác ngoại lai thành +18% năng lượng cộng hưởng!");
  }
  if (a.id === "meralina" || b.id === "meralina") {
    notes.push(`✨ Cộng Hưởng Meralina: Chênh lệch CR ${crGap} làm tăng vọt tỷ lệ đột biến gen hiếm!`);
  }
  if (a.id === "pussiri" || b.id === "pussiri") {
    notes.push("🧬 Tổng Hợp Pussiri (65% Tamarite + 30% Sylvarian + 5% Biến Số): Tạo ra chiến tướng Sylvarian thượng hạng.");
  }
  if (a.id === "exorotic" || b.id === "exorotic") {
    notes.push("🧪 Exorotic Nano-Restructure: Đẩy tỷ lệ đột biến lên 90% và kế thừa chiêu thức tối thượng của Gen A!");
  }
  if (a.id === "jane" || b.id === "jane") {
    notes.push("🖤 Huyết Thống Raven: Hậu duệ mang chỉ số Tấn Công vượt trội cùng khả năng hút sinh lực trên bàn bài.");
  }
  if (a.id === "dick" || b.id === "dick") {
    notes.push("⚡ Dick Pierce Override: Bảo đảm đồng bộ hóa thành công 100% bất kể khoảng cách CR!");
  }
  if (a.id === "tsunadia" || a.id === "ovalina" || a.id === "july" || a.id === "jorduyn") {
    notes.push("👑 Dòng Máu Hoàng Gia Đông Đúc: Tăng mạnh thu nhập Credits & Ảnh Hưởng sau khi hợp nhất!");
  }

  const baseCr = Math.round((a.cr * 0.54 + b.cr * 0.52) * cat.bonusCr);
  const mutChance = Math.min(96, Math.round((32 + cat.mutBonus * 100 + Math.min(35, crGap * 0.04)) * (a.id === "exorotic" || b.id === "exorotic" ? 1.5 : 1)));

  return {
    parentA: a,
    parentB: b,
    catalyst: cat,
    crGap,
    estCrMin: Math.max(40, Math.round(baseCr * 0.95)),
    estCrMax: Math.max(80, Math.round(baseCr * 1.38)),
    mutChance,
    cost: cat.cost,
    blocked,
    blockReason,
    notes
  };
}

export function executeBreeding(gameState, parentAId, parentBId, catalystId = "None") {
  const prev = previewBreeding(parentAId, parentBId, catalystId, gameState.hybrids);
  if (prev.blocked) {
    return { ok: false, msg: prev.blockReason };
  }

  const fac = gameState.playerFaction;
  const res = gameState.resources[fac];
  if (!res || res.credits < prev.cost) {
    return { ok: false, msg: `Cần ${prev.cost.toLocaleString()} Credits để vận hành buồng lai gen!` };
  }

  res.credits -= prev.cost;

  const isMutated = Math.random() * 100 < prev.mutChance;
  const rawCr = Math.round((prev.parentA.cr * 0.56 + prev.parentB.cr * 0.54) * prev.catalyst.bonusCr * (isMutated ? 1.32 : 1.04));
  const finalCr = Math.max(50, Math.min(2500, rawCr));

  const lineageCount = (gameState.hybrids?.length || 0) + 1;
  const firstA = prev.parentA.name.split(" ")[0];
  const suffix = catalystId !== "None" ? catalystId : prev.parentB.name.split(" ")[0];
  const hybridName = `${firstA}-${suffix} #${lineageCount}`;

  const raceA = prev.parentA.race || "Human";
  const raceB = catalystId !== "None" ? (RACE_STYLE[catalystId] ? catalystId : prev.parentB.race) : (prev.parentB.race || raceA);
  const auraA = (RACE_STYLE[raceA] && RACE_STYLE[raceA].aura) || "#38bdf8";
  const auraB = (RACE_STYLE[raceB] && RACE_STYLE[raceB].aura) || "#f472b6";

  const sigSkillA = prev.parentA.skills?.[0] || "Thiên Tinh Kích";
  const sigSkillB = prev.parentB.skills?.[0] || "Huyết Mạch Trỗi Dậy";
  const signatureSkill = `${sigSkillA.split(" ")[0]} × ${sigSkillB}`;

  const lineageScale =
    prev.parentA.id === "tsunadia" || prev.parentA.id === "ovalina" ? 25000
      : prev.parentA.id === "july" || prev.parentA.id === "jorduyn" ? 8000
        : prev.parentB.id === "zarcseid" ? 12
          : Math.floor(1 + Math.random() * 6);

  const rewardCredits = lineageScale * 1 + (isMutated ? 2500 : 1200);
  const rewardInf = isMutated ? 12 : 6;
  res.credits += rewardCredits;
  res.influence = (res.influence || 0) + rewardInf;

  const hybrid = {
    id: `hyb_${Date.now().toString(36)}_${lineageCount}`,
    name: hybridName,
    parentAId: prev.parentA.id,
    parentBId: prev.parentB.id,
    parentsLabel: `${prev.parentA.name} × ${catalystId !== "None" ? catalystId : prev.parentB.name}`,
    fac: gameState.playerFaction,
    race: isMutated ? raceB : raceA,
    species: `Hybrid (${prev.parentA.race || "Bio"} × ${raceB})`,
    cr: finalCr,
    h: Number((((prev.parentA.h || 1.8) + (prev.parentB.h || 1.8)) / 2).toFixed(2)),
    auraA,
    auraB,
    mutated: isMutated,
    catalyst: catalystId,
    lineageBatch: lineageScale,
    signatureSkill,
    createdCycle: `${gameState.cycleMajor}.${gameState.cycleMinor}`
  };

  if (!Array.isArray(gameState.hybrids)) gameState.hybrids = [];
  gameState.hybrids.unshift(hybrid);
  if (!gameState.stats) gameState.stats = { battlesWon: 0, superweaponsFired: 0, reconOps: 0, hybridsCreated: 0, gauntletMax: 0, cutscenesWatched: 0 };
  gameState.stats.hybridsCreated = (gameState.stats.hybridsCreated || 0) + 1;

  // Auto-add new hybrid into player's active 16-card Faction Deck (swapping out weakest slot if full)
  if (Array.isArray(gameState.customDeck) && hybrid.fac === gameState.playerFaction && !gameState.customDeck.includes(hybrid.id)) {
    if (gameState.customDeck.length < 16) {
      gameState.customDeck.push(hybrid.id);
    } else {
      const troopIdx = gameState.customDeck.findIndex((cid) => cid.startsWith("tr_"));
      const weakerIdx = gameState.customDeck.findIndex((cid) => cid !== gameState.protagonistId && CHAR_BY_ID[cid] && CHAR_BY_ID[cid].cr < hybrid.cr);
      const replaceIdx = troopIdx >= 0 ? troopIdx : weakerIdx;
      if (replaceIdx >= 0) gameState.customDeck[replaceIdx] = hybrid.id;
    }
  }

  gameState.addChronicle(`🧬 Lai tạo thành công ${hybrid.name} (CR ${hybrid.cr}${isMutated ? " • ĐỘT BIẾN TRỘI" : ""}) từ ${hybrid.parentsLabel}.`);
  gameState.saveToSlot("auto");

  return {
    ok: true,
    hybrid,
    rewardCredits,
    rewardInf,
    msg: `Đã hợp nhất ${hybrid.name} (CR ${hybrid.cr}) & tạo Thẻ Bài Hậu Duệ mới (+${rewardCredits.toLocaleString()} Cr, +${rewardInf} Inf)!`
  };
}
