import { useEffect, useState, type ReactNode } from 'react'
import { Activity, BookOpen, ChevronDown, FlaskConical, Gauge, Layers3, RotateCcw, ShieldCheck, Undo2, Zap } from 'lucide-react'
import { strategies, type Strategy } from '../algorithms/heuristics'
import { propagate, search } from '../algorithms/solver'
import { emptyPlacement, fullDomains, INDICES, variable, type Placement } from '../csp/model'
import { conflicts, squareName } from '../csp/validation'
import { context, root, zeroStats } from '../engine/events'
import { usePlayback } from '../engine/usePlayback'
import type { useQuickSolve } from '../engine/useQuickSolve'
import { ChessBoard, initialLayers, Queen, type Layers } from '../components/ChessBoard'
import { ExecutionControls } from '../components/ExecutionControls'
import { ArcQueue, ConstraintGraph, DomainsPanel, EventPanel, PanelHeading, Pseudocode, SearchTree } from '../components/Inspector'
import { number, Statistics } from '../components/Statistics'

type Mode = 'step' | 'quick' | 'lab'
type Quick = ReturnType<typeof useQuickSolve>
const options = [
  { mode: 'step', Icon: BookOpen, title: 'Paso a paso' },
  { mode: 'quick', Icon: Zap, title: 'Resolución rápida' },
  { mode: 'lab', Icon: FlaskConical, title: 'Laboratorio' },
] as const
const layerNames: Record<keyof Layers, string> = {
  rows: 'Filas', columns: 'Columnas', diagonals: 'Diagonales', conflicts: 'Conflictos',
}

