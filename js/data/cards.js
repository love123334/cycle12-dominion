// ============================================================================
// CYCLE 12: AGE OF DOMINION — FACTION, GENDER, CR & 2-ROW CARD DATABASE (v9)
// Core Rules:
// - Each card carries: Art, Name, Gender (Male/Female), CR, Species, Faction,
//   Row 1 Effect (Combat + Breeding Conditionals), Row 2 Effect (Breeding onto Row 1 / Synergy / Debuff).
// - Strict Faction Leader Lock: A Leader commands ONLY cards of their Faction.
// - Row 2 Breeding Rates:
//   * Tamarite: Guaranteed 100% strong Token directly onto empty Row 1 lane (or boosts Row 1 ally if full).
//   * Omni-Womb / Brood: Varied multi-archetype tokens onto Row 1 (0-99% or 100% if Tamarite) + boosts allied Row 2 rates.
//   * Alien / Mutant / Wombiote: Variable 40%-96% random chance with species passives.
//   * Pure Human (no breeding buff): Low ~32% random chance & -28% CR Debuff on Token (canceled if Dick is allied).
// ============================================================================

import { CHARACTERS, CHAR_BY_ID } from "./characters.js";
import { getPortraitUrl, getHybridPortraitUrl } from "../render/portraits.js";

// ============================================================================
// DATA-DRIVEN TCG KEYWORD & SKILL TABLES (v12.0)
// Standardized Row 1 (Combat), Row 2 (Breeding/Capture) & Leader Active Skills
// ============================================================================
export const H1_KEYWORDS = {
  charge: {
    id: "charge",
    name: "Xung Phong",
    icon: "⚡",
    short: "⚡ Xung Phong (+2 Cấp)",
    smallBonus: 2,
    scaledBonus: 120,
    desc: "Xung Phong: +2 Cấp (+120 CR) ngay trong lượt vừa triển khai ra Hàng 1."
  },
  shield: {
    id: "shield",
    name: "Khiên",
    icon: "🛡️",
    short: "🛡️ Khiên (Chặn 1 thua)",
    desc: "Khiên: Chặn 1 lần thua giao chiến (vỡ Khiên và trụ lại Hàng 1 thay vì bị bắt sang Hàng 2)."
  },
  draw: {
    id: "draw",
    name: "Rút Bài",
    icon: "🃏",
    short: "🃏 Rút +1 Bài",
    drawCount: 1,
    desc: "Rút Bài: Khi triển khai ra Hàng 1, rút ngay +1 lá bài từ Bộ bài."
  },
  pierce: {
    id: "pierce",
    name: "Xuyên Giáp",
    icon: "🗡️",
    short: "🗡️ Xuyên Giáp",
    smallBonus: 1,
    scaledBonus: 80,
    desc: "Xuyên Giáp: Phá Khiên của đối thủ đối diện và +1 Cấp (+80 CR) khi công phá Hàng 3."
  },
  recover: {
    id: "recover",
    name: "Hồi Phục",
    icon: "💚",
    short: "💚 Hồi +1⚡",
    energyGain: 1,
    desc: "Hồi Phục: Khi ra bài hoặc thắng giao chiến làn, hồi +1⚡ Năng lượng Gen (tối đa 8⚡)."
  }
};

export const H2_KEYWORDS = {
  spawn_token: {
    id: "spawn_token",
    name: "Sinh Token",
    icon: "🧬",
    short: "🧬 Sinh Token→H1",
    desc: "Sinh Token: Khi Nam thắng Nữ đưa vào Hàng 2, cuối mỗi lượt sinh Token lai trực tiếp lên Hàng 1 trống."
  },
  bonus_draw: {
    id: "bonus_draw",
    name: "Rút Thêm",
    icon: "📚",
    short: "📚 Rút +1 Khi Lai",
    drawCount: 1,
    desc: "Rút Thêm: Khi kích hoạt Lai Tạo (♂ thắng ♀) hoặc sinh Token ở Hàng 2, chủ nhân rút thêm +1 lá."
  },
  purge_capture: {
    id: "purge_capture",
    name: "Gỡ 1 Điểm Bắt",
    icon: "🔓",
    short: "🔓 Gỡ 1 Điểm Bắt",
    purgeCount: 1,
    desc: "Gỡ Điểm Bắt: Khi kích hoạt ở Hàng 2, giải cứu/gỡ 1 thẻ tù binh khỏi Hàng 2 của đối phương (1 lần/trận)."
  }
};

export const GENE_SURGE_SKILL = {
  id: "gene_surge",
  name: "Gene Surge",
  icon: "🔥",
  cost: 4,
  smallBonus: 3,
  scaledBonus: 180,
  desc: "Kỹ năng Chủ Động Chung (4⚡ • 1 lần/ván): Bùng nổ Năng lượng Gen, tăng +3 Cấp (+180 CR) cho toàn bộ thẻ Hàng 1 & Thủ lĩnh Hàng 3 trong lượt này!"
};

export const LEADER_SKILLS = {
  sylvarian: {
    id: "sylvarian_decree",
    name: "Hoàng Lệnh Astraum",
    icon: "👑",
    cost: 3,
    effectType: "buff_and_draw",
    smallBonus: 2,
    scaledBonus: 130,
    drawCount: 1,
    grantKeyword: "shield",
    desc: "Tuyệt Kỹ Sylvarian (3⚡ • 1 lần/ván): Cấp 🛡️ Khiên +2 Cấp (+130 CR) cho toàn bộ Hàng 1 và rút +1 lá bài."
  },
  western_nadir: {
    id: "abyss_overdrive",
    name: "Áp Chế Vực Thẳm",
    icon: "🌑",
    cost: 3,
    effectType: "debuff_pierce",
    smallPenalty: 2,
    scaledPenalty: 150,
    grantKeyword: "pierce",
    desc: "Tuyệt Kỹ Western Nadir (3⚡ • 1 lần/ván): Giảm -2 Cấp (-150 CR) toàn bộ Hàng 1 địch & cấp 🗡️ Xuyên Giáp cho Hàng 1 ta."
  },
  eris: {
    id: "outer_reset",
    name: "Vòng Lặp Ngoại Tầng",
    icon: "⏳",
    cost: 3,
    effectType: "shield_recover",
    energyGain: 1,
    drawCount: 1,
    grantKeyword: "shield",
    desc: "Tuyệt Kỹ Eris Union (3⚡ • 1 lần/ván): Cấp 🛡️ Khiên cho mọi thẻ Hàng 1 phe ta, rút +1 lá và hồi +1⚡."
  },
  nadirius: {
    id: "citadel_blitz",
    name: "Thánh Chỉ Citadel",
    icon: "⚡",
    cost: 3,
    effectType: "charge_pierce",
    smallBonus: 2,
    scaledBonus: 140,
    grantKeyword: "pierce",
    desc: "Tuyệt Kỹ Nadirius (3⚡ • 1 lần/ván): Cấp ⚡ Xung Phong (+2 Cấp / +140 CR) và 🗡️ Xuyên Giáp cho toàn bộ Hàng 1."
  },
  collectors: {
    id: "bio_harvest_net",
    name: "Lưới Thu Hoạch Gen",
    icon: "🧪",
    cost: 3,
    effectType: "draw_and_breed_boost",
    drawCount: 2,
    breedBoostPct: 25,
    smallBonus: 2,
    scaledBonus: 110,
    desc: "Tuyệt Kỹ The Collectors (3⚡ • 1 lần/ván): Rút +2 lá bài, +110 CR Hàng 1 & tăng +25% tỷ lệ sinh Token Hàng 2."
  },
  salvic: {
    id: "predita_bastion",
    name: "Pháo Đài Predita",
    icon: "🛡️",
    cost: 3,
    effectType: "purge_and_shield",
    purgeCaptive: 1,
    grantKeyword: "shield",
    smallBonus: 2,
    scaledBonus: 120,
    desc: "Tuyệt Kỹ Salvic Union (3⚡ • 1 lần/ván): Gỡ 1 tù binh khỏi Hàng 2 địch & cấp 🛡️ Khiên (+120 CR) cho Hàng 1 ta."
  },
  tamarite: {
    id: "pherone_bloom",
    name: "Bùng Nổ Pherone",
    icon: "💗",
    cost: 3,
    effectType: "instant_breed_or_buff",
    smallBonus: 2,
    scaledBonus: 150,
    desc: "Tuyệt Kỹ Tamarite (3⚡ • 1 lần/ván): Kích hoạt ngay 1 chu kỳ sinh Token từ Hàng 2 lên Hàng 1 (hoặc +150 CR toàn bàn & hồi +1⚡)."
  },
  independent: {
    id: "paradox_surge",
    name: "Đột Biến Nghịch Lý",
    icon: "🌀",
    cost: 3,
    effectType: "omni_tactic",
    energyGain: 1,
    drawCount: 1,
    smallBonus: 2,
    scaledBonus: 135,
    desc: "Tuyệt Kỹ Tự Do (3⚡ • 1 lần/ván): Rút +1 lá, hồi +1⚡ và cộng +2 Cấp (+135 CR) cho toàn bộ Hàng 1."
  }
};

