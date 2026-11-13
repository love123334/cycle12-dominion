// ============================================================================
// CYCLE 12: AGE OF DOMINION — FACTION, GENDER, CR & 2-ROW CARD DATABASE (v7)
// Core Rules:
// - Each card carries: Art, Name, Gender (Male/Female), CR, Species, Faction,
//   Row 1 Effect (Combat), Row 2 Effect (Breeding / Support / Debuff).
// - Strict Faction Leader Lock: A Leader commands ONLY cards of their Faction.
// - Row 2 Breeding Rates:
//   * Tamarite: Guaranteed 100% strong hybrid token spawn every turn.
//   * Omni-Womb / Brood: Varied multi-archetype tokens (0-99% or 100% if Tamarite).
//   * Alien / Mutant / Wombiote: Variable 40%-96% random chance with species passives.
//   * Pure Human (no breeding buff): Low ~32% random chance & -28% CR Debuff on Token!
// ============================================================================

import { CHARACTERS, CHAR_BY_ID } from "./characters.js";
import { getPortraitUrl, getHybridPortraitUrl } from "../render/portraits.js";

function inferRow1Effect(c) {
  const sp = (c.species || "").toLowerCase();
  if (c.id === "arisia") return { id: "syl_empress", tag: "Chỉ Huy Tối Cao", bonusFlat: 120, desc: "Hàng 1/3: +120 CR và +80 CR cho mỗi đồng minh Sylvarian trên Hàng 1." };
  if (c.id === "overlord") return { id: "abyss_terror", tag: "Áp Chế Vực Thẳm", bonusFlat: 150, desc: "Hàng 1/3: +150 CR; giảm 120 CR đối thủ đối diện nếu đối thủ có CR < 800." };
  if (c.id === "emma") return { id: "eris_reset", tag: "Vòng Lặp Outer Layer", bonusFlat: 180, desc: "Hàng 1/3: +180 CR và vô hiệu hóa buff chủng tộc của đối thủ đối diện." };
  if (c.id === "magnatere") return { id: "nadirius_decree", tag: "Hoàng Lệnh Nadirius", bonusFlat: 140, desc: "Hàng 1/3: +140 CR; +100 CR thêm khi đấu với Sylvarian hoặc Western Nadir." };
  if (c.id === "zarcseid") return { id: "predita_will", tag: "Ý Chí Predita", bonusFlat: 160, desc: "Hàng 1/3: +160 CR; nhận thêm +180 CR khi đấu với Nadir hoặc khi bạn đã mất >= 1 lá." };
  if (c.id === "meralina") return { id: "cr_gap_burst", tag: "Nghịch Lý Khoảng Cách", bonusFlat: 60, desc: "Hàng 1/3: Nếu chênh lệch CR gốc với đối thủ >= 250, tăng vọt +240 CR!" };
  if (c.id === "ojamon") return { id: "gotterfall_tactic", tag: "Chiến Lược Cursew", bonusFlat: 90, desc: "Hàng 1/3: +90 CR; rút ngay 1 thẻ phe bạn khi được đặt ra Hàng 1." };
  if (c.id === "felicia" || c.id === "sarah") return { id: "supers_strike", tag: "Đội Đặc Nhiệm Evernight", bonusFlat: 110, desc: "Hàng 1/3: +110 CR; +140 CR thêm khi đối đầu The Collectors hoặc Wombiote." };
  if (c.id === "mrmind" || c.id === "parasoid") return { id: "collector_harvest", tag: "Thu Thập Gen", bonusFlat: 100, desc: "Hàng 1/3: +100 CR cho mỗi thẻ địch đang bị bắt trong Hàng 2 của bạn." };
  if (c.id === "dick") return { id: "immortal_bypass", tag: "Bất Tử Áp Chế", bonusFlat: 40, desc: "Hàng 1/3: +40 CR; khi chiến đấu giúp phá giải miễn nhiễm sinh sản." };
  if ((c.h || 1.75) >= 3.2) return { id: "titan_frame", tag: "Thể Khổng Lồ", bonusFlat: 115, desc: `Hàng 1/3: Thể hình ${c.h}m áp đảo, cộng +115 CR khi giao chiến trực diện.` };
  if (sp.includes("tamarite")) return { id: "hyper_photon", tag: "Tamarite Quang Năng", bonusFlat: 130, desc: "Hàng 1/3: +130 CR; +90 CR thêm nếu cùng phe Tamarite/Sylvarian." };
  if (sp.includes("prozon")) return { id: "knight_bastion", tag: "Hiệp Sĩ Prozonian", bonusFlat: 105, desc: "Hàng 1/3: +105 CR; +100 CR khi đấu với Nadir hoặc Mutant." };
  if (sp.includes("hinatian")) return { id: "blue_blood_guard", tag: "Máu Xanh Bất Khuất", bonusFlat: 95, desc: "Hàng 1/3: Miễn nhiễm giảm CR từ Virus/Nadir; +95 CR giao chiến." };
  if (sp.includes("krypton")) return { id: "solar_blitz", tag: "Xung Kích Mặt Trời", bonusFlat: 125, desc: "Hàng 1/3: +125 CR; xuyên thấu +60 CR tổng hợp khi đánh Hàng 3." };
  if (sp.includes("nadir")) return { id: "nadir_psionic", tag: "Áp Lực Thần Nadir", bonusFlat: 115, desc: "Hàng 1/3: +115 CR; giảm 70 CR đối thủ đối diện có CR < 800." };
  return { id: "frontline_valor", tag: "Xung Kích Chính Quy", bonusFlat: 75, desc: `Hàng 1/3: ${(c.skills && c.skills[0]) || "Chiến kỹ"} cộng +75 CR khi tham chiến.` };
}

