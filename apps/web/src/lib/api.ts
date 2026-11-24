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

/** Active and pending outages, newest first. */
export async function fetchActiveOutages(): Promise<Outage[]> {
  const { data, error } = await supabase
    .from('outages')
    .select(OUTAGE_COLUMNS)
    .in('status', ['ACTIVE', 'PENDING'])
    .order('reported_at', { ascending: false })

  if (error) fail('fetchActiveOutages', error)
  return (data ?? []) as unknown as Outage[]
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

  const row: Record<string, unknown> = { ...fields, status: 'PENDING' }

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
  const { data, error } = await supabase
    .from('confirmations')
    .insert({ outage_id: outageId, user_id: userId, kind })
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
