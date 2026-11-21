import { arcLabel, boardFromDomains, variable, type Arc, type Domains, type Placement, type Solution } from '../csp/model'

export const metricDefinitions = {
  arcs: ['Arcos procesados', 'Cada extracción de la cola FIFO.'],
  revisions: ['Revisiones', 'Cada llamada a REVISE para el arco extraído.'],
  removed: ['Valores eliminados', 'Valores sin soporte retirados por AC-3.'],
  empty: ['Dominios vacíos', 'Contradicciones detectadas por AC-3.'],
  assignments: ['Intentos de asignación', 'Decisiones explícitas que crean una rama.'],
  nodes: ['Nodos explorados', 'Incluye la raíz y cada rama intentada.'],
  backtracks: ['Retrocesos', 'Restauraciones después de terminar o descartar una rama.'],
  depth: ['Profundidad máxima', 'Número máximo de decisiones desde la raíz.'],
  solutions: ['Soluciones', 'Tableros completos que pasan la validación independiente.'],
} as const
export type Metric = keyof typeof metricDefinitions
export type Stats = Record<Metric, number>
export const zeroStats = (): Stats => ({
  arcs: 0, revisions: 0, removed: 0, empty: 0,
  assignments: 0, nodes: 0, backtracks: 0, depth: 0, solutions: 0,
})

export type EventKind =
  | 'ready' | 'queue' | 'extract' | 'check' | 'prune' | 'enqueue' | 'conflict' | 'consistent'
  | 'search' | 'choose' | 'assign' | 'backtrack' | 'solution' | 'done'
export const eventTitles: Record<EventKind, string> = {
  ready: 'Listo para comenzar',
  queue: 'Inicializar la cola',
  extract: 'Extraer un arco',
  check: 'Comprobar soporte',
  prune: 'Eliminar un valor',
  enqueue: 'Actualizar la cola',
  conflict: 'Detectar contradicción',
  consistent: 'Consistencia de arcos',
  search: 'Iniciar la búsqueda',
  choose: 'Seleccionar variable',
  assign: 'Asignar un valor',
  backtrack: 'Restaurar dominios',
  solution: 'Solución encontrada',
  done: 'Ejecución finalizada',
}

export interface Branch {
  id: number
  parent: number | null
  depth: number
  column?: number
  value?: number
}
type Phase = 'ac3' | 'mac'

export interface EventData {
  kind: EventKind
  phase: Phase
  domains: Domains
  previousDomains?: Domains
  queue: readonly Arc[]
  previousQueue?: readonly Arc[]
  arc?: Arc
  added?: readonly Arc[]
  column?: number
  value?: number
  supports?: readonly number[]
  removed?: readonly number[]
  branch: Branch
  restoredTo?: Branch
  solution?: Solution
  result?: 'consistent' | 'inconsistent' | 'exhausted'
  partial?: boolean
  strategy?: string
}

export interface TraceEvent extends EventData {
  id: number
  board: Placement
  stats: Stats
}

export const root: Branch = { id: 0, parent: null, depth: 0 }
export type Detail = 'full' | 'summary'
export interface Context {
  detail: Detail
  stats: Stats
  record(data: EventData): TraceEvent
}

export function context(detail: Detail): Context {
  let step = 0
  const stats = zeroStats()
  return {
    detail,
    stats,
    record: data => ({
      ...data,
      id: step++,
      board: boardFromDomains(data.domains),
      stats: { ...stats },
    }),
  }
}

export const important = new Set<EventKind>(['assign', 'prune', 'conflict', 'backtrack', 'solution', 'consistent', 'done'])
const pair = (event: TraceEvent) => arcLabel(event.arc!)
export function explain(event: TraceEvent): string {
  const name = event.column === undefined ? '' : variable(event.column)
  switch (event.kind) {
    case 'ready':
      return event.domains.some(domain => domain.length === 1)
        ? 'Las reinas manuales fijan sus dominios a una fila. Ejecuta AC-3 para determinar qué valores pierden soporte.'
        : 'Cada columna es una variable con ocho filas posibles. Inicia para ver cómo el algoritmo comprueba sus restricciones.'
    case 'queue':
      return `Se incorporan ${event.queue.length} arcos dirigidos. Cada arco comprueba los valores de su variable de origen frente a la variable de destino.`
    case 'extract':
      return `Sale ${pair(event)} del frente de la cola. REVISE busca soporte para cada fila del dominio de ${name}.`
    case 'check':
      return event.supports?.length
        ? `En ${pair(event)}, la fila ${event.value} tiene soporte en { ${event.supports.join(', ')} }. Ninguna de esas posiciones comparte su fila o diagonal.`
        : `En ${pair(event)}, cada valor del dominio de destino comparte fila o diagonal con la fila ${event.value} de ${name}. La fila evaluada carece de soporte.`
    case 'prune':
      return `Se elimina ${event.value} de ${name}. Ningún valor de la variable de destino en ${pair(event)} satisface simultáneamente las dos restricciones.`
    case 'enqueue':
      return event.added?.length
        ? `El dominio de ${name} cambió. Se agregan ${event.added.length} arcos entrantes de otros vecinos que podrían perder soporte.`
        : `El dominio de ${name} cambió. Los arcos entrantes que hay que revisar ya están en la cola.`
    case 'conflict':
      return `El dominio de ${name} quedó vacío. Con las decisiones actuales, esta variable carece de una fila posible.`
    case 'consistent':
      return event.stats.removed === 0
        ? 'La cola quedó vacía y cada valor conserva al menos un soporte en cada dominio vecino. Los dominios completos ya eran consistentes por arcos. La búsqueda decide qué combinaciones forman soluciones.'
        : 'La cola quedó vacía. Cada valor restante tiene soporte en cada dominio vecino. Una configuración parcial aún puede requerir búsqueda.'
    case 'search':
      return `Se exploran ramas con la estrategia «${event.strategy}». Después de cada decisión se aplica AC-3 para mantener la consistencia de arcos.`
    case 'choose':
      return `Se elige ${name}, con ${event.domains[event.column!].length} filas disponibles, según «${event.strategy}». Cada fila disponible define una rama.`
    case 'assign':
      return `Se prueba ${name} = ${event.value}. El dominio se reduce a una fila y AC-3 propagará la decisión hacia sus vecinos.`
    case 'backtrack':
      return `Termina la rama de ${name} = ${event.value}. Se restauran los dominios de su estado padre para continuar la búsqueda.`
    case 'solution':
      return `Se verificaron ocho reinas sin ataques. El arreglo [${event.solution?.join(', ')}] indica una fila por columna.`
    case 'done':
      if (event.result === 'exhausted') return `La búsqueda agotó las ramas y verificó ${event.stats.solutions} soluciones completas.`
      if (event.result === 'inconsistent') return 'Se detectó un dominio vacío. Las asignaciones seleccionadas no admiten una solución.'
      return event.partial
        ? 'La propagación alcanzó consistencia de arcos. Sigue siendo una configuración parcial y todavía puede requerir búsqueda.'
        : 'Los ocho dominios contienen una única fila. La validación independiente confirmó un tablero completo.'
  }
}
