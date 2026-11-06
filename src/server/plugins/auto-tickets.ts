// The production timer for automatic tickets (ASSERT-49). It runs only in the Azure Container App:
// local development uses the same database, and a developer's machine must never file real tickets.
// Azure Container Apps sets CONTAINER_APP_NAME in every replica.
import { definePlugin } from 'nitro'
import { fileAllAutomaticTickets, withRunLock } from '../auto-tickets'

const EVERY_MS = 10 * 60 * 1000
const FIRST_AFTER_MS = 60 * 1000

export default definePlugin(() => {
  if (process.env.NODE_ENV !== 'production' || !process.env.CONTAINER_APP_NAME) {
    console.log('automatic tickets: off here; they run only in the Azure Container App')
    return
  }
  const tick = async () => {
    try {
      const results = await withRunLock(fileAllAutomaticTickets)
      if (results === null) {
        console.log('automatic tickets: another run holds the lock')
        return
      }
      for (const result of results) {
        console.log(`automatic tickets: ${result.project}: ${result.skipped ? `skipped (${result.skipped})` : `${result.filed.length} filed, ${result.grouped} on an overflow ticket, ${result.failed.length} failed`}`)
        for (const failure of result.failed) console.error(`automatic tickets: ${result.project}: ${failure.problem}: ${failure.error}`)
      }
    } catch (error) {
      console.error(`automatic tickets: run failed: ${(error as Error).message}`)
    }
  }
  console.log('automatic tickets: on, every 10 minutes')
  setTimeout(() => void tick(), FIRST_AFTER_MS)
  setInterval(() => void tick(), EVERY_MS)
})
