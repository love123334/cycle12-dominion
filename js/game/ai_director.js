// ============================================================================
// CYCLE 12: AI STORY & CHARACTER DIALOGUE DIRECTOR (v8.5 — LORE & MEMORY ENGINE)
// Multi-Provider Orchestrator: Groq / DeepSeek / OpenRouter
// - Routes via localhost `/api/ai/chat` (`.env.local`) or static BYOK (`localStorage`).
// - Compiles dynamic Canon Lore Bible (Factions, 15 Species, Timeline, Relations,
//   Superweapons, Sectors/Planets, 72 Character Bios, Hybrids) + Persistent Story
//   Memory Ledger (`vn.history` + `vn.aiMemory` + chosen branches) so AI NEVER
//   drifts from Cycle 12 lore or forgets prior choices/dialogue.
// ============================================================================

import { META, FACTIONS, SUPERWEAPONS, SPECIES, TIMELINE } from "../data/lore.js";
import { CHARACTERS, CHAR_BY_ID, RELATIONS } from "../data/characters.js";
import { SECTORS, SECTOR_BY_ID, findLocation } from "../data/galaxy.js";

const AI_KEY_STORAGE = "CYCLE12_AI_KEYS_V1";

const DIRECT_PROVIDERS = {
  groq: {
    label: "Groq AI",
    url: "https://api.groq.com/openai/v1/chat/completions",
    models: ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]
  },
  deepseek: {
    label: "DeepSeek V3",
    url: "https://api.deepseek.com/chat/completions",
    models: ["deepseek-chat"]
  },
  openrouter: {
    label: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    models: [
      "deepseek/deepseek-chat-v3-0324:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "google/gemini-2.0-flash-001",
      "openai/gpt-4o-mini"
    ]
  }
};

let cachedProxyStatus = null;

export function getStoredAIKeys() {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(AI_KEY_STORAGE) : null;
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      preferredProvider: parsed.preferredProvider || "auto",
      groq: parsed.groq || "",
      deepseek: parsed.deepseek || "",
      openrouter: parsed.openrouter || ""
    };
  } catch {
    return { preferredProvider: "auto", groq: "", deepseek: "", openrouter: "" };
  }
}

export function setStoredAIKeys(patch = {}) {
  const cur = getStoredAIKeys();
  const next = {
    preferredProvider: patch.preferredProvider ?? cur.preferredProvider ?? "auto",
    groq: patch.groq !== undefined ? patch.groq.trim() : cur.groq,
    deepseek: patch.deepseek !== undefined ? patch.deepseek.trim() : cur.deepseek,
    openrouter: patch.openrouter !== undefined ? patch.openrouter.trim() : cur.openrouter
  };
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(AI_KEY_STORAGE, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
  return next;
}

export async function detectAIStatus(forceRefresh = false) {
  if (cachedProxyStatus && !forceRefresh) return cachedProxyStatus;
  const byok = getStoredAIKeys();
  const status = {
    localProxy: false,
    proxyAvailable: { groq: false, deepseek: false, openrouter: false },
    byokAvailable: {
      groq: Boolean(byok.groq),
      deepseek: Boolean(byok.deepseek),
      openrouter: Boolean(byok.openrouter)
    },
    anyReady: Boolean(byok.groq || byok.deepseek || byok.openrouter)
  };
  try {
    if (typeof fetch !== "undefined" && typeof location !== "undefined" && location.protocol.startsWith("http")) {
      const resp = await fetch("./api/ai/status", { cache: "no-store" });
      if (resp.ok) {
        const json = await resp.json();
        if (json?.localProxy) {
          status.localProxy = true;
          status.proxyAvailable = json.available || status.proxyAvailable;
          status.anyReady = status.anyReady || Boolean(
            status.proxyAvailable.groq || status.proxyAvailable.deepseek || status.proxyAvailable.openrouter
          );
        }
      }
    }
  } catch {
    // static hosting cleanly falls back to BYOK mode
  }
  cachedProxyStatus = status;
  return status;
}

function resolveActor(token, gameState) {
  if (!token || token === "narrator") return null;
  const id = token === "__PROTAGONIST__" ? (gameState?.protagonistId || "arisia") : token;
  return CHAR_BY_ID[id] || gameState?.hybrids?.find((h) => h.id === id) || null;
}

function resolveSectorId(token, gameState, hero) {
  if (token === "__PROTAGONIST_SECTOR__") {
    const loc = hero?.loc ? findLocation(hero.loc) : null;
    return loc?.sector?.id || "sylvalon";
  }
  if (token && SECTOR_BY_ID[token]) return token;
  if (hero?.loc) {
    const loc = findLocation(hero.loc);
    if (loc?.sector?.id) return loc.sector.id;
  }
  return "sylvalon";
}

function findMentionedCharacters(text, excludeIds = new Set()) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = [];
  for (const c of CHARACTERS) {
    if (excludeIds.has(c.id)) continue;
    const first = c.name.split(" ")[0].toLowerCase();
    if (lower.includes(c.name.toLowerCase()) || (first.length >= 4 && lower.includes(first))) {
      found.push(c);
      excludeIds.add(c.id);
      if (found.length >= 5) break;
    }
  }
  return found;
}

