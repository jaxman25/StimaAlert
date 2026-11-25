import { supabase } from './supabase'

/* ============================================================
   Types — mirror supabase/migrations/001_init.sql
   ============================================================ */

export type OutageType = 'POWER' | 'INTERNET'

export type OutageProvider = 'KPLC' | 'SAFARICOM' | 'ZUKU' | 'FAIBA'

export type OutageStatus = 'PENDING' | 'ACTIVE' | 'RESOLVED'

export type ConfirmationKind = 'CONFIRM' | 'STILL_OUT' | 'BACK'

export interface Outage {
  id: string
  type: OutageType
  provider: OutageProvider | null
  estate: string
  /** PostGIS geography arrives from PostgREST as hex EWKB — see parsePoint(). */
  location: string | null
  status: OutageStatus
  reported_by: string | null
  reports: number
  still_out_votes: number
  back_votes: number
  reported_at: string
  last_prompt_at: string | null
  resolved_at: string | null
}

export interface ScheduledOutage {
  id: string
  provider: OutageProvider
  estate: string
  start_time: string
  end_time: string
  source_url: string | null
  added_by: string
}

export interface Confirmation {
  id: string
  outage_id: string
  user_id: string
  kind: ConfirmationKind
  created_at: string
}

/** Everything the app may supply when reporting an outage. */
export interface CreateOutageInput {
  type: OutageType
  estate: string
  provider?: OutageProvider | null
  /** Omit `location` when you only have coordinates; lat/lng are converted to EWKT. */
  lat?: number
  lng?: number
  reported_by?: string | null
  reports?: number
  still_out_votes?: number
  back_votes?: number
}

export interface LatLng {
  lat: number
  lng: number
}

/** Input for the admin "Add Scheduled Outage" form. */
export interface CreateScheduledOutageInput {
  provider: OutageProvider
  estate: string
  start_time: string
  end_time: string
  source_url?: string | null
}

// V1 demo user — replace with auth.uid() when we add Supabase Auth.
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

/* ============================================================
   Input validation
   ------------------------------------------------------------
   The database enforces these same limits with enums and column
   types, so this is defense-in-depth: a bad value fails here with a
   readable message instead of reaching the API at all.
   ============================================================ */

const OUTAGE_TYPES: readonly OutageType[] = ['POWER', 'INTERNET']
const PROVIDERS: readonly OutageProvider[] = ['KPLC', 'SAFARICOM', 'ZUKU', 'FAIBA']
const CONFIRMATION_KINDS: readonly ConfirmationKind[] = ['CONFIRM', 'STILL_OUT', 'BACK']

/** Longest estate name the UI and database are expected to accept. */
export const MAX_ESTATE_LENGTH = 100

function invalidField(field: string, reason: string): never {
  const message = `Invalid ${field}: ${reason}`
  console.error(`[api] rejected input — ${message}`)
  throw new Error(message)
}

/** Ensure a value is one of the outage types the database accepts. */
export function validateOutageType(value: unknown): OutageType {
  if (typeof value !== 'string' || !OUTAGE_TYPES.includes(value as OutageType)) {
    invalidField('outage type', `expected POWER or INTERNET, received ${JSON.stringify(value)}`)
  }
  return value as OutageType
}

/** Trim an estate name and check it is present and a sane length. */
export function validateEstate(value: unknown): string {
  if (typeof value !== 'string') {
    invalidField('estate', `expected a string, received ${JSON.stringify(value)}`)
  }

  const trimmed = value.trim()
  if (trimmed.length === 0) invalidField('estate', 'must not be empty')
  if (trimmed.length >= MAX_ESTATE_LENGTH) {
    invalidField('estate', `must be under ${MAX_ESTATE_LENGTH} characters`)
  }

  return trimmed
}

