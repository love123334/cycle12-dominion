// ============================================================================
// CYCLE 12: PORTRAIT & VISUAL NOVEL SPRITE RENDERER (v4 Upgraded)
// 45 ảnh chân dung độ phân giải cao (42 từ tư liệu gốc + Overlord/Ojamon/Veidos)
// + Bộ render Vector Sci-Fi Concept Art đa lớp có đặc trưng riêng cho 27 nhân vật còn lại
// ============================================================================

import { RACE_STYLE } from "../data/characters.js";
import { FACTIONS } from "../data/lore.js";

const SVG_CACHE = new Map();

const RACE_BADGE = {
  tamarite: "✦ TAMARITE",
  erisian: "◈ ERISIAN",
  sylvarian: "✧ SYLVARIAN",
  prozonian: "❄ PROZONIAN",
  hinatian: "❖ HINATIAN",
  alterian: "⚛ ALTERIAN",
  tyranian: "▲ TYRANIAN",
  ixalcian: "⬢ IXALCIAN",
  nadir: "✦ NADIR",
  human: "● HUMAN",
  hybrid: "◈ HYBRID",
  kryptonian: "☼ KRYPTON",
  demigod: "♛ DEMIGOD",
  wombiote: "◉ WOMBIOTE",
  chimera: "❖ CHIMERA",
  demon: "ψ DEMON",
  mutant: "☣ MUTANT",
  cyborg: "⚙ CYBORG"
};

