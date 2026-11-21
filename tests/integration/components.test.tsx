/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ChessBoard } from '../../src/components/ChessBoard'
import { DomainsPanel } from '../../src/components/Inspector'
import { emptyPlacement, fullDomains } from '../../src/csp/model'

afterEach(cleanup)

describe('tablero y dominios', () => {
  it('permite recorrer casillas con flechas y activar la asignación con el botón enfocado', () => {
    const selected: number[][] = []
    render(<ChessBoard board={emptyPlacement()} onSquare={(column, row) => selected.push([column, row])} />)
    const a8 = screen.getByRole('button', { name: 'A8, fila 0' })
    a8.focus()
    fireEvent.keyDown(a8, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'B8, fila 0' }))
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    fireEvent.click(document.activeElement!)
    expect(selected).toEqual([[1, 1]])
    expect(screen.getByText('Tablero vacío')).toBeTruthy()
  })

  it('identifica conflictos y dominios descartados con texto accesible', () => {
    const board = [0, 1, null, null, null, null, null, null]
    const domains = fullDomains().map((domain, index) => board[index] === null ? domain : [board[index]])
    render(<><ChessBoard board={board} /><DomainsPanel domains={domains} /></>)
    expect(within(screen.getByRole('figure')).getByText(/Q0 y Q1 comparten diagonal/)).toBeTruthy()
    expect(screen.getByLabelText('Q0, 0, asignado')).toBeTruthy()
    expect(screen.getByLabelText('Q0, 1, eliminado')).toBeTruthy()
  })
})