/** Allow null/undefined, otherwise require one of the four known providers. */
export function validateProvider(value: unknown): OutageProvider | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string' || !PROVIDERS.includes(value as OutageProvider)) {
    invalidField(
      'provider',
      `expected one of ${PROVIDERS.join(', ')} or null, received ${JSON.stringify(value)}`,
    )
  }
  return value as OutageProvider
}

/** Ensure a confirmation kind is one the database accepts. */
export function validateConfirmationKind(value: unknown): ConfirmationKind {
  if (typeof value !== 'string' || !CONFIRMATION_KINDS.includes(value as ConfirmationKind)) {
    invalidField(
      'confirmation kind',
      `expected CONFIRM, STILL_OUT or BACK, received ${JSON.stringify(value)}`,
    )
  }
  return value as ConfirmationKind
}

/* ============================================================
   Helpers
   ============================================================ */

const OUTAGE_COLUMNS =
  'id,type,provider,estate,location,status,reported_by,reports,still_out_votes,back_votes,reported_at,last_prompt_at,resolved_at'

/** PostgREST has no explicit failure type exported here; keep the shape local. */
type DbError = { message: string; code?: string; details?: string | null }

function fail(scope: string, error: DbError): never {
  console.error(`[api] ${scope} failed:`, error)
  throw new Error(`${scope} failed: ${error.message}`)
}

/**
 * Decode a PostGIS point (hex EWKB) into lat/lng.
 * Returns null for missing or unparseable values instead of throwing.
 */
export function parsePoint(hex: string | null | undefined): LatLng | null {
  if (!hex || hex.length < 42) return null

  try {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    }

    const view = new DataView(bytes.buffer)
    const littleEndian = view.getUint8(0) === 1
    const typeWord = view.getUint32(1, littleEndian)
    const hasSrid = (typeWord & 0x20000000) !== 0
    const offset = 5 + (hasSrid ? 4 : 0)

    const lng = view.getFloat64(offset, littleEndian)
    const lat = view.getFloat64(offset + 8, littleEndian)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  } catch (error) {
    console.error('[api] could not parse outage location', { hex, error })
    return null
  }
}

/* ============================================================
   Reads
   ============================================================ */

/** Delays between retries for reads that back the realtime map. */
const RETRY_DELAYS_MS = [1000, 2000, 4000]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Active and pending outages, newest first.
 *
 * This is the map's initial load and its realtime fallback, so a transient
 * failure is retried up to 3 times (1s, 2s, 4s) before giving up — enough to
 * ride out a blip without hammering the database.
 */
export async function fetchActiveOutages(): Promise<Outage[]> {
  let lastError: DbError | null = null

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    const { data, error } = await supabase
      .from('outages')
      .select(OUTAGE_COLUMNS)
      .in('status', ['ACTIVE', 'PENDING'])
      .order('reported_at', { ascending: false })

    if (!error) return (data ?? []) as unknown as Outage[]

    lastError = error
    const delay = RETRY_DELAYS_MS[attempt]
    if (delay === undefined) break

    console.warn(
      `[api] fetchActiveOutages attempt ${attempt + 1} failed, retrying in ${delay}ms`,
      error,
    )
    await sleep(delay)
  }

  fail('fetchActiveOutages', lastError ?? { message: 'unknown error' })
}