export function getCardEnergyCost(cr = 400, isToken = false) {
  if (isToken) return 1;
  const val = Number(cr || 0);
  // Support both small-scale CR (1-25) and Cycle 12 lore CR (26-2000)
  if (val <= 25) {
    if (val <= 3) return 1;
    if (val <= 5) return 2;
    if (val <= 7) return 3;
    return 4;
  }
  if (val < 420) return 1;
  if (val < 600) return 2;
  if (val < 820) return 3;
  return 4;
}

export function inferH1Keywords(c, r1) {
  const kw = [];
  const sp = (c.species || "").toLowerCase();
  const r1Id = r1?.id || "";
  if (r1Id === "solar_blitz" || r1Id === "frontline_valor" || r1Id === "supers_strike" || c.id === "tr_nad_lancer" || c.id === "tr_tam_enforcer" || c.id === "tr_col_drone") {
    kw.push("charge");
  }
  if (r1Id === "knight_bastion" || r1Id === "blue_blood_guard" || r1Id === "eris_reset" || c.id === "tr_eris_sentinel" || c.id === "tr_nad_warden" || c.id === "tr_sal_paladin" || c.id === "tr_tam_guard") {
    kw.push("shield");
  }
  if (r1Id === "gotterfall_tactic" || c.id === "ojamon" || c.id === "tr_eris_keeper" || c.id === "mrmind" || c.id === "mina") {
    kw.push("draw");
  }
  if (r1Id === "abyss_terror" || r1Id === "predita_will" || r1Id === "cr_gap_burst" || r1Id === "immortal_bypass" || sp.includes("krypton") || (c.cr || 0) >= 880) {
    kw.push("pierce");
  }
  if (r1Id === "hyper_photon" || r1Id === "omni_host" || r1Id === "reformist_wave" || c.id === "tr_sal_medic" || c.id === "tr_tam_weaver") {
    kw.push("recover");
  }
  if (kw.length === 0) {
    kw.push((c.cr || 0) >= 600 ? "charge" : "recover");
  }
  return [...new Set(kw)];
}

export function inferH2Keywords(c, r2) {
  const kw = ["spawn_token"];
  const r2Tier = r2?.tier || "";
  if (r2Tier === "tamarite" || r2?.omniWomb || r2?.doubleIfTokenBred || c.id === "ojamon" || c.id === "mrmind") {
    kw.push("bonus_draw");
  }
  if (c.fac === "salvic" || c.fac === "sylvarian" || c.fac === "eris" || c.id === "dick" || (c.cr || 0) >= 850) {
    kw.push("purge_capture");
  }
  return [...new Set(kw)];
}

export function getLeaderSkillForCard(leaderCard) {
  const fac = leaderCard?.fac || "sylvarian";
  return LEADER_SKILLS[fac] || LEADER_SKILLS.sylvarian;
}

function inferRow1Effect(c) {
  const sp = (c.species || "").toLowerCase();
  if (c.id === "arisia") return { id: "syl_empress", tag: "Chỉ Huy Tối Cao", bonusFlat: 120, condType: "row1_ally_token", desc: "Hàng 1/3: +120 CR & +80 CR mỗi đồng minh Sylvarian Hàng 1 (tính cả Token từ Hàng 2!)." };
  if (c.id === "overlord") return { id: "abyss_terror", tag: "Áp Chế Vực Thẳm", bonusFlat: 150, condType: "active_breed_or_token", condBonus: 115, desc: "Hàng 1/3: +150 CR; -120 CR địch. ĐK Lai/Token: +115 CR & -80 CR mọi lá địch (<800 CR)!" };
  if (c.id === "emma") return { id: "eris_reset", tag: "Vòng Lặp Outer Layer", bonusFlat: 180, desc: "Hàng 1/3: +180 CR và vô hiệu hóa buff chủng tộc của đối thủ đối diện." };
  if (c.id === "magnatere") return { id: "nadirius_decree", tag: "Hoàng Lệnh Nadirius", bonusFlat: 140, desc: "Hàng 1/3: +140 CR; +100 CR thêm khi đấu với Sylvarian hoặc Western Nadir." };
  if (c.id === "zarcseid") return { id: "predita_will", tag: "Ý Chí Predita", bonusFlat: 160, condType: "active_breed_or_token", condBonus: 180, desc: "Hàng 1/3: +160 CR. ĐK: +180 CR khi đấu Nadir, đã mất >=1 lá HOẶC phe ta có Token/Lai Hàng 2!" };
  if (c.id === "meralina") return { id: "cr_gap_burst", tag: "Nghịch Lý Khoảng Cách", bonusFlat: 60, condType: "row1_token", condBonus: 240, desc: "Hàng 1/3: +60 CR; ĐK: chênh CR >= 250 HOẶC có Token Lai trên Hàng 1 -> tăng vọt +240 CR!" };
  if (c.id === "ojamon") return { id: "gotterfall_tactic", tag: "Chiến Lược Cursew", bonusFlat: 90, condType: "token_bred", condBonus: 110, desc: "Hàng 1/3: +90 CR; rút +1 thẻ khi ra Hàng 1. ĐK: Đã sinh Token từ Hàng 2 -> +110 CR!" };
  if (c.id === "felicia" || c.id === "sarah") return { id: "supers_strike", tag: "Đội Đặc Nhiệm Evernight", bonusFlat: 110, desc: "Hàng 1/3: +110 CR; +140 CR thêm khi đối đầu The Collectors hoặc Wombiote." };
  if (c.id === "mrmind" || c.id === "parasoid") return { id: "collector_harvest", tag: "Thu Thập Gen", bonusFlat: 100, condType: "active_breed_or_token", condBonus: 160, desc: "Hàng 1/3: +100 CR mỗi tù binh Hàng 2. ĐK có Token Hàng 1/Lai: +160 CR & -90 CR đối diện!" };
  if (c.id === "dick") return { id: "immortal_bypass", tag: "Bất Tử Áp Chế", bonusFlat: 40, cancelHumanDebuff: true, desc: "Hàng 1/3: +40 CR; hóa giải hoàn toàn debuff -CR% Người Thuần & phá miễn nhiễm sinh sản!" };
  if (c.id === "malocri" || c.id === "yulina" || c.id === "dejaylah" || c.id === "pussiri" || c.id === "jorduyn") {
    return { id: "reformist_wave", tag: "Cải Cách Cộng Hưởng", bonusFlat: 105, condType: "token_bred", condBonus: 135, desc: `Hàng 1/3: +105 CR. ĐK: Đã sinh Token Hàng 2 hoặc có Token Hàng 1 -> kích hoạt thêm +135 CR!` };
  }
  if (c.id === "uterussa" || c.id === "tsunadia" || c.id === "exorotic") {
    return { id: "omni_host", tag: "Bùng Nổ Ký Chủ", bonusFlat: 115, condType: "active_breed", condBonus: 140, desc: "Hàng 1/3: +115 CR. ĐK Hàng 2 đang Lai Tạo -> nhận thêm +140 CR & buff +90 CR đồng minh Omni/Nadir!" };
  }
  if ((c.h || 1.75) >= 3.2) return { id: "titan_frame", tag: "Thể Khổng Lồ", bonusFlat: 115, desc: `Hàng 1/3: Thể hình ${c.h}m áp đảo, cộng +115 CR khi giao chiến trực diện.` };
  if (sp.includes("tamarite")) return { id: "hyper_photon", tag: "Tamarite Quang Năng", bonusFlat: 130, condType: "active_breed_or_token", condBonus: 180, desc: "Hàng 1/3: +130 CR (+90 CR cùng phe). ĐK có Lai Hàng 2/Token Hàng 1 -> +180 CR & +90 CR mọi Token Hàng 1!" };
  if (sp.includes("prozon")) return { id: "knight_bastion", tag: "Hiệp Sĩ Prozonian", bonusFlat: 105, desc: "Hàng 1/3: +105 CR; +100 CR khi đấu với Nadir hoặc Mutant." };
  if (sp.includes("hinatian")) return { id: "blue_blood_guard", tag: "Máu Xanh Bất Khuất", bonusFlat: 95, desc: "Hàng 1/3: Miễn nhiễm giảm CR từ Virus/Nadir; +95 CR giao chiến." };
  if (sp.includes("krypton")) return { id: "solar_blitz", tag: "Xung Kích Mặt Trời", bonusFlat: 125, desc: "Hàng 1/3: +125 CR; xuyên thấu +60 CR tổng hợp khi đánh Hàng 3." };
  if (sp.includes("nadir")) return { id: "nadir_psionic", tag: "Áp Lực Thần Nadir", bonusFlat: 115, condType: "active_breed_or_token", condBonus: 95, desc: "Hàng 1/3: +115 CR; giảm 70 CR đối diện (<800 CR). ĐK Lai Hàng 2: +95 CR!" };
  if (c.race === "human" && !sp.includes("wombiote")) {
    return { id: "human_resilience", tag: "Ý Chí Nhân Loại", bonusFlat: 75, condType: "active_breed_or_dick", condBonus: 135, desc: "Hàng 1/3: +75 CR. ĐK có Token Hàng 1, Dick hoặc đồng minh Lai Tạo -> kích hoạt +135 CR!" };
  }
  return { id: "frontline_valor", tag: "Xung Kích Chính Quy", bonusFlat: 75, desc: `Hàng 1/3: ${(c.skills && c.skills[0]) || "Chiến kỹ"} cộng +75 CR khi tham chiến.` };
}