function findMentionedSectors(text, primaryId) {
  const result = [];
  if (primaryId && SECTOR_BY_ID[primaryId]) result.push(SECTOR_BY_ID[primaryId]);
  if (!text) return result;
  const lower = text.toLowerCase();
  for (const s of SECTORS) {
    if (s.id === primaryId) continue;
    const shortName = s.name.replace(/Hệ |Vùng |Lõi Công Nghiệp |Đặc Khu /gi, "").toLowerCase();
    if (lower.includes(s.id.replace(/_/g, " ")) || (shortName.length >= 4 && lower.includes(shortName))) {
      result.push(s);
      if (result.length >= 3) break;
    }
  }
  return result;
}

function collectRelationsForActors(actors = []) {
  const hits = [];
  const keys = actors
    .flatMap((a) => [a?.name, a?.name?.split(" ")[0]])
    .filter((k) => k && k.length >= 3);
  for (const rel of RELATIONS) {
    for (const item of rel.items || []) {
      if (keys.some((k) => item.includes(k))) {
        hits.push(`[${rel.type}] ${item}`);
      }
    }
  }
  return [...new Set(hits)].slice(0, 16);
}

// Chi tiết quan hệ & sự kiện dẫn đến quan hệ giữa các cặp nhân vật theo rawdoc (Age of Dominion & Couples & Breeding)
const CANON_PAIR_LORE = [
  { a: "magnatere", b: "hyouya", note: "Vợ chồng yêu thương sâu sắc: Kết hôn vào những ngày cuối của Liên bang Prozonian. Hai người vừa có con đầu lòng; Hyouya rất yêu chồng và từng tận dụng kẽ hở hiệp ước (vì Magnatere bị điều khoản ba bên khóa tay) sang giúp chị gái Elita đánh lui Cipheron ở mặt trận Salvic. Khi nói chuyện với nhau, Hyouya cực kỳ ngọt ngào, âu yếm, tin tưởng phu quân tuyệt đối." },
  { a: "elita", b: "hyouya", note: "Hai chị em ruột nhà Singularity (Prozonian): Elita giữ chức sĩ quan cấp cao tại Salvic Union, Hyouya là Hoàng hậu Đế chế Nadirius. Dù ở hai đế chế khác nhau, cả hai vẫn gắn bó; Elita từng bao che cho những mộng tưởng bị bắt giữ của em gái, còn Hyouya trực tiếp sang tiếp viện Salvic đánh lui Cipheron." },
  { a: "elita", b: "cipheron", note: "Cipheron (em út Nadir God) sau khi thèm muốn Hyouya bất thành đã chuyển sang để ý Elita. Hyouya đã đánh bại khiến Cipheron phải rút lui ở mặt trận Salvic." },
  { a: "jokar", b: "mina", note: "Vợ chồng: Mina gặp Jokar trên mái nhà khi anh mới tới Trái Đất và tưởng nhầm là người Sylvarian (do chỉ thị trước đó). Sau khi hẹn hò và kết hôn, Mina mới biết thân phận Prozonian thực sự của Jokar (với danh tính giả Jack Frozen — cổ đông Global Icon). Jokar thường đè Mina ra giải tỏa căng thẳng, còn Mina cực kỳ say mê người Prozonian." },
  { a: "veidos", b: "yulina", note: "Cặp đôi hẹn hò từ Sự kiện Couple Events của quân đội Sylvarian: Ban đầu cả hai không ưa nhau (Yulina từng bỏ cuộc hôn nhân cũ để ra trận), nhưng dần bị thu hút qua các buổi giao lưu chính thức dù vẫn khác biệt về tư tưởng." },
  { a: "perplexa", b: "evelina", note: "Cặp đôi hẹn hò tại Global Icon: Perplexa bị mẹ Felicia cấm đụng vào The Supers (tài sản của Earth Overlord Etharos), nên hay đi cùng Super Reporter Girls và hẹn hò Evelina. Cả Global Icon hay trêu Evelina là 'vợ của Earth Overlord tương lai' và cô rất thích điều đó; Etharos cũng khuyến khích Perplexa." },
  { a: "avalanche", b: "mary", note: "Hẹn hò rồi kết hôn sau biến cố Deep Implode: Avalanche Prine (Tyranian thích ngoại tộc) mê Mary Karelia-Batson; sau khi Conquistor hạ Ceasaria Kaiser, Avalanche lên lãnh đạo Fremde Protectorae và cưới Mary (người rời ghế Phó Tư lệnh Trái Đất) để ổn định vùng đệm cho Kronea." },
  { a: "xalkor", b: "hande", note: "Quan hệ tình cảm & có con chung: Hande (Giám sát Ottomano) gặp Xal Kor trong một lần báo cáo cho Eleanor khoảng 1 năm trước, dẫn đến đêm mặn nồng và sinh ra một đứa con chung — biến Hande thành mẹ kế của Felicia Laurent." },
  { a: "felicia", b: "xalkor", note: "Cha con Kryptonian: Xal Kor từng làm quản lý Icarius dưới quyền Etharos rồi bị giam ở Sylvalon khi lộ thân phận. Khi Felicia vào phòng cha và thấy Hande ở đó cùng đứa trẻ, cô chất vấn Xal Kor liệu ông có định khôi phục Đế chế Kryptonian sau khi vừa được thả." },
  { a: "felicia", b: "hande", note: "Con gái riêng của Xal Kor và mẹ kế mới: Felicia bắt gặp Hande trong phòng cha mình cùng đứa em cùng cha khác mẹ mới sinh, tạo ra căng thẳng giữa lòng trung thành Sylvarian của Felicia và quá khứ Kryptonian." },
  { a: "meralina", b: "ragnaroir", note: "Mẹ con & tình nhân bí mật (nổi tiếng trong sự kiện trốn chạy ở Pherone Nexus): Ragnaroir là con trai dị dạng của Meralina với bầy Pregnomorph/Nadiran, luôn ẩn trong bóng của mẹ và quan hệ với mẹ bất cứ khi nào có cơ hội. Khi Ragnaroir cào tay Arisia để cứu Meralina, sự gắn bó mẹ-con-tình-nhân này khiến Arisia ghê tởm và ra lệnh giết ngay khi thấy. Meralina dù ngoài mặt kiêu ngạo nhưng rất nuông chiều Ragnaroir." },
  { a: "meralina", b: "ovalina", note: "Chủ chứa & khách trốn truy nã tại Pherone Nexus: Ovalina cho Meralina (tóc nhuộm đen cải trang) trú ẩn trong hang Pregnomorph chủ yếu vì bị thu hút bởi sức mạnh thú tính của Ragnaroir; cả hai thường xuyên ở cùng nhau khiến nơi đây an toàn như Wonder Island xưa." },
  { a: "arisia", b: "overlord", note: "Đối thủ ký Hiệp ước Cursew & âm mưu ký sinh trùng: Sau khi Arisia xóa sổ đạo quân Western Nadir bằng Gotterfall + Schwarzbruch, Overlord vừa ấn tượng vừa đề xuất Hiệp ước Cursew. Trong lần Arisia bí mật dịch chuyển tới pháo đài của Overlord, hắn đã gài ký sinh trùng bóng tối (vô hình với mọi kẻ dưới CR 1000) lên ghế ngồi để dần chiếm lấy Arisia và cả Đế chế Sylvarian." },
  { a: "arisia", b: "ojamon", note: "Nữ hoàng & gián điệp hai mang: Ojamon là gián điệp của Arisia cài vào phe Reformists, nhưng luôn khéo léo đi nước đôi để vừa có lợi cho bản thân (soạn Hiệp ước Cursew, gác kế hoạch hủy diệt Prussireich) vừa giữ quan hệ tốt với cả Arisia lẫn Reformists." },
  { a: "ojamon", b: "pussiri", note: "Pussiri cực kỳ thích giao phối với Ojamon, trong khi Ojamon chỉ coi đó là công việc định kỳ và qua các buổi gặp riêng với tướng cấp cao để nắm bí mật của Arisia." },
  { a: "brigitte", b: "zarcseid", note: "Brigitte Grok rất thích tướng Zarcseid Copilus bất chấp khác biệt phe phái; Zarcseid cũng có chút hứng thú nhưng quá bận chiến trường Predita. Overlord từng cảnh báo Arisia rút Brigitte khỏi việc hỗ trợ Zarcseid." },
  { a: "april", b: "cockary", note: "Quan hệ trao đổi tình báo – thể xác: Biết April bực bội vì lệnh truy tìm Meralina của Arisia, Cockary (em út Ovalina/Uterussa, hay hóa thiếu niên 13 tuổi) lén rò rỉ vị trí chung của Meralina để đổi lấy những buổi ân ái với April." },
  { a: "depek", b: "glinda", note: "Người cũ: Depek Seekon từng cặp kè cùng lúc cả Glinda Grande và Công chúa Qiyana Paige nhưng không chung thủy." },
  { a: "depek", b: "qiyana", note: "Người cũ: Qiyana từng qua lại với Depek Seekon cùng thời điểm với Glinda." },
  { a: "ellie", b: "hoornyxr", note: "Người cũ / bị troll: Nữ hiệp sĩ Prozonian Ellie Lionheart từng bị quỷ lùn chiều không gian ω+1 Hoornyxr troll và quan hệ, nhưng vẫn luôn giả vờ đó 'chỉ là một nhiệm vụ'." },
  { a: "kim", b: "jose", note: "Cha con nhà Santos (Vander): Jose Santos giao nhiệm vụ cho con gái Kim tới Metallia mở rộng địa bàn và ngoại giao với Sylvarian; Kim tự mình dẹp cuộc nổi dậy công nhân để lập thế đứng riêng." },
  { a: "inga", b: "sentrion", note: "Bí mật tại Future Corp: Inga Blina lén lút qua lại với vua Wombiote Sentrion Breed; nhà vệ sinh của tập đoàn thường xuyên xuất hiện các sự cố sinh Wombiote mỗi khi Inga rời đi, khiến Bill Greedle sinh nghi." },
  { a: "emily", b: "sentrion", note: "Cộng sinh Wombiote: Emily Violet gắn kết với Wombiote tên String từ năm 18 tuổi khi bị Dream Pig rượt trong rừng sâu — cô không bao giờ trục xuất String." },
  { a: "hailey", b: "exorotic", note: "Chấn thương thí nghiệm: Hailey từng là nạn nhân trong thí nghiệm bào thai của Exorotic thuộc The Collectors (về sau biến mất khỏi The Supers khi Etharos thỏa thuận ngầm với Mr. Mind)." },
  { a: "princesa", b: "dick", note: "Sự cố ám ảnh: Princesa Powers từng có một lần ngoài ý muốn với lão ăn mày bất tử Dick Pierce — sự kiện vẫn ám ảnh giấc mơ của cô." },
  { a: "bill", b: "sarah", note: "Bill Greedle (Chủ tịch Future Corp) đặc biệt quan tâm và để ý tới Sarah Foxx." },
  { a: "parasoid", b: "felicia", note: "Parasoid (tay đấm của The Collectors) luôn bị ám ảnh muốn săn bắt và chiếm đoạt Felicia Laurent." },
  { a: "bryce", b: "ovalina", note: "Cuộc đột kích quay phim Pherone Nexus: Bryce Dallas dẫn Evelina, Grace, Chunlina vào hang quay được bóng dáng Ovalina trước khi tháo chạy (Chunlina ở lại hang sâu với bầy Pregnomorph)." },
  { a: "etharos", b: "felicia", note: "Tình nhân / Đồng minh lập The Supers: Etharos Gemini (Earth Overlord) là cha của Perplexa với Felicia; The Supers được lập ra vừa bảo vệ Evernight vừa phục vụ Earth Overlord." },
  { a: "malocri", b: "july", note: "Hôn nhân chính trị tại Konstantine: Malocri Caranter cưới cả Nữ hoàng July Arum lẫn con gái Jorduyn Havenlus để tự xưng Hoàng đế Hinatian (dù thật lòng yêu cả hai, nhưng vẫn nhắm tới ngai vàng và thế hệ hậu duệ đông đảo)." },
  { a: "malocri", b: "jorduyn", note: "Hôn nhân chính trị tại Konstantine: Malocri cưới cả Jorduyn lẫn mẹ cô là July Arum để củng cố Đế chế Hinatian." }
];

