// The production timer for BF alert escalation (ASSERT-56). Like the automatic-tickets timer, it runs only
// in the Azure Container App (local development shares the database and must never notify or call). About
// once a minute it confirms or escalates open tickets; it never files tickets or calls the model.
import { definePlugin } from 'nitro'
import { runEscalations, withEscalationLock } from '../escalation'

const EVERY_MS = 60 * 1000
const FIRST_AFTER_MS = 90 * 1000

export default definePlugin(() => {
  if (process.env.NODE_ENV !== 'production' || !process.env.CONTAINER_APP_NAME) {
    console.log('escalation: off here; it runs only in the Azure Container App')
    return
  }
  const tick = async () => {
    try {
      const result = await withEscalationLock(runEscalations)
      if (result === null) return
      if (result.confirmed || result.escalated) {
        console.log(`escalation: ${result.open} open, ${result.confirmed} confirmed, ${result.escalated} escalated`)
      }
    } catch (error) {
      console.error(`escalation: run failed: ${(error as Error).message}`)
    }
  }
  console.log('escalation: on, every minute')
  setTimeout(() => void tick(), FIRST_AFTER_MS)
  setInterval(() => void tick(), EVERY_MS)
})