function inferRow2Effect(c) {
  const sp = (c.species || "").toLowerCase();
  const auraBase = Math.max(40, Math.round((c.cr || 100) * 0.12));

  // 1. TAMARITE — Always 100% spawn directly onto Row 1!
  if (c.id === "ovalina" || c.id === "uterussa") {
    const isOmni = c.id === "uterussa";
    return {
      id: isOmni ? "r2_tamarite_omniwomb" : "r2_tamarite_queen",
      tier: "tamarite",
      breedChance: 100,
      omniWomb: true,
      symbiosisR2Boost: isOmni ? 15 : 10,
      crAura: 135,
      crMult: 1.25,
      crPenaltyPct: 0,
      tag: isOmni ? "Omni-Womb H1 (100%)" : "Tamarite → Hàng 1 (100%)",
      desc: isOmni
        ? "Hàng 2: Mặc định 100% sinh Token đa dạng lên HÀNG 1 trống (+135 CR) & kích +15% tỷ lệ cho mọi ô Hàng 2 khác!"
        : "Hàng 2: Mặc định 100% sinh Token Tamarite siêu mạnh lên HÀNG 1 trống (+135 CR Hàng 1)."
    };
  }
  if (sp.includes("tamarite")) {
    return {
      id: "r2_tamarite",
      tier: "tamarite",
      breedChance: 100,
      omniWomb: c.id === "pussiri",
      doubleIfTokenBred: c.id === "pussiri",
      crAura: 115,
      crMult: 1.12,
      crPenaltyPct: 0,
      tag: c.id === "pussiri" ? "Synthesis 65/30/5 (100% • ×2 Aura)" : "Huyết Thống → H1 (100%)",
      desc: "Hàng 2: Tamarite mặc định 100% sinh Token chiến lực cao thẳng lên HÀNG 1 (nếu ĐK có Token -> x2 Aura Hàng 2!)."
    };
  }

  // 2. OMNI-WOMB / BROOD / WOMBIOTE / NANO (0-99% chance, varied tokens + Row 2 synergy!)
  if (c.id === "tsunadia") {
    return {
      id: "r2_nadir_brood",
      tier: "omniwomb",
      breedChance: 96,
      omniWomb: true,
      symbiosisR2Boost: 15,
      crAura: 130,
      crMult: 1.12,
      crPenaltyPct: 0,
      tag: "Omni-Brood → H1 (96%)",
      desc: "Hàng 2: 96% sinh Token Quân Đoàn Nadir thẳng lên HÀNG 1 (+130 CR) & +15% tỷ lệ sinh cho các ô Hàng 2 khác!"
    };
  }
  if (c.id === "exorotic") {
    return {
      id: "r2_nano_omni",
      tier: "omniwomb",
      breedChance: 90,
      omniWomb: true,
      symbiosisR2Boost: 18,
      doubleIfTokenBred: true,
      crAura: 95,
      crMult: 1.05,
      crPenaltyPct: 0,
      tag: "Nano Omni-Gen (90% • +18% H2)",
      desc: "Hàng 2: 90% tạo Token lên HÀNG 1; +18% tỷ lệ mọi ô Hàng 2 khác & x2 Aura nếu đã sinh Token!"
    };
  }
  if (sp.includes("wombiote") || c.id === "sentrion" || c.id === "parasoid") {
    const ch = c.id === "sentrion" ? 92 : 82;
    return {
      id: "r2_wombiote",
      tier: "wombiote",
      breedChance: ch,
      omniWomb: c.id === "sentrion",
      symbiosisR2Boost: 12,
      crAura: 95,
      crMult: 0.92,
      crPenaltyPct: 0,
      tag: `Wombiote → H1 (${ch}%)`,
      desc: `Hàng 2: ${ch}% mỗi lượt sinh Token Wombiote lên HÀNG 1 trống & +12% tỷ lệ Cộng Sinh Hàng 2.`
    };
  }

  // 3. SPECIAL LORE GENETICS & REFORMIST CONDITIONALS
  if (c.id === "dick") {
    return {
      id: "r2_override",
      tier: "sovereign",
      breedChance: 88,
      bypassImmunity: true,
      cancelHumanDebuff: true,
      symbiosisR2Boost: 25,
      crAura: 90,
      crMult: 0.95,
      crPenaltyPct: 0,
      tag: "Xóa Debuff & +25% H2 (88%)",
      desc: "Hàng 2: Xóa bỏ debuff -CR% Người Thuần, +25% tỷ lệ sinh lên Hàng 1 cho cả phe & +90 CR Hàng 1."
    };
  }
  if (c.id === "malocri" || c.id === "yulina" || c.id === "dejaylah") {
    return {
      id: "r2_reformist_aura",
      tier: "alien_buff",
      breedChance: 72,
      doubleIfTokenBred: true,
      crAura: Math.min(130, auraBase + 35),
      crMult: 0.94,
      crPenaltyPct: 0,
      tag: `Reformist (×2 Aura nếu có Token)`,
      desc: `Hàng 2: 72% sinh Token lên HÀNG 1 (+${Math.min(130, auraBase + 35)} CR, TĂNG GẤP ĐÔI nếu đã sinh Token!).`
    };
  }
  if (c.id === "meralina") {
    return {
      id: "r2_meralina",
      tier: "mutant",
      breedChance: 76,
      gapMutation: true,
      doubleIfTokenBred: true,
      crAura: 110,
      crMult: 1.0,
      crPenaltyPct: 0,
      tag: "Euphoria → H1 (76% • ×2 Aura)",
      desc: "Hàng 2: 76% sinh Token Nghịch Lý lên HÀNG 1 (+110 CR; x2 Aura khi có Token & bùng nổ nếu chênh CR >= 200)."
    };
  }
  if (sp.includes("hinatian")) {
    const ch = c.id === "july" ? 86 : 75;
    return {
      id: "r2_hinatian",
      tier: "alien_buff",
      breedChance: ch,
      blueBlood: true,
      crAura: 105,
      crMult: 0.95,
      crPenaltyPct: 0,
      tag: `Máu Xanh → H1 (${ch}%)`,
      desc: `Hàng 2: ${ch}% sinh Token Máu Xanh lên HÀNG 1 miễn nhiễm Virus (+105 CR Hàng 1).`
    };
  }

  // 4. PURE HUMAN / SERUM / CYBORG — LOW RATE + CR DEBUFF (UNLESS DICK CANCELS)!
  const isPureHuman = c.race === "human" && !sp.includes("serum") && !sp.includes("wombiote") && !sp.includes("biến đổi");
  if (isPureHuman) {
    return {
      id: "r2_human_weak",
      tier: "human_debuff",
      breedChance: 32,
      crAura: 35,
      crMult: 0.72,
      crPenaltyPct: 28,
      tag: "Người Thuần (32% • -28% CR)",
      desc: "Hàng 2 (Bất lợi): 32% sinh Token lên HÀNG 1 và Token bị -28% CR (trừ khi có đồng minh Dick hóa giải)."
    };
  }
  if (sp.includes("serum") || sp.includes("biến đổi") || sp.includes("tăng cường")) {
    return {
      id: "r2_serum_human",
      tier: "human_serum",
      breedChance: 52,
      crAura: 55,
      crMult: 0.88,
      crPenaltyPct: 12,
      tag: "Serum → H1 (52% • -12% CR)",
      desc: "Hàng 2: Serum nâng tỷ lệ sinh Token lên HÀNG 1 thành 52% (-12% CR Token)."
    };
  }

  // 5. STANDARD ALIEN / SOVEREIGN RESISTANCE (0-99%)
  const highRes = (c.cr || 0) >= 800;
  const chance = highRes ? 44 : 68;
  return {
    id: highRes ? "r2_sovereign_res" : "r2_alien_std",
    tier: highRes ? "sovereign" : "alien",
    breedChance: chance,
    immunity800: highRes,
    crAura: Math.min(140, auraBase + 30),
    crMult: highRes ? 0.95 : 0.85,
    crPenaltyPct: highRes ? 0 : 8,
    tag: `${c.species.split(" ")[0]} → H1 (${chance}%)`,
    desc: highRes
      ? `Hàng 2: Kháng thể CR>=800 sinh Token lên HÀNG 1 ở mức ${chance}% (82% nếu Cha >=800 CR) & +${Math.min(140, auraBase + 30)} CR Hàng 1.`
      : `Hàng 2: Tỷ lệ ${chance}% sinh Token lên HÀNG 1 cuối lượt (-8% CR nếu Cha yếu) & +${Math.min(140, auraBase + 30)} CR Hàng 1.`
  };
}

