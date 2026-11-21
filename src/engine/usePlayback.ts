import { useCallback, useEffect, useRef, useState } from 'react'
import type { TraceEvent } from './events'
import { Playback } from './playback'

export function usePlayback(active: boolean) {
  const [run, setRun] = useState<Playback>()
  const [playing, setPlaying] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const [speed, setSpeed] = useState(3)
  const [, setRevision] = useState(0)
  const skipTimer = useRef<number | undefined>(undefined)

  const pause = useCallback(() => {
    setPlaying(false)
    setSkipping(false)
    window.clearTimeout(skipTimer.current)
  }, [])

  useEffect(() => {
    if (!playing || !run || !active) return
    const timer = window.setInterval(() => {
      run.next()
      setRevision(value => value + 1)
      if (!run.canAdvance) setPlaying(false)
    }, 1000 / speed)
    return () => window.clearInterval(timer)
  }, [active, playing, run, speed])

  useEffect(() => () => window.clearTimeout(skipTimer.current), [])

  return {
    run, playing, skipping, speed, setSpeed, pause,
    start(source: Iterator<TraceEvent>) {
      pause()
      const playback = new Playback(source)
      playback.next()
      setRun(playback)
    },
    reset() {
      pause()
      setRun(undefined)
    },
    seek(index: number) {
      pause()
      run?.seek(index)
      setRevision(value => value + 1)
    },
    next() {
      pause()
      run?.next()
      setRevision(value => value + 1)
    },
    play() {
      if (run?.canAdvance) setPlaying(true)
    },
    skip() {
      if (!run?.canAdvance) return
      pause()
      setSkipping(true)
      const find = () => {
        const reached = run.nextImportant()
        setRevision(value => value + 1)
        if (reached) setSkipping(false)
        else skipTimer.current = window.setTimeout(find, 0)
      }
      find()
    },
  }
}