function Strategies({ value, onChange, disabled }: { value: Strategy; onChange: (value: Strategy) => void; disabled?: boolean }) {
  return <select aria-label="Estrategia de búsqueda" value={value} disabled={disabled} onChange={event => onChange(event.target.value as Strategy)}>
    {Object.entries(strategies).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
  </select>
}

export function Visualizer({ active, quick, mode, setMode, reduced }: {
  active: boolean; quick: Quick; mode: Mode; setMode: (mode: Mode) => void; reduced: boolean
}) {
  return (
    <>
      <div className="page-intro">
        <div className="eyebrow"><span /> LABORATORIO DE INTELIGENCIA ARTIFICIAL</div>
        <h1>Visualizador <em>AC-3</em></h1>
        <p>Exploración interactiva de algoritmos de satisfacción de restricciones</p>
      </div>
      <div className="mode-bar">
        <nav className="mode-tabs" aria-label="Modos de ejecución">
          {options.map(({ mode: option, Icon, title }) =>
            <button type="button" key={option} aria-pressed={mode === option} onClick={() => setMode(option)}><Icon size={17} />{title}</button>,
          )}
        </nav>
      </div>
      <div hidden={mode !== 'step'}><TraceWorkspace active={active && mode === 'step'} reduced={reduced} /></div>
      <div hidden={mode !== 'lab'}><TraceWorkspace lab active={active && mode === 'lab'} reduced={reduced} /></div>
      {mode === 'quick' && <QuickWorkspace quick={quick} reduced={reduced} />}
    </>
  )
}

function BoardPanel({ board, status, layers, setLayers, children, selected, selection, reduced, onSquare, arc, column }: {
  board: Placement; status: string; layers: Layers; setLayers: (layers: Layers) => void; children: ReactNode;
  selected?: number; selection?: ReactNode; reduced: boolean; onSquare?: (column: number, row: number) => void;
  arc?: readonly [number, number]; column?: number;
}) {
  return (
    <section className="panel board-panel">
      <PanelHeading title="Tablero" icon={<Queen className="heading-queen" />} aside={<span className="status-tag"><i />{status}</span>} />
      <ChessBoard board={board} active={arc} column={column} selected={selected} layers={layers} onSquare={onSquare} animated={!reduced} />
      <div className="board-meta">
        <span><Queen className="heading-queen" /> {board.filter(row => row !== null).length} / 8 reinas</span>
        <details className="layer-options">
          <summary><Layers3 size={16} /> Capas <ChevronDown size={14} /></summary>
          <div className="layer-menu">{Object.entries(layerNames).map(([key, label]) =>
            <label className="checkbox" key={key}><input type="checkbox" checked={layers[key as keyof Layers]}
              onChange={event => setLayers({ ...layers, [key]: event.target.checked })} />{label}</label>,
          )}</div>
        </details>
      </div>
      {selection}
      {children}
    </section>
  )
}

function TraceWorkspace({ lab = false, active, reduced }: { lab?: boolean; active: boolean; reduced: boolean }) {
  const controller = usePlayback(active)
  const pause = controller.pause
  useEffect(() => {
    if (!active) pause()
  }, [active, pause])
  const [strategy, setStrategy] = useState<Strategy>('mrv')
  const [method, setMethod] = useState('mac')
  const [manual, setManual] = useState<Placement>(emptyPlacement)
  const [undos, setUndos] = useState<Placement[]>([])
  const [layers, setLayers] = useState(initialLayers)
  const [selected, setSelected] = useState<number>()
  const [inputColumn, setInputColumn] = useState(0)
  const [inputRow, setInputRow] = useState(0)
  const [verification, setVerification] = useState(false)

  const domains = fullDomains().map((domain, column) => manual[column] === null ? domain : [manual[column]])
  const run = controller.run
  const idle = context('full').record({ kind: 'ready', phase: 'ac3', branch: root, domains, queue: [] })
  const frame = run?.current
  const event = frame?.event ?? idle
  const stage = controller.playing ? 'En reproducción' : controller.skipping ? 'Avanzando' : event.kind === 'done' ? 'Finalizado' : frame ? 'En pausa' : 'En espera'
  const errors = conflicts(manual)

  function configure(next: Placement) {
    setUndos([...undos, manual])
    setManual(next)
    setVerification(false)
    controller.reset()
  }

  function place(column: number, row: number | null) {
    if (manual[column] === row) return
    configure(manual.map((prior, index) => index === column ? row : prior))
    setSelected(column)
  }

  function undo() {
    const previous = undos.at(-1)
    if (!previous) return
    setManual(previous)
    setUndos(undos.slice(0, -1))
    setVerification(false)
    controller.reset()
  }

  function activateSquare(column: number, row: number) {
    setSelected(selected === column && !lab ? undefined : column)
    if (lab) {
      setInputColumn(column)
      setInputRow(row)
      place(column, manual[column] === row ? null : row)
    }
  }

  function start() {
    setVerification(false)
    controller.start(lab || method === 'ac3' ? propagate(domains) : search(strategy))
  }

  const highlightedRow = selected === undefined ? null : event.board[selected]
  const queenInfo = selected === undefined || highlightedRow === null ? null : (
    <p className="selection-info"><strong>{variable(selected)} · {squareName(selected, highlightedRow)}</strong> Ataca su fila, su columna y ambas diagonales.</p>
  )
  return (
    <div className="workspace trace-workspace">
      <div className="workspace-primary">
        <BoardPanel board={event.board} status={stage} layers={layers} setLayers={setLayers} onSquare={activateSquare}
          arc={event.arc} column={event.column} selected={selected} reduced={reduced} selection={queenInfo}>
          <ExecutionControls control={controller} onStart={start} lab={lab} />
        </BoardPanel>
        {lab ? (
          <section className="panel lab-panel">
            <PanelHeading title="Asignaciones manuales" icon={<FlaskConical size={17} />} />
            <p className="muted">Pulsa una casilla para fijar o retirar una reina. Ejecuta AC-3 para calcular la poda de dominios.</p>
            <div className="compact-controls">
              <label>Variable <select value={inputColumn} onChange={event => setInputColumn(Number(event.target.value))}>
                {INDICES.map(column => <option key={column} value={column}>{variable(column)}</option>)}
              </select></label>
              <label>Fila <select value={inputRow} onChange={event => setInputRow(Number(event.target.value))}>
                {INDICES.map(row => <option key={row}>{row}</option>)}
              </select></label>
              <button type="button" className="button" onClick={() => place(inputColumn, inputRow)}>Asignar</button>
              <button type="button" className="button" onClick={() => place(0, 0)} disabled={manual[0] === 0}>Probar Q0 = 0</button>
            </div>
            <div className="compact-controls">
              <button type="button" className="button" onClick={() => setVerification(true)}><ShieldCheck size={16} /> Verificar</button>
              <button type="button" className="button" onClick={undo} disabled={!undos.length}><Undo2 size={16} /> Deshacer</button>
              <button type="button" className="button" onClick={() => {
                setManual(emptyPlacement()); setUndos([]); setSelected(undefined); setVerification(false); controller.reset()
              }}><RotateCcw size={16} /> Restablecer</button>
            </div>
            {verification && <p role="status" className={errors.length ? 'lab-warning' : 'selection-info'}>{errors.length
              ? errors.map(({ column, other, rule }) => `${variable(column)} y ${variable(other)} comparten ${rule}.`).join(' ')
              : 'Las asignaciones manuales son compatibles entre sí.'}</p>}
          </section>
        ) : (
          <section className="panel settings-panel">
            <PanelHeading title="Configuración" icon={<Activity size={17} />} />
            <div className="compact-controls">
              <label>Algoritmo <select value={method} onChange={event => { setMethod(event.target.value); controller.reset() }}>
                <option value="mac">AC-3 + MAC</option><option value="ac3">Solo AC-3</option>
              </select></label>
              {method === 'mac' && <label>Estrategia <Strategies value={strategy} onChange={value => { setStrategy(value); controller.reset() }} /></label>}
            </div>
            <p className="small muted">{method === 'mac' ? 'La búsqueda prueba asignaciones y ejecuta AC-3 en cada rama.' : 'AC-3 comprueba el soporte entre dominios. Prueba una asignación en el Laboratorio para observar la poda.'}</p>
          </section>
        )}
        <Pseudocode event={event} />
        {method === 'mac' && !lab && <SearchTree events={run?.branches ?? []} step={frame?.event.id ?? -1} onJump={controller.seek} />}
      </div>
      <div className="workspace-sidebar">
        <div className="key-metrics">
          <div><span>Revisiones</span><strong>{number(event.stats.revisions)}</strong></div>
          <div><span>Valores eliminados</span><strong>{number(event.stats.removed)}</strong></div>
          <div><span>Soluciones</span><strong>{number(event.stats.solutions)}</strong></div>
        </div>
        <EventPanel event={event} />
        <DomainsPanel domains={event.domains} event={event} onSelect={setSelected} selected={selected} />
        <ArcQueue event={event} />
        <ConstraintGraph arc={event.arc} selected={selected} onSelect={setSelected} />
      </div>
      <Statistics stats={event.stats} milliseconds={frame?.milliseconds ?? 0} />
    </div>
  )
}

function QuickWorkspace({ quick, reduced }: { quick: Quick; reduced: boolean }) {
  const [strategy, setStrategy] = useState<Strategy>('mrv')
  const [animate, setAnimate] = useState(false)
  const [layers, setLayers] = useState(initialLayers)
  const [selected, setSelected] = useState<number>()
  const { status, update } = quick
  const running = status === 'running'
  const labels = {
    idle: 'En espera', running: 'Calculando', completed: 'Finalizado', stopped: 'Detenido', error: 'Error',
  }
  const board = running && animate ? update.board : update.solutions.at(-1) ?? emptyPlacement()

  return (
    <div className="workspace quick-workspace">
      <div className="workspace-primary">
        <BoardPanel board={board} layers={layers} setLayers={setLayers} selected={selected} reduced={reduced}
          status={labels[status]} onSquare={column => setSelected(column)}>
          <div className="execution-controls">
            <button type="button" className="button primary" disabled={running} onClick={() => quick.start(strategy, animate && !reduced)}><Zap size={17} /> Resolver</button>
            <button type="button" className="button" disabled={!running} onClick={quick.stop}>Detener</button>
            <button type="button" className="button icon-button reset-button" aria-label="Reiniciar estadísticas" title="Reiniciar estadísticas" disabled={running || status === 'idle'} onClick={quick.reset}><RotateCcw size={17} /></button>
          </div>
        </BoardPanel>
      </div>
      <div className="workspace-sidebar">
        <section className="panel settings-panel">
          <PanelHeading title="Búsqueda exhaustiva" icon={<Gauge size={18} />} />
          <p className="muted">MAC explora todas las ramas compatibles. Compara el orden de columnas con MRV o combina MRV con LCV.</p>
          <div className="compact-controls">
            <Strategies value={strategy} onChange={setStrategy} disabled={running} />
            <label className="checkbox"><input type="checkbox" checked={animate} disabled={running || reduced} onChange={event => setAnimate(event.target.checked)} /> Animar tablero</label>
          </div>
          <p className={status === 'error' ? 'lab-warning' : 'selection-info'} aria-live="polite">
            {status === 'completed' ? `Búsqueda completa · ${update.solutions.length} soluciones verificadas.`
              : status === 'stopped' ? `Búsqueda detenida · ${update.solutions.length} soluciones verificadas hasta ahora.`
              : status === 'error' ? 'El navegador no pudo iniciar el cálculo. Recarga la página e inténtalo de nuevo.'
              : running ? `${update.stats.nodes} nodos explorados · ${update.solutions.length} soluciones.`
              : 'El cálculo se ejecuta en este navegador.'}
          </p>
          {quick.solutions.length > 0 && <a className="button" href="#soluciones">Explorar soluciones</a>}
        </section>
        <Statistics stats={status === 'idle' ? zeroStats() : update.stats} milliseconds={update.milliseconds} comparisons={quick.comparisons} />
      </div>
    </div>
  )
}