function charToCard(c) {
  const r1 = inferRow1Effect(c);
  const r2 = inferRow2Effect(c);
  const h1Keywords = inferH1Keywords(c, r1);
  const h2Keywords = inferH2Keywords(c, r2);
  r1.keywords = h1Keywords;
  r2.keywords = h2Keywords;
  return {
    id: c.id,
    charId: c.id,
    name: c.name,
    kind: "character",
    fac: c.fac,
    species: c.species,
    race: c.race,
    cr: c.cr,
    cost: getCardEnergyCost(c.cr, false),
    h: c.h || 1.75,
    gender: c.g === "M" ? "Male" : "Female",
    unique: true,
    h1Keywords,
    h2Keywords,
    leaderSkill: getLeaderSkillForCard(c),
    row1Effect: r1,
    row2Effect: r2
  };
}

// 36 Faction Reserve Units across ALL 8 factions with balanced Male/Female genders
const TROOP_SPECS = [
  // ERIS UNION
  { id: "tr_eris_sentinel", name: "Eris Outer Sentinel", fac: "eris", gender: "Male", species: "Cấu Thể Eris", race: "erisian", cr: 420,
    r1: { id: "tr1", tag: "Giáp Khối Đa Diện", bonusFlat: 80, desc: "Hàng 1: +80 CR tại Outer Layer hoặc khi dẫn đầu CR." },
    r2: { id: "tr2", tier: "alien", breedChance: 64, crAura: 85, crMult: 0.85, crPenaltyPct: 0, tag: "Tinh Thể Eris (64%)", desc: "Hàng 2: 64% sinh Token ánh sáng lên Hàng 1 & +85 CR Hàng 1." } },
  { id: "tr_eris_arbiter", name: "Eris Reset Arbiter", fac: "eris", gender: "Female", species: "Thiên Sứ Eris", race: "erisian", cr: 620,
    r1: { id: "tr1", tag: "Khóa Chân Không", bonusFlat: 110, desc: "Hàng 1: +110 CR & hủy bỏ buff chủng tộc đối diện." },
    r2: { id: "tr2", tier: "omniwomb", breedChance: 80, omniWomb: true, crAura: 110, crMult: 0.95, crPenaltyPct: 0, tag: "Ma Trận Eris (80%)", desc: "Hàng 2: 80% sinh Token Erisian đa biến lên Hàng 1 & +110 CR." } },
  { id: "tr_eris_keeper", name: "Eris Chronos Keeper", fac: "eris", gender: "Female", species: "Erisian", race: "erisian", cr: 340,
    r1: { id: "tr1", tag: "Ngưng Đọng Chu Kỳ", bonusFlat: 75, desc: "Hàng 1: +75 CR; rút +1 thẻ phe Eris khi ra sân." },
    r2: { id: "tr2", tier: "alien", breedChance: 62, crAura: 70, crMult: 0.85, crPenaltyPct: 5, tag: "Chuỗi Thời Gian (62%)", desc: "Hàng 2: 62% sinh Token lên Hàng 1 & +70 CR Hàng 1." } },
  { id: "tr_eris_prism", name: "Outer Layer Prism", fac: "eris", gender: "Male", species: "Sinh Thể Ánh Sáng", race: "erisian", cr: 510,
    r1: { id: "tr1", tag: "Khúc Xạ Vũ Trụ", bonusFlat: 95, desc: "Hàng 1: +95 CR và +50 CR cho Thủ lĩnh Hàng 3." },
    r2: { id: "tr2", tier: "alien", breedChance: 66, crAura: 95, crMult: 0.88, crPenaltyPct: 0, tag: "Phản Chiếu Gen (66%)", desc: "Hàng 2: 66% sinh Token lên Hàng 1 & +95 CR cho Hàng 1." } },
  { id: "tr_eris_warden", name: "Outer Loop Warden", fac: "eris", gender: "Male", species: "Hộ Vệ Eris", race: "erisian", cr: 480,
    r1: { id: "tr1", tag: "Tuần Tra Chu Kỳ", bonusFlat: 90, condType: "active_breed_or_token", condBonus: 110, desc: "Hàng 1: +90 CR. ĐK có Token/Lai Hàng 2 -> +110 CR!" },
    r2: { id: "tr2", tier: "alien", breedChance: 68, crAura: 90, crMult: 0.88, crPenaltyPct: 0, tag: "Hào Quang Eris (68%)", desc: "Hàng 2: 68% sinh Token lên Hàng 1 & +90 CR Hàng 1." } },
  { id: "tr_eris_weaver", name: "Null-Space Weaver", fac: "eris", gender: "Female", species: "Erisian Hư Vô", race: "erisian", cr: 560,
    r1: { id: "tr1", tag: "Đan Lưới Không Gian", bonusFlat: 105, desc: "Hàng 1: +105 CR giao chiến trực diện." },
    r2: { id: "tr2", tier: "alien_buff", breedChance: 74, symbiosisR2Boost: 12, crAura: 100, crMult: 0.92, crPenaltyPct: 0, tag: "Cộng Sinh Eris (+12% H2)", desc: "Hàng 2: 74% sinh Token lên Hàng 1 & +12% tỷ lệ mọi ô Hàng 2." } },

  // NADIRIUS EMPIRE
  { id: "tr_nad_knight", name: "Nadirius Astral Knight", fac: "nadirius", gender: "Male", species: "Hiệp Sĩ Nadir", race: "nadir", cr: 460,
    r1: { id: "tr1", tag: "Trật Tự Thép", bonusFlat: 90, desc: "Hàng 1: +90 CR; +100 CR thêm khi đấu Western Nadir." },
    r2: { id: "tr2", tier: "alien", breedChance: 65, crAura: 85, crMult: 0.85, crPenaltyPct: 0, tag: "Huyết Thống Đế Quốc (65%)", desc: "Hàng 2: 65% sinh Token lên Hàng 1 & +85 CR." } },
  { id: "tr_nad_warden", name: "Citadel Obsidian Warden", fac: "nadirius", gender: "Female", species: "Thần Vệ Nadir", race: "nadir", cr: 580,
    r1: { id: "tr1", tag: "Thành Lũy Citadel", bonusFlat: 115, desc: "Hàng 1: +115 CR bảo vệ tối đa tuyến đầu." },
    r2: { id: "tr2", tier: "alien_buff", breedChance: 72, crAura: 105, crMult: 0.9, crPenaltyPct: 0, tag: "Huyết Mạch Citadel (72%)", desc: "Hàng 2: 72% sinh Token Nadirius lên Hàng 1 & +105 CR." } },
  { id: "tr_nad_lancer", name: "Nadirius Shadow Lancer", fac: "nadirius", gender: "Male", species: "Tiên Phong Nadir", race: "nadir", cr: 390,
    r1: { id: "tr1", tag: "Mũi Thương Phản Kích", bonusFlat: 85, desc: "Hàng 1: +85 CR; +80 CR khi đánh lá Hàng 3." },
    r2: { id: "tr2", tier: "alien", breedChance: 60, crAura: 75, crMult: 0.82, crPenaltyPct: 5, tag: "Xung Huyết Nadir (60%)", desc: "Hàng 2: 60% sinh Token lên Hàng 1 & +75 CR." } },
  { id: "tr_nad_envoy", name: "Nadirius Royal Praetor", fac: "nadirius", gender: "Female", species: "Thần Nadir", race: "nadir", cr: 670,
    r1: { id: "tr1", tag: "Uy Nghiêm Hoàng Tộc", bonusFlat: 120, desc: "Hàng 1: +120 CR." },
    r2: { id: "tr2", tier: "alien_buff", breedChance: 78, crAura: 120, crMult: 0.95, crPenaltyPct: 0, tag: "Gen Vệ Thần (78%)", desc: "Hàng 2: 78% sinh Token Hoàng Tộc lên Hàng 1 & +120 CR." } },
  { id: "tr_nad_templar", name: "Citadel Solar Templar", fac: "nadirius", gender: "Male", species: "Hộ Vệ Nadir", race: "nadir", cr: 530,
    r1: { id: "tr1", tag: "Khiên Quang Ám", bonusFlat: 95, condType: "row1_token", condBonus: 120, desc: "Hàng 1: +95 CR. ĐK có Token Hàng 1 -> +120 CR!" },
    r2: { id: "tr2", tier: "alien", breedChance: 70, crAura: 95, crMult: 0.9, crPenaltyPct: 0, tag: "Lửa Citadel (70%)", desc: "Hàng 2: 70% sinh Token lên Hàng 1 & +95 CR." } },
  { id: "tr_nad_siren", name: "Nadirius Astra Siren", fac: "nadirius", gender: "Female", species: "Nữ Tư Tế Nadir", race: "nadir", cr: 495,
    r1: { id: "tr1", tag: "Khúc Ca Hoàng Đế", bonusFlat: 100, desc: "Hàng 1: +100 CR chiến đấu trực diện." },
    r2: { id: "tr2", tier: "alien_buff", breedChance: 76, doubleIfTokenBred: true, crAura: 95, crMult: 0.92, crPenaltyPct: 0, tag: "×2 Aura H2 (76%)", desc: "Hàng 2: 76% sinh Token lên Hàng 1; ×2 Aura (+190 CR) khi có Token!" } },

  // WESTERN NADIR
  { id: "tr_wn_raider", name: "Abyssal Border Raider", fac: "western_nadir", gender: "Male", species: "Chiến Binh Vực Thẳm", race: "nadir", cr: 410,
    r1: { id: "tr_wn_raider_r1", tag: "Tập Kích Vực Thẳm", bonusFlat: 95, condType: "active_breed_or_token", condBonus: 120, desc: "Hàng 1: +95 CR; -50 CR Sylvarian đối diện. ĐK Lai Hàng 2/Token -> +120 CR!" },
    r2: { id: "tr2", tier: "alien", breedChance: 68, crAura: 80, crMult: 0.88, crPenaltyPct: 0, tag: "Dịch Thể → H1 (68%)", desc: "Hàng 2: 68% sinh Token lên Hàng 1 & +80 CR Hàng 1." } },
  { id: "tr_wn_natheron", name: "Natheron Virus Host", fac: "western_nadir", gender: "Female", species: "Natheron Ký Sinh", race: "nadir", cr: 320,
    r1: { id: "tr1", tag: "Lây Lan Natheron", bonusFlat: 80, desc: "Hàng 1: +80 CR; giảm 100 CR đối thủ có CR < 800." },
    r2: { id: "tr2", tier: "omniwomb", breedChance: 84, omniWomb: true, virusTrait: true, symbiosisR2Boost: 12, crAura: 95, crMult: 0.9, crPenaltyPct: 0, tag: "Lò Ấp → H1 (84% • +12% H2)", desc: "Hàng 2: 84% sinh Token lên HÀNG 1 trống & tăng +12% tỷ lệ mọi ô Hàng 2!" } },
  { id: "tr_wn_starro", name: "Western Starro Matriarch", fac: "western_nadir", gender: "Female", species: "Starro Ký Sinh", race: "mutant", cr: 540,
    r1: { id: "tr1", tag: "Kiểm Soát Tâm Trí", bonusFlat: 105, condType: "row1_token", condBonus: 110, desc: "Hàng 1: +105 CR. ĐK có Token trên Hàng 1 -> +110 CR!" },
    r2: { id: "tr2", tier: "wombiote", breedChance: 86, omniWomb: true, symbiosisR2Boost: 10, crAura: 110, crMult: 0.92, crPenaltyPct: 0, tag: "Starro → H1 (86%)", desc: "Hàng 2: 86% phân bào tạo Token lên HÀNG 1 & +110 CR Hàng 1." } },
  { id: "tr_wn_symbiote", name: "Abyssal SpineFiend", fac: "western_nadir", gender: "Male", species: "Ác Quỷ Nadir", race: "demon", cr: 475,
    r1: { id: "tr1", tag: "Cộng Hưởng Bóng Đêm", bonusFlat: 95, condType: "active_breed", condBonus: 130, desc: "Hàng 1: +95 CR. ĐK Hàng 2 đang Lai Tạo -> +130 CR!" },
    r2: { id: "tr2", tier: "alien_buff", breedChance: 75, crAura: 90, crMult: 0.92, crPenaltyPct: 0, tag: "Huyết Quỷ → H1 (75%)", desc: "Hàng 2: 75% sinh Token quỷ lên Hàng 1 & +90 CR." } },
  { id: "tr_wn_broodmother", name: "Void Egg-Bearer", fac: "western_nadir", gender: "Female", species: "Brood Vực Thẳm", race: "wombiote", cr: 590,
    r1: { id: "tr1", tag: "Mẹ Ổ Hư Không", bonusFlat: 110, desc: "Hàng 1: +110 CR bảo vệ tổ kén." },
    r2: { id: "tr2", tier: "omniwomb", breedChance: 88, omniWomb: true, symbiosisR2Boost: 14, crAura: 115, crMult: 0.96, crPenaltyPct: 0, tag: "Omni-Brood (88% • +14% H2)", desc: "Hàng 2: 88% sinh Token đa hình lên Hàng 1 & +14% tỷ lệ cho mọi ô Hàng 2!" } },

  // THE COLLECTORS
  { id: "tr_col_ultrabot", name: "Tokyzhou Ultra-Bot Mk.II", fac: "collectors", gender: "Male", species: "Ultra Bot Cyborg", race: "cyborg", cr: 430,
    r1: { id: "tr_col_ultrabot_r1", tag: "Lưới Bắt Sinh Học", bonusFlat: 95, condType: "active_breed_or_token", condBonus: 125, desc: "Hàng 1: +95 CR; +125 CR khi Hàng 2 đang lai hoặc có Token trên sân!" },
    r2: { id: "tr2", tier: "human_serum", breedChance: 40, doubleIfTokenBred: true, crAura: 85, crMult: 0.78, crPenaltyPct: 20, tag: "Cyborg (40% • ×2 Aura)", desc: "Hàng 2: 40% sinh Token lên HÀNG 1 (-20% CR); x2 Aura nếu đã có Token!" } },
  { id: "tr_col_stalker", name: "Vander Bio-Harvester", fac: "collectors", gender: "Female", species: "Omni-Womb Thí Nghiệm", race: "mutant", cr: 510,
    r1: { id: "tr1", tag: "Săn Mẫu Vật", bonusFlat: 105, condType: "active_breed", condBonus: 120, desc: "Hàng 1: +105 CR (săn Tự Do/Người). ĐK Hàng 2 đang Lai -> +120 CR!" },
    r2: { id: "tr2", tier: "omniwomb", breedChance: 90, omniWomb: true, symbiosisR2Boost: 15, crAura: 100, crMult: 0.96, crPenaltyPct: 0, tag: "Omni-Womb → H1 (90%)", desc: "Hàng 2: 90% tạo Token đa dạng lên HÀNG 1 & +15% tỷ lệ Hàng 2!" } },
  { id: "tr_col_splicer", name: "Nexus Gene-Splicer", fac: "collectors", gender: "Female", species: "Wombiote Biến Đổi", race: "wombiote", cr: 470,
    r1: { id: "tr1", tag: "Ghép Chuỗi DNA", bonusFlat: 90, condType: "active_breed_or_token", condBonus: 130, desc: "Hàng 1: +90 CR. ĐK có Token/Lai Hàng 2 -> +130 CR!" },
    r2: { id: "tr2", tier: "wombiote", breedChance: 85, symbiosisR2Boost: 16, crAura: 95, crMult: 0.94, crPenaltyPct: 0, tag: "Wombiote (+16% H2 • 85%)", desc: "Hàng 2: 85% sinh Token lên Hàng 1 & kích +16% tỷ lệ mọi buồng Hàng 2!" } },
  { id: "tr_col_warden", name: "Containment Pod Warden", fac: "collectors", gender: "Male", species: "Ký Chủ Thử Nghiệm", race: "mutant", cr: 535,
    r1: { id: "tr1", tag: "Trấn Giữ Lồng Kính", bonusFlat: 110, desc: "Hàng 1: +110 CR." },
    r2: { id: "tr2", tier: "alien_buff", breedChance: 72, doubleIfTokenBred: true, crAura: 90, crMult: 0.9, crPenaltyPct: 0, tag: "×2 Aura H2 (72%)", desc: "Hàng 2: 72% sinh Token lên Hàng 1 & ×2 Aura (+180 CR) khi có Token!" } },
  { id: "tr_col_drone", name: "Collector Capture Drone", fac: "collectors", gender: "Male", species: "Bio-Drone", race: "cyborg", cr: 390,
    r1: { id: "tr1", tag: "Bắn Lưới Từ Tính", bonusFlat: 85, desc: "Hàng 1: +85 CR tấn công nhanh." },
    r2: { id: "tr2", tier: "alien", breedChance: 65, crAura: 75, crMult: 0.85, crPenaltyPct: 0, tag: "Thu Mẫu (65%)", desc: "Hàng 2: 65% sinh Token lên Hàng 1 & +75 CR." } },

  // SALVIC UNION
  { id: "tr_sal_veteran", name: "Predita 10-Year Veteran", fac: "salvic", gender: "Male", species: "Prozonian", race: "prozonian", cr: 480,
    r1: { id: "tr_sal_veteran_r1", tag: "Tàn Quân Bất Tử", bonusFlat: 120, condType: "active_breed_or_token", condBonus: 120, desc: "Hàng 1: +120 CR; +200 CR vs W.Nadir hoặc +120 CR khi có Token/Lai Hàng 2!" },
    r2: { id: "tr2", tier: "alien", breedChance: 64, crAura: 95, crMult: 0.88, crPenaltyPct: 0, tag: "Predita → H1 (64%)", desc: "Hàng 2: 64% sinh Token Prozonian lên HÀNG 1 & +95 CR Hàng 1." } },
  { id: "tr_sal_paladin", name: "Salvic Shield Maiden", fac: "salvic", gender: "Female", species: "Prozonian", race: "prozonian", cr: 390,
    r1: { id: "tr1", tag: "Khiên Thép Salvic", bonusFlat: 90, desc: "Hàng 1: +90 CR bảo hộ." },
    r2: { id: "tr2", tier: "alien", breedChance: 66, doubleIfTokenBred: true, crAura: 80, crMult: 0.86, crPenaltyPct: 5, tag: "Salvic → H1 (66% • ×2 Aura)", desc: "Hàng 2: 66% sinh Token lên HÀNG 1 & x2 Aura Hàng 2 nếu đã sinh Token!" } },
  { id: "tr_sal_medic", name: "Predita Field Biologist", fac: "salvic", gender: "Female", species: "Prozonian", race: "prozonian", cr: 440,
    r1: { id: "tr1", tag: "Hồi Phục Huyết Mạch", bonusFlat: 90, condType: "active_breed_or_token", condBonus: 115, desc: "Hàng 1: +90 CR. ĐK có Token/Lai Hàng 2 -> +115 CR!" },
    r2: { id: "tr2", tier: "alien_buff", breedChance: 72, symbiosisR2Boost: 10, crAura: 90, crMult: 0.9, crPenaltyPct: 0, tag: "Sinh Học (+10% H2 • 72%)", desc: "Hàng 2: 72% sinh Token lên Hàng 1 & +10% tỷ lệ cho mọi ô Hàng 2." } },
  { id: "tr_sal_vanguard", name: "Prozonian Assault Knight", fac: "salvic", gender: "Male", species: "Prozonian", race: "prozonian", cr: 560,
    r1: { id: "tr1", tag: "Kiếm Phá Trận", bonusFlat: 115, desc: "Hàng 1: +115 CR xung kích." },
    r2: { id: "tr2", tier: "alien", breedChance: 68, crAura: 100, crMult: 0.9, crPenaltyPct: 0, tag: "Hiệp Sĩ → H1 (68%)", desc: "Hàng 2: 68% sinh Token Hiệp Sĩ lên Hàng 1 & +100 CR." } },

  // TAMARITE
  { id: "tr_tam_paragon", name: "Pherone Photon Maiden", fac: "tamarite", gender: "Female", species: "Tamarite", race: "tamarite", cr: 610,
    r1: { id: "tr_tam_paragon_r1", tag: "Bão Quang Phổ", bonusFlat: 120, condType: "active_breed_or_token", condBonus: 140, desc: "Hàng 1: +120 CR (+90/Tamarite). ĐK có Token/Lai -> +140 CR!" },
    r2: { id: "tr2", tier: "tamarite", breedChance: 100, omniWomb: false, crAura: 125, crMult: 1.15, crPenaltyPct: 0, tag: "Tamarite → H1 (100%)", desc: "Hàng 2: Mặc định 100% sinh Token Tamarite thẳng lên HÀNG 1 trống!" } },
  { id: "tr_tam_guard", name: "Tamarite Solar Sentinel", fac: "tamarite", gender: "Male", species: "Tamarite", race: "tamarite", cr: 580,
    r1: { id: "tr1", tag: "Quang Khiên Thiên Đường", bonusFlat: 110, condType: "row1_token", condBonus: 130, desc: "Hàng 1: +110 CR. ĐK có Token Hàng 1 -> +130 CR!" },
    r2: { id: "tr2", tier: "tamarite", breedChance: 100, omniWomb: false, crAura: 115, crMult: 1.1, crPenaltyPct: 0, tag: "Tamarite → H1 (100%)", desc: "Hàng 2: Mặc định 100% sinh Token Tamarite lên Hàng 1 & +115 CR." } },
  { id: "tr_tam_weaver", name: "Paradise Gene-Priestess", fac: "tamarite", gender: "Female", species: "Tamarite", race: "tamarite", cr: 640,
    r1: { id: "tr1", tag: "Thánh Nữ Huyết Thống", bonusFlat: 125, desc: "Hàng 1: +125 CR quang năng." },
    r2: { id: "tr2", tier: "tamarite", breedChance: 100, omniWomb: true, symbiosisR2Boost: 15, crAura: 130, crMult: 1.18, crPenaltyPct: 0, tag: "Tamarite Omni (100% • +15%)", desc: "Hàng 2: 100% sinh Token Omni-Womb lên Hàng 1 & +15% tỷ lệ mọi ô Hàng 2!" } },
  { id: "tr_tam_enforcer", name: "Pherone Dawn Duelist", fac: "tamarite", gender: "Male", species: "Tamarite", race: "tamarite", cr: 515,
    r1: { id: "tr1", tag: "Bình Minh Pherone", bonusFlat: 100, condType: "active_breed", condBonus: 125, desc: "Hàng 1: +100 CR. ĐK Hàng 2 đang Lai Tạo -> +125 CR!" },
    r2: { id: "tr2", tier: "tamarite", breedChance: 100, omniWomb: false, crAura: 110, crMult: 1.08, crPenaltyPct: 0, tag: "Tamarite → H1 (100%)", desc: "Hàng 2: Mặc định 100% sinh Token Tamarite lên Hàng 1!" } },

  // SYLVARIAN & INDEPENDENT reserves
  { id: "tr_syl_guard", name: "Kronea Royal Guard", fac: "sylvarian", gender: "Male", species: "Sylvarian", race: "sylvarian", cr: 410,
    r1: { id: "tr1", tag: "Vệ Binh Hoàng Cung", bonusFlat: 85, condType: "row1_ally_token", condBonus: 95, desc: "Hàng 1: +85 CR. ĐK có Token Lai đồng hành trên Hàng 1 -> +95 CR!" },
    r2: { id: "tr2", tier: "alien", breedChance: 60, crAura: 80, crMult: 0.85, crPenaltyPct: 5, tag: "Astraum → H1 (60%)", desc: "Hàng 2: 60% sinh Token lên HÀNG 1 & +80 CR Hàng 1." } },
  { id: "tr_syl_ranger", name: "Sylvarian Star Ranger", fac: "sylvarian", gender: "Female", species: "Sylvarian", race: "sylvarian", cr: 520,
    r1: { id: "tr1", tag: "Xạ Thủ Tinh Cầu", bonusFlat: 100, condType: "active_breed_or_token", condBonus: 115, desc: "Hàng 1: +100 CR. ĐK có Token/Lai Hàng 2 -> +115 CR!" },
    r2: { id: "tr2", tier: "alien_buff", breedChance: 70, crAura: 95, crMult: 0.9, crPenaltyPct: 0, tag: "Sylvarian → H1 (70%)", desc: "Hàng 2: 70% sinh Token lên Hàng 1 & +95 CR." } },
  { id: "tr_syl_diplomat", name: "Astraum Peace Envoy", fac: "sylvarian", gender: "Male", species: "Sylvarian", race: "sylvarian", cr: 450,
    r1: { id: "tr1", tag: "Sứ Giả Kronea", bonusFlat: 95, desc: "Hàng 1: +95 CR." },
    r2: { id: "tr2", tier: "alien", breedChance: 66, doubleIfTokenBred: true, crAura: 85, crMult: 0.88, crPenaltyPct: 0, tag: "×2 Aura H2 (66%)", desc: "Hàng 2: 66% sinh Token lên Hàng 1 & ×2 Aura (+170 CR) khi có Token!" } },

  { id: "tr_ind_merc", name: "Gaiastra Horizon Merc", fac: "independent", gender: "Female", species: "Người", race: "human", cr: 350,
    r1: { id: "tr1", tag: "Lính Đánh Thuê Tự Do", bonusFlat: 90, condType: "active_breed_or_dick", condBonus: 110, desc: "Hàng 1: +90 CR. ĐK có Token/Dick/Lai Tạo -> +110 CR!" },
    r2: { id: "tr2", tier: "human_debuff", breedChance: 32, crAura: 35, crMult: 0.72, crPenaltyPct: 28, tag: "Người Thuần (32% • -28% CR)", desc: "Hàng 2 (Bất lợi): 32% sinh Token lên HÀNG 1 & bị giảm -28% CR (trừ khi có Dick)." } },
  { id: "tr_ind_smuggler", name: "Void-Lane Card Smuggler", fac: "independent", gender: "Male", species: "Người", race: "human", cr: 435,
    r1: { id: "tr1", tag: "Buôn Lậu Ngoài Vòng", bonusFlat: 95, condType: "active_breed_or_dick", condBonus: 115, desc: "Hàng 1: +95 CR. ĐK có Token/Dick/Lai -> +115 CR!" },
    r2: { id: "tr2", tier: "human_debuff", breedChance: 32, crAura: 40, crMult: 0.72, crPenaltyPct: 28, tag: "Người Thuần (32% • -28% CR)", desc: "Hàng 2 (Bất lợi): 32% sinh Token & bị giảm -28% CR (Dick hóa giải)." } },
  { id: "tr_ind_mystic", name: "Drifter Star Oracle", fac: "independent", gender: "Female", species: "Tiên Tri Tự Do", race: "erisian", cr: 510,
    r1: { id: "tr1", tag: "Tinh Tú Tự Do", bonusFlat: 100, desc: "Hàng 1: +100 CR." },
    r2: { id: "tr2", tier: "alien_buff", breedChance: 74, doubleIfTokenBred: true, crAura: 95, crMult: 0.92, crPenaltyPct: 0, tag: "×2 Aura H2 (74%)", desc: "Hàng 2: 74% sinh Token lên Hàng 1 & ×2 Aura (+190 CR) khi có Token!" } }
];

