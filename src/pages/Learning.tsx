import { useState } from 'react'
import { BookOpen, FlaskConical } from 'lucide-react'
import { attackExample, ChessBoard } from '../components/ChessBoard'
import { PanelHeading } from '../components/Inspector'
import { INDICES } from '../csp/model'

const lessons = [
  {
    title: 'Historia y planteamiento',
    intro: 'Coloca ocho reinas en un tablero de ajedrez de modo que ninguna pueda atacar a otra. Dijkstra usó este problema para explicar cómo construir un programa que enumera configuraciones.',
    definition: 'Una configuración válida tiene exactamente una reina por fila y columna. Cada diagonal contiene como máximo una.',
    example: 'Una reina en A8 ataca B8 por fila, A7 por columna y B7 por diagonal.',
    resource: 'Prueba esas casillas en el tablero de ejemplo y observa las marcas de ataque.',
    code: 'src/csp/validation.ts · isSolution',
  },
  {
    title: 'Problemas de satisfacción de restricciones',
    intro: 'Un CSP descompone una tarea en decisiones pequeñas que deben cumplir ciertas reglas juntas.',
    definition: 'Un CSP es una terna de variables, dominios y restricciones. Una solución asigna un valor a cada variable de forma que satisface todas las restricciones.',
    example: 'Q0 y Q1 representan las columnas A y B. Si Q0 toma el valor 0, una restricción elimina la opción Q1 = 1 al propagarse.',
    resource: 'En el Laboratorio, fija Q0 = 0 y consulta los dominios antes y después de AC-3.',
    code: 'src/csp/model.ts · fullDomains, compatible',
  },
  {
    title: 'Variables, dominios y restricciones',
    intro: 'Una variable por columna garantiza una única reina en cada columna al completar el tablero.',
    definition: 'Para i ≠ j, la compatibilidad exige Qi ≠ Qj y |Qi − Qj| ≠ |i − j|.',
    example: 'Q0 = 0 y Q1 = 2 son compatibles. La diferencia de filas es 2 y la de columnas es 1.',
    resource: 'Usa el selector de fila de Q1 para probar ambas restricciones.',
    code: 'src/csp/model.ts · compatible',
  },
  {
    title: 'Consistencia de arcos',
    intro: 'Comprobamos si cada opción de una variable puede convivir con alguna opción de su vecina.',
    definition: 'Xi → Xj es consistente si para todo a ∈ D(Xi) existe b ∈ D(Xj) que satisface la restricción entre Xi y Xj.',
    example: 'Si D(Q0) = {0}, el valor Q1 = 1 no tiene soporte. Q1 = 2 sí tiene soporte en Q0 = 0.',
    resource: 'Invierte mentalmente el arco: ¿qué necesitarías para conservar el único valor de Q0?',
    code: 'src/algorithms/revise.ts · revise',
  },
  {
    title: 'Algoritmo AC-3',
    intro: 'AC-3 revisa una cola de arcos y vuelve a examinar vecinos cuando un dominio cambia.',
    definition: 'Cuando REVISE reduce D(Xi), AC-3 reencola los arcos Xk → Xi, salvo Xj → Xi, hasta vaciar la cola o detectar un dominio vacío.',
    example: 'Al fijar Q0 = 0, revisar Q1 → Q0 elimina 0 y 1 de Q1. Los demás vecinos de Q1 podrían haber perdido soporte.',
    resource: 'Abre el modo paso a paso y sigue la cola FIFO junto con el pseudocódigo activo.',
    code: 'src/algorithms/ac3.ts · ac3',
  },
  {
    title: 'Función REVISE',
    intro: 'REVISE comprueba el dominio de origen valor por valor. Un solo valor compatible basta para conservarlo.',
    definition: 'La revisión calcula, para cada a en D(Xi), el conjunto de soportes { b ∈ D(Xj) | compatible(a, b) }. AC-3 retira a si el conjunto es vacío.',
    example: 'Con Q0 fijada en 0, Q1 = 0 falla por fila y Q1 = 1 falla por diagonal.',
    resource: 'Cambia la fila de Q1 en el ejemplo y lee la causa escrita debajo del tablero.',
    code: 'src/algorithms/revise.ts · revise / src/algorithms/ac3.ts · poda',
  },
  {
    title: 'Búsqueda con retroceso',
    intro: 'Cada elección abre una rama. Cuando se agota, el algoritmo vuelve al estado previo y prueba la siguiente.',
    definition: 'Backtracking recorre en profundidad un árbol de asignaciones, restaura el estado padre y enumera las hojas válidas.',
    example: 'Después de agotar una rama Q0 = 0, el motor recupera los dominios del padre antes de probar la siguiente opción.',
    resource: 'Filtra el árbol por Restaurada y abre una rama para inspeccionarla.',
    code: 'src/algorithms/solver.ts · search',
  },
  {
    title: 'Mantenimiento de consistencia de arcos',
    intro: 'MAC combina cada decisión de búsqueda con una nueva propagación de restricciones.',
    definition: 'Sobre un estado ya consistente, la asignación a Xi puede quitar soporte a sus vecinos. AC-3 comienza con sus arcos entrantes y propaga los cambios que descubre.',
    example: 'Al fijar Q0, los primeros arcos de esa rama tienen destino Q0. Si un dominio queda vacío, MAC descarta la rama.',
    resource: 'En el visualizador, salta a una asignación y avanza un paso para ver los arcos entrantes.',
    code: 'src/algorithms/mac.ts · propagateAssignment',
  },
  {
    title: 'Complejidad y heurísticas',
    intro: 'El orden de las decisiones afecta cuántas ramas y arcos se examinan, aunque las soluciones sean las mismas.',
    definition: 'Para e arcos y dominios de tamaño máximo d, AC-3 tiene una cota O(ed³). La búsqueda puede crecer exponencialmente. MRV elige el menor dominio y LCV prioriza el valor que conserva más opciones inmediatas en los vecinos.',
    example: 'Entre dominios de dos y cuatro filas, MRV elige el primero. Si dos filas son candidatas, LCV compara la suma de soportes en los dominios vecinos.',
    resource: 'Ejecuta las tres estrategias en modo rápido y compara arcos, ramas y retrocesos.',
    code: 'src/algorithms/heuristics.ts · selectVariable, orderValues',
  },
  {
    title: 'Las 92 soluciones y sus 12 clases',
    intro: 'Las orientaciones cuentan como configuraciones distintas. Las rotaciones y reflexiones agrupan esas configuraciones.',
    definition: 'El grupo diédrico del cuadrado tiene ocho transformaciones. La órbita de una solución reúne sus transformaciones únicas.',
    example: 'Once clases tienen ocho miembros cada una. Una clase tiene cuatro por su simetría al girar 180°. Así se obtienen 11 × 8 + 4 = 92.',
    resource: 'En el Explorador, activa las clases y busca la órbita de cuatro miembros.',
    code: 'src/csp/symmetry.ts · transform, classify',
  },
]

