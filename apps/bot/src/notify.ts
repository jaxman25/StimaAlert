import { Telegraf } from 'telegraf';
import { supabase } from './lib/supabase';

type OutageRow = {
  id: string;
  estate: string;
  type: 'POWER' | 'INTERNET';
  provider: string | null;
  status: 'PENDING' | 'ACTIVE' | 'RESOLVED';
  reports: number;
  reported_by: string | null;
};

export type NotifyResult = {
  sent: number;
  failed: number;
  skipped?: string;
};

/** The realtime payload carries the row before and after the update. */
export type OutageChange = {
  new: { id?: string; status?: string };
  old: { id?: string; status?: string };
};

let client: Telegraf | undefined;

/** A send-only client, so this module also works outside the polling process. */
function getBot(): Telegraf {
  if (!client) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is missing — see apps/bot/.env.example.');
    }
    client = new Telegraf(token);
  }
  return client;
}

function typeLabel(outage: OutageRow): { emoji: string; label: string } {
  return outage.type === 'POWER'
    ? { emoji: '⚡', label: 'Power' }
    : { emoji: '📶', label: 'Internet' };
}

export function formatOutageMessage(outage: OutageRow): string {
  const { emoji, label } = typeLabel(outage);
  const provider = outage.provider ? ` (${outage.provider})` : '';
  return `${emoji} ${label} OUT reported in ${outage.estate}${provider} — ${outage.reports} confirmations.`;
}

export function formatResolutionMessage(outage: OutageRow): string {
  const { emoji, label } = typeLabel(outage);
  const provider = outage.provider ? ` (${outage.provider})` : '';
  return `${emoji} ${label} back ON in ${outage.estate}${provider}.`;
}

/** Send a message to every chat following the estate, skipping excluded users. */
async function sendToFollowers(
  outage: OutageRow,
  message: string,
  bot: Telegraf,
  excludeUserIds: Set<string> = new Set(),
): Promise<NotifyResult> {
  const { data: followers, error } = await supabase
    .from('users')
    .select('id, telegram_id')
    .contains('followed_estates', [outage.estate]);

  if (error) {
    throw new Error(`Could not load followers for ${outage.estate}: ${error.message}`);
  }

  let sent = 0;
  let failed = 0;

  await Promise.all(
    (followers ?? []).map(async (follower) => {
      if (!follower.telegram_id || excludeUserIds.has(follower.id)) return;
      try {
        await bot.telegram.sendMessage(follower.telegram_id, message);
        sent += 1;
      } catch (sendError) {
        failed += 1;
        // A blocked bot or a deleted account should not stop the rest.
        console.error(`Could not notify ${follower.telegram_id}:`, sendError);
      }
    }),
  );

  return { sent, failed };
}

/**
 * Message every follower of the outage's estate. Only ACTIVE outages are
 * announced; PENDING ones have not been confirmed by neighbours yet.
 */
export async function notifyFollowers(
  outageId: string,
  bot: Telegraf = getBot(),
): Promise<NotifyResult> {
  const { data: outage, error } = await supabase
    .from('outages')
    .select('id, estate, type, provider, status, reports, reported_by')
    .eq('id', outageId)
    .maybeSingle<OutageRow>();

  if (error) {
    throw new Error(`Could not load outage ${outageId}: ${error.message}`);
  }

  if (!outage) {
    return { sent: 0, failed: 0, skipped: 'outage not found' };
  }

  if (outage.status !== 'ACTIVE') {
    return { sent: 0, failed: 0, skipped: `status is ${outage.status}` };
  }

  // Do not tell people about an outage they reported or already confirmed.
  const { data: confirmations, error: confirmationError } = await supabase
    .from('confirmations')
    .select('user_id')
    .eq('outage_id', outageId);

  if (confirmationError) {
    throw new Error(`Could not load confirmations for ${outageId}: ${confirmationError.message}`);
  }

  const exclude = new Set((confirmations ?? []).map((row) => row.user_id as string));
  if (outage.reported_by) exclude.add(outage.reported_by);

  return sendToFollowers(outage, formatOutageMessage(outage), bot, exclude);
}

/**
 * Tell followers the estate has power again. Sent to everyone following the
 * estate, including the people whose votes closed the outage.
 */
export async function notifyResolution(
  outageId: string,
  bot: Telegraf = getBot(),
): Promise<NotifyResult> {
  const { data: outage, error } = await supabase
    .from('outages')
    .select('id, estate, type, provider, status, reports, reported_by')
    .eq('id', outageId)
    .maybeSingle<OutageRow>();

  if (error) {
    throw new Error(`Could not load outage ${outageId}: ${error.message}`);
  }

  if (!outage) {
    return { sent: 0, failed: 0, skipped: 'outage not found' };
  }

  if (outage.status !== 'RESOLVED') {
    return { sent: 0, failed: 0, skipped: `status is ${outage.status}` };
  }

  return sendToFollowers(outage, formatResolutionMessage(outage), bot);
}

/**
 * Realtime entry point: announce only the PENDING -> ACTIVE transition.
 * Returns true when a notification pass was run.
 */
export async function handleOutageChange(
  change: OutageChange,
  bot: Telegraf = getBot(),
): Promise<boolean> {
  const outageId = change.new.id;
  if (!outageId) return false;

  const previous = change.old.status;

  if (change.new.status === 'ACTIVE' && previous === 'PENDING') {
    const result = await notifyFollowers(outageId, bot);
    console.log(
      `Outage ${outageId} became ACTIVE — sent ${result.sent}, failed ${result.failed}` +
        (result.skipped ? `, skipped (${result.skipped})` : ''),
    );
    return true;
  }

  if (
    change.new.status === 'RESOLVED' &&
    (previous === 'ACTIVE' || previous === 'PENDING')
  ) {
    const result = await notifyResolution(outageId, bot);
    console.log(
      `Outage ${outageId} was resolved — sent ${result.sent}, failed ${result.failed}` +
        (result.skipped ? `, skipped (${result.skipped})` : ''),
    );
    return true;
  }

  return false;
}