function collectDirectPairContext(actors = []) {
  const ids = new Set(actors.map((a) => a?.id).filter(Boolean));
  const notes = [];
  for (const entry of CANON_PAIR_LORE) {
    if (ids.has(entry.a) && ids.has(entry.b)) {
      notes.push(entry.note);
    }
  }
  return notes;
}

function collectSpeciesForActors(actors = [], queryText = "") {
  const lower = `${queryText || ""} ${actors.map((a) => `${a?.species || ""} ${a?.race || ""}`).join(" ")}`.toLowerCase();
  const matched = [];
  for (const sp of SPECIES) {
    const idClean = sp.id.replace(/_fauna$/, "").replace(/_/g, " ");
    if (lower.includes(sp.name.toLowerCase()) || lower.includes(idClean)) {
      matched.push(`- ${sp.name} (Thể chất ${sp.physic}, Tech ${sp.tech}): ${sp.traits}`);
    }
  }
  if (matched.length === 0) {
    for (const sp of SPECIES.slice(0, 5)) {
      matched.push(`- ${sp.name} (${sp.physic}): ${sp.traits}`);
    }
  }
  return matched.slice(0, 7);
}

function formatCharacterCanon(c, gameState) {
  const fac = FACTIONS[c.fac]?.name || c.fac || "Độc lập";
  const loc = c.loc ? findLocation(c.loc) : null;
  const aff = gameState?.getAffinity ? gameState.getAffinity(c.id) : 0;
  const gText = c.g === "M" ? "Nam" : "Nữ";
  return `- ${c.name} [${c.id}] (${gText}, ${c.species}, Phe: ${fac}, CR ${c.cr}, ${c.title || "Chiến binh"}, Vị trí: ${loc ? loc.label : "Gaiastra"}, Tin cậy: ${aff}/100): ${c.bio || "Hậu duệ đột biến."} | Kỹ năng: ${(c.skills || []).join(", ")}.`;
}

