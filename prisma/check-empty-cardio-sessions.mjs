// TEMPORARY guard (cardio live session rollout): refuse to run `db push --accept-data-loss`
// unless UserCardioSession is empty. Fails closed on any error. Removed after the rollout.
import pg from "pg"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("[guard] DATABASE_URL is not set — refusing to continue")
  process.exit(1)
}

const client = new pg.Client({ connectionString: url })
try {
  await client.connect()
  const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM "UserCardioSession"')
  const n = rows[0].n
  if (n !== 0) {
    console.error(`[guard] UserCardioSession has ${n} row(s) — refusing to run db push --accept-data-loss`)
    process.exit(1)
  }
  console.log("[guard] UserCardioSession is empty — safe to push")
} catch (err) {
  console.error("[guard] check failed — refusing to continue:", err instanceof Error ? err.message : err)
  process.exit(1)
} finally {
  await client.end().catch(() => {})
}
