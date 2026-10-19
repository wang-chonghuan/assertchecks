// A case's optional group and tags, read from its catalog entry. They organize and filter what is
// shown; nothing selects, permits or judges by them. Shared by the server and the pages.

export const UNGROUPED = 'Ungrouped'

export interface CaseMeta {
  // null when the case has no group; shown under UNGROUPED.
  group: string | null
  tags: string[]
}

// The catalog keeps tags as one comma-separated string: split, trim, drop empties and repeats.
export function tagList(value: unknown): string[] {
  if (typeof value !== 'string') return []
  return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))]
}

export function caseMeta(entry: { group?: unknown; tags?: unknown } | undefined): CaseMeta {
  const group = typeof entry?.group === 'string' && entry.group.trim() ? entry.group.trim() : null
  return { group, tags: tagList(entry?.tags) }
}

// Group names in display order: alphabetical, with ungrouped cases last.
export function groupOrder(groups: (string | null)[]): (string | null)[] {
  const named = [...new Set(groups.filter((group): group is string => group !== null))].sort((a, b) => a.localeCompare(b))
  return groups.includes(null) ? [...named, null] : named
}
