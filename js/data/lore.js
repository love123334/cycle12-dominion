// ============================================================================
// CYCLE 12: AGE OF DOMINION — LORE CHUẨN HÓA (v2)
// Nguồn: rawdoc/Age of Dominion.docx, rawdoc/Main Female Characters.docx
// Quy ước: mục nào lore gốc không nói rõ được gắn cờ `inferred: true`
// và hiển thị nhãn "Suy luận" trong game, thay vì bịa thành canon.
// ============================================================================

export const META = {
  title: "CYCLE 12: AGE OF DOMINION",
  subtitle: "Kỷ nguyên hậu Reset • Thời kỳ Hiệp ước Cursew",
  intro:
    "Sau Cycle 11: New Order, trật tự vũ trụ lại dịch chuyển. Kelvos chính thức về hưu cùng Diana; Virile và Sabrina du hành đa vũ trụ; Gold và Megan rời sang chiều không gian riêng. Magnatere cùng Hyouya cai trị Đế chế Nadirius ổn định, còn Overlord (đã hồi sinh) dẫn dắt Western Nadir hỗn loạn và hiếu chiến. Salvic Union thoát khỏi hệ thống Reichkomos dù vẫn bị giới hạn, trong khi Prussireich tìm cách đòi lại độc lập."
};