export const FACTION_TROOP_CARDS = TROOP_SPECS.map((t) => {
  const h1Keywords = inferH1Keywords(t, t.r1);
  const h2Keywords = inferH2Keywords(t, t.r2);
  t.r1.keywords = h1Keywords;
  t.r2.keywords = h2Keywords;
  return {
    id: t.id,
    troopId: t.id,
    name: t.name,
    kind: "troop",
    fac: t.fac,
    species: t.species,
    race: t.race,
    cr: t.cr,
    cost: getCardEnergyCost(t.cr, false),
    h: 1.85,
    gender: t.gender || "Male",
    unique: false,
    h1Keywords,
    h2Keywords,
    row1Effect: t.r1,
    row2Effect: t.r2
  };
});

export const CHARACTER_CARDS = CHARACTERS.map(charToCard);
export const CARDS = [...CHARACTER_CARDS, ...FACTION_TROOP_CARDS];
export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export function hybridToCard(h) {
  const cr = h.cr || 500;
  const r1 = h.row1Effect || {
    id: "hyb_resonance",
    tag: h.mutated ? "Đột Biến Thống Lĩnh" : "Cộng Hưởng Huyết Thống",
    bonusFlat: h.mutated ? 150 : 105,
    desc: `Hàng 1/3: ${h.signatureSkill || "Huyết Thống Hợp Nhất"} — +${h.mutated ? 150 : 105} CR giao chiến!`
  };
  const r2 = h.row2Effect || {
    id: "hyb_lineage",
    tier: "alien_buff",
    breedChance: 78,
    crAura: Math.max(85, Math.round(cr * 0.14)),
    crMult: 0.95,
    crPenaltyPct: 0,
    tag: "Gen Thế Hệ Lai (78%)",
    desc: `Hàng 2: 78% sinh Token F2 & +${Math.max(85, Math.round(cr * 0.14))} CR Hàng 1.`
  };
  const h1Keywords = h.h1Keywords || inferH1Keywords({ ...h, cr }, r1);
  const h2Keywords = h.h2Keywords || inferH2Keywords({ ...h, cr }, r2);
  r1.keywords = h1Keywords;
  r2.keywords = h2Keywords;
  return {
    id: h.id,
    isHybrid: true,
    isToken: Boolean(h.isToken),
    hybridData: h,
    name: h.name,
    kind: "hybrid",
    fac: h.fac || "tamarite",
    species: h.species || "Hybrid",
    race: h.race || "tamarite",
    cr,
    cost: getCardEnergyCost(cr, Boolean(h.isToken)),
    h: h.h || 1.9,
    gender: h.gender || (Math.random() < 0.5 ? "Male" : "Female"),
    unique: !h.isToken,
    h1Keywords,
    h2Keywords,
    leaderSkill: getLeaderSkillForCard(h),
    row1Effect: r1,
    row2Effect: r2
  };
}

