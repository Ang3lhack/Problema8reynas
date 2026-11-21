import { useId, useState, type ReactNode } from 'react'
import { ArrowDownToLine, Braces, CircleDot, CodeXml, GitFork, ListOrdered, Network } from 'lucide-react'
import { arcLabel, INDICES, variable, type Arc, type Domains } from '../csp/model'
import { eventTitles, explain, type TraceEvent } from '../engine/events'
import type { Frame } from '../engine/playback'

export function PanelHeading({ icon, title, aside }: { icon: ReactNode; title: string; aside?: ReactNode }) {
  return <div className="panel-heading"><h2>{icon}{title}</h2>{aside}</div>
}

export function EventPanel({ event }: { event: TraceEvent }) {
  const tone = event.kind === 'conflict' ? 'danger' : event.kind === 'solution' || event.kind === 'consistent' ? 'success' : 'neutral'
  return (
    <section className="panel event-panel">
      <PanelHeading title="Paso actual" icon={<CircleDot size={17} />} aside={<span className="tag">{event.phase === 'ac3' ? 'AC-3' : 'BÚSQUEDA · MAC'}</span>} />
      <div className={'event-callout ' + tone} aria-live="polite" aria-atomic="true">
        <strong>{eventTitles[event.kind]}</strong>
        <p>{explain(event)}</p>
        {event.arc && <code className="active-arc">{arcLabel(event.arc)}</code>}
      </div>
    </section>
  )
}

export function DomainsPanel({ domains, event, onSelect, selected }: {
  domains: Domains; event?: TraceEvent; onSelect?: (column: number) => void; selected?: number
}) {
  return (
    <section className="panel domains-panel">
      <PanelHeading title="Dominios" icon={<Braces size={18} />} aside={<span className="muted mono small">{domains.flat().length} / 64 valores</span>} />
      <div className="domain-list">
        {domains.map((domain, column) => (
          <div key={column} className={`domain-row${event?.arc?.[0] === column ? ' domain-active' : ''}`}>
            {onSelect ? (
              <button type="button" className="domain-variable" aria-pressed={selected === column}
                aria-label={`Inspeccionar ${variable(column)}`} onClick={() => onSelect(column)}>{variable(column)}</button>
            ) : <span className="domain-variable">{variable(column)}</span>}
            {INDICES.map(value => {
              const removed = !domain.includes(value)
              const evaluated = event?.column === column && event.value === value
              const assigned = domain.length === 1 && !removed
              const restored = event?.kind === 'backtrack' && !removed && !event.previousDomains?.[column].includes(value)
              const status = restored ? 'restaurado' : removed ? 'eliminado' : assigned ? 'asignado' : evaluated ? 'evaluado' : 'disponible'
              return <span key={value} title={status}
                className={`domain-value ${status}${evaluated ? ' value-evaluated' : ''}`}
                aria-label={`${variable(column)}, ${value}, ${status}`}>{value}</span>
            })}
          </div>
        ))}
      </div>
      <div className="domain-legend small muted">
        <span><i /> Disponible</span><span><i className="legend-assigned" /> Asignado</span><span><i className="legend-evaluated" /> Evaluado</span><span><i className="legend-removed" /> Eliminado</span>
      </div>
    </section>
  )
}

export function ArcQueue({ event }: { event: TraceEvent }) {
  return (
    <section className="panel queue-panel">
      <PanelHeading title="Cola de arcos" icon={<ListOrdered size={18} />} aside={<span className="tag">{event.queue.length} pendientes</span>} />
      {event.arc && <p className="queue-active"><ArrowDownToLine size={15} /> Arco activo <code>{arcLabel(event.arc)}</code></p>}
      <p className="small muted">FIFO · El siguiente arco aparece primero.</p>
      {event.queue.length ? (
        <ol className="arc-list" aria-label="Arcos pendientes en orden">
          {event.queue.map((arc, index) => {
            const added = event.added?.some(([source, target]) => arc[0] === source && arc[1] === target)
            return <li key={index} className={added ? 'new-arc' : undefined}>
              <span>{index + 1}.</span> {arcLabel(arc)}{added && <b aria-label="Recién incorporado"> +</b>}
            </li>
          })}
        </ol>
      ) : <div className="empty-inline">La cola está vacía.</div>}
      {event.previousQueue && <p className="small muted">Antes: {event.previousQueue.length} · Después: {event.queue.length}</p>}
    </section>
  )
}

const ac3Lines = [
  ['queue', 'cola ← arcos dirigidos pendientes'],
  ['', 'mientras la cola tenga arcos:'],
  ['extract', '  (Xi, Xj) ← extraer primero(cola)'],
  ['check', '  buscar soporte para cada valor de Xi en Xj'],
  ['prune', '  eliminar valores de Xi sin soporte'],
  ['conflict', '  si D(Xi) = ∅: devolver inconsistente'],
  ['enqueue', '  si D(Xi) cambió: encolar (Xk, Xi), k ≠ j'],
  ['consistent', 'devolver consistente por arcos'],
] as const
const macLines = [
  ['search', 'establecer consistencia inicial con AC-3'],
  ['solution', 'si es una hoja válida: registrar solución'],
  ['choose', 'elegir una variable con varias filas'],
  ['assign', 'para cada fila: guardar y asignar'],
  ['', '  si AC-3 propaga: explorar la rama'],
  ['backtrack', '  restaurar el estado padre'],
  ['done', 'terminar al agotar las ramas'],
] as const