// --------------------------------------------------------------------------
// CÁC CƯỜNG QUỐC (playable) + NHÓM PHỤ
// territory: tỷ lệ lãnh thổ vũ trụ theo lore (Sylvarian 70 / Eris 15 / 5-5-5)
// --------------------------------------------------------------------------
export const FACTIONS = {
  sylvarian: {
    id: "sylvarian", name: "Đế chế Sylvarian", short: "Sylvarian", playable: true,
    leader: "Nữ hoàng Arisia Grok", capitalCity: "kronea", color: "#38bdf8", territory: 70,
    tech: "SSS", physic: "SSS",
    doctrine: "Bá quyền tối thượng: mở rộng, siết chặt nội bộ, sẵn sàng dùng vũ khí cấp tuyệt chủng.",
    superweapons: ["gotterfall", "schwarzbruch"],
    desc: "Sau 1000 năm chinh phạt, Đế chế nắm khoảng 70% vũ trụ (gồm các Reichkomos và Fremde Protectorae). Dưới Arisia, Đế chế đã xóa sổ một đạo quân Western Nadir bằng Pháo Gotterfall và Bom Schwarzbruch, rồi ký Hiệp ước Cursew với chính Overlord. Mâu thuẫn nội bộ: phái Reformists, vùng tự trị Prussireich, và Malocri tự xưng Hoàng đế Hinatian.",
    sub: ["Lõi Đế chế (Arisia)", "Reformists (Malocri, Pussiri, Yulina, Dejaylah, Ojamon)", "Prussireich (tự trị)", "Reichkomos Hinatiene", "Reichkomos Prozone", "Ixalcienkorps", "Fremde Protectorae", "Đặc khu Trái Đất"]
  },
  eris: {
    id: "eris", name: "Eris Union", short: "Eris", playable: true,
    leader: "Đại sứ Emma Illumis (đại diện)", capitalCity: "eris_core", color: "#facc15", territory: 15,
    tech: "SSS+", physic: "C+",
    doctrine: "Quan sát từ trần nhà vũ trụ; can thiệp giới hạn để giữ trật tự trong tầm kiểm soát.",
    superweapons: ["chaos_lock"],
    desc: "Chủng tộc thông minh nhất vũ trụ, chủ thể của cuộc Reset dòng thời gian. Sau Reset, họ rút về giữ 15% trung tâm vũ trụ cùng cổng đa vũ trụ ở Outer Layer, không đòi lại tỷ lệ lãnh thổ đế quốc cũ. Sự hiện diện của họ là 'trần nhà' lặng lẽ phía trên mọi cường quốc khác."
  },
  nadirius: {
    id: "nadirius", name: "Đế chế Nadirius", short: "Nadirius", playable: true,
    leader: "Magnatere & Hoàng hậu Hyouya", capitalCity: "nadirius_citadel", color: "#a855f7", territory: 5,
    tech: "S", physic: "SSS",
    doctrine: "Kiểm soát lãnh thổ ổn định, bành trướng có tính toán.",
    superweapons: ["rachnitere"],
    desc: "Nhánh Nadir kỷ luật. Magnatere từng liên minh với Kelvos và Prozonian để hạ Overlord; ông coi Hiệp ước Cursew là sự phản bội, vì Hiệp ước Uni vốn được lập ra để nhốt Overlord và đã được trả giá bằng một cuộc chiến Magnatere thắng."
  },
  western_nadir: {
    id: "western_nadir", name: "Western Nadir", short: "W. Nadir", playable: true,
    leader: "Overlord", capitalCity: "western_abyss", color: "#ef4444", territory: 5,
    tech: "A (ma thuật sinh học)", physic: "SSS+",
    doctrine: "Hỗn loạn và xâm lăng: học thuyết 'cổng xâm nhiễm'.",
    superweapons: ["infestation_gate"],
    desc: "Nhánh Nadir hỗn loạn dưới quyền Overlord đã hồi sinh. Liên tục thử thách biên giới cho tới khi bị Arisia xóa sổ một đạo quân. Ấn tượng trước màn thị uy đó, Overlord đề xuất Hiệp ước Cursew và lần đầu có được thứ mà chính sách phong tỏa luôn từ chối hắn: tính chính danh."
  },
  salvic: {
    id: "salvic", name: "Salvic Union", short: "Salvic", playable: true,
    leader: "Hội đồng Salvic (Tướng Zarcseid Copilus)", capitalCity: "zero", color: "#818cf8", territory: 5,
    tech: "S", physic: "SS+",
    doctrine: "Bảo vệ nền độc lập vừa giành được; giữ thế cân bằng giữa các cường quốc.",
    superweapons: ["predita_veterans"],
    desc: "Phần còn lại của Liên bang Prozonian sau khi bị Sylvarian chia cắt. Salvic Union đã thoát khỏi hệ thống Reichkomos và tuyên bố độc lập dù vẫn bị giới hạn. Họ coi Hiệp ước Cursew là mối đe dọa trực tiếp tới thế cân bằng đã cho phép họ tồn tại.",
    inferredNote: "Lore không nêu tên nguyên thủ Salvic Union; Zarcseid được dùng làm đại diện quân sự."
  },
  tamarite: {
    id: "tamarite", name: "Tamarite & Pherone Nexus", short: "Tamarite", playable: false,
    leader: "Ovalina Perfectbrood (Pherone Nexus)", capitalCity: "pherone_nexus", color: "#f472b6", territory: 0,
    desc: "Tamarite chưa tuyệt chủng: họ rời bỏ vũ trụ vì chán. Chưa từng thua một cuộc chiến nào; Sylvarian đã thách thức họ ba lần và thua cả ba. Quy tắc cũ vẫn đứng vững: không ai muốn sống mà lại khiêu khích họ trực tiếp. Pherone Nexus trên Trái Đất là nơi Ovalina che chở Meralina."
  },
  collectors: {
    id: "collectors", name: "The Collectors", short: "Collectors", playable: false,
    leader: "Mr. Mind", capitalCity: null, color: "#fb923c", territory: 0,
    desc: "Phản diện chính trên Trái Đất: liều lĩnh và mất kiểm soát. Lãnh đạo: Mr. Mind; nhóm thợ săn nòng cốt: Parasoid, Exorotic, Eremite, Kale Vayne. Vị trí căn cứ chưa được lore xác định."
  },
  independent: {
    id: "independent", name: "Độc lập / Trung lập", short: "Độc lập", playable: false,
    leader: "—", capitalCity: null, color: "#94a3b8", territory: 0,
    desc: "Các cá nhân và tổ chức không thuộc cường quốc nào: Future Corp, Wombiote, Tyranian, Alterian, thực thể chiều không gian khác."
  }
};

export const PLAYABLE = ["sylvarian", "eris", "nadirius", "western_nadir", "salvic"];

