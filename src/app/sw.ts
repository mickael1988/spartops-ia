/// <reference lib="webworker" />
import { Serwist } from "serwist"
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"
import { CacheFirst, ExpirationPlugin, NetworkOnly, RangeRequestsPlugin, StaleWhileRevalidate } from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Mise en cache volontairement limitée aux assets statiques non personnalisés
// (polices, images, JS/CSS de build). Les pages, réponses RSC et routes /api/
// contiennent des données propres à l'utilisateur connecté — les mettre en
// cache (comme le fait @serwist/next/worker's `defaultCache` par défaut)
// permettrait à un Service Worker hors-ligne de resservir la dernière page
// vue par un utilisateur à quelqu'un d'autre sur un appareil partagé, après
// déconnexion, sans jamais repasser par la vérification de session côté
// serveur. Voir revue de sécurité du 2026-09-11.
const runtimeCaching = [
  {
    matcher: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
    handler: new CacheFirst({
      cacheName: "google-fonts-webfonts",
      plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60, maxAgeFrom: "last-used" })],
    }),
  },
  {
    matcher: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
    handler: new StaleWhileRevalidate({
      cacheName: "google-fonts-stylesheets",
      plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 10080 * 60, maxAgeFrom: "last-used" })],
    }),
  },
  {
    matcher: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "static-font-assets",
      plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 10080 * 60, maxAgeFrom: "last-used" })],
    }),
  },
  {
    matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "static-image-assets",
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 720 * 60 * 60, maxAgeFrom: "last-used" })],
    }),
  },
  {
    matcher: /\/_next\/static.+\.js$/i,
    handler: new CacheFirst({
      cacheName: "next-static-js-assets",
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 1440 * 60, maxAgeFrom: "last-used" })],
    }),
  },
  {
    matcher: /\/_next\/image\?url=.+$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "next-image",
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 1440 * 60, maxAgeFrom: "last-used" })],
    }),
  },
  {
    matcher: /\.(?:mp3|wav|ogg)$/i,
    handler: new CacheFirst({
      cacheName: "static-audio-assets",
      plugins: [
        new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 1440 * 60, maxAgeFrom: "last-used" }),
        new RangeRequestsPlugin(),
      ],
    }),
  },
  {
    matcher: /\.(?:mp4|webm)$/i,
    handler: new CacheFirst({
      cacheName: "static-video-assets",
      plugins: [
        new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 1440 * 60, maxAgeFrom: "last-used" }),
        new RangeRequestsPlugin(),
      ],
    }),
  },
  {
    matcher: /\.(?:js)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "static-js-assets",
      plugins: [new ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 1440 * 60, maxAgeFrom: "last-used" })],
    }),
  },
  {
    matcher: /\.(?:css|less)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "static-style-assets",
      plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 1440 * 60, maxAgeFrom: "last-used" })],
    }),
  },
  // Tout le reste (pages HTML, réponses RSC, /api/*, cross-origin) : jamais
  // mis en cache, toujours re-vérifié par le serveur — contenu personnalisé.
  {
    matcher: /.*/i,
    handler: new NetworkOnly(),
  },
]

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
})

serwist.addEventListeners()

// Purge défensive de tous les caches sur demande explicite du client
// (déclenchée à la déconnexion, voir src/components/layout/header.tsx) —
// couvre aussi les caches laissés par une version antérieure du Service
// Worker qui utilisait `defaultCache` (pages/RSC/API mis en cache).
self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_AUTH_CACHES") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))))
  }
})
