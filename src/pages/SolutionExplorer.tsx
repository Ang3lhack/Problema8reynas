import { useMemo, useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Copy, Crown, GitCompareArrows, RotateCw, Zap } from 'lucide-react'
import { classify, solutionKey, transform, transformations } from '../csp/symmetry'
import type { useQuickSolve } from '../engine/useQuickSolve'
import { ChessBoard } from '../components/ChessBoard'
import { PanelHeading } from '../components/Inspector'

export function SolutionExplorer({ quick, reduced }: { quick: ReturnType<typeof useQuickSolve>; reduced: boolean }) {
  const { solutions } = quick
  const classes = useMemo(() => classify(solutions), [solutions])
  const [grouped, setGrouped] = useState(false)
  const [solutionIndex, setSolutionIndex] = useState(0)
  const [classIndex, setClassIndex] = useState(0)
  const [member, setMember] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [compare, setCompare] = useState(false)
  const [comparison, setComparison] = useState(1)
  const [feedback, setFeedback] = useState('')
  const [jump, setJump] = useState('')

  const total = grouped ? classes.length : solutions.length
  const index = grouped ? classIndex : solutionIndex
  const group = classes[classIndex]
  const base = grouped ? group?.[member] ?? group?.[0] : solutions[solutionIndex]
  const board = base ? transform(base, rotation) : undefined
  const array = board ? '[' + board.join(', ') + ']' : ''
  const reference = compare ? solutions[comparison] : undefined
  const differences = reference && board ? board.filter((row, column) => row !== reference[column]).length : 0
  const variants = base ? new Set(transformations.map((_, position) => solutionKey(transform(base, position)))).size : 0

  function go(next: number) {
    if (grouped) { setClassIndex(next); setMember(0) }
    else setSolutionIndex(next)
    setRotation(0)
    setFeedback('')
    setJump('')
  }

  function jumpTo(event: FormEvent) {
    event.preventDefault()
    const value = Number(jump)
    if (!Number.isInteger(value) || value < 1 || value > total) {
      setFeedback(`Introduce un número entero entre 1 y ${total}.`)
      return
    }
    go(value - 1)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(array)
      setFeedback('Arreglo copiado.')
    } catch {
      setFeedback('No se pudo copiar automáticamente. Puedes seleccionar y copiar el arreglo mostrado.')
    }
  }

  return (
    <>
      <div className="page-intro">
        <div className="eyebrow"><span /> CATÁLOGO DE RESULTADOS</div>
        <h1>Explorador de <em>soluciones</em></h1>
        <p>Compara disposiciones y examina las simetrías del tablero.</p>
      </div>
      {!board ? (
        <section className="panel start-catalog">
          <Crown size={36} />
          <h2>Genera el catálogo</h2>
          <p>El motor calcula y valida las 92 configuraciones. Cada solución se agrupa con sus rotaciones y reflexiones.</p>
          <button type="button" className="button primary" disabled={quick.status === 'running'} onClick={() => quick.start()}><Zap size={17} /> Calcular soluciones</button>
          <p role="status" className="muted">{quick.status === 'running' ? 'Calculando soluciones…' : quick.status === 'error' ? 'No se pudo iniciar el cálculo. Vuelve a intentarlo.' : ''}</p>
        </section>
      ) : (
        <div className="workspace solution-workspace">
          <section className="panel board-panel">
            <PanelHeading title={grouped ? 'Clase fundamental ' + (index + 1) : 'Solución ' + (index + 1)}
              icon={<Crown size={18} />} aside={<span className="tag">{index + 1} / {total}</span>} />
            <ChessBoard board={board} differences={reference} animated={!reduced} />
            <div className="solution-pagination">
              <button type="button" className="button icon-button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Anterior"><ChevronLeft size={18} /></button>
              <button type="button" className="button icon-button" onClick={() => go(index + 1)} disabled={index === total - 1} aria-label="Siguiente"><ChevronRight size={18} /></button>
              <form onSubmit={jumpTo}>
                <label>Número <input value={jump} onChange={event => setJump(event.target.value)} inputMode="numeric" placeholder={String(index + 1)} /></label>
                <button className="button" type="submit">Ir</button>
              </form>
            </div>
          </section>
          <div className="workspace-sidebar">
            <div className="key-metrics">
              <div><span>Configuraciones</span><strong>{solutions.length}</strong></div>
              <div><span>Clases fundamentales</span><strong>{classes.length}</strong></div>
              <div><span>Órbita actual</span><strong>{variants}</strong></div>
            </div>
            <section className="panel">
              <PanelHeading title="Representación" icon={<Copy size={17} />} />
              <div className="array-bar"><code tabIndex={0}>{array}</code><button className="button" type="button" onClick={copy}>Copiar</button></div>
              <p className="muted">Cada índice indica una columna y cada valor indica una fila. Ambos índices van de 0 a 7.</p>
              <p className="small muted" role="status">{feedback}</p>
            </section>
            <section className="panel">
              <PanelHeading title="Simetrías" icon={<RotateCw size={17} />} />
              <div className="stack-controls">
                <label className="checkbox"><input type="checkbox" checked={grouped} onChange={event => {
                  setGrouped(event.target.checked); setRotation(0); setFeedback(''); setJump('')
                }} /> Agrupar por clase fundamental</label>
                {grouped && group && <label>Miembro <select value={member} onChange={event => { setMember(Number(event.target.value)); setRotation(0) }}>
                  {group.map((item, position) => <option key={solutionKey(item)} value={position}>{position + 1} de {group.length}</option>)}
                </select></label>}
                <label>Transformación <select value={rotation} onChange={event => setRotation(Number(event.target.value))}>
                  {transformations.map((name, position) => <option key={name} value={position}>{name}</option>)}
                </select></label>
              </div>
              <p className="muted">Ocho transformaciones de la cuadrícula pueden producir cuatro u ocho tableros diferentes para una solución de ocho reinas.</p>
            </section>
            <section className="panel">
              <PanelHeading title="Comparar tableros" icon={<GitCompareArrows size={17} />} />
              <label className="checkbox"><input type="checkbox" checked={compare} onChange={event => setCompare(event.target.checked)} /> Comparar con otra solución</label>
              {compare && <div className="stack-controls">
                <label>Solución de referencia <select value={comparison} onChange={event => setComparison(Number(event.target.value))}>
                  {solutions.map((item, position) => <option key={solutionKey(item)} value={position}>{position + 1}</option>)}
                </select></label>
                <p className="muted">{differences} de 8 columnas cambian. La marca × indica la posición de referencia.</p>
              </div>}
            </section>
          </div>
        </div>
      )}
    </>
  )
}
