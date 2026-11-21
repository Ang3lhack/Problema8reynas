import { SIZE, type Solution } from './model'

export const transformations = [
  'Identidad', 'Rotación 90°', 'Rotación 180°', 'Rotación 270°',
  'Reflexión vertical', 'Reflexión y giro 90°', 'Reflexión y giro 180°', 'Reflexión y giro 270°',
] as const

export function transform(solution: Solution, index: number): Solution {
  const result = Array<number>(SIZE)
  solution.forEach((initialRow, initialColumn) => {
    let column = index >= 4 ? SIZE - 1 - initialColumn : initialColumn
    let row = initialRow
    for (let turn = 0; turn < index % 4; turn++) {
      const nextColumn = SIZE - 1 - row
      row = column
      column = nextColumn
    }
    result[column] = row
  })
  return result
}

export const solutionKey = (solution: Solution) => solution.join(',')
export const symmetryKey = (solution: Solution) =>
  transformations.map((_, index) => solutionKey(transform(solution, index))).sort()[0]

export function classify(solutions: readonly Solution[]) {
  const classes = new Map<string, Solution[]>()
  for (const solution of solutions) {
    const key = symmetryKey(solution)
    const members = classes.get(key)
    if (members) members.push(solution)
    else classes.set(key, [solution])
  }
  return [...classes.entries()].sort(([first], [second]) => first.localeCompare(second)).map(([, members]) => members)
}
