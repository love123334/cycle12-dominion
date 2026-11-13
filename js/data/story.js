// ============================================================================
// CYCLE 12: INTERACTIVE VISUAL NOVEL ENGINE DATA (js/data/story.js)
// 6 Chương Cốt Truyện Tương Tác Chính Thức + Đối Thoại Động cho 72 Nhân Vật
// Bám sát 100% lore hậu Reset & thời kỳ Hiệp ước Cursew Pact.
// ============================================================================

import { CHAR_BY_ID } from "./characters.js";
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
        text: (g) => `"Tầm nhìn tuyệt vời đấy, ${g.getProtagonist().name}! Khi kết hợp tinh hoa huyết thống của 15 chủng tộc tại Phòng Lab Lai Tạo Gen, ngươi sẽ tạo ra những lá bài Hậu Duệ không ai cản nổi!"`,
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
            ? `"Ta cảm nhận rõ ${hybridsCount} dòng gen lai thế hệ mới mà ngươi đã tạo! Năng lượng cộng hưởng giữa các chủng tộc là thứ duy nhất có thể áp chế bóng tối nơi Vực Thẳm này."`
            : `"Khe nứt này hấp thụ mọi đòn pháo truyền thống! Chỉ có những dòng gen hợp nhất từ Phòng Lab Lai Tạo hoặc một trận quyết đấu chiến thuật cực hạn mới đẩy lùi được lũ Starro & Ravenous."`;
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
          summary: "+5,000 Credits • +300 Ảnh hưởng • Hoàn thành toàn bộ 11 Chương Cốt Truyện!"
        }
      },
      ch10_horizon: {
        sector: "predita",
        leftChar: "__PROTAGONIST__", rightChar: "zarcseid", leftMood: "happy", rightMood: "happy",
        speaker: "narrator",
        text: (g) => `Với tài trí của ${g.getProtagonist().name}, mọi phe phái từ Sylvarian, Nadirius đến Salvic Union đều hạ vũ khí đặt nền móng cho Liên Minh Bình Minh Chu Kỳ 13. Căng thẳng ngân hà giảm -40%!`,
        end: {
          title: "ĐẠI KẾT CỤC B: CHÂN TRỜI HÒA BÌNH GAIASTRA",
          summary: "-40% Căng thẳng • +400 Ảnh hưởng • Hoàn thành trọn vẹn Age of Dominion!"
        }
      },
      ch10_ascension: {
        sector: "outer_layer",
        leftChar: "__PROTAGONIST__", rightChar: "emma", leftMood: "happy", rightMood: "happy",
        speaker: "emma",
        text: (g) => `"Không thể tin được... ${g.getProtagonist().name} đã đánh bại cả Hội Đồng Outer Layer trong trận quyết đấu! Giao thức Reset vĩnh viễn được chuyển giao cho ngươi!"`,
        end: {
          title: "ĐẠI KẾT CỤC S+: CHỦ NHÂN VĨNH HẰNG CỦA ĐA VŨ TRỤ",
          summary: "Bạn đã chinh phục đỉnh cao nhất của Cycle 12: Age of Dominion!"
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
  const c = CHAR_BY_ID[charId];
  if (!c) return null;

  const loc = findLocation(c.loc);
  const sectorId = loc?.sector?.id || "sylvalon";
  const fac = FACTIONS[c.fac] || FACTIONS.independent;
  const affinity = gameState.getAffinity(charId);
  const pactLine = gameState.pact.active
    ? "Hiệp ước Cursew giữa Sylvarian và Western Nadir vẫn đang kìm hãm bề nổi."
    : "Hiệp ước Cursew đã đổ vỡ — mọi chiến tuyến đều đang rực lửa.";

  // Câu thoại đặc trưng theo nhân vật / phe phái
  let greeting = "";
  if (c.id === "arisia") {
    greeting = `Ta không có thời gian cho lời sáo rỗng. ${pactLine} Ngươi mang tới tin tình báo gì cho Đế chế?`;
  } else if (c.id === "overlord") {
    greeting = `Hahaha! Nhìn mặt ngươi kìa. ${gameState.pact.active ? "Arisia quả thật rất thú vị sau màn Gotterfall đó." : "Không còn hiệp ước nào trói được Western Nadir nữa đâu!"}`;
  } else if (c.id === "yulia") {
    greeting = `Ta vừa ghi chép xong hồ sơ lịch sử chu kỳ ${gameState.cycleMajor}.${gameState.cycleMinor}. Thật kỳ lạ khi chẳng ai ở Berlidona hiểu câu ví von về Molotov–Ribbentrop của ta.`;
  } else if (c.id === "meralina") {
    greeting = `Xuỵt... nói khẽ thôi. Mái tóc đen này chỉ là lớp ngụy trang tạm ở Pherone Nexus. Đừng để tai mắt của Arisia hay April đánh hơi thấy.`;
  } else if (c.id === "ovalina") {
    greeting = `Chào mừng tới Pherone Nexus! Ở đây chẳng có luật nào của Sylvarian có hiệu lực cả — chỉ có niềm vui và những thí nghiệm tiến hóa thôi!`;
  } else if (c.id === "magnatere") {
    greeting = `Đế chế Nadirius coi trọng kỷ luật và danh dự chiến binh. ${gameState.pact.active ? "Chừng nào Arisia còn bắt tay với Overlord, ta chưa thể tin Kronea." : "Cuối cùng thì trật tự cũng sẵn sàng quét sạch hỗn loạn."}`;
  } else if (c.id === "zarcseid") {
    greeting = `Ở Predita ta đã giữ được 10 năm với 500 triệu tàn quân. Dù Salvic Union vừa thoát khỏi Reichkomos còn nhiều giới hạn, ý chí Prozonian không bao giờ gãy.`;
  } else if (c.id === "emma") {
    greeting = `Đứng từ trung tâm vũ trụ nhìn xuống, mọi cuộc tranh giành 5% hay 70% lãnh thổ đều nhỏ bé lạ thường... miễn là các vị đừng đẩy vũ trụ tới mức cần thêm một lần Reset.`;
  } else if (c.id === "mina") {
    greeting = `Ồ, khách quý của Global Icon sao? Đừng nói với bên Sylvarian nhé, nhưng tôi thực sự rất ngưỡng mộ tinh thần hiệp sĩ của người Prozonian đấy.`;
  } else if (c.id === "ojamon") {
    greeting = `Đừng nhìn ta với ánh mắt nghi ngờ đó. Pháo Gotterfall lẫn Hiệp ước Cursew đều do một tay ta thiết kế — và kẻ nắm thông tin luôn có đường lui.`;
  } else if (c.id === "veidos") {
    greeting = `Kẻ ta trung thành là chiến tuyến Border Division và Ixalcienkorps ở Gandora, không phải những kẻ chỉ biết ngồi trên ngai vàng Kronea phán xét ngoại hình ta.`;
  } else if (c.id === "hyouya") {
    greeting = `Ở Nadirius ai cũng nghiêm nghị cả, may mà bệ hạ Magnatere luôn tin tưởng ta. Không biết chị Elita bên Salvic dạo này thế nào rồi...`;
  } else if (c.id === "felicia") {
    greeting = `AI Bernice vừa quét xong mật độ năng lượng khu vực. Với tư cách nhà sáng lập The Supers, ta sẽ không để Collectors chạm vào thường dân Evernight!`;
  } else if (c.id === "pussiri") {
    greeting = `Nghe kỹ này... đừng nói với ai là tôi kể nhé, nhưng Arisia lúc nào cũng tính chuyện rất xa sau lưng phe Reformists đấy.`;
  } else if (c.fac === "collectors") {
    greeting = `Khu vực Vander và Tokyzhou có quy tắc riêng. Nếu mang đủ lợi ích cho The Collectors, có lẽ Mr. Mind sẽ để ngươi yên.`;
  } else {
    greeting = `Ta là ${c.name} (${c.title}), hiện đang đóng tại ${loc ? loc.label : c.loc}. ${pactLine}`;
  }

  const playerCharId = gameState.getChampionForFaction(gameState.playerFaction);

  return {
    id: `enc_${c.id}`,
    num: "ĐỐI THOẠI TƯƠNG TÁC",
    title: `Gặp gỡ ${c.name}`,
    subtitle: `${c.title} • Độ tin cậy hiện tại: ${affinity}/100`,
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
            label: `⚔️ Thách đấu Thẻ Bài giao hữu với ${c.name}!`,
            hint: `Đấu Thẻ Bài: ${CHAR_BY_ID[playerCharId]?.name || "Tướng"} vs ${c.name} (CR ${c.cr})`,
            battle: {
              playerId: playerCharId,
              enemyId: c.id,
              stageId: sectorId,
              winNext: "enc_duel_win",
              loseNext: "enc_duel_lose"
            }
          },
          {
            label: `🧬 Mời ${c.name} tới Phòng Lab Lai Tạo Gen`,
            hint: "Mở buồng hợp nhất huyết thống với nhân vật này làm Gen mục tiêu!",
            breedTargetId: c.id,
            next: "enc_breed"
          },
          {
            label: "↩️ Kết thúc cuộc trò chuyện",
            hint: "Quay lại bản đồ / hồ sơ",
            next: "enc_bye"
          }
        ]
      },
      enc_lore: {
        sector: sectorId,
        leftChar: playerCharId,
        rightChar: c.id,
        leftMood: "happy",
        rightMood: "happy",
        speaker: c.id,
        text: `${c.bio} Kỹ năng sở trường của ta là ${(c.skills || []).join(", ")}. (Độ tin cậy hiện tại: ${Math.min(100, affinity + 12)}/100)`,
        end: {
          title: `Đã gắn kết với ${c.name}`,
          summary: `Độ tin cậy với ${c.name} đã tăng lên. Mối liên hệ tại ${fac.name} được củng cố.`
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
      enc_breed: {
        sector: sectorId,
        leftChar: playerCharId,
        rightChar: c.id,
        leftMood: "happy",
        rightMood: "smug",
        speaker: c.id,
        text: `Thử nghiệm hợp nhất gen sao? Dòng máu ${c.species} của ta chắc chắn sẽ tạo nên hậu duệ đột biến ấn tượng cho bộ bài của ngươi đấy!`,
        end: {
          title: `Đã Đưa ${c.name} Vào Phòng Lab Gen`,
          summary: "Chuyển sang tab 🧬 Lai Tạo để chọn Gen ghép cặp & Xúc tác!"
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
