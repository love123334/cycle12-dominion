// ============================================================================
// CYCLE 12: AI STORY & CHARACTER DIALOGUE DIRECTOR (v8.0)
// Multi-Provider Orchestrator: Groq / DeepSeek / OpenRouter
// - On localhost (`server.js`), seamlessly routes via `/api/ai/chat` (reads .env.local).
// - On static web (`cycle12.sedsp.lol`), calls providers directly with user BYOK keys
//   stored strictly in browser localStorage (zero secrets ever pushed to git).
// ============================================================================

import { CHAR_BY_ID, RELATIONS } from "../data/characters.js";
import { FACTIONS } from "../data/lore.js";
import { findLocation } from "../data/galaxy.js";

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

function collectRelationsFor(hero, npc) {
  const hits = [];
  const names = [hero?.name?.split(" ")[0], npc?.name?.split(" ")[0]].filter(Boolean);
  for (const rel of RELATIONS) {
    for (const item of rel.items || []) {
      if (names.some((n) => item.includes(n))) {
        hits.push(`[${rel.type}] ${item}`);
      }
    }
  }
  return hits.slice(0, 6).join("; ");
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

async function runCompletion({ messages, provider = "auto", temperature = 0.85, max_tokens = 680 }) {
  const status = await detectAIStatus();
  const byok = getStoredAIKeys();
  const chosenProvider = provider || byok.preferredProvider || "auto";

  // 1. Prefer localhost server proxy if active (and user hasn't forced empty override)
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
    // If proxy failed and user entered BYOK locally, allow direct attempt below
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

export async function askAICharacterReply({ gameState, npcId, userMessage, history = [], provider = "auto" }) {
  const hero = gameState?.getProtagonist ? gameState.getProtagonist() : CHAR_BY_ID.arisia;
  const npc = CHAR_BY_ID[npcId] || gameState?.hybrids?.find((h) => h.id === npcId) || hero;
  const loc = npc.loc ? findLocation(npc.loc) : null;
  const heroFac = FACTIONS[hero.fac]?.name || hero.fac;
  const npcFac = FACTIONS[npc.fac]?.name || npc.fac;
  const affinity = gameState?.getAffinity ? gameState.getAffinity(npc.id) : 0;
  const relNotes = collectRelationsFor(hero, npc);

  const systemPrompt = [
    "Bạn là Engine Kể Chuyện & Nhập Vai Nhân Vật cho game Sci-Fi Visual Novel 'Cycle 12: Age of Dominion'.",
    `Bạn đang nhập vai nhân vật: ${npc.name} (${npc.title || "Chiến binh"}, Loài: ${npc.species}, Phe: ${npcFac}, CR: ${npc.cr}).`,
    `Tiểu sử & tính cách: ${npc.bio || "Hậu duệ đột biến Chu Kỳ 12."}`,
    `Kỹ năng đặc trưng: ${(npc.skills || []).join(", ")}.`,
    `Người chơi đang điều khiển Nhân Vật Chính: ${hero.name} (${hero.species}, Phe ${heroFac}, CR ${hero.cr}).`,
    `Địa điểm hiện tại: ${loc ? loc.label : "Gaiastra"} | Chu kỳ: ${gameState?.cycleMajor || 12}.${gameState?.cycleMinor || 1} | Căng thẳng: ${Math.round(gameState?.tension || 45)}% | Hiệp ước Cursew: ${gameState?.pact?.active ? "Đang hiệu lực" : "Đã sụp đổ"} | Độ tin cậy hiện tại với ${hero.name}: ${affinity}/100.`,
    relNotes ? `Quan hệ lore liên quan: ${relNotes}.` : "",
    "Yêu cầu BẮT BUỘC:",
    "- Viết bằng tiếng Việt tự nhiên, sắc sảo, đậm chất sử thi space-opera & đấu trí chính trị đúng lore nhân vật.",
    "- Nội dung PG-13 / an toàn, tập trung vào mưu lược, tâm lý nhân vật, huyết thống vũ trụ và xung đột phe phái.",
    "- Trả về DUY NHẤT JSON hợp lệ có cấu trúc:",
    `{"mood":"happy|angry|tense|smug|secret|combat|neutral","reply":"Lời thoại trực tiếp 2-4 câu cực có thần thái","narration":"Mô tả hành động/cảm xúc ngắn 1 câu","affinityDelta":number(-10..15),"tensionDelta":number(-8..8),"creditsDelta":number(0..300),"followUpPrompts":["Câu hỏi/hành động gợi ý 1","Câu hỏi/hành động gợi ý 2"]}`
  ].filter(Boolean).join("\n");

  const msgs = [{ role: "system", content: systemPrompt }];
  for (const h of history.slice(-6)) {
    msgs.push({ role: h.role === "assistant" ? "assistant" : "user", content: h.content });
  }
  msgs.push({
    role: "user",
    content: userMessage || `Hãy mở đầu một cảnh đối thoại sâu sắc, hé lộ bí mật hoặc âm mưu phe phái của ${npc.name} trước mặt ${hero.name}.`
  });

  const res = await runCompletion({ messages: msgs, provider, temperature: 0.85, max_tokens: 1400 });
  const parsed = parseAIJsonPayload(res.content);
  if (parsed && parsed.reply) {
    return {
      ok: true,
      provider: res.provider,
      model: res.model,
      mood: parsed.mood || "neutral",
      reply: parsed.reply,
      narration: parsed.narration || "",
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
    affinityDelta: 4,
    tensionDelta: 0,
    creditsDelta: 0,
    followUpPrompts: []
  };
}

export async function askAIStoryExpand({ gameState, chapter, currentNodeText, direction = "", provider = "auto" }) {
  const hero = gameState?.getProtagonist ? gameState.getProtagonist() : CHAR_BY_ID.arisia;
  const heroFac = FACTIONS[hero.fac]?.name || hero.fac;
  const sectorName = gameState?.sectorName ? gameState.sectorName(chapter?.sector || "sylvalon") : "Gaiastra";

  const systemPrompt = [
    "Bạn là Biên Kịch Trưởng của 'Cycle 12: Age of Dominion' (vũ trụ Gaiastra 20 hệ sao, 8 phe phái, 15 chủng tộc).",
    `Nhân vật chính hiện tại của người chơi: ${hero.name} (${hero.species}, Phe: ${heroFac}, CR ${hero.cr}, ${hero.title}).`,
    `Chương đang chơi: ${chapter?.num || "SỬ THI"} - ${chapter?.title || "Gaiastra"} tại ${sectorName}.`,
    `Hiệp ước Cursew: ${gameState?.pact?.active ? "Hiệu lực" : "Đổ vỡ"} • Căng thẳng ngân hà: ${Math.round(gameState?.tension || 45)}%.`,
    "Nhiệm vụ: Viết tiếp MỘT PHÂN ĐOẠN CỐT TRUYỆN MỞ RỘNG (dưới góc nhìn nhân vật chính ở trên), có cao trào điện ảnh, bất ngờ chính trị/chiến tranh và 2 lựa chọn chiến lược tiếp nối.",
    "Trả về DUY NHẤT JSON hợp lệ:",
    `{"speakerId":"${hero.id} hoặc arisia|overlord|emma|zarcseid|magnatere|ovalina|meralina|narrator","speakerMood":"combat|smug|tense|secret|happy|angry","sceneText":"Đoạn văn sử thi 3-5 câu giàu hình ảnh bằng tiếng Việt","choices":[{"label":"Lựa chọn A","outcome":"Kết quả/hậu quả ngắn 2-3 câu","creditsDelta":number(0..600),"tensionDelta":number(-10..10),"affinityDelta":number(0..15)},{"label":"Lựa chọn B","outcome":"Kết quả/hậu quả ngắn 2-3 câu","creditsDelta":number(0..600),"tensionDelta":number(-10..10),"affinityDelta":number(0..15)}]}`
  ].join("\n");

  const userPrompt = [
    `Ngữ cảnh cảnh vừa qua: "${currentNodeText || chapter?.summary || ""}"`,
    direction ? `Hướng triển khai người chơi mong muốn: "${direction}"` : "Hãy tạo một biến cố cao trào hoặc cuộc chạm trán bất ngờ giữa các phe!"
  ].join("\n");

  const res = await runCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    provider,
    temperature: 0.88,
    max_tokens: 1600
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
    choices: []
  };
}
