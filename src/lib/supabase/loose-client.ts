import type { SupabaseClient } from '@supabase/supabase-js'

export type SupabaseErrorLike = {
  code?: string
  message: string
  details?: string
  hint?: string
} | null

export type SupabaseResult<T> = {
  data: T
  error: SupabaseErrorLike
  count: number | null
}

type RowOf<T> = T extends readonly (infer Row)[] ? Row : T

/**
 * Transitional query surface for a database whose generated Supabase types are
 * not checked into the repository yet. It keeps query chaining and callback
 * context typed without pretending that table columns are already generated.
 *
 * Replace this adapter with generated `Database` types from Supabase before
 * enabling strict schema-level compile checks.
 */
export interface LooseQueryBuilder<T = any[]> extends PromiseLike<SupabaseResult<T>> {
  select<Result = any[]>(columns?: string, options?: Record<string, unknown>): LooseQueryBuilder<Result>
  insert(values: unknown, options?: Record<string, unknown>): LooseQueryBuilder<any[]>
  upsert(values: unknown, options?: Record<string, unknown>): LooseQueryBuilder<any[]>
  update(values: unknown, options?: Record<string, unknown>): LooseQueryBuilder<T>
  delete(options?: Record<string, unknown>): LooseQueryBuilder<T>
  eq(column: string, value: unknown): LooseQueryBuilder<T>
  neq(column: string, value: unknown): LooseQueryBuilder<T>
  not(column: string, operator: string, value: unknown): LooseQueryBuilder<T>
  or(filters: string, options?: Record<string, unknown>): LooseQueryBuilder<T>
  gt(column: string, value: unknown): LooseQueryBuilder<T>
  gte(column: string, value: unknown): LooseQueryBuilder<T>
  lt(column: string, value: unknown): LooseQueryBuilder<T>
  lte(column: string, value: unknown): LooseQueryBuilder<T>
  like(column: string, pattern: string): LooseQueryBuilder<T>
  ilike(column: string, pattern: string): LooseQueryBuilder<T>
  textSearch(column: string, query: string, options?: Record<string, unknown>): LooseQueryBuilder<T>
  is(column: string, value: unknown): LooseQueryBuilder<T>
  in(column: string, values: readonly unknown[]): LooseQueryBuilder<T>
  contains(column: string, value: unknown): LooseQueryBuilder<T>
  overlaps(column: string, value: unknown): LooseQueryBuilder<T>
  order(column: string, options?: Record<string, unknown>): LooseQueryBuilder<T>
  limit(count: number, options?: Record<string, unknown>): LooseQueryBuilder<T>
  range(from: number, to: number, options?: Record<string, unknown>): LooseQueryBuilder<T>
  abortSignal(signal: AbortSignal): LooseQueryBuilder<T>
  returns<Result>(): LooseQueryBuilder<Result>
  single<Result = RowOf<T>>(): Promise<SupabaseResult<Result>>
  maybeSingle<Result = RowOf<T>>(): Promise<SupabaseResult<Result | null>>
}

export interface LooseSupabaseClient {
  from(table: string): LooseQueryBuilder<any[]>
  rpc<Result = any>(fn: string, args?: Record<string, unknown>, options?: Record<string, unknown>): LooseQueryBuilder<Result>
  auth: SupabaseClient['auth']
  storage: SupabaseClient['storage']
}

export function asLooseSupabaseClient(client: SupabaseClient): LooseSupabaseClient {
  return client as unknown as LooseSupabaseClient
}
