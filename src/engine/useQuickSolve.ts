import { useEffect, useRef, useState } from 'react'
import type { Strategy } from '../algorithms/heuristics'
import { emptyPlacement, type Solution } from '../csp/model'
import { zeroStats } from './events'
import type { SolveRequest, SolveUpdate } from './solver.worker'

type RunStatus = 'idle' | 'running' | 'completed' | 'stopped' | 'error'
export interface CompletedRun extends SolveUpdate {
  strategy: Strategy
}

const emptyUpdate = (): SolveUpdate => ({
  board: emptyPlacement(), stats: zeroStats(), done: false, solutions: [], milliseconds: 0,
})

export function useQuickSolve() {
  const [status, setStatus] = useState<RunStatus>('idle')
  const [update, setUpdate] = useState<SolveUpdate>(emptyUpdate)
  const [solutions, setSolutions] = useState<readonly Solution[]>([])
  const [comparisons, setComparisons] = useState<CompletedRun[]>([])
  const workerRef = useRef<Worker | null>(null)
  useEffect(() => () => workerRef.current?.terminate(), [])

  function start(strategy: Strategy = 'mrv', animate = false) {
    workerRef.current?.terminate()
    setUpdate(emptyUpdate())
    setStatus('running')
    try {
      const worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' })
      workerRef.current = worker
      worker.onmessage = ({ data }: MessageEvent<SolveUpdate>) => {
        if (workerRef.current !== worker) return
        setUpdate(data)
        if (!data.done) return
        worker.terminate()
        workerRef.current = null
        setSolutions(data.solutions)
        setStatus('completed')
        setComparisons(previous => [...previous.filter(run => run.strategy !== strategy), { ...data, strategy }])
      }
      worker.onerror = () => {
        if (workerRef.current !== worker) return
        worker.terminate()
        workerRef.current = null
        setStatus('error')
      }
      worker.postMessage({ strategy, animate } satisfies SolveRequest)
    } catch {
      setStatus('error')
    }
  }

  return {
    status, update, solutions, comparisons, start,
    stop() {
      workerRef.current?.terminate()
      workerRef.current = null
      setStatus('stopped')
    },
    reset() {
      workerRef.current?.terminate()
      workerRef.current = null
      setUpdate(emptyUpdate())
      setComparisons([])
      setStatus('idle')
    },
  }
}
