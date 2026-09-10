import sharp from "sharp"
import { mkdirSync } from "node:fs"

mkdirSync("public/icons", { recursive: true })

const source = "public/spartan-hero.png"

await sharp(source).resize(192, 192, { fit: "cover" }).toFile("public/icons/icon-192.png")
await sharp(source).resize(512, 512, { fit: "cover" }).toFile("public/icons/icon-512.png")
await sharp(source)
  .resize(410, 410, { fit: "cover" })
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: "#0a0a0a" })
  .toFile("public/icons/icon-512-maskable.png")

console.log("Icônes PWA générées dans public/icons/")