export function resolveCard(cardId, hybrids = []) {
  if (CARD_BY_ID[cardId]) return CARD_BY_ID[cardId];
  const hy = (hybrids || []).find((h) => h.id === cardId);
  return hy ? hybridToCard(hy) : null;
}

export function getCardPortrait(card) {
  if (!card) return "";
  if (card.isHybrid && card.hybridData) return getHybridPortraitUrl(card.hybridData);
  if (card.charId && CHAR_BY_ID[card.charId]) return getPortraitUrl(CHAR_BY_ID[card.charId]);
  const rep = CHARACTERS.find((c) => c.fac === card.fac) || CHARACTERS[0];
  return getPortraitUrl(rep);
}

export function getFactionCardPool(factionId, hybrids = []) {
  const hybCards = (hybrids || []).filter((h) => h.fac === factionId).map(hybridToCard);
  const facCards = CARDS.filter((c) => c.fac === factionId);
  return [...hybCards, ...facCards].sort((a, b) => b.cr - a.cr);
}

// Builds a strict 16-card Faction Deck for the chosen Leader (excludes Leader on Row 3)
// Sized at 16 cards to sustain Draw-2-Per-Turn cadence cleanly!
// When ownedCollection map is passed, respects player ownership counts (1 for unique, <=3 for troops).
export function buildFactionDeck(leaderId = "arisia", hybrids = [], ownedCollection = null) {
  const leader = resolveCard(leaderId, hybrids) || CARD_BY_ID.arisia;
  const fac = leader.fac || "sylvarian";
  const allPool = getFactionCardPool(fac, hybrids).filter((c) => c.id !== leader.id);

  if (!ownedCollection) {
    const deck = [];
    for (const c of allPool) {
      if (deck.length >= 16) break;
      deck.push(c.id);
    }
    const troops = allPool.filter((c) => !c.unique);
    let idx = 0;
    while (deck.length < 16 && allPool.length > 0) {
      const src = troops.length > 0 ? troops[idx % troops.length] : allPool[idx % allPool.length];
      deck.push(src.id);
      idx++;
    }
    return deck.slice(0, 16);
  }

  const deck = [];
  const used = {};
  for (const c of allPool) {
    if (deck.length >= 16) break;
    const cap = c.isHybrid ? 1 : (c.unique ? Math.min(1, ownedCollection[c.id] || 0) : Math.min(3, ownedCollection[c.id] || 0));
    if (cap >= 1) {
      deck.push(c.id);
      used[c.id] = 1;
    }
  }
  const extraTroops = allPool.filter((c) => !c.unique && (ownedCollection[c.id] || 0) > (used[c.id] || 0));
  let guard = 0;
  while (deck.length < 16 && extraTroops.length > 0 && guard < 64) {
    const c = extraTroops[guard % extraTroops.length];
    const cap = Math.min(3, ownedCollection[c.id] || 0);
    if ((used[c.id] || 0) < cap) {
      deck.push(c.id);
      used[c.id] = (used[c.id] || 0) + 1;
    }
    guard++;
  }
  return deck.slice(0, 16);
}

