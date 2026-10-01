import type { NextConfig } from "next"
import withSerwistInit from "@serwist/next"

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  // Par défaut tout public/ est préchargé ("**/*"), ce qui inclurait l'intro vidéo :
  // le préchargement la resservirait en réponse complète (200) sans gérer les requêtes
  // Range, ce qui casse la lecture vidéo sur iOS Safari (et pèse 8,5 Mo à l'installation
  // du SW). Les patterns "!..." ne sont pas supportés ici : on liste donc les types à
  // précharger. À compléter si un nouveau type de fichier léger est ajouté à public/.
  globPublicPatterns: ["*.png", "*.webp", "*.svg", "*.json", "groups/**/*", "icons/**/*"],
})

const nextConfig: NextConfig = {
  // Requis : sans ceci, Next.js 16 refuse de démarrer en dev (Turbopack) car
  // le plugin Serwist (@serwist/next) injecte une config webpack. Ne pas retirer.
  turbopack: {},
}

export default withSerwist(nextConfig)
