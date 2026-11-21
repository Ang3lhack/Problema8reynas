import { COLUMNS, INDICES, type Placement, type Solution } from './model'

export function isSolution(rows: readonly (number | null)[]): rows is Solution {
  if (rows.length !== INDICES.length) return false
  const usedRows = new Set<number>()
  const descending = new Set<number>()
  const ascending = new Set<number>()
  for (const [column, row] of rows.entries()) {
    if (row === null || !Number.isInteger(row) || !INDICES.includes(row)) return false
    if (usedRows.has(row) || descending.has(row - column) || ascending.has(row + column)) return false
    usedRows.add(row)
    descending.add(row - column)
    ascending.add(row + column)
  }
  return true
}

export function conflicts(board: Placement) {
  return board.flatMap((row, column) => row === null ? [] : board.flatMap((otherRow, other) => {
    if (other <= column || otherRow === null) return []
    const sameRow = row === otherRow
    const sameDiagonal = Math.abs(row - otherRow) === other - column
    return sameRow || sameDiagonal ? [{ column, other, rule: sameRow ? 'fila' : 'diagonal' }] : []
  }))
}

export const squareName = (column: number, row: number) => COLUMNS[column] + (8 - row)
