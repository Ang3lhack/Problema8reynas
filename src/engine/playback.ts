import { important, type TraceEvent } from './events'

export interface Frame {
  event: TraceEvent
  milliseconds: number
}

export class Playback {
  readonly frames: Frame[] = []
  readonly branches: Frame[] = []
  cursor = -1
  finished = false
  private elapsed = 0

  constructor(private readonly source: Iterator<TraceEvent>) {}

  get current() { return this.frames[this.cursor] }
  get canAdvance() { return !this.finished || this.cursor + 1 < this.frames.length }

  seek(index: number) {
    this.cursor = Math.max(-1, Math.min(index, this.frames.length - 1))
    return this.current
  }

  next() {
    if (this.cursor + 1 < this.frames.length) return this.seek(this.cursor + 1)
    if (!this.finished) {
      const started = performance.now()
      const result = this.source.next()
      this.elapsed += performance.now() - started
      if (result.done) this.finished = true
      else {
        this.cursor = this.frames.length
        const frame = { event: result.value, milliseconds: this.elapsed }
        this.frames.push(frame)
        if (['assign', 'conflict', 'solution', 'backtrack'].includes(result.value.kind)) this.branches.push(frame)
        if (result.value.kind === 'done') this.finished = true
      }
    }
    return this.current
  }

  nextImportant(budget = 250) {
    for (let count = 0; count < budget && this.canAdvance; count++) {
      const frame = this.next()
      if (frame && important.has(frame.event.kind)) return true
    }
    return !this.canAdvance
  }
}
