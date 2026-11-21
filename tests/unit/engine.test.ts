import { describe, expect, it } from 'vitest'
import { ac3 } from '../../src/algorithms/ac3'
import { revise } from '../../src/algorithms/revise'
import { propagate, search } from '../../src/algorithms/solver'
import { ARCS, compatible, constrain, fullDomains, incoming, INDICES, type Solution } from '../../src/csp/model'
import { classify, solutionKey, transform, transformations } from '../../src/csp/symmetry'
import { isSolution } from '../../src/csp/validation'
import { Playback } from '../../src/engine/playback'

function reference(): Solution[] {
  const solutions: Solution[] = []
  function place(rows: number[], used: Set<number>, sums: Set<number>, differences: Set<number>) {
    const column = rows.length
    if (column === 8) {
      solutions.push(rows)
      return
    }
    for (const row of INDICES) {
      if (used.has(row) || sums.has(row + column) || differences.has(row - column)) continue
      place([...rows, row], new Set([...used, row]), new Set([...sums, row + column]), new Set([...differences, row - column]))
    }
  }
  place([], new Set(), new Set(), new Set())
  return solutions
}

describe('CSP y AC-3', () => {
  it('modela ocho variables, ocho filas y 56 arcos dirigidos únicos', () => {
    expect(fullDomains()).toEqual(Array.from({ length: 8 }, () => [0, 1, 2, 3, 4, 5, 6, 7]))
    expect(new Set(ARCS.map(solutionKey)).size).toBe(56)
    expect(ARCS.every(([i, j]) => i !== j)).toBe(true)
    expect(compatible(0, 0, 1, 0)).toBe(false)
    expect(compatible(0, 0, 1, 1)).toBe(false)
    expect(compatible(0, 0, 1, 2)).toBe(true)
    expect(compatible(0, 0, 0, 3)).toBe(false)
  })

  it('registra los soportes reales sin modificar la entrada', () => {
    const domains = constrain(fullDomains(), 0, [0])
    expect([...revise(domains, [1, 0])]).toEqual(
      INDICES.map(value => ({ value, supports: value < 2 ? [] : [0] })),
    )
    expect(domains[1]).toEqual(INDICES)
  })

  it('conserva los dominios completos y recorre la cola FIFO hasta agotarla', () => {
    const initial = fullDomains()
    const steps = [...ac3(initial)]
    expect(steps.filter(event => event.kind === 'extract').map(event => event.arc)).toEqual(ARCS)
    expect(steps.at(-1)).toMatchObject({ kind: 'consistent', queue: [], domains: initial, stats: { arcs: 56, revisions: 56, removed: 0 } })
  })

  it('propaga una decisión y vuelve a encolar los arcos entrantes correspondientes una vez', () => {
    const initial = constrain(fullDomains(), 0, [0])
    const steps = [...ac3(initial, incoming(0))]
    const update = steps.find(event => event.kind === 'enqueue')
    expect(update?.added).toEqual(incoming(1, 0))
    expect(steps.at(-1)?.domains[1]).toEqual([2, 3, 4, 5, 6, 7])
    for (const event of steps) {
      expect(new Set(event.queue.map(solutionKey)).size).toBe(event.queue.length)
    }
    expect(initial[1]).toEqual(INDICES)
  })

  it('alcanza el mismo punto fijo con distinto orden y propaga varios cambios', () => {
    const initial = constrain(constrain(fullDomains(), 0, [0]), 1, [2])
    const forward = [...ac3(initial)]
    const reverse = [...ac3(initial, [...ARCS].reverse())]
    expect(forward.at(-1)?.domains).toEqual(reverse.at(-1)?.domains)
    expect(forward.at(-1)?.stats.removed).toBeGreaterThan(10)
    expect(forward.filter(event => event.kind === 'enqueue').length).toBeGreaterThan(1)
  })

  it('detecta contradicciones por ataques y por un dominio inicialmente vacío', () => {
    const initial = constrain(constrain(fullDomains(), 0, [0]), 1, [1])
    expect([...propagate(initial)].at(-1)).toMatchObject({ kind: 'done', result: 'inconsistent', stats: { empty: 1 } })
    expect([...ac3(constrain(initial, 1, []))].at(-1)).toMatchObject({ kind: 'conflict', column: 1 })
  })
})

describe('búsqueda con MAC', () => {
  const expected = reference().map(solutionKey).sort()
  it.each(['fixed', 'mrv', 'mrv-lcv'] as const)('coincide con una búsqueda independiente usando %s', strategy => {
    const steps = [...search(strategy, 'summary')]
    const solutions = steps.flatMap(event => event.solution ? [event.solution] : [])
    expect(solutions).toHaveLength(92)
    expect(new Set(solutions.map(solutionKey)).size).toBe(92)
    expect(solutions.every(isSolution)).toBe(true)
    expect(solutions.map(solutionKey).sort()).toEqual(expected)
    const classes = classify(solutions)
    expect(classes).toHaveLength(12)
    expect(classes.map(members => members.length).sort()).toEqual([4, ...Array(11).fill(8)])
    expect(transformations.every((_, index) => isSolution(transform(solutions[0], index)))).toBe(true)
    expect(steps.at(-1)?.stats.backtracks).toBe(steps.at(-1)?.stats.assignments)
  })

  it('restaura exactamente la instantánea padre después del retroceso', () => {
    const snapshots = new Map()
    let contradictions = 0
    let restorations = 0
    for (const event of search('mrv', 'summary')) {
      if (event.kind === 'assign') snapshots.set(event.branch.id, event.previousDomains)
      if (event.kind === 'conflict') contradictions++
      if (event.kind === 'backtrack') {
        expect(event.domains).toBe(snapshots.get(event.branch.id))
        expect(event.restoredTo?.id).toBe(event.branch.parent)
        restorations++
      }
    }
    expect(contradictions).toBeGreaterThan(0)
    expect(restorations).toBeGreaterThan(92)
    expect(isSolution([0, 1, 2, 3, 4, 5, 6, 7])).toBe(false)
    expect(isSolution([0, 4, 7, 5, 2, 6, 1])).toBe(false)
  })

  it('repite una instantánea anterior sin recomputar ni mutar la cola', () => {
    const playback = new Playback(propagate(constrain(fullDomains(), 0, [0])))
    const starting = playback.next()
    const extracted = playback.next()
    expect(playback.seek(0)).toBe(starting)
    expect(playback.next()).toBe(extracted)
    expect(starting?.event.queue).toHaveLength(56)
    expect(extracted?.event.queue).toHaveLength(55)
    while (!playback.nextImportant(5)) { /* consume bounded batches */ }
    expect(playback.current?.event.kind).toBe('prune')
  })
})