/** The most recently reported outage for one estate, or null when it has none. */
export async function fetchEstateStatus(estate: string): Promise<Outage | null> {
  const { data, error } = await supabase
    .from('outages')
    .select(OUTAGE_COLUMNS)
    .eq('estate', estate)
    .order('reported_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) fail('fetchEstateStatus', error)
  return (data as unknown as Outage | null) ?? null
}

/** Scheduled outages that have not ended yet, soonest first. */
export async function fetchScheduledOutages(): Promise<ScheduledOutage[]> {
  const { data, error } = await supabase
    .from('scheduled')
    .select('id,provider,estate,start_time,end_time,source_url,added_by')
    .gte('end_time', new Date().toISOString())
    .order('start_time', { ascending: true })

  if (error) fail('fetchScheduledOutages', error)
  return (data ?? []) as unknown as ScheduledOutage[]
}

/* ============================================================
   Writes
   ============================================================ */

/** Insert a new outage. New reports always start as PENDING. */
export async function createOutage(payload: CreateOutageInput): Promise<Outage> {
  const { lat, lng, ...fields } = payload

  // Validate before building the row: a hostile or buggy caller should fail
  // here rather than at the database.
  const type = validateOutageType(fields.type)
  const estate = validateEstate(fields.estate)
  const provider = validateProvider(fields.provider)

  const row: Record<string, unknown> = { ...fields, type, estate, provider, status: 'PENDING' }

  if (typeof lat === 'number' && typeof lng === 'number') {
    row.location = `SRID=4326;POINT(${lng} ${lat})`
  }

  const { data, error } = await supabase.from('outages').insert(row).select(OUTAGE_COLUMNS).single()

  if (error) fail('createOutage', error)
  return data as unknown as Outage
}

/** Insert a scheduled outage from the admin panel. */
export async function createScheduledOutage(
  payload: CreateScheduledOutageInput,
): Promise<ScheduledOutage> {
  const { data, error } = await supabase
    .from('scheduled')
    .insert({
      provider: payload.provider,
      estate: payload.estate,
      start_time: payload.start_time,
      end_time: payload.end_time,
      source_url: payload.source_url || null,
    })
    .select('id,provider,estate,start_time,end_time,source_url,added_by')
    .single()

  if (error) fail('createScheduledOutage', error)
  return data as unknown as ScheduledOutage
}

/** Remove a scheduled outage by id. */
export async function deleteScheduledOutage(id: string): Promise<void> {
  const { data, error } = await supabase.from('scheduled').delete().eq('id', id).select('id')

  if (error) fail('deleteScheduledOutage', error)

  // RLS can make a delete succeed with zero rows; surface that instead of hiding it.
  if (!data || data.length === 0) {
    const message = 'Nothing was deleted — the database is missing a DELETE policy for scheduled.'
    console.error(`[api] deleteScheduledOutage failed: ${message}`)
    throw new Error(message)
  }
}

/** Mark an outage resolved. Requires the 005 UPDATE policy on outages. */
export async function resolveOutage(id: string): Promise<Outage> {
  const { data, error } = await supabase
    .from('outages')
    .update({ status: 'RESOLVED', resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select(OUTAGE_COLUMNS)

  if (error) fail('resolveOutage', error)

  // RLS can make an update succeed with zero rows; surface that instead of hiding it.
  if (!data || data.length === 0) {
    const message = 'Nothing was updated — the database is missing an UPDATE policy for outages.'
    console.error(`[api] resolveOutage failed: ${message}`)
    throw new Error(message)
  }

  return data[0] as unknown as Outage
}

/** Remove an outage by id. Requires the 005 DELETE policy on outages. */
export async function deleteOutage(id: string): Promise<void> {
  const { data, error } = await supabase.from('outages').delete().eq('id', id).select('id')

  if (error) fail('deleteOutage', error)

  if (!data || data.length === 0) {
    const message = 'Nothing was deleted — the database is missing a DELETE policy for outages.'
    console.error(`[api] deleteOutage failed: ${message}`)
    throw new Error(message)
  }
}

/** Record a confirmation vote. Duplicate votes are rejected by the DB. */
export async function submitConfirmation(
  outageId: string,
  userId: string,
  kind: ConfirmationKind,
): Promise<Confirmation> {
  const validatedKind = validateConfirmationKind(kind)

  const { data, error } = await supabase
    .from('confirmations')
    .insert({ outage_id: outageId, user_id: userId, kind: validatedKind })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      console.error('[api] submitConfirmation failed: duplicate vote', error)
      throw new Error('This user has already submitted that confirmation.')
    }
    fail('submitConfirmation', error)
  }

  return data as unknown as Confirmation
}
