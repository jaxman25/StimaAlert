/** Small date/label helpers shared by the status and scheduled screens. */

const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

function upperMeridiem(value: string): string {
  return value.replace(/\b(am|pm)\b/, (match) => match.toUpperCase())
}

/** "2:15 PM" */
export function formatTime(iso: string): string {
  return upperMeridiem(TIME_FORMAT.format(new Date(iso)))
}

/** "9am" / "9:30pm" */
export function formatCompactTime(iso: string): string {
  const date = new Date(iso)
  const hour = date.getHours() % 12 || 12
  const minutes = date.getMinutes()
  const suffix = date.getHours() < 12 ? 'am' : 'pm'
  return minutes === 0 ? `${hour}${suffix}` : `${hour}:${String(minutes).padStart(2, '0')}${suffix}`
}

/** "Sat 23 Nov · 9am – 5pm" */
export function formatWindow(startIso: string, endIso: string): string {
  return `${DAY_FORMAT.format(new Date(startIso))} · ${formatCompactTime(startIso)} – ${formatCompactTime(endIso)}`
}

/** "KPLC" stays as-is; enum values such as SAFARICOM become "Safaricom". */
export function providerLabel(provider: string): string {
  if (provider === 'KPLC') return 'KPLC'
  return provider.charAt(0) + provider.slice(1).toLowerCase()
}
