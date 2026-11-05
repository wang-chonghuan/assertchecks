// Failure events a project declares (ASSERT-50). Some failures leave no exception, only a custom event the
// project's own code records, such as a browser reporting that it could not restore a session. A project
// declares which event, with which property value, is a failure; AssertChecks then counts and groups it
// like an exception. AssertChecks never guesses which events are failures.

export interface FailureEvent { event: string; key: string; value: string }

// Every part goes into a query, so each is a plain name: letters, digits, `_`, `.` and `-`.
const NAME = /^[\w.-]{1,100}$/

// `event:key=value`, as the operator CLI takes it.
export function parseFailureEvent(spec: string): FailureEvent {
  const match = spec.trim().match(/^([^:]+):([^=]+)=(.+)$/)
  if (!match || ![match[1], match[2], match[3]].every((part) => NAME.test(part))) {
    throw new Error(`a failure event is event:property=value of letters, digits, _ . and -: ${spec}`)
  }
  return { event: match[1], key: match[2], value: match[3] }
}

// The problem a declared failure becomes, as the page names it.
export const failureEventKey = (declared: FailureEvent) => `${declared.event} ${declared.key}=${declared.value}`

// Declarations come from the database; they are checked again before going into a query.
export function failureEvents(value: unknown): FailureEvent[] {
  if (value === null || value === undefined) return []
  if (!Array.isArray(value)) throw new Error('invalid failure events in the error source')
  return value.map((item) => {
    const declared = item as Partial<FailureEvent>
    if (![declared.event, declared.key, declared.value].every((part) => typeof part === 'string' && NAME.test(part))) {
      throw new Error('invalid failure event in the error source')
    }
    return declared as FailureEvent
  })
}

// One query branch per declaration, shaped like AppExceptions rows so the same de-duplication, grouping
// and counting apply: the problem is the declaration, the message adds the event's error class when it
// has one, and the place is the page it happened on. `declared` keeps these rows out of the noise rules.
export function failureEventsKql(declared: FailureEvent[]): string[] {
  return declared.map((item) => {
    const key = JSON.stringify(failureEventKey(item))
    return `(AppEvents
  | where TimeGenerated > since
  | where Name == ${JSON.stringify(item.event)} and tostring(Properties[${JSON.stringify(item.key)}]) == ${JSON.stringify(item.value)}
  | extend errorClass = tostring(Properties["error_class"]), page = tostring(Properties["page_path"])
  | extend ProblemId = ${key}, OuterType = ${JSON.stringify(item.event)},
      OuterMessage = iff(isempty(errorClass), ${key}, strcat(${key}, ": ", errorClass)),
      OperationName = iff(isempty(page), OperationName, page), Details = dynamic(null), declared = true)`
  })
}