function darken(hex, amt = 0.45) {
  const clean = (hex || "#334155").replace("#", "");
  if (clean.length !== 6) return "#0f172a";
  const r = Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * (1 - amt)));
  const g = Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * (1 - amt)));
  const b = Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * (1 - amt)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function getPortraitUrl(char) {
  if (!char) return "";
  if (char.portrait) return char.portrait;
  if (SVG_CACHE.has(char.id)) return SVG_CACHE.get(char.id);

  const rStyle = RACE_STYLE[char.race] || { aura: "#38bdf8", skin: "#f1dccf" };
  const facColor = FACTIONS[char.fac]?.color || rStyle.aura;
  const hair = char.hair || "#18181b";
  const hairDark = darken(hair, 0.42);
  const eye = char.eye || "#38bdf8";
  const outfit = char.outfit || facColor;
  const outfitDark = darken(outfit, 0.48);
  const skin = rStyle.skin || "#f1dccf";
  const skinShadow = darken(skin, 0.24);
  const aura = rStyle.aura || "#38bdf8";
  const isF = char.g === "F";
  const id = char.id;

  // Nhận diện đặc trưng nhân vật riêng theo lore
  const isCyclops = id === "cipheron";
  const isBeast = id === "ragnaroir" || id === "kale";
  const isCyborgBot = id === "mrmind" || char.race === "cyborg";
  const isKnight = id === "magnatere" || id === "zarcseid" || id === "depek" || id === "conquistor";
  const isRoyal = id === "malocri" || id === "carnavex" || id === "magnatere" || id === "etharos";
  const hasBeard = id === "conquistor" || id === "xalkor" || id === "bill" || id === "jose" || id === "dick";
  const hasHorns = char.race === "demon" || id === "kale" || id === "cipheron" || id === "ragnaroir";
  const hasHalo = char.race === "tamarite" || char.race === "erisian" || char.race === "demigod" || id === "malocri";
  const hasScars = id === "conquistor" || id === "avalanche" || id === "parasoid";

  // Phía sau tóc / áo choàng / vũ khí
  const capeBack = isKnight || isRoyal
    ? `<path d="M18,220 L38,118 L162,118 L182,220 Z" fill="${darken(aura, 0.55)}" opacity="0.88"/>`
    : "";

  const backWeapon = id === "magnatere"
    ? `<line x1="156" y1="20" x2="146" y2="215" stroke="#e2e8f0" stroke-width="5" stroke-linecap="round"/>
       <polygon points="158,8 148,34 164,34" fill="${aura}"/>`
    : (id === "conquistor" || id === "zarcseid"
      ? `<line x1="42" y1="22" x2="54" y2="210" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/>
         <line x1="30" y1="54" x2="58" y2="50" stroke="${aura}" stroke-width="4"/>`
      : "");

  const hairBack = isF
    ? `<path d="M44,74 Q36,144 50,192 L150,192 Q164,144 156,74 Q148,22 100,22 Q52,22 44,74 Z" fill="url(#hairGrad_${id})"/>`
    : `<path d="M56,78 Q58,28 100,26 Q142,28 144,78 Q138,54 100,52 Q62,54 56,78 Z" fill="url(#hairGrad_${id})"/>`;

  const hairFront = isF
    ? `<path d="M58,74 Q66,34 100,32 Q134,34 142,74 Q122,48 100,54 Q78,48 58,74 Z" fill="url(#hairGrad_${id})"/>
       <path d="M62,72 Q58,104 65,126" fill="none" stroke="${hair}" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
       <path d="M138,72 Q142,104 135,126" fill="none" stroke="${hair}" stroke-width="5" stroke-linecap="round" opacity="0.8"/>`
    : (id === "dick"
      ? `<path d="M54,76 Q60,24 100,22 Q140,24 146,76 Q128,44 100,46 Q72,44 54,76 Z" fill="#44403c" opacity="0.9"/>`
      : `<path d="M59,70 Q72,30 102,28 Q136,34 141,70 Q120,46 98,51 Q76,46 59,70 Z" fill="url(#hairGrad_${id})"/>
         <path d="M84,35 Q100,26 118,38" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2.5"/>`);

  const hornsMarkup = hasHorns
    ? (id === "kale"
      ? `<path d="M64,54 Q30,44 26,18 Q44,32 70,46 Z" fill="#78350f" stroke="#d97706" stroke-width="1.5"/>
         <path d="M136,54 Q170,44 174,18 Q156,32 130,46 Z" fill="#78350f" stroke="#d97706" stroke-width="1.5"/>`
      : `<path d="M67,48 Q44,24 52,10 Q66,24 75,44 Z" fill="#1e293b" stroke="${aura}" stroke-width="1.6"/>
         <path d="M133,48 Q156,24 148,10 Q134,24 125,44 Z" fill="#1e293b" stroke="${aura}" stroke-width="1.6"/>`)
    : "";

  const haloMarkup = hasHalo
    ? `<ellipse cx="100" cy="36" rx="58" ry="15" fill="none" stroke="${aura}" stroke-width="2.8" opacity="0.82"/>
       <ellipse cx="100" cy="36" rx="64" ry="18" fill="none" stroke="#facc15" stroke-width="1" stroke-dasharray="4 6" opacity="0.65"/>`
    : "";

  const armorShoulders = isF
    ? `<path d="M32,220 C36,162 66,144 100,144 C134,144 164,162 168,220 Z" fill="url(#armGrad_${id})"/>
       <path d="M40,164 L76,146 L100,178 L124,146 L160,164" fill="none" stroke="${aura}" stroke-width="2.5" opacity="0.85"/>`
    : `<path d="M18,220 C24,154 60,138 100,138 C140,138 176,154 182,220 Z" fill="url(#armGrad_${id})"/>
       <path d="M24,168 L58,140 L84,152 L64,186 Z" fill="${outfitDark}" stroke="${aura}" stroke-width="1.8"/>
       <path d="M176,168 L142,140 L116,152 L136,186 Z" fill="${outfitDark}" stroke="${aura}" stroke-width="1.8"/>
       <path d="M74,146 L100,188 L126,146" fill="none" stroke="${aura}" stroke-width="3" opacity="0.9"/>
       <polygon points="100,164 108,176 100,188 92,176" fill="${eye}" opacity="0.9"/>`;

  const eyeMarkup = isCyborgBot
    ? `<rect x="66" y="78" width="68" height="18" rx="6" fill="#090d1f" stroke="${aura}" stroke-width="2.2"/>
       <rect x="74" y="84" width="52" height="6" rx="3" fill="${eye}"/>
       <line x1="142" y1="68" x2="152" y2="34" stroke="#94a3b8" stroke-width="3"/>
       <circle cx="152" cy="34" r="4" fill="${eye}"/>`
    : isCyclops
      ? `<ellipse cx="100" cy="86" rx="14" ry="9" fill="#1e1b4b" stroke="${aura}" stroke-width="2"/>
         <circle cx="100" cy="86" r="6.5" fill="${eye}"/>
         <circle cx="102" cy="84" r="2.2" fill="#ffffff"/>`
      : `<path d="M71,80 Q83,74 93,81" fill="none" stroke="${hairDark}" stroke-width="2.8" stroke-linecap="round"/>
         <path d="M107,81 Q117,74 129,80" fill="none" stroke="${hairDark}" stroke-width="2.8" stroke-linecap="round"/>
         <ellipse cx="83" cy="88" rx="7" ry="4.6" fill="#f8fafc"/>
         <circle cx="83.5" cy="88" r="3.8" fill="${eye}"/>
         <circle cx="84.8" cy="86.6" r="1.3" fill="#ffffff"/>
         <ellipse cx="117" cy="88" rx="7" ry="4.6" fill="#f8fafc"/>
         <circle cx="116.5" cy="88" r="3.8" fill="${eye}"/>
         <circle cx="117.8" cy="86.6" r="1.3" fill="#ffffff"/>`;

  const beardMarkup = hasBeard
    ? `<path d="M68,98 Q68,128 100,134 Q132,128 132,98 Q122,118 100,120 Q78,118 68,98 Z" fill="${hairDark}" opacity="0.88"/>`
    : "";

  const scarMarkup = hasScars
    ? `<path d="M74,72 L90,98 M118,96 L130,112" stroke="#dc2626" stroke-width="2" stroke-linecap="round" opacity="0.85"/>`
    : "";

  const headShape = isF
    ? `<path d="M68,84 C68,52 132,52 132,84 C132,114 115,129 100,130 C85,129 68,114 68,84 Z" fill="url(#skinGrad_${id})"/>`
    : `<path d="M64,82 C64,50 136,50 136,82 L132,112 C128,124 114,132 100,132 C86,132 72,124 68,112 Z" fill="url(#skinGrad_${id})"/>`;

  const crownMarkup = isRoyal
    ? `<polygon points="72,38 82,19 92,33 100,14 108,33 118,19 128,38" fill="#facc15" stroke="#fde047" stroke-width="1.4"/>`
    : "";

  const beastMouth = isBeast
    ? `<polygon points="88,114 91,122 94,114" fill="#ffffff"/><polygon points="106,114 109,122 112,114" fill="#ffffff"/>`
    : "";

  const sigilBg = id === "hoornyxr"
    ? `<rect x="26" y="42" width="22" height="22" transform="rotate(25 37 53)" fill="none" stroke="#facc15" stroke-width="1.8" opacity="0.7"/>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 230">
    <defs>
      <radialGradient id="bg_${id}" cx="50%" cy="36%" r="68%">
        <stop offset="0%" stop-color="${aura}" stop-opacity="0.45"/>
        <stop offset="60%" stop-color="#0f172a" stop-opacity="0.96"/>
        <stop offset="100%" stop-color="#030712" stop-opacity="1"/>
      </radialGradient>
      <linearGradient id="skinGrad_${id}" x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stop-color="${skin}"/>
        <stop offset="100%" stop-color="${skinShadow}"/>
      </linearGradient>
      <linearGradient id="hairGrad_${id}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${hair}"/>
        <stop offset="100%" stop-color="${hairDark}"/>
      </linearGradient>
      <linearGradient id="armGrad_${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${outfit}"/>
        <stop offset="100%" stop-color="${outfitDark}"/>
      </linearGradient>
    </defs>
    <rect width="200" height="230" rx="16" fill="url(#bg_${id})"/>
    <circle cx="100" cy="96" r="76" fill="none" stroke="${aura}" stroke-width="1.3" stroke-dasharray="8 5" opacity="0.5"/>
    <circle cx="100" cy="96" r="60" fill="none" stroke="${facColor}" stroke-width="0.9" opacity="0.35"/>
    ${sigilBg}
    ${haloMarkup}
    ${backWeapon}
    ${capeBack}
    ${hairBack}
    ${hornsMarkup}
    ${armorShoulders}
    <path d="M84,120 L116,120 L119,154 L81,154 Z" fill="${skinShadow}"/>
    ${headShape}
    ${scarMarkup}
    ${eyeMarkup}
    <path d="M97,94 L99,104 L104,104" fill="none" stroke="#000000" stroke-opacity="0.28" stroke-width="1.6" stroke-linecap="round"/>
    ${beardMarkup}
    <path d="M90,113 Q100,117 110,113" fill="none" stroke="${isF ? "#be123c" : "#0f172a"}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
    ${beastMouth}
    ${hairFront}
    ${crownMarkup}
    <rect x="0" y="204" width="200" height="26" fill="#020617" fill-opacity="0.82"/>
    <text x="100" y="221" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="10.5" font-weight="800" letter-spacing="1.4" fill="${facColor}">${RACE_BADGE[char.race] || char.species.toUpperCase()}</text>
  </svg>`;

  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  SVG_CACHE.set(id, url);
  return url;
}

export function moodLabel(mood) {
  switch (mood) {
    case "angry": return "🔥 Sát khí";
    case "combat": return "⚔️ Sẵn sàng chiến đấu";
    case "happy": return "✨ Thân thiện";
    case "smug": return "😏 Tự tin";
    case "secret": return "👁️ Bí mật";
    case "tense": return "⚡ Căng thẳng";
    default: return "";
  }
}
