import { ChevronLeft, ChevronRight, History, Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { usePlayback } from '../engine/usePlayback'
import { eventTitles } from '../engine/events'

type Controller = ReturnType<typeof usePlayback>
export function ExecutionControls({ control, onStart, lab }: { control: Controller; onStart: () => void; lab?: boolean }) {
  const run = control.run
  return (
    <>
      <div className="execution-controls">
        {!run ? <button type="button" className="button primary" onClick={onStart}>
          <Play size={16} fill="currentColor" /> {lab ? 'Ejecutar AC-3' : 'Iniciar'}
        </button> : (
          <>
            <button type="button" className="button primary" disabled={!run.canAdvance && !control.playing && !control.skipping}
              onClick={control.playing || control.skipping ? control.pause : control.play}>
              {control.playing || control.skipping ? <><Pause size={16} fill="currentColor" /> Pausar</> : <><Play size={16} fill="currentColor" /> Reproducir</>}
            </button>
            <button type="button" className="button icon-button" aria-label="Paso anterior" title="Paso anterior" onClick={() => control.seek(run.cursor - 1)} disabled={run.cursor < 0}><ChevronLeft size={19} /></button>
            <button type="button" className="button icon-button" aria-label="Siguiente paso" title="Siguiente paso" onClick={control.next} disabled={!run.canAdvance}><ChevronRight size={19} /></button>
            <button type="button" className="button icon-button" aria-label="Siguiente evento importante" title="Siguiente evento importante" onClick={control.skip} disabled={!run.canAdvance || control.skipping}><SkipForward size={18} /></button>
          </>
        )}
        <button type="button" className="button icon-button reset-button" title="Reiniciar ejecución" aria-label="Reiniciar ejecución" onClick={control.reset} disabled={!run}><RotateCcw size={17} /></button>
        <label className="speed-control small">Velocidad
          <select aria-label="Velocidad" value={control.speed} onChange={event => control.setSpeed(Number(event.target.value))}>
            <option value={1}>1 paso/s</option><option value={3}>3 pasos/s</option><option value={10}>10 pasos/s</option><option value={25}>25 pasos/s</option>
          </select>
        </label>
      </div>
      {run && <details className="history">
        <summary><History size={15} /> Historial de pasos <span className="mono muted">{Math.max(0, run.cursor + 1)} / {run.frames.length}</span></summary>
        <label className="history-jump">Ir al paso <input type="number" min={0} max={run.frames.length}
          value={run.cursor + 1} onChange={event => control.seek(Number(event.target.value) - 1)} /></label>
        <ol>
          {run.frames.slice(Math.max(0, run.cursor - 12), run.cursor + 14).map(({ event }) =>
            <li key={event.id}><button type="button" aria-current={event.id === run.cursor ? 'step' : undefined}
              onClick={() => control.seek(event.id)}><code>{event.id + 1}</code> {eventTitles[event.kind]}</button></li>,
          )}
        </ol>
      </details>}
    </>
  )
}
