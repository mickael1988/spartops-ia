import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function getTcpConnectionString(url: string): string {
  if (!url.startsWith("prisma+postgres://")) return url
  const parsed = new URL(url)
  const apiKey = parsed.searchParams.get("api_key")
  if (!apiKey) throw new Error("api_key manquant dans DATABASE_URL")
  try {
    const decoded = JSON.parse(Buffer.from(apiKey, "base64").toString("utf8"))
    return decoded.databaseUrl
  } catch {
    throw new Error("Impossible de décoder la DATABASE_URL prisma+postgres://")
  }
}

const connectionString = getTcpConnectionString(process.env.DATABASE_URL!)
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const FUNDAMENTAL_NAMES = ["Squat", "Développé couché", "Soulevé de terre"]

async function main() {
  for (const name of FUNDAMENTAL_NAMES) {
    const result = await prisma.exercise.updateMany({
      where: { name },
      data: { isFundamental: true },
    })
    console.log(`${name}: ${result.count} exercice(s) marqué(s)`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
