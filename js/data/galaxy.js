// ============================================================================
// BẢN ĐỒ VŨ TRỤ CHUẨN HÓA — phân cấp: Cõi → Khu vực/Hệ sao → Thiên thể → Địa danh
//  - Thành phố (Kronea, Zero, Evernight, Konstantine...) KHÔNG còn bị coi là hành tinh.
//  - Nadir là chiều không gian riêng, Outer Layer là rìa vũ trụ, Tamarikas đã biến mất.
//  - `inferred: true` = lore gốc không nêu rõ, game ghi nhãn "Suy luận".
// ============================================================================

export const REALMS = {
  gaiastra: { name: "Gaiastra", desc: "Vũ trụ chính — nơi các cường quốc tranh giành." },
  nadir: { name: "Chiều Nadir", desc: "Cõi ngoài chiều không gian Gaiastra, nơi khởi nguồn của sinh vật đột biến, quỷ dữ và ma thuật hắc ám." }
};

// Loại khu vực trên bản đồ chiến lược
// system = hệ sao có thiên thể; region = vùng lãnh thổ nhiều thế giới chưa đặt tên;
// station = cấu trúc trôi tự do; edge = rìa vũ trụ; lost = đã biến mất; domain = lãnh địa trong Nadir
export const SECTORS = [
  // ------------------------------------------------------------ TRUNG TÂM
  {
    id: "eris_core", name: "Vùng Trung Tâm Vũ Trụ", kind: "region", realm: "gaiastra",
    pos: [0, 0, 0], owner: "eris", weight: 12, capital: true, biome: "golden",
    income: { credits: 420, influence: 70, research: 90 }, defense: 95, stability: 100,
    desc: "15% trung tâm vũ trụ mà Eris Union giữ lại sau Reset. Gần như bất khả xâm phạm. Tên thủ phủ chưa được lore nêu.",
    places: [
      { id: "eris_embassy", name: "Phái bộ Đại sứ Eris", kind: "base", inferred: true, desc: "Nơi Đại sứ Emma Illumis đại diện Eris Union. (Tên gọi suy luận)" }
    ],
    links: ["sylvalon", "hinatiene", "reichkomos_prozone", "wonder_island", "berlidona", "outer_layer"]
  },
  {
    id: "outer_layer", name: "Outer Layer — Cổng Đa Vũ Trụ", kind: "edge", realm: "gaiastra",
    pos: [40, 0, -275], owner: "eris", weight: 3, biome: "void",
    income: { credits: 120, influence: 40, research: 60 }, defense: 80, stability: 100,
    desc: "Rìa vũ trụ do Eris Union canh giữ, đóng vai trò cổng vào đa vũ trụ. Không phải hành tinh.",
    places: [],
    links: ["eris_core", "ixalia"]
  },

  // ------------------------------------------------------------ SYLVARIAN
  {
    id: "sylvalon", name: "Hệ Sylvalon", kind: "system", realm: "gaiastra",
    pos: [-60, 6, -70], owner: "sylvarian", weight: 12, capital: true, biome: "city",
    income: { credits: 520, influence: 90, research: 80 }, defense: 90, stability: 92,
    star: { name: "Mặt trời Sylvalon (đã ổn định hóa)", color: "#dbeafe", size: 7, temp: 9500 },
    desc: "Hệ quê hương Sylvarian quay quanh một mặt trời đã được ổn định hóa. Mọi hành tinh khác trong hệ đã bị phá hủy để xây siêu cấu trúc.",
    bodies: [
      { id: "sylvalon_world", name: "Sylvalon", kind: "planet", type: "ecumenopolis", size: 3.2, orbit: 30, color: "#7dd3fc", ring: false,
        desc: "Thế giới mẹ của Sylvarian. Dưới Karion, Sylvalon đã là pháo đài hoàn chỉnh.",
        places: [
          { id: "kronea", name: "Kronea", kind: "city", desc: "Thủ đô Đế chế Sylvarian. Khí hậu ôn đới nhân tạo. Lõi Cai trị, Hoàng cung, Mạng Xa lộ Trời." },
          { id: "sylvalon_prison", name: "Nhà tù Sylvalon", kind: "base", desc: "Nơi giam Xal Kor sau khi thân phận Kryptonian bị lộ." }
        ] },
      { id: "sylvalon_mega", name: "Vành Siêu Cấu Trúc", kind: "megastructure", type: "metal", size: 1, orbit: 52, color: "#94a3b8",
        desc: "Các siêu cấu trúc dựng từ vật chất của những hành tinh đã bị phá hủy trong hệ.", places: [] }
    ],
    links: ["eris_core", "berlidona", "prussireich", "ixalia", "hinatiene"]
  },
  {
    id: "berlidona", name: "Lõi Công Nghiệp Berlidona", kind: "system", realm: "gaiastra",
    pos: [-118, -4, -20], owner: "sylvarian", weight: 8, biome: "industrial",
    income: { credits: 380, influence: 30, research: 70 }, defense: 70, stability: 70,
    star: { name: "Sao chủ (chưa đặt tên)", color: "#fed7aa", size: 5, temp: 4800, inferred: true },
    desc: "Khu công nghiệp lõi và thành trì của phe Reformists. Lore chỉ nêu tên thành phố Berlidona; thế giới chủ chưa được đặt tên.",
    bodies: [
      { id: "berlidona_world", name: "Thế giới-xưởng (chưa đặt tên)", kind: "planet", type: "industrial", size: 2.6, orbit: 26, color: "#a8a29e", inferred: true,
        desc: "Thế giới chứa thành phố Berlidona. (Suy luận)",
        places: [
          { id: "berlidona_city", name: "Berlidona", kind: "city", desc: "Khí hậu: khói công nghiệp & nhà kính kiểm soát. Ụ đóng tàu, lò rèn vũ khí hạng nặng, sân thử thách cho sĩ quan tinh nhuệ như Yulina, Anissa, April." }
        ] }
    ],
    links: ["sylvalon", "prussireich", "tyrania", "western_march", "eris_core"]
  },
  {
    id: "prussireich", name: "Vùng tự trị Prussireich", kind: "region", realm: "gaiastra",
    pos: [-150, 10, -95], owner: "sylvarian", weight: 6, biome: "industrial",
    income: { credits: 260, influence: 10, research: 30 }, defense: 55, stability: 42,
    desc: "Ra đời từ cuộc thống nhất khó khăn của Karion với quyền tự trị cao. Caranter không xóa được, Arisia coi là vấn đề nội bộ dai dẳng và là mục tiêu thứ cấp bí mật của Gotterfall/Schwarzbruch — đã được Ojamon lặng lẽ gác lại sau Hiệp ước Cursew. Lore không nêu tên các thế giới bên trong.",
    places: [],
    links: ["sylvalon", "berlidona", "ixalia", "western_march"]
  },
  {
    id: "hinatiene", name: "Reichkomos Hinatiene", kind: "system", realm: "gaiastra",
    pos: [70, -6, -95], owner: "sylvarian", weight: 8, biome: "crystal",
    income: { credits: 460, influence: 50, research: 30 }, defense: 65, stability: 75,
    star: { name: "Sao chủ (chưa đặt tên)", color: "#bae6fd", size: 5.5, temp: 7200, inferred: true },
    desc: "Vùng trung thành và năng suất kinh tế cao nhất của Đế chế, do Malocri quản lý — người vừa tự xưng Hoàng đế Hinatian. Thế giới mẹ Hinatian chưa được đặt tên trong lore.",
    bodies: [
      { id: "hinatian_world", name: "Thế giới mẹ Hinatian (chưa đặt tên)", kind: "planet", type: "crystal", size: 2.9, orbit: 28, color: "#22d3ee", inferred: true,
        desc: "Thế giới chứa thủ phủ Konstantine. (Suy luận)",
        places: [
          { id: "konstantine", name: "Konstantine", kind: "city", desc: "Thủ phủ Reichkomos Hinatiene. Khí hậu cận nhiệt đới phát quang sinh học; xây bằng pha lê tự phát sáng và thực vật ngoài hành tinh. 40% sản lượng được xuất làm cống phẩm Đế chế." }
        ] }
    ],
    links: ["eris_core", "sylvalon", "nadirius_march", "reichkomos_prozone"]
  },
  {
    id: "reichkomos_prozone", name: "Reichkomos Prozone", kind: "region", realm: "gaiastra",
    pos: [120, 4, 30], owner: "sylvarian", weight: 8, biome: "ice",
    income: { credits: 300, influence: 20, research: 30 }, defense: 60, stability: 55,
    desc: "Phần lãnh thổ Prozonian cũ vẫn nằm trong hệ thống thuộc địa của Sylvarian. Kil Kimius — người không phải Sylvarian có cấp bậc cao nhất ở đây — giữ trật tự để đổi lấy một lãnh địa tự trị.",
    places: [],
    links: ["eris_core", "hinatiene", "prozon", "nadirius_march", "predita"]
  },
  {
    id: "ixalia", name: "Hệ Ixalia", kind: "system", realm: "gaiastra",
    pos: [-30, -8, -200], owner: "sylvarian", weight: 7, biome: "asteroid",
    income: { credits: 400, influence: 15, research: 25 }, defense: 60, stability: 60,
    star: { name: "Sao Ixalia", color: "#fecaca", size: 4.5, temp: 3600, inferred: true },
    desc: "Hệ sao gần rìa vũ trụ, quê hương Ixalcian. Ixalcienkorps phụ trách khai khoáng và vận tải cho Đế chế.",
    bodies: [
      { id: "gandora_rock", name: "Tiểu hành tinh Gandora", kind: "asteroid", type: "metal", size: 1.8, orbit: 34, color: "#cbd5e1",
        desc: "Một tiểu hành tinh khổng lồ được đục rỗng để xây thành phố.",
        places: [
          { id: "gandora", name: "Gandora", kind: "city", desc: "Thủ phủ Ixalcienkorps. Khí hậu chân không dưới 0 & lãnh nguyên kim loại. Điều hành khai khoáng, thương mại và hạm đội vận tải chiến hạm lớn nhất vũ trụ." }
        ] },
      { id: "ixalia_belt", name: "Vành đai mỏ Ixalia", kind: "megastructure", type: "belt", size: 1, orbit: 48, color: "#78716c",
        desc: "Vành đai khoáng sản giàu có quanh sao Ixalia. (Suy luận từ 'nhiều mỏ khoáng')", inferred: true, places: [] }
    ],
    links: ["sylvalon", "prussireich", "outer_layer"]
  },

  // ------------------------------------------------------------ FREMDE PROTECTORAE
  {
    id: "orthodox", name: "Orthodox", kind: "system", realm: "gaiastra",
    pos: [-75, -4, 130], owner: "sylvarian", weight: 5, biome: "desert",
    income: { credits: 160, influence: 15, research: 15 }, defense: 70, stability: 60,
    star: { name: "Sao chủ (chưa đặt tên)", color: "#fde68a", size: 5, temp: 5600, inferred: true },
    desc: "Lãnh thổ Fremde Protectorae đang bị Sylvarian phong tỏa. Từng là đồng minh của Prozonian, nay là pháo đài-nhà tù lộ thiên an ninh cao.",
    bodies: [
      { id: "orthodox_world", name: "Thế giới Orthodox", kind: "planet", type: "desert", size: 2.5, orbit: 27, color: "#d97706", inferred: true,
        desc: "Hoang mạc hóa và bão điện từ. (Lore liệt kê Orthodox trong mục thành phố/khu vực; thế giới chủ là suy luận)",
        places: [
          { id: "orthodox_prison", name: "Pháo đài-nhà tù Orthodox", kind: "base", desc: "Đầy Spirit Squid và lính canh Sylvarian." }
        ] }
    ],
    links: ["sol", "altera", "tyrania"]
  },
  {
    id: "altera", name: "Hệ Altera", kind: "system", realm: "gaiastra",
    pos: [-140, 8, 160], owner: "sylvarian", weight: 4, biome: "jungle",
    income: { credits: 150, influence: 20, research: 40 }, defense: 50, stability: 65,
    star: { name: "Sao Altera", color: "#fbcfe8", size: 4.8, temp: 6100, inferred: true },
    desc: "Quê hương Alterian — chủng tộc từ trước Kỷ Gaiastra. Thuộc Fremde Protectorae, đồng minh tự nhiên của Prozonian.",
    bodies: [
      { id: "altera_world", name: "Altera", kind: "planet", type: "jungle", size: 2.4, orbit: 25, color: "#f472b6",
        desc: "Thế giới của Alterian, những người theo đuổi một vũ trụ cân bằng.", places: [] }
    ],
    links: ["orthodox", "tyrania"]
  },
  {
    id: "tyrania", name: "Lãnh địa Tyranian", kind: "region", realm: "gaiastra",
    pos: [-178, -6, 80], owner: "sylvarian", weight: 4, biome: "desert",
    income: { credits: 140, influence: 10, research: 5 }, defense: 85, stability: 50,
    desc: "Vùng của người khổng lồ Tyranian thuộc Fremde Protectorae: bài công nghệ, sống man dã, trung lập nhưng chống Sylvarian. Lore không nêu tên thế giới mẹ. Avalanche Prine (ngoại giao) và Ceasaria Kaiser (tù trưởng) đến từ đây.",
    places: [],
    links: ["altera", "orthodox", "berlidona", "western_march"]
  },

  // ------------------------------------------------------------ HỆ MẶT TRỜI
  {
    id: "sol", name: "Hệ Mặt Trời", kind: "system", realm: "gaiastra",
    pos: [45, 2, 165], owner: "sylvarian", weight: 8, biome: "city",
    income: { credits: 360, influence: 60, research: 60 }, defense: 55, stability: 70,
    star: { name: "Mặt Trời (Sol, G2V)", color: "#fff1b8", size: 6, temp: 5772 },
    desc: "Trái Đất nay là đặc khu của Sylvarian dưới quyền Earth Overlord Etharos Gemini. Eris — quê hương Erisian — là hành tinh lùn bị Mặt Trời bắt giữ sau Thảm họa Chaos Power.",
    bodies: [
      { id: "sphere", name: "The Sphere", kind: "megastructure", type: "solar", size: 0.9, orbit: 11, color: "#fde047",
        desc: "Siêu cấu trúc thu năng lượng mặt trời.", places: [] },
      { id: "mercury", name: "Sao Thủy", kind: "planet", type: "rocky", size: 0.7, orbit: 16, color: "#a8a29e", desc: "Không có ghi chép trong lore.", places: [] },
      { id: "venus", name: "Sao Kim", kind: "planet", type: "venus", size: 1.2, orbit: 21, color: "#fcd34d", desc: "Không có ghi chép trong lore.", places: [] },
      { id: "earth", name: "Trái Đất", kind: "planet", type: "earth", size: 1.4, orbit: 28, color: "#3b82f6",
        desc: "Đặc khu Sylvarian. Đại diện Đế chế: Earth Overlord Etharos Gemini; Tổng thống Eleanor Caranter.",
        moons: [
          { id: "moon", name: "Mặt Trăng", kind: "moon", type: "rocky", size: 0.42, orbit: 3, color: "#d4d4d8", desc: "Vệ tinh tự nhiên của Trái Đất.",
            places: [ { id: "overmoon", name: "Overmoon", kind: "base", desc: "Kho dự trữ năng lượng khẩn cấp bên dưới bề mặt Mặt Trăng." } ] }
        ],
        places: [
          { id: "evernight", name: "Evernight", kind: "city", desc: "Siêu trung tâm và Tổng hành dinh Sylvarian trên Trái Đất. Mái vòm chạng vạng chuyển đổi bầu khí quyển giống Sylvalon. Nơi đặt Power Hall — bảo tàng & tổng hành dinh của The Supers." },
          { id: "global_icon", name: "Global Icon", kind: "floating", desc: "Đảo-thành phố nổi trên Thái Bình Dương, trụ sở mạng tin tức Super Reporter Girls." },
          { id: "icarius", name: "Icarius", kind: "floating", desc: "Siêu đô thị bay công nghệ cao dùng cho cai trị Đế chế và nuôi dạy trẻ em lai." },
          { id: "tokyzhou", name: "Tokyzhou", kind: "city", desc: "Phòng thí nghiệm gen toàn cầu ở châu Á do Future Corp & Sylvarian vận hành. Trụ sở Future Corp của Bill Greedle." },
          { id: "vander", name: "Vander", kind: "city", desc: "Khu bảo tồn Nam Mỹ dành cho giới tinh hoa và con người hợp tác. Địa bàn của cartel Jose Santos." },
          { id: "metallia", name: "Metallia", kind: "zone", desc: "'Nhà máy Thế giới' tự động hóa hoàn toàn, rộng cỡ lục địa, ở châu Âu." },
          { id: "pacifica", name: "Pacifica", kind: "zone", desc: "Khu dự trữ quân sự hóa ở châu Đại Dương/Thái Bình Dương dành cho người lai Sylvarian." },
          { id: "ottomano", name: "Ottomano", kind: "zone", desc: "Trang trại tài nguyên & khu khai mỏ lớn nhất Trái Đất (Trung Đông & Bắc Phi)." },
          { id: "uter_town", name: "Uter Town Remnant", kind: "village", desc: "Ngôi làng ẩn ở Nam Mỹ, nơi Tamalin và Mitalin sinh sống." },
          { id: "pherone_nexus", name: "Pherone Nexus", kind: "underground", desc: "Mạng hang động sâu dưới lòng đất — nơi ở của Pregnomorph trên Trái Đất, do Ovalina kiểm soát. Meralina đang ẩn náu ở đây." }
        ] },
      { id: "mars", name: "Sao Hỏa", kind: "planet", type: "mars", size: 0.95, orbit: 36, color: "#ef4444", desc: "Có tiền đồn Sylvarian biệt lập.",
        places: [ { id: "khvaron", name: "Khvaron", kind: "outpost", desc: "Tiền đồn Sylvarian biệt lập trên Sao Hỏa. Quê hương của Dejaylah Sonja (Sylvarian sao Hỏa)." } ] },
      { id: "jupiter", name: "Sao Mộc", kind: "planet", type: "gas", size: 3.0, orbit: 50, color: "#d6a77a", desc: "Không có ghi chép trong lore.", places: [] },
      { id: "saturn", name: "Sao Thổ", kind: "planet", type: "gas_pale", size: 2.5, orbit: 64, color: "#e9d8a6", ring: true, desc: "Không có ghi chép trong lore.", places: [] },
      { id: "uranus", name: "Sao Thiên Vương", kind: "planet", type: "ice_giant", size: 1.8, orbit: 76, color: "#a5f3fc", desc: "Không có ghi chép trong lore.", places: [] },
      { id: "neptune", name: "Sao Hải Vương", kind: "planet", type: "ice_giant_deep", size: 1.75, orbit: 86, color: "#3b82f6", desc: "Không có ghi chép trong lore.", places: [] },
      { id: "eris", name: "Eris (hành tinh lùn)", kind: "dwarf", type: "ruin", size: 0.6, orbit: 98, color: "#e2e8f0",
        desc: "Quê hương gốc của Erisian — hành tinh lùn bị Mặt Trời bắt giữ sau Thảm họa Chaos Power. Tàn tích là nơi phần lớn Wombiote sinh sống.",
        places: [ { id: "icelot", name: "Icelot", kind: "outpost", desc: "Tiền đồn Sylvarian biệt lập trên Eris." } ] }
    ],
    links: ["predita", "wonder_island", "orthodox"]
  },
  {
    id: "predita", name: "Hệ Predita", kind: "system", realm: "gaiastra",
    pos: [115, -4, 140], owner: "salvic", weight: 1.5, biome: "jungle",
    income: { credits: 140, influence: 25, research: 20 }, defense: 70, stability: 75,
    star: { name: "Sao Predita", color: "#fef3c7", size: 4.6, temp: 5200, inferred: true },
    desc: "Cách Trái Đất 68 năm ánh sáng. Nơi Tướng Zarcseid làm nên 'Phép màu Predita': tử thủ 10 năm với gần 500 triệu tàn quân trước vòng vây Sylvarian.",
    bodies: [
      { id: "predita_world", name: "Predita", kind: "planet", type: "jungle_toxic", size: 2.2, orbit: 24, color: "#65a30d",
        desc: "Thế giới bị côn trùng xâm chiếm: Roarinian (~4 tỷ) và Paraloxcum (~3,1 tỷ).",
        places: [ { id: "jaylahris", name: "Jaylahris", kind: "base", desc: "Căn cứ khai mỏ phía bắc của Prozonian trên Predita." } ] }
    ],
    links: ["prozon", "reichkomos_prozone", "sol"]
  },

  // ------------------------------------------------------------ SALVIC
  {
    id: "prozon", name: "Hệ Prozon", kind: "system", realm: "gaiastra",
    pos: [175, 6, 95], owner: "salvic", weight: 3.5, capital: true, biome: "ice",
    income: { credits: 300, influence: 50, research: 45 }, defense: 85, stability: 85,
    star: { name: "Sao Prozon", color: "#c7d2fe", size: 5, temp: 6800, inferred: true },
    desc: "Quê hương băng giá của Prozonian, đầy siêu cấu trúc khổng lồ và đồng băng.",
    bodies: [
      { id: "prozon_world", name: "Prozon", kind: "planet", type: "ice", size: 2.8, orbit: 27, color: "#c7d2fe",
        desc: "Thế giới băng giá với các siêu cấu trúc khổng lồ.",
        places: [ { id: "zero", name: "Zero", kind: "city", desc: "Thủ đô Prozonian, khí hậu cực địa. Đã được tái thiết sau khi Sylvarian rút quân chiếm đóng. Trái tim của Salvic Union." } ] }
    ],
    links: ["reichkomos_prozone", "predita", "nadirius_march"]
  },

  // ------------------------------------------------------------ TRUNG LẬP / ĐẶC BIỆT
  {
    id: "wonder_island", name: "Wonder Island", kind: "station", realm: "gaiastra",
    pos: [10, 14, 85], owner: null, neutral: true, weight: 0, biome: "paradise",
    income: { credits: 0, influence: 0, research: 0 }, defense: 999, stability: 100,
    desc: "Thiên đường trung lập trôi nổi trong không gian, do Nữ thần Diana quản lý cho nghỉ dưỡng. Không thể bị chiếm.",
    places: [], links: ["eris_core", "sol"]
  },
  {
    id: "tamarikas", name: "Tamarikas (đã biến mất)", kind: "lost", realm: "gaiastra",
    pos: [175, 20, -190], owner: null, neutral: true, lost: true, weight: 0, biome: "void",
    income: { credits: 0, influence: 0, research: 0 }, defense: 9999, stability: 100,
    desc: "Quê hương của Tamarite — đã biến mất. Tamarite (trừ Vagina) đã rời tới thiên đường riêng. Vị trí trên bản đồ chỉ mang tính tượng trưng.",
    inferred: true, places: [], links: []
  },

  // ------------------------------------------------------------ BIÊN KHU NADIR TRONG GAIASTRA
  {
    id: "western_march", name: "Biên khu Western Nadir", kind: "region", realm: "gaiastra",
    pos: [-245, -4, -10], owner: "western_nadir", weight: 3, biome: "abyss",
    income: { credits: 200, influence: 20, research: 15 }, defense: 70, stability: 60, inferred: true,
    desc: "Phần lãnh thổ Western Nadir chiếm trong Gaiastra qua các cổng xâm nhiễm. Là biên giới chung được Hiệp ước Cursew 'đóng băng'. Nơi xảy ra vụ thảm sát Gotterfall–Schwarzbruch. (Tên vùng là suy luận)",
    places: [], links: ["tyrania", "berlidona", "prussireich", "western_abyss"]
  },
  {
    id: "nadirius_march", name: "Biên khu Nadirius", kind: "region", realm: "gaiastra",
    pos: [240, -4, -60], owner: "nadirius", weight: 3, biome: "abyss",
    income: { credits: 220, influence: 30, research: 20 }, defense: 75, stability: 80, inferred: true,
    desc: "Phần lãnh thổ Đế chế Nadirius trong Gaiastra — hướng Prozonian Sphere mà Magnatere từng tấn công. (Tên vùng là suy luận)",
    places: [], links: ["hinatiene", "reichkomos_prozone", "prozon", "nadirius_citadel"]
  },

  // ------------------------------------------------------------ CHIỀU NADIR
  {
    id: "western_abyss", name: "Vực Western Nadir", kind: "domain", realm: "nadir",
    pos: [-130, -120, 40], owner: "western_nadir", weight: 2, capital: true, biome: "abyss",
    income: { credits: 220, influence: 40, research: 20 }, defense: 90, stability: 70, inferred: true,
    desc: "Lãnh địa của Overlord trong chiều Nadir: hỗn loạn thuần túy, nơi các cổng xâm nhiễm khởi phát. (Tên gọi là suy luận)",
    places: [], links: ["western_march", "nadirius_citadel"]
  },
  {
    id: "nadirius_citadel", name: "Thành trì Nadirius", kind: "domain", realm: "nadir",
    pos: [130, -120, 40], owner: "nadirius", weight: 2, capital: true, biome: "abyss",
    income: { credits: 240, influence: 40, research: 30 }, defense: 95, stability: 90, inferred: true,
    desc: "Lõi Đế chế Nadirius trong chiều Nadir — trật tự, kỷ luật, triều đình của Magnatere và Hyouya. (Tên gọi là suy luận)",
    places: [], links: ["nadirius_march", "western_abyss"]
  }
];