export function buildLoreBible({ gameState, chapter = null, currentNode = null, extraText = "", explicitActorIds = [] } = {}) {
  const hero = resolveActor("__PROTAGONIST__", gameState) || CHAR_BY_ID.arisia;
  const seedIds = new Set([hero.id]);

  const rawTokens = [
    ...explicitActorIds,
    chapter?.leadChar,
    currentNode?.leftChar,
    currentNode?.rightChar,
    currentNode?.speaker
  ];
  const primaryActors = [hero];
  for (const tok of rawTokens) {
    const actor = resolveActor(tok, gameState);
    if (actor && !seedIds.has(actor.id)) {
      seedIds.add(actor.id);
      primaryActors.push(actor);
    }
  }

  const scanText = [
    chapter?.title,
    chapter?.summary,
    typeof currentNode?.text === "function" ? currentNode.text(gameState) : currentNode?.text,
    extraText
  ].filter(Boolean).join(" ");

  const mentionedActors = findMentionedCharacters(scanText, seedIds);
  const allActors = [...primaryActors, ...mentionedActors].slice(0, 8);

  const sectorId = resolveSectorId(currentNode?.sector || chapter?.sector, gameState, hero);
  const relevantSectors = findMentionedSectors(scanText, sectorId);

  const factionLines = Object.values(FACTIONS).map((f) => {
    const terr = gameState?.getFactionTerritoryPct ? gameState.getFactionTerritoryPct(f.id) : f.territory;
    return `- ${f.name} (Thủ lĩnh: ${f.leader}, Lãnh thổ live: ${terr}%): ${f.desc}`;
  });

  const sectorLines = relevantSectors.map((s) => {
    const dyn = gameState?.sectors?.[s.id];
    const ownerName = dyn ? (FACTIONS[dyn.owner]?.name || dyn.owner) : (FACTIONS[s.owner]?.name || s.owner);
    const placeNames = [
      ...(s.places || []).map((p) => p.name),
      ...(s.bodies || []).flatMap((b) => [b.name, ...(b.places || []).map((p) => p.name)])
    ].filter(Boolean).slice(0, 8);
    return `- ${s.name} [Cõi: ${s.realm}, Chủ quyền live: ${ownerName}, Thủ ${dyn?.defense ?? s.defense}, Ổn định ${dyn?.stability ?? s.stability}%]: ${s.desc}${placeNames.length ? ` (Địa danh thật: ${placeNames.join(", ")})` : ""}`;
  });

  const relLines = collectRelationsForActors(allActors);
  const directPairNotes = collectDirectPairContext(allActors);
  const speciesLines = collectSpeciesForActors(allActors, scanText);

  const superweaponLines = Object.values(SUPERWEAPONS).map((w) => {
    const fn = FACTIONS[w.owner]?.short || w.owner;
    return `- ${w.name} (${fn}): ${w.desc}`;
  });

  const keyTimeline = TIMELINE.map((t) => `- [${t.era}] ${t.title}: ${t.text}`);

  const hybridsSummary = (gameState?.hybrids || []).length > 0
    ? gameState.hybrids.slice(-5).map((h) => `${h.name} (CR ${h.cr}, ${h.species}, Phe ${FACTIONS[h.fac]?.short || h.fac})`).join("; ")
    : "Chưa lai tạo Hậu Duệ Hybrid nào.";

  const recentEvents = (gameState?.eventLog || []).slice(0, 4)
    .map((ev) => `- [${ev.turn}] ${ev.title}: ${ev.desc}`)
    .join("\n");

  return [
    "=== LORE CHUẨN HÓA CYCLE 12: AGE OF DOMINION ===",
    `Bối cảnh tổng quan: ${META.intro}`,
    `Trạng thái thiên hà LIVE: Chu kỳ ${gameState?.cycleMajor || 12}.${gameState?.cycleMinor || 1} | Căng thẳng: ${Math.round(gameState?.tension || 45)}% | Hiệp ước Cursew Pact: ${gameState?.pact?.active ? `Còn hiệu lực (${gameState.pact.turnsRemaining} chu kỳ)` : `ĐÃ SỤP ĐỔ (${gameState?.pact?.brokenBy || "Chiến tranh bùng phát"})`}`,
    `Hậu Duệ Hybrid trong game của người chơi: ${hybridsSummary}`,
    recentEvents ? `Sự kiện chiến sự gần nhất:\n${recentEvents}` : "",
    "\n[CƯỜNG QUỐC & THẾ LỰC]:\n" + factionLines.join("\n"),
    "\n[NHÂN VẬT LIÊN QUAN TRONG CẢNH]:\n" + allActors.map((a) => formatCharacterCanon(a, gameState)).join("\n"),
    directPairNotes.length ? "\n[QUAN HỆ TRỰC TIẾP & SỰ KIỆN NGUỒN GIỮA CÁC NHÂN VẬT TRONG CẢNH — PHẢI PHẢN ÁNH ĐÚNG THÁI ĐỘ]:\n" + directPairNotes.map((n) => `- ★ ${n}`).join("\n") : "",
    relLines.length ? "\n[QUAN HỆ CANON LIÊN QUAN]:\n" + relLines.map((r) => `- ${r}`).join("\n") : "",
    "\n[ĐỊA ĐIỂM THỰC ĐỊA]:\n" + sectorLines.join("\n"),
    "\n[CHỦNG TỘC & QUY TẮC SINH HỌC / MIỄN NHIỄM]:\n" + speciesLines.join("\n"),
    "\n[SIÊU VŨ KHÍ ĐẶC TRƯNG]:\n" + superweaponLines.join("\n"),
    "\n[MỐC LỊCH SỬ HẬU RESET & CYCLE 12]:\n" + keyTimeline.join("\n")
  ].filter(Boolean).join("\n");
}

