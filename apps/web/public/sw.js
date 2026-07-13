const CACHE_NAME = "inq-static-v1";
const APP_SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("inq-") && name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  event.respondWith(
    request.mode === "navigate" ? networkFirst(request) : cacheFirst(request),
  );
});

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const indexResponse = await fetch("/", { cache: "no-cache" });

  if (!indexResponse.ok) {
    throw new Error("Unable to cache the app shell");
  }

  const html = await indexResponse.clone().text();
  const discoveredUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter(Boolean)
    .map((path) => new URL(path, self.location.origin))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => `${url.pathname}${url.search}`);
  const urls = [...new Set([...APP_SHELL_URLS, ...discoveredUrls])];

  await cache.put("/", indexResponse);
  await Promise.all(
    urls
      .filter((url) => url !== "/")
      .map(async (url) => {
        const response = await fetch(url, { cache: "no-cache" });

        if (response.ok) {
          await cache.put(url, response);
        }
      }),
  );
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    return (
      (await cache.match(request)) ??
      (await cache.match("/")) ??
      Response.error()
    );
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }

  return response;
}
