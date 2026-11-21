import { BarChart3 } from 'lucide-react'
import { strategies } from '../algorithms/heuristics'
import { metricDefinitions, type Metric, type Stats } from '../engine/events'
import type { CompletedRun } from '../engine/useQuickSolve'
import { PanelHeading } from './Inspector'

const propagationMetrics: Metric[] = ['arcs', 'revisions', 'removed', 'empty']
const searchMetrics: Metric[] = ['assignments', 'nodes', 'backtracks', 'depth', 'solutions']
const numberFormatter = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 })
export const number = (value: number) => numberFormatter.format(value)

export function Statistics({ stats, milliseconds, comparisons }: {
  stats: Stats; milliseconds: number; comparisons?: readonly CompletedRun[]
}) {
  return (
    <section className="panel stats-panel">
      <PanelHeading title="Estadísticas" icon={<BarChart3 size={18} />} aside={<span className="tag">{number(milliseconds)} ms de cálculo</span>} />
      <div className="stats-groups">
        {[['Propagación AC-3', propagationMetrics], ['Búsqueda MAC', searchMetrics]].map(([label, metrics]) =>
          <div key={String(label)}><h3>{String(label)}</h3>
            <dl>{(metrics as Metric[]).map(key =>
              <div key={key}><dt title={metricDefinitions[key][1]}>{metricDefinitions[key][0]}</dt><dd>{number(stats[key])}</dd></div>,
            )}</dl>
          </div>,
        )}
      </div>
      <details className="metric-details">
        <summary>Cómo se calculan las métricas</summary>
        <ul>{Object.values(metricDefinitions).map(([title, description]) => <li key={title}><strong>{title}.</strong> {description}</li>)}</ul>
        <p>El tiempo mide la generación de eventos del motor y excluye las pausas y el intervalo de animación. Compáralo entre ejecuciones del mismo modo.</p>
      </details>
      {comparisons && comparisons.length > 0 && (
        <div className="table-scroll">
          <table><caption>Última ejecución completa por estrategia</caption>
            <thead><tr><th scope="col">Estrategia</th><th scope="col">Arcos</th><th scope="col">Ramas</th><th scope="col">Retrocesos</th><th scope="col">Tiempo</th></tr></thead>
            <tbody>{comparisons.map(run => <tr key={run.strategy}><th scope="row">{strategies[run.strategy]}</th>
              <td>{number(run.stats.arcs)}</td><td>{run.stats.assignments}</td><td>{run.stats.backtracks}</td><td>{number(run.milliseconds)} ms</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}
