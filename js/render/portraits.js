// ============================================================================
// CYCLE 12: PORTRAIT & VISUAL NOVEL SPRITE RENDERER (v7 Graphic-Novel Ink Style)
// - 45 raster portraits + local custom Grok/file portrait overrides
// - High-contrast chiaroscuro sci-fi graphic-novel busts for remaining roster
// ============================================================================

import { RACE_STYLE } from "../data/characters.js";
import { FACTIONS } from "../data/lore.js";

const SVG_CACHE = new Map();
const CUSTOM_PORTRAIT_KEY = "CYCLE12_CUSTOM_PORTRAITS_V1";

function loadCustomPortraits() {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(CUSTOM_PORTRAIT_KEY) : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getCustomPortrait(charId) {
  const map = loadCustomPortraits();
  return map[charId] || null;
}

export function setCustomPortrait(charId, dataUrl) {
  const map = loadCustomPortraits();
  if (dataUrl) map[charId] = dataUrl;
  else delete map[charId];
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(CUSTOM_PORTRAIT_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

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

function lighten(hex, amt = 0.25) {
  const clean = (hex || "#64748b").replace("#", "");
  if (clean.length !== 6) return "#cbd5e1";
  const r = Math.min(255, Math.round(parseInt(clean.slice(0, 2), 16) + (255 - parseInt(clean.slice(0, 2), 16)) * amt));
  const g = Math.min(255, Math.round(parseInt(clean.slice(2, 4), 16) + (255 - parseInt(clean.slice(2, 4), 16)) * amt));
  const b = Math.min(255, Math.round(parseInt(clean.slice(4, 6), 16) + (255 - parseInt(clean.slice(4, 6), 16)) * amt));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function getPortraitUrl(char) {
  if (!char) return "";
  const custom = getCustomPortrait(char.id);
  if (custom) return custom;
  if (char.portrait) {
    return char.portrait.includes("?") ? `${char.portrait}&v=15.1` : `${char.portrait}?v=15.1`;
  }
  if (SVG_CACHE.has(char.id)) return SVG_CACHE.get(char.id);

  const rStyle = RACE_STYLE[char.race] || { aura: "#38bdf8", skin: "#e5c3b1" };
  const facColor = FACTIONS[char.fac]?.color || rStyle.aura;
  const hair = char.hair || "#18181b";
  const hairDark = darken(hair, 0.52);
  const hairLight = lighten(hair, 0.22);
  const eye = char.eye || "#38bdf8";
  const outfit = char.outfit || facColor;
  const outfitDark = darken(outfit, 0.56);
  const skin = rStyle.skin || "#e5c3b1";
  const skinMid = darken(skin, 0.16);
  const skinDeep = darken(skin, 0.38);
  const aura = rStyle.aura || "#38bdf8";
  const isF = char.g === "F";
  const id = char.id;

  const isCyclops = id === "cipheron";
  const isBeast = id === "ragnaroir" || id === "kale";
  const isCyborgBot = id === "mrmind" || char.race === "cyborg";
  const isHelmeted = id === "magnatere";
  const hasBeard = id === "conquistor" || id === "xalkor" || id === "bill" || id === "jose" || id === "dick";
  const hasHorns = char.race === "demon" || id === "kale" || id === "ragnaroir";
  const hasHalo = char.race === "tamarite" || char.race === "erisian" || id === "malocri";
  const hasScars = id === "conquistor" || id === "avalanche" || id === "parasoid" || id === "ragnaroir";
  const hasCollar = !isBeast && id !== "dick";

  // Angular sculpted cheekbones & jawlines (comic graphic novel style)
  const jawPath = isF
    ? "M70,76 L72,102 L86,125 L100,131 L114,125 L128,102 L130,76 C130,48 70,48 70,76 Z"
    : "M65,74 L67,104 L82,126 L100,133 L118,126 L133,104 L135,74 C135,45 65,45 65,74 Z";

  const backCloak = `<path d="M10,230 L32,126 L168,126 L190,230 Z" fill="${darken(aura, 0.65)}" opacity="0.92"/>`;

  const techShoulders = isF
    ? `<path d="M26,230 C32,162 64,142 100,142 C136,142 168,162 174,230 Z" fill="url(#armG_${id})"/>
       <path d="M44,158 L100,188 L156,158" fill="none" stroke="${aura}" stroke-width="2" opacity="0.8"/>`
    : `<path d="M12,230 C18,150 56,134 100,134 C144,134 182,150 188,230 Z" fill="url(#armG_${id})" stroke="#090d1f" stroke-width="2"/>
       <path d="M16,174 L56,136 L82,152 L56,196 Z" fill="${outfitDark}" stroke="${aura}" stroke-width="1.6"/>
       <path d="M184,174 L144,136 L118,152 L144,196 Z" fill="${outfitDark}" stroke="${aura}" stroke-width="1.6"/>
       ${hasCollar ? `<path d="M68,136 L78,162 L100,174 L122,162 L132,136" fill="none" stroke="${aura}" stroke-width="2.4"/>` : ""}
       <polygon points="100,164 107,178 100,192 93,178" fill="${eye}" opacity="0.9"/>`;

  // Crisp intense anime/comic eyes instead of oval emoji circles
  let eyesMarkup = "";
  if (isCyborgBot) {
    eyesMarkup = `
      <polygon points="66,76 134,76 128,96 72,96" fill="#050814" stroke="${aura}" stroke-width="2"/>
      <rect x="74" y="83" width="52" height="5" rx="2" fill="${eye}"/>
      <circle cx="100" cy="85.5" r="7" fill="${eye}" opacity="0.35"/>`;
  } else if (isHelmeted) {
    eyesMarkup = `
      <path d="M64,52 L100,34 L136,52 L130,98 L100,114 L70,98 Z" fill="#1e1b4b" stroke="${aura}" stroke-width="2"/>
      <polygon points="73,78 96,86 76,90" fill="${eye}"/>
      <polygon points="127,78 104,86 124,90" fill="${eye}"/>`;
  } else if (isCyclops) {
    eyesMarkup = `
      <path d="M76,74 Q100,66 124,74" fill="none" stroke="#090d1f" stroke-width="4"/>
      <polygon points="82,86 100,79 118,86 100,93" fill="#090d1f" stroke="${aura}" stroke-width="1.5"/>
      <circle cx="100" cy="86" r="5.5" fill="${eye}"/>
      <circle cx="102" cy="84" r="1.8" fill="#fff"/>`;
  } else {
    eyesMarkup = `
      <polygon points="71,81 93,86 89,91 74,89" fill="#0f172a"/>
      <polygon points="129,81 107,86 111,91 126,89" fill="#0f172a"/>
      <polygon points="74,84 91,87 88,91 76,90" fill="#f8fafc"/>
      <polygon points="126,84 109,87 112,91 124,90" fill="#f8fafc"/>
      <circle cx="83" cy="87.5" r="3.1" fill="${eye}"/>
      <circle cx="117" cy="87.5" r="3.1" fill="${eye}"/>
      <circle cx="84" cy="86.5" r="1.1" fill="#ffffff"/>
      <circle cx="118" cy="86.5" r="1.1" fill="#ffffff"/>
      <path d="M69,77 L93,82 M131,77 L107,82" stroke="${hairDark}" stroke-width="3.2" stroke-linecap="round"/>`;
  }

  // Sculpted angular hair strands (swept comic silhouette, no bulbous bowl cap!)
  const hairBack = isF
    ? `<path d="M42,74 L32,168 L66,184 L134,184 L168,168 L158,74 C150,24 50,24 42,74 Z" fill="url(#hairG_${id})"/>`
    : `<path d="M55,82 L50,52 L74,26 L104,20 L132,30 L148,54 L144,82 Z" fill="url(#hairG_${id})"/>`;

  const hairFront = isHelmeted
    ? ""
    : isF
      ? `<path d="M56,74 L68,38 L100,28 L134,38 L144,74 L126,52 L106,66 L94,48 L72,62 Z" fill="url(#hairG_${id})"/>
         <path d="M74,40 L102,32 L126,42" fill="none" stroke="${hairLight}" stroke-width="2" opacity="0.5"/>`
      : `<path d="M58,74 L66,42 L86,26 L104,34 L126,24 L142,46 L142,72 L126,50 L110,64 L96,46 L76,64 Z" fill="url(#hairG_${id})"/>
         <path d="M72,44 L96,35 L118,41" fill="none" stroke="${hairLight}" stroke-width="2" opacity="0.4"/>`;

  const beardMarkup = hasBeard
    ? `<path d="M72,102 L78,125 L100,136 L122,125 L128,102 L116,115 L100,117 L84,115 Z" fill="${hairDark}" opacity="0.9"/>`
    : "";

  const hornsMarkup = hasHorns
    ? `<path d="M64,52 L32,18 L50,48 Z" fill="#1e293b" stroke="${aura}" stroke-width="1.4"/>
       <path d="M136,52 L168,18 L150,48 Z" fill="#1e293b" stroke="${aura}" stroke-width="1.4"/>`
    : "";

  const haloMarkup = hasHalo
    ? `<ellipse cx="100" cy="34" rx="56" ry="12" fill="none" stroke="${aura}" stroke-width="2" opacity="0.75"/>`
    : "";

  const scarMarkup = hasScars
    ? `<path d="M75,70 L90,99 M117,96 L129,112" stroke="#f43f5e" stroke-width="1.8" stroke-linecap="round" opacity="0.85"/>`
    : "";

  const beastMouth = isBeast
    ? `<path d="M84,113 L92,109 L108,109 L116,113" fill="none" stroke="#090d1f" stroke-width="2.5"/>
       <polygon points="87,112 90,121 93,112" fill="#f8fafc"/><polygon points="107,112 110,121 113,112" fill="#f8fafc"/>`
    : `<path d="M90,113 L100,115 L110,113" fill="none" stroke="${isF ? "#be123c" : "#090d1f"}" stroke-width="2.2" stroke-linecap="round"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 230">
    <defs>
      <radialGradient id="bg_${id}" cx="50%" cy="32%" r="72%">
        <stop offset="0%" stop-color="${aura}" stop-opacity="0.38"/>
        <stop offset="55%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </radialGradient>
      <linearGradient id="skinG_${id}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${skin}"/>
        <stop offset="54%" stop-color="${skinMid}"/>
        <stop offset="100%" stop-color="${skinDeep}"/>
      </linearGradient>
      <linearGradient id="hairG_${id}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${hair}"/>
        <stop offset="100%" stop-color="${hairDark}"/>
      </linearGradient>
      <linearGradient id="armG_${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${outfit}"/>
        <stop offset="100%" stop-color="${outfitDark}"/>
      </linearGradient>
    </defs>
    <rect width="200" height="230" rx="14" fill="url(#bg_${id})"/>
    <path d="M20,40 L180,40 M20,85 L180,85 M20,130 L180,130 M100,10 L100,200" stroke="${facColor}" stroke-opacity="0.12" stroke-width="1"/>
    <polygon points="100,14 174,56 174,142 100,184 26,142 26,56" fill="none" stroke="${aura}" stroke-width="1.2" opacity="0.4"/>
    ${haloMarkup}
    ${backCloak}
    ${hairBack}
    ${hornsMarkup}
    ${techShoulders}
    <path d="M84,120 L116,120 L118,154 L82,154 Z" fill="${skinDeep}"/>
    <path d="${jawPath}" fill="url(#skinG_${id})" stroke="#090d1f" stroke-width="1.2"/>
    <path d="M98,86 L95,103 L103,104" fill="none" stroke="${skinDeep}" stroke-width="2" stroke-linecap="round"/>
    ${scarMarkup}
    ${eyesMarkup}
    ${beardMarkup}
    ${beastMouth}
    ${hairFront}
    <rect x="0" y="203" width="200" height="27" fill="#020617" fill-opacity="0.88"/>
    <text x="100" y="220" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="10.5" font-weight="800" letter-spacing="1.4" fill="${facColor}">${RACE_BADGE[char.race] || char.species.toUpperCase()}</text>
  </svg>`;

  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  SVG_CACHE.set(id, url);
  return url;
}

export function clearPortraitCache(charId) {
  if (charId) SVG_CACHE.delete(charId);
  else SVG_CACHE.clear();
}

export function getHybridPortraitUrl(hybrid) {
  if (!hybrid) return "";
  const id = hybrid.id || "hybrid";
  if (SVG_CACHE.has(id)) return SVG_CACHE.get(id);
  const cA = hybrid.auraA || "#38bdf8";
  const cB = hybrid.auraB || "#f472b6";
  const initial = (hybrid.name || "H")[0].toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 230">
    <defs>
      <linearGradient id="hbg_${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090d1f"/>
        <stop offset="50%" stop-color="${cA}" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="${cB}" stop-opacity="0.5"/>
      </linearGradient>
    </defs>
    <rect width="200" height="230" rx="14" fill="url(#hbg_${id})"/>
    <circle cx="100" cy="96" r="68" fill="none" stroke="${cA}" stroke-width="2" stroke-dasharray="10 5"/>
    <circle cx="100" cy="96" r="52" fill="none" stroke="${cB}" stroke-width="2.5"/>
    <polygon points="100,40 144,96 100,152 56,96" fill="${cB}" fill-opacity="0.22" stroke="#fde047" stroke-width="2"/>
    <path d="M68,72 C132,72 68,120 132,120" fill="none" stroke="#38bdf8" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M132,72 C68,72 132,120 68,120" fill="none" stroke="#f472b6" stroke-width="3.2" stroke-linecap="round"/>
    <text x="100" y="106" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="38" font-weight="900" fill="#ffffff" stroke="#020617" stroke-width="1.5">${initial}</text>
    <rect x="0" y="200" width="200" height="30" fill="#020617" fill-opacity="0.88"/>
    <text x="100" y="219" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="10.5" font-weight="800" fill="#fde047">${hybrid.isToken ? "🧬 TOKEN CR " : "🧬 HYBRID CR "}${hybrid.cr || 500}</text>
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
