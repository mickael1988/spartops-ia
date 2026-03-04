import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function getTcpConnectionString(url: string): string {
  if (!url.startsWith("prisma+postgres://")) {
    return url
  }
  try {
    const parsed = new URL(url)
    const apiKey = parsed.searchParams.get("api_key")
    if (!apiKey) throw new Error("api_key manquant dans DATABASE_URL")
    const decoded = JSON.parse(Buffer.from(apiKey, "base64").toString("utf8"))
    return decoded.databaseUrl
  } catch {
    throw new Error("Impossible de décoder la DATABASE_URL prisma+postgres://")
  }
}

const connectionString = getTcpConnectionString(process.env.DATABASE_URL!)
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const muscleGroups = [
  { name: "Pectoraux", slug: "pectoraux", image: "💪" },
  { name: "Dos", slug: "dos", image: "🔙" },
  { name: "Épaules", slug: "epaules", image: "🏔️" },
  { name: "Biceps", slug: "biceps", image: "💪" },
  { name: "Triceps", slug: "triceps", image: "🦾" },
  { name: "Abdominaux", slug: "abdominaux", image: "🎯" },
  { name: "Jambes", slug: "jambes", image: "🦵" },
  { name: "Fessiers", slug: "fessiers", image: "🍑" },
]

async function main() {
  console.log("Seeding muscle groups...")
  for (const group of muscleGroups) {
    await prisma.muscleGroup.upsert({
      where: { slug: group.slug },
      update: {},
      create: group,
    })
  }
  console.log("✅ Muscle groups seeded")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
