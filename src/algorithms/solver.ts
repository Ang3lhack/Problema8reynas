import { boardFromDomains, constrain, fullDomains, type Domains, type Solution } from '../csp/model'
import { isSolution } from '../csp/validation'
import { context, root, type Branch, type Detail, type EventData, type TraceEvent } from '../engine/events'
import { ac3 } from './ac3'
import { orderValues, selectVariable, strategies, type Strategy } from './heuristics'
import { propagateAssignment } from './mac'

export function* search(
  strategy: Strategy = 'mrv', detail: Detail = 'full',
): Generator<TraceEvent, readonly Solution[]> {
  const trace = context(detail)
  const initial = fullDomains()
  const solutions: Solution[] = []
  trace.stats.nodes = 1
  const emit = (domains: Domains, branch: Branch, data: Pick<EventData, 'kind'> & Partial<EventData>) =>
    trace.record({ phase: 'mac', domains, branch, queue: [], ...data })

  yield emit(initial, root, { kind: 'search', strategy: strategies[strategy] })
  const start = yield* ac3(initial, undefined, trace, root)
  if (start.consistent) yield* visit(start.domains, root)
  yield emit(initial, root, { kind: 'done', result: 'exhausted' })
  return solutions

  function* visit(domains: Domains, parent: Branch): Generator<TraceEvent> {
    const column = selectVariable(domains, strategy)
    if (column === undefined) {
      const solution = boardFromDomains(domains)
      if (!isSolution(solution)) throw new Error('Una hoja del CSP no pasó la validación de las ocho reinas.')
      solutions.push(solution)
      trace.stats.solutions++
      yield emit(domains, parent, { kind: 'solution', solution })
      return
    }

    if (trace.detail === 'full') yield emit(domains, parent, { kind: 'choose', column, strategy: strategies[strategy] })
    for (const value of orderValues(domains, column, strategy)) {
      const depth = parent.depth + 1
      trace.stats.assignments++
      const id = trace.stats.nodes++
      trace.stats.depth = Math.max(trace.stats.depth, depth)
      const branch = { id, parent: parent.id, depth, column, value }
      yield emit(constrain(domains, column, [value]), branch, { kind: 'assign', column, value, previousDomains: domains })

      const propagation = yield* propagateAssignment(domains, column, value, trace, branch)
      if (propagation.consistent) yield* visit(propagation.domains, branch)

      trace.stats.backtracks++
      yield emit(domains, branch, {
        kind: 'backtrack', column, value, previousDomains: propagation.domains, restoredTo: parent,
        result: propagation.consistent ? undefined : 'inconsistent',
      })
    }
  }
}

export function* propagate(initial: Domains): Generator<TraceEvent> {
  const trace = context('full')
  const result = yield* ac3(initial, undefined, trace)
  const rows = boardFromDomains(result.domains)
  const solution = result.consistent && isSolution(rows) ? rows : undefined
  if (solution) {
    trace.stats.solutions++
    yield trace.record({ kind: 'solution', phase: 'ac3', branch: root, queue: [], domains: result.domains, solution })
  }
  yield trace.record({
    kind: 'done', phase: 'ac3', branch: root, queue: [], domains: result.domains,
    result: result.consistent ? 'consistent' : 'inconsistent', partial: !solution,
  })
}
