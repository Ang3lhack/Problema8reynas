import { search } from '../algorithms/solver'
import type { Strategy } from '../algorithms/heuristics'
import type { Placement, Solution } from '../csp/model'
import type { Stats } from './events'

export interface SolveRequest {
  strategy: Strategy
  animate: boolean
}

export interface SolveUpdate {
  done: boolean
  board: Placement
  stats: Stats
  solutions: readonly Solution[]
  milliseconds: number
}

self.addEventListener('message', ({ data }: MessageEvent<SolveRequest>) => {
  const solver = search(data.strategy, 'summary')
  const solutions: Solution[] = []
  let milliseconds = 0

  function batch() {
    const start = performance.now()
    for (let count = 0; count < (data.animate ? 24 : 80); count++) {
      const next = solver.next()
      if (next.done) return
      const event = next.value
      if (event.solution) solutions.push(event.solution)
      const done = event.kind === 'done'
      if (done || count === (data.animate ? 23 : 79)) {
        milliseconds += performance.now() - start
        const update: SolveUpdate = { done, board: event.board, stats: event.stats, solutions, milliseconds }
        self.postMessage(update)
        if (!done) setTimeout(batch, data.animate ? 80 : 0)
        return
      }
    }
  }

  batch()
})
