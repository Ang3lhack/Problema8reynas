import { compatible, INDICES, type Domains } from '../csp/model'

export const strategies = {
  fixed: 'Orden de columnas',
  mrv: 'MRV · dominio mínimo',
  'mrv-lcv': 'MRV + LCV',
} as const
export type Strategy = keyof typeof strategies

export function selectVariable(domains: Domains, strategy: Strategy) {
  const candidates = INDICES.filter(column => domains[column].length > 1)
  if (strategy !== 'fixed') {
    candidates.sort((first, second) => domains[first].length - domains[second].length || first - second)
  }
  return candidates[0]
}

export function orderValues(domains: Domains, column: number, strategy: Strategy) {
  const values = [...domains[column]]
  if (strategy !== 'mrv-lcv') return values
  const flexibility = (value: number) => domains.reduce((sum, domain, other) =>
    other === column ? sum : sum + domain.filter(row => compatible(column, value, other, row)).length, 0)
  const scores = new Map(values.map(value => [value, flexibility(value)]))
  return values.sort((first, second) => scores.get(second)! - scores.get(first)! || first - second)
}
