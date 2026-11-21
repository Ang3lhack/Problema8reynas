import { useState, type KeyboardEvent } from 'react'
import { COLUMNS, compatible, INDICES, type Arc, type Placement } from '../csp/model'
import { conflicts, squareName } from '../csp/validation'

export function Queen({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <g fill="currentColor" stroke="none">
        <circle cx="8" cy="13" r="3" /><circle cx="24" cy="8" r="3" /><circle cx="40" cy="13" r="3" />
        <path d="M9 17l6 17h18l6-17-10 7-5-12-5 12-10-7Zm6 19h18l3 5H12z" />
      </g>
      <path d="M16 31h16" stroke="var(--queen-detail, #24474a)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export interface Layers {
  rows: boolean
  columns: boolean
  diagonals: boolean
  conflicts: boolean
}

export const initialLayers: Layers = { rows: false, columns: false, diagonals: false, conflicts: true }

interface Props {
  board: Placement
  active?: Arc
  column?: number
  selected?: number
  layers?: Layers
  differences?: Placement
  onSquare?: (column: number, row: number) => void
  animated?: boolean
}

export function ChessBoard({ board, column, active, selected, layers = initialLayers, differences, onSquare, animated = true }: Props) {
  const [focusIndex, setFocusIndex] = useState(0)
  const pairs = conflicts(board)
  const occupied = board.flatMap((row, index) => row === null ? [] : [{ row, column: index }])
  const inspected = selected === undefined ? occupied : occupied.filter(queen => queen.column === selected)

  function onKey(event: KeyboardEvent<HTMLButtonElement>, row: number, col: number) {
    const delta: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    }
    const movement = delta[event.key]
    if (!movement) return
    event.preventDefault()
    const nextRow = Math.min(7, Math.max(0, row + movement[0]))
    const nextColumn = Math.min(7, Math.max(0, col + movement[1]))
    event.currentTarget.closest('.chess-grid')?.querySelector<HTMLButtonElement>(
      `[data-cell="${nextRow * 8 + nextColumn}"]`,
    )?.focus()
  }

  return (
    <figure className="chess" aria-label="Tablero de ajedrez de ocho por ocho">
      <div className="rank-labels" aria-hidden="true">{INDICES.map(row => <span key={row}>{8 - row}</span>)}</div>
      <div className="chess-main">
        <div className="chess-grid">
          {INDICES.flatMap(row => INDICES.map(col => {
            const queen = board[col] === row
            const coordinate = squareName(col, row)
            const attacked = inspected.some(position => {
              if (position.column === col && position.row === row) return false
              return (layers.rows && position.row === row)
                || (layers.columns && position.column === col)
                || (layers.diagonals && Math.abs(position.row - row) === Math.abs(position.column - col))
            })
            const conflict = layers.conflicts && queen && pairs.some(pair => pair.column === col || pair.other === col)
            const difference = differences && differences[col] !== board[col] && (queen || differences[col] === row)
            const evaluated = (active?.[0] === col || column === col) && queen
            const supporter = active?.[1] === col && queen
            const cell = row * 8 + col
            const className = [
              'square', (row + col) % 2 ? 'square-dark' : 'square-light',
              attacked && 'square-attacked', conflict && 'square-conflict', difference && 'square-difference',
              selected === col && queen && 'square-selected', evaluated && 'square-active', supporter && 'square-support',
            ].filter(Boolean).join(' ')
            const label = [coordinate, 'fila ' + row, queen && 'reina', attacked && 'atacada', conflict && 'conflicto', difference && 'cambio']
              .filter(Boolean).join(', ')
            const markers = <>{attacked && <span className="attack-mark" />}{conflict && <span className="conflict-mark">!</span>}
              {difference && !queen && <span className="difference-mark">×</span>}</>
            return onSquare ? (
              <button key={cell} type="button" className={className} aria-label={label} data-cell={cell}
                tabIndex={focusIndex === cell ? 0 : -1} onFocus={() => setFocusIndex(cell)}
                onKeyDown={event => onKey(event, row, col)} onClick={() => onSquare(col, row)}>{markers}</button>
            ) : <span key={cell} className={className} aria-hidden="true">{markers}</span>
          }))}
          <div className="piece-layer" aria-hidden="true">
            {INDICES.map(col => {
              const row = board[col]
              return <div className={`piece-position${row !== null ? ' piece-present' : ''}${animated ? ' piece-animated' : ''}`}
                key={col} style={{ left: col * 12.5 + '%', top: (row ?? 0) * 12.5 + '%' }}><Queen /></div>
            })}
          </div>
        </div>
        <div className="file-labels" aria-hidden="true">{[...COLUMNS].map(col => <span key={col}>{col}</span>)}</div>
      </div>
      <figcaption className="sr-only">
        {occupied.length ? occupied.map(({ column, row }) => `Reina en ${squareName(column, row)}, variable Q${column}, fila ${row}`).join('. ') : 'Tablero vacío'}
        {pairs.length > 0 && '. ' + pairs.map(({ column, other, rule }) => `Q${column} y Q${other} comparten ${rule}`).join('. ')}
      </figcaption>
    </figure>
  )
}

export function attackExample(column: number, row: number, other: number, otherRow: number) {
  if (row === otherRow) return 'Misma fila'
  return compatible(column, row, other, otherRow) ? 'Hay soporte' : 'Misma diagonal'
}
