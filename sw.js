const CACHE_NAME = "cycle12-dominion-v8.5";

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/vendor/three.min.js",
  "./js/app.js",
  "./js/data/lore.js",
  "./js/data/galaxy.js",
  "./js/data/characters.js",
  "./js/data/story.js",
  "./js/data/cards.js",
  "./js/data/cutscenes.js",
  "./js/game/state.js",
  "./js/game/card_engine.js",
  "./js/game/breeding.js",
  "./js/game/ai_director.js",
  "./js/render/engine.js",
  "./js/render/portraits.js",
  "./js/render/sfx.js",
  "./assets/icons/icon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/portraits/amily.jpeg",
  "./assets/portraits/anissa.jpeg",
  "./assets/portraits/aphrodina.jpeg",
  "./assets/portraits/april.jpeg",
  "./assets/portraits/arisia.jpeg",
  "./assets/portraits/atomina.png",
  "./assets/portraits/brigitte.jpeg",
  "./assets/portraits/ceasaria.jpeg",
  "./assets/portraits/chunliva.jpeg",
  "./assets/portraits/dejaylah.jpeg",
  "./assets/portraits/eleanor.jpeg",
  "./assets/portraits/elita.png",
  "./assets/portraits/ellie.jpeg",
  "./assets/portraits/emily.jpeg",
  "./assets/portraits/emma.jpeg",
  "./assets/portraits/evelina.jpeg",
  "./assets/portraits/felicia.jpeg",
  "./assets/portraits/glinda.png",
  "./assets/portraits/grace.jpeg",
  "./assets/portraits/hailey.jpeg",
  "./assets/portraits/hyouya.jpeg",
  "./assets/portraits/inga.jpeg",
  "./assets/portraits/jane.jpeg",
  "./assets/portraits/jorduyn.jpeg",
  "./assets/portraits/julia.jpeg",
  "./assets/portraits/july.jpeg",
  "./assets/portraits/kyaria.jpeg",
  "./assets/portraits/mary.jpeg",
  "./assets/portraits/meralina.png",
  "./assets/portraits/mina.webp",
  "./assets/portraits/ojamon.jpg",
  "./assets/portraits/ovalina.jpeg",
  "./assets/portraits/overlord.jpg",
  "./assets/portraits/princesa.jpeg",
  "./assets/portraits/pussiri.jpeg",
  "./assets/portraits/qiyana.jpeg",
  "./assets/portraits/sarah.jpeg",
  "./assets/portraits/sharon.jpeg",
  "./assets/portraits/sofie.jpeg",
  "./assets/portraits/trang.jpeg",
  "./assets/portraits/tsunadia.jpeg",
  "./assets/portraits/uterussa.jpeg",
  "./assets/portraits/veidos.jpg",
  "./assets/portraits/yulia.jpeg",
  "./assets/portraits/yulina.jpeg"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Partial precache:", err);
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const reqUrl = new URL(event.request.url);
  if (reqUrl.pathname.startsWith("/api/")) return;

  const isCodeOrDoc =
    event.request.mode === "navigate" ||
    /\.(html|css|js|webmanifest)(\?.*)?$/i.test(reqUrl.pathname);

  if (isCodeOrDoc) {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200 && networkRes.type === "basic") {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkRes;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200 && networkRes.type === "basic") {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkRes;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