export function buildNarrativeMemory(gameState, chapter = null, extraTurns = []) {
  const completed = (gameState?.vn?.completedChapters || []);
  const memNotes = (gameState?.vn?.aiMemory || []).slice(-10);
  const hist = (gameState?.vn?.history || []).slice(-14);

  const histLines = hist.map((h, i) => {
    const chapPrefix = h.chapter ? `[${h.chapter}] ` : "";
    if (h.kind === "choice" || h.choiceLabel) {
      return `${i + 1}. ${chapPrefix}👉 NGƯỜI CHƠI CHỌN: "${h.choiceLabel || h.text}"`;
    }
    const clean = String(h.text || "").replace(/\s+/g, " ").slice(0, 240);
    return `${i + 1}. ${chapPrefix}${h.speaker || "Dẫn chuyện"}: ${clean}`;
  });

  const extraLines = (extraTurns || []).slice(-6).map((t) =>
    `- (${t.role === "assistant" ? "NPC/AI" : "Người chơi"}): ${String(t.content || "").slice(0, 220)}`
  );

  return [
    "=== TRÍ NHỚ LIÊN TỤC (PHẢI NỐI TIẾP MẠCH NÀY, KHÔNG ĐƯỢC QUÊN) ===",
    chapter ? `Chương hiện tại: ${chapter.num || ""} - ${chapter.title || ""}${chapter.summary ? ` (${chapter.summary})` : ""}` : "",
    `Các chương đã hoàn thành trước đó: ${completed.length ? completed.join(", ") : "Chưa xong chương nào (đang ở giai đoạn đầu chiến dịch)"}`,
    memNotes.length ? "Diễn biến cốt lõi & Kết quả AI đã xảy ra:\n" + memNotes.map((m) => `* ${m}`).join("\n") : "",
    histLines.length ? "Chuỗi cảnh & lựa chọn gần nhất theo thứ tự thời gian:\n" + histLines.join("\n") : "",
    extraLines.length ? "Hội thoại gần nhất trong cảnh này:\n" + extraLines.join("\n") : ""
  ].filter(Boolean).join("\n");
}

