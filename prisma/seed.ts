import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function getTcpConnectionString(url: string): string {
  if (!url.startsWith("prisma+postgres://")) return url
  const parsed = new URL(url)
  const apiKey = parsed.searchParams.get("api_key")!
  const decoded = JSON.parse(Buffer.from(apiKey, "base64").toString("utf8"))
  return decoded.databaseUrl
}

const connectionString = getTcpConnectionString(process.env.DATABASE_URL!)
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seed à implémenter au Sprint 3...")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
