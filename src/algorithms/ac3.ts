import { ARCS, constrain, incoming, type Arc, type Domains } from '../csp/model'
import { context, root, type Branch, type Context, type EventData, type TraceEvent } from '../engine/events'
import { revise } from './revise'

export interface Propagation {
  domains: Domains
  consistent: boolean
}

export function* ac3(
  initial: Domains,
  initialQueue: readonly Arc[] = ARCS,
  trace: Context = context('full'),
  branch: Branch = root,
): Generator<TraceEvent, Propagation> {
  let domains = initial
  let queue = [...initialQueue]
  const detail = trace.detail === 'full'
  const emit = (data: Pick<EventData, 'kind'> & Partial<EventData>) =>
    trace.record({ phase: 'ac3', domains, queue, branch, ...data })

  if (detail) yield emit({ kind: 'queue', previousQueue: [], added: queue })
  const emptyColumn = domains.findIndex(domain => domain.length === 0)
  if (emptyColumn >= 0) {
    trace.stats.empty++
    yield emit({ kind: 'conflict', column: emptyColumn, result: 'inconsistent' })
    return { domains, consistent: false }
  }

  while (queue.length > 0) {
    const previousQueue = queue
    const arc = queue[0]
    const [column, target] = arc
    queue = queue.slice(1)
    trace.stats.arcs++
    trace.stats.revisions++
    if (detail) yield emit({ kind: 'extract', arc, column, previousQueue })

    let changed = false
    for (const { value, supports } of revise(domains, arc, detail)) {
      if (detail) yield emit({ kind: 'check', arc, column, value, supports })
      if (supports.length > 0) continue
      const previousDomains = domains
      domains = constrain(domains, column, domains[column].filter(row => row !== value))
      trace.stats.removed++
      changed = true
      if (detail) yield emit({ kind: 'prune', arc, column, value, supports, removed: [value], previousDomains })
    }
    if (!changed) continue
    if (domains[column].length === 0) {
      trace.stats.empty++
      yield emit({ kind: 'conflict', arc, column, result: 'inconsistent' })
      return { domains, consistent: false }
    }
    const added = incoming(column, target).filter(([source]) =>
      !queue.some(([pendingSource, pendingTarget]) => source === pendingSource && column === pendingTarget))
    const beforeEnqueue = queue
    queue = [...queue, ...added]
    if (detail) yield emit({ kind: 'enqueue', arc, column, added, previousQueue: beforeEnqueue })
  }

  if (detail) yield emit({ kind: 'consistent', result: 'consistent' })
  return { domains, consistent: true }
}
