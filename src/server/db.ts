import postgres from 'postgres'

let client: postgres.Sql | undefined

// One pool per process; DATABASE_URL and DATABASE_SCHEMA come from the easy-app contract.
export function sql(): postgres.Sql {
  if (client) return client
  const url = process.env.DATABASE_URL
  const schema = process.env.DATABASE_SCHEMA
  if (!url || !schema) throw new Error('DATABASE_URL and DATABASE_SCHEMA are required')
  client = postgres(url, {
    max: 5,
    connection: { search_path: `"${schema}"` },
    transform: { undefined: null },
  })
  return client
}
