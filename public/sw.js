/* BUYBIZ installability worker. No offline or stale HTML caching: every
   navigation stays network-first so production updates are never pinned. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