// --------------------------------------------------------------------------
// SIÊU VŨ KHÍ / NĂNG LỰC CHIẾN LƯỢC
// --------------------------------------------------------------------------
export const SUPERWEAPONS = {
  gotterfall: { name: "Pháo Gotterfall", owner: "sylvarian", cost: 900, cooldown: 4, power: 0.55, tension: 18,
    desc: "Vũ khí chùm sáng do Ojamon Cursew phát triển. Đánh sập phần lớn phòng thủ của một khu vực." },
  schwarzbruch: { name: "Bom Schwarzbruch", owner: "sylvarian", cost: 1400, cooldown: 6, power: 0.85, tension: 30,
    desc: "Điện tích kỳ dị: xóa sạch mọi thứ còn sống sót sau đợt nổ đầu tiên." },
  chaos_lock: { name: "Phong Ấn Chaos", owner: "eris", cost: 1100, cooldown: 5, power: 0.0, freeze: 2, tension: 8,
    desc: "Eris Union khóa một khu vực: không phe nào hành quân vào/ra trong 2 chu kỳ." },
  rachnitere: { name: "Bầy Rachnitere", owner: "nadirius", cost: 700, cooldown: 3, power: 0.35, tension: 10,
    desc: "Hàng tỷ Rachnitere tuân lệnh Magnatere tràn vào phòng tuyến địch." },
  infestation_gate: { name: "Cổng Xâm Nhiễm", owner: "western_nadir", cost: 800, cooldown: 3, power: 0.4, tension: 14,
    desc: "Mở cổng Nadir ngay trong lãnh thổ địch, làm mất ổn định nghiêm trọng." },
  predita_veterans: { name: "Cựu binh Predita", owner: "salvic", cost: 600, cooldown: 3, power: 0.0, fortify: 0.6, tension: 2,
    desc: "Tinh thần 'Phép màu Predita': tăng mạnh phòng thủ một khu vực của Salvic." }
};