export function validateDeckForLeader(deckIds = [], leaderId = "arisia", hybrids = [], ownedCollection = null) {
  const leader = resolveCard(leaderId, hybrids) || CARD_BY_ID.arisia;
  const fac = leader.fac;
  const used = {};
  const result = [];
  for (const id of (deckIds || [])) {
    if (id === leader.id) continue;
    const c = resolveCard(id, hybrids);
    if (!c || c.fac !== fac) continue;
    const maxAllowed = ownedCollection
      ? (c.isHybrid ? 1 : (c.unique ? Math.min(1, ownedCollection[id] || 0) : Math.min(3, ownedCollection[id] || 0)))
      : (c.unique ? 1 : 3);
    if ((used[id] || 0) >= maxAllowed) continue;
    used[id] = (used[id] || 0) + 1;
    result.push(id);
    if (result.length >= 16) break;
  }
  return result;
}

export function getCardPriceInfo(card) {
  if (!card) return { credits: 500, dust: 80, dustYield: 30, tierLabel: "Thường" };
  const cr = card.cr || 350;
  let credits = 450;
  let dust = 70;
  let tierLabel = "Dự Bị";
  if (!card.unique) {
    credits = Math.max(220, Math.round((cr * 1.15) / 10) * 10);
    dust = Math.max(30, Math.round(cr * 0.12));
    tierLabel = "Quân Dự Bị";
  } else if (cr >= 900) {
    credits = 3400;
    dust = 460;
    tierLabel = "Huyền Thoại Tối Thượng";
  } else if (cr >= 780) {
    credits = 2100;
    dust = 290;
    tierLabel = "Sử Thi";
  } else if (cr >= 600) {
    credits = 1250;
    dust = 175;
    tierLabel = "Tinh Nhuệ";
  } else {
    credits = Math.max(480, Math.round(cr * 1.3 / 10) * 10);
    dust = Math.max(70, Math.round(cr * 0.18));
    tierLabel = "Chiến Binh";
  }
  if (card.row2Effect?.tier === "tamarite" || card.row2Effect?.omniWomb) {
    credits += 250;
    dust += 35;
  }
  return { credits, dust, dustYield: Math.max(18, Math.round(dust * 0.42)), tierLabel };
}

