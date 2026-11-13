// ============================================================================
// CYCLE 12: AGE OF DOMINION — FACTION & CR CARD DATABASE (v6)
// Core Rule: Each card carries Art, Name, CR, Species, Faction,
// Row 1 Effect (Combat), and Row 2 Effect (Support / Breeding).
// Strictly enforces Faction Leader ownership: a Leader only commands cards of their Faction.
// ============================================================================

import { CHARACTERS, CHAR_BY_ID } from "./characters.js";
import { FACTIONS } from "./lore.js";
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
  if (c.id === "dick") return { id: "immortal_bypass", tag: "Bất Tử Áp Chế", bonusFlat: 40, desc: "Hàng 1/3: +40 CR; nếu thua ở Hàng 1 sẽ tăng mạnh hiệu ứng sinh sản khi vào Hàng 2." };
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
  if (c.id === "meralina") return { id: "r2_mutator", crAura: 110, mutBonus: 40, canBreedToken: true, tag: "Đột Biến Cực Đại", desc: "Hàng 2: +110 CR cho Hàng 1 chủ nhân & tăng +40% tỷ lệ Đột Biến khi Lai Tạo tại trận!" };
  if (c.id === "tsunadia" || c.id === "ovalina") return { id: "r2_brood_mother", crAura: 130, mutBonus: 25, canBreedToken: true, tag: "Huyết Thống Đa Sinh", desc: "Hàng 2: +130 CR cho toàn Hàng 1; khi Lai Tạo tại trận tạo Hậu Duệ +150 CR cộng thêm!" };
  if (c.id === "pussiri") return { id: "r2_synth_tamarite", crAura: 105, mutBonus: 20, canBreedToken: true, tag: "Tổng Hợp 65/30/5", desc: "Hàng 2: Gen Tamarite-Sylvarian giúp +105 CR cho Hàng 1 & đẻ thẻ Lai chất lượng cao." };
  if (c.id === "exorotic") return { id: "r2_nano_egg", crAura: 85, mutBonus: 55, canBreedToken: true, tag: "Tái Cấu Trúc Nano", desc: "Hàng 2: +85 CR Hàng 1; Lai Tạo tại trận luôn đạt 90%+ đột biến kế thừa CR cao." };
  if (c.id === "dick") return { id: "r2_override", crAura: 90, mutBonus: 50, canBreedToken: true, bypassImmunity: true, tag: "Xuyên Phá Huyết Thống", desc: "Hàng 2: Bỏ qua miễn nhiễm CR>=800 khi Lai Tạo tại trận & +90 CR cho Hàng 1." };
  if (c.id === "july" || c.id === "jorduyn" || sp.includes("hinatian")) return { id: "r2_blue_resonance", crAura: 115, mutBonus: 20, canBreedToken: true, tag: "Chuyển Hóa Máu Xanh", desc: "Hàng 2: Máu xanh Hinatian cộng +115 CR Hàng 1 & tự hóa giải bất lợi sinh học." };
  if (sp.includes("wombiote")) return { id: "r2_wombiote_split", crAura: 95, mutBonus: 30, canBreedToken: true, tag: "Phân Nhánh Wombiote", desc: "Hàng 2: +95 CR cho Hàng 1; cho phép nhân bản tế bào Wombiote vào tay bài." };
  if (c.cr >= 800) return { id: "r2_sovereign_gene", crAura: 145, mutBonus: 30, canBreedToken: true, immunity800: true, tag: "Gen Thượng Đẳng CR800+", desc: "Hàng 2: Miễn nhiễm ký sinh cấp thấp; cộng +145 CR uy áp cho Hàng 1 của người bắt giữ!" };
  if (sp.includes("prozon")) return { id: "r2_prozon_lineage", crAura: 90, mutBonus: 15, canBreedToken: true, tag: "Dòng Máu Hiệp Sĩ", desc: "Hàng 2: +90 CR bền bỉ cho Hàng 1 & hậu duệ kế thừa chỉ số gốc ổn định." };
  return { id: "r2_gene_support", crAura: Math.max(55, Math.round(c.cr * 0.14)), mutBonus: 15, canBreedToken: true, tag: "Phụ Trợ & Lai Gen", desc: `Hàng 2: Cộng +${Math.max(55, Math.round(c.cr * 0.14))} CR hỗ trợ Hàng 1 và làm nguyên liệu Lai Tạo Hậu Duệ.` };
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
    gender: c.gender,
    unique: true,
    row1Effect: inferRow1Effect(c),
    row2Effect: inferRow2Effect(c)
  };
}