// --------------------------------------------------------------------------
// CHỦNG TỘC (đã bỏ các chi tiết không phù hợp, giữ thông tin sức mạnh/xã hội)
// --------------------------------------------------------------------------
export const SPECIES = [
  { id: "tamarite", name: "Tamarite", physic: "SSS+", tech: "SSS-", pop: "Rải rác (đã rời đi)", color: "#f472b6",
    traits: "Hấp thụ hyper-photon: sức mạnh, tốc độ, bay, bất khả xâm phạm, thể lực vô hạn, bất tử, phản ma thuật. 'Pháo có thể trượt, nắm đấm Tamarite thì không.' Chia 4 thế hệ: 1 (huyền thoại tối thượng), 2 (cứu tinh vũ trụ), 3 (Vagina Clitoris), 4 (tách thành Synthesis do Sylvarian tạo và Original). Thế hệ 1 & 2 có năng lực tái lập thực tại." },
  { id: "erisian", name: "Erisian", physic: "C+", tech: "SSS+", pop: "25 tỷ", color: "#facc15",
    traits: "Trí tuệ cao nhất vũ trụ, 'Kẻ Kiến Tạo Thế Giới'. Cư dân gốc của Eris — hành tinh lùn bị Mặt Trời bắt giữ sau Thảm họa Chaos Power. Một trong những chủng tộc cổ nhất, cùng thời với Tamarite." },
  { id: "sylvarian", name: "Sylvarian", physic: "SSS", tech: "SSS", pop: "~55 tỷ", color: "#38bdf8",
    traits: "Tia mắt cực hạn, bay, siêu sức mạnh và sức bền, kiêu ngạo. Tự xưng chủng tộc tối thượng; càng già càng mạnh, không giới hạn (nhưng không đuổi kịp Tamarite)." },
  { id: "prozonian", name: "Prozonian", physic: "SS+", tech: "S", pop: "~108 tỷ", color: "#818cf8",
    traits: "Giảm 80% sát thương nguyền, siêu sức mạnh, thân sắt, bay, mắt tinh vân tím, quy tắc danh dự hiệp sĩ." },
  { id: "bolshevian", name: "Bolshevian", physic: "A+", tech: "SS+", pop: "~78 tỷ", color: "#dc2626",
    traits: "Cùng gốc Prozonian nhưng tiến hóa khác: liên kết tâm trí, lực tâm linh, siêu sức mạnh, thân sắt, bay." },
  { id: "pregnomorph", name: "Pregnomorph", physic: "S+", tech: "B", pop: "~37 tỷ", color: "#c084fc",
    traits: "Sinh vật do Erisian tạo ra thời cổ, tiến hóa trên Trái Đất hàng triệu năm. Khả năng sinh học thích nghi liên loài; từng góp phần vào sự sụp đổ của Đế chế Erisian cũ qua đợt bùng phát vũ khí sinh học đi kèm Thảm họa Chaos Power." },
  { id: "hinatian", name: "Hinatian", physic: "SS", tech: "B+", pop: "29 tỷ", color: "#06b6d4",
    traits: "'Tamarite bản nhẹ': giống người, máu xanh, chuyển ma thuật thành sức mạnh vật lý, bay, thân sắt, tuổi thọ triệu năm. Cựu thuộc địa Erisian, từ bỏ công nghệ sau Thảm họa Chaos Power, thờ phụng Tamarite và sống biệt lập. Ít chịu ảnh hưởng từ năng lực đồng hóa của Nadir." },
  { id: "alterian", name: "Alterian", physic: "A", tech: "A+", pop: "6 tỷ", color: "#fb7185",
    traits: "Chủng tộc từ trước Kỷ Gaiastra, sống trên Altera. Điều khiển mật độ & nguyên tử, bay, tự tái sinh. Theo đuổi vũ trụ cân bằng; đồng minh tự nhiên của Prozonian. Thuộc Fremde Protectorae." },
  { id: "tyranian", name: "Tyranian", physic: "SSS-", tech: "B", pop: "8 tỷ", color: "#a8a29e",
    traits: "Từ trước Kỷ Gaiastra, cao trung bình hơn 3m, lối sống man dã, bài công nghệ và bài giao thoa liên loài. Có thể đấu ngang Tamarite trung bình trong thời gian ngắn trước khi cạn sức. Trung lập nhưng chống Sylvarian. Thuộc Fremde Protectorae." },
  { id: "ixalcian", name: "Ixalcian", physic: "B+", tech: "S-", pop: "13 tỷ", color: "#10b981",
    traits: "Sống ở hệ Ixalia gần rìa vũ trụ; hậu duệ xa của các nhà thám hiểm Sylvarian + Prozonian trước chiến tranh (6% gen Prozonian, 2% Sylvarian). Hạm đội tàu chiến lớn nhất và nhiều mỏ khoáng sản. Thuộc Ixalcienkorps, phụ trách khai khoáng & vận tải." },
  { id: "wombiote", name: "Wombiote", physic: "B–A", tech: "Sinh học", pop: "~90 tỷ (trôi dạt)", color: "#e879f9",
    traits: "Sinh vật dạng slime, hậu duệ của nữ thần Tamarite Cunthena Clitoris, phân tán khi Tamarikas biến mất. Phần lớn sống trong tàn tích Eris. Cộng sinh với vật chủ và ban buff vĩnh viễn. Sợ Tamarite. Kẻ thù truyền kiếp của Starrer." },
  { id: "tamalin", name: "Tamalin & Mitalin", physic: "A – S", tech: "C", pop: "50.000 (Trái Đất)", color: "#f9a8d4",
    traits: "Trốn khỏi Tamarikas tới Trái Đất, sống ẩn tại Uter Town Remnant. Tamalin: 1/8 sức mạnh Tamarite, ma thuật khống chế tâm trí. Mitalin: 1/3 sức mạnh Tamarite, kháng vật lý cực cao." },
  { id: "predita_fauna", name: "Roarinian & Paraloxcum", physic: "B+", tech: "Sinh học", pop: "~7,1 tỷ (Predita)", color: "#84cc16",
    traits: "Hệ sinh thái nguy hiểm của Predita: Roarinian là côn trùng cỡ người có ý thức tổ ong, dùng pheromone khống chế; Paraloxcum là sên tiết enzyme gây tê liệt (loại trắng sạch và loại xanh nhiễm ký sinh)." },
  { id: "nadir_fauna", name: "Sinh vật Nadir", physic: "A – S", tech: "Tâm linh / Sinh học", pop: "Hàng tỷ", color: "#ef4444",
    traits: "Các loài từ chiều Nadir: Dream Pig (lợn tâm linh), Nadiran (ngựa trí tuệ cao, di chuyển được trong không gian), Starrer (sao biển khổng lồ ý thức tổ ong, lớn nhất 3000km; vô hiệu với Tamarite và CR 800+), Spirit Squid (ký sinh não; vô hiệu với loài Nadir và CR 300+, bị Sylvarian dùng thử nghiệm để khống chế tù nhân), Rachnitere (nhện cỡ chó, tuân lệnh Magnatere), Dolpharnice (ký sinh nhiều giai đoạn)." },
  { id: "natheron", name: "Virus Natheron", physic: "—", tech: "Sinh học", pop: "Bị phong tỏa", color: "#22c55e",
    traits: "Virus của Nadir, vô hiệu với CR 800+ và sinh vật gốc Nadir; đồng hóa các loài còn lại (da sẫm cứng như đá, lõi đầu đen, CR cố định 600, dấu hiệu xanh neon). Bị Eris Union phong tỏa từ khi Tamarite thế hệ 1 tiêu diệt chúng và trao mẫu cho Erisian." }
];

