import type { NextConfig } from "next"
import withSerwistInit from "@serwist/next"

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
})

const nextConfig: NextConfig = {
  // Requis : sans ceci, Next.js 16 refuse de démarrer en dev (Turbopack) car
  // le plugin Serwist (@serwist/next) injecte une config webpack. Ne pas retirer.
  turbopack: {},
}

export default withSerwist(nextConfig)
