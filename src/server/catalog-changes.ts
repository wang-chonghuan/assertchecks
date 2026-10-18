// Required cases that disappeared from a check's run between two full runs. Pure, so it is tested
// without a database. A catalog that drops or demotes a failing case would otherwise turn a check
// green silently; this makes the reduction visible without blocking or re-judging anything.
import type { Selection } from './judge'
import type { CatalogChange } from '../lib/types'

interface CatalogCase { id: string; title?: string; status?: string; run?: string }

const cases = (catalog: unknown): CatalogCase[] => {
  const list = (catalog as { cases?: unknown } | null)?.cases
  return Array.isArray(list) ? list as CatalogCase[] : []
}

const required = (item: CatalogCase, selection: Selection) =>
  selection.status.includes(item.status ?? '') && selection.run.includes(item.run ?? '')

// Cases the check's selection required in the previous full run but not in the latest one.
// A run without a catalog (one that reported an error instead) is not a comparison point.
export function catalogChanges(previous: unknown, latest: unknown, selection: Selection): CatalogChange[] {
  if (!Array.isArray((latest as { cases?: unknown } | null)?.cases)) return []
  const now = new Map(cases(latest).map((item) => [item.id, item]))
  return cases(previous)
    .filter((item) => required(item, selection))
    .flatMap((item): CatalogChange[] => {
      const current = now.get(item.id)
      if (!current) return [{ case: item.id, title: item.title ?? '', change: 'removed', status: null, run: null }]
      if (required(current, selection)) return []
      // Name only what took the case out of the selection: its status, its run, or both.
      return [{
        case: item.id,
        title: current.title ?? item.title ?? '',
        change: 'moved',
        status: selection.status.includes(current.status ?? '') ? null : current.status ?? null,
        run: selection.run.includes(current.run ?? '') ? null : current.run ?? null,
      }]
    })
}