// --------------------------------------------------------------------------
// DÒNG THỜI GIAN
// --------------------------------------------------------------------------
export const TIMELINE = [
  { era: "Tiền Reset", title: "Đế chế Erisian", text: "Erisian tiếp cận Chaos Power sớm, kiểm soát ~30% vũ trụ. Luôn giữ quan hệ tốt với Tamarite: lần đầu đến Tamarikas họ đã biết mình đang đối diện 'Thần của các Thần', và đặt trạm đại sứ tại đó." },
  { era: "Tiền Reset", title: "Karion thống nhất Sylvarian", text: "Karion thống nhất các quốc gia rời rạc để chống Đế chế Erisian. Sau 7 năm hòa và thua, Thảm họa Chaos Power cùng đợt bùng phát Pregnomorph xóa sổ phần lớn Erisian. Karion không truy sát mà lập Eriskraft che chở họ. Chính sách 'không bao giờ tấn công kẻ bất khả chiến bại' và 'tối đa thương mại, tối thiểu chiến tranh' kéo dài suốt triều đại 1 triệu năm." },
  { era: "Tiền Reset", title: "Triều Caranter", text: "Xóa bỏ chính sách của Karion, bóp chết Eriskraft, tuyên chiến với Tamarite (thua 3 lần) và mọi bên khác, buộc Liên bang Prozonian trỗi dậy thành siêu cường thứ hai. Dù vậy Sylvarian đạt lãnh thổ lớn nhất lịch sử." },
  { era: "Tiền Reset", title: "Kelvos lên ngôi", text: "Cuối triều Caranter khủng hoảng: Meralina bị lưu đày sau bê bối, Veidos ở biên giới. Kelvos cùng Arisia và Etharos khôi phục Thử Thách Ngai Vàng, hành quân về Kronea với 30 tỷ người ủng hộ và đánh bại Hoàng đế." },
  { era: "Tiền Reset", title: "Uniwar & Reset", text: "Sylvarian hấp thụ toàn bộ Liên bang Prozonian; Ixalcian bị kiểm soát hoàn toàn. Eris Union trỗi dậy lại thành siêu cường nhưng rồi bị mọi phe quay lưng — họ kết luận vấn đề nằm ở chính vòng lặp, và Reset dòng thời gian." },
  { era: "Hậu Reset", title: "Eris Union rút về trung tâm", text: "Eris Union quay về trước đòn đánh ban đầu vào Sylvarian của Karion Yuga, rời bỏ gần như toàn bộ vũ trụ, chỉ giữ 15% trung tâm và cổng đa vũ trụ. Họ duy trì Eriskraft đủ lâu để Sylvarian có lợi thế công nghệ rồi để nó phai nhạt." },
  { era: "Hậu Reset", title: "Prussireich ra đời", text: "Cuộc thống nhất của Karion khó khăn và lâu hơn, sinh ra những vùng tự trị cao như Prussireich. Triều Caranter cố đàn áp tàn bạo nhưng không xóa được quyền tự trị đó." },
  { era: "Hậu Reset", title: "Overlord bị tiêu diệt — rồi hồi sinh", text: "Kelvos, Liên bang Prozonian và Magnatere liên minh giết Overlord; lần này Kelvos không bị thương nên có thêm vài năm ổn định để chuyển giao cho Arisia. Overlord sau đó hồi sinh, khôi phục Western Nadir thành lực lượng độc lập hiếu chiến." },
  { era: "Hậu Reset", title: "Salvic Union độc lập", text: "Prozonian bị đánh bại và chia cắt, nhưng Salvic Union thoát khỏi hệ thống Reichkomos và tuyên bố độc lập dù còn bị giới hạn." },
  { era: "Cycle 12", title: "Đụng độ Meralina", text: "Arisia đánh bại Meralina và suýt kết liễu thì Ragnaroir cào rách tay Nữ hoàng. Arisia đổi trạng thái của Meralina từ 'lưu đày' sang 'giết ngay khi thấy'. Bạo loạn Prussireich bùng lên sau đó." },
  { era: "Cycle 12", title: "Gotterfall & Schwarzbruch", text: "Sau nhiều đợt đụng độ biên giới, Arisia cho phép leo thang sát thương: Pháo Gotterfall và Bom Schwarzbruch xóa sổ một đạo quân Western Nadir — ánh chớp nhìn thấy được từ tận Đế chế Nadirius." },
  { era: "Cycle 12", title: "Hiệp ước Cursew", text: "Overlord đề xuất hiệp ước 'hòa bình giữa các cường quốc lớn'. Ojamon thông qua bất chấp Reformists, đổi lại việc Arisia được công nhận là Sylvalon Supreme, đồng thời lặng lẽ gác kế hoạch xóa sổ Prussireich. Nội dung: không động binh gần biên giới chung, chia sẻ tình báo & tài nguyên, không can thiệp chống bên thứ ba. Yulia Makarova chỉ nói: 'Giống hệt Hiệp ước Molotov–Ribbentrop.'" },
  { era: "Cycle 12", title: "Malocri xưng Hoàng đế Hinatian", text: "Malocri kết hôn với Nữ hoàng July Arum và Công chúa Jorduyn, tuyên bố làm Hoàng đế Hinatian tại Konstantine — và đã có tên trong danh sách 'gửi lời hỏi thăm' dài hạn của Arisia." },
  { era: "Cycle 12", title: "Biến cố Metallia & Bí mật Pherone Nexus", text: "Kim Santos dẹp loạn công nhân tại Metallia và khẳng định chỗ đứng trong Đế chế; Hande Ersoy sinh con với Xal Kor khiến Felicia chất vấn cha mình. Trong khi đó, Bryce Dallas dẫn Evelina, Grace và Chunlina quay phim tài liệu hang Pherone Nexus — Chunlina ở lại với bầy Pregnomorph, còn thước phim về Ovalina đe dọa lộ bí mật chỗ ẩn náu của Meralina." },
  { era: "Cycle 12", title: "Dual War: Chiến tranh Hai Mặt Trận", text: "Một ngày trước Quốc khánh Salvic Union, Overlord tập kích bắt giữ Sharon Frost; Arisia từ chối tiếp viện theo Hiệp ước Cursew, khiến Magnatere chỉ có thể gửi vài sư đoàn tình nguyện. Đồng thời Arisia kéo quân vào Fremde Protectorae, khiêu khích Ceasaria Kaiser đánh trước để lấy cớ tổng tấn công toàn diện." },
  { era: "Cycle 12", title: "Deep Implode & Ký Sinh Trùng Dưới CR 1000", text: "Conquistor Claudius hạ và giam cầm Ceasaria Kaiser; Avalanche Prine lên lãnh đạo Fremde Protectorae và cưới Mary Karelia-Batson. Ixalcian ký hiệp ước sáp nhập còn Qiyana bí mật phái Glinda sang Hinata liên minh với Malocri. Hyouya viện kẽ hở hiệp ước đánh lui Cipheron; Etharos thỏa thuận ngầm với Mr. Mind khiến Hailey biến mất cùng sự sụp đổ của The Collectors. Kil Kimius mời quân Sylvarian vào Salvic Union 'gìn giữ hòa bình'. Tại pháo đài Western Nadir, Overlord ngầm cấy ký sinh trùng bóng tối (vô hình với mọi thực thể dưới CR 1000) lên ghế ngồi của Arisia." }
];

