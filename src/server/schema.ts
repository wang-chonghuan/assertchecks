// The published report format and its validation. The JSON Schema files under public/schemas/ are the
// single definition: the site serves them unchanged and this module checks uploads against them.
// It implements only the JSON Schema keywords those files use, so no validator dependency is needed.
import catalogSchema from '../../public/schemas/catalog.schema.json' with { type: 'json' }
import resultSchema from '../../public/schemas/result.schema.json' with { type: 'json' }

interface Schema {
  $ref?: string
  type?: string | string[]
  const?: unknown
  enum?: unknown[]
  required?: string[]
  properties?: Record<string, Schema>
  additionalProperties?: boolean
  items?: Schema
  minItems?: number
  minLength?: number
  pattern?: string
  minimum?: number
  oneOf?: Schema[]
  title?: string
  $defs?: Record<string, Schema>
}

// At most this many problems are reported; the first ones are enough to fix a producer.
const ERROR_LIMIT = 10

function typeOf(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number'
  return typeof value
}

function typeMatches(value: unknown, type: string): boolean {
  const actual = typeOf(value)
  return actual === type || (type === 'number' && actual === 'integer')
}

function validate(root: Schema, schema: Schema, value: unknown, path: string, errors: string[]): void {
  if (errors.length >= ERROR_LIMIT) return
  if (schema.$ref) {
    const name = schema.$ref.replace('#/$defs/', '')
    return validate(root, root.$defs![name], value, path, errors)
  }
  if (schema.oneOf) {
    const results = schema.oneOf.map((branch) => {
      const branchErrors: string[] = []
      validate(root, branch, value, path, branchErrors)
      return branchErrors
    })
    if (results.filter((result) => result.length === 0).length === 1) return
    // Report against the branch the value selects with a constant field, such as format.
    const selected = schema.oneOf.findIndex((branch) => Object.entries(branch.properties ?? {}).some(([key, property]) =>
      property.const !== undefined && typeOf(value) === 'object' && (value as Record<string, unknown>)[key] === property.const))
    if (selected >= 0) {
      errors.push(...results[selected].slice(0, ERROR_LIMIT - errors.length))
      return
    }
    const choices = schema.oneOf.map((branch) => Object.entries(branch.properties ?? {})
      .filter(([, property]) => property.const !== undefined)
      .map(([key, property]) => `${key} ${JSON.stringify(property.const)}`).join(', ') || branch.title).join(' or ')
    errors.push(`${path}: must be one of: ${choices}`)
    return
  }
  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path}: must be ${JSON.stringify(schema.const)}`)
    return
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: must be one of ${schema.enum.map((item) => JSON.stringify(item)).join(', ')}`)
    return
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type]
    if (!types.some((type) => typeMatches(value, type))) {
      errors.push(`${path}: must be ${types.join(' or ')}`)
      return
    }
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: must not be empty`)
    else if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) errors.push(`${path}: must match ${schema.pattern}`)
  }
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) {
    errors.push(`${path}: must be at least ${schema.minimum}`)
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: needs at least ${schema.minItems} item(s)`)
    if (schema.items) value.forEach((item, index) => validate(root, schema.items!, item, `${path}[${index}]`, errors))
  }
  if (typeOf(value) === 'object') {
    const object = value as Record<string, unknown>
    for (const key of schema.required ?? []) {
      if (!(key in object)) errors.push(`${path}: missing ${key}`)
    }
    for (const [key, item] of Object.entries(object)) {
      const property = schema.properties?.[key]
      if (property) validate(root, property, item, `${path}.${key}`, errors)
      else if (schema.additionalProperties === false) errors.push(`${path}: unexpected field ${key}`)
    }
  }
}

function check(schema: Schema, value: unknown, path: string): string[] {
  const errors: string[] = []
  validate(schema, schema, value, path, errors)
  return errors.slice(0, ERROR_LIMIT)
}

// IDs must be unique, which JSON Schema cannot say about object fields.
function duplicates(ids: unknown[], path: string, what: string): string[] {
  const seen = new Set<unknown>()
  const errors: string[] = []
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${path}: ${what} ${String(id)} appears more than once`)
    seen.add(id)
  }
  return errors
}

export function catalogErrors(catalog: unknown): string[] {
  const errors = check(catalogSchema as unknown as Schema, catalog, 'catalog')
  if (errors.length) return errors
  const cases = (catalog as { cases: { id: string; then: { id: string }[] }[] }).cases
  return [
    ...duplicates(cases.map((item) => item.id), 'catalog.cases', 'case'),
    ...cases.flatMap((item, index) => duplicates(item.then.map((then) => then.id), `catalog.cases[${index}].then`, 'Then')),
  ].slice(0, ERROR_LIMIT)
}

export function resultErrors(result: unknown): string[] {
  return check(resultSchema as unknown as Schema, result, 'result')
}