function parseAIJsonPayload(text) {
  if (!text) return null;
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : cleaned;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }
  return null;
}

async function runCompletion({ messages, provider = "auto", temperature = 0.72, max_tokens = 1500 }) {
  const status = await detectAIStatus();
  const byok = getStoredAIKeys();
  const chosenProvider = provider || byok.preferredProvider || "auto";

  // 1. Prefer localhost server proxy if active
  if (status.localProxy) {
    const headers = { "Content-Type": "application/json" };
    if (chosenProvider !== "auto" && byok[chosenProvider]) {
      headers["x-byok-key"] = byok[chosenProvider];
    }
    const resp = await fetch("./api/ai/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({ provider: chosenProvider, messages, temperature, max_tokens })
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data.ok) return data;
    if (!byok.groq && !byok.deepseek && !byok.openrouter) {
      throw new Error(data.error || `Proxy AI lỗi HTTP ${resp.status}`);
    }
  }

  // 2. Direct client BYOK fetch (for cycle12.sedsp.lol static hosting)
  const order = chosenProvider === "auto" ? ["groq", "deepseek", "openrouter"] : [chosenProvider];
  const errors = [];
  for (const prov of order) {
    const key = byok[prov];
    const spec = DIRECT_PROVIDERS[prov];
    if (!key || !spec) {
      errors.push(`${prov}: chưa có API key`);
      continue;
    }
    for (const model of spec.models) {
      try {
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        };
        if (prov === "openrouter") {
          headers["HTTP-Referer"] = "https://cycle12.sedsp.lol";
          headers["X-Title"] = "Cycle 12: Age of Dominion";
        }
        const resp = await fetch(spec.url, {
          method: "POST",
          headers,
          body: JSON.stringify({ model, messages, temperature, max_tokens })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          errors.push(`${prov}/${model}: HTTP ${resp.status}`);
          continue;
        }
        const content = data?.choices?.[0]?.message?.content;
        if (content) return { ok: true, provider: prov, model, content };
      } catch (e) {
        errors.push(`${prov}/${model}: ${e.message}`);
      }
    }
  }
  throw new Error(errors.join(" | ") || "Chưa cấu hình API Key AI (Groq / DeepSeek / OpenRouter).");
}

