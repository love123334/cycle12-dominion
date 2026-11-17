// ============================================================================
// CYCLE 12: INTERACTIVE VISUAL NOVEL ENGINE DATA (js/data/story.js)
// 13 Chương Sử Thi Tương Tác + Đối Thoại Chuyên Sâu cho 72 Nhân Vật & Hybrid
// Bám sát 100% lore hậu Reset, Cursew Pact, Tamarite & AI Story Director.
// ============================================================================

import { CHAR_BY_ID, RELATIONS } from "./characters.js";
import { FACTIONS } from "./lore.js";
import { findLocation } from "./galaxy.js";

export function resolveStoryChar(token, gameState) {
  if (token === "__PROTAGONIST__") return gameState?.protagonistId || "arisia";
  return token;
}

export function resolveStorySector(token, gameState) {
  if (token === "__PROTAGONIST_SECTOR__") {
    const hero = gameState?.getProtagonist ? gameState.getProtagonist() : CHAR_BY_ID[gameState?.protagonistId || "arisia"];
    const loc = hero?.loc ? findLocation(hero.loc) : null;
    return loc?.sector?.id || "sylvalon";
  }
  return token;
}

export const CHAPTERS = [
  {
    id: "ch0_origin",
    num: "KHỞI NGUYÊN",
    title: "Góc Nhìn Tự Do: Định Mệnh Chu Kỳ 12",
    subtitle: "Căn cứ Khởi Đầu Của Nhân Vật Bạn Chọn",
    sector: "__PROTAGONIST_SECTOR__",
    leadChar: "__PROTAGONIST__",
    summary: "Tùy biến hoàn toàn theo nhân vật bạn lựa chọn (bất kỳ trong 72 chiến binh hoặc hậu duệ Lai Gen). Lựa chọn học thuyết mở đầu sẽ định hình tài nguyên, đồng minh và trận Đấu Thẻ Bài đầu tiên.",
    nodes: {
      start: {
        sector: "__PROTAGONIST_SECTOR__",
        leftChar: "__PROTAGONIST__", rightChar: "emma", leftMood: "combat", rightMood: "secret",
        speaker: "narrator",
        text: (g) => {
          const hero = g.getProtagonist();
          const loc = hero.loc ? findLocation(hero.loc) : null;
          const fac = FACTIONS[g.playerFaction] || FACTIONS.independent;
          return `Chu kỳ ${g.cycleMajor}.${g.cycleMinor} chính thức chuyển động. Tại ${loc ? loc.label : "Gaiastra"}, ${hero.name} (${hero.title} • CR ${hero.cr} • ${fac.name}) nhận tín hiệu khẩn cấp từ hệ thống vệ tinh Outer Layer — cả ngân hà đang đứng bên bờ chiến cuộc mới.`;
        },
        next: "ch0_voice"
      },
      ch0_voice: {
        sector: "__PROTAGONIST_SECTOR__",
        leftChar: "__PROTAGONIST__", rightChar: "emma", leftMood: "smug", rightMood: "tense",
        speaker: "__PROTAGONIST__",
        text: (g) => {
          const hero = g.getProtagonist();
          const fac = FACTIONS[g.playerFaction] || FACTIONS.independent;
          return `"Hiệp ước Cursew Pact chẳng thể giữ hòa bình mãi được. Với vị thế của ${hero.name} và nguồn lực ${fac.name}, ta phải quyết định con đường tiến lên ngay từ hôm nay!"`;
        },
        choices: [
          {
            label: "🃏 Đường lối Quân Sự: Khai hỏa Bộ Bài Sức Mạnh & Luyện Quân",
            hint: "+2,500 Credits • Bắt đầu trận Đấu Thẻ Bài tập trận ngay lập tức",
            effects: (g) => g.addRes(g.playerFaction, "credits", 2500),
            battle: {
              playerId: "__PROTAGONIST__",
              enemyId: "ojamon",
              stageId: "__PROTAGONIST_SECTOR__",
              winNext: "ch0_win",
              loseNext: "ch0_diplomacy"
            }
          },
          {
            label: "🧬 Đường lối Di Truyền: Nghiên Cứu Phóng Xạ & Chuẩn Bị Lai Tạo Gen",
            hint: "+300 Nghiên cứu • +120 Ảnh hưởng để sẵn sàng mở Buồng Lai Tạo",
            effects: (g) => {
              g.addRes(g.playerFaction, "research", 300);
              g.addRes(g.playerFaction, "influence", 120);
              g.addAffinity("ovalina", 20);
            },
            next: "ch0_gene"
          },
          {
            label: "🤝 Đường lối Ngoại Giao: Củng Cố Liên Minh Toàn Vũ Trụ",
            hint: "+2,000 Credits • +150 Ảnh hưởng • Giảm Căng thẳng -10%",
            effects: (g) => {
              g.addRes(g.playerFaction, "credits", 2000);
              g.addRes(g.playerFaction, "influence", 150);
              g.addTension(-10);
            },
            next: "ch0_diplomacy"
          }
        ]
      },
      ch0_win: {
        sector: "__PROTAGONIST_SECTOR__",
        leftChar: "__PROTAGONIST__", rightChar: "ojamon", leftMood: "happy", rightMood: "tense",
        speaker: "ojamon",
        text: (g) => `"Chiến thuật thẻ bài của ${g.getProtagonist().name} quả nhiên bén như dao cạo! Cả Sylvarian lẫn Western Nadir sẽ phải dè chừng tên tuổi ngươi trong Chu kỳ 12 này."`,
        end: {
          title: "KHỞI NGUYÊN HOÀN TẤT: CHIẾN LƯỢC GIA BẤT BẠI",
          summary: "Đã thiết lập góc nhìn nhân vật chính! Nhấn tiếp để bước vào Chương I: Ánh Chớp Gotterfall.",
          nextChapter: "ch1_gotterfall"
        }
      },
      ch0_gene: {
        sector: "__PROTAGONIST_SECTOR__",
        leftChar: "__PROTAGONIST__", rightChar: "ovalina", leftMood: "happy", rightMood: "happy",
        speaker: "ovalina",
        text: (g) => `"Tầm nhìn tuyệt vời đấy, ${g.getProtagonist().name}! Khi kết hợp tinh hoa huyết thống của 15 chủng tộc thông qua Hàng 2 Sinh Sản trong Đấu Thẻ Bài, ngươi sẽ triệu hồi những Token Hậu Duệ không ai cản nổi lên Hàng 1!"`,
        end: {
          title: "KHỞI NGUYÊN HOÀN TẤT: KIẾN TRÚC SƯ HUYẾT THỐNG",
          summary: "+300 Nghiên cứu & +120 Ảnh hưởng • Sẵn sàng mở màn Chương I.",
          nextChapter: "ch1_gotterfall"
        }
      },
      ch0_diplomacy: {
        sector: "__PROTAGONIST_SECTOR__",
        leftChar: "__PROTAGONIST__", rightChar: "emma", leftMood: "happy", rightMood: "neutral",
        speaker: "emma",
        text: (g) => `"Lựa chọn khôn ngoan, ${g.getProtagonist().name}. Khi các siêu cường giữ được kiềm chế, ta chưa phải kích hoạt lệnh Reset Chu kỳ 12."`,
        end: {
          title: "KHỞI NGUYÊN HOÀN TẤT: SỨ GIẢ HÒA BÌNH",
          summary: "+2,000 Credits, +150 Ảnh hưởng, -10% Căng thẳng.",
          nextChapter: "ch1_gotterfall"
        }
      }
    }
  },
  {
    id: "ch1_gotterfall",
    num: "CHƯƠNG I",
    title: "Ánh Chớp Gotterfall & Hiệp Ước Cursew",
    subtitle: "Hệ Sylvalon → Biên khu Western Nadir → Berlidona",
    sector: "sylvalon",
    leadChar: "arisia",
    summary: "Sau nhiều đợt đụng độ biên giới với Overlord và vụ Meralina chạm trán ở tiền tuyến, Nữ hoàng Arisia Grok đứng trước lựa chọn dùng vũ khí cấp tuyệt chủng — mở đường cho Hiệp ước Cursew Pact chấn động vũ trụ.",
    nodes: {
      start: {
        sector: "sylvalon",
        leftChar: "arisia", rightChar: "ojamon", leftMood: "tense", rightMood: "secret",
        speaker: "narrator",
        text: "Hoàng cung Kronea, Hệ Sylvalon. Ánh sáng xanh lạnh của mặt trời nhân tạo hắt lên hàng cột kính. Trên bàn chiến lược ba chiều, ranh giới phía Tây đang đỏ rực bởi các cổng xâm nhiễm của Western Nadir.",
        next: "ch1_2"
      },
      ch1_2: {
        sector: "sylvalon",
        leftChar: "arisia", rightChar: "ojamon", leftMood: "angry", rightMood: "neutral",
        speaker: "arisia",
        text: "Kelvos đã để lại cho ta một đế chế chiếm 70% vũ trụ, nhưng cũng để lại một đám tro âm ỉ. Overlord hồi sinh, Western Nadir thử thách biên giới từng ngày, còn đám Prussireich lại nổi loạn sau vụ Meralina.",
        next: "ch1_3"
      },
      ch1_3: {
        sector: "sylvalon",
        leftChar: "arisia", rightChar: "ojamon", leftMood: "angry", rightMood: "smug",
        speaker: "ojamon",
        text: "Bệ hạ, phe Reformists trong hội đồng vẫn khăng khăng giữ Hiệp ước Uni để cô lập Western Nadir. Nhưng nói thật — phong tỏa bằng binh lực thường chỉ khiến chiến tuyến kéo dài tốn kém.",
        next: "ch1_4"
      },
      ch1_4: {
        sector: "western_march",
        leftChar: "arisia", rightChar: "ojamon", leftMood: "combat", rightMood: "secret",
        speaker: "ojamon",
        text: "Pháo ánh sáng Gotterfall do thần hiệu chỉnh đã sẵn sàng khai hỏa. Nếu đi kèm Bom kỳ dị Schwarzbruch của Người, ta có thể xóa sạch cả một đạo quân Western Nadir trong một nhát cắt — ánh chớp sẽ rọi tới tận Đế chế Nadirius.",
        choices: [
          {
            label: "⚡ Phê chuẩn leo thang hủy diệt: Bắn Gotterfall & Schwarzbruch",
            hint: "Theo đúng canon • Căng thẳng +18, Tín dụng -600, mở đối đầu với Overlord",
            effects: (g) => {
              g.addTension(18);
              g.addRes("sylvarian", "credits", -600);
              g.addDefense("western_march", -30);
              g.setFlag("ch1_used_gotterfall", true);
              g.addAffinity("ojamon", 15);
            },
            next: "ch1_canon_blast"
          },
          {
            label: "⚔️ Đích thân dẫn quân ngăn Overlord tại Biên khu",
            hint: "Đấu Thẻ Bài (Arisia vs Overlord) • Thắng sẽ đẩy lùi Nadir mà không đốt tài nguyên",
            effects: (g) => {
              g.setFlag("ch1_duel_attempt", true);
              g.addAffinity("arisia", 15);
            },
            battle: {
              playerId: "arisia",
              enemyId: "overlord",
              stageId: "western_march",
              winNext: "ch1_duel_win",
              loseNext: "ch1_duel_lose"
            }
          },
          {
            label: "🕊️ Nhượng bộ Reformists, duy trì phong tỏa biên giới",
            hint: "Ảnh hưởng Reformists tăng • Quan hệ Nadirius tốt hơn, nhưng Overlord tiếp tục lấn tới",
            effects: (g) => {
              g.addRes("sylvarian", "influence", 80);
              g.addRelation("sylvarian", "nadirius", 15);
              g.addStability("western_march", -15);
              g.setFlag("ch1_held_back", true);
            },
            next: "ch1_reform_route"
          }
        ]
      },
      ch1_canon_blast: {
        sector: "western_march",
        leftChar: "arisia", rightChar: "overlord", leftMood: "combat", rightMood: "smug",
        speaker: "narrator",
        text: "Chùm sáng Gotterfall xé toạc không gian, theo sau là quả cầu kỳ dị Schwarzbruch nuốt chửng toàn bộ phần tàn dư. Ánh chớp trắng xóa sáng rực đến tận Thành trì Nadirius bên chiều không gian kia.",
        next: "ch1_overlord_offer"
      },
      ch1_duel_win: {
        sector: "western_march",
        leftChar: "arisia", rightChar: "overlord", leftMood: "smug", rightMood: "tense",
        speaker: "overlord",
        text: "Khá lắm, Nữ hoàng Sylvarian! Construct Ring của ngươi sắc bén hơn ta tưởng. Giữa những kẻ cuồng chiến chán ngắt ở Gaiastra, ít nhất ngươi biết cách dùng nắm đấm lẫn đầu óc.",
        effects: (g) => { g.addRes("sylvarian", "influence", 120); g.addAffinity("overlord", 12); },
        next: "ch1_overlord_offer"
      },
      ch1_duel_lose: {
        sector: "western_march",
        leftChar: "arisia", rightChar: "ojamon", leftMood: "angry", rightMood: "tense",
        speaker: "ojamon",
        text: "Bệ hạ rút lui kịp thời! Trước áp lực trực diện của Overlord, không còn cách nào khác — thần buộc phải kích hoạt quy trình Gotterfall & Schwarzbruch yểm trợ ngay lập tức!",
        effects: (g) => { g.addTension(20); g.setFlag("ch1_used_gotterfall", true); },
        next: "ch1_overlord_offer"
      },
      ch1_reform_route: {
        sector: "western_march",
        leftChar: "overlord", rightChar: "ojamon", leftMood: "smug", rightMood: "tense",
        speaker: "overlord",
        text: "Lũ Reformists tưởng giữ được cái Hiệp ước Uni mục nát đó sao? Dù sao thì, Sylvarian vẫn đang giữ 70% vũ trụ — một lời đề nghị hòa bình từ ta vẫn là món hời cho cả hai.",
        next: "ch1_overlord_offer"
      },
      ch1_overlord_offer: {
        sector: "berlidona",
        leftChar: "ojamon", rightChar: "yulia", leftMood: "secret", rightMood: "tense",
        speaker: "narrator",
        text: "Không lâu sau, Overlord gửi thông điệp đề xuất hiệp ước song phương: 'hòa bình giữa các cường quốc lớn'. Ojamon nhanh chóng soạn bản thảo: không động binh gần biên giới chung, chia sẻ tình báo và tài nguyên, không can thiệp chống bên thứ ba.",
        next: "ch1_yulia_remark"
      },
      ch1_yulia_remark: {
        sector: "berlidona",
        leftChar: "ojamon", rightChar: "yulia", leftMood: "smug", rightMood: "neutral",
        speaker: "yulia",
        text: "Thật nực cười. Cái hiệp ước Cursew này... giống hệt Hiệp ước Molotov–Ribbentrop.",
        next: "ch1_yulia_silence"
      },
      ch1_yulia_silence: {
        sector: "berlidona",
        leftChar: "ojamon", rightChar: "yulia", leftMood: "neutral", rightMood: "smug",
        speaker: "narrator",
        text: "Không một ai có mặt trong phòng họp Berlidona hiểu câu nói của nhà sử học người lai Yulia Makarova ám chỉ điều gì. Nhưng Ojamon hiểu một điều khác: hiệp ước này đổi lại danh hiệu 'Sylvalon Supreme' cho Arisia, và...",
        next: "ch1_prussireich_choice"
      },
      ch1_prussireich_choice: {
        sector: "prussireich",
        leftChar: "ojamon", rightChar: "pussiri", leftMood: "secret", rightMood: "tense",
        speaker: "pussiri",
        text: "(Nói nhỏ) Chờ đã... trong các buổi báo cáo mật, tôi nghe nói Nữ hoàng vốn định dùng Gotterfall ở quy mô nhỏ hơn để xóa sổ luôn vùng tự trị Prussireich, rồi sau đó 'gửi lời hỏi thăm' tới Malocri.",
        choices: [
          {
            label: "📄 Ký Hiệp ước Cursew & gác kế hoạch Prussireich (Canon)",
            hint: "Hiệp ước hiệu lực • Prussireich tạm an toàn, nhưng Magnatere & Salvic căm phẫn",
            effects: (g) => {
              g.pact.active = true;
              g.pact.turnsRemaining = 10;
              g.addRelation("nadirius", "sylvarian", -20);
              g.addRelation("salvic", "sylvarian", -15);
              g.setFlag("prussireich_spared", true);
            },
            next: "ch1_end_pact"
          },
          {
            label: "🔥 Xé bỏ đề xuất của Overlord & giữ Hiệp ước Uni",
            hint: "Cursew Pact bị hủy sớm • Magnatere (+25 quan hệ), Western Nadir nổi điên",
            effects: (g) => {
              g.pact.active = false;
              g.pact.brokenBy = "sylvarian";
              g.addRelation("nadirius", "sylvarian", 25);
              g.addRelation("salvic", "sylvarian", 15);
              g.addRelation("western_nadir", "sylvarian", -40);
              g.addTension(15);
              g.setFlag("pact_rejected_ch1", true);
            },
            next: "ch1_end_nopact"
          }
        ]
      },
      ch1_end_pact: {
        sector: "sylvalon",
        leftChar: "arisia", rightChar: "ojamon", leftMood: "smug", rightMood: "secret",
        speaker: "narrator",
        text: "Hiệp ước Cursew chính thức được ký kết. Kế hoạch xóa sổ Prussireich lặng lẽ bị cất vào ngăn kéo — thuần túy vì tính toán hậu cần, không phải lòng thương xót. Ngòi nổ cho cuộc chiến mới trong Kỷ 12 đã được châm.",
        end: {
          title: "Hoàn thành Chương I — Kỷ Nguyên Hiệp Ước Cursew",
          summary: "Bạn đã mở khóa quyền lực Sylvalon Supreme và định hình thế cân bằng đa cực đầy bất ổn.",
          unlocks: "ch2_pherone"
        }
      },
      ch1_end_nopact: {
        sector: "sylvalon",
        leftChar: "arisia", rightChar: "magnatere", leftMood: "combat", rightMood: "happy",
        speaker: "narrator",
        text: "Arisia từ chối bắt tay với kẻ thù cũ. Magnatere tại Nadirius và Salvic Union đánh giá cao quyết định giữ vững Hiệp ước Uni, nhưng Overlord lập tức mở hàng loạt cổng xâm nhiễm dọc biên giới Tây.",
        end: {
          title: "Hoàn thành Chương I (Nhánh Kháng Cự Cursew)",
          summary: "Thế giới đi vào ngã rẽ mới: Hiệp ước Cursew chưa từng tồn tại, mặt trận phía Tây rực lửa sớm hơn dự kiến.",
          unlocks: "ch2_pherone"
        }
      }
    }
  },

  // --------------------------------------------------------------------------
  // CHƯƠNG II: PHERONE NEXUS & CÔNG CHÚA LƯU VONG
  // --------------------------------------------------------------------------
  {
    id: "ch2_pherone",
    num: "CHƯƠNG II",
    title: "Bí Mật Dưới Lòng Đất: Pherone Nexus",
    subtitle: "Đặc khu Trái Đất → Hang ngầm Pherone Nexus",
    sector: "sol",
    leadChar: "meralina",
    summary: "Bị Arisia đổi lệnh từ lưu đày sang 'giết ngay khi thấy' sau vết cào của Ragnaroir, công chúa lưu vong Meralina nhuộm tóc đen ẩn náu trong lãnh địa của Ovalina — cho đến khi Cockary rò rỉ thông tin cho đặc vụ April Grastra.",
    nodes: {
      start: {
        sector: "sol",
        leftChar: "meralina", rightChar: "ovalina", leftMood: "tense", rightMood: "happy",
        speaker: "narrator",
        text: "Sâu dưới tầng đá ngầm của Trái Đất, hang động phát quang sinh học Pherone Nexus tỏa sáng dịu nhẹ. Công chúa lưu vong Meralina Caranter soi mình xuống mặt hồ: mái tóc trắng đặc trưng của hoàng tộc giờ đã được nhuộm đen và cắt ngắn.",
        next: "ch2_2"
      },
      ch2_2: {
        sector: "sol",
        leftChar: "meralina", rightChar: "ovalina", leftMood: "neutral", rightMood: "smug",
        speaker: "ovalina",
        text: "Thoải mái đi, công chúa. Nơi này an toàn chẳng kém gì Wonder Island của Nữ thần Diana đâu. Arisia có giỏi đến mấy cũng không dám tùy tiện đánh thẳng vào hang ổ của con gái Vagina Clitoris này.",
        next: "ch2_3"
      },
      ch2_3: {
        sector: "sol",
        leftChar: "meralina", rightChar: "ragnaroir", leftMood: "tense", rightMood: "combat",
        speaker: "narrator",
        text: "Từ trong bóng tối phía sau Meralina, một luồng áp lực nặng nề trỗi dậy. Ragnaroir — sinh vật lai Pregnomorph–Nadiran–chó với CR 1000 — khẽ rít lên. Chính cú vồ của nó đã cào rách tay Arisia, khiến Nữ hoàng giận dữ nâng lệnh truy nã lên mức tử hình.",
        next: "ch2_4"
      },
      ch2_4: {
        sector: "sol",
        leftChar: "april", rightChar: "cockary", leftMood: "tense", rightMood: "smug",
        speaker: "narrator",
        text: "Trong lúc đó, ở tầng mặt đất khu vực Prozon và Trái Đất, đặc vụ April Grastra đang bực bội vì lệnh thu thập tình báo về Meralina từ Arisia không tiến triển. Cho tới khi em út nhà Perfect — Cockary — bất ngờ tìm đến.",
        next: "ch2_5"
      },
      ch2_5: {
        sector: "sol",
        leftChar: "april", rightChar: "cockary", leftMood: "neutral", rightMood: "happy",
        speaker: "cockary",
        text: "Này cô đặc vụ nghiêm túc, đừng cau có thế chứ. Tôi không muốn làm phật lòng hai bà chị đang cho Meralina ở nhờ đâu... nhưng nếu chỉ tiết lộ vị trí sơ bộ ở tầm ngân hà để cô báo cáo cho xong việc thì sao nhỉ?",
        choices: [
          {
            label: "🕵️ Nhận tin rò rỉ của Cockary & cử đội trinh sát tới Pherone Nexus",
            hint: "Theo canon • Sylvarian +120 Ảnh hưởng, nhưng có nguy cơ đụng độ Ovalina/Ragnaroir",
            effects: (g) => {
              g.addRes("sylvarian", "influence", 120);
              g.setFlag("meralina_location_leaked", true);
              g.addAffinity("april", 12);
            },
            next: "ch2_scout_nexus"
          },
          {
            label: "🛡️ Bảo vệ bí mật cho Meralina, báo cáo giả để đánh lạc hướng Arisia",
            hint: "Tăng hảo cảm Tamarite (Ovalina, Meralina, Cockary) • Quan hệ ngầm tốt",
            effects: (g) => {
              g.addAffinity("meralina", 20);
              g.addAffinity("ovalina", 15);
              g.setFlag("meralina_protected", true);
            },
            next: "ch2_protect_route"
          },
          {
            label: "⚔️ Trực tiếp đối đầu Ragnaroir để đo sức mạnh kẻ làm Arisia bị thương",
            hint: "Đấu Thẻ Bài (April Grastra vs Ragnaroir CR 1000)",
            battle: {
              playerId: "april",
              enemyId: "ragnaroir",
              stageId: "sol",
              winNext: "ch2_beat_ragnaroir",
              loseNext: "ch2_lost_ragnaroir"
            }
          }
        ]
      },
      ch2_scout_nexus: {
        sector: "sol",
        leftChar: "april", rightChar: "meralina", leftMood: "secret", rightMood: "tense",
        speaker: "april",
        text: "Vị trí sơ bộ đã có. Nhưng đối đầu trực diện với Ovalina CR 2000 ngay lúc này là tự sát. Ta sẽ giữ tọa độ này làm quân bài chiến lược chờ thời cơ.",
        end: {
          title: "Hoàn thành Chương II — Dấu Vết Dưới Hang Sâu",
          summary: "Meralina vẫn an toàn tạm thời tại Pherone Nexus, nhưng mạng tình báo của Arisia đã khoanh vùng được Trái Đất.",
          unlocks: "ch3_konstantine"
        }
      },
      ch2_protect_route: {
        sector: "sol",
        leftChar: "meralina", rightChar: "ovalina", leftMood: "happy", rightMood: "happy",
        speaker: "meralina",
        text: "Bản báo cáo sai lệch đã kéo lực lượng truy lùng sang rìa Ixalia. Một ngày nào đó, món nợ giữa ta, Prussireich và ngôi vương nhà Grok sẽ được tính sòng phẳng.",
        end: {
          title: "Hoàn thành Chương II — Liên Minh Bóng Tối",
          summary: "Pherone Nexus và công chúa lưu vong Meralina ghi nhận sự giúp đỡ của bạn.",
          unlocks: "ch3_konstantine"
        }
      },
      ch2_beat_ragnaroir: {
        sector: "sol",
        leftChar: "april", rightChar: "ovalina", leftMood: "combat", rightMood: "smug",
        speaker: "ovalina",
        text: "Ồ! Một đặc vụ CR 500 mà kìm chân được cả Ragnaroir sao? Đáng gờm đấy! Nhưng cuộc chơi ở đây dừng lại thôi — đưa Meralina về tầng sâu!",
        effects: (g) => { g.addRes("sylvarian", "research", 150); g.addAffinity("ovalina", 10); },
        end: {
          title: "Hoàn thành Chương II — Chiến Công Bất Ngờ",
          summary: "Bạn đã chứng minh thực lực trước Ragnaroir và rút lui an toàn với dữ liệu sinh học quý giá.",
          unlocks: "ch3_konstantine"
        }
      },
      ch2_lost_ragnaroir: {
        sector: "sol",
        leftChar: "april", rightChar: "ragnaroir", leftMood: "tense", rightMood: "combat",
        speaker: "april",
        text: "Khốn thật... tốc độ của con quái thú này vượt xa dự liệu! Phải rút khỏi tầng hang ngầm ngay trước khi Ovalina can thiệp!",
        effects: (g) => { g.addStability("sol", -8); },
        end: {
          title: "Hoàn thành Chương II — Rút Lui Trong Gang Tấc",
          summary: "April thoát khỏi Pherone Nexus với thương tích nhẹ và báo cáo khẩn về mức độ nguy hiểm của Ragnaroir.",
          unlocks: "ch3_konstantine"
        }
      }
    }
  },

  // --------------------------------------------------------------------------
  // CHƯƠNG III: NGAI PHA LÊ KONSTANTINE & LỬA PRUSSIREICH
  // --------------------------------------------------------------------------
  {
    id: "ch3_konstantine",
    num: "CHƯƠNG III",
    title: "Pha Lê Konstantine & Ngọn Lửa Nội Bộ",
    subtitle: "Reichkomos Hinatiene → Lõi Công Nghiệp Berlidona",
    sector: "hinatiene",
    leadChar: "malocri",
    summary: "Tại thành phố pha lê phát quang Konstantine, Malocri cưới cả Nữ hoàng July Arum lẫn Công chúa Jorduyn để tự xưng Hoàng đế Hinatian — cùng lúc Carnavex và Yulina kéo căng bàn cờ nội bộ Sylvarian.",
    nodes: {
      start: {
        sector: "hinatiene",
        leftChar: "malocri", rightChar: "july", leftMood: "smug", rightMood: "neutral",
        speaker: "narrator",
        text: "Thành phố Konstantine rực rỡ trong ánh sáng sinh học của rừng pha lê. Reichkomos Hinatiene là khu vực trung thành và có năng suất kinh tế cao nhất Đế chế — nhưng hôm nay, điện thờ chính đang chứng kiến một nước cờ táo bạo.",
        next: "ch3_2"
      },
      ch3_2: {
        sector: "hinatiene",
        leftChar: "malocri", rightChar: "july", leftMood: "happy", rightMood: "smug",
        speaker: "july",
        text: "Malocri, ta và Jorduyn đều hiểu rõ tham vọng thực sự của chàng: dùng cuộc hôn nhân này để hợp thức hóa ngai vàng Hoàng đế Hinatian, thoát khỏi cái bóng của nhà Grok.",
        next: "ch3_3"
      },
      ch3_3: {
        sector: "hinatiene",
        leftChar: "malocri", rightChar: "jorduyn", leftMood: "secret", rightMood: "happy",
        speaker: "malocri",
        text: "Ta mang dòng máu lai Sylvarian–Hinatian, nhưng niềm tin của ta đặt vào Astraum và một đế chế mới tại đây. Vấn đề duy nhất là Arisia không bao giờ chịu để yên một hoàng đế tự xưng bên trong vùng ảnh hưởng của mình.",
        next: "ch3_4"
      },
      ch3_4: {
        sector: "berlidona",
        leftChar: "yulina", rightChar: "veidos", leftMood: "tense", rightMood: "combat",
        speaker: "narrator",
        text: "Cùng thời điểm tại Berlidona, Phó chỉ huy Yulina Claudius (phe Reformists) và Chỉ huy Veidos Caranter — em trai bị đày ải của Meralina — đang đối đầu nhau về cách xử lý các cuộc bạo loạn ở Prussireich.",
        next: "ch3_5"
      },
      ch3_5: {
        sector: "berlidona",
        leftChar: "yulina", rightChar: "veidos", leftMood: "neutral", rightMood: "tense",
        speaker: "veidos",
        text: "Yulina, cô biết rõ ta thích cô. Nhưng Carnavex đang giật dây đám bạo loạn Prussireich để tích lũy quyền lực chính trị. Nếu không dùng bàn tay sắt dập tắt ngay, chính Arisia sẽ ra tay trước — và lúc đó chẳng ai còn đường lùi.",
        choices: [
          {
            label: "💎 Ủng hộ Malocri củng cố Konstantine, chuẩn bị đối trọng với triều Grok",
            hint: "Hinatiene +15 Ổn định, Malocri & July +15 Hảo cảm, Arisia cảnh giác (+10 Căng thẳng)",
            effects: (g) => {
              g.addStability("hinatiene", 15);
              g.addAffinity("malocri", 18);
              g.addAffinity("july", 15);
              g.addTension(10);
              g.setFlag("backed_malocri", true);
            },
            next: "ch3_malocri_path"
          },
          {
            label: "🔥 Đột kích bắt giữ Amily Malicious — kẻ phản bội Hinatian tại Konstantine",
            hint: "Đấu Thẻ Bài (Malocri vs Amily Malicious) • Thắng sẽ ổn định hậu phương",
            battle: {
              playerId: "malocri",
              enemyId: "amily",
              stageId: "hinatiene",
              winNext: "ch3_amily_win",
              loseNext: "ch3_amily_lose"
            }
          },
          {
            label: "⚖️ Đứng về phía Yulina & Veidos, kiềm chế tham vọng của Carnavex tại Berlidona",
            hint: "Ổn định Berlidona & Prussireich • Tín dụng +500",
            effects: (g) => {
              g.addStability("prussireich", 15);
              g.addStability("berlidona", 12);
              g.addRes("sylvarian", "credits", 500);
              g.addAffinity("yulina", 15);
              g.addAffinity("veidos", 15);
            },
            next: "ch3_berlidona_path"
          }
        ]
      },
      ch3_malocri_path: {
        sector: "hinatiene",
        leftChar: "malocri", rightChar: "arisia", leftMood: "smug", rightMood: "angry",
        speaker: "arisia",
        text: "(Thông điệp từ Kronea) Hãy tận hưởng chiếc ngai pha lê đó đi, Malocri. Sau khi giải quyết xong vấn đề biên giới, ta nhất định sẽ gửi lời hỏi thăm thích đáng tới Konstantine.",
        end: {
          title: "Hoàn thành Chương III — Hoàng Đế Pha Lê",
          summary: "Malocri nắm chắc Reichkomos Hinatiene, nhưng tên ông đã nằm trong danh sách dài hạn của Nữ hoàng Arisia.",
          unlocks: "ch4_two_banners"
        }
      },
      ch3_amily_win: {
        sector: "hinatiene",
        leftChar: "malocri", rightChar: "amily", leftMood: "combat", rightMood: "tense",
        speaker: "malocri",
        text: "Power Burst của ngươi rất nhanh, Amily — nhưng vẫn chưa đủ để phá vỡ phòng tuyến pha lê Konstantine. Hãy nhớ ai mới là chủ nhân thực sự của nơi này.",
        effects: (g) => { g.addDefense("hinatiene", 20); g.addRes("sylvarian", "influence", 100); },
        end: {
          title: "Hoàn thành Chương III — Bảo Vệ Konstantine",
          summary: "Bạn đã trấn áp thành công mối đe dọa ngầm tại Konstantine và gia tăng phòng thủ cho vùng đất pha lê.",
          unlocks: "ch4_two_banners"
        }
      },
      ch3_amily_lose: {
        sector: "hinatiene",
        leftChar: "amily", rightChar: "malocri", leftMood: "smug", rightMood: "angry",
        speaker: "amily",
        text: "Đừng coi thường sát thủ máu xanh. Hẹn gặp lại khi triều Grok gõ cửa pha lê của ngươi, Hoàng đế tự xưng ạ.",
        effects: (g) => { g.addStability("hinatiene", -12); },
        end: {
          title: "Hoàn thành Chương III — Bóng Tối Trong Rừng Pha Lê",
          summary: "Amily trốn thoát sau màn chạm trán nảy lửa, để lại bất ổn âm ỉ tại Konstantine.",
          unlocks: "ch4_two_banners"
        }
      },
      ch3_berlidona_path: {
        sector: "berlidona",
        leftChar: "yulina", rightChar: "veidos", leftMood: "happy", rightMood: "neutral",
        speaker: "yulina",
        text: "Tạm thời ngăn được Carnavex châm lửa ở Prussireich. Nhưng cả ta và Veidos đều biết: một ngày nào đó, tư tưởng cải cách và mệnh lệnh đế chế sẽ buộc hai ta phải đối đầu.",
        end: {
          title: "Hoàn thành Chương III — Lửa Ngầm Berlidona",
          summary: "Berlidona và Prussireich tạm thời bình ổn trước âm mưu chính trị của Carnavex.",
          unlocks: "ch4_two_banners"
        }
      }
    }
  },

  // --------------------------------------------------------------------------
  // CHƯƠNG IV: CƠN THỊNH NỘ CỦA HAI NGỌN CỜ
  // --------------------------------------------------------------------------
  {
    id: "ch4_two_banners",
    num: "CHƯƠNG IV",
    title: "Cơn Thịnh Nộ Của Hai Ngọn Cờ",
    subtitle: "Thành trì Nadirius ↔ Thủ đô Zero (Hệ Prozon)",
    sector: "nadirius_citadel",
    leadChar: "magnatere",
    summary: "Hiệp ước Cursew khiến hai cựu đồng minh trong trận chiến hạ bệ Overlord — Magnatere của Đế chế Nadirius và Tướng Zarcseid của Salvic Union — đứng trước nguy cơ bị bao vây chiến lược.",
    nodes: {
      start: {
        sector: "nadirius_citadel",
        leftChar: "magnatere", rightChar: "hyouya", leftMood: "angry", rightMood: "tense",
        speaker: "narrator",
        text: "Thành trì Nadirius, Chiều không gian Nadir. Áo giáp hắc kim của Hoàng đế Magnatere rung lên từng hồi trầm đục. Hoàng hậu Hyouya Singularity đứng cạnh bên, đôi mắt tinh vân tím dõi theo bản đồ chiều không gian.",
        next: "ch4_2"
      },
      ch4_2: {
        sector: "nadirius_citadel",
        leftChar: "magnatere", rightChar: "hyouya", leftMood: "angry", rightMood: "neutral",
        speaker: "magnatere",
        text: "Ta, Kelvos và Liên bang Prozonian đã trả giá bằng cả cuộc đại chiến để hạ gục Overlord! Hiệp ước Uni sinh ra là để nhốt tên điên đó mãi mãi. Vậy mà giờ Arisia lại trao cho hắn thứ hắn thèm khát nhất: tính chính danh!",
        next: "ch4_3"
      },
      ch4_3: {
        sector: "prozon",
        leftChar: "zarcseid", rightChar: "sofie", leftMood: "tense", rightMood: "angry",
        speaker: "sofie",
        text: "Thủ đô Zero vừa tái thiết xong từ đống tro tàn chiếm đóng. Độc lập của Salvic Union mỏng manh như lưỡi dao — nếu Sylvarian và Western Nadir ngừng đánh nhau, chúng ta sẽ là mục tiêu tiếp theo bị xâu xé!",
        next: "ch4_4"
      },
      ch4_4: {
        sector: "prozon",
        leftChar: "zarcseid", rightChar: "elita", leftMood: "combat", rightMood: "tense",
        speaker: "elita",
        text: "Không chỉ Sylvarian đâu, Tướng quân! Từ hướng Tây, tên thần Nadir một mắt Cipheron đang rình rập biên giới và liên tục gửi sóng tâm linh quấy nhiễu đội hình của chúng ta.",
        choices: [
          {
            label: "🤝 Kết nối Liên minh Phòng thủ Nadirius – Salvic Union",
            hint: "Quan hệ Nadirius ↔ Salvic +30 • Zero & Nadirius +20 Phòng thủ",
            effects: (g) => {
              g.addRelation("nadirius", "salvic", 30);
              g.addDefense("prozon", 20);
              g.addDefense("nadirius_citadel", 20);
              g.addAffinity("magnatere", 15);
              g.addAffinity("zarcseid", 15);
              g.setFlag("nadirius_salvic_axis", true);
            },
            next: "ch4_alliance"
          },
          {
            label: "⚔️ Tướng Zarcseid xuất kích chặn đứng Cipheron bảo vệ Elita",
            hint: "Đấu Thẻ Bài (Zarcseid Copilus CR 850 vs Cipheron CR 590)",
            battle: {
              playerId: "zarcseid",
              enemyId: "cipheron",
              stageId: "prozon",
              winNext: "ch4_cipheron_win",
              loseNext: "ch4_cipheron_lose"
            }
          },
          {
            label: "🛡️ Củng cố tuyến phòng thủ huyền thoại tại Predita & Zero",
            hint: "Predita & Prozon +25 Phòng thủ, Research +150",
            effects: (g) => {
              g.addDefense("predita", 25);
              g.addDefense("prozon", 25);
              g.addRes("salvic", "research", 150);
            },
            next: "ch4_fortify"
          }
        ]
      },
      ch4_alliance: {
        sector: "prozon",
        leftChar: "magnatere", rightChar: "zarcseid", leftMood: "combat", rightMood: "combat",
        speaker: "zarcseid",
        text: "Hyouya là cầu nối giữa máu Prozonian và sức mạnh Nadirius. Từ hôm nay, bất kỳ hạm đội nào vượt biên giới Zero hay Nadirius đều sẽ nếm trải lại cơn ác mộng mang tên Phép màu Predita!",
        end: {
          title: "Hoàn thành Chương IV — Trục Phòng Thủ Hai Ngọn Cờ",
          summary: "Magnatere và Zarcseid thiết lập mặt trận chung đối trọng với Hiệp ước Cursew.",
          unlocks: "ch5_earth"
        }
      },
      ch4_cipheron_win: {
        sector: "prozon",
        leftChar: "zarcseid", rightChar: "elita", leftMood: "smug", rightMood: "happy",
        speaker: "elita",
        text: "Khả năng giảm 80% sát thương nguyền của người Prozonian đã vô hiệu hóa hoàn toàn ảo giác của Cipheron! Biên giới Zero đã được giữ vững.",
        effects: (g) => { g.addRes("salvic", "influence", 120); g.addAffinity("elita", 20); },
        end: {
          title: "Hoàn thành Chương IV — Chiến Thắng Trên Băng Giá",
          summary: "Cipheron bị đánh bật khỏi hệ Prozon. Uy tín của Salvic Union vang xa.",
          unlocks: "ch5_earth"
        }
      },
      ch4_cipheron_lose: {
        sector: "prozon",
        leftChar: "cipheron", rightChar: "elita", leftMood: "smug", rightMood: "tense",
        speaker: "cipheron",
        text: "Đừng vội, sĩ quan Elita... Hôm nay ta rút trước áp lực phòng tuyến của Prozon, nhưng ánh mắt của Nadir vẫn đang dõi theo cô.",
        effects: (g) => { g.addStability("prozon", -10); },
        end: {
          title: "Hoàn thành Chương IV — Lời Đe Dọa Từ Nadir",
          summary: "Quân Prozon đẩy lùi được cuộc tập kích nhưng chịu tổn thất về tinh thần.",
          unlocks: "ch5_earth"
        }
      },
      ch4_fortify: {
        sector: "predita",
        leftChar: "zarcseid", rightChar: "sofie", leftMood: "neutral", rightMood: "happy",
        speaker: "sofie",
        text: "500 triệu tàn quân năm xưa còn giữ được Predita 10 năm trước vòng vây Sylvarian — nay với đầy đủ hạm đội Ishizeum–Akizium, Salvic Union không dễ bị khuất phục đâu!",
        end: {
          title: "Hoàn thành Chương IV — Pháo Đài Băng Giá",
          summary: "Hệ Prozon và Predita đạt mức phòng thủ tối đa trước bão tố sắp ập đến.",
          unlocks: "ch5_earth"
        }
      }
    }
  },

  // --------------------------------------------------------------------------
  // CHƯƠNG V: BẦU TRỜI TRÁI ĐẤT — POWER HALL & GLOBAL ICON
  // --------------------------------------------------------------------------
  {
    id: "ch5_earth",
    num: "CHƯƠNG V",
    title: "Bầu Trời Chạng Vạng: Trái Đất Trong Cơn Bão",
    subtitle: "Evernight • Global Icon • Tokyzhou • Vander",
    sector: "sol",
    leadChar: "felicia",
    summary: "Dưới mái vòm chạng vạng của Evernight và sóng truyền hình trực tiếp của Global Icon, The Supers đối đầu với âm mưu của The Collectors, trong khi bí mật về đặc vụ ngầm Jokar và tập đoàn Future Corp dần lộ sáng.",
    nodes: {
      start: {
        sector: "sol",
        leftChar: "felicia", rightChar: "sarah", leftMood: "tense", rightMood: "combat",
        speaker: "narrator",
        text: "Power Hall, Evernight. Dưới mái vòm chạng vạng biến đổi khí quyển giống Sylvalon, chuông báo động réo vang. Nhóm phản diện The Collectors của Mr. Mind lại phát động đợt săn lùng mới dọc khu Vander.",
        next: "ch5_2"
      },
      ch5_2: {
        sector: "sol",
        leftChar: "sarah", rightChar: "hailey", leftMood: "combat", rightMood: "tense",
        speaker: "sarah",
        text: "Dữ liệu vệ tinh từ The Sphere xác nhận: Parasoid và Eremite đang tiến vào khu dân cư. Hailey, giữ khoảng cách bắn tỉa bằng khẩu Absolute Zero. Lần này ta mang theo lựu đạn lượng tử có thể phá cả Tamarisium.",
        next: "ch5_3"
      },
      ch5_3: {
        sector: "sol",
        leftChar: "mina", rightChar: "jokar", leftMood: "secret", rightMood: "happy",
        speaker: "narrator",
        text: "Cách đó nửa vòng Trái Đất trên đảo nổi Global Icon, nhóm Super Reporter Girls đang phát sóng trực tiếp không kiểm duyệt. Nhà báo Mina Lascivana khẽ mỉm cười nhìn cổ đông lớn 'Jack Frozen' — người chồng thực chất là sĩ quan tình báo Prozonian Jokar Seid.",
        next: "ch5_4"
      },
      ch5_4: {
        sector: "sol",
        leftChar: "bill", rightChar: "inga", leftMood: "tense", rightMood: "secret",
        speaker: "bill",
        text: "(Tại phòng thí nghiệm Tokyzhou) Inga, cô là vệ sĩ của nhà Greedle, nhưng tại sao cứ mỗi lần cô rời phòng nghỉ, máy quét sinh học lại báo nhiễu dấu vết Wombiote? Đừng tưởng cái trò che mắt của Sentrion qua được IQ 180 này.",
        choices: [
          {
            label: "⚔️ Xuất kích cùng The Supers đánh chặn Parasoid của The Collectors!",
            hint: "Đấu Thẻ Bài (Felicia Laurent CR 350 vs Parasoid CR 550) • Thắng sẽ cứu Trái Đất",
            battle: {
              playerId: "felicia",
              enemyId: "parasoid",
              stageId: "sol",
              winNext: "ch5_win_collectors",
              loseNext: "ch5_lose_collectors"
            }
          },
          {
            label: "📡 Phối hợp với Global Icon & Jokar để vạch trần đường dây chợ đen của Jose Santos",
            hint: "Hệ Mặt Trời +15 Ổn định, Ảnh hưởng +100, Hảo cảm Mina & Jokar +15",
            effects: (g) => {
              g.addStability("sol", 15);
              g.addRes("sylvarian", "influence", 100);
              g.addRes("salvic", "credits", 400);
              g.addAffinity("mina", 15);
              g.addAffinity("jokar", 15);
            },
            next: "ch5_expose_cartel"
          },
          {
            label: "🧪 Hợp tác bí mật với Bill Greedle nâng cấp Serum Pregnomorph cho phòng tuyến",
            hint: "Research +200, Phòng thủ Hệ Mặt Trời +15",
            effects: (g) => {
              g.addRes("sylvarian", "research", 200);
              g.addDefense("sol", 15);
              g.addAffinity("bill", 15);
              g.addAffinity("trang", 12);
            },
            next: "ch5_future_corp"
          }
        ]
      },
      ch5_win_collectors: {
        sector: "sol",
        leftChar: "felicia", rightChar: "sarah", leftMood: "happy", rightMood: "smug",
        speaker: "felicia",
        text: "AI Bernice đã tính toán chuẩn xác ngưỡng quá tải của Parasoid! Không để hắn hấp thụ thêm CR, The Supers đã đẩy lùi The Collectors khỏi Evernight!",
        effects: (g) => { g.addStability("sol", 18); g.addRes("sylvarian", "credits", 500); g.addAffinity("felicia", 20); },
        end: {
          title: "Hoàn thành Chương V — Người Bảo Vệ Evernight",
          summary: "The Supers đập tan cuộc đột kích của Mr. Mind và bảo toàn đặc khu Trái Đất.",
          unlocks: "ch6_eris_verdict"
        }
      },
      ch5_lose_collectors: {
        sector: "sol",
        leftChar: "sarah", rightChar: "mrmind", leftMood: "tense", rightMood: "smug",
        speaker: "sarah",
        text: "Chết tiệt, tia Prionite và đòn ngưng thời gian của Mr. Mind làm chậm đội hình! May mà Phó Chỉ huy Mary và Etharos Gemini kịp tiếp viện đẩy chúng lui về Vander.",
        effects: (g) => { g.addStability("sol", -10); },
        end: {
          title: "Hoàn thành Chương V — Đêm Dài Trên Đặc Khu",
          summary: "Cuộc đột kích tạm bị chặn lại nhờ sự can thiệp của Earth Overlord Etharos.",
          unlocks: "ch6_eris_verdict"
        }
      },
      ch5_expose_cartel: {
        sector: "sol",
        leftChar: "mina", rightChar: "evelina", leftMood: "smug", rightMood: "happy",
        speaker: "evelina",
        text: "Tin chấn động phát sóng trực tiếp từ Global Icon! Ngay cả Earth Overlord Etharos và Tổng thống Eleanor cũng phải ra lệnh phong tỏa mạng lưới ngầm ở Vander.",
        end: {
          title: "Hoàn thành Chương V — Sóng Trực Tiếp Không Kiểm Duyệt",
          summary: "Quyền lực mềm của Global Icon xoay chuyển cục diện chính trị tại Hệ Mặt Trời.",
          unlocks: "ch6_eris_verdict"
        }
      },
      ch5_future_corp: {
        sector: "sol",
        leftChar: "bill", rightChar: "trang", leftMood: "smug", rightMood: "happy",
        speaker: "trang",
        text: "Dữ liệu Serum II và Overmoon giúp các đơn vị tuần tra trên Trái Đất tăng mạnh khả năng sinh tồn trước mọi biến cố ngoại lai.",
        end: {
          title: "Hoàn thành Chương V — Nâng Cấp Di Truyền",
          summary: "Future Corp củng cố sức mạnh công nghệ sinh học cho phòng tuyến Trái Đất.",
          unlocks: "ch6_eris_verdict"
        }
      }
    }
  },

  // --------------------------------------------------------------------------
  // CHƯƠNG VI: TRẦN NHÀ VŨ TRỤ — PHÁN QUYẾT CỦA ERIS UNION
  // --------------------------------------------------------------------------
  {
    id: "ch6_eris_verdict",
    num: "CHƯƠNG VI",
    title: "Trần Nhà Vũ Trụ: Phán Quyết Tại Outer Layer",
    subtitle: "Vùng Trung Tâm Vũ Trụ → Cổng Đa Vũ Trụ",
    sector: "eris_core",
    leadChar: "emma",
    summary: "Tại trung tâm vũ trụ bất khả xâm phạm, Đại sứ Emma Illumis, Uterussa và quỷ chiều không gian Hoornyxr đánh giá xem dòng thời gian Hậu Reset có đang trượt về thảm kịch cũ hay không.",
    nodes: {
      start: {
        sector: "eris_core",
        leftChar: "emma", rightChar: "uterussa", leftMood: "secret", rightMood: "happy",
        speaker: "narrator",
        text: "Trung tâm Vũ trụ — vùng không gian 15% bất khả xâm phạm của Eris Union. Những vòng tròn lượng tử khổng lồ xoay quanh Cổng Đa Vũ Trụ ở Outer Layer.",
        next: "ch6_2"
      },
      ch6_2: {
        sector: "eris_core",
        leftChar: "emma", rightChar: "uterussa", leftMood: "tense", rightMood: "neutral",
        speaker: "emma",
        text: "Chúng ta đã quay ngược dòng thời gian trước cả cuộc tấn công đầu tiên vào Sylvarian của Karion, nhường lại vũ trụ bên ngoài để tránh vòng lặp toàn cầu quay lưng với Eris Union. Nhưng nhìn xem — Căng thẳng hiện tại đang ở mức " + "{{TENSION}}/100.",
        next: "ch6_3"
      },
      ch6_3: {
        sector: "outer_layer",
        leftChar: "emma", rightChar: "hoornyxr", leftMood: "neutral", rightMood: "smug",
        speaker: "hoornyxr",
        text: "Haha! Ở chiều không gian ω+1 của ta, mấy trò bẻ logic và hiệp ước Molotov–Cursew kia trông hài hước thật đấy. Ngay cả đám Tamarite như Ovalina hay cô em Uterussa đây cũng chỉ đứng nhìn xem bọn họ tự xoay xở thế nào thôi!",
        next: "ch6_4"
      },
      ch6_4: {
        sector: "outer_layer",
        leftChar: "emma", rightChar: "arisia", leftMood: "secret", rightMood: "tense",
        speaker: "emma",
        text: (g) => {
          if (g.tension >= 75) {
            return "Mức căng thẳng đã vượt ngưỡng đỏ (" + g.tension + "/100). Nếu không có biện pháp kiềm chế, đại chiến toàn thiên hà như thời Tiền Reset sẽ bùng nổ bất cứ lúc nào.";
          }
          if (!g.pact.active) {
            return "Hiệp ước Cursew đã tan vỡ, nhưng ít nhất các phe không còn bị trói vào một thỏa thuận giả tạo. Sự cân bằng đa cực vẫn còn cơ hội tồn tại.";
          }
          return "Hiệp ước Cursew vẫn đang níu giữ khoảng lặng mong manh. Chúng ta có một lựa chọn mang tính định mệnh ngay lúc này.";
        },
        choices: [
          {
            label: "🔒 Kích hoạt Phong Ấn Chaos điều tiết các điểm nóng biên giới",
            hint: "Căng thẳng -25 • Eris Union giữ vai trò trọng tài tối cao",
            effects: (g) => {
              g.addTension(-25);
              g.addRes("eris", "influence", 200);
              g.setFlag("ending_pax_erisia", true);
            },
            next: "ch6_ending_order"
          },
          {
            label: "⚔️ Thử thách trực diện: Đấu giao hữu với Đại sứ Emma Illumis (CR 1200)",
            hint: "Đấu Thẻ Bài tại Outer Layer (Tướng bạn chọn vs Emma CR 1200)",
            battle: {
              playerId: "arisia",
              enemyId: "emma",
              stageId: "outer_layer",
              winNext: "ch6_emma_win",
              loseNext: "ch6_emma_lose"
            }
          },
          {
            label: "🌌 Mở khóa tầm nhìn Đa Vũ Trụ, trao quyền tự quyết cho các cường quốc Cycle 12",
            hint: "Kết mở: Kỷ nguyên Tự Do & Hỗn Chiến Đa Cực",
            effects: (g) => {
              g.addRes("eris", "research", 300);
              g.setFlag("ending_multipolar", true);
            },
            next: "ch6_ending_free"
          }
        ]
      },
      ch6_ending_order: {
        sector: "eris_core",
        leftChar: "emma", rightChar: "uterussa", leftMood: "happy", rightMood: "happy",
        speaker: "emma",
        text: "Dòng thời gian Hậu Reset đã vượt qua bài kiểm tra khắc nghiệt nhất. Eris Union sẽ tiếp tục giữ vững trần nhà của vũ trụ — lặng lẽ, nhưng không thể lay chuyển.",
        end: {
          title: "KẾT THÚC A: TRẬT TỰ HẬU RESET (PAX ERISIA)",
          summary: "Bạn đã kiềm chế thành công ngọn lửa đại chiến và bảo vệ sự ổn định của Cycle 12."
        }
      },
      ch6_emma_win: {
        sector: "outer_layer",
        leftChar: "arisia", rightChar: "emma", leftMood: "smug", rightMood: "happy",
        speaker: "emma",
        text: "Không ngờ một thực thể ngoài Eris Union lại chạm tới ngưỡng có thể phá vỡ giáp công nghệ của ta! Có lẽ dòng thời gian này thực sự đáng để chúng ta đặt niềm tin, Nữ hoàng Arisia.",
        effects: (g) => { g.addRes("sylvarian", "influence", 300); g.addTension(-15); },
        end: {
          title: "KẾT THÚC B: ĐỈNH CAO QUYỀN LỰC MỚI",
          summary: "Chiến thắng trước Đại sứ Eris mở ra kỷ nguyên mà các cường quốc Gaiastra ngang hàng với những người kiến tạo thế giới."
        }
      },
      ch6_emma_lose: {
        sector: "outer_layer",
        leftChar: "emma", rightChar: "arisia", leftMood: "neutral", rightMood: "tense",
        speaker: "emma",
        text: "Sức mạnh của bạn rất đáng nể, nhưng trần nhà của vũ trụ vẫn nằm ở đây vì một lý do. Hãy dùng trí tuệ thay vì chỉ nắm đấm, và đừng để vũ trụ phải Reset thêm một lần nữa.",
        end: {
          title: "KẾT THÚC C: BÀI HỌC TỪ NGƯỜI QUAN SÁT",
          summary: "Eris Union khẳng định vị thế bất khả xâm phạm. Bạn tiếp tục ván cờ chiến lược trên sa bàn 3D."
        }
      },
      ch6_ending_free: {
        sector: "outer_layer",
        leftChar: "emma", rightChar: "hoornyxr", leftMood: "smug", rightMood: "happy",
        speaker: "narrator",
        text: "Cổng Đa Vũ Trụ khẽ rung lên trong sắc vàng hoàng kim. Giống như Kelvos và Diana tại Wonder Island, hay Virile và Sabrina ngoài rìa thực tại, câu chuyện đa cực của Gaiastra bước sang hai chương hồi kết kịch tính nhất phía trước!",
        end: {
          title: "HOÀN TẤT CHƯƠNG VI: CHÂN TRỜI ĐA CỰC",
          summary: "Mở đường sang Chương VII (Đêm Evernight) và Chương VIII (Đại Kết Cục Gaiastra)!"
        }
      }
    }
  },

  // =========================================================================
  // CHƯƠNG VII: ĐÊM EVERNIGHT — THE SUPERS VS THE COLLECTORS
  // =========================================================================
  {
    id: "ch7_evernight_hunt",
    num: "CHƯƠNG VII",
    title: "Đêm Evernight: Thợ Săn & Anh Hùng",
    subtitle: "Hệ Mặt Trời (Evernight / Tokyzhou / Vander)",
    sector: "sol",
    leadChar: "felicia",
    summary: "Tại Trái Đất, Mr. Mind tung Parasoid, Eremite và Kale Vayne săn lùng các siêu nhân trong lúc Tập đoàn Future Corp của Bill Greedle che giấu bí mật Serum Pregnomorph & Vua Wombiote Sentrion.",
    nodes: {
      start: {
        sector: "sol",
        leftChar: "felicia", rightChar: "sarah", leftMood: "tense", rightMood: "combat",
        speaker: "narrator",
        text: "Đêm mưa neon tại Evernight City. Trên mái tòa tháp Power Hall, AI chiến thuật Bernice phát tín hiệu báo động đỏ: mạng lưới của The Collectors vừa ngắt điện toàn khu Vander và triển khai lồng phong tỏa Thunderlock!",
        next: "ch7_2"
      },
      ch7_2: {
        sector: "sol",
        leftChar: "felicia", rightChar: "mrmind", leftMood: "angry", rightMood: "smug",
        speaker: "mrmind",
        text: "Chào các anh hùng 'hợp pháp' của Tổng thống Eleanor. Với thân Ultra Bot và Prionite, đêm nay Parasoid sẽ thu thập thêm mẫu gen Kryptonian-người và công nghệ Serum từ Trái Đất.",
        next: "ch7_3"
      },
      ch7_3: {
        sector: "sol",
        leftChar: "sarah", rightChar: "parasoid", leftMood: "combat", rightMood: "angry",
        speaker: "sarah",
        text: "Lựu đạn lượng tử và giáp xương ngoài đã nạp đầy, Felicia! Chunlina đang khóa đường rút ở phố dưới, Hailey canh từ cao ốc. Còn Bill Greedle ở Tokyzhou vẫn chưa chịu giao hồ sơ Sentrion.",
        choices: [
          {
            label: "⚔️ Trực tiếp xung phong đối đầu Parasoid bằng Bộ Bài Chiến Thuật",
            hint: "Đấu Thẻ Bài (Felicia CR 350 vs Parasoid CR 550) • Phá vỡ mũi nhọn của Collectors",
            battle: {
              playerId: "felicia",
              enemyId: "parasoid",
              stageId: "sol",
              winNext: "ch7_win_collectors",
              loseNext: "ch7_lose_collectors"
            }
          },
          {
            label: "🧪 Đột kích Future Corp tại Tokyzhou buộc Bill Greedle hợp tác",
            hint: "Vào kho dữ liệu Serum Pregnomorph • +300 Research, mở bí mật Inga & Sentrion",
            effects: (g) => {
              g.addRes(g.playerFaction, "research", 300);
              g.addAffinity("bill", 10);
              g.addAffinity("trang", 12);
              g.setFlag("ch7_future_corp_raid", true);
            },
            next: "ch7_future_corp"
          },
          {
            label: "📡 Phối hợp Super Reporter Girls phát sóng vạch trần Collectors",
            hint: "Emily, Mina & Evelina công bố tội ác • +120 Ảnh hưởng, Trái Đất ổn định +15%",
            effects: (g) => {
              g.addRes(g.playerFaction, "influence", 120);
              g.addStability("sol", 15);
              g.addAffinity("emily", 15);
              g.addAffinity("sarah", 12);
              g.setFlag("ch7_media_expose", true);
            },
            next: "ch7_media_victory"
          }
        ]
      },
      ch7_win_collectors: {
        sector: "sol",
        leftChar: "felicia", rightChar: "eleanor", leftMood: "happy", rightMood: "smug",
        speaker: "felicia",
        text: "Bernice tính toán chuẩn xác — Parasoid đã bị vô hiệu hóa trước khi quá tải! Ngay cả Earth Overlord Etharos và Chunlina cũng phải nể phục sức mạnh đoàn kết của The Supers.",
        effects: (g) => {
          g.addAffinity("felicia", 20);
          g.addDefense("sol", 25);
          g.addRes(g.playerFaction, "credits", 500);
        },
        end: {
          title: "CHIẾN THẮNG ĐÊM EVERNIGHT",
          summary: "The Collectors rút chạy về Vander! Hệ Mặt Trời +25 Phòng thủ, +500 Credits."
        }
      },
      ch7_lose_collectors: {
        sector: "sol",
        leftChar: "sarah", rightChar: "mrmind", leftMood: "tense", rightMood: "smug",
        speaker: "sarah",
        text: "Lựu đạn lượng tử kịp cắt đứt dây trói từ lồng Thunderlock của Eremite! The Supers buộc phải lui quân bảo toàn lực lượng, nhưng cuộc phản công chỉ mới bắt đầu.",
        effects: (g) => {
          g.addStability("sol", -10);
          g.addAffinity("sarah", 10);
        },
        end: {
          title: "RÚT LUI CHIẾN THUẬT TẠI EVERNIGHT",
          summary: "The Collectors kiểm soát thêm khu ngầm Vander. Bạn có thể củng cố Sol trên bản đồ 3D."
        }
      },
      ch7_future_corp: {
        sector: "sol",
        leftChar: "bill", rightChar: "trang", leftMood: "secret", rightMood: "tense",
        speaker: "bill",
        text: "Thôi được! Ta trao dữ liệu giải mã gen Serum I–III để cứu Trái Đất khỏi Eremite. Nhưng nhớ giữ bí mật — Inga và Vua Wombiote Sentrion còn nguy hiểm hơn cả Mr. Mind nhiều.",
        end: {
          title: "BÍ MẬT FUTURE CORP ĐƯỢC HÉ LỘ",
          summary: "+300 Nghiên cứu & mở khóa quan hệ với Bill Greedle và Trang Greedle-Le."
        }
      },
      ch7_media_victory: {
        sector: "sol",
        leftChar: "emily", rightChar: "evelina", leftMood: "happy", rightMood: "happy",
        speaker: "emily",
        text: "Đây là Emily Violet cùng String, phát sóng trực tiếp từ Global Icon! Toàn bộ phòng thí nghiệm phi pháp của Exorotic và Mr. Mind tại Vander vừa bị phong tỏa hoàn toàn!",
        end: {
          title: "TIẾNG NÓI KHÔNG KIỂM DUYỆT",
          summary: "Global Icon giúp Trái Đất bình ổn (+15%) và tăng 120 Ảnh hưởng phe bạn."
        }
      }
    }
  },

  // =========================================================================
  // CHƯƠNG VIII: ĐẠI KẾT CỤC GAIASTRA (ĐA NGÃ RẼ THEO TRẠNG THÁI VŨ TRỤ)
  // =========================================================================
  {
    id: "ch8_gaiastra_endgame",
    num: "CHƯƠNG VIII",
    title: "Đại Kết Cục Gaiastra: Ngai Vàng & Vực Thẳm",
    subtitle: "Hội nghị Toàn Vũ trụ — Kronea / Thành lũy Nadirius / Zero",
    sector: "eris_core",
    leadChar: "arisia",
    summary: "Thời khắc định đoạt kỷ nguyên Cycle 12 đã điểm! Dựa vào Hiệp ước Cursew, tỷ lệ lãnh thổ và các đồng minh bạn đã gây dựng, hãy viết nên cái kết cho toàn bộ thiên hà Gaiastra.",
    nodes: {
      start: {
        sector: "eris_core",
        leftChar: "arisia", rightChar: "emma", leftMood: "tense", rightMood: "secret",
        speaker: "narrator",
        text: (g) => {
          const dom = g.getFactionTerritoryPct(g.playerFaction);
          const pactTxt = g.pact.active ? "Hiệp ước Cursew vẫn đang níu giữ hòa bình mong manh" : "Hiệp ước Cursew đã sụp đổ trong khói lửa";
          return `Chu kỳ ${g.cycleMajor}.${g.cycleMinor}. ${g.facName(g.playerFaction)} đang nắm ${dom}% ngân hà với căng thẳng ${Math.round(g.tension)}%. ${pactTxt}. Mọi cường quốc đều hướng về Phái bộ Eris ở trung tâm vũ trụ cho bước ngoặt cuối cùng.`;
        },
        next: "ch8_council"
      },
      ch8_council: {
        sector: "eris_core",
        leftChar: "magnatere", rightChar: "zarcseid", leftMood: "angry", rightMood: "tense",
        speaker: "magnatere",
        text: "Không còn đường lùi! Nadirius đòi câu trả lời dứt khoát từ Sylvarian và Overlord. Salvic Union cũng sẵn sàng quyết tử để bảo vệ thế cân bằng của Liên bang Prozonian.",
        choices: [
          {
            label: "👑 Khẳng định Bá quyền Tối thượng (Đánh trận Chung kết 3D)",
            hint: "Arisia Grok vs Overlord tại Trung tâm Vũ trụ • Thắng sẽ lập Kỷ Nguyên Thiết Trật",
            battle: {
              playerId: "arisia",
              enemyId: "overlord",
              stageId: "eris_core",
              winNext: "ch8_end_imperial",
              loseNext: "ch8_end_abyss"
            }
          },
          {
            label: "🕊️ Liên minh Bốn Cực: Chấm dứt Chiến tranh Lạnh (Điều kiện: Pact đang mở hoặc Quan hệ Nadirius ≥ 0)",
            hint: "Cân bằng Sylvarian • Salvic • Nadirius • Eris Union — Tránh được Reset lần 2",
            cond: (g) => g.getRelation("sylvarian", "nadirius") >= -30 || g.pact.active,
            effects: (g) => {
              g.addTension(-35);
              g.addRes(g.playerFaction, "influence", 250);
              g.setFlag("ch8_peace_accord", true);
            },
            next: "ch8_end_harmony"
          },
          {
            label: "👁️ Gặp gỡ Ovalina & Emma: Thức tỉnh Phán Quyết Tamarite",
            hint: "Bí mật đa vũ trụ • Phá vỡ vòng lặp Cycle bằng sức mạnh vượt chuẩn",
            effects: (g) => {
              g.addRes(g.playerFaction, "research", 500);
              g.addAffinity("ovalina", 20);
              g.addAffinity("emma", 20);
            },
            next: "ch8_end_transcend"
          }
        ]
      },
      ch8_end_imperial: {
        sector: "sylvalon",
        leftChar: "arisia", rightChar: "ojamon", leftMood: "smug", rightMood: "happy",
        speaker: "arisia",
        text: "Ánh sáng Gotterfall soi rọi từ Kronea tới Outer Layer. Từ giây phút này, Gaiastra không còn những bản hiệp ước tạm bợ — chỉ còn một trật tự tối thượng duy nhất!",
        end: {
          title: "KẾT CỤC I: ĐẾ CHẾ VĨNH HẰNG (IMPERIAL FINALE)",
          summary: "Bạn đã hoàn thành toàn bộ 8 chương và thống nhất quyền uy tối cao của Kỷ nguyên Cycle 12!"
        }
      },
      ch8_end_abyss: {
        sector: "western_march",
        leftChar: "overlord", rightChar: "tsunadia", leftMood: "smug", rightMood: "happy",
        speaker: "overlord",
        text: "Ha ha ha! Kỷ nguyên của các vị hoàng đế tự xưng kết thúc rồi! Western Nadir tràn qua từng vết nứt thực tại — và Gaiastra sẽ biết thế nào là tự do của Vực Thẳm!",
        end: {
          title: "KẾT CỤC II: THỦY TRIỀU VỰC THẲM (ABYSS FINALE)",
          summary: "Western Nadir phá vỡ mọi giới tuyến! Bạn vẫn có thể tiếp tục tái chiếm các hệ sao trên bản đồ 3D."
        }
      },
      ch8_end_harmony: {
        sector: "predita",
        leftChar: "zarcseid", rightChar: "hyouya", leftMood: "happy", rightMood: "happy",
        speaker: "zarcseid",
        text: "Lần đầu tiên kể từ sau Uniwar, Zarcseid, Hyouya, Brigitte và Arisia ngồi cùng một bàn không vũ khí. Phép màu Predita giờ trở thành phép màu của cả Gaiastra.",
        end: {
          title: "KẾT CỤC III: HÒA ƯỚC ĐA CỰC (HARMONY FINALE)",
          summary: "Căng thẳng giảm -35%, các cường quốc giữ được hòa bình bền vững qua Cycle 12!"
        }
      },
      ch8_end_transcend: {
        sector: "outer_layer",
        leftChar: "ovalina", rightChar: "emma", leftMood: "happy", rightMood: "secret",
        speaker: "ovalina",
        text: "Thú vị thật đấy! Thay vì lặp lại vòng lặp Reset vô tận của Eris Union, chính bạn đã mở cánh cửa mới sang Đa Vũ Trụ cùng Tamarite!",
        end: {
          title: "KẾT CỤC IV: SIÊU VIỆT ĐA VŨ TRỤ",
          summary: "+500 Nghiên cứu • Khe Nứt Hư Không vừa hé mở phía Chương IX!",
          nextChapter: "ch9_void_reckoning"
        }
      }
    }
  },
  {
    id: "ch9_void_reckoning",
    num: "CHƯƠNG IX",
    title: "Khe Nứt Hư Không & Bản Giao Hưởng Huyết Thống",
    subtitle: "Vực Thẳm Western Nadir → Tamarix Orbit",
    sector: "western_abyss",
    leadChar: "__PROTAGONIST__",
    summary: "Dưới áp lực của Vòng Lặp Reset và các siêu vũ khí, một khe nứt thực tại bùng phát tại Vực Thẳm Tây. Nhân vật chính phải tập hợp đồng minh từ các chủng tộc đối nghịch — thậm chí dùng Hậu Duệ Lai Gen — để bịt kín cửa ngõ Hư Không.",
    nodes: {
      start: {
        sector: "western_abyss",
        leftChar: "__PROTAGONIST__", rightChar: "kyaria", leftMood: "combat", rightMood: "tense",
        speaker: "narrator",
        text: (g) => {
          const hero = g.getProtagonist();
          return `Biên giới Vực Thẳm Tây rạn nứt thành những đường tia chớp tím sẫm. ${hero.name} đứng trên đài chỉ huy cùng Kyaria Brigida — dòng Tamarite lai Nadir hiếm hoi đủ khả năng đo đạc chấn động đa chiều.`;
        },
        next: "ch9_kyaria"
      },
      ch9_kyaria: {
        sector: "tamarikas",
        leftChar: "__PROTAGONIST__", rightChar: "kyaria", leftMood: "tense", rightMood: "secret",
        speaker: "kyaria",
        text: (g) => {
          const hybridsCount = g.hybrids?.length || 0;
          return hybridsCount > 0
            ? `"Ta cảm nhận rõ ${hybridsCount} dòng gen lai thế hệ mới mà ngươi đã đánh thức! Năng lượng cộng hưởng giữa các chủng tộc là thứ duy nhất có thể áp chế bóng tối nơi Vực Thẳm này."`
            : `"Khe nứt này hấp thụ mọi đòn pháo truyền thống! Chỉ có những Token hợp nhất sinh sản từ Hàng 2 hoặc một trận quyết đấu chiến thuật cực hạn mới đẩy lùi được lũ Starro & Ravenous."`;
        },
        choices: [
          {
            label: "🃏 Tung Bộ Bài Mạnh Nhất Quyết Chiến Hộ Vệ Vực Thẳm (Ravenous)",
            hint: "Đấu Thẻ Bài: Tướng của bạn vs Ravenous — Khép lại Khe Nứt bằng vũ lực",
            battle: {
              playerId: "__PROTAGONIST__",
              enemyId: "ragnaroir",
              stageId: "western_abyss",
              winNext: "ch9_win",
              loseNext: "ch9_retreat"
            }
          },
          {
            label: "🧬 Kích Hoạt Giao Thức Đồng Bộ Gen Liên Chủng Tộc",
            hint: "Yêu cầu có >= 1 Hậu duệ Lai Tạo hoặc +200 Nghiên cứu • +1,800 Credits & Bình ổn Khe Nứt",
            cond: (g) => (g.hybrids?.length || 0) >= 1 || (g.resources[g.playerFaction]?.research || 0) >= 350,
            effects: (g) => {
              g.addRes(g.playerFaction, "credits", 1800);
              g.addRes(g.playerFaction, "influence", 120);
              g.addTension(-15);
            },
            next: "ch9_hybrid_seal"
          }
        ]
      },
      ch9_win: {
        sector: "western_abyss",
        leftChar: "__PROTAGONIST__", rightChar: "magnatere", leftMood: "smug", rightMood: "happy",
        speaker: "magnatere",
        text: (g) => `"Cả Đế chế Nadirius cũng phải ngả mũ trước màn trình diễn của ${g.getProtagonist().name}. Khe nứt Hư Không đã khép lại — giờ tất cả hướng mắt về Chương Cuối ở Outer Layer!"`,
        end: {
          title: "CHƯƠNG IX HOÀN TẤT: CHỦ NHÂN VỰC THẲM",
          summary: "Chiến thắng vang dội! Tiến thẳng tới Chương X: Bình Minh Chu Kỳ 13.",
          nextChapter: "ch10_eternal_cycle"
        }
      },
      ch9_hybrid_seal: {
        sector: "tamarikas",
        leftChar: "__PROTAGONIST__", rightChar: "ovalina", leftMood: "happy", rightMood: "happy",
        speaker: "ovalina",
        text: "Chuỗi gen tổng hợp vừa vá kín khe nứt thực tại mà không tốn một giọt máu nào! Tamarite, Sylvarian và Nadir vừa chứng kiến kỷ nguyên tiến hóa thực sự.",
        end: {
          title: "CHƯƠNG IX HOÀN TẤT: HÀI HÒA ĐA GEN",
          summary: "+1,800 Credits, +120 Ảnh hưởng, -15% Căng thẳng! Tiến vào Chương X.",
          nextChapter: "ch10_eternal_cycle"
        }
      },
      ch9_retreat: {
        sector: "western_abyss",
        leftChar: "__PROTAGONIST__", rightChar: "zarcseid", leftMood: "tense", rightMood: "combat",
        speaker: "zarcseid",
        text: "Không sao cả! Hạm đội Prozonian đã kịp yểm trợ rút lui an toàn. Hãy nâng cấp thêm Bộ Bài hoặc Lai Tạo hậu duệ mới trước khi bước vào trận chung kết!",
        end: {
          title: "CHƯƠNG IX: TÁI TẬP HỢP CHIẾN TUYẾN",
          summary: "Chuẩn bị bước vào Chương X: Định đoạt Chu Kỳ 13.",
          nextChapter: "ch10_eternal_cycle"
        }
      }
    }
  },
  {
    id: "ch10_eternal_cycle",
    num: "CHƯƠNG X",
    title: "Bình Minh Chu Kỳ 13 — Bản Tuyên Ngôn Vũ Trụ",
    subtitle: "Hệ Eris Core & Khối Đa Diện Outer Layer",
    sector: "outer_layer",
    leadChar: "__PROTAGONIST__",
    summary: "Thời khắc phán quyết tối hậu của toàn bộ Age of Dominion. Dựa trên lịch sử 11 chu kỳ trước, quân lực, ngoại giao và di sản huyết thống của bạn, Gaiastra sẽ bước sang Chu Kỳ 13 dưới kỷ nguyên nào?",
    nodes: {
      start: {
        sector: "outer_layer",
        leftChar: "__PROTAGONIST__", rightChar: "emma", leftMood: "combat", rightMood: "secret",
        speaker: "emma",
        text: (g) => {
          const hero = g.getProtagonist();
          const terr = g.getFactionTerritoryPct(g.playerFaction);
          const hy = g.hybrids?.length || 0;
          return `"Đã tới lúc viết trang cuối cho Chu Kỳ 12, ${hero.name}. Phe bạn hiện nắm ${terr}% lãnh thổ, sở hữu ${hy} dòng lai thế hệ mới, với mức căng thẳng ${Math.round(g.tension)}%. Quyết định của ngươi sẽ khắc tên lên lịch sử Gaiastra mãi mãi!"`;
        },
        choices: [
          {
            label: "👑 Đăng Quang Thống Lĩnh: Thành Lập Tân Trật Tự Ngân Hà",
            hint: "Kỷ nguyên Chinh Phạt • Khẳng định quyền bá chủ không thể chối cãi",
            effects: (g) => {
              g.addRes(g.playerFaction, "credits", 5000);
              g.addRes(g.playerFaction, "influence", 300);
            },
            next: "ch10_sovereign"
          },
          {
            label: "🌟 Phá Vỡ Vòng Lặp Reset: Chung Sống Bình Đẳng Toàn Vạn Chủng",
            hint: "Kỷ nguyên Hòa Bình & Tiến Hóa • Chấm dứt mãi mãi nguy cơ Reset",
            effects: (g) => {
              g.addTension(-40);
              g.addRes(g.playerFaction, "influence", 400);
            },
            next: "ch10_horizon"
          },
          {
            label: "⚔️ Trận Quyết Đấu Cuối Cùng Với Thiên Sứ Eris (Emma CR 1200)",
            hint: "Đấu Thẻ Bài Chung Kết: Nếu thắng, bạn mở ra Đại Kết Cục Huyền Thoại!",
            battle: {
              playerId: "__PROTAGONIST__",
              enemyId: "emma",
              stageId: "outer_layer",
              winNext: "ch10_ascension",
              loseNext: "ch10_horizon"
            }
          }
        ]
      },
      ch10_sovereign: {
        sector: "sylvalon",
        leftChar: "__PROTAGONIST__", rightChar: "arisia", leftMood: "smug", rightMood: "happy",
        speaker: "__PROTAGONIST__",
        text: (g) => `"Chu kỳ 13 mở màn dưới ngọn cờ của ${g.getProtagonist().name} và ${g.facName(g.playerFaction)}. Không còn thế lực nào dám thách thức bản đồ vì sao của chúng ta nữa!"`,
        end: {
          title: "ĐẠI KẾT CỤC A: HOÀNG ĐẾ CHU KỲ 13",
          summary: "+5,000 Credits • +300 Ảnh hưởng • Mở khóa Chương Ngoại Truyện XI: Huyết Thống Pherone Nexus!",
          nextChapter: "ch11_pherone_genes"
        }
      },
      ch10_horizon: {
        sector: "predita",
        leftChar: "__PROTAGONIST__", rightChar: "zarcseid", leftMood: "happy", rightMood: "happy",
        speaker: "narrator",
        text: (g) => `Với tài trí của ${g.getProtagonist().name}, mọi phe phái từ Sylvarian, Nadirius đến Salvic Union đều hạ vũ khí đặt nền móng cho Liên Minh Bình Minh Chu Kỳ 13. Căng thẳng ngân hà giảm -40%!`,
        end: {
          title: "ĐẠI KẾT CỤC B: CHÂN TRỜI HÒA BÌNH GAIASTRA",
          summary: "-40% Căng thẳng • +400 Ảnh hưởng • Tiếp tục Chương XI: Bí Mật Omni-Womb!",
          nextChapter: "ch11_pherone_genes"
        }
      },
      ch10_ascension: {
        sector: "outer_layer",
        leftChar: "__PROTAGONIST__", rightChar: "emma", leftMood: "happy", rightMood: "happy",
        speaker: "emma",
        text: (g) => `"Không thể tin được... ${g.getProtagonist().name} đã đánh bại cả Hội Đồng Outer Layer trong trận quyết đấu! Giao thức Reset vĩnh viễn được chuyển giao cho ngươi!"`,
        end: {
          title: "ĐẠI KẾT CỤC S+: CHỦ NHÂN VĨNH HẰNG CỦA ĐA VŨ TRỤ",
          summary: "Tiếp nối sử thi với Chương XI: Mật Mã Tamarite & Omni-Womb!",
          nextChapter: "ch11_pherone_genes"
        }
      }
    }
  },
  {
    id: "ch11_pherone_genes",
    num: "CHƯƠNG XI",
    title: "Bí Mật Pherone Nexus & Huyết Thống Tamarite",
    subtitle: "Pherone Nexus (Trái Đất) → Kho Lưu Trữ Gen Vagina Clitoris",
    sector: "earth_sol",
    leadChar: "ovalina",
    summary: "Khi bình minh Chu Kỳ 13 ló rạng, cánh cổng bí mật dưới lòng Pherone Nexus mở ra: kho dữ liệu gốc về khả năng sinh sản 100% của Tamarite và đột biến Omni-Womb bắt đầu thức tỉnh, thu hút ánh nhìn của cả Tyranian lẫn Meralina.",
    nodes: {
      start: {
        sector: "earth_sol",
        leftChar: "__PROTAGONIST__", rightChar: "ovalina", leftMood: "tense", rightMood: "smug",
        speaker: "narrator",
        text: (g) => `Dưới tầng sâu nhất của Pherone Nexus, các ống ánh sáng Hyper-Photon đồng loạt bừng sáng. ${g.getProtagonist().name} đối diện Nữ hoàng Tamarite Ovalina Perfectbrood bên cạnh lõi gen nguyên thủy của Vagina Clitoris.`,
        next: "ch11_reveal"
      },
      ch11_reveal: {
        sector: "earth_sol",
        leftChar: "__PROTAGONIST__", rightChar: "meralina", leftMood: "secret", rightMood: "combat",
        speaker: "meralina",
        text: `"Chính tại đây Ta đã giấu bộ mã Euphoria và khế ước với Ragnaroir. Nếu để Sylvarian hay Collectors chiếm được lõi Omni-Womb, toàn bộ cân bằng CR của 15 chủng tộc sẽ sụp đổ!"`,
        choices: [
          {
            label: "🧬 Giải mã Lõi Hyper-Photon Tamarite (+350 Nghiên cứu & +15 Độ tin cậy Ovalina)",
            hint: "Khám phá bí mật tỷ lệ lai 100% và đột biến Omni-Token đa hình thái",
            effects: (g) => {
              g.addRes(g.playerFaction, "research", 350);
              g.addAffinity("ovalina", 15);
              g.addAffinity("uterussa", 12);
            },
            next: "ch11_decode"
          },
          {
            label: "⚔️ Kiểm Chứng Sức Mạnh Với Nữ Vương Ovalina (CR 2000) Trên Sân Đấu 3 Làn",
            hint: "Đấu Thẻ Bài Đỉnh Cao • Thắng để khắc dấu chủ quyền huyết thống tại Pherone Nexus",
            battle: {
              playerId: "__PROTAGONIST__",
              enemyId: "ovalina",
              stageId: "earth_sol",
              winNext: "ch11_duel_win",
              loseNext: "ch11_decode"
            }
          },
          {
            label: "🛡️ Bảo Vệ Meralina & Triệu Tập Bóng Ragnaroir Thoát Khỏi Truy Sát",
            hint: "+1,200 Credits • +20 Độ tin cậy Meralina & +25 Ảnh hưởng",
            effects: (g) => {
              g.addAffinity("meralina", 20);
              g.addRes(g.playerFaction, "credits", 1200);
              g.addRes(g.playerFaction, "influence", 25);
            },
            next: "ch11_ally_meralina"
          }
        ]
      },
      ch11_decode: {
        sector: "earth_sol",
        leftChar: "__PROTAGONIST__", rightChar: "uterussa", leftMood: "happy", rightMood: "happy",
        speaker: "uterussa",
        text: "Dữ liệu cho thấy chỉ duy nhất huyết mạch Tamarite đạt tỷ lệ cộng hưởng gen 100%, trong khi Omni-Womb tạo ra biến thể Song Sinh hoặc Khổng Lồ — trái ngược hoàn toàn với giới hạn mong manh của con người thuần chưa qua Serum!",
        end: {
          title: "CHƯƠNG XI HOÀN TẤT: BÍ MẬT TAMARITE",
          summary: "Đã mở khóa toàn bộ hiểu biết di truyền Pherone Nexus! Tiến vào Chương XII: Vương Miện Hư Không.",
          nextChapter: "ch12_abyssal_crown"
        }
      },
      ch11_duel_win: {
        sector: "earth_sol",
        leftChar: "__PROTAGONIST__", rightChar: "ovalina", leftMood: "smug", rightMood: "happy",
        speaker: "ovalina",
        text: (g) => `"Haha! Đánh bại cả ta trên sân bài 3 làn của chính Pherone Nexus sao? ${g.getProtagonist().name}, từ nay toàn bộ kho gen Tamarite mở rộng cửa đón ngươi!"`,
        effects: (g) => g.addRes(g.playerFaction, "influence", 180),
        end: {
          title: "CHƯƠNG XI HOÀN TẤT: CHỦ NHÂN HYPER-PHOTON",
          summary: "+180 Ảnh hưởng & chiến thắng Ovalina! Tiến tới Chương Kết: Vương Miện Vực Thẳm.",
          nextChapter: "ch12_abyssal_crown"
        }
      },
      ch11_ally_meralina: {
        sector: "earth_sol",
        leftChar: "__PROTAGONIST__", rightChar: "meralina", leftMood: "happy", rightMood: "secret",
        speaker: "meralina",
        text: "Ân tình tại Pherone Nexus hôm nay Ta khắc cốt ghi tâm. Khi trận chiến cuối với các thần Nadir bùng nổ, thanh kiếm của Công chúa lưu vong và Ragnaroir sẽ đứng cạnh ngươi.",
        end: {
          title: "CHƯƠNG XI HOÀN TẤT: LỜI THỀ CÔNG CHÚA LƯU VONG",
          summary: "Đã kết minh với Meralina Caranter! Tiến tới Chương XII.",
          nextChapter: "ch12_abyssal_crown"
        }
      }
    }
  },
  {
    id: "ch12_abyssal_crown",
    num: "CHƯƠNG XII",
    title: "Vương Miện Vực Thẳm & Khải Hoàn Chu Kỳ Mới",
    subtitle: "Vùng Biên Nadir ↔ Thủ Đô Kronea ↔ Đỉnh Trời Eris",
    sector: "western_abyss",
    leadChar: "overlord",
    summary: "Bóng tối nguyên thủy từ Impregnita và lời tiên tri về những đứa con Nadir tái sinh trỗi dậy lần cuối. Dù ngươi là kẻ chinh phục, nhà di truyền hay người bảo hộ hòa bình, chương cuối cùng sẽ định đoạt vận mệnh mọi vương quốc.",
    nodes: {
      start: {
        sector: "western_abyss",
        leftChar: "__PROTAGONIST__", rightChar: "overlord", leftMood: "combat", rightMood: "angry",
        speaker: "overlord",
        text: (g) => `"Cười lên đi, ${g.getProtagonist().name}! Khi mặt trăng máu soi rọi cả Western Abyss và Nadirius Citadel, Magnatere, Arisia và chính ta sẽ chỉ tôn vinh kẻ đứng vững sau cùng trên ngai vàng!"`,
        next: "ch12_summit"
      },
      ch12_summit: {
        sector: "western_abyss",
        leftChar: "__PROTAGONIST__", rightChar: "tsunadia", leftMood: "tense", rightMood: "smug",
        speaker: "tsunadia",
        text: "Các huynh đệ Nadir cùng hội đồng Sylvarian đã tập hợp hạm đội. Hãy chọn nước đi cuối cùng của bạn trong bản giao hưởng Chu Kỳ 12!",
        choices: [
          {
            label: "🔥 Tổng Tiến Công Quyết Tử: Thách Đấu Overlord (CR 1200) Trận Sinh Tử",
            hint: "Trận Đấu Thẻ Bài Hoàng Kim • Giành chiến thắng tuyệt đối trước Chúa Tể Vực Thẳm",
            battle: {
              playerId: "__PROTAGONIST__",
              enemyId: "overlord",
              stageId: "western_abyss",
              winNext: "ch12_crown_win",
              loseNext: "ch12_crown_pact"
            }
          },
          {
            label: "📜 Ký Tân Hiến Chương Đa Chủng Tộc: Cân Bằng 8 Phe & Mở Rộng Giao Thương",
            hint: "+3,000 Credits • +250 Ảnh hưởng • -25% Căng thẳng Toàn Ngân Hà",
            effects: (g) => {
              g.addRes(g.playerFaction, "credits", 3000);
              g.addRes(g.playerFaction, "influence", 250);
              g.addTension(-25);
            },
            next: "ch12_crown_pact"
          }
        ]
      },
      ch12_crown_win: {
        sector: "outer_layer",
        leftChar: "__PROTAGONIST__", rightChar: "overlord", leftMood: "smug", rightMood: "tense",
        speaker: "__PROTAGONIST__",
        text: (g) => `"Overlord cũng đã quỳ gối trước chiến thuật Hàng 1 — Hàng 2 — Hàng 3 của ${g.getProtagonist().name}! Nhưng khoan đã... từ tầng sâu nhất của Eris Core, phong ấn về 11 Chu Kỳ Đã Chết vừa phát tín hiệu cảnh báo!"`,
        end: {
          title: "CHƯƠNG XII HOÀN TẤT: BÁ CHỦ VỰC THẲM",
          summary: "Đã mở khóa Kỷ Nguyên Hậu Chiến (Chương XIII → XVIII): Hồ Sơ 11 Chu Kỳ Trước & Giải Đấu Tuyệt Đỉnh Gaiastra!",
          nextChapter: "ch13_dead_cycles"
        }
      },
      ch12_crown_pact: {
        sector: "sylvalon",
        leftChar: "__PROTAGONIST__", rightChar: "emma", leftMood: "happy", rightMood: "secret",
        speaker: "emma",
        text: (g) => `"Hội đồng Eris Union xác nhận bình minh hòa bình dưới sự bảo chứng của ${g.getProtagonist().name}. Chính vì ngươi đã vượt qua phép thử Chu Kỳ 12, ta sẽ mở quyền truy cập Hầm Lưu Trữ Tuyệt Mật về 11 Chu Kỳ Trước..."`,
        end: {
          title: "CHƯƠNG XII HOÀN TẤT: HIẾN CHƯƠNG GAIASTRA",
          summary: "Mở khóa Chương XIII: Hồ Sơ Tuyệt Mật 11 Chu Kỳ Trước!",
          nextChapter: "ch13_dead_cycles"
        }
      }
    }
  },
  {
    id: "ch13_dead_cycles",
    num: "CHƯƠNG XIII",
    title: "Hồ Sơ Tuyệt Mật 11 Chu Kỳ Trước & Ký Ức Trái Đất Cũ",
    subtitle: "Hầm Lưu Trữ Eris Core → Viện Sử Học Berlidona",
    sector: "outer_layer",
    leadChar: "yulia",
    summary: "Lần đầu tiên trong lịch sử Gaiastra, cánh cổng dẫn vào Hầm Lưu Trữ Ký Ức của Eris Union hé mở. Yulia Makarova, Emma và Cipheron đối mặt với bí mật tại sao 11 vũ trụ trước đều bị Reset — và nguồn gốc thật sự của những mảnh ký ức Trái Đất Cũ.",
    nodes: {
      start: {
        sector: "outer_layer",
        leftChar: "yulia", rightChar: "emma", leftMood: "tense", rightMood: "secret",
        speaker: "narrator",
        text: "Tại trung tâm khối đa diện Outer Layer, mười một cột tinh thể đen tượng trưng cho 11 Chu Kỳ đã bị xóa sổ lơ lửng giữa hư không. Nhà sử học lai Yulia Makarova chạm tay vào cột tinh thể thứ 11 — và hàng triệu hình ảnh cổ xưa lập tức ùa về.",
        next: "ch13_yulia_memory"
      },
      ch13_yulia_memory: {
        sector: "outer_layer",
        leftChar: "yulia", rightChar: "emma", leftMood: "angry", rightMood: "neutral",
        speaker: "yulia",
        text: "\"Giờ thì tôi đã hiểu vì sao ở phòng họp Berlidona, chỉ mình tôi biết tới cái tên 'Molotov–Ribbentrop'! Trái Đất hiện tại ở Hệ Sol chỉ là bản tái tạo thứ 12. Trong Chu Kỳ 1, nhân loại từng tự hủy diệt trước khi các chủng tộc Sylvarian và Nadir xuất hiện!\"",
        next: "ch13_emma_truth"
      },
      ch13_emma_truth: {
        sector: "outer_layer",
        leftChar: "emma", rightChar: "yulia", leftMood: "secret", rightMood: "tense",
        speaker: "emma",
        text: "\"Đúng vậy, Yulia. Mỗi khi một đế chế nuốt trọn hơn 85% vũ trụ hoặc khi chiến tranh huyết thống vượt ngưỡng kiểm soát, Thực Tại sẽ tự sụp đổ thành Điểm Kỳ Dị. Eris Union không Reset vũ trụ vì tàn nhẫn — chúng tôi Reset để cứu lấy mầm sống trước khi hư vô nuốt chửng tất cả.\"",
        next: "ch13_cipheron_intrude"
      },
      ch13_cipheron_intrude: {
        sector: "outer_layer",
        leftChar: "__PROTAGONIST__", rightChar: "cipheron", leftMood: "combat", rightMood: "smug",
        speaker: "cipheron",
        text: (g) => `"Hahaha! Một bí mật quá đỗi ngọt ngào! ${g.getProtagonist().name}, nếu thần trí Nadir của ta chiếm được Mã Nguồn Chu Kỳ 1–11 ngay tại đây, Western Nadir sẽ viết lại quy luật nhân quả của toàn bộ 15 chủng tộc!"`,
        choices: [
          {
            label: "⚔️ Đấu Thẻ Bài Phong Ấn Thần Trí Cipheron (CR 1001)",
            hint: "Trận Đấu Chiến Thuật tại Outer Layer • Bảo vệ nguyên vẹn Mã Nguồn 11 Chu Kỳ",
            effects: (g) => {
              g.setFlag("ch13_fought_cipheron", true);
              g.addAffinity("emma", 18);
              g.addAffinity("yulia", 15);
            },
            battle: {
              playerId: "__PROTAGONIST__",
              enemyId: "cipheron",
              stageId: "outer_layer",
              winNext: "ch13_win_archive",
              loseNext: "ch13_compromise"
            }
          },
          {
            label: "🧬 Trích Xuất Dữ Liệu Di Truyền Cổ Đại Cho Toàn Bộ 8 Phe",
            hint: "+450 Nghiên cứu • +60 Mảnh Gen • Công khai sự thật về Vòng Lặp Reset",
            effects: (g) => {
              g.addRes(g.playerFaction, "research", 450);
              g.cardDust = (g.cardDust || 0) + 60;
              g.setFlag("ch13_archive_public", true);
              g.addAffinity("yulia", 22);
            },
            next: "ch13_public_reveal"
          },
          {
            label: "🤝 Thương Lượng Chia Sẻ Ma Trận Tri Thức Với Cipheron",
            hint: "+2,200 Credits • +120 Ảnh hưởng • Quan hệ Western Nadir +20",
            effects: (g) => {
              g.addRes(g.playerFaction, "credits", 2200);
              g.addRes(g.playerFaction, "influence", 120);
              g.addRelation(g.playerFaction, "western_nadir", 20);
            },
            next: "ch13_compromise"
          }
        ]
      },
      ch13_win_archive: {
        sector: "outer_layer",
        leftChar: "__PROTAGONIST__", rightChar: "yulia", leftMood: "smug", rightMood: "happy",
        speaker: "yulia",
        text: (g) => `"Đòn phản công xuất thần lắm, ${g.getProtagonist().name}! Cipheron đã bị đẩy lùi khỏi Hầm Lưu Trữ. Tôi đã sao lưu toàn bộ biên niên sử 11 Chu Kỳ — và phát hiện một âm mưu đảo chính đang âm ỉ ngay giữa lòng Thủ đô Kronea!"`,
        effects: (g) => {
          g.cardDust = (g.cardDust || 0) + 80;
          g.addRes(g.playerFaction, "influence", 160);
        },
        end: {
          title: "CHƯƠNG XIII HOÀN TẤT: NGƯỜI GIỮ KÝ Ức VŨ TRỤ",
          summary: "+80 Mảnh Gen & +160 Ảnh hưởng! Tiếp tục Chương XIV: Bóng Tối Dưới Ngai Vàng Kronea.",
          nextChapter: "ch14_kronea_shadows"
        }
      },
      ch13_public_reveal: {
        sector: "berlidona",
        leftChar: "yulia", rightChar: "mina", leftMood: "happy", rightMood: "happy",
        speaker: "mina",
        text: "\"Tin chấn động phát sóng trên toàn mạng lưới Global Icon! Bản báo cáo của Yulia Makarova về 11 Chu Kỳ Đã Chết đang làm rung chuyển nội các Kronea, kích động phe đối lập của Carnavex hành động sớm hơn dự kiến!\"",
        end: {
          title: "CHƯƠNG XIII HOÀN TẤT: SỰ THẬT PHƠI BÀY",
          summary: "+450 Nghiên cứu & +60 Mảnh Gen! Mở khóa Chương XIV: Bóng Tối Dưới Ngai Vàng Kronea.",
          nextChapter: "ch14_kronea_shadows"
        }
      },
      ch13_compromise: {
        sector: "outer_layer",
        leftChar: "emma", rightChar: "cipheron", leftMood: "tense", rightMood: "smug",
        speaker: "emma",
        text: "\"Dù Cipheron đã rút lui cùng một mảnh dữ liệu cổ, ngươi vẫn giữ được lõi điều khiển chính. Nhưng hãy cẩn thận: biến động chính trị tại Đế chế Sylvarian đang bùng lên từng giờ!\"",
        end: {
          title: "CHƯƠNG XIII HOÀN TẤT: THỎA HIỆP TRÊN ĐỈNH TRỜI",
          summary: "+2,200 Credits & +120 Ảnh hưởng! Tiến sang Chương XIV: Bóng Tối Dưới Ngai Vàng Kronea.",
          nextChapter: "ch14_kronea_shadows"
        }
      }
    }
  },
  {
    id: "ch14_kronea_shadows",
    num: "CHƯƠNG XIV",
    title: "Bóng Tối Dưới Ngai Vàng Kronea & Âm Mưu Đảo Chính",
    subtitle: "Thủ Đô Kronea → Tiền Đồn Gandora (Border Division)",
    sector: "sylvalon",
    leadChar: "arisia",
    summary: "Khi Hiệp ước Cursew và bí mật Gotterfall bị rò rỉ trong Thượng viện Kronea, Carnavex âm thầm liên kết với các quý tộc bất mãn nhằm phế truất Nữ hoàng Arisia Grok. Ojamon, Pussiri và Tướng Veidos của Border Division bị cuốn vào vòng xoáy sinh tử.",
    nodes: {
      start: {
        sector: "sylvalon",
        leftChar: "pussiri", rightChar: "ojamon", leftMood: "tense", rightMood: "secret",
        speaker: "pussiri",
        text: "\"Ngài Ojamon! Mạng lưới mật vụ của tôi vừa chặn được mật lệnh mã hóa từ dinh thự của Carnavex. Hắn đang thuyết phục một nửa Hội đồng Reformists rằng Nữ hoàng Arisia đã bán đứng đế chế cho Overlord qua Hiệp ước Cursew!\"",
        next: "ch14_ojamon_calc"
      },
      ch14_ojamon_calc: {
        sector: "sylvalon",
        leftChar: "ojamon", rightChar: "arisia", leftMood: "smug", rightMood: "angry",
        speaker: "arisia",
        text: "\"Carnavex tưởng ta là kẻ dễ bị lật đổ trên chính ngai vàng của cha ta sao? Nhưng điều ta cần biết ngay lúc này là: Quân đoàn Biên giới (Border Division) của Tướng Veidos ở Gandora sẽ đứng về phía ai?\"",
        next: "ch14_gandora_veidos"
      },
      ch14_gandora_veidos: {
        sector: "gandora",
        leftChar: "__PROTAGONIST__", rightChar: "veidos", leftMood: "combat", rightMood: "tense",
        speaker: "veidos",
        text: (g) => `"${g.getProtagonist().name}, ở Kronea đám quý tộc chế giễu ngoại hình đột biến của ta, nhưng ở Gandora này, từng người lính Ixalcienkorps đều đổ máu vì biên cương. Carnavex hứa trao cho ta quyền tự trị tuyệt đối nếu làm ngơ đêm nay. Ngươi nói xem — ta nên chọn bên nào?"`,
        choices: [
          {
            label: "🛡️ Thuyết Phục Veidos Giữ Trọn Danh Dự Chiến Binh & Đập Tan Đảo Chính",
            hint: "+25 Độ tin cậy Veidos & Arisia • Đấu Thẻ Bài trấn áp lực lượng phản loạn của Carnavex",
            effects: (g) => {
              g.addAffinity("veidos", 25);
              g.addAffinity("arisia", 18);
              g.setFlag("ch14_veidos_loyal", true);
            },
            battle: {
              playerId: "__PROTAGONIST__",
              enemyId: "carnavex",
              stageId: "sylvalon",
              winNext: "ch14_coup_crushed",
              loseNext: "ch14_civil_strife"
            }
          },
          {
            label: "🕵️ Dùng Kế 'Tương Kế Tựu Kế' Của Ojamon & Pussiri Bắt Sống Phe Phản Loạn",
            hint: "+2,500 Credits • +200 Nghiên cứu • Không tốn xương máu quân đoàn Gandora",
            effects: (g) => {
              g.addRes(g.playerFaction, "credits", 2500);
              g.addRes(g.playerFaction, "research", 200);
              g.addAffinity("ojamon", 20);
              g.addAffinity("pussiri", 20);
            },
            next: "ch14_spy_trap"
          },
          {
            label: "🔥 Hậu Thuẫn Cuộc Cải Tổ Quyền Lực Tại Kronea (Đấu Thử Thách Arisia)",
            hint: "Thách thức trực diện quyền uy Sylvalon Supreme trên bàn đấu 3 làn",
            battle: {
              playerId: "__PROTAGONIST__",
              enemyId: "arisia",
              stageId: "sylvalon",
              winNext: "ch14_new_order",
              loseNext: "ch14_coup_crushed"
            }
          }
        ]
      },
      ch14_coup_crushed: {
        sector: "sylvalon",
        leftChar: "arisia", rightChar: "veidos", leftMood: "smug", rightMood: "happy",
        speaker: "arisia",
        text: "\"Khi hạm đội Ixalcienkorps của Veidos xuất hiện trên bầu trời Kronea, toàn bộ đám phản loạn của Carnavex đã buông vũ khí trong vòng mười phút. Từ hôm nay, danh dự của Border Division được khắc lên bia vàng Đế chế!\"",
        effects: (g) => {
          g.cardDust = (g.cardDust || 0) + 75;
          g.unlockCard("veidos", 1);
        },
        end: {
          title: "CHƯƠNG XIV HOÀN TẤT: LÁ CHẮN THÉP KRONEA",
          summary: "Mở khóa thẻ bài Tướng Veidos + 75 Mảnh Gen! Tiến vào Chương XV: Huyết Lệ Chị Em Prozonian.",
          nextChapter: "ch15_predita_sisters"
        }
      },
      ch14_spy_trap: {
        sector: "sylvalon",
        leftChar: "ojamon", rightChar: "pussiri", leftMood: "smug", rightMood: "happy",
        speaker: "ojamon",
        text: "\"Một cái bẫy thông tin hoàn hảo! Carnavex tự nộp toàn bộ danh sách tài khoản ngầm cho chúng ta trước khi kịp rút gươm. Kho ngân khố Kronea vừa thu hồi một khoản chiến phí khổng lồ!\"",
        end: {
          title: "CHƯƠNG XIV HOÀN TẤT: BẬC THẦY TÌNH BÁO",
          summary: "+2,500 Credits & +200 Nghiên cứu! Tiếp tục Chương XV: Huyết Lệ Chị Em Prozonian.",
          nextChapter: "ch15_predita_sisters"
        }
      },
      ch14_new_order: {
        sector: "sylvalon",
        leftChar: "__PROTAGONIST__", rightChar: "arisia", leftMood: "smug", rightMood: "tense",
        speaker: "arisia",
        text: (g) => `"Khá lắm, ${g.getProtagonist().name}! Ngươi chứng minh được thực lực ngay tại điện chính Kronea. Ta chấp nhận cải tổ Hội đồng Hoàng gia và chia sẻ quyền điều động hạm đội cùng ngươi!"`,
        effects: (g) => {
          g.addRes(g.playerFaction, "influence", 250);
          g.cardDust = (g.cardDust || 0) + 90;
        },
        end: {
          title: "CHƯƠNG XIV HOÀN TẤT: TÂN HIẾN PHÁP KRONEA",
          summary: "+250 Ảnh hưởng & +90 Mảnh Gen! Tiến sang Chương XV: Huyết Lệ Chị Em Prozonian.",
          nextChapter: "ch15_predita_sisters"
        }
      },
      ch14_civil_strife: {
        sector: "sylvalon",
        leftChar: "arisia", rightChar: "ojamon", leftMood: "tense", rightMood: "tense",
        speaker: "ojamon",
        text: "\"Dù cuộc giao tranh để lại nhiều vết rạn trong Thượng viện, Vệ binh Hoàng gia đã kịp thời khóa chặt các cửa ngõ Kronea. Nhưng ở phương Nam, chiến tuyến Predita và Salvic Union đang dậy sóng!\"",
        end: {
          title: "CHƯƠNG XIV HOÀN TẤT: DƯ CHẤN HOÀNG CUNG",
          summary: "Tiếp tục hành trình tại Chương XV: Huyết Lệ Chị Em Prozonian.",
          nextChapter: "ch15_predita_sisters"
        }
      }
    }
  },
  {
    id: "ch15_predita_sisters",
    num: "CHƯƠNG XV",
    title: "Huyết Lệ Chị Em Prozonian — Elita, Hyouya & Phép Màu Predita",
    subtitle: "Pháo Đài Predita (Salvic Union) ↔ Thành Trì Nadirius",
    sector: "predita",
    leadChar: "zarcseid",
    summary: "Mười năm trước, 500 triệu chiến binh Prozonian dưới trướng Tướng Zarcseid đã tử thủ tại Predita trước sự hủy diệt hoàn toàn. Nay hai chị em ruột dòng dõi Prozonian — Elita (Salvic Union) và Hyouya (Đế chế Nadirius) — buộc phải đối mặt nhau giữa ranh giới máu và nước mắt.",
    nodes: {
      start: {
        sector: "predita",
        leftChar: "zarcseid", rightChar: "elita", leftMood: "tense", rightMood: "tense",
        speaker: "zarcseid",
        text: "\"Mười năm bị vây hãm ở Predita, chúng ta ăn lương khô nhiễm xạ và đếm từng người đồng đội ngã xuống để giữ lấy ngọn lửa Prozonian cuối cùng. Elita, hôm nay hạm đội tuần tiễu của Nadirius áp sát biên giới — và người dẫn đầu lại chính là em gái cô, Hyouya.\"",
        next: "ch15_sisters_meet"
      },
      ch15_sisters_meet: {
        sector: "predita",
        leftChar: "elita", rightChar: "hyouya", leftMood: "tense", rightMood: "tense",
        speaker: "hyouya",
        text: "\"Chị Elita... Em không tới đây để nổ súng vào đồng bào mình! Bệ hạ Magnatere cử em mang mật thư cảnh báo: nếu Salvic Union và Nadirius không lập tức nối lại đường dây phòng thủ chung, quân đoàn ký sinh Natheron từ Vực Thẳm sẽ đánh úp cả hai bên!\"",
        next: "ch15_brigitte_intervene"
      },
      ch15_brigitte_intervene: {
        sector: "predita",
        leftChar: "brigitte", rightChar: "zarcseid", leftMood: "secret", rightMood: "neutral",
        speaker: "brigitte",
        text: "\"Tướng Zarcseid, dù tôi mang quân hàm Sylvarian, tôi đã bí mật chuyển bản đồ radar biên khu cho ngài vì lòng kính trọng. Nhưng các sĩ quan cực đoan trong quân đoàn đòi một trận tỉ thí danh dự trước khi mở cổng liên minh!\"",
        choices: [
          {
            label: "⚔️ Tỉ Thí Danh Dự Chị Em: Elita & Zarcseid vs. Hyouya & Magnatere",
            hint: "Đấu Thẻ Bài Chiến Thuật • Dùng thực lực chứng minh ý chí thống nhất dòng máu Prozonian",
            effects: (g) => {
              g.addAffinity("elita", 20);
              g.addAffinity("hyouya", 20);
              g.addAffinity("zarcseid", 18);
            },
            battle: {
              playerId: "__PROTAGONIST__",
              enemyId: "hyouya",
              stageId: "predita",
              winNext: "ch15_sisters_reconcile",
              loseNext: "ch15_sisters_reconcile"
            }
          },
          {
            label: "🤝 Đứng Ra Bảo Chứng Hòa Ước Huynh Đệ Salvic — Nadirius",
            hint: "+25 Quan hệ Salvic ↔ Nadirius • +300 Ảnh hưởng • Mở khóa tiếp viện Brigitte",
            effects: (g) => {
              g.addRelation("salvic", "nadirius", 25);
              g.addRes(g.playerFaction, "influence", 300);
              g.addAffinity("brigitte", 22);
              g.addAffinity("magnatere", 15);
            },
            next: "ch15_sisters_reconcile"
          }
        ]
      },
      ch15_sisters_reconcile: {
        sector: "predita",
        leftChar: "elita", rightChar: "hyouya", leftMood: "happy", rightMood: "happy",
        speaker: "elita",
        text: "\"Dù khoác quân phục Salvic hay Nadirius, máu chảy trong huyết quản chúng ta mãi mãi là kiêu hãnh Prozonian! Cảm ơn người đã giúp hai chị em tôi không phải chĩa kiếm vào nhau thêm một lần nào nữa.\"",
        effects: (g) => {
          g.unlockCard("elita", 1);
          g.unlockCard("hyouya", 1);
          g.cardDust = (g.cardDust || 0) + 70;
        },
        end: {
          title: "CHƯƠNG XV HOÀN TẤT: ĐOÀN TỤ DÒNG MÁU PROZONIAN",
          summary: "Nhận thẻ bài Elita & Hyouya + 70 Mảnh Gen! Mở khóa Chương XVI: Đêm Dài Evernight.",
          nextChapter: "ch16_evernight_noir"
        }
      }
    }
  },
  {
    id: "ch16_evernight_noir",
    num: "CHƯƠNG XVI",
    title: "Đêm Dài Evernight — The Supers Đột Kích Chợ Đen Collectors",
    subtitle: "Đô Thị Ngầm Vander → Tháp Neon Tokyzhou",
    sector: "evernight",
    leadChar: "felicia",
    summary: "Tại hành tinh không bao giờ thấy ánh mặt trời Evernight, tổ chức The Collectors dưới sự điều hành của Mr. Mind và tỷ phú Bill đang bí mật đấu giá các mẫu vật đột biến Wombiote cùng lọ Serum Pregnomorph. Felicia và AI Bernice phát động chiến dịch giải cứu.",
    nodes: {
      start: {
        sector: "evernight",
        leftChar: "felicia", rightChar: "bill", leftMood: "combat", rightMood: "smug",
        speaker: "felicia",
        text: "\"Bernice, khóa mục tiêu tầng 88 tháp Tokyzhou! Bill và Mr. Mind đang giam giữ hàng chục chiến binh đột biến trong các lồng năng lượng để ép trích xuất gen Hàng 2 bán cho giới tài phiệt ngân hà!\"",
        next: "ch16_bill_offer"
      },
      ch16_bill_offer: {
        sector: "evernight",
        leftChar: "bill", rightChar: "felicia", leftMood: "smug", rightMood: "angry",
        speaker: "bill",
        text: "\"Bình tĩnh nào quý cô Felicia! Trong kỷ nguyên cá lớn nuốt cá bé này, Serum Pregnomorph của tôi là thứ duy nhất giúp những chủng tộc yếu ớt như con người thoát khỏi kiếp bị nghiền nát trên bàn cờ CR! Mọi thứ ở Vander đều có giá của nó cả thôi.\"",
        choices: [
          {
            label: "⚡ Cùng Felicia & The Supers Đánh Sập Đấu Trường Ngầm Của Collectors!",
            hint: "Đấu Thẻ Bài vs. Bill / Collectors • Giải phóng mẫu vật & thu giữ kho Mảnh Gen",
            effects: (g) => {
              g.addAffinity("felicia", 25);
              g.setFlag("ch16_raided_collectors", true);
            },
            battle: {
              playerId: "__PROTAGONIST__",
              enemyId: "bill",
              stageId: "evernight",
              winNext: "ch16_supers_triumph",
              loseNext: "ch16_underground_deal"
            }
          },
          {
            label: "💉 Thu Mua Toàn Bộ Lô Huyết Thanh Pregnomorph & Dữ Liệu Wombiote",
            hint: "+350 Nghiên cứu • +90 Mảnh Gen • Nâng cấp sức mạnh sinh sản Hàng 2 cho đội hình",
            effects: (g) => {
              g.addRes(g.playerFaction, "research", 350);
              g.cardDust = (g.cardDust || 0) + 90;
              g.addAffinity("bill", 18);
            },
            next: "ch16_underground_deal"
          }
        ]
      },
      ch16_supers_triumph: {
        sector: "evernight",
        leftChar: "felicia", rightChar: "__PROTAGONIST__", leftMood: "happy", rightMood: "smug",
        speaker: "felicia",
        text: (g) => `"AI Bernice báo cáo: toàn bộ lồng giam tại Tokyzhou đã mở khóa! ${g.getProtagonist().name}, nhờ chiến thuật thẻ bài của ngươi mà người dân Evernight lại nhìn thấy hy vọng giữa màn đêm vĩnh cửu!"`,
        effects: (g) => {
          g.unlockCard("felicia", 1);
          g.addRes(g.playerFaction, "credits", 2400);
          g.cardDust = (g.cardDust || 0) + 80;
        },
        end: {
          title: "CHƯƠNG XVI HOÀN TẤT: ANH HÙNG ĐÊM EVERNIGHT",
          summary: "Nhận thẻ Felicia + 2,400 Credits + 80 Mảnh Gen! Tiến vào Chương XVII: Khế Ước Mẫu Thần Vực Thẳm.",
          nextChapter: "ch17_impregnita_brood"
        }
      },
      ch16_underground_deal: {
        sector: "evernight",
        leftChar: "bill", rightChar: "felicia", leftMood: "happy", rightMood: "tense",
        speaker: "bill",
        text: "\"Làm ăn với người hiểu chuyện thật sảng khoái! Toàn bộ công thức điều chế tăng tỷ lệ sinh Token Hàng 2 và lô Mảnh Gen tinh khiết đã được chuyển thẳng vào kho chiến lược của ngài.\"",
        end: {
          title: "CHƯƠNG XVI HOÀN TẤT: THƯƠNG VỤ BÓNG ĐÊM",
          summary: "+350 Nghiên cứu & +90 Mảnh Gen! Mở khóa Chương XVII: Khế Ước Mẫu Thần Vực Thẳm.",
          nextChapter: "ch17_impregnita_brood"
        }
      }
    }
  },
  {
    id: "ch17_impregnita_brood",
    num: "CHƯƠNG XVII",
    title: "Khế Ước Mẫu Thần Impregnita & Cuộc Đào Thoát Của Meralina",
    subtitle: "Thánh Điện Vực Thẳm Tây ↔ Ẩn Cư Pherone Nexus",
    sector: "western_abyss",
    leadChar: "meralina",
    summary: "Sâu trong lõi Western Abyss, thực thể nguyên thủy Impregnita thức giấc, hé lộ nguồn gốc vì sao cuộc chiến giữa Nam (♂) và Nữ (♀) trên Hàng 1 lại dẫn tới quy luật Bắt Giữ & Lai Tạo ở Hàng 2. Meralina Caranter và con trai Ragnaroir đứng trước thử thách định mệnh.",
    nodes: {
      start: {
        sector: "western_abyss",
        leftChar: "meralina", rightChar: "ragnaroir", leftMood: "tense", rightMood: "combat",
        speaker: "meralina",
        text: "\"Ragnaroir, đứng sát bên mẹ! Tiếng vọng từ vực sâu Impregnita đang lay động huyết mạch của mọi sinh vật mang dòng máu lai Nadir. Đó chính là cội nguồn của quy luật Sinh Sản Chiến Tranh trong Kỷ 12 này!\"",
        next: "ch17_tsunadia_revelation"
      },
      ch17_tsunadia_revelation: {
        sector: "western_abyss",
        leftChar: "tsunadia", rightChar: "meralina", leftMood: "smug", rightMood: "angry",
        speaker: "tsunadia",
        text: "\"Công chúa Meralina, dù cô có nhuộm tóc đen trốn ở Pherone Nexus thì cũng không chối bỏ được sự thật: chính đứa con lai Ragnaroir của cô là minh chứng sống động nhất cho sức mạnh Hàng 2! Khi hai huyết thống va chạm, kẻ mạnh hơn sẽ hợp nhất gen để sinh ra thế hệ chiến binh vượt trội!\"",
        choices: [
          {
            label: "⚔️ Sát Cánh Cùng Meralina & Ragnaroir Đánh Bại Hạm Đội Truy Kích Vực Thẳm",
            hint: "Đấu Thẻ Bài vs. Tsunadia • Khẳng định quyền tự quyết của Meralina & dòng máu Lai",
            effects: (g) => {
              g.addAffinity("meralina", 25);
              g.addAffinity("ragnaroir", 25);
            },
            battle: {
              playerId: "__PROTAGONIST__",
              enemyId: "tsunadia",
              stageId: "western_abyss",
              winNext: "ch17_freedom_won",
              loseNext: "ch17_abyss_pact"
            }
          },
          {
            label: "🧬 Tiếp Nhận Phước Lành Nguyên Thủy Của Impregnita & Tsunadia",
            hint: "+100 Mảnh Gen • +300 Nghiên cứu • Mở khóa thẻ bài Ragnaroir & Tsunadia",
            effects: (g) => {
              g.cardDust = (g.cardDust || 0) + 100;
              g.addRes(g.playerFaction, "research", 300);
              g.unlockCard("tsunadia", 1);
              g.unlockCard("ragnaroir", 1);
            },
            next: "ch17_abyss_pact"
          }
        ]
      },
      ch17_freedom_won: {
        sector: "earth_sol",
        leftChar: "meralina", rightChar: "ragnaroir", leftMood: "happy", rightMood: "happy",
        speaker: "meralina",
        text: (g) => `"Không một thế lực nào — dù là Hoàng gia Kronea hay Mẫu thần Vực Thẳm — có quyền định đoạt số phận mẹ con ta nữa! ${g.getProtagonist().name}, thanh gươm của Meralina và móng vuốt Ragnaroir nguyện chiến đấu trong bộ bài của ngươi tới tận cùng!"`,
        effects: (g) => {
          g.unlockCard("meralina", 1);
          g.unlockCard("ragnaroir", 1);
          g.cardDust = (g.cardDust || 0) + 90;
        },
        end: {
          title: "CHƯƠNG XVII HOÀN TẤT: KHÚC CA TỰ DO",
          summary: "Mở khóa thẻ Meralina & Ragnaroir + 90 Mảnh Gen! Tiến vào Chương Kết XVIII: Giải Đấu Tuyệt Đỉnh Gaiastra!",
          nextChapter: "ch18_cosmic_grand_prix"
        }
      },
      ch17_abyss_pact: {
        sector: "western_abyss",
        leftChar: "tsunadia", rightChar: "ragnaroir", leftMood: "happy", rightMood: "smug",
        speaker: "tsunadia",
        text: "\"Sự cộng hưởng giữa các chủng tộc đã đạt tới cảnh giới tối thượng. Giờ thì hãy mang bộ bài mạnh nhất của ngươi tới Đấu Trường Tuyệt Đỉnh Gaiastra — nơi 8 Thủ Lĩnh Tối Cao đang chờ đợi!\"",
        end: {
          title: "CHƯƠNG XVII HOÀN TẤT: CỘNG HƯỞNG HUYẾT THỐNG",
          summary: "+100 Mảnh Gen & thẻ Ragnaroir/Tsunadia! Mở khóa Chương XVIII: Giải Đấu Tuyệt Đỉnh Gaiastra!",
          nextChapter: "ch18_cosmic_grand_prix"
        }
      }
    }
  },
  {
    id: "ch18_cosmic_grand_prix",
    num: "CHƯƠNG XVIII",
    title: "Giải Đấu Tuyệt Đỉnh Gaiastra — Cosmic TCG Grand Prix",
    subtitle: "Đấu Trường Quỹ Đạo Trung Lập • Đại Hội Võ Lâm Thẻ Bài 8 Phe",
    sector: "outer_layer",
    leadChar: "__PROTAGONIST__",
    summary: "Để tránh một cuộc chiến hủy diệt kích hoạt Reset lần thứ 13, toàn bộ 8 Phe Phái đồng thuận tổ chức 'Giải Đấu Tuyệt Đỉnh Gaiastra' (Cosmic TCG Grand Prix) trên Bàn Đấu 3 Hàng. Kẻ chiến thắng giải đấu sẽ nắm giữ Vương Quyền Tối Thượng của Chu Kỳ Mới!",
    nodes: {
      start: {
        sector: "outer_layer",
        leftChar: "__PROTAGONIST__", rightChar: "mina", leftMood: "combat", rightMood: "happy",
        speaker: "mina",
        text: (g) => `"Xin chào toàn thể cư dân từ 20 hệ sao! Tôi là Mina Lascivana, tường thuật trực tiếp từ Đấu Trường Quỹ Đạo Trung Lập! Hôm nay, ${g.getProtagonist().name} sẽ bước vào vòng Chung Kết Liên Ngân Hà để tranh ngôi Vô Địch TCG Chu Kỳ 12!"`,
        next: "ch18_round1"
      },
      ch18_round1: {
        sector: "outer_layer",
        leftChar: "zarcseid", rightChar: "magnatere", leftMood: "combat", rightMood: "combat",
        speaker: "magnatere",
        text: "\"Tại đấu trường này, chỉ có chiến thuật sử dụng Năng lượng Gen ⚡, khả năng phán đoán 3 Làn và nghệ thuật vận hành Hàng 1 – Hàng 2 – Hàng 3 mới quyết định ai xứng đáng là Bá Chủ! Hãy chọn đối thủ Chung Kết của ngươi!\"",
        choices: [
          {
            label: "🏆 Nhánh Bá Vương Chiến Tranh: Quyết Đấu Hoàng Đế Magnatere (CR 1001)",
            hint: "Trận Chung Kết Nhánh Võ Thần • Thưởng +4,000 Credits & +120 Mảnh Gen",
            battle: {
              playerId: "__PROTAGONIST__",
              enemyId: "magnatere",
              stageId: "outer_layer",
              winNext: "ch18_grand_champion",
              loseNext: "ch18_honorable_finalist"
            }
          },
          {
            label: "👑 Nhánh Nữ Hoàng Tối Cao: Quyết Đấu Arisia Grok (CR 1001)",
            hint: "Trận Chung Kết Nhánh Đế Chế • Thưởng +4,000 Credits & +120 Mảnh Gen",
            battle: {
              playerId: "__PROTAGONIST__",
              enemyId: "arisia",
              stageId: "outer_layer",
              winNext: "ch18_grand_champion",
              loseNext: "ch18_honorable_finalist"
            }
          },
          {
            label: "💗 Nhánh Thánh Mẫu Huyết Thống: Quyết Đấu Nữ Vương Ovalina (CR 2000)",
            hint: "Trận Siêu Chung Kết Khó Nhất Game • Thưởng +6,000 Credits, +180 Mảnh Gen & Nâng Cấp ★",
            battle: {
              playerId: "__PROTAGONIST__",
              enemyId: "ovalina",
              stageId: "earth_sol",
              winNext: "ch18_grand_champion",
              loseNext: "ch18_honorable_finalist"
            }
          }
        ]
      },
      ch18_grand_champion: {
        sector: "outer_layer",
        leftChar: "__PROTAGONIST__", rightChar: "emma", leftMood: "smug", rightMood: "happy",
        speaker: "emma",
        text: (g) => `"Toàn bộ khán đài 20 hệ sao đang vỡ òa! ${g.getProtagonist().name} chính thức đăng quang QUÁN QUÂN GIẢI ĐẤU TUYỆT ĐỈNH GAIASTRA! Thẻ bài Thủ lĩnh của ngươi vừa được khắc ấn Tinh Anh Hoàng Kim!"`,
        effects: (g) => {
          g.addRes(g.playerFaction, "credits", 6000);
          g.addRes(g.playerFaction, "influence", 350);
          g.cardDust = (g.cardDust || 0) + 180;
          if (typeof g.upgradeCardStar === "function") {
            g.upgradeCardStar(g.protagonistId, true);
          }
        },
        end: {
          title: "🏆 QUÁN QUÂN TCG TOÀN VŨ TRỤ — SẴN SÀNG BƯỚC VÀO CÁC BIẾN CỐ MỚI!",
          summary: "+6,000 Credits, +350 Ảnh hưởng, +180 Mảnh Gen & Tăng +1★ Tinh Anh cho Thủ lĩnh của bạn!",
          nextChapter: "ch19_father_problems"
        }
      },
      ch18_honorable_finalist: {
        sector: "outer_layer",
        leftChar: "__PROTAGONIST__", rightChar: "mina", leftMood: "happy", rightMood: "happy",
        speaker: "mina",
        text: (g) => `"Một trận chung kết nghẹt thở tới giây cuối cùng! Dù chưa bước lên ngôi vị cao nhất hôm nay, ${g.getProtagonist().name} vẫn nhận được sự tôn kính tuyệt đối của toàn bộ 8 Phe Phái cùng phần thưởng Á Quân danh giá!"`,
        effects: (g) => {
          g.addRes(g.playerFaction, "credits", 2500);
          g.cardDust = (g.cardDust || 0) + 90;
        },
        end: {
          title: "🥈 Á QUÂN GIẢI ĐẤU TUYỆT ĐỈNH GAIASTRA",
          summary: "+2,500 Credits & +90 Mảnh Gen! Nhấn tiếp để bước vào Chương XIX: Rắc Rối Của Người Cha & Cuộc Nổi Dậy Metallia.",
          nextChapter: "ch19_father_problems"
        }
      }
    }
  },
  {
    id: "ch19_father_problems",
    num: "CHƯƠNG XIX",
    title: "Father's Problems & Biến Cố Metallia",
    subtitle: "Evernight ↔ Đại Công Xưởng Metallia",
    sector: "sol",
    leadChar: "kim",
    summary: "Hande Ersoy sinh con cùng Xal Kor khiến Felicia đối chất cha mình về mộng khôi phục Đế chế Kryptonian. Tại châu Âu, Kim Santos — người thừa kế nhà Santos — dẹp loạn công nhân Metallia để tạo chỗ đứng trong Đế chế Sylvarian.",
    nodes: {
      start: {
        sector: "sol",
        leftChar: "hande", rightChar: "felicia", leftMood: "neutral", rightMood: "tense",
        speaker: "narrator",
        text: "Bế đứa trẻ trên tay, Hande Ersoy nhớ lại đêm định mệnh một năm trước khi báo cáo với Eleanor và gặp Xal Kor. Cánh cửa bật mở — Felicia Laurent bước vào phòng cha mình và chết lặng khi thấy Hande vẫn còn ở đó.",
        next: "ch19_confront"
      },
      ch19_confront: {
        sector: "sol",
        leftChar: "felicia", rightChar: "xalkor", leftMood: "combat", rightMood: "secret",
        speaker: "felicia",
        text: "\"Cha chỉ vừa mới được thả ra thôi đấy, Xal Kor! Cha có định dùng đứa trẻ này để khôi phục Đế chế Kryptonian một lần nữa không?!\"",
        next: "ch19_kim_metallia"
      },
      ch19_kim_metallia: {
        sector: "sol",
        leftChar: "kim", rightChar: "jose", leftMood: "smug", rightMood: "happy",
        speaker: "narrator",
        text: "Cùng lúc đó, Kim Santos được cha là Jose Santos phái tới Đại Công Xưởng Metallia để mở rộng địa bàn và bắt mối ngoại giao với chính quyền Sylvarian — nhưng đoàn của cô bất ngờ rơi thẳng vào giữa cuộc nổi dậy của công nhân nhà máy.",
        choices: [
          {
            label: "⚔️ Trấn áp cuộc nổi dậy Metallia & lập công trước Sylvarian",
            hint: "+2,000 Credits • +100 Ảnh hưởng • Kim Santos mở rộng thế lực tại Đế chế",
            effects: (g) => {
              g.addRes(g.playerFaction, "credits", 2000);
              g.addRes(g.playerFaction, "influence", 100);
              g.addAffinity("kim", 25);
              g.addAffinity("hande", 15);
            },
            battle: {
              playerId: "kim",
              enemyId: "kale",
              stageId: "sol",
              winNext: "ch19_end",
              loseNext: "ch19_end"
            }
          },
          {
            label: "🤝 Điều tra bí mật gia đình Xal Kor – Hande & thu thập tình báo",
            hint: "+200 Nghiên cứu • +25 Độ tin cậy với Hande & Felicia",
            effects: (g) => {
              g.addRes(g.playerFaction, "research", 200);
              g.addAffinity("hande", 25);
              g.addAffinity("felicia", 20);
            },
            next: "ch19_end"
          }
        ]
      },
      ch19_end: {
        sector: "sol",
        leftChar: "kim", rightChar: "hande", leftMood: "happy", rightMood: "happy",
        speaker: "kim",
        text: "\"Thứ vốn chỉ là một chuyến đi ngoại giao cho cha, giờ đã trở thành bàn đạp để chính ta đặt dấu ấn ngay trong lòng lãnh thổ Đế chế Sylvarian.\"",
        end: {
          title: "Hoàn thành Chương XIX — Father's Problems",
          summary: "Đã mở khóa tuyến truyện Kim Santos tại Metallia & Hande Ersoy – Xal Kor. Tiếp theo: Chương XX — Brand New Issue.",
          nextChapter: "ch20_brand_new_issue"
        }
      }
    }
  },
  {
    id: "ch20_brand_new_issue",
    num: "CHƯƠNG XX",
    title: "Brand New Issue: Hang Động Pherone Nexus",
    subtitle: "Global Icon ↔ Hang Ngầm Pregnomorph",
    sector: "sol",
    leadChar: "bryce",
    summary: "Bryce Dallas chiêu mộ Evelina, Grace và Chunlina quay phim tài liệu về hang bí mật của Pregnomorph. Họ ghi được hình ảnh Ovalina trước khi bị truy đuổi; Chunlina tự nguyện ở lại, còn Sharapova dọn bẫy Dream Pig & Tamalin ngoài trực thăng.",
    nodes: {
      start: {
        sector: "sol",
        leftChar: "bryce", rightChar: "evelina", leftMood: "combat", rightMood: "happy",
        speaker: "bryce",
        text: "\"Nghe kỹ đây: hang ngầm Pherone Nexus là điểm mù lớn nhất trên Trái Đất. Chỉ cần quay được bằng chứng bên trong, bộ phim tài liệu này sẽ làm rung chuyển cả Global Icon lẫn Kronea!\"",
        next: "ch20_cave"
      },
      ch20_cave: {
        sector: "sol",
        leftChar: "ovalina", rightChar: "chunliva", leftMood: "smug", rightMood: "tense",
        speaker: "narrator",
        text: "Dưới ánh đèn quay run rẩy, nhóm phóng viên vừa kịp ghi lại bóng dáng cao lớn của Ovalina trước khi hàng đàn Pregnomorph ập tới! Trước lối thoát, Chunlina Wong bất ngờ dừng bước — ký ức xưa cùng pheromone khiến cô chọn ở lại hang sâu.",
        next: "ch20_chopper"
      },
      ch20_chopper: {
        sector: "sol",
        leftChar: "bryce", rightChar: "julia", leftMood: "tense", rightMood: "combat",
        speaker: "julia",
        text: "\"Nhanh lên máy bay! Tôi vừa phải quét sạch hàng tá bẫy của Dream Pigs và Tamalin quanh bãi đáp rồi — nếu Arisia xem được cuốn băng này của cô, Pherone Nexus và Meralina sẽ gặp đại họa đấy, Bryce!\"",
        choices: [
          {
            label: "🎬 Giữ nguyên băng tài liệu & xuất bản trên Global Icon",
            hint: "+2,500 Credits • +120 Ảnh hưởng • Nguy cơ lộ bí mật Pherone Nexus",
            effects: (g) => {
              g.addRes(g.playerFaction, "credits", 2500);
              g.addRes(g.playerFaction, "influence", 120);
              g.addAffinity("bryce", 30);
              g.addTension(10);
            },
            battle: {
              playerId: "bryce",
              enemyId: "ovalina",
              stageId: "sol",
              winNext: "ch20_end",
              loseNext: "ch20_end"
            }
          },
          {
            label: "🔒 Niêm phong đoạn phim về Ovalina để bảo vệ Meralina",
            hint: "+30 Độ tin cậy với Meralina & Ovalina • -5% Căng thẳng",
            effects: (g) => {
              g.addAffinity("meralina", 30);
              g.addAffinity("ovalina", 25);
              g.addTension(-5);
            },
            next: "ch20_end"
          }
        ]
      },
      ch20_end: {
        sector: "sol",
        leftChar: "bryce", rightChar: "grace", leftMood: "smug", rightMood: "happy",
        speaker: "bryce",
        text: "\"Một người đã ở lại dưới lòng đất, nhưng những thước phim này sẽ khiến cả thiên hà phải nhìn lại điều đang ẩn giấu dưới chân Đế chế.\"",
        end: {
          title: "Hoàn thành Chương XX — Brand New Issue",
          summary: "Đã hoàn tất biến cố phim tài liệu Pherone Nexus của Bryce Dallas. Tiếp theo: Chương XXI — Dual War.",
          nextChapter: "ch21_dual_war"
        }
      }
    }
  },
  {
    id: "ch21_dual_war",
    num: "CHƯƠNG XXI",
    title: "Dual War: Chiến Tranh Hai Mặt Trận",
    subtitle: "Salvic Union ↔ Fremde Protectorae",
    sector: "zero",
    leadChar: "sofie",
    summary: "Một ngày trước Quốc khánh Salvic Union, Overlord bất ngờ xâm lược và bắt Sharon Frost; Arisia từ chối cứu viện vì Hiệp ước Cursew, còn Magnatere bị trói tay chỉ gửi được vài sư đoàn tình nguyện. Cùng lúc, Arisia đưa quân vào Fremde Protectorae khiêu khích Ceasaria Kaiser.",
    nodes: {
      start: {
        sector: "zero",
        leftChar: "sofie", rightChar: "overlord", leftMood: "tense", rightMood: "smug",
        speaker: "narrator",
        text: "Chỉ một ngày trước lễ Quốc khánh Salvic Union, Overlord vu khống một nhóm Nadiran đi tìm Aphrodina là kẻ phản bội để chọc thủng biên giới! Tuyến đầu do Sharon Frost trấn giữ sụp đổ và cô bị bắt giữ.",
        next: "ch21_pact_trap"
      },
      ch21_pact_trap: {
        sector: "zero",
        leftChar: "sofie", rightChar: "magnatere", leftMood: "tense", rightMood: "tense",
        speaker: "magnatere",
        text: "\"Arisia viện dẫn Hiệp ước Cursew bí mật để từ chối tham chiến! Điều khoản liên minh ba bên đang khóa tay ta — Nadirius chỉ có thể gửi vài sư đoàn tình nguyện sang tiếp ứng cho cô, Sofie!\"",
        next: "ch21_fremde"
      },
      ch21_fremde: {
        sector: "fremde",
        leftChar: "arisia", rightChar: "ceasaria", leftMood: "smug", rightMood: "combat",
        speaker: "arisia",
        text: "\"Đúng như tính toán: Ceasaria Kaiser nóng nảy đã mắc bẫy ra đòn trước! Toàn quân Sylvarian — tổng phản công vào Fremde Protectorae ngay lập tức!\"",
        choices: [
          {
            label: "⚔️ Ra trận tại chiến tuyến Salvic hoặc Fremde Protectorae",
            hint: "+3,000 Credits • +150 Ảnh hưởng • Khai hỏa Dual War",
            effects: (g) => {
              g.addRes(g.playerFaction, "credits", 3000);
              g.addRes(g.playerFaction, "influence", 150);
              g.addTension(15);
            },
            battle: {
              playerId: "__PROTAGONIST__",
              enemyId: "ceasaria",
              stageId: "fremde",
              winNext: "ch21_end",
              loseNext: "ch21_end"
            }
          }
        ]
      },
      ch21_end: {
        sector: "fremde",
        leftChar: "avalanche", rightChar: "atomina", leftMood: "smug", rightMood: "neutral",
        speaker: "narrator",
        text: "Dư luận Fremde Protectorae nhanh chóng quay lưng với Ceasaria. Ngay cả Atomina Evres và phe Alterian trung lập cũng chuyển sang ủng hộ nhà ngoại giao khôn khéo Avalanche Prine.",
        end: {
          title: "Hoàn thành Chương XXI — Dual War",
          summary: "Cả Salvic Union lẫn Fremde Protectorae đều bốc cháy. Tiếp theo: Chương XXII — Deep Implode & Ký Sinh Trùng Dưới CR 1000.",
          nextChapter: "ch22_deep_implode_change"
        }
      }
    }
  },
  {
    id: "ch22_deep_implode_change",
    num: "CHƯƠNG XXII",
    title: "Deep Implode & Something Change",
    subtitle: "Fremde • Ixalia • Salvic Union • Pháo Đài Western Nadir",
    sector: "western_abyss",
    leadChar: "arisia",
    summary: "Conquistor đánh bại Ceasaria Kaiser; Avalanche Prine cưới Mary và nắm Fremde Protectorae. Ixalcian sáp nhập vào Đế chế; Hyouya đánh lui Cipheron; The Collectors sụp đổ khi Hailey biến mất. Kil Kimius mời quân Sylvarian vào Salvic, còn Overlord bí mật cấy ký sinh trùng bóng tối lên Arisia.",
    nodes: {
      start: {
        sector: "fremde",
        leftChar: "conquistor", rightChar: "mary", leftMood: "combat", rightMood: "neutral",
        speaker: "narrator",
        text: "Bị hội đồng cô lập, Ceasaria Kaiser thất bại trong trận quyết đấu trước Conquistor Claudius và bị giam vào ngục riêng. Avalanche Prine trở thành lãnh đạo mới của Fremde Protectorae và kết hôn cùng Mary Karelia-Batson để giữ yên vùng đệm cho Kronea.",
        next: "ch22_ixalia_salvic"
      },
      ch22_ixalia_salvic: {
        sector: "zero",
        leftChar: "hyouya", rightChar: "kil", leftMood: "combat", rightMood: "secret",
        speaker: "narrator",
        text: "Lo sợ chung số phận, Ixalcian ký hiệp ước sáp nhập trong khi Qiyana bí mật cử Glinda sang Hinata liên minh ngầm với Malocri. Trên mặt trận Salvic, Hyouya dùng kẽ hở hiệp ước đánh lui Cipheron, còn trên Trái Đất, thỏa thuận ngầm giữa Etharos và Mr. Mind khiến Hailey biến mất cùng sự sụp đổ của The Collectors. Lợi dụng bất ổn, Kil Kimius mời quân Sylvarian vào Salvic Union 'gìn giữ hòa bình', đẩy Sofie vào thế hai mặt trận.",
        next: "ch22_parasite"
      },
      ch22_parasite: {
        sector: "western_abyss",
        leftChar: "arisia", rightChar: "overlord", leftMood: "neutral", rightMood: "smug",
        speaker: "overlord",
        text: "\"Ngươi thấy Tsunadia nói đúng chứ, Nữ hoàng? Lạnh lùng bỏ mặc cả người thân Brigitte Grok... Nhưng khoảnh khắc ngươi vừa ngồi xuống chiếc ghế trong pháo đài này, thứ ký sinh trùng bóng tối từ linh hồn phụ thân ta — vô hình với mọi kẻ dưới CR 1000 — đã lặng lẽ bước vào tâm trí và cơ thể ngươi rồi, Arisia!\"",
        choices: [
          {
            label: "⚔️ Quyết chiến định đoạt cục diện Kỷ nguyên Age of Dominion!",
            hint: "+5,000 Credits • +300 Ảnh hưởng • +150 Mảnh Gen",
            effects: (g) => {
              g.addRes(g.playerFaction, "credits", 5000);
              g.addRes(g.playerFaction, "influence", 300);
              g.cardDust = (g.cardDust || 0) + 150;
            },
            battle: {
              playerId: "__PROTAGONIST__",
              enemyId: "overlord",
              stageId: "western_abyss",
              winNext: "ch22_finale",
              loseNext: "ch22_finale"
            }
          }
        ]
      },
      ch22_finale: {
        sector: "western_abyss",
        leftChar: "__PROTAGONIST__", rightChar: "tsunadia", leftMood: "smug", rightMood: "secret",
        speaker: "narrator",
        text: "Một âm mưu xuyên thấu cả ngai vàng Sylvarian đã âm thầm khởi động dưới lòng pháo đài Western Nadir. Mọi quân cờ của Cycle 12: Age of Dominion đều đã vào vị trí cho cuộc đối đầu tối hậu!",
        end: {
          title: "🌌 HOÀN THÀNH TOÀN BỘ 23 CHƯƠNG CANON — AGE OF DOMINION!",
          summary: "Đã cập nhật trọn vẹn cốt truyện từ các file rawdoc (từ Khởi Nguyên tới Dual War, Deep Implode & Something Change)."
        }
      }
    }
  }
];