function inferRow2Effect(c) {
  const sp = (c.species || "").toLowerCase();
  const auraBase = Math.max(40, Math.round((c.cr || 100) * 0.12));

  // 1. TAMARITE — Always 100% spawn, ultra-strong Token!
  if (c.id === "ovalina" || c.id === "uterussa") {
    const isOmni = c.id === "uterussa";
    return {
      id: isOmni ? "r2_tamarite_omniwomb" : "r2_tamarite_queen",
      tier: "tamarite",
      breedChance: 100,
      omniWomb: true,
      crAura: 135,
      crMult: 1.25,
      crPenaltyPct: 0,
      tag: isOmni ? "Omni-Womb Tamarite (100%)" : "Nữ Hoàng Tamarite (100%)",
      desc: isOmni
        ? "Hàng 2: Mặc định 100% sinh ra nhiều dạng Token Đột Biến đa hệ mỗi lượt (+135 CR Hàng 1)."
        : "Hàng 2: Mặc định 100% sinh Token Tamarite siêu mạnh cuối mỗi lượt (+135 CR Hàng 1)."
    };
  }
  if (sp.includes("tamarite")) {
    return {
      id: "r2_tamarite",
      tier: "tamarite",
      breedChance: 100,
      omniWomb: c.id === "pussiri",
      crAura: 115,
      crMult: 1.12,
      crPenaltyPct: 0,
      tag: c.id === "pussiri" ? "Tamarite Synthesis 65/30/5 (100%)" : "Huyết Thống Tamarite (100%)",
      desc: "Hàng 2: Tamarite mặc định 100% sinh ra thẻ Token chiến lực cao cuối mỗi lượt (+115 CR Hàng 1)."
    };
  }

  // 2. OMNI-WOMB / BROOD / WOMBIOTE / NANO (0-99% chance, varied tokens!)
  if (c.id === "tsunadia") {
    return {
      id: "r2_nadir_brood",
      tier: "omniwomb",
      breedChance: 96,
      omniWomb: true,
      crAura: 130,
      crMult: 1.12,
      crPenaltyPct: 0,
      tag: "Omni-Brood Nadir (96%)",
      desc: "Hàng 2: 96% mỗi lượt sinh Token Quân Đoàn Nadir đa biến thể (+130 CR Hàng 1)."
    };
  }
  if (c.id === "exorotic") {
    return {
      id: "r2_nano_omni",
      tier: "omniwomb",
      breedChance: 90,
      omniWomb: true,
      crAura: 85,
      crMult: 1.05,
      crPenaltyPct: 0,
      tag: "Cấy Ghép Omni-Gen (90%)",
      desc: "Hàng 2: 90% tạo Token Mô-đun đa kỹ năng kế thừa chỉ số cao mỗi lượt."
    };
  }
  if (sp.includes("wombiote") || c.id === "sentrion" || c.id === "parasoid") {
    const ch = c.id === "sentrion" ? 92 : 82;
    return {
      id: "r2_wombiote",
      tier: "wombiote",
      breedChance: ch,
      omniWomb: c.id === "sentrion",
      crAura: 95,
      crMult: 0.92,
      crPenaltyPct: 0,
      tag: `Phân Nhánh Wombiote (${ch}%)`,
      desc: `Hàng 2: ${ch}% mỗi lượt tách bào sinh Token Wombiote (+95 CR Hàng 1).`
    };
  }

  // 3. SPECIAL LORE GENETICS
  if (c.id === "dick") {
    return {
      id: "r2_override",
      tier: "sovereign",
      breedChance: 88,
      bypassImmunity: true,
      crAura: 90,
      crMult: 0.95,
      crPenaltyPct: 0,
      tag: "Xuyên Phá Huyết Thống (88%)",
      desc: "Hàng 2: Bỏ qua kháng cự CR>=800 khi lai & +90 CR cho Hàng 1."
    };
  }
  if (c.id === "meralina") {
    return {
      id: "r2_meralina",
      tier: "mutant",
      breedChance: 76,
      gapMutation: true,
      crAura: 110,
      crMult: 1.0,
      crPenaltyPct: 0,
      tag: "Euphoria Đột Biến (76%)",
      desc: "Hàng 2: 76% sinh Token Nghịch Lý mỗi lượt (+110 CR Hàng 1; bùng nổ nếu chênh CR >= 200)."
    };
  }
  if (sp.includes("hinatian")) {
    const ch = c.id === "july" ? 86 : 75; // July has 10% Tamarite genes!
    return {
      id: "r2_hinatian",
      tier: "alien_buff",
      breedChance: ch,
      blueBlood: true,
      crAura: 105,
      crMult: 0.95,
      crPenaltyPct: 0,
      tag: `Máu Xanh Hinatian (${ch}%)`,
      desc: `Hàng 2: ${ch}% sinh Token Máu Xanh miễn nhiễm Virus (+105 CR Hàng 1).`
    };
  }

  // 4. PURE HUMAN / SERUM / CYBORG — LOW RATE + CR DEBUFF!
  const isPureHuman = c.race === "human" && !sp.includes("serum") && !sp.includes("wombiote") && !sp.includes("biến đổi");
  if (isPureHuman) {
    return {
      id: "r2_human_weak",
      tier: "human_debuff",
      breedChance: 32,
      crAura: 35,
      crMult: 0.72,
      crPenaltyPct: 28,
      tag: "Người Thuần (32% • -28% CR Token)",
      desc: "Hàng 2 (Bất lợi): Không có buff sinh sản — chỉ 32% ra Token và Token con bị GIẢM -28% CR!"
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
      tag: "Serum Pregnomorph (52% • -12% CR)",
      desc: "Hàng 2: Serum nâng tỷ lệ sinh Token lên 52% nhưng gen chưa ổn định (-12% CR Token)."
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
    tag: `${c.species.split(" ")[0]} (${chance}%)`,
    desc: highRes
      ? `Hàng 2: Kháng thể CR>=800 giữ tỷ lệ sinh ở mức ${chance}% (tăng lên 82% nếu Cha >=800 CR) & +${Math.min(140, auraBase + 30)} CR Hàng 1.`
      : `Hàng 2: Tỷ lệ sinh Token ngẫu nhiên ${chance}% cuối mỗi lượt (-8% CR nếu Cha yếu) & +${Math.min(140, auraBase + 30)} CR Hàng 1.`
  };
}

function charToCard(c) {
  return {
    id: c.id,
    charId: c.id,
    name: c.name,
    kind: "character",
    fac: c.fac,
    species: c.species,
    race: c.race,
    cr: c.cr,
    h: c.h || 1.75,
    gender: c.g === "M" ? "Male" : "Female",
    unique: true,
    row1Effect: inferRow1Effect(c),
    row2Effect: inferRow2Effect(c)
  };
}

// 18 Faction Reserve Units across ALL 8 factions with balanced Male/Female genders
const TROOP_SPECS = [
  // ERIS UNION
  { id: "tr_eris_sentinel", name: "Eris Outer Sentinel", fac: "eris", gender: "Male", species: "Cấu Thể Eris", race: "erisian", cr: 420,
    r1: { id: "tr1", tag: "Giáp Khối Đa Diện", bonusFlat: 80, desc: "Hàng 1: +80 CR tại Outer Layer hoặc khi dẫn đầu CR." },
    r2: { id: "tr2", tier: "alien", breedChance: 64, crAura: 85, crMult: 0.85, crPenaltyPct: 0, tag: "Tinh Thể Eris (64%)", desc: "Hàng 2: 64% sinh Token ánh sáng & +85 CR Hàng 1." } },
  { id: "tr_eris_arbiter", name: "Eris Reset Arbiter", fac: "eris", gender: "Female", species: "Thiên Sứ Eris", race: "erisian", cr: 620,
    r1: { id: "tr1", tag: "Khóa Chân Không", bonusFlat: 110, desc: "Hàng 1: +110 CR & hủy bỏ buff chủng tộc đối diện." },
    r2: { id: "tr2", tier: "omniwomb", breedChance: 80, omniWomb: true, crAura: 110, crMult: 0.95, crPenaltyPct: 0, tag: "Ma Trận Eris (80%)", desc: "Hàng 2: 80% sinh Token Erisian đa biến & +110 CR Hàng 1." } },
  { id: "tr_eris_keeper", name: "Eris Chronos Keeper", fac: "eris", gender: "Female", species: "Erisian", race: "erisian", cr: 340,
    r1: { id: "tr1", tag: "Ngưng Đọng Chu Kỳ", bonusFlat: 75, desc: "Hàng 1: +75 CR; rút +1 thẻ phe Eris khi ra sân." },
    r2: { id: "tr2", tier: "alien", breedChance: 62, crAura: 70, crMult: 0.85, crPenaltyPct: 5, tag: "Chuỗi Thời Gian (62%)", desc: "Hàng 2: 62% sinh Token & +70 CR Hàng 1." } },
  { id: "tr_eris_prism", name: "Outer Layer Prism", fac: "eris", gender: "Male", species: "Sinh Thể Ánh Sáng", race: "erisian", cr: 510,
    r1: { id: "tr1", tag: "Khúc Xạ Vũ Trụ", bonusFlat: 95, desc: "Hàng 1: +95 CR và +50 CR cho Thủ lĩnh Hàng 3." },
    r2: { id: "tr2", tier: "alien", breedChance: 66, crAura: 95, crMult: 0.88, crPenaltyPct: 0, tag: "Phản Chiếu Gen (66%)", desc: "Hàng 2: +95 CR cho Hàng 1." } },

  // NADIRIUS EMPIRE
  { id: "tr_nad_knight", name: "Nadirius Astral Knight", fac: "nadirius", gender: "Male", species: "Hiệp Sĩ Nadir", race: "nadir", cr: 460,
    r1: { id: "tr1", tag: "Trật Tự Thép", bonusFlat: 90, desc: "Hàng 1: +90 CR; +100 CR thêm khi đấu Western Nadir." },
    r2: { id: "tr2", tier: "alien", breedChance: 65, crAura: 85, crMult: 0.85, crPenaltyPct: 0, tag: "Huyết Thống Đế Quốc (65%)", desc: "Hàng 2: +85 CR cho Hàng 1." } },
  { id: "tr_nad_warden", name: "Citadel Obsidian Warden", fac: "nadirius", gender: "Female", species: "Thần Vệ Nadir", race: "nadir", cr: 580,
    r1: { id: "tr1", tag: "Thành Lũy Citadel", bonusFlat: 115, desc: "Hàng 1: +115 CR bảo vệ tối đa tuyến đầu." },
    r2: { id: "tr2", tier: "alien_buff", breedChance: 72, crAura: 105, crMult: 0.9, crPenaltyPct: 0, tag: "Huyết Mạch Citadel (72%)", desc: "Hàng 2: 72% sinh Token Nadirius & +105 CR Hàng 1." } },
  { id: "tr_nad_lancer", name: "Nadirius Shadow Lancer", fac: "nadirius", gender: "Male", species: "Tiên Phong Nadir", race: "nadir", cr: 390,
    r1: { id: "tr1", tag: "Mũi Thương Phản Kích", bonusFlat: 85, desc: "Hàng 1: +85 CR; +80 CR khi đánh lá Hàng 3." },
    r2: { id: "tr2", tier: "alien", breedChance: 60, crAura: 75, crMult: 0.82, crPenaltyPct: 5, tag: "Xung Huyết Nadir (60%)", desc: "Hàng 2: +75 CR cho Hàng 1." } },
  { id: "tr_nad_envoy", name: "Nadirius Royal Praetor", fac: "nadirius", gender: "Female", species: "Thần Nadir", race: "nadir", cr: 670,
    r1: { id: "tr1", tag: "Uy Nghiêm Hoàng Tộc", bonusFlat: 120, desc: "Hàng 1: +120 CR." },
    r2: { id: "tr2", tier: "alien_buff", breedChance: 78, crAura: 120, crMult: 0.95, crPenaltyPct: 0, tag: "Gen Vệ Thần (78%)", desc: "Hàng 2: 78% sinh Token Hoàng Tộc & +120 CR Hàng 1." } },

  // WESTERN NADIR
  { id: "tr_wn_raider", name: "Abyssal Border Raider", fac: "western_nadir", gender: "Male", species: "Chiến Binh Vực Thẳm", race: "nadir", cr: 410,
    r1: { id: "tr1", tag: "Tập Kích Vực Thẳm", bonusFlat: 95, desc: "Hàng 1: +95 CR; giảm 50 CR lá Sylvarian đối diện." },
    r2: { id: "tr2", tier: "alien", breedChance: 68, crAura: 80, crMult: 0.88, crPenaltyPct: 0, tag: "Dịch Thể Nadir (68%)", desc: "Hàng 2: 68% sinh Token & +80 CR Hàng 1." } },
  { id: "tr_wn_natheron", name: "Natheron Virus Host", fac: "western_nadir", gender: "Female", species: "Natheron Ký Sinh", race: "nadir", cr: 320,
    r1: { id: "tr1", tag: "Lây Lan Natheron", bonusFlat: 80, desc: "Hàng 1: +80 CR; giảm 100 CR đối thủ có CR < 800." },
    r2: { id: "tr2", tier: "omniwomb", breedChance: 84, omniWomb: true, virusTrait: true, crAura: 95, crMult: 0.9, crPenaltyPct: 0, tag: "Lò Ấp Natheron (84%)", desc: "Hàng 2: 84% sinh nhiều dạng Token Ký Sinh cuối mỗi lượt!" } },
  { id: "tr_wn_starro", name: "Western Starro Matriarch", fac: "western_nadir", gender: "Female", species: "Starro Ký Sinh", race: "mutant", cr: 540,
    r1: { id: "tr1", tag: "Kiểm Soát Tâm Trí", bonusFlat: 105, desc: "Hàng 1: +105 CR." },
    r2: { id: "tr2", tier: "wombiote", breedChance: 86, omniWomb: true, crAura: 110, crMult: 0.92, crPenaltyPct: 0, tag: "Phân Bào Starro (86%)", desc: "Hàng 2: 86% phân bào tạo Token đa dạng & +110 CR Hàng 1." } },

  // THE COLLECTORS
  { id: "tr_col_ultrabot", name: "Tokyzhou Ultra-Bot Mk.II", fac: "collectors", gender: "Male", species: "Ultra Bot Cyborg", race: "cyborg", cr: 430,
    r1: { id: "tr1", tag: "Lưới Bắt Sinh Học", bonusFlat: 95, desc: "Hàng 1: +95 CR; +75 CR nếu trong Hàng 2 bạn có >= 1 tù binh." },
    r2: { id: "tr2", tier: "human_serum", breedChance: 40, crAura: 85, crMult: 0.78, crPenaltyPct: 20, tag: "Thân Máy Cyborg (40% • -20% CR)", desc: "Hàng 2: Cơ thể máy hạn chế sinh sản (40% & -20% CR Token)." } },
  { id: "tr_col_stalker", name: "Vander Bio-Harvester", fac: "collectors", gender: "Female", species: "Omni-Womb Thí Nghiệm", race: "mutant", cr: 510,
    r1: { id: "tr1", tag: "Săn Mẫu Vật", bonusFlat: 105, desc: "Hàng 1: +105 CR khi săn thẻ Tự Do / Người." },
    r2: { id: "tr2", tier: "omniwomb", breedChance: 90, omniWomb: true, crAura: 100, crMult: 0.96, crPenaltyPct: 0, tag: "Buồng Omni-Womb (90%)", desc: "Hàng 2: 90% tạo nhiều dạng Token thử nghiệm cuối mỗi lượt." } },

  // SALVIC UNION
  { id: "tr_sal_veteran", name: "Predita 10-Year Veteran", fac: "salvic", gender: "Male", species: "Prozonian", race: "prozonian", cr: 480,
    r1: { id: "tr1", tag: "Tàn Quân Bất Tử", bonusFlat: 120, desc: "Hàng 1: +120 CR; tăng lên +200 CR khi đấu Western Nadir." },
    r2: { id: "tr2", tier: "alien", breedChance: 64, crAura: 95, crMult: 0.88, crPenaltyPct: 0, tag: "Chiến Hữu Predita (64%)", desc: "Hàng 2: +95 CR Hàng 1." } },
  { id: "tr_sal_paladin", name: "Salvic Shield Maiden", fac: "salvic", gender: "Female", species: "Prozonian", race: "prozonian", cr: 390,
    r1: { id: "tr1", tag: "Khiên Thép Salvic", bonusFlat: 90, desc: "Hàng 1: +90 CR bảo hộ." },
    r2: { id: "tr2", tier: "alien", breedChance: 66, crAura: 80, crMult: 0.86, crPenaltyPct: 5, tag: "Huyết Mạch Kiên Cố (66%)", desc: "Hàng 2: 66% sinh Token Prozonian & +80 CR Hàng 1." } },

  // TAMARITE
  { id: "tr_tam_paragon", name: "Pherone Photon Maiden", fac: "tamarite", gender: "Female", species: "Tamarite", race: "tamarite", cr: 610,
    r1: { id: "tr1", tag: "Bão Quang Phổ", bonusFlat: 120, desc: "Hàng 1: +120 CR; +90 CR mỗi thẻ Tamarite khác trên sân." },
    r2: { id: "tr2", tier: "tamarite", breedChance: 100, omniWomb: false, crAura: 125, crMult: 1.15, crPenaltyPct: 0, tag: "Tamarite Thuần (100%)", desc: "Hàng 2: Mặc định 100% sinh Token Tamarite cực mạnh cuối mỗi lượt!" } },

  // SYLVARIAN & INDEPENDENT reserves
  { id: "tr_syl_guard", name: "Kronea Royal Guard", fac: "sylvarian", gender: "Male", species: "Sylvarian", race: "sylvarian", cr: 410,
    r1: { id: "tr1", tag: "Vệ Binh Hoàng Cung", bonusFlat: 85, desc: "Hàng 1: +85 CR." },
    r2: { id: "tr2", tier: "alien", breedChance: 60, crAura: 80, crMult: 0.85, crPenaltyPct: 5, tag: "Astraum Căn Bản (60%)", desc: "Hàng 2: +80 CR Hàng 1." } },
  { id: "tr_ind_merc", name: "Gaiastra Horizon Merc", fac: "independent", gender: "Female", species: "Người", race: "human", cr: 350,
    r1: { id: "tr1", tag: "Lính Đánh Thuê Tự Do", bonusFlat: 90, desc: "Hàng 1: +90 CR linh hoạt trên mọi làn." },
    r2: { id: "tr2", tier: "human_debuff", breedChance: 32, crAura: 35, crMult: 0.72, crPenaltyPct: 28, tag: "Người Thuần (32% • -28% CR Token)", desc: "Hàng 2 (Bất lợi): Gen người thuần không có buff (32% sinh Token & bị giảm -28% CR!)." } }
];

export const FACTION_TROOP_CARDS = TROOP_SPECS.map((t) => ({
  id: t.id,
  troopId: t.id,
  name: t.name,
  kind: "troop",
  fac: t.fac,
  species: t.species,
  race: t.race,
  cr: t.cr,
  h: 1.85,
  gender: t.gender || "Male",
  unique: false,
  row1Effect: t.r1,
  row2Effect: t.r2
}));

export const CHARACTER_CARDS = CHARACTERS.map(charToCard);
export const CARDS = [...CHARACTER_CARDS, ...FACTION_TROOP_CARDS];
export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export function hybridToCard(h) {
  const cr = h.cr || 500;
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
    h: h.h || 1.9,
    gender: h.gender || (Math.random() < 0.5 ? "Male" : "Female"),
    unique: !h.isToken,
    row1Effect: h.row1Effect || {
      id: "hyb_resonance",
      tag: h.mutated ? "Đột Biến Thống Lĩnh" : "Cộng Hưởng Huyết Thống",
      bonusFlat: h.mutated ? 150 : 105,
      desc: `Hàng 1/3: ${h.signatureSkill || "Huyết Thống Hợp Nhất"} — +${h.mutated ? 150 : 105} CR giao chiến!`
    },
    row2Effect: h.row2Effect || {
      id: "hyb_lineage",
      tier: "alien_buff",
      breedChance: 78,
      crAura: Math.max(85, Math.round(cr * 0.14)),
      crMult: 0.95,
      crPenaltyPct: 0,
      tag: "Gen Thế Hệ Lai (78%)",
      desc: `Hàng 2: 78% sinh Token F2 & +${Math.max(85, Math.round(cr * 0.14))} CR Hàng 1.`
    }
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
export function buildFactionDeck(leaderId = "arisia", hybrids = []) {
  const leader = resolveCard(leaderId, hybrids) || CARD_BY_ID.arisia;
  const fac = leader.fac || "sylvarian";
  const pool = getFactionCardPool(fac, hybrids).filter((c) => c.id !== leader.id);

  const deck = [];
  for (const c of pool) {
    if (deck.length >= 16) break;
    deck.push(c.id);
  }

  const troops = pool.filter((c) => !c.unique);
  let idx = 0;
  while (deck.length < 16 && pool.length > 0) {
    const src = troops.length > 0 ? troops[idx % troops.length] : pool[idx % pool.length];
    deck.push(src.id);
    idx++;
  }

  return deck.slice(0, 16);
}

export function validateDeckForLeader(deckIds = [], leaderId = "arisia", hybrids = []) {
  const leader = resolveCard(leaderId, hybrids) || CARD_BY_ID.arisia;
  const fac = leader.fac;
  return (deckIds || [])
    .filter((id) => id !== leader.id)
    .map((id) => resolveCard(id, hybrids))
    .filter((c) => c && c.fac === fac)
    .map((c) => c.id)
    .slice(0, 16);
}
