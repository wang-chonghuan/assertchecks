// Applies db/migrations/*.sql in name order, once each. Migrations are additive only.
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { sql } from '../src/server/db'

const dir = resolve(import.meta.dirname, '../db/migrations')
const db = sql()

await db`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`
const applied = new Set((await db<{ name: string }[]>`SELECT name FROM schema_migrations`).map((row) => row.name))

for (const name of readdirSync(dir).filter((file) => file.endsWith('.sql')).sort()) {
  if (applied.has(name)) continue
  await db.begin(async (tx) => {
    await tx.unsafe(readFileSync(resolve(dir, name), 'utf8'))
    await tx`INSERT INTO schema_migrations (name) VALUES (${name})`
  })
  console.log(`applied ${name}`)
}
console.log('migrations up to date')
await db.end()