// --------------------------------------------------------------------------
// SỰ KIỆN NGẪU NHIÊN / CÓ ĐIỀU KIỆN (đã chuẩn hóa)
// effect: hàm nhận (game) và trả về chuỗi mô tả hệ quả
// --------------------------------------------------------------------------
export const EVENT_POOL = [
  { id: "prussireich_riot", title: "Bạo loạn Prussireich", weight: 3,
    cond: g => g.ownerOf("prussireich") === "sylvarian",
    run: g => { g.addStability("prussireich", -18); g.addRes("sylvarian", "credits", -250); return "Prussireich mất 18 ổn định; Sylvarian tốn 250 tín dụng dập loạn."; },
    text: "Carnavex lợi dụng quyền tự trị của Prussireich để gom quyền lực chính trị; đường phố Prussireich lại bốc cháy." },
  { id: "magnatere_outrage", title: "Magnatere phẫn nộ", weight: 2,
    cond: g => g.pact.active,
    run: g => { g.addRelation("nadirius", "sylvarian", -12); g.addTension(6); return "Quan hệ Nadirius–Sylvarian -12, Căng thẳng +6."; },
    text: "Magnatere tuyên bố trước triều đình: Hiệp ước Uni được trả bằng máu Nadirius, và Arisia vừa bán nó cho Overlord." },
  { id: "salvic_mobilize", title: "Salvic Union tổng động viên", weight: 2,
    cond: g => g.pact.active,
    run: g => { g.addDefense("zero", 15); g.addTension(4); return "Zero +15 phòng thủ; Căng thẳng +4."; },
    text: "Salvic Union coi việc Sylvarian bắt tay Western Nadir là sự xói mòn chính thế cân bằng đã cho họ độc lập." },
  { id: "reformist_split", title: "Reformists chia rẽ", weight: 2,
    cond: g => true,
    run: g => { g.addRes("sylvarian", "influence", -60); return "Sylvarian -60 ảnh hưởng."; },
    text: "Các Reformists nhận ghế hội đồng nhưng phải gánh một chính sách phá nát chính lý do họ ra đời." },
  { id: "ixalcian_convoy", title: "Đoàn vận tải Ixalcienkorps", weight: 3,
    cond: g => !!g.ownerOf("ixalia"),
    run: g => { const o = g.ownerOf("ixalia"); g.addRes(o, "credits", 400); return `${g.facName(o)} +400 tín dụng.`; },
    text: "Hạm đội vận tải lớn nhất vũ trụ cập cảng Gandora, chở đầy khoáng sản từ rìa vũ trụ." },
  { id: "konstantine_tribute", title: "Cống phẩm Konstantine", weight: 3,
    cond: g => !!g.ownerOf("hinatiene"),
    run: g => { const o = g.ownerOf("hinatiene"); g.addRes(o, "credits", 300); g.addRes(o, "influence", 30); return `${g.facName(o)} +300 tín dụng, +30 ảnh hưởng.`; },
    text: "Reichkomos Hinatiene — vùng trung thành và năng suất kinh tế cao nhất — nộp phần cống phẩm định kỳ." },
  { id: "eris_observation", title: "Eris Union quan sát", weight: 2,
    cond: g => g.tension > 60,
    run: g => { g.addTension(-10); return "Căng thẳng -10."; },
    text: "Một tín hiệu lặng lẽ từ trung tâm vũ trụ: Eris Union đang theo dõi. Mọi phe tạm chùn tay." },
  { id: "starrer_breach", title: "Starrer tràn qua cổng Nadir", weight: 2,
    cond: g => true,
    run: g => { const id = g.randomBorderSector(); if (!id) return "Không có hệ quả."; g.addStability(id, -12); g.addDefense(id, -8); return `${g.sectorName(id)}: -12 ổn định, -8 phòng thủ.`; },
    text: "Starrer — sinh vật ý thức tổ ong — đang bành trướng nhanh qua các cổng Nadir." },
  { id: "predita_hold", title: "Tinh thần Predita", weight: 2,
    cond: g => g.ownerOf("predita") === "salvic",
    run: g => { g.addDefense("predita", 12); return "Predita +12 phòng thủ."; },
    text: "Ký ức về 'Phép màu Predita' của Zarcseid — 10 năm tử thủ với 500 triệu tàn quân — vẫn sống trong quân đội Salvic." },
  { id: "earth_broadcast", title: "Global Icon phát sóng", weight: 2,
    cond: g => !!g.ownerOf("sol"),
    run: g => { const o = g.ownerOf("sol"); g.addRes(o, "influence", 50); return `${g.facName(o)} +50 ảnh hưởng.`; },
    text: "Super Reporter Girls phát trực tiếp từ đảo-thành phố nổi Global Icon: tin tức không kiểm duyệt lan khắp hệ Mặt Trời." },
  { id: "collectors_raid", title: "The Collectors đột kích", weight: 2,
    cond: g => !!g.ownerOf("sol"),
    run: g => { g.addStability("sol", -10); return "Hệ Mặt Trời -10 ổn định."; },
    text: "Mr. Mind tung Parasoid và Eremite săn lùng siêu anh hùng; The Supers phải rời Power Hall đối phó." },
  { id: "tamarite_silence", title: "Sự im lặng của Tamarite", weight: 1,
    cond: g => true,
    run: g => "Không có hệ quả — và đó chính là điều đáng sợ.",
    text: "Tamarite tiếp tục quan sát và đứng ngoài. Chỉ sự hiện diện của họ cũng đủ giữ quy tắc cũ: không ai thách thức họ trực tiếp." }
];