export const SECTOR_BY_ID = Object.fromEntries(SECTORS.map(s => [s.id, s]));

// Tìm vị trí (sector/body/place) theo id — dùng cho nơi ở của nhân vật
export function findLocation(id) {
  for (const s of SECTORS) {
    if (s.id === id) return { sector: s, body: null, place: null, label: s.name };
    for (const p of s.places || []) if (p.id === id) return { sector: s, body: null, place: p, label: `${p.name} • ${s.name}` };
    for (const b of s.bodies || []) {
      if (b.id === id) return { sector: s, body: b, place: null, label: `${b.name} • ${s.name}` };
      for (const p of b.places || []) if (p.id === id) return { sector: s, body: b, place: p, label: `${p.name}, ${b.name} • ${s.name}` };
      for (const m of b.moons || []) {
        if (m.id === id) return { sector: s, body: m, place: null, label: `${m.name} • ${s.name}` };
        for (const p of m.places || []) if (p.id === id) return { sector: s, body: m, place: p, label: `${p.name}, ${m.name} • ${s.name}` };
      }
    }
  }
  return null;
}

export const PLACE_KIND_LABEL = {
  city: "Thành phố", floating: "Thành phố nổi/bay", underground: "Mạng ngầm", village: "Làng ẩn",
  zone: "Khu vực", base: "Căn cứ", outpost: "Tiền đồn"
};
export const BODY_KIND_LABEL = {
  planet: "Hành tinh", dwarf: "Hành tinh lùn", moon: "Vệ tinh", asteroid: "Tiểu hành tinh", megastructure: "Siêu cấu trúc"
};
export const SECTOR_KIND_LABEL = {
  system: "Hệ sao", region: "Vùng lãnh thổ", station: "Cấu trúc trôi tự do", edge: "Rìa vũ trụ", lost: "Đã biến mất", domain: "Lãnh địa Nadir"
};
