import { compatible, type Arc, type Domains } from '../csp/model'

export interface SupportCheck {
  value: number
  supports: readonly number[]
}

export function* revise(domains: Domains, [source, target]: Arc, exhaustive = true): Generator<SupportCheck> {
  for (const value of domains[source]) {
    const supports: number[] = []
    for (const candidate of domains[target]) {
      if (compatible(source, value, target, candidate)) {
        supports.push(candidate)
        if (!exhaustive) break
      }
    }
    yield { value, supports }
  }
}
