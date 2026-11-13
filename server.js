const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;

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
      // Fallback SPA if requesting extensionless route
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
  const lans = getLanUrls(PORT);
  if (lans.length > 0) {
    console.log("Mobile/LAN (cùng Wi-Fi):");
    lans.forEach(u => console.log(`  -> ${u}`));
  }
});