export async function askAICharacterReply({ gameState, npcId, userMessage, history = [], provider = "auto", chapter = null }) {
  const hero = resolveActor("__PROTAGONIST__", gameState) || CHAR_BY_ID.arisia;
  const npc = resolveActor(npcId, gameState) || hero;
  const heroFac = FACTIONS[hero.fac]?.name || hero.fac;
  const npcFac = FACTIONS[npc.fac]?.name || npc.fac;

  const loreBible = buildLoreBible({
    gameState,
    chapter,
    extraText: userMessage || "",
    explicitActorIds: [hero.id, npc.id]
  });
  const memoryBlock = buildNarrativeMemory(gameState, chapter, history);

  const systemPrompt = [
    "Bạn là Engine Nhập Vai & Cốt Truyện Chính Thức cho 'Cycle 12: Age of Dominion'.",
    `BẠN ĐANG NHẬP VAI: ${npc.name} (ID: ${npc.id} | ${npc.title || "Chiến binh"} | Loài: ${npc.species} | Phe: ${npcFac} | CR: ${npc.cr}).`,
    `NGƯỜI CHƠI ĐANG LÀ: ${hero.name} (ID: ${hero.id} | ${hero.species} | Phe: ${heroFac} | CR: ${hero.cr}).`,
    "",
    loreBible,
    "",
    memoryBlock,
    "",
    "QUY TẮC TUYỆT ĐỐI:",
    "1. Bám sát 100% tiểu sử, tính cách, cấp bậc sức mạnh CR, quan hệ phe phái và địa danh thật trong [LORE CHUẨN HÓA CYCLE 12]. KHÔNG được bịa thêm chủng tộc, hành tinh hay nhân vật ngoài lore.",
    "2. PHẢI kiểm tra kỹ [QUAN HỆ TRỰC TIẾP & SỰ KIỆN NGUỒN] giữa người chơi và NPC! Nếu hai nhân vật là vợ chồng (vd: Magnatere × Hyouya, Jokar × Mina, Avalanche × Mary, Malocri × July/Jorduyn), người yêu, cha-con/mẹ-con, chị em hay kẻ thù, thái độ xưng hô & cảm xúc PHẢI thể hiện rõ ràng điều đó (ngọt ngào/âu yếm/lo lắng/chất vấn/cà khịa đúng hoàn cảnh), tuyệt đối KHÔNG nói chuyện như người xa lạ!",
    "3. PHẢI nhớ và nhắc tới các lựa chọn, câu hỏi và sự kiện người chơi vừa dẫn dắt trong [TRÍ NHỚ LIÊN TỤC].",
    "4. Hỗ trợ đầy đủ phong cách 18+ / NSFW, tình cảm lãng mạn, gợi cảm, thân mật hoặc tăm tối đúng với bản chất lore người lớn của 'Cycle 12: Age of Dominion' khi người chơi dẫn chuyện hoặc hỏi theo hướng đó — không né tránh hay làm nhạt tính cách nhân vật.",
    "5. Trả lời tiếng Việt tự nhiên, giàu thần thái, xuất DUY NHẤT 1 JSON hợp lệ:",
    `{"mood":"happy|angry|tense|smug|secret|combat|neutral","reply":"Lời thoại trực tiếp 2-4 câu sắc nét đúng tính cách & quan hệ","narration":"Mô tả hành động/ánh mắt/cơ thể/bối cảnh 1-2 câu","memoryNote":"1 câu tóm tắt ngắn những gì hai người vừa cam kết/tiết lộ để lưu vào Trí nhớ","affinityDelta":number(-10..15),"tensionDelta":number(-8..8),"creditsDelta":number(0..300),"followUpPrompts":["Câu hỏi/phản ứng tiếp nối đúng lore 1","Câu hỏi/phản ứng tiếp nối đúng lore 2"]}`
  ].join("\n");

  const msgs = [{ role: "system", content: systemPrompt }];
  for (const h of history.slice(-8)) {
    msgs.push({ role: h.role === "assistant" ? "assistant" : "user", content: h.content });
  }
  msgs.push({
    role: "user",
    content: userMessage || `Hãy tiếp nối bối cảnh đang diễn ra và khơi mở một đối thoại đúng lore giữa ${npc.name} và ${hero.name}.`
  });

  const res = await runCompletion({ messages: msgs, provider, temperature: 0.72, max_tokens: 1500 });
  const parsed = parseAIJsonPayload(res.content);
  if (parsed && parsed.reply) {
    return {
      ok: true,
      provider: res.provider,
      model: res.model,
      mood: parsed.mood || "neutral",
      reply: parsed.reply,
      narration: parsed.narration || "",
      memoryNote: parsed.memoryNote || `${npc.name} trao đổi với ${hero.name}: ${parsed.reply.slice(0, 90)}`,
      affinityDelta: Math.max(-10, Math.min(15, Number(parsed.affinityDelta) || 4)),
      tensionDelta: Math.max(-10, Math.min(10, Number(parsed.tensionDelta) || 0)),
      creditsDelta: Math.max(0, Math.min(350, Number(parsed.creditsDelta) || 0)),
      followUpPrompts: Array.isArray(parsed.followUpPrompts) ? parsed.followUpPrompts.slice(0, 3) : []
    };
  }
  return {
    ok: true,
    provider: res.provider,
    model: res.model,
    mood: "neutral",
    reply: res.content.trim(),
    narration: "",
    memoryNote: `${npc.name} hồi đáp ${hero.name}.`,
    affinityDelta: 4,
    tensionDelta: 0,
    creditsDelta: 0,
    followUpPrompts: []
  };
}

