const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;

function loadEnvLocal() {
  const keys = {
    openrouter: process.env.OPENROUTER_API_KEY || "",
    deepseek: process.env.DEEPSEEK_API_KEY || "",
    groq: process.env.GROQ_API_KEY || ""
  };
  const envPath = path.join(ROOT, ".env.local");
  try {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
      for (const line of lines) {
        const clean = line.trim();
        if (!clean || clean.startsWith("#")) continue;
        const eq = clean.indexOf("=");
        if (eq < 1) continue;
        const k = clean.slice(0, eq).trim();
        const v = clean.slice(eq + 1).trim();
        if (k === "OPENROUTER_API_KEY" && v) keys.openrouter = v;
        if (k === "DEEPSEEK_API_KEY" && v) keys.deepseek = v;
        if (k === "GROQ_API_KEY" && v) keys.groq = v;
      }
    }
  } catch (err) {
    console.warn("Could not read .env.local:", err.message);
  }
  return keys;
}

const LOCAL_KEYS = loadEnvLocal();

const AI_ENDPOINTS = {
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    models: ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]
  },
  deepseek: {
    url: "https://api.deepseek.com/chat/completions",
    models: ["deepseek-chat"]
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    models: [
      "deepseek/deepseek-chat-v3-0324:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "google/gemini-2.0-flash-001",
      "openai/gpt-4o-mini"
    ]
  }
};

async function callSingleProvider(provider, key, payload) {
  const spec = AI_ENDPOINTS[provider];
  if (!spec || !key) throw new Error(`Provider ${provider} unavailable`);
  const modelsToTry = payload.model ? [payload.model] : spec.models;
  let lastErr = "No model tried";

  for (const model of modelsToTry) {
    try {
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      };
      if (provider === "openrouter") {
        headers["HTTP-Referer"] = "https://cycle12.sedsp.lol";
        headers["X-Title"] = "Cycle 12: Age of Dominion";
      }
      const resp = await fetch(spec.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: payload.messages || [],
          temperature: payload.temperature ?? 0.82,
          max_tokens: payload.max_tokens ?? 700
        })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        lastErr = `${provider}/${model} HTTP ${resp.status}: ${json?.error?.message || resp.statusText}`;
        continue;
      }
      const content = json?.choices?.[0]?.message?.content;
      if (!content) {
        lastErr = `${provider}/${model} empty choice`;
        continue;
      }
      return { ok: true, provider, model, content };
    } catch (e) {
      lastErr = `${provider}/${model}: ${e.message}`;
    }
  }
  throw new Error(lastErr);
}

async function handleAIChatProxy(req, res) {
  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
    if (raw.length > 512 * 1024) req.destroy();
  });
  req.on("end", async () => {
    try {
      const payload = JSON.parse(raw || "{}");
      const reqProv = (payload.provider || "auto").toLowerCase();
      const order = reqProv === "auto" ? ["groq", "deepseek", "openrouter"] : [reqProv];
      const byokKey = req.headers["x-byok-key"] || payload.apiKey || "";
      const errs = [];

      for (const p of order) {
        const key = (byokKey && reqProv === p) ? byokKey : LOCAL_KEYS[p];
        if (!key) {
          errs.push(`${p}: missing key`);
          continue;
        }
        try {
          const result = await callSingleProvider(p, key, payload);
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify(result));
          return;
        } catch (err) {
          errs.push(err.message);
        }
      }

      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: errs.join(" | ") }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  });
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
  let safeUrl = "/";
  try {
    safeUrl = decodeURIComponent((req.url || "/").split("?")[0]);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  if (safeUrl === "/api/ai/status" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify({
      localProxy: true,
      available: {
        groq: Boolean(LOCAL_KEYS.groq),
        deepseek: Boolean(LOCAL_KEYS.deepseek),
        openrouter: Boolean(LOCAL_KEYS.openrouter)
      }
    }));
    return;
  }

  if (safeUrl === "/api/ai/chat" && req.method === "POST") {
    handleAIChatProxy(req, res);
    return;
  }

  const relPath = safeUrl === "/" ? "/index.html" : safeUrl;
  const normalized = path.normalize(relPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, normalized);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (!path.extname(filePath)) {
        fs.readFile(path.join(ROOT, "index.html"), (err2, htmlData) => {
          if (err2) {
            res.writeHead(404);
            res.end("Not found");
            return;
          }
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(htmlData);
        });
        return;
      }
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": ext === ".js" || ext === ".css" || ext === ".html" ? "no-cache" : "public, max-age=86400"
    };
    res.writeHead(200, headers);
    res.end(data);
  });
});

function getLanUrls(port) {
  const urls = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        urls.push(`http://${net.address}:${port}`);
      }
    }
  }
  return urls;
}

server.listen(PORT, HOST, () => {
  console.log("========================================================");
  console.log("  CYCLE 12: AGE OF DOMINION — 3D INTERACTIVE NOVEL APP  ");
  console.log("========================================================");
  console.log(`Local PC : http://localhost:${PORT}`);
  console.log(`AI Proxy : Groq=${Boolean(LOCAL_KEYS.groq)} DeepSeek=${Boolean(LOCAL_KEYS.deepseek)} OpenRouter=${Boolean(LOCAL_KEYS.openrouter)}`);
  const lans = getLanUrls(PORT);
  if (lans.length > 0) {
    console.log("Mobile/LAN (cùng Wi-Fi):");
    lans.forEach(u => console.log(`  -> ${u}`));
  }
});
