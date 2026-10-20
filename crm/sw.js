// A&B Leads service worker: lets the app open offline-ish, and shows reminder notifications.
const CACHE = "ab-crm-v2";
const SHELL = ["./", "index.html", "styles.css", "app.js", "config.js", "manifest.webmanifest", "icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// App files: try the network first so updates show up, fall back to the saved copy.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))),
  );
});

self.addEventListener("push", (e) => {
  let data = { title: "A&B Leads", body: "", url: "#/" };
  try { data = { ...data, ...e.data.json() }; } catch { /* plain text */ }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL("./" + (e.notification.data?.url || ""), self.registration.scope).href;
  // iPhone doesn't support navigating an open window, so tell the app which page to show instead.
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (wins) => {
      const win = wins[0];
      if (win) {
        win.postMessage({ type: "open", hash: e.notification.data?.url || "#/" });
        try { return await win.focus(); } catch { /* fall through */ }
      }
      return self.clients.openWindow(target);
    }),
  );
});