export function Pseudocode({ event }: { event: TraceEvent }) {
  const lines = event.phase === 'mac' ? macLines : ac3Lines
  return (
    <section className="panel code-panel">
      <PanelHeading title="Pseudocódigo" icon={<CodeXml size={18} />} aside={<span className="tag">{event.phase === 'mac' ? 'MAC' : 'AC-3'}</span>} />
      <ol className="code-lines">
        {lines.map(([kind, line]) => {
          const current = kind === event.kind || (event.kind === 'done' && event.phase === 'ac3' &&
            kind === (event.result === 'inconsistent' ? 'conflict' : 'consistent'))
          return <li key={line} className={current ? 'current-line' : undefined} aria-current={current ? 'step' : undefined}><code>{line}</code></li>
        })}
      </ol>
    </section>
  )
}

function nodePosition(index: number) {
  const angle = index * Math.PI / 4 - Math.PI / 2
  return { x: 130 + 82 * Math.cos(angle), y: 105 + 78 * Math.sin(angle) }
}

export function ConstraintGraph({ arc, selected, onSelect }: { arc?: Arc; selected?: number; onSelect: (column: number) => void }) {
  const marker = useId()
  const [all, setAll] = useState(false)
  const filter = selected ?? arc?.[0] ?? 0
  return (
    <section className="panel graph-panel">
      <PanelHeading title="Grafo de restricciones" icon={<Network size={18} />} />
      <div className="compact-controls">
        <label>Variable <select value={filter} onChange={event => onSelect(Number(event.target.value))}>
          {INDICES.map(index => <option key={index} value={index}>{variable(index)}</option>)}
        </select></label>
        <label className="checkbox"><input type="checkbox" checked={all} onChange={event => setAll(event.target.checked)} /> Ver todas</label>
      </div>
      <svg viewBox="0 0 260 210" role="img" aria-label={`Grafo de las ocho variables. ${arc ? 'Arco activo ' + arcLabel(arc) : 'Sin arco activo'}.`}>
        <defs><marker id={marker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" /></marker></defs>
        {INDICES.flatMap(first => INDICES.filter(second => first < second && (all || first === filter || second === filter)).map(second => {
          const source = nodePosition(first)
          const target = nodePosition(second)
          return <line key={first + '-' + second} x1={source.x} y1={source.y} x2={target.x} y2={target.y} className="graph-edge" />
        }))}
        {arc && (() => {
          const source = nodePosition(arc[0])
          const target = nodePosition(arc[1])
          const distance = Math.hypot(target.x - source.x, target.y - source.y)
          return <line x1={source.x} y1={source.y}
            x2={target.x - 19 * (target.x - source.x) / distance}
            y2={target.y - 19 * (target.y - source.y) / distance} className="graph-active" markerEnd={`url(#${marker})`} />
        })()}
        {INDICES.map(index => {
          const { x, y } = nodePosition(index)
          return <g key={index} className={index === filter || arc?.includes(index) ? 'graph-node highlighted' : 'graph-node'}>
            <circle cx={x} cy={y} r="15" /><text x={x} y={y} dominantBaseline="middle" textAnchor="middle">{variable(index)}</text>
          </g>
        })}
      </svg>
      <p className="small muted">Cada conexión exige filas y diagonales distintas.</p>
    </section>
  )
}

export function SearchTree({ events, step, onJump }: { events: readonly Frame[]; step: number; onJump: (index: number) => void }) {
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)
  const nodes = new Map<number, { event: TraceEvent; status: string }>()
  for (const { event } of events) {
    if (event.id > step) break
    const id = event.branch.id
    const current = nodes.get(id)
    if (event.kind === 'assign') nodes.set(id, { event, status: 'Explorada' })
    if (!current) continue
    if (event.kind === 'conflict') current.status = 'Descartada'
    if (event.kind === 'solution') current.status = 'Solución'
    if (event.kind === 'backtrack' && current.status === 'Explorada') current.status = 'Restaurada'
  }
  const entries = [...nodes.values()].filter(node => filter === 'all' || filter === node.status)
  const pageSize = 16
  const last = Math.max(0, Math.ceil(entries.length / pageSize) - 1)
  const visiblePage = Math.min(page, last)

  return (
    <section className="panel tree-panel">
      <PanelHeading title="Árbol de búsqueda" icon={<GitFork size={18} />} aside={<span className="tag">{nodes.size} ramas</span>} />
      <div className="compact-controls">
        <label>Mostrar <select value={filter} onChange={event => { setFilter(event.target.value); setPage(0) }}>
          <option value="all">Todas</option>{['Descartada', 'Solución', 'Restaurada', 'Explorada'].map(status => <option key={status}>{status}</option>)}
        </select></label>
        <button className="button mini" onClick={() => setPage(visiblePage - 1)} disabled={visiblePage === 0}>Anterior</button>
        <button className="button mini" onClick={() => setPage(visiblePage + 1)} disabled={visiblePage === last}>Más ramas</button>
      </div>
      <div className="tree-root mono">Raíz · #0</div>
      {entries.length ? <ol className="tree-list">{entries.slice(visiblePage * pageSize, (visiblePage + 1) * pageSize).map(({ event, status }) => (
        <li key={event.branch.id} style={{ paddingInlineStart: Math.min(event.branch.depth, 6) * 10 }}>
          <button type="button" onClick={() => onJump(event.id)}>
            <span className="mono">#{event.branch.id} · {variable(event.column!)} = {event.value}</span><span className="small muted">padre #{event.branch.parent}</span><span className="tree-status">{status}</span>
          </button>
        </li>
      ))}</ol> : <div className="empty-inline">Las decisiones de MAC aparecerán en este árbol.</div>}
    </section>
  )
}