export async function askAIStoryExpand({ gameState, chapter, currentNodeText, currentNode = null, direction = "", provider = "auto" }) {
  const hero = resolveActor("__PROTAGONIST__", gameState) || CHAR_BY_ID.arisia;
  const heroFac = FACTIONS[hero.fac]?.name || hero.fac;
  const loreBible = buildLoreBible({
    gameState,
    chapter,
    currentNode,
    extraText: `${currentNodeText || ""} ${direction || ""}`,
    explicitActorIds: [hero.id]
  });
  const memoryBlock = buildNarrativeMemory(gameState, chapter, []);

  const allowedSpeakerIds = [
    hero.id,
    ...["arisia", "overlord", "emma", "zarcseid", "magnatere", "ovalina", "meralina", "ojamon", "pussiri", "felicia", "veidos", "ragnaroir", "hyouya", "tsunadia"]
  ];
  const uniqueSpeakers = [...new Set(allowedSpeakerIds)].join("|");

  const systemPrompt = [
    "Bạn là BIÊN KỊCH TRƯỞNG của sử thi Sci-Fi 'Cycle 12: Age of Dominion'.",
    `Nhân vật chính (POV người chơi đang nhập vai): ${hero.name} (ID: ${hero.id}, ${hero.species}, Phe ${heroFac}, CR ${hero.cr}).`,
    "",
    loreBible,
    "",
    memoryBlock,
    "",
    "NHIỆM VỤ & KỶ LUẬT CỐT TRUYỆN BẮT BUỘC:",
    "1. KHÔNG ĐƯỢC viết cốt truyện chung chung hay lặp lại đoạn trước. PHẢI nối tiếp trực tiếp từ [Cảnh vừa hiện] và tôn trọng mọi lựa chọn / biến cố trong [TRÍ NHỚ LIÊN TỤC].",
    "2. PHẢI tuân thủ [QUAN HỆ TRỰC TIẾP & SỰ KIỆN NGUỒN] giữa các nhân vật (vd: Magnatere & Hyouya là vợ chồng yêu nhau sâu sắc; Xal Kor & Hande có con chung khiến Hande thành mẹ kế của Felicia; Meralina & Ragnaroir là mẹ-con-tình-nhân; Overlord gài ký sinh trùng <CR 1000 lên Arisia...).",
    "3. Mọi chi tiết về địa danh, vũ khí và quy luật loài PHẢI khớp 100% với [LORE CHUẨN HÓA CYCLE 12] ở trên. Hỗ trợ đầy đủ cả nội dung 18+ / NSFW, tình cảm lãng mạn, gợi cảm hoặc tăm tối đúng chất Cycle 12 nếu người chơi dẫn dắt theo hướng đó.",
    "4. Viết bằng tiếng Việt điện ảnh, kịch tính, có chiều sâu chính trị & huyết thống. Cung cấp đúng 2 lựa chọn hành động mang tên nhân vật/phe/khu vực cụ thể để người chơi chọn tiếp.",
    "4. Trả về DUY NHẤT 1 JSON hợp lệ:",
    `{"speakerId":"narrator hoặc ${uniqueSpeakers}","speakerMood":"combat|smug|tense|secret|happy|angry","sceneText":"Đoạn văn nối tiếp trực tiếp 3-5 câu bám sát lore & ký ức trước đó","memoryNote":"1 câu tóm tắt diễn biến mới để ghi nhớ sang cảnh kế tiếp","choices":[{"label":"Lựa chọn chiến lược A (nêu rõ phe/nhân vật/hành động cụ thể)","outcome":"Hệ quả 2-3 câu bám lore sau khi chọn A","memoryNote":"1 câu tóm tắt kết quả nếu chọn A","creditsDelta":number(0..600),"tensionDelta":number(-10..10),"affinityDelta":number(0..15)},{"label":"Lựa chọn chiến lược B","outcome":"Hệ quả 2-3 câu bám lore sau khi chọn B","memoryNote":"1 câu tóm tắt kết quả nếu chọn B","creditsDelta":number(0..600),"tensionDelta":number(-10..10),"affinityDelta":number(0..15)}]}`
  ].join("\n");

  const userPrompt = [
    `[CẢNH HIỆN TẠI ĐANG HIỂN THỊ TRÊN MÀN HÌNH]: "${currentNodeText || chapter?.summary || ""}"`,
    direction
      ? `[CHỈ ĐẠO / HÀNH ĐỘNG NGƯỜI CHƠI MUỐN TIẾP NỐI]: "${direction}"`
      : "Hãy viết tiếp phân đoạn cao trào LIỀN MẠCH ngay sau cảnh hiện tại và các lựa chọn trước đó của người chơi!"
  ].join("\n");

  const res = await runCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    provider,
    temperature: 0.72,
    max_tokens: 1700
  });

  const parsed = parseAIJsonPayload(res.content);
  if (parsed && parsed.sceneText) {
    return {
      ok: true,
      provider: res.provider,
      model: res.model,
      speakerId: parsed.speakerId || hero.id,
      speakerMood: parsed.speakerMood || "tense",
      sceneText: parsed.sceneText,
      memoryNote: parsed.memoryNote || parsed.sceneText.slice(0, 140),
      choices: Array.isArray(parsed.choices) ? parsed.choices.slice(0, 2) : []
    };
  }
  return {
    ok: true,
    provider: res.provider,
    model: res.model,
    speakerId: "narrator",
    speakerMood: "tense",
    sceneText: res.content.trim(),
    memoryNote: res.content.trim().slice(0, 120),
    choices: []
  };
}