export const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map(c => [c.id, c]));

// ============================================================================
// HỆ THỐNG ĐỐI THOẠI TƯƠNG TÁC ĐỘNG CHO TẤT CẢ 72 NHÂN VẬT
// Gọi khi người chơi nhấn "💬 Đối thoại" từ Bảng Nhân Vật hoặc Đồn Trú
// ============================================================================
export function buildEncounterScene(charId, gameState) {
  const c = CHAR_BY_ID[charId] || gameState?.hybrids?.find((h) => h.id === charId);
  if (!c) return null;

  const loc = c.loc ? findLocation(c.loc) : null;
  const sectorId = loc?.sector?.id || "sylvalon";
  const fac = FACTIONS[c.fac] || FACTIONS.independent;
  const affinity = gameState.getAffinity(charId);
  const pactLine = gameState.pact.active
    ? "Hiệp ước Cursew giữa Sylvarian và Western Nadir vẫn đang kìm hãm bề nổi."
    : "Hiệp ước Cursew đã đổ vỡ — mọi chiến tuyến đều đang rực lửa.";

  const playerCharId = gameState?.protagonistId || gameState.getChampionForFaction(gameState.playerFaction);
  const hero = CHAR_BY_ID[playerCharId] || gameState?.hybrids?.find((h) => h.id === playerCharId) || CHAR_BY_ID.arisia;
  const sharedRel = [];
  const npcShort = c.name.split(" ")[0];
  const heroShort = hero?.name?.split(" ")[0] || "";
  for (const rel of RELATIONS) {
    for (const item of rel.items || []) {
      if (item.includes(npcShort)) sharedRel.push(`${rel.type}: ${item}`);
    }
  }
  const mutualRel = sharedRel.find((s) => heroShort && s.includes(heroShort));

  // Câu thoại đặc trưng theo nhân vật / phe phái / quan hệ
  const GREETINGS = {
    arisia: `Ta không có thời gian cho lời sáo rỗng. ${pactLine} Ngươi mang tới tin tình báo gì cho Đế chế?`,
    overlord: `Hahaha! Nhìn mặt ngươi kìa. ${gameState.pact.active ? "Arisia quả thật rất thú vị sau màn Gotterfall đó." : "Không còn hiệp ước nào trói được Western Nadir nữa đâu!"}`,
    yulia: `Ta vừa ghi chép xong hồ sơ lịch sử chu kỳ ${gameState.cycleMajor}.${gameState.cycleMinor}. Thật kỳ lạ khi chẳng ai ở Berlidona hiểu câu ví von về Molotov–Ribbentrop của ta.`,
    meralina: `Xuỵt... nói khẽ thôi. Mái tóc đen này chỉ là lớp ngụy trang tạm ở Pherone Nexus. Đừng để tai mắt của Arisia hay April đánh hơi thấy.`,
    ovalina: `Chào mừng tới Pherone Nexus! Ở đây chẳng có luật nào của Sylvarian có hiệu lực cả — chỉ có niềm vui và những thí nghiệm tiến hóa thôi!`,
    uterussa: `Chị Ovalina đang hào hứng với buồng Omni-Womb mới lắm đó! Ngươi muốn xem kích thước thật của Tamarite hay dáng người 1m67?`,
    magnatere: `Đế chế Nadirius coi trọng kỷ luật và danh dự chiến binh. ${gameState.pact.active ? "Chừng nào Arisia còn bắt tay với Overlord, ta chưa thể tin Kronea." : "Cuối cùng thì trật tự cũng sẵn sàng quét sạch hỗn loạn."}`,
    zarcseid: `Ở Predita ta đã giữ được 10 năm với 500 triệu tàn quân. Dù Salvic Union vừa thoát khỏi Reichkomos còn nhiều giới hạn, ý chí Prozonian không bao giờ gãy.`,
    emma: `Đứng từ trung tâm vũ trụ nhìn xuống, mọi cuộc tranh giành 5% hay 70% lãnh thổ đều nhỏ bé lạ thường... miễn là các vị đừng đẩy vũ trụ tới mức cần thêm một lần Reset.`,
    mina: `Ồ, khách quý của Global Icon sao? Đừng nói với bên Sylvarian nhé, nhưng tôi thực sự rất ngưỡng mộ tinh thần hiệp sĩ của người Prozonian đấy.`,
    ojamon: `Đừng nhìn ta với ánh mắt nghi ngờ đó. Pháo Gotterfall lẫn Hiệp ước Cursew đều do một tay ta thiết kế — và kẻ nắm thông tin luôn có đường lui.`,
    veidos: `Kẻ ta trung thành là chiến tuyến Border Division và Ixalcienkorps ở Gandora, không phải những kẻ chỉ biết ngồi trên ngai vàng Kronea phán xét ngoại hình ta.`,
    hyouya: `Ở Nadirius ai cũng nghiêm nghị cả, may mà bệ hạ Magnatere luôn tin tưởng ta. Không biết chị Elita bên Salvic dạo này thế nào rồi...`,
    felicia: `AI Bernice vừa quét xong mật độ năng lượng khu vực. Với tư cách nhà sáng lập The Supers, ta sẽ không để Collectors chạm vào thường dân Evernight!`,
    pussiri: `Nghe kỹ này... đừng nói với ai là tôi kể nhé, nhưng Arisia lúc nào cũng tính chuyện rất xa sau lưng phe Reformists đấy.`,
    tsunadia: `Quân đoàn phân thân của Nadir luôn sẵn sàng tiếp ứng. Đừng xem thường năng lực tái sinh và sinh sản quân lực của hàng ngũ Vực Thẳm.`,
    brigitte: `Đừng nhắc chuyện tướng Zarcseid trước mặt Hội đồng Kronea nhé... nhưng công nhận ông chú Prozonian đó chiến đấu rất có khí chất.`,
    elita: `Chức trách của ta là bảo toàn dòng gen và danh dự Prozonian tại Salvic Union. Hyouya tuy đứng bên kia chiến tuyến Nadirius nhưng mãi là em gái ta.`,
    ragnaroir: `Grrr... Mẹ Meralina ra lệnh bảo vệ nơi này. Nếu ngươi là kẻ thù của Sylvarian hay Nadir, móng vuốt hỗn mang sẽ xé nát bộ bài của ngươi.`,
    carnavex: `Mọi đế chế đều có thời điểm giao chuyển quyền lực. Arisia thông minh, nhưng Tham vọng Kronea đâu chỉ dành cho mỗi nhà Grok.`,
    cipheron: `Thần trí Nadir nhìn thấy mọi mắt xích yếu trên bàn cờ. Sớm thôi, ngay cả Prozonian kiên cường nhất cũng sẽ phải cân nhắc lại liên minh.`,
    bill: `Trong kỷ nguyên thần linh chiến tranh, đồng Credits và lọ Serum Pregnomorph đôi khi xoay chuyển ván cờ còn nhanh hơn cả tàu chiến!`,
    kim: `Cha giao cho tôi mở rộng địa bàn tại Metallia, nhưng tôi sẽ tự mình chứng minh năng lực trước cả nhà Santos lẫn Đế chế Sylvarian.`,
    hande: `Xin chào. Tôi chỉ là Giám sát viên tại Ottomano thôi... nhưng từ sau đêm gặp Xal Kor và sinh ra đứa trẻ, mọi thứ quanh tôi đã phức tạp hơn rất nhiều.`,
    bryce: `Cuốn băng tài liệu về Pherone Nexus này chắc chắn sẽ gây chấn động Global Icon! Chỉ tiếc cho Chunlina đã chọn ở lại dưới hang sâu đó.`
  };

  // Lời chào đặc biệt theo cặp quan hệ canon (ví dụ: Magnatere <-> Hyouya, Xal Kor <-> Hande, Meralina <-> Ragnaroir...)
  const pairKey = [hero.id, c.id].sort().join("|");
  const PAIR_GREETINGS = {
    "hyouya|magnatere": c.id === "hyouya"
      ? `Phu quân Magnatere... Chàng vừa trở về từ nghị sự sao? Đứa trẻ vừa ngủ say rồi. Chàng đừng quá bận lòng vì Hiệp ước Cursew của Arisia — thiếp sẽ luôn đứng bên cạnh chàng và Nadirius!`
      : `Hoàng hậu Hyouya của ta... Nàng vất vả rồi, cả việc chăm con lẫn lần sang Salvic giúp chị Elita. Có nàng bên cạnh, Nadirius mới thực sự là chốn bình yên giữa loạn thế.`,
    "elita|hyouya": c.id === "hyouya"
      ? `Chị Elita! Dù hiệp ước trói tay Magnatere, em vẫn luôn tìm cách sang tiếp viện cho chị ở mặt trận Salvic. Chị phải giữ an toàn nhé!`
      : `Hyouya, em gái... Cảm ơn em đã dùng kẽ hở hiệp ước sang đánh lui Cipheron giúp Salvic. Đừng để Magnatere phải khó xử vì chị.`,
    "jokar|mina": c.id === "mina"
      ? `Jack... à không, anh Jokar yêu quý~ Về nhà rồi thì cởi bỏ lớp vỏ cổ đông Global Icon đi, hôm nay anh muốn 'xả stress' với em theo kiểu Prozonian nào đây?`
      : `Mina bé nhỏ của anh... Hôm nay ở Global Icon lại có tin nóng gì à? Lại đây nào, anh cần giải tỏa căng thẳng một chút.`,
    "avalanche|mary": c.id === "mary"
      ? `Avalanche... Từ ngày rời ghế Phó Tư lệnh Trái Đất để ở bên anh tại Fremde Protectorae, em chưa từng hối hận dù chỉ một giây.`
      : `Mary yêu dấu! Nhờ có nàng ở bên, ngay cả những kẻ Tyranian bảo thủ nhất cũng phải nể trọng cặp đôi lãnh đạo mới của Fremde Protectorae.`,
    "hande|xalkor": c.id === "hande"
      ? `Xal Kor... Đứa trẻ vừa mỉm cười giống hệt anh đấy. Nhưng ánh mắt của Felicia hôm qua vẫn khiến em lo lắng...`
      : `Hande của ta, đừng lo chuyện Felicia. Nàng và đứa bé là khởi đầu mới cho huyết thống Kryptonian của chúng ta.`,
    "felicia|hande": c.id === "hande"
      ? `Felicia... Chị hiểu em sốc khi thấy chị trong phòng cha em, nhưng đứa trẻ này vô tội. Chị không hề muốn tranh giành vị thế của em ở The Supers đâu.`
      : `Hande Ersoy... Tôi vẫn chưa thể tin nổi cha tôi vừa ra tù đã có con với cô. Tốt nhất cô đừng để ông ta kéo vào mưu đồ khôi phục Kryptonian!`,
    "meralina|ragnaroir": c.id === "meralina"
      ? `Ragnaroir ngoan của mẹ... Lại đây nào, ở Pherone Nexus này chẳng có Arisia soi mói đâu, nhưng nhớ đừng để Ovalina nhìn thấy thái độ quá trớn của con đấy~`
      : `Grrr... Mẹ Meralina! Mùi hương của mẹ luôn khiến con phát điên... Bất cứ kẻ nào dám tới gần mẹ, con sẽ xé xác chúng!`,
    "veidos|yulina": c.id === "yulina"
      ? `Veidos? Đừng tưởng vài buổi Couple Events khiến tôi quên mất sự khác biệt tư tưởng giữa chúng ta... nhưng công nhận, đứng cạnh anh trên chiến tuyến cũng không tệ.`
      : `Yulina! Kệ đám quý tộc Kronea nói gì đi — chỉ có trên chiến trường biên giới mới có những kẻ xứng đáng đứng ngang hàng với ta và cô!`,
    "evelina|perplexa": c.id === "evelina"
      ? `Perplexa cưng! Cả Global Icon đang cá cược xem khi nào em chính thức thành 'phu nhân Earth Overlord tương lai' đấy nhé~`
      : `Evelina, đừng nghe mấy lời trêu chọc ở tòa soạn nữa... nhưng nếu là cô, tôi cũng chẳng phiền nếu lời đồn đó thành sự thật đâu.`,
    "arisia|overlord": c.id === "overlord"
      ? `Nữ hoàng Arisia ghé thăm pháo đài của ta sao? Cứ ngồi xuống chiếc ghế kia đi... Ta rất thích sự lạnh lùng của nàng, nhất là khi nàng còn chưa biết điều gì đang chờ đợi.`
      : `Overlord... Đừng quên Hiệp ước Cursew là thứ duy nhất giữ Pháo Gotterfall chưa chĩa thẳng vào đầu ngươi. Ta tới đây chỉ để chốt tình báo biên giới.`,
    "brigitte|zarcseid": c.id === "brigitte"
      ? `Tướng quân Zarcseid~ Sao lúc nào ông chú cũng bận rộn ở Predita thế? Thỉnh thoảng cũng phải để ý tới Brigitte Grok này chứ!`
      : `Tiểu thư Brigitte... Tôi rất trân trọng sự quan tâm của cô, nhưng cuộc chiến tại Predita và Salvic Union chưa cho phép tôi nghĩ tới chuyện riêng.`,
    "ojamon|pussiri": c.id === "pussiri"
      ? `Ojamon~ Đừng lúc nào cũng chỉ coi em như đối tác định kỳ chứ! Lại đây, em vừa nghe được tin mật mới từ phòng riêng của Arisia đấy...`
      : `Pussiri, giữ giọng nhỏ thôi. Ta luôn sẵn sàng 'họp riêng' với cô, miễn là những thông tin cô mang về đủ giá trị.`,
    "jose|kim": c.id === "kim"
      ? `Cha yên tâm, con đã dẹp xong cuộc nổi dậy công nhân ở Metallia rồi. Nhà Santos sẽ có chỗ đứng vững chắc ngay trong lòng Đế chế Sylvarian.`
      : `Làm tốt lắm, Kim! Con gái ta quả nhiên xứng đáng làm người thừa kế đế chế Santos tại Vander.`
  };

  let greeting = PAIR_GREETINGS[pairKey]
    || (mutualRel
      ? `${hero.name} đấy à? (${mutualRel}). Ta là ${c.name} — không ngờ chúng ta lại hội ngộ giữa sóng gió ${pactLine.toLowerCase()}`
      : (GREETINGS[c.id] || (c.fac === "collectors"
        ? `Khu vực Vander và Tokyzhou có quy tắc riêng. Nếu mang đủ lợi ích cho The Collectors, có lẽ Mr. Mind sẽ để ngươi yên.`
        : `Ta là ${c.name} (${c.title || "Hậu duệ thế hệ mới"}), hiện đang đóng tại ${loc ? loc.label : "Gaiastra"}. ${pactLine}`)));

  const secretText = sharedRel.length > 0
    ? `Hồ sơ mật của ${c.name} ghi nhận các mối dây liên hệ đáng chú ý: ${sharedRel.join(" • ")}. Những mắt xích này ảnh hưởng trực tiếp tới cục diện ${fac.name}.`
    : `${c.name} giữ kín hầu hết mạng lưới cá nhân tại ${loc ? loc.label : fac.name}, chỉ hé lộ rằng nội bộ các siêu cường đang âm thầm tích lũy lực lượng trước kỳ biến động tiếp theo.`;

  return {
    id: `enc_${c.id}`,
    num: "ĐỐI THOẠI TƯƠNG TÁC",
    title: `Gặp gỡ ${c.name}`,
    subtitle: `${c.title || "Chiến Binh Gaiastra"} • Độ tin cậy hiện tại: ${affinity}/100`,
    sector: sectorId,
    isEncounter: true,
    nodes: {
      start: {
        sector: sectorId,
        leftChar: playerCharId,
        rightChar: c.id,
        leftMood: "neutral",
        rightMood: affinity >= 40 ? "happy" : "neutral",
        speaker: c.id,
        text: greeting,
        choices: [
          {
            label: `💬 Trao đổi về tiểu sử & năng lực (${c.species}, CR ${c.cr})`,
            hint: "+12 Độ tin cậy • Mở khóa chia sẻ cá nhân",
            effects: (g) => g.addAffinity(c.id, 12),
            next: "enc_lore"
          },
          {
            label: `🕵️ Hỏi sâu về bí mật phe ${fac.name} & quan hệ ngầm`,
            hint: "+150 Nghiên cứu • Hé lộ mạng lưới chính trị trong lore",
            effects: (g) => {
              g.addAffinity(c.id, 8);
              g.addRes(g.playerFaction, "research", 150);
            },
            next: "enc_secrets"
          },
          {
            label: `🎁 Viện trợ trang bị / Quà chiến thuật cho ${c.name}`,
            hint: "+18 Độ tin cậy & +15 Ảnh hưởng (tốn 200 Credits)",
            cond: (g) => (g.resources[g.playerFaction]?.credits || 0) >= 200,
            effects: (g) => {
              g.addRes(g.playerFaction, "credits", -200);
              g.addRes(g.playerFaction, "influence", 15);
              g.addAffinity(c.id, 18);
            },
            next: "enc_gift"
          },
          {
            label: "🤝 Đàm phán hợp tác chiến lược & trao đổi tài nguyên",
            hint: "+350 Credits phe bạn & +8 Quan hệ phe (tốn 25 Ảnh hưởng)",
            cond: (g) => (g.resources[g.playerFaction]?.influence || 0) >= 25,
            effects: (g) => {
              g.addRes(g.playerFaction, "influence", -25);
              g.addRes(g.playerFaction, "credits", 350);
              if (FACTIONS[c.fac]?.playable) g.addRelation(g.playerFaction, c.fac, 8);
              g.addAffinity(c.id, 10);
            },
            next: "enc_deal"
          },
          {
            label: `📖 Mở Cốt Truyện Tâm Sự Riêng & Thề Ước Huyết Thống (${c.name})`,
            hint: `Khám phá chiều sâu nội tâm • Mở khóa Thẻ Bài ${c.name}, +45 Mảnh Gen & +1★ Tinh Anh (khi Tin cậy >= 50)`,
            effects: (g) => {
              g.addAffinity(c.id, 16);
              g.cardDust = (g.cardDust || 0) + 45;
              if (typeof g.unlockCard === "function") g.unlockCard(c.id, 1);
            },
            next: "enc_bond_1"
          },
          {
            label: `⚔️ Thách đấu Thẻ Bài (Bắt & Lai Hàng 2) với ${c.name}!`,
            hint: `Đấu Thẻ Bài 3 Hàng: ${CHAR_BY_ID[playerCharId]?.name || "Tướng"} vs ${c.name} (CR ${c.cr})`,
            battle: {
              playerId: playerCharId,
              enemyId: c.id,
              stageId: sectorId,
              winNext: "enc_duel_win",
              loseNext: "enc_duel_lose"
            }
          },
          {
            label: "↩️ Kết thúc cuộc trò chuyện",
            hint: "Quay lại bản đồ / hồ sơ",
            next: "enc_bye"
          }
        ]
      },
      enc_bond_1: {
        sector: sectorId,
        leftChar: playerCharId,
        rightChar: c.id,
        leftMood: "neutral",
        rightMood: "secret",
        speaker: c.id,
        text: (g) => {
          const aff = g.getAffinity(c.id);
          return `"Ít ai ở ${loc ? loc.label : "Gaiastra"} này hỏi ta thật sự nghĩ gì sau ánh hào quang CR ${c.cr}. Là một ${c.species} thuộc ${fac.name}, mỗi trận chiến trên Hàng 1 và mỗi lần chứng kiến dòng máu lai sinh ra từ Hàng 2 đều nhắc ta rằng: trong Chu Kỳ 12, kẻ đứng một mình sớm muộn cũng bị lịch sử xóa sổ." (Độ tin cậy: ${aff}/100)`;
        },
        next: "enc_bond_2"
      },
      enc_bond_2: {
        sector: sectorId,
        leftChar: playerCharId,
        rightChar: c.id,
        leftMood: "happy",
        rightMood: "happy",
        speaker: c.id,
        text: (g) => {
          const heroName = g.getProtagonist()?.name || "bạn";
          return `"${c.bio || "Ta đã đi qua vô số chiến trường từ sau cuộc Đại Chiến Uniwar."} Nhưng khi đứng cạnh ${heroName}, ta cảm nhận được một trật tự hoàn toàn mới. Dù sắp tới là pháo Gotterfall hay Khe Nứt Vực Thẳm, thẻ bài và sinh mệnh của ${c.name} sẽ luôn sát cánh cùng ngươi!"`;
        },
        choices: [
          {
            label: `🌟 Lập Thề Ước Tinh Anh Cùng ${c.name} (Cường Hóa +1★ Thẻ Bài)`,
            hint: "Tăng +1★ Tinh Anh cho thẻ bài nhân vật này & +100 Ảnh hưởng",
            effects: (g) => {
              g.addAffinity(c.id, 15);
              g.addRes(g.playerFaction, "influence", 100);
              if (typeof g.upgradeCardStar === "function") {
                g.upgradeCardStar(c.id, true);
              }
            },
            next: "enc_bond_vow"
          },
          {
            label: "🤝 Ghi Nhận Tâm Sự & Nhận Thẻ Bài Chiến Thuật",
            hint: "+300 Credits • Đã thêm thẻ bài vào Kho Thẻ",
            effects: (g) => {
              g.addRes(g.playerFaction, "credits", 300);
            },
            next: "enc_lore"
          }
        ]
      },
      enc_bond_vow: {
        sector: sectorId,
        leftChar: playerCharId,
        rightChar: c.id,
        leftMood: "smug",
        rightMood: "happy",
        speaker: c.id,
        text: (g) => `"Khế ước huyết thống và danh dự giữa ta với ${g.getProtagonist()?.name || "ngươi"} đã hoàn tất! Hãy nhìn xem — thẻ bài của ${c.name} vừa thức tỉnh hào quang Tinh Anh ★ mới trên bàn đấu!"`,
        end: {
          title: `🌟 THỀ ƯỚC TINH ANH: ${c.name.toUpperCase()}`,
          summary: `Đã mở khóa Thẻ Bài ${c.name}, +45 Mảnh Gen, +100 Ảnh hưởng & Cường Hóa +1★ Tinh Anh!`
        }
      },
      enc_lore: {
        sector: sectorId,
        leftChar: playerCharId,
        rightChar: c.id,
        leftMood: "happy",
        rightMood: "happy",
        speaker: c.id,
        text: `${c.bio || "Hậu duệ đột biến dòng gen mới."} Kỹ năng sở trường của ta là ${(c.skills || []).join(", ")}. (Độ tin cậy hiện tại: ${Math.min(100, affinity + 12)}/100)`,
        end: {
          title: `Đã gắn kết với ${c.name}`,
          summary: `Độ tin cậy với ${c.name} đã tăng lên. Mối liên hệ tại ${fac.name} được củng cố.`
        }
      },
      enc_secrets: {
        sector: sectorId,
        leftChar: playerCharId,
        rightChar: c.id,
        leftMood: "tense",
        rightMood: "secret",
        speaker: c.id,
        text: secretText,
        end: {
          title: `Giải Mã Tình Báo: ${c.name}`,
          summary: "+150 Nghiên cứu & +8 Độ tin cậy • Đọc thêm hồ sơ quan hệ tại Mục Lục."
        }
      },
      enc_gift: {
        sector: sectorId,
        leftChar: playerCharId,
        rightChar: c.id,
        leftMood: "happy",
        rightMood: "happy",
        speaker: c.id,
        text: `Nguồn tiếp tế và trang bị này rất đúng lúc! Ngươi quả thật biết cách đối nhân xử thế trong thời buổi chiến loạn tại ${loc ? loc.label : "vũ trụ"} này.`,
        end: {
          title: `Gắn Kết Sâu Sắc Với ${c.name}`,
          summary: "+18 Độ tin cậy & +15 Ảnh hưởng."
        }
      },
      enc_deal: {
        sector: sectorId,
        leftChar: playerCharId,
        rightChar: c.id,
        leftMood: "smug",
        rightMood: "happy",
        speaker: c.id,
        text: "Thỏa thuận sòng phẳng đấy. Một phần tuyến tiếp tế và thông tin hậu cần đã được chuyển về kho tài nguyên của phe bạn.",
        end: {
          title: "Giao Dịch Thành Công",
          summary: "+350 Credits và cải thiện quan hệ ngoại giao."
        }
      },
      enc_duel_win: {
        sector: sectorId,
        leftChar: playerCharId,
        rightChar: c.id,
        leftMood: "smug",
        rightMood: "tense",
        speaker: c.id,
        text: "Thực lực đáng nể! Trận giao hữu vừa rồi khiến ta phải đánh giá lại sức mạnh của phe bạn.",
        effects: (g) => {
          g.addAffinity(c.id, 15);
          g.addRes(g.playerFaction, "influence", 60);
        },
        end: {
          title: `Thắng Giao Hữu Trước ${c.name}`,
          summary: "+60 Ảnh hưởng, +15 Độ tin cậy."
        }
      },
      enc_duel_lose: {
        sector: sectorId,
        leftChar: playerCharId,
        rightChar: c.id,
        leftMood: "tense",
        rightMood: "smug",
        speaker: c.id,
        text: `Vẫn còn chênh lệch đấy — nhưng tinh thần chiến đấu không tệ chút nào. Khi nào mạnh hơn hãy tìm ta tại ${loc ? loc.label : "khu vực này"} nhé.`,
        effects: (g) => g.addAffinity(c.id, 5),
        end: {
          title: "Kết Thúc Trận Giao Hữu",
          summary: "+5 Độ tin cậy qua giao chiến."
        }
      },
      enc_bye: {
        sector: sectorId,
        leftChar: playerCharId,
        rightChar: c.id,
        leftMood: "neutral",
        rightMood: "neutral",
        speaker: "narrator",
        text: `Bạn tạm biệt ${c.name} và trở lại phòng chỉ huy chiến lược.`,
        end: {
          title: "Kết thúc đối thoại",
          summary: "Đã trở về trạng thái tự do."
        }
      }
    }
  };
}
