export const SIZE = 8
export const INDICES = Array.from({ length: SIZE }, (_, index) => index)
export const COLUMNS = 'ABCDEFGH'
export type Arc = readonly [source: number, target: number]
export type Domains = readonly (readonly number[])[]
export type Placement = readonly (number | null)[]
export type Solution = readonly number[]

export const ARCS: readonly Arc[] = INDICES.flatMap(source =>
  INDICES.filter(target => source !== target).map((target): Arc => [source, target]),
)

export const fullDomains = (): Domains => INDICES.map(() => [...INDICES])
export const emptyPlacement = (): Placement => INDICES.map(() => null)
export const boardFromDomains = (domains: Domains): Placement =>
  domains.map(domain => domain.length === 1 ? domain[0] : null)

export const compatible = (column: number, row: number, other: number, otherRow: number): boolean =>
  column !== other && row !== otherRow && Math.abs(row - otherRow) !== Math.abs(column - other)

export const constrain = (domains: Domains, column: number, values: readonly number[]): Domains =>
  domains.map((domain, index) => index === column ? values : domain)

export const incoming = (column: number, excluded?: number): Arc[] =>
  INDICES.filter(index => index !== column && index !== excluded).map(index => [index, column])

export const variable = (index: number) => 'Q' + index
export const arcLabel = ([source, target]: Arc) => variable(source) + ' → ' + variable(target)