export const CARD_PACKS = [
  {
    id: "faction_pack",
    name: "📦 Gói Tân Binh Phe",
    desc: "3 lá thuộc phe đang chọn (ưu tiên thẻ chưa đủ bản sao). Trùng sẽ hoàn Mảnh Gen.",
    costCredits: 750,
    costInfluence: 0,
    costResearch: 0,
    count: 3,
    mode: "faction"
  },
  {
    id: "gene_pack",
    name: "🧬 Gói Đột Biến Hàng 2",
    desc: "3 lá toàn thiên hà — ưu tiên thẻ có ĐK Hàng 1/2, Omni-Womb, Tamarite hoặc ♂/♀ phối ghép.",
    costCredits: 1150,
    costInfluence: 0,
    costResearch: 180,
    count: 3,
    mode: "gene"
  },
  {
    id: "mythic_vault",
    name: "👑 Hòm Huyền Thoại Gaiastra",
    desc: "4 lá toàn thiên hà — cam kết tối thiểu 1 Tướng CR ≥ 700, tỷ lệ cao Mythic CR 850+!",
    costCredits: 2600,
    costInfluence: 120,
    costResearch: 0,
    count: 4,
    mode: "mythic"
  },
  {
    id: "influence_scout",
    name: "🕊️ Tuyển Mộ Ngoại Giao",
    desc: "2 lá bằng 100% Ảnh Hưởng (không tốn Credits) — mở rộng nhanh nhân sự phe bạn & đồng minh.",
    costCredits: 0,
    costInfluence: 80,
    costResearch: 0,
    count: 2,
    mode: "scout"
  }
];
