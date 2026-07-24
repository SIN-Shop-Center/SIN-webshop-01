// Purpose: Minimal className combiner (no clsx dependency)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 10)
//
// We intentionally avoid pulling in `clsx` for a single use case. Falsy values
// are dropped; strings are concatenated with a single space.

type ClassValue = string | number | false | null | undefined

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
