import { constrain, incoming, type Domains } from '../csp/model'
import type { Branch, Context } from '../engine/events'
import { ac3 } from './ac3'

export function propagateAssignment(
  domains: Domains, column: number, value: number, trace: Context, branch: Branch,
) {
  return ac3(constrain(domains, column, [value]), incoming(column), trace, branch)
}