// Lore-grounded Faction Reserve Units so EVERY one of the 8 Factions (even Eris/Nadirius/Western Nadir)
// has a rich, strict faction-pure card pool for Deck Building!
const TROOP_SPECS = [
  // ERIS UNION (needed alongside Emma)
  { id: "tr_eris_sentinel", name: "Eris Outer Sentinel", fac: "eris", species: "Cấu Thể Eris", race: "erisian", cr: 420,
    r1: { id: "tr1", tag: "Giáp Khối Đa Diện", bonusFlat: 80, desc: "Hàng 1: +80 CR tại Outer Layer hoặc khi bạn dẫn đầu CR." },
    r2: { id: "tr2", crAura: 85, mutBonus: 15, canBreedToken: true, tag: "Tinh Thể Eris", desc: "Hàng 2: +85 CR phụ trợ cho Hàng 1 & hỗ trợ tạo Hậu Duệ ánh sáng." } },
  { id: "tr_eris_arbiter", name: "Eris Reset Arbiter", fac: "eris", species: "Thiên Sứ Eris", race: "erisian", cr: 620,
    r1: { id: "tr1", tag: "Khóa Chân Không", bonusFlat: 110, desc: "Hàng 1: +110 CR & hủy bỏ 50% buff phe địch đối diện." },
    r2: { id: "tr2", crAura: 110, mutBonus: 25, canBreedToken: true, tag: "Ma Trận Phôi Eris", desc: "Hàng 2: +110 CR Hàng 1 & tăng 25% đột biến lai tạo." } },
  { id: "tr_eris_keeper", name: "Eris Chronos Keeper", fac: "eris", species: "Erisian", race: "erisian", cr: 340,
    r1: { id: "tr1", tag: "Ngưng Đọng Chu Kỳ", bonusFlat: 75, desc: "Hàng 1: +75 CR; rút +1 thẻ phe Eris khi ra sân." },
    r2: { id: "tr2", crAura: 70, mutBonus: 20, canBreedToken: true, tag: "Chuỗi Thời Gian", desc: "Hàng 2: +70 CR cho Hàng 1 và ổn định quá trình ấp gen." } },
  { id: "tr_eris_prism", name: "Outer Layer Prism", fac: "eris", species: "Sinh Thể Ánh Sáng", race: "erisian", cr: 510,
    r1: { id: "tr1", tag: "Khúc Xạ Vũ Trụ", bonusFlat: 95, desc: "Hàng 1: +95 CR cho bản thân và +50 CR cho Thủ lĩnh Hàng 3." },
    r2: { id: "tr2", crAura: 95, mutBonus: 20, canBreedToken: true, tag: "Phản Chiếu Gen", desc: "Hàng 2: +95 CR cho Hàng 1 của người bắt giữ." } },

  // NADIRIUS EMPIRE (alongside Magnatere & Hyouya)
  { id: "tr_nad_knight", name: "Nadirius Astral Knight", fac: "nadirius", species: "Hiệp Sĩ Nadir", race: "nadir", cr: 460,
    r1: { id: "tr1", tag: "Trật Tự Thép", bonusFlat: 90, desc: "Hàng 1: +90 CR; +100 CR thêm khi đấu với Western Nadir." },
    r2: { id: "tr2", crAura: 85, mutBonus: 15, canBreedToken: true, tag: "Huyết Thống Đế Quốc", desc: "Hàng 2: +85 CR cho Hàng 1 chủ nhân." } },
  { id: "tr_nad_warden", name: "Citadel Obsidian Warden", fac: "nadirius", species: "Thần Vệ Nadir", race: "nadir", cr: 580,
    r1: { id: "tr1", tag: "Thành Lũy Citadel", bonusFlat: 115, desc: "Hàng 1: +115 CR bảo vệ tối đa tuyến đầu." },
    r2: { id: "tr2", crAura: 105, mutBonus: 20, canBreedToken: true, tag: "Kỷ Luật Huyết Mạch", desc: "Hàng 2: +105 CR cho toàn bộ Hàng 1." } },
  { id: "tr_nad_lancer", name: "Nadirius Shadow Lancer", fac: "nadirius", species: "Tiên Phong Nadir", race: "nadir", cr: 390,
    r1: { id: "tr1", tag: "Mũi Thương Phản Kích", bonusFlat: 85, desc: "Hàng 1: +85 CR; cộng thêm 80 CR khi đánh lá Hàng 3." },
    r2: { id: "tr2", crAura: 75, mutBonus: 20, canBreedToken: true, tag: "Xung Huyết Nadir", desc: "Hàng 2: +75 CR cho Hàng 1 & đẩy nhanh tốc độ Lai Tạo." } },
  { id: "tr_nad_envoy", name: "Nadirius Royal Praetor", fac: "nadirius", species: "Thần Nadir", race: "nadir", cr: 670,
    r1: { id: "tr1", tag: "Uy Nghiêm Hoàng Tộc", bonusFlat: 120, desc: "Hàng 1: +120 CR và +60 CR cho Magnatere / Hyouya." },
    r2: { id: "tr2", crAura: 120, mutBonus: 25, canBreedToken: true, tag: "Gen Vệ Thần", desc: "Hàng 2: +120 CR Hàng 1 & nâng CR cơ sở của con lai." } },

  // WESTERN NADIR (alongside Overlord, Kyaria, Cipheron, Dick)
  { id: "tr_wn_raider", name: "Abyssal Border Raider", fac: "western_nadir", species: "Chiến Binh Vực Thẳm", race: "nadir", cr: 410,
    r1: { id: "tr1", tag: "Tập Kích Vực Thẳm", bonusFlat: 95, desc: "Hàng 1: +95 CR; giảm 50 CR lá Sylvarian đối diện." },
    r2: { id: "tr2", crAura: 80, mutBonus: 25, canBreedToken: true, tag: "Dịch Thể Nadir", desc: "Hàng 2: +80 CR Hàng 1 & +25% đột biến lai tạo." } },
  { id: "tr_wn_natheron", name: "Natheron Virus Host", fac: "western_nadir", species: "Natheron Ký Sinh", race: "nadir", cr: 320,
    r1: { id: "tr1", tag: "Lây Lan Natheron", bonusFlat: 80, desc: "Hàng 1: +80 CR; giảm 100 CR đối thủ có CR < 800." },
    r2: { id: "tr2", crAura: 95, mutBonus: 35, canBreedToken: true, tag: "Lò Ấp Natheron", desc: "Hàng 2: +95 CR Hàng 1; cộng 35% đột biến (vô hiệu lên thẻ CR>=800)." } },
  { id: "tr_wn_starro", name: "Western Starro Brood", fac: "western_nadir", species: "Starro Ký Sinh", race: "mutant", cr: 540,
    r1: { id: "tr1", tag: "Kiểm Soát Tâm Trí", bonusFlat: 105, desc: "Hàng 1: +105 CR; khóa 50% hiệu ứng của kẻ yếu hơn." },
    r2: { id: "tr2", crAura: 110, mutBonus: 30, canBreedToken: true, tag: "Phân Bào Starro", desc: "Hàng 2: +110 CR cho Hàng 1 và hỗ trợ lai ký sinh." } },

  // THE COLLECTORS (alongside Mr.Mind, Parasoid, Kale, Exorotic, Eremite)
  { id: "tr_col_ultrabot", name: "Tokyzhou Ultra-Bot Mk.II", fac: "collectors", species: "Ultra Bot Cyborg", race: "cyborg", cr: 430,
    r1: { id: "tr1", tag: "Lưới Bắt Sinh Học", bonusFlat: 95, desc: "Hàng 1: +95 CR; +75 CR nếu trong Hàng 2 bạn có >= 1 tù binh." },
    r2: { id: "tr2", crAura: 85, mutBonus: 20, canBreedToken: true, tag: "Kho Lưu Trữ DNA", desc: "Hàng 2: +85 CR cho Hàng 1 & hỗ trợ nhân bản gen." } },
  { id: "tr_col_stalker", name: "Vander Bio-Harvester", fac: "collectors", species: "Dị Nhân Thí Nghiệm", race: "mutant", cr: 510,
    r1: { id: "tr1", tag: "Săn Mẫu Vật", bonusFlat: 105, desc: "Hàng 1: +105 CR khi săn các thẻ Independent / Human." },
    r2: { id: "tr2", crAura: 100, mutBonus: 30, canBreedToken: true, tag: "Ống Nghiệm Vander", desc: "Hàng 2: +100 CR Hàng 1 & +30% đột biến gen." } },

  // SALVIC UNION (alongside Zarcseid, Elita, etc.)
  { id: "tr_sal_veteran", name: "Predita 10-Year Veteran", fac: "salvic", species: "Prozonian", race: "prozonian", cr: 480,
    r1: { id: "tr1", tag: "Tàn Quân Bất Tử", bonusFlat: 120, desc: "Hàng 1: +120 CR; tăng lên +200 CR khi đấu với Western Nadir." },
    r2: { id: "tr2", crAura: 95, mutBonus: 15, canBreedToken: true, tag: "Chiến Hữu Predita", desc: "Hàng 2: +95 CR Hàng 1 & hậu duệ mang 100% ý chí Prozonian." } },
  { id: "tr_sal_paladin", name: "Salvic Shield Paladin", fac: "salvic", species: "Prozonian", race: "prozonian", cr: 390,
    r1: { id: "tr1", tag: "Khiên Thép Salvic", bonusFlat: 90, desc: "Hàng 1: +90 CR & +60 CR bảo hộ cho Thủ lĩnh Hàng 3." },
    r2: { id: "tr2", crAura: 80, mutBonus: 15, canBreedToken: true, tag: "Huyết Mạch Kiên Cố", desc: "Hàng 2: +80 CR Hàng 1." } },

  // TAMARITE (alongside Ovalina, Uterussa, Tsunadia, etc.)
  { id: "tr_tam_paragon", name: "Pherone Photon Maiden", fac: "tamarite", species: "Tamarite", race: "tamarite", cr: 610,
    r1: { id: "tr1", tag: "Bão Quang Phổ", bonusFlat: 120, desc: "Hàng 1: +120 CR; cộng thêm +90 CR mỗi thẻ Tamarite khác trên sân." },
    r2: { id: "tr2", crAura: 125, mutBonus: 35, canBreedToken: true, tag: "Phôi Tế Bào SSS+", desc: "Hàng 2: +125 CR Hàng 1 & tạo ra dòng lai CR vượt trội!" } },

  // SYLVARIAN & INDEPENDENT reserves
  { id: "tr_syl_guard", name: "Kronea Royal Guard", fac: "sylvarian", species: "Sylvarian", race: "sylvarian", cr: 410,
    r1: { id: "tr1", tag: "Vệ Binh Hoàng Cung", bonusFlat: 85, desc: "Hàng 1: +85 CR; +60 CR cho Arisia / Meralina." },
    r2: { id: "tr2", crAura: 80, mutBonus: 15, canBreedToken: true, tag: "Astraum Căn Bản", desc: "Hàng 2: +80 CR Hàng 1." } },
  { id: "tr_ind_merc", name: "Gaiastra Horizon Merc", fac: "independent", species: "Người / Đa Tộc", race: "human", cr: 350,
    r1: { id: "tr1", tag: "Lính Đánh Thuê Tự Do", bonusFlat: 90, desc: "Hàng 1: +90 CR linh hoạt trên mọi làn." },
    r2: { id: "tr2", crAura: 75, mutBonus: 20, canBreedToken: true, tag: "Gen Đa Dạng Tự Do", desc: "Hàng 2: +75 CR cho Hàng 1 và dễ tương thích Lai Tạo." } }
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
  gender: "Unit",
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
    hybridData: h,
    name: h.name,
    kind: "hybrid",
    fac: h.fac || "tamarite",
    species: h.species || "Hybrid",
    race: h.race || "tamarite",
    cr,
    h: h.h || 1.9,
    gender: "Hybrid",
    unique: true,
    row1Effect: {
      id: "hyb_resonance",
      tag: h.mutated ? "Đột Biến Thống Lĩnh" : "Cộng Hưởng Huyết Thống",
      bonusFlat: h.mutated ? 165 : 115,
      desc: `Hàng 1/3: ${h.signatureSkill || "Huyết Thống Hợp Nhất"} — +${h.mutated ? 165 : 115} CR giao chiến trực diện!`
    },
    row2Effect: {
      id: "hyb_lineage",
      crAura: Math.max(95, Math.round(cr * 0.16)),
      mutBonus: 30,
      canBreedToken: true,
      tag: "Gen Thế Hệ F1/F2",
      desc: `Hàng 2: +${Math.max(95, Math.round(cr * 0.16))} CR phụ trợ cho Hàng 1 và làm nền Lai Tạo F2 cực mạnh!`
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
  // Troop cards inherit visual aesthetic of an iconic character from the same faction
  const rep = CHARACTERS.find((c) => c.fac === card.fac) || CHARACTERS[0];
  return getPortraitUrl(rep);
}

// Strict Faction Pool: ONLY cards belonging to `factionId`!
export function getFactionCardPool(factionId, hybrids = []) {
  const hybCards = (hybrids || []).filter((h) => h.fac === factionId).map(hybridToCard);
  const facCards = CARDS.filter((c) => c.fac === factionId);
  return [...hybCards, ...facCards].sort((a, b) => b.cr - a.cr);
}

// Builds a legal 12-card Faction Deck for the given Leader (`leaderId`).
// Every card in the returned deck is GUARANTEED to share `leader.fac`!
export function buildFactionDeck(leaderId = "arisia", hybrids = []) {
  const leader = resolveCard(leaderId, hybrids) || CARD_BY_ID.arisia;
  const fac = leader.fac || "sylvarian";
  const pool = getFactionCardPool(fac, hybrids).filter((c) => c.id !== leader.id);

  const deck = [];
  // Add unique faction characters & hybrids first (except Leader who sits permanently on Row 3!)
  for (const c of pool) {
    if (deck.length >= 12) break;
    deck.push(c.id);
  }

  // If a small faction has < 12 unique cards, fill remaining slots with non-unique Faction Troop Reserves (up to 3x)
  const troops = pool.filter((c) => !c.unique);
  let idx = 0;
  while (deck.length < 12 && pool.length > 0) {
    const src = troops.length > 0 ? troops[idx % troops.length] : pool[idx % pool.length];
    deck.push(src.id);
    idx++;
  }

  return deck.slice(0, 12);
}

export function validateDeckForLeader(deckIds = [], leaderId = "arisia", hybrids = []) {
  const leader = resolveCard(leaderId, hybrids) || CARD_BY_ID.arisia;
  const fac = leader.fac;
  return (deckIds || [])
    .filter((id) => id !== leader.id)
    .map((id) => resolveCard(id, hybrids))
    .filter((c) => c && c.fac === fac)
    .map((c) => c.id)
    .slice(0, 12);
}
