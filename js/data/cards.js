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

export const CUSTOM_CHAR_EFFECTS = {
  // === 5 NHÂN VẬT CHUẨN MẪU CỦA USER (CHÍNH XÁC TUYỆT ĐỐI THEO ĐẶC TẢ) ===
  ovalina: {
    r1: {
      id: "ovalina_h1",
      tag: "Nữ Vương Pherone (+180 CR • +80/H2 • Phạt khác phe)",
      bonusFlat: 180,
      desc: "Effect Phase (Hàng 1/3): Tăng +180 CR cho toàn quân ta, và thêm +80 CR với mỗi card trong Hàng 2. Đổi lại, với mỗi card của bản thân trên Hàng 1 không thuộc phe Pherone Nexus (Tamarite), giảm -50 CR toàn bộ card trên sân ta."
    },
    r2: {
      id: "ovalina_h2",
      tier: "tamarite",
      ignition: true,
      lockNextTurnSummon: true,
      crAura: 135,
      tag: "Khóa Summon 1 Lượt • Hiến 3 Lá → 3 Token (+850 CR)",
      desc: "Summon Phase (Hàng 2): Người chơi không thể triệu hồi card vào lượt tiếp theo sau khi lá này được đặt vào Hàng 2. Bù lại, 1 lần trong lượt (ấn kích hoạt ở Summon Phase), gửi 3 lá bất kỳ từ trên tay và/hoặc sân xuống Mộ (ngoài lá này) để triệu hồi 3 Token lên Hàng 1 sân ta, CR tương đương CR các lá vừa gửi xuống Mộ + 850!"
    }
  },
  meralina: {
    r1: {
      id: "meralina_h1",
      tag: "Giảm 1/2 CR • Rút 2 Lá/Lượt • Buff Ragnaroir",
      bonusFlat: 0,
      halfSelfCR: true,
      drawTwoPerTurn: true,
      desc: "Effect Phase (Hàng 1/3): Bản thân giảm 1 nửa (50%) CR, bù lại mỗi lượt ở Draw Phase được rút 2 lá thay vì 1. Nếu có quái Ragnaroir trên sân ta, Ragnaroir nhận Kháng Hiệu Ứng + 250 CR!"
    },
    r2: {
      id: "meralina_h2",
      tier: "mutant",
      ignition: true,
      crAura: 110,
      tag: "Ignition H2: Có ♂ H1 → Sinh Token (×3 CR nếu Ragnaroir/<350)",
      desc: "Summon Phase (Hàng 2 — Ấn kích hoạt 1 lần/lượt): Nếu có ít nhất 1 card Nam (♂) ở Hàng 1 sân ta, sản sinh 1 Token lên Hàng 1 có cùng Loài và Phe với card đó, CR bằng CR của card cha (nếu card cha là Ragnaroir, hoặc bất kỳ card nào có CR < 350 và khác loài Sylvarian, thì Token nhận 3 lần CR cha thành CR bản thân!)."
    }
  },
  arisia: {
    r1: {
      id: "arisia_h1",
      tag: "Hàng 1 Bất Tử Lần Đầu • Token H2 +200 CR",
      bonusFlat: 120,
      firstBattleImmunityAllRow1: true,
      tokenBonus200UntilNextTurn: true,
      desc: "Effect Phase (Hàng 1/3): Các card của bạn ở Hàng 1 không thể bị tiêu diệt trong chiến đấu lần đầu tiên, đồng thời CR của các Token sinh ra bởi Hàng 2 lên sân bạn được cộng +200 CR cho đến hết lượt sau khi nó được triệu hồi!"
    },
    r2: {
      id: "none",
      isNone: true,
      tier: "none",
      crAura: 0,
      tag: "None (Không có hiệu ứng)",
      desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)."
    }
  },
  aphrodina: {
    r1: {
      id: "aphrodina_h1",
      tag: "Kháng Tuyệt Đối Hiệu Ứng Bài Khác",
      bonusFlat: 0,
      unaffectedByOtherCards: true,
      desc: "Effect Phase / Nội tại (Hàng 1/3): Lá này không bị ảnh hưởng bởi hiệu ứng của bài khác."
    },
    r2: {
      id: "aphrodina_h2",
      tier: "alien_buff",
      ignition: true,
      onCaptureOriginalOwnerDraw: 1,
      crAura: 60,
      tag: "Đặt vào H2: Chủ Cũ Rút 1 • Summon: Sinh Token Sao Chép CR & Kháng Eff",
      desc: "Hàng 2: Khi lá này được đặt vào Hàng 2, người điều khiển ban đầu được rút 1 lá. Mỗi Summon Phase (ấn kích hoạt 1 lần/lượt), sinh ra 1 Token lên Hàng 1 với CR bằng CR 1 lá bất kỳ thuộc Hàng 1 trên sân cả 2 bên, đồng thời Token đó không bị ảnh hưởng bởi hiệu ứng bài khác ở Hàng 1!"
    }
  },
  cynthia: {
    r1: {
      id: "none",
      isNone: true,
      tag: "None (Không có hiệu ứng)",
      bonusFlat: 0,
      desc: "Hàng 1: None (Không có hiệu ứng ở Hàng 1)."
    },
    r2: {
      id: "cynthia_h2",
      tier: "human_special",
      ignition: true,
      returnToOriginalOwnerRow2: true,
      crAura: 30,
      tag: "Đặt vào H2: Tự Chuyển Về Sân Mình • Ignition: Bỏ Tay → Sinh N Token (200 × N)",
      desc: "Hàng 2: Khi lá này bị đặt vào Hàng 2, tự động chuyển về Hàng 2 sân mình thay vì sân đối thủ! Summon Phase (Ấn kích hoạt 1 lần/lượt): Bỏ toàn bộ bài trên tay của bạn xuống Mộ, triệu hồi một số Token lên Hàng 1 tương ứng với số bài bạn vừa bỏ khỏi tay, CR của mỗi Token bằng 200 × số bài đã bỏ!"
    }
  },

  // === CÁC NHÂN VẬT CÒN LẠI (THIẾT KẾ RIÊNG BIỆT THEO SỨC MẠNH, TÍNH CÁCH & LORE) ===
  overlord: {
    r1: { id: "overlord_h1", tag: "Thuật Cực Hạn (+250 CR • -150 CR Địch • Diệt 1 Token)", bonusFlat: 250, enemyAllPenalty: 150, destroyEnemyToken: 1, desc: "Effect Phase (Hàng 1/3): Tăng +250 CR bản thân, áp chế giảm -150 CR toàn bộ Hàng 1 địch và tiêu diệt ngay 1 Token yếu nhất trên Hàng 1 địch!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Chúa tể Vực Thẳm không có hiệu ứng ở Hàng 2)." }
  },
  emma: {
    r1: { id: "emma_h1", tag: "Khóa Cổng Đa Vũ Trụ (Xóa Buff Địch • +180 CR Eris)", bonusFlat: 180, nullifyOppositeBuffs: true, allyFacBonus: 180, desc: "Effect Phase (Hàng 1/3): Đưa CR của lá đối diện về CR Gốc (xóa mọi hiệu ứng cộng thêm) và tăng +180 CR cho toàn bộ thẻ Eris trên sân ta." },
    r2: { id: "emma_h2", tier: "erisian", ignition: true, crAura: 120, tag: "Ignition H2: Hồi Sinh 1 Lá Từ Mộ & Sinh Token Thiên Sứ (650 CR)", desc: "Summon Phase (Hàng 2): Thu hồi 1 lá bài từ Mộ về tay bạn và triệu hồi 1 Token Thiên Sứ Eris (CR 650, Kháng Hiệu Ứng) lên Hàng 1!" }
  },
  uterussa: {
    r1: { id: "uterussa_h1", tag: "Thu Nhỏ Cơ Thể 1m67 (+300 CR Cho Mọi Token)", bonusFlat: 160, boostAllTokens: 300, desc: "Effect Phase (Hàng 1/3): Tăng +160 CR bản thân và truyền năng lượng Hyper-Photon cộng +300 CR cho toàn bộ Token trên Hàng 1 sân ta!" },
    r2: { id: "uterussa_h2", tier: "tamarite", ignition: true, crAura: 130, tag: "Ignition H2: Gửi 1 Lá Xuống Mộ → Sinh 2 Omni-Token (+450 CR)", desc: "Summon Phase (Hàng 2): Gửi 1 lá từ trên tay xuống Mộ để triệu hồi 2 Omni-Token lên Hàng 1 với CR bằng CR lá vừa gửi + 450!" }
  },
  ceasaria: {
    r1: { id: "ceasaria_h1", tag: "Cú Nện Tyranian (+260 CR • -150 CR Đối Diện)", bonusFlat: 260, oppPenalty: 150, desc: "Effect Phase (Hàng 1/3): Thân hình 3,5m và ý chí sắt đá giúp cộng +260 CR cho bản thân và giáng đòn giảm -150 CR lá đối diện." },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  kyaria: {
    r1: { id: "kyaria_h1", tag: "Lữ Khách Đa Chiều (+90 CR Mỗi Chủng Tộc Trên Sân)", bonusFlat: 120, perUniqueSpeciesBonus: 90, desc: "Effect Phase (Hàng 1/3): Tăng +120 CR và nhận thêm +90 CR với mỗi chủng tộc (species) khác nhau đang hiện diện trên Hàng 1 cả 2 bên!" },
    r2: { id: "kyaria_h2", tier: "tamarite", ignition: true, crAura: 110, tag: "Ignition H2: Sao Chép Chủng Tộc & Sinh Token (CR Đích + 200)", desc: "Summon Phase (Hàng 2): Chọn 1 lá có CR cao nhất trên Hàng 1 để sinh 1 Token mang chủng tộc của lá đó lên Hàng 1 ta với CR = CR lá đó + 200!" }
  },
  tsunadia: {
    r1: { id: "tsunadia_h1", tag: "Clone Force (Bất Tử Lần Đầu & Tạo 1 Phân Thân 500 CR)", bonusFlat: 130, selfFirstBattleImmunity: true, spawnCloneCR: 500, desc: "Effect Phase (Hàng 1/3): Dùng phân thân chịu đòn thay (không thể bị tiêu diệt lần đầu) và triệu hồi 1 Token Phân Thân Tsunadia (CR 500) vào ô trống Hàng 1!" },
    r2: { id: "tsunadia_h2", tier: "omniwomb", ignition: true, crAura: 125, tag: "Ignition H2: Sinh 2 Token Quân Đoàn Nadir (CR 480–730)", desc: "Summon Phase (Hàng 2): Triệu hồi 2 Token Quân Đoàn Nadir (CR 480, hoặc CR 730 nếu trên sân có Huynh đệ Nadir) lên Hàng 1 sân ta!" }
  },
  brigitte: {
    r1: { id: "brigitte_h1", tag: "Bổ Nhào Tinh Quang (+160 CR • Cộng Hưởng Zarcseid/Prozonian)", bonusFlat: 160, zarcseidSynergy: 220, desc: "Effect Phase (Hàng 1/3): Tăng +160 CR; nếu trên sân có Zarcseid hoặc thẻ Prozonian, cả Brigitte và các thẻ đó nhận thêm +220 CR và miễn nhiễm giảm CR!" },
    r2: { id: "brigitte_h2", tier: "alien_buff", ignition: true, crAura: 95, tag: "Ignition H2: Rút 1 Lá & Sinh Token Ngôi Sao (CR 480)", desc: "Summon Phase (Hàng 2): Rút 1 lá bài và triệu hồi 1 Token Vệ Sĩ Ngôi Sao (CR 480) lên Hàng 1." }
  },
  pussiri: {
    r1: { id: "pussiri_h1", tag: "Gen Bất Ổn Synthesis (Rút 1 Lá • Đột Biến +240 CR)", bonusFlat: 240, drawOnEffect: 1, desc: "Effect Phase (Hàng 1/3): Tiết lộ mật tin giúp rút 1 lá bài và kích nổ dòng gen Synthesis 65/30/5 tăng +240 CR trong lượt này!" },
    r2: { id: "pussiri_h2", tier: "tamarite", ignition: true, crAura: 115, tag: "Ignition H2: Sinh Token Synthesis (CR = 65% Tổng 2 Lá Mạnh Nhất H1)", desc: "Summon Phase (Hàng 2): Triệu hồi 1 Token Synthesis lên Hàng 1 có CR bằng 65% tổng CR của 2 lá mạnh nhất trên Hàng 1 sân ta (tối thiểu 550 CR)!" }
  },
  elita: {
    r1: { id: "elita_h1", tag: "Khiên Giảm Nguyền 80% (+160 CR Toàn Prozonian & Kháng Trừ CR)", bonusFlat: 160, prozonianImmunityAndBuff: 160, desc: "Effect Phase (Hàng 1/3): Toàn bộ thẻ Prozonian trên sân miễn nhiễm giảm CR và nhận +160 CR (+300 CR nếu có Hyouya hoặc Cipheron trên bàn đấu)!" },
    r2: { id: "elita_h2", tier: "alien_buff", ignition: true, crAura: 105, tag: "Ignition H2: Có ♂ H1 → Sinh Token Tinh Hoa Prozonian (CR Cha + 250)", desc: "Summon Phase (Hàng 2): Nếu có ít nhất 1 thẻ Nam (♂) trên Hàng 1 ta, sinh 1 Token Tinh Hoa Prozonian lên Hàng 1 với CR = CR thẻ Nam đó + 250!" }
  },
  yulina: {
    r1: { id: "yulina_h1", tag: "Lốc Song Rìu (+170 CR • +320 CR Khi Có Veidos & Phá Bất Tử)", bonusFlat: 170, veidosSynergy: 150, pierceImmunity: true, desc: "Effect Phase (Hàng 1/3): Tăng +170 CR (thành +320 CR nếu có Veidos trên sân) và đòn tấn công xuyên thủng mọi hiệu ứng chặn thua/Khiên của lá đối diện!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  atomina: {
    r1: { id: "atomina_h1", tag: "Điều Khiển Mật Độ Nguyên Tử (Hấp Thụ CR Đối Diện)", bonusFlat: 140, absorbHigherOppCR: true, desc: "Effect Phase (Hàng 1/3): Tăng +140 CR; nếu lá đối diện có CR cao hơn Atomina, cô điều khiển mật độ nguyên tử hấp thụ 60% phần chênh lệch đó cộng vào CR bản thân!" },
    r2: { id: "atomina_h2", tier: "alien_buff", ignition: true, crAura: 95, tag: "Ignition H2: Phân Tách Nguyên Tử → Sinh 2 Token (CR 480)", desc: "Summon Phase (Hàng 2): Phân tách mật độ nguyên tử triệu hồi 2 Token Nguyên Tử Alterian (CR 480 mỗi lá) lên các ô trống Hàng 1!" }
  },
  hyouya: {
    r1: { id: "hyouya_h1", tag: "Chiếu Chỉ Hoàng Hậu (Bất Tử Lần Đầu & +170 CR Cùng Magnatere/Elita)", bonusFlat: 170, selfFirstBattleImmunity: true, desc: "Effect Phase (Hàng 1/3): Không thể bị tiêu diệt trong chiến đấu lần đầu và tăng +170 CR cho bản thân cùng Magnatere/Elita trên sân!" },
    r2: { id: "hyouya_h2", tier: "alien_buff", ignition: true, crAura: 100, tag: "Ignition H2: Sinh Token Hoàng Tử Nadirius (CR 680)", desc: "Summon Phase (Hàng 2): Triệu hồi 1 Token Hoàng Tử Nadirius (CR 680) lên Hàng 1 sân ta!" }
  },
  sharon: {
    r1: { id: "sharon_h1", tag: "Khiên Ishizeum-Akizium (Bất Tử Lần Đầu & +120 CR Mỗi Lá Salvic)", bonusFlat: 140, selfFirstBattleImmunity: true, perAllyFacBonus: 100, desc: "Effect Phase (Hàng 1/3): Khiên Ishizeum-Akizium giúp chặn thua chiến đấu lần đầu và cộng +100 CR cho mỗi thẻ Salvic trên Hàng 1!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  jane: {
    r1: { id: "jane_h1", tag: "Hắc Thuật Raven (-300 CR Đối Diện & +200 CR Bản Thân)", bonusFlat: 200, oppPenalty: 300, desc: "Effect Phase (Hàng 1/3): Phóng ma thuật hắc ám giảm -300 CR của lá đối diện và tăng +200 CR cho bản thân!" },
    r2: { id: "jane_h2", tier: "omniwomb", ignition: true, crAura: 95, tag: "Ignition H2: Triệu Hồi Bóng Ma Từ Mộ (CR Cao Nhất Mộ + 200)", desc: "Summon Phase (Hàng 2): Triệu hồi 1 Token Bóng Ma Vực Thẳm lên Hàng 1 có CR bằng CR lá mạnh nhất trong Mộ + 200 (tối thiểu 580 CR)!" }
  },
  amily: {
    r1: { id: "amily_h1", tag: "Power Burst (+220 CR Tức Thời & Miễn Nhiễm Trừ CR)", bonusFlat: 220, unaffectedByOtherCards: true, desc: "Effect Phase (Hàng 1/3): Kích hoạt Power Burst tăng ngay +220 CR và miễn nhiễm với hiệu ứng giảm CR của bài khác!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  sofie: {
    r1: { id: "sofie_h1", tag: "Hơi Thở Tuyệt Băng IQ 263 (Đóng Băng -220 CR Địch & Rút 1 Lá)", bonusFlat: 150, oppPenalty: 220, drawOnEffect: 1, desc: "Effect Phase (Hàng 1/3): Đóng băng giảm -220 CR lá đối diện, tăng +150 CR bản thân và rút 1 lá bài chiến thuật!" },
    r2: { id: "sofie_h2", tier: "alien_buff", ignition: true, crAura: 90, tag: "Ignition H2: Sinh Token Băng Giá PSSR (CR 540) & Rút 1 Lá", desc: "Summon Phase (Hàng 2): Triệu hồi 1 Token Chiến Binh Băng Giá (CR 540) lên Hàng 1 và rút 1 lá bài!" }
  },
  mary: {
    r1: { id: "mary_h1", tag: "Sấm Sét Điện Quang (-150 CR Toàn Hàng 1 Địch • +220 CR Với Avalanche)", bonusFlat: 160, enemyAllPenalty: 150, desc: "Effect Phase (Hàng 1/3): Phóng chuỗi sấm sét giảm -150 CR toàn bộ Hàng 1 địch và tăng +160 CR bản thân (+300 CR nếu có Avalanche)!" },
    r2: { id: "mary_h2", tier: "alien_buff", ignition: true, crAura: 90, tag: "Ignition H2: Sinh Token Tia Chớp F2 (CR 560)", desc: "Summon Phase (Hàng 2): Sinh 1 Token Tia Chớp F2 (CR 560, hoặc CR 820 nếu có Avalanche trên sân) lên Hàng 1!" }
  },
  jorduyn: {
    r1: { id: "jorduyn_h1", tag: "Cộng Hưởng Hinatian (+160 CR Toàn Quân & Miễn Trừ CR)", bonusFlat: 160, allyAllBonus: 120, desc: "Effect Phase (Hàng 1/3): Tăng +160 CR bản thân và +120 CR cho toàn bộ đồng minh trên Hàng 1 (đặc biệt là July & Malocri)." },
    r2: { id: "jorduyn_h2", tier: "alien_buff", ignition: true, crAura: 95, tag: "Ignition H2: Sinh Token Hoàng Tộc Hinatian (CR 550) & Rút 1 Lá", desc: "Summon Phase (Hàng 2): Sinh 1 Token Hoàng Tộc Hinatian (CR 550) lên Hàng 1 và rút 1 lá bài!" }
  },
  april: {
    r1: { id: "april_h1", tag: "Đặc Vụ Truy Sát (+220 CR & Tiêu Diệt 1 Token Địch)", bonusFlat: 220, destroyEnemyToken: 1, desc: "Effect Phase (Hàng 1/3): Tăng +220 CR cho bản thân và lập tức xóa sổ 1 Token đang có trên Hàng 1 của đối phương!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Đặc vụ mật của Arisia không có hiệu ứng Hàng 2)." }
  },
  yulia: {
    r1: { id: "yulia_h1", tag: "Đọc Tâm Trí Molotov–Ribbentrop (Sao Chép 50% CR Hàng 3 Địch)", bonusFlat: 150, copyHalfEnemyLeaderCR: true, desc: "Effect Phase (Hàng 1/3): Đọc thấu tâm trí đối phương, cộng thêm 50% CR gốc của Thủ lĩnh Hàng 3 địch vào CR của Yulia trong lượt này!" },
    r2: { id: "yulia_h2", tier: "alien_buff", ignition: true, crAura: 85, tag: "Ignition H2: Rút 1 Lá & Sinh Token Ký Ức Cổ Đại (CR = 160 × Số Bài Tay)", desc: "Summon Phase (Hàng 2): Rút 1 lá bài, sau đó triệu hồi 1 Token Ký Ức Cổ Đại lên Hàng 1 có CR = 160 × số bài trên tay bạn!" }
  },
  anissa: {
    r1: { id: "anissa_h1", tag: "Thân Sắt Thực Tập Sinh (Bất Tử Lần Đầu & +180 CR)", bonusFlat: 180, selfFirstBattleImmunity: true, desc: "Effect Phase (Hàng 1/3): Thân sắt bất khuất giúp không thể bị tiêu diệt trong chiến đấu lần đầu và nhận +180 CR!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  dejaylah: {
    r1: { id: "dejaylah_h1", tag: "Kiếm Pháp Khvaron (+260 CR Khi Đấu Kẻ Mạnh Hơn & Xuyên Khiên)", bonusFlat: 260, pierceImmunity: true, desc: "Effect Phase (Hàng 1/3): Bậc thầy kiếm thuật tăng +260 CR và chém xuyên mọi hiệu ứng chặn thua của đối thủ đối diện!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  felicia: {
    r1: { id: "felicia_h1", tag: "AI Bernice Yểm Trợ (+180 CR Toàn Quân & Bất Tử Lần Đầu)", bonusFlat: 180, allyAllBonus: 140, selfFirstBattleImmunity: true, desc: "Effect Phase (Hàng 1/3): AI Bernice phân tích chiến trường, giúp Felicia không thể bị tiêu diệt lần đầu và cộng +140 CR cho toàn bộ Hàng 1 ta!" },
    r2: { id: "felicia_h2", tier: "alien_buff", ignition: true, crAura: 90, tag: "Ignition H2: Triệu Hồi Drone AI Bernice (CR 600, Kháng Eff)", desc: "Summon Phase (Hàng 2): Triệu hồi 1 Token Drone AI Bernice (CR 600, Kháng Hiệu Ứng Bài Khác) lên Hàng 1 sân ta!" }
  },
  inga: {
    r1: { id: "inga_h1", tag: "Vệ Sĩ Serum I (+200 CR & Bảo Hộ Hàng 3)", bonusFlat: 200, desc: "Effect Phase (Hàng 1/3): Serum Pregnomorph I kích thích phản xạ tăng +200 CR cho bản thân và +150 CR cho Thủ lĩnh Hàng 3." },
    r2: { id: "inga_h2", tier: "human_serum", ignition: true, crAura: 75, tag: "Ignition H2: Bỏ 1 Lá Tay → Sinh Token Vệ Sĩ Serum (CR 620)", desc: "Summon Phase (Hàng 2): Bỏ 1 lá trên tay xuống Mộ để triệu hồi 1 Token Vệ Sĩ Serum (CR 620) lên Hàng 1!" }
  },
  princesa: {
    r1: { id: "princesa_h1", tag: "Giáp Khao Khát Bán Thần (Bất Tử Lần Đầu & +240 CR)", bonusFlat: 240, selfFirstBattleImmunity: true, desc: "Effect Phase (Hàng 1/3): Giáp Khao Khát của các vị thần bị lãng quên giúp không thể bị tiêu diệt lần đầu và tăng +240 CR!" },
    r2: { id: "princesa_h2", tier: "alien_buff", ignition: true, crAura: 95, tag: "Ignition H2: Sinh Token Chiến Thần Cổ Đại (CR 640)", desc: "Summon Phase (Hàng 2): Triệu hồi 1 Token Chiến Thần Cổ Đại (CR 640) lên Hàng 1 sân ta!" }
  },
  qiyana: {
    r1: { id: "qiyana_h1", tag: "Lệnh Hoàng Tộc Ixalcian (+120 CR Mỗi Đồng Minh Hàng 1)", bonusFlat: 150, allyAllBonus: 120, desc: "Effect Phase (Hàng 1/3): Công chúa cuối cùng của Ixalcian hiệu triệu toàn quân, tăng +120 CR cho mỗi thẻ đồng minh trên Hàng 1!" },
    r2: { id: "qiyana_h2", tier: "alien_buff", ignition: true, crAura: 85, tag: "Ignition H2: Sinh 2 Token Cận Vệ Lục Bảo (CR 420)", desc: "Summon Phase (Hàng 2): Triệu hồi 2 Token Cận Vệ Lục Bảo Ixalcian (CR 420 mỗi lá) lên các ô trống Hàng 1!" }
  },
  eleanor: {
    r1: { id: "eleanor_h1", tag: "Sắc Lệnh Tổng Thống (+150 CR Toàn Quân & Rút 1 Lá)", bonusFlat: 150, allyAllBonus: 150, drawOnEffect: 1, desc: "Effect Phase (Hàng 1/3): Ban hành sắc lệnh Tổng thống Trái Đất, cộng +150 CR cho toàn bộ Hàng 1 ta và rút 1 lá bài!" },
    r2: { id: "eleanor_h2", tier: "human_serum", ignition: true, crAura: 80, tag: "Ignition H2: Sinh Token Đặc Vụ Serum III (CR 580)", desc: "Summon Phase (Hàng 2): Huyết mạch Serum III sản sinh 1 Token Đặc Vụ Tổng Thống (CR 580) lên Hàng 1!" }
  },
  glinda: {
    r1: { id: "glinda_h1", tag: "Bùa Hồng Ma Thuật (-250 CR Địch Đối Diện & +160 CR Quân Ta)", bonusFlat: 160, oppPenalty: 250, desc: "Effect Phase (Hàng 1/3): Thi triển ma thuật Ixalcian giảm -250 CR của lá đối diện và tăng +160 CR cho bản thân!" },
    r2: { id: "glinda_h2", tier: "alien_buff", ignition: true, crAura: 85, tag: "Ignition H2: Sinh Token Ảo Ảnh Ma Thuật (CR = 60% CR Hàng 3)", desc: "Summon Phase (Hàng 2): Triệu hồi 1 Token Ảo Ảnh Ma Thuật lên Hàng 1 có CR bằng 60% CR của Thủ lĩnh Hàng 3 sân ta!" }
  },
  july: {
    r1: { id: "july_h1", tag: "Nữ Hoàng Hinatian (+200 CR Toàn Quân & Kháng Trừ CR)", bonusFlat: 200, allyAllBonus: 160, unaffectedByOtherCards: true, desc: "Effect Phase (Hàng 1/3): Trí tuệ tối cao Hinatian và 10% gen Tamarite giúp miễn nhiễm hiệu ứng xấu và cộng +160 CR cho toàn bộ Hàng 1 ta!" },
    r2: { id: "july_h2", tier: "tamarite", ignition: true, crAura: 110, tag: "Ignition H2: 10% Gen Tamarite → Sinh Token Pha Lê (CR 680)", desc: "Summon Phase (Hàng 2): Kích hoạt 10% gen Tamarite hoàng gia, triệu hồi ngay 1 Token Pha Lê Hinatian (CR 680) lên Hàng 1!" }
  },
  ellie: {
    r1: { id: "ellie_h1", tag: "Kiếm Helios (Phá Bất Tử/Khiên Địch & +280 CR)", bonusFlat: 280, pierceImmunity: true, desc: "Effect Phase (Hàng 1/3): Kiếm Helios vô hiệu hóa mọi hiệu ứng bất tử/chặn thua của đối thủ đối diện và tăng +280 CR!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  hailey: {
    r1: { id: "hailey_h1", tag: "Súng Absolute Zero (Giảm 1/2 CR Lá Đối Diện)", bonusFlat: 150, halveOppositeCR: true, desc: "Effect Phase (Hàng 1/3): Bắn đạn độ không tuyệt đối làm giảm một nửa (50%) CR của lá đối diện trong lượt này!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Do chấn thương từ thí nghiệm của Exorotic, không có hiệu ứng Hàng 2)." }
  },
  julia: {
    r1: { id: "julia_h1", tag: "Đưa Tin Nóng (Rút 1 Lá & +180 CR Toàn Quân)", bonusFlat: 180, allyAllBonus: 120, drawOnEffect: 1, desc: "Effect Phase (Hàng 1/3): Tốc độ phóng viên chiến trường giúp rút ngay 1 lá bài và cộng +120 CR cho toàn bộ Hàng 1 ta!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  trang: {
    r1: { id: "trang_h1", tag: "Demo Serum II (+250 CR & Bất Tử Lần Đầu)", bonusFlat: 250, selfFirstBattleImmunity: true, desc: "Effect Phase (Hàng 1/3): Sản phẩm hoàn hảo của Serum Pregnomorph II giúp tự hồi phục (bất tử chiến đấu lần đầu) và nhận +250 CR!" },
    r2: { id: "trang_h2", tier: "human_serum", ignition: true, crAura: 85, tag: "Ignition H2: Sinh 2 Token Chiến Binh Serum II (CR 480)", desc: "Summon Phase (Hàng 2): Triệu hồi 2 Token Chiến Binh Serum II (CR 480 mỗi lá, hoặc 680 nếu có Bill trên sân) lên Hàng 1!" }
  },
  sarah: {
    r1: { id: "sarah_h1", tag: "Lựu Đạn Lượng Tử (-450 CR Lá Đối Diện & Phá Giáp)", bonusFlat: 200, oppPenalty: 450, pierceImmunity: true, desc: "Effect Phase (Hàng 1/3): Ném lựu đạn lượng tử xuyên phá cả Tamarisium, giảm -450 CR của lá đối diện và xuyên mọi hiệu ứng chặn thua!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  grace: {
    r1: { id: "grace_h1", tag: "Súng Blast Công Nghệ (Rút 1 Lá & +220 CR Cho Thẻ <500 CR)", bonusFlat: 220, drawOnEffect: 1, lowCRAllyBoost: 220, desc: "Effect Phase (Hàng 1/3): Rút 1 lá bài và dùng thiết bị công nghệ tăng +220 CR cho mọi thẻ có CR gốc < 500 trên Hàng 1 ta!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  chunliva: {
    r1: { id: "chunliva_h1", tag: "One Shot Kick (+900 CR Tức Thời Trong Lượt Này!)", bonusFlat: 900, desc: "Effect Phase (Hàng 1/3): Tung cú đá tất sát từng hạ gục cả Felicia — bùng nổ cộng thẳng +900 CR trong lượt này!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  emily: {
    r1: { id: "emily_h1", tag: "Cộng Sinh Wombiote String (+320 CR & Bất Tử Lần Đầu)", bonusFlat: 320, selfFirstBattleImmunity: true, desc: "Effect Phase (Hàng 1/3): Cộng sinh cùng Wombiote String giúp tăng +320 CR và không thể bị tiêu diệt trong chiến đấu lần đầu!" },
    r2: { id: "emily_h2", tier: "wombiote", ignition: true, crAura: 95, tag: "Ignition H2: Sinh Token Wombiote String (CR 560) & -100 CR Địch", desc: "Summon Phase (Hàng 2): Triệu hồi 1 Token Phân Thể String (CR 560) lên Hàng 1 và hút giảm -100 CR toàn bộ Hàng 1 địch!" }
  },
  evelina: {
    r1: { id: "evelina_h1", tag: "Hồi Phục Cực Hạn (Bất Tử Lần Đầu & +260 CR Cùng Perplexa)", bonusFlat: 260, selfFirstBattleImmunity: true, desc: "Effect Phase (Hàng 1/3): Hồi phục cực hạn bất tử giúp không thể bị tiêu diệt lần đầu và cộng +260 CR (tăng gấp đôi nếu có Perplexa)!" },
    r2: { id: "evelina_h2", tier: "alien_buff", ignition: true, crAura: 90, tag: "Ignition H2: Sinh Token Hậu Duệ Overlord Trái Đất (CR 680)", desc: "Summon Phase (Hàng 2): Triệu hồi 1 Token Hậu Duệ Overlord Trái Đất (CR 680) lên Hàng 1 sân ta!" }
  },
  mina: {
    r1: { id: "mina_h1", tag: "Hào Quang Thôi Miên (-350 CR Địch Đối Diện & +250 CR Quân Ta)", bonusFlat: 250, oppPenalty: 350, desc: "Effect Phase (Hàng 1/3): Hào quang thôi miên làm suy yếu -350 CR lá đối diện và tăng +250 CR cho bản thân cùng mọi thẻ Prozonian trên sân!" },
    r2: { id: "mina_h2", tier: "alien_buff", ignition: true, crAura: 85, tag: "Ignition H2: Rút 1 Lá & Sinh Token Tình Báo Prozonian (CR 550)", desc: "Summon Phase (Hàng 2): Rút 1 lá bài và triệu hồi 1 Token Tình Báo Ngầm (CR 550) lên Hàng 1 sân ta!" }
  },
  cockary: {
    r1: { id: "cockary_h1", tag: "Em Út Nhà Perfect (+200 CR • Khóa Eff Đối Diện)", bonusFlat: 200, nullifyOppositeBuffs: true, desc: "Effect Phase (Hàng 1/3): Cường hóa cơ thể Tamarite tăng +200 CR và rò rỉ vị trí làm vô hiệu hóa mọi buff CR của lá đối diện!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  ragnaroir: {
    r1: { id: "ragnaroir_h1", tag: "Vuốt Bóng Tối Meralina (+220 CR • Cào Rách Địch -200 CR)", bonusFlat: 220, oppPenalty: 200, desc: "Effect Phase (Hàng 1/3): Lao ra từ bóng tối tăng +220 CR (nhận thêm Kháng Hiệu Ứng + 250 CR nếu có Meralina) và cào giảm -200 CR đối diện!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Quái thú Chimera không có hiệu ứng ở Hàng 2)." }
  },
  hoornyxr: {
    r1: { id: "hoornyxr_h1", tag: "Reality Twist ω+1 (Kháng Tuyệt Đối & Đảo Ngược CR)", bonusFlat: 220, unaffectedByOtherCards: true, absorbHigherOppCR: true, desc: "Effect Phase (Hàng 1/3): Quỷ chiều không gian ω+1 không bị ảnh hưởng bởi bài khác, tăng +220 CR và bẻ cong thực tại hút CR của kẻ mạnh hơn!" },
    r2: { id: "hoornyxr_h2", tier: "omniwomb", ignition: true, crAura: 110, tag: "Ignition H2: Mở Cổng Chiều ω+1 → Sinh Token Quỷ (CR 720)", desc: "Summon Phase (Hàng 2): Mở cổng dịch chuyển chiều ω+1 triệu hồi 1 Token Quỷ Không Gian (CR 720, Kháng Hiệu Ứng) lên Hàng 1!" }
  },
  conquistor: {
    r1: { id: "conquistor_h1", tag: "Phản Đòn Cuồng Chiến (Bất Tử Lần Đầu & +260 CR)", bonusFlat: 260, selfFirstBattleImmunity: true, desc: "Effect Phase (Hàng 1/3): Lão tướng 2 triệu tuổi nhận đòn trước rồi phản sát — không thể bị tiêu diệt lần đầu và bùng nổ +260 CR!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  avalanche: {
    r1: { id: "avalanche_h1", tag: "Cú Nện Đất Tyranian (+190 CR & Giảm -120 CR Toàn Địch)", bonusFlat: 190, enemyAllPenalty: 120, desc: "Effect Phase (Hàng 1/3): Dậm nát mặt đất tăng +190 CR bản thân (cộng thêm cho Mary) và làm chấn động giảm -120 CR toàn bộ Hàng 1 địch!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  magnatere: {
    r1: { id: "magnatere_h1", tag: "Thương Kỵ Nadirius (+180 CR Toàn Quân & Đánh Xuyên Khiên)", bonusFlat: 180, allyAllBonus: 140, pierceImmunity: true, desc: "Effect Phase (Hàng 1/3): Hoàng đế kỵ mã Nadirius tăng +180 CR bản thân, +140 CR toàn bộ đồng minh Hàng 1 và xuyên phá mọi Khiên/Bất tử!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Hoàng đế Nadirius không có hiệu ứng ở Hàng 2)." }
  },
  veidos: {
    r1: { id: "veidos_h1", tag: "Mở Đường Máu Gandora (+210 CR & +120 CR Toàn Hàng 1)", bonusFlat: 210, allyAllBonus: 120, desc: "Effect Phase (Hàng 1/3): Chỉ huy Border Division cao 3,36m dẫn đầu xung kích, tăng +210 CR bản thân và +120 CR cho mọi đồng minh Hàng 1!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  carnavex: {
    r1: { id: "carnavex_h1", tag: "Mưu Quyền Đại Tướng (+240 CR & Hút -150 CR Địch)", bonusFlat: 240, oppPenalty: 150, desc: "Effect Phase (Hàng 1/3): Lợi dụng thế trận gom quyền lực, hút -150 CR đối diện và tăng +240 CR cho bản thân!" },
    r2: { id: "carnavex_h2", tier: "alien_buff", ignition: true, crAura: 90, tag: "Ignition H2: Bỏ 1 Lá Tay → Triệu Hồi 2 Token Phản Quân (CR 500)", desc: "Summon Phase (Hàng 2): Bỏ 1 lá trên tay xuống Mộ để triệu hồi 2 Token Phản Quân Kronea (CR 500 mỗi lá) lên Hàng 1!" }
  },
  zarcseid: {
    r1: { id: "zarcseid_h1", tag: "Phép Màu Predita (Toàn Hàng 1 Bất Tử Lần Đầu & +180 CR)", bonusFlat: 180, firstBattleImmunityAllRow1: true, allyAllBonus: 150, desc: "Effect Phase (Hàng 1/3): Tái hiện Phép màu tử thủ Predita 10 năm — toàn bộ Hàng 1 ta không thể bị tiêu diệt lần đầu và nhận +150 CR!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Tướng tối cao Prozonian không có hiệu ứng ở Hàng 2)." }
  },
  malocri: {
    r1: { id: "malocri_h1", tag: "Khoa Học Gen Konstantine (+170 CR & +200 CR Cho Mọi Token)", bonusFlat: 170, boostAllTokens: 200, desc: "Effect Phase (Hàng 1/3): Tăng +170 CR cho bản thân và cường hóa +200 CR cho toàn bộ Token trên Hàng 1 sân ta!" },
    r2: { id: "malocri_h2", tier: "alien_buff", ignition: true, crAura: 100, tag: "Ignition H2: Sinh Token Lai Hoàng Gia (CR 620)", desc: "Summon Phase (Hàng 2): Dự án khoa học gen sản sinh 1 Token Lai Hinatian–Sylvarian (CR 620) lên Hàng 1!" }
  },
  etharos: {
    r1: { id: "etharos_h1", tag: "Lệnh Cai Trị Earth Overlord (+180 CR & Xóa Token Địch)", bonusFlat: 180, destroyEnemyToken: 1, desc: "Effect Phase (Hàng 1/3): Thực thi thiết quân luật trên Trái Đất, tăng +180 CR và trục xuất ngay 1 Token đang có trên Hàng 1 địch!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  sentrion: {
    r1: { id: "sentrion_h1", tag: "Vua Wombiote (Bất Tử Lần Đầu & Khống Chế -200 CR Địch)", bonusFlat: 180, selfFirstBattleImmunity: true, oppPenalty: 200, desc: "Effect Phase (Hàng 1/3): Thân Slime bất hoại không thể bị tiêu diệt lần đầu và khống chế tâm trí giảm -200 CR lá đối diện!" },
    r2: { id: "sentrion_h2", tier: "wombiote", ignition: true, crAura: 105, tag: "Ignition H2: Sinh 2 Token Wombiote (CR 480)", desc: "Summon Phase (Hàng 2): Phân tách cơ thể triệu hồi 2 Token Wombiote (CR 480 mỗi lá) lên Hàng 1 sân ta!" }
  },
  jokar: {
    r1: { id: "jokar_h1", tag: "Điệp Viên Jack Frozen (Rút 1 Lá & +190 CR)", bonusFlat: 190, drawOnEffect: 1, desc: "Effect Phase (Hàng 1/3): Điều phối tài nguyên ngầm giúp rút 1 lá bài và tăng +190 CR cho bản thân cùng Mina/Salvic!" },
    r2: { id: "jokar_h2", tier: "alien_buff", ignition: true, crAura: 90, tag: "Ignition H2: Rút 1 Lá & Sinh Token Đặc Vụ Ngầm (CR 520)", desc: "Summon Phase (Hàng 2): Rút 1 lá bài và điều động 1 Token Đặc Vụ Prozonian (CR 520) lên Hàng 1!" }
  },
  xalkor: {
    r1: { id: "xalkor_h1", tag: "Mặt Trời Vàng Krypton (+230 CR & Xuyên Khiên)", bonusFlat: 230, pierceImmunity: true, desc: "Effect Phase (Hàng 1/3): Bùng nổ năng lượng Kryptonian tăng +230 CR và bắn tia nhiệt xuyên phá mọi Khiên/Bất tử!" },
    r2: { id: "xalkor_h2", tier: "alien_buff", ignition: true, crAura: 95, tag: "Ignition H2: Sinh Token Chiến Binh Krypton (CR 640)", desc: "Summon Phase (Hàng 2): Khôi phục di sản Krypton, triệu hồi 1 Token Chiến Binh Krypton (CR 640) lên Hàng 1!" }
  },
  cipheron: {
    r1: { id: "cipheron_h1", tag: "Mắt Cyclops Khống Chế (-300 CR Đối Diện & Xóa Buff)", bonusFlat: 180, oppPenalty: 300, nullifyOppositeBuffs: true, desc: "Effect Phase (Hàng 1/3): Sóng tâm linh Cyclops xóa sạch buff và giảm -300 CR của lá đối diện (đặc biệt hiệu quả trước thẻ Nữ)!" },
    r2: { id: "cipheron_h2", tier: "omniwomb", ignition: true, crAura: 100, tag: "Ignition H2: Sinh Token Ảo Giác Tâm Linh (Sao Chép CR Địch)", desc: "Summon Phase (Hàng 2): Tạo 1 Token Ảo Giác Tâm Linh lên Hàng 1 có CR bằng đúng CR của lá mạnh nhất bên Hàng 1 địch!" }
  },
  eboleon: {
    r1: { id: "eboleon_h1", tag: "Sứ Giả Siêu Tốc (Rút 1 Lá & +180 CR)", bonusFlat: 180, drawOnEffect: 1, desc: "Effect Phase (Hàng 1/3): Vượt qua mọi tuyến đường vũ trụ giúp rút ngay 1 lá bài và cộng +180 CR!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  parasoid: {
    r1: { id: "parasoid_h1", tag: "Hút CR Đột Biến (+260 CR Bản Thân & -260 CR Đối Diện)", bonusFlat: 260, oppPenalty: 260, desc: "Effect Phase (Hàng 1/3): Chạm vào đối thủ đối diện hút trực tiếp 260 CR của chúng sang cho Parasoid!" },
    r2: { id: "parasoid_h2", tier: "wombiote", ignition: true, crAura: 90, tag: "Ignition H2: Quá Tải Bom Khinh Khí (-200 CR Toàn Địch & Sinh Token 580)", desc: "Summon Phase (Hàng 2): Phát nổ năng lượng giảm -200 CR toàn bộ Hàng 1 địch và sinh 1 Token Đột Biến (CR 580) lên Hàng 1 ta!" }
  },
  kil: {
    r1: { id: "kil_h1", tag: "Thống Đốc Bình Định (Bất Tử Lần Đầu & +190 CR)", bonusFlat: 190, selfFirstBattleImmunity: true, desc: "Effect Phase (Hàng 1/3): Giữ vững phòng tuyến Reichkomos Prozone — không thể bị tiêu diệt lần đầu và nhận +190 CR!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  ojamon: {
    r1: { id: "ojamon_h1", tag: "Pháo Gotterfall & Nước Đôi (Rút 1 Lá & -250 CR Địch)", bonusFlat: 160, oppPenalty: 250, drawOnEffect: 1, desc: "Effect Phase (Hàng 1/3): Rút 1 lá bài chiến thuật và chỉ điểm Pháo Gotterfall giảm -250 CR của lá đối diện!" },
    r2: { id: "ojamon_h2", tier: "alien_buff", ignition: true, crAura: 90, tag: "Ignition H2: Rút 1 Lá & Dựng Token Pháo Đài Gotterfall (CR 560)", desc: "Summon Phase (Hàng 2): Chơi nước đôi giúp bạn rút 1 lá bài và triệu hồi 1 Token Pháo Đài Gotterfall (CR 560) lên Hàng 1!" }
  },
  depek: {
    r1: { id: "depek_h1", tag: "Thương Hiệp Sĩ Độc Tài (+230 CR & Đánh Xuyên Khiên)", bonusFlat: 230, pierceImmunity: true, desc: "Effect Phase (Hàng 1/3): Thiết quân luật tàn nhẫn giúp tăng +230 CR và đâm xuyên mọi Khiên/Bất tử của đối phương!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  kale: {
    r1: { id: "kale_h1", tag: "Cú Húc Minotaur Săn Thưởng (+240 CR & Rút 1 Lá)", bonusFlat: 240, drawOnEffect: 1, desc: "Effect Phase (Hàng 1/3): Sức mạnh Minotaur lai nhiều loài giúp tăng +240 CR và thu chiến lợi phẩm rút 1 lá bài!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  exorotic: {
    r1: { id: "exorotic_h1", tag: "Đánh Cắp Kỹ Năng & Độc Nano (-220 CR Địch & +220 CR Ta)", bonusFlat: 220, oppPenalty: 220, desc: "Effect Phase (Hàng 1/3): Tiêm độc tố Nano giảm -220 CR lá đối diện và sao chép gen tăng +220 CR cho bản thân!" },
    r2: { id: "exorotic_h2", tier: "omniwomb", ignition: true, crAura: 95, tag: "Ignition H2: Cấy Ghép Mô-Đun → Sinh 2 Token Nano (CR 500)", desc: "Summon Phase (Hàng 2): Cấy ghép mô-đun sinh học triệu hồi 2 Token Thí Nghiệm Nano (CR 500 mỗi lá) lên Hàng 1!" }
  },
  perplexa: {
    r1: { id: "perplexa_h1", tag: "Người Thừa Kế Ngông Cuồng (+240 CR & Xuyên Khiên)", bonusFlat: 240, pierceImmunity: true, desc: "Effect Phase (Hàng 1/3): Dòng máu lai Sylvarian–Kryptonian bùng nổ +240 CR (+380 CR nếu có Etharos/Felicia/Evelina) và xuyên Khiên!" },
    r2: { id: "none", isNone: true, tier: "none", crAura: 0, tag: "None (Không có hiệu ứng)", desc: "Hàng 2: None (Không có hiệu ứng ở Hàng 2)." }
  },
  eremite: {
    r1: { id: "eremite_h1", tag: "Lồng Điện Thunderlock (Kháng Eff & -280 CR Đối Diện)", bonusFlat: 180, unaffectedByOtherCards: true, oppPenalty: 280, desc: "Effect Phase (Hàng 1/3): Thân sắt vô hình kháng hiệu ứng bài khác và giam đối thủ vào Lồng Thunderlock (-280 CR)!" },
    r2: { id: "eremite_h2", tier: "alien_buff", ignition: true, crAura: 90, tag: "Ignition H2: Phép Clonemax → Sinh 2 Token Pháp Sư (CR 470)", desc: "Summon Phase (Hàng 2): Thi triển Clonemax triệu hồi 2 Token Pháp Sư Gông Xiềng (CR 470 mỗi lá) lên Hàng 1!" }
  },
  mrmind: {
    r1: { id: "mrmind_h1", tag: "Ngưng Thời Gian & Tia Prionite (-240 CR Toàn Địch & Rút 1 Lá)", bonusFlat: 160, enemyAllPenalty: 240, drawOnEffect: 1, desc: "Effect Phase (Hàng 1/3): Phát tán bức xạ Prionite từ thân Ultra Bot làm giảm -240 CR toàn bộ Hàng 1 địch và rút 1 lá bài!" },
    r2: { id: "mrmind_h2", tier: "human_serum", ignition: true, crAura: 85, tag: "Ignition H2: Triệu Hồi 2 Token Ultra-Bot (CR 490)", desc: "Summon Phase (Hàng 2): Kích hoạt nhà máy Vander triệu hồi 2 Token Ultra-Bot (CR 490 mỗi lá) lên Hàng 1!" }
  },
  jose: {
    r1: { id: "jose_h1", tag: "Trùm Cartel Vander (+160 CR Toàn Quân & Gọi 1 Tay Súng 450 CR)", bonusFlat: 160, allyAllBonus: 120, spawnCloneCR: 450, desc: "Effect Phase (Hàng 1/3): Huy động thế lực ngầm tăng +120 CR toàn Hàng 1 ta và gọi 1 Token Tay Súng Cartel (CR 450) vào ô trống!" },
    r2: { id: "jose_h2", tier: "human_serum", ignition: true, crAura: 70, tag: "Ignition H2: Đường Dây Chợ Đen (Rút 2 Lá & Bỏ 1 Lá)", desc: "Summon Phase (Hàng 2): Móc nối chợ đen giúp bạn rút 1 lá bài và triệu hồi 1 Token Lính Đánh Thuê (CR 480) lên Hàng 1!" }
  },
  bill: {
    r1: { id: "bill_h1", tag: "Chủ Tịch Future Corp (+220 CR Cho Mọi Thẻ Trên Sân Ta)", bonusFlat: 200, allyAllBonus: 220, desc: "Effect Phase (Hàng 1/3): Dùng tiềm lực tài chính Future Corp và Drone quỹ đạo bơm +220 CR cho toàn bộ thẻ trên Hàng 1 ta!" },
    r2: { id: "bill_h2", tier: "human_serum", ignition: true, crAura: 95, tag: "Ignition H2: Bơm Serum Quá Liều → Sinh 2 Token Đột Biến (CR 580)", desc: "Summon Phase (Hàng 2): Kích hoạt dây chuyền Serum Pregnomorph triệu hồi 2 Token Chiến Binh Serum (CR 580 mỗi lá) lên Hàng 1!" }
  },
  dick: {
    r1: { id: "dick_h1", tag: "Lão Ăn Mày Bất Tử (Bất Tử Chiến Đấu & +260 CR Cho Mọi Token)", bonusFlat: 150, selfFirstBattleImmunity: true, boostAllTokens: 260, cancelHumanDebuff: true, desc: "Effect Phase (Hàng 1/3): Bất tử tái sinh (không bị tiêu diệt lần đầu) và hiệu lệnh hậu duệ cộng +260 CR cho toàn bộ Token trên sân ta!" },
    r2: { id: "dick_h2", tier: "sovereign", ignition: true, cancelHumanDebuff: true, crAura: 110, tag: "Ignition H2: Hiệu Lệnh Hậu Duệ → Sinh 2 Token Bất Tử (CR 560)", desc: "Summon Phase (Hàng 2): Không cần trả giá, triệu hồi ngay 2 Token Hậu Duệ Nadir (CR 560 mỗi lá) lên Hàng 1 sân ta!" }
  }
};

function inferRow1Effect(c) {
  if (CUSTOM_CHAR_EFFECTS[c.id]?.r1) {
    return { ...CUSTOM_CHAR_EFFECTS[c.id].r1 };
  }
  const sp = (c.species || "").toLowerCase();
  if ((c.h || 1.75) >= 3.2) return { id: "titan_frame", tag: "Thể Khổng Lồ", bonusFlat: 115, desc: `Effect Phase (Hàng 1/3): Thể hình ${c.h}m áp đảo, cộng +115 CR khi giao chiến trực diện.` };
  if (sp.includes("tamarite")) return { id: "hyper_photon", tag: "Tamarite Quang Năng", bonusFlat: 130, condType: "active_breed_or_token", condBonus: 180, desc: "Effect Phase (Hàng 1/3): +130 CR (+90 CR cùng phe). ĐK có Lai Hàng 2/Token Hàng 1 -> +180 CR & +90 CR mọi Token Hàng 1!" };
  if (sp.includes("prozon")) return { id: "knight_bastion", tag: "Hiệp Sĩ Prozonian", bonusFlat: 105, desc: "Effect Phase (Hàng 1/3): +105 CR; +100 CR khi đấu với Nadir hoặc Mutant." };
  if (sp.includes("hinatian")) return { id: "blue_blood_guard", tag: "Máu Xanh Bất Khuất", bonusFlat: 95, desc: "Effect Phase (Hàng 1/3): Miễn nhiễm giảm CR từ Virus/Nadir; +95 CR giao chiến." };
  if (sp.includes("krypton")) return { id: "solar_blitz", tag: "Xung Kích Mặt Trời", bonusFlat: 125, desc: "Effect Phase (Hàng 1/3): +125 CR; xuyên thấu +60 CR tổng hợp khi đánh Hàng 3." };
  if (sp.includes("nadir")) return { id: "nadir_psionic", tag: "Áp Lực Thần Nadir", bonusFlat: 115, condType: "active_breed_or_token", condBonus: 95, desc: "Effect Phase (Hàng 1/3): +115 CR; giảm 70 CR đối diện (<800 CR). ĐK Lai Hàng 2: +95 CR!" };
  if (c.race === "human" && !sp.includes("wombiote")) {
    return { id: "human_resilience", tag: "Ý Chí Nhân Loại", bonusFlat: 75, condType: "active_breed_or_dick", condBonus: 135, desc: "Effect Phase (Hàng 1/3): +75 CR. ĐK có Token Hàng 1, Dick hoặc đồng minh Lai Tạo -> kích hoạt +135 CR!" };
  }
  return { id: "frontline_valor", tag: "Xung Kích Chính Quy", bonusFlat: 75, desc: `Effect Phase (Hàng 1/3): ${(c.skills && c.skills[0]) || "Chiến kỹ"} cộng +75 CR khi tham chiến.` };
}

function inferRow2Effect(c) {
  if (CUSTOM_CHAR_EFFECTS[c.id]?.r2) {
    return { ...CUSTOM_CHAR_EFFECTS[c.id].r2 };
  }
  const sp = (c.species || "").toLowerCase();
  const auraBase = Math.max(40, Math.round((c.cr || 100) * 0.12));

  if (sp.includes("tamarite")) {
    return {
      id: "r2_tamarite",
      tier: "tamarite",
      ignition: true,
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
// Enforces Deck Legality: MUST contain at least 2 Male (♂) cards + at least 2 Female (♀) cards!
export function buildFactionDeck(leaderId = "arisia", hybrids = [], ownedCollection = null) {
  const leader = resolveCard(leaderId, hybrids) || CARD_BY_ID.arisia;
  const fac = leader.fac || "sylvarian";
  const allPool = getFactionCardPool(fac, hybrids).filter((c) => c.id !== leader.id);

  const getMaxCap = (c) => {
    if (!ownedCollection) return c.unique ? 1 : 3;
    return c.isHybrid ? 1 : (c.unique ? Math.min(1, ownedCollection[c.id] || 0) : Math.min(3, ownedCollection[c.id] || 0));
  };

  const deck = [];
  const used = {};

  // Step 1: Guarantee at least 2 Male cards and 2 Female cards first!
  const males = allPool.filter((c) => c.gender === "Male");
  const females = allPool.filter((c) => c.gender === "Female");

  let mAdded = 0;
  for (const c of males) {
    const cap = getMaxCap(c);
    while (mAdded < 2 && (used[c.id] || 0) < cap) {
      deck.push(c.id);
      used[c.id] = (used[c.id] || 0) + 1;
      mAdded++;
    }
    if (mAdded >= 2) break;
  }
  while (mAdded < 2 && males.length > 0) {
    const c = males[mAdded % males.length];
    deck.push(c.id);
    used[c.id] = (used[c.id] || 0) + 1;
    mAdded++;
  }

  let fAdded = 0;
  for (const c of females) {
    const cap = getMaxCap(c);
    while (fAdded < 2 && (used[c.id] || 0) < cap) {
      deck.push(c.id);
      used[c.id] = (used[c.id] || 0) + 1;
      fAdded++;
    }
    if (fAdded >= 2) break;
  }
  while (fAdded < 2 && females.length > 0) {
    const c = females[fAdded % females.length];
    deck.push(c.id);
    used[c.id] = (used[c.id] || 0) + 1;
    fAdded++;
  }

  // Step 2: Fill remaining slots up to 16 cards
  for (const c of allPool) {
    if (deck.length >= 16) break;
    const cap = getMaxCap(c);
    if ((used[c.id] || 0) < cap) {
      deck.push(c.id);
      used[c.id] = (used[c.id] || 0) + 1;
    }
  }

  const extraTroops = allPool.filter((c) => !c.unique && getMaxCap(c) > (used[c.id] || 0));
  let guard = 0;
  while (deck.length < 16 && extraTroops.length > 0 && guard < 64) {
    const c = extraTroops[guard % extraTroops.length];
    const cap = getMaxCap(c);
    if ((used[c.id] || 0) < cap) {
      deck.push(c.id);
      used[c.id] = (used[c.id] || 0) + 1;
    }
    guard++;
  }

  const fallbackTroops = allPool.filter((c) => !c.unique);
  let idx = 0;
  while (deck.length < 16 && allPool.length > 0 && !ownedCollection) {
    const src = fallbackTroops.length > 0 ? fallbackTroops[idx % fallbackTroops.length] : allPool[idx % allPool.length];
    deck.push(src.id);
    idx++;
  }

  return deck.slice(0, 16);
}

export function checkDeckLegality(deckIds = [], hybrids = []) {
  let maleCount = 0;
  let femaleCount = 0;
  for (const id of (deckIds || [])) {
    const c = resolveCard(id, hybrids);
    if (!c) continue;
    if (c.gender === "Male") maleCount++;
    else femaleCount++;
  }
  const hasMinGender = maleCount >= 2 && femaleCount >= 2;
  const reason = !hasMinGender
    ? `Deck bất hợp lệ: Cần ít nhất 2 thẻ ♂ Nam và 2 thẻ ♀ Nữ (Hiện có: ${maleCount} ♂ Nam, ${femaleCount} ♀ Nữ)!`
    : "Deck hợp lệ (Đủ ≥2 ♂ Nam & ≥2 ♀ Nữ)";
  const isLegal = hasMinGender && (deckIds || []).length >= 4;
  return {
    ok: isLegal,
    legal: isLegal,
    hasMinGender,
    maleCount,
    femaleCount,
    total: (deckIds || []).length,
    reason
  };
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
