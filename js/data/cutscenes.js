// ============================================================================
// CYCLE 12: AGE OF DOMINION — ANIMATED UNIVERSE HISTORY CUTSCENES (v5)
// Renders interactive 3D cosmology slides + dynamic Protagonist awakening
// ============================================================================

import { CHAR_BY_ID } from "./characters.js";
import { findLocation } from "./galaxy.js";
import { FACTIONS } from "./lore.js";

export function buildHistoryCutscenes(gameState) {
  const hero = CHAR_BY_ID[gameState?.protagonistId] || CHAR_BY_ID.arisia;
  const loc = findLocation(hero.loc);
  const fac = FACTIONS[hero.fac] || FACTIONS.independent;
  const heroSectorName = loc?.sector?.name || "Hệ Sylvalon";
  const heroSectorId = loc?.sector?.id || "sylvalon";

  return [
    {
      id: "cut_genesis",
      era: "KỶ NGUYÊN 0 • BÌNH MINH VŨ TRỤ GAIASTRA",
      title: "Hỗn Mang Nguyên Thủy & Sự Ra Đời Của Vạn Chủng",
      scene3d: "genesis",
      accent: "#facc15",
      sector: "eris_core",
      narration: "Trước khi đế chế nào kịp khắc tên lên các vì sao, vũ trụ Gaiastra bùng nổ từ một Điểm Kỳ Dị thuần khiết — gieo mầm cho 15 đại chủng tộc từ Con Người, Sylvarian đến các sinh thể đa chiều."
    },
    {
      id: "cut_eris",
      era: "CHU KỲ 1 — 11 • PHÁI BỘ ERIS UNION & VÒNG LẶP RESET",
      title: "Người Canh Giữ Trần Nhà Vũ Trụ (Outer Layer)",
      scene3d: "eris_cycles",
      accent: "#f8fafc",
      sector: "outer_layer",
      narration: "Phái bộ Eris Union dựng nên khối đa diện Outer Layer bên ngoài không-thời gian. Mỗi khi chiến tranh đe dọa xé nát Gaiastra, họ lại kích hoạt Reset — xóa sạch 11 chu kỳ lịch sử... chỉ giữ lại một số ký ức cổ xưa."
    },
    {
      id: "cut_empires",
      era: "THỜI ĐẠI TRUNG CỔ NGÂN HÀ • BỐN TRỤ CỘT QUYỀN LỰC",
      title: "Sylvarian • Western Nadir • Nadirius • Prozonian & Tamarite",
      scene3d: "great_empires",
      accent: "#38bdf8",
      sector: "sylvalon",
      narration: "Vào Chu kỳ 12, Đế chế Sylvarian kiểm soát 70% ngân hà nhờ dòng gen Astraum và các Tamarite siêu việt. Đối trọng với họ là liên minh quân sự Western Nadir của Thần Overlord, đế chế thép Nadirius, và những hiệp sĩ bất khuất Prozonian ở Predita."
    },
    {
      id: "cut_weapons",
      era: "ĐẠI CHIẾN UNIWAR • SÁU SIÊU VŨ KHÍ TỐI THƯỢNG",
      title: "Gotterfall, Schwarzbruch & Vết Sẹo Hiệp Ước Cursew",
      scene3d: "uniwar_weapons",
      accent: "#f43f5e",
      sector: "western_march",
      narration: "Những cỗ máy hủy diệt như pháo vệ tinh Gotterfall hay hố đen Schwarzbruch đã từng xóa sổ hàng loạt hành tinh chỉ trong một hơi thở. Để tránh kích hoạt Reset lần thứ 12, hiệp ước tạm thời Cursew được ký — nhưng lửa ngầm vẫn âm ỉ khắp 20 hệ sao."
    },
    {
      id: "cut_awakening",
      era: `CHU KỲ ${gameState?.cycleMajor || 12}.${gameState?.cycleMinor || 1} • NGƯỜI ĐƯỢC CHỌN`,
      title: `Hành Trình Của ${hero.name} Bắt Đầu`,
      scene3d: "awakening",
      accent: fac.color || "#38bdf8",
      sector: heroSectorId,
      narration: `Tại ${heroSectorName}, ${hero.name} (${hero.title} • ${fac.name}) chuẩn bị dẫn dắt bàn cờ sinh tử của Chu Kỳ 12. Dù bằng chiến thuật Thẻ Bài, ngoại giao Ngân Hà, hay Lai Tạo Huyết Thống Gen mới — lịch sử Gaiastra từ giây phút này do chính bạn viết nên!`
    }
  ];
}