const terms = [
  ['Arco dirigido', 'Comprobación de soporte desde el dominio de origen hacia el de destino.'],
  ['Dominio', 'Conjunto de valores todavía posibles para una variable.'],
  ['Soporte', 'Valor compatible en el dominio de la variable vecina.'],
  ['Poda', 'Eliminación de un valor sin soporte.'],
  ['Dominio vacío', 'La variable carece de una opción válida bajo las decisiones actuales.'],
  ['Punto fijo', 'Estado que ya no cambia con más revisiones.'],
  ['Retroceso', 'Regreso al estado padre para explorar otra decisión.'],
  ['Órbita', 'Conjunto de tableros distintos obtenidos con las simetrías de una solución.'],
]

export function Learning({ openLab, reduced }: { openLab: () => void; reduced: boolean }) {
  const [selection, setSelection] = useState(0)
  const [row, setRow] = useState(1)
  const lesson = lessons[selection]
  const outcome = attackExample(0, 0, 1, row)

  return (
    <>
      <div className="page-intro">
        <div className="eyebrow"><span /> GUÍA DE ESTUDIO</div>
        <h1>Aprender <em>AC-3</em></h1>
        <p>Del tablero al modelo matemático, y del modelo a una búsqueda verificable.</p>
      </div>
      <div className="learning-layout">
        <nav className="panel lesson-list" aria-label="Temas de aprendizaje">
          <PanelHeading title="Temario" icon={<BookOpen size={17} />} />
          {lessons.map(({ title }, index) => <button type="button" aria-current={index === selection ? 'true' : undefined}
            key={title} onClick={() => setSelection(index)}>{title}</button>)}
        </nav>
        <article className="panel lesson-content">
          <h2>{lesson.title}</h2>
          <p className="lesson-lead">{lesson.intro}</p>
          <h3>Definición técnica</h3><p>{lesson.definition}</p>
          <h3>En el tablero</h3><p>{lesson.example}</p><p>{lesson.resource}</p>
          <h3>En el código</h3><p><code>{lesson.code}</code></p>
          <button type="button" className="button" onClick={openLab}><FlaskConical size={17} /> Abrir Laboratorio</button>
        </article>
        <section className="panel learning-demo">
          <PanelHeading title="Prueba de soporte" icon={<FlaskConical size={17} />} />
          <ChessBoard board={[0, row, null, null, null, null, null, null]} selected={0}
            layers={{ rows: true, columns: true, diagonals: true, conflicts: true }} animated={!reduced} />
          <label>Fila de Q1 <select value={row} onChange={event => setRow(Number(event.target.value))}>
            {INDICES.map(index => <option key={index}>{index}</option>)}
          </select></label>
          <p className={outcome === 'Hay soporte' ? 'selection-info' : 'lab-warning'} role="status">{outcome} · Q1 = {row} y Q0 = 0</p>
        </section>
      </div>
      <div className="learning-reference">
        <section className="panel"><h2>Glosario</h2><dl>{terms.map(([term, definition]) =>
          <div key={term}><dt>{term}</dt><dd>{definition}</dd></div>,
        )}</dl></section>
        <section className="panel"><h2>Referencias</h2>
          <ul>
            <li>Alan K. Mackworth (1977). <a href="https://www.cs.ubc.ca/~mack/Publications/AI77.pdf">Consistency in Networks of Relations</a>.</li>
            <li>Edsger W. Dijkstra (1971). <a href="https://www.cs.utexas.edu/~EWD/transcriptions/EWD03xx/EWD316.9.html">The problem of eight queens</a>.</li>
            <li>Yuanlin Zhang y Roland H. C. Yap (2001). <a href="https://ijcai.org/proceedings/2001/45">Making AC-3 an Optimal Algorithm</a>.</li>
          </ul>
        </section>
      </div>
    </>
  )
}
