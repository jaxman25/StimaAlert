import { Markup, type Telegraf } from 'telegraf';
import { supabase } from './lib/supabase';
import { getUserByTelegramId } from './lib/users';

/** Wait this long after a report before asking anyone. */
export const PROMPT_AFTER_MS = 2 * 60 * 60 * 1000;
/** Ask again at most this often. */
const REPROMPT_AFTER_MS = 2 * 60 * 60 * 1000;
/** After the last unanswered prompt, give up and resolve. */
const TIMEOUT_RESOLVE_AFTER_MS = 6 * 60 * 60 * 1000;
export const MAX_PROMPTS = 3;
const RESOLVE_NET_BACK_VOTES = 3;

type PromptTarget = {
  id: string;
  estate: string;
  prompt_count: number;
};

export function promptText(estate: string): string {
  return `Is power back in ${estate}?`;
}

export function promptKeyboard(outageId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("👍 It's back", `back:${outageId}`),
      Markup.button.callback('👎 Still out', `still:${outageId}`),
    ],
  ]);
}

type RunOptions = {
  dryRun?: boolean;
  now?: Date;
  log?: (line: string) => void;
};

type RunResult = {
  asked: number;
  sent: number;
  timedOut: number;
};

/**
 * One pass of the "is it back?" job. Safe to run from cron: it only touches
 * outages that are due, and every send/update failure is logged per row so one
 * bad chat id cannot stop the rest.
 */
export async function runResolutionPrompts(
  bot: Telegraf,
  options: RunOptions = {},
): Promise<RunResult> {
  const { dryRun = false, now = new Date(), log = console.log } = options;

  const reportedCutoff = new Date(now.getTime() - PROMPT_AFTER_MS).toISOString();
  const promptCutoff = new Date(now.getTime() - REPROMPT_AFTER_MS).toISOString();

  const { data: due, error } = await supabase
    .from('outages')
    .select('id, estate, prompt_count')
    .in('status', ['PENDING', 'ACTIVE'])
    .lte('reported_at', reportedCutoff)
    .lt('prompt_count', MAX_PROMPTS)
    .or(`last_prompt_at.is.null,last_prompt_at.lte."${promptCutoff}"`)
    .returns<PromptTarget[]>();

  if (error) {
    throw new Error(`Could not load outages to prompt: ${error.message}`);
  }

  let sent = 0;

  for (const outage of due) {
    const { data: followers, error: followerError } = await supabase
      .from('users')
      .select('telegram_id')
      .contains('followed_estates', [outage.estate]);

    if (followerError) {
      console.error(`Could not load followers for ${outage.estate}:`, followerError);
      continue;
    }

    for (const follower of followers ?? []) {
      if (!follower.telegram_id) continue;
      if (dryRun) {
        log(`[dry-run] would ask ${follower.telegram_id} about ${outage.estate} (${outage.id})`);
        sent += 1;
        continue;
      }

      try {
        await bot.telegram.sendMessage(
          follower.telegram_id,
          promptText(outage.estate),
          promptKeyboard(outage.id),
        );
        sent += 1;
      } catch (sendError) {
        console.error(`Could not prompt ${follower.telegram_id}:`, sendError);
      }
    }

    if (dryRun) continue;

    const { error: updateError } = await supabase
      .from('outages')
      .update({
        prompt_count: outage.prompt_count + 1,
        last_prompt_at: now.toISOString(),
      })
      .eq('id', outage.id);

    if (updateError) {
      console.error(`Could not mark outage ${outage.id} as prompted:`, updateError);
    }
  }

  // Outages nobody answered after the third prompt stop being "active".
  const timeoutCutoff = new Date(now.getTime() - TIMEOUT_RESOLVE_AFTER_MS).toISOString();
  const { data: stale, error: staleError } = await supabase
    .from('outages')
    .update({ status: 'RESOLVED', resolved_at: now.toISOString() })
    .neq('status', 'RESOLVED')
    .gte('prompt_count', MAX_PROMPTS)
    .lte('last_prompt_at', timeoutCutoff)
    .select('id, estate')
    .returns<Array<{ id: string; estate: string }>>();

  if (staleError) {
    throw new Error(`Could not time out stale outages: ${staleError.message}`);
  }

  for (const outage of stale) {
    log(`Resolved ${outage.estate} (${outage.id}) after ${MAX_PROMPTS} unanswered prompts.`);
  }

  return { asked: due.length, sent, timedOut: stale.length };
}

type VoteOutcome = 'ok' | 'unregistered' | 'failed';

async function recordConfirmation(
  outageId: string,
  telegramId: string,
  kind: 'BACK' | 'STILL_OUT',
): Promise<VoteOutcome> {
  const user = await getUserByTelegramId(telegramId);
  if (!user) return 'unregistered';

  const { error } = await supabase
    .from('confirmations')
    .insert({ outage_id: outageId, user_id: user.id, kind });

  if (error) {
    // A repeat tap on the same button is not an error.
    if (error.code === '23505') return 'ok';
    console.error(`Could not record ${kind} for ${outageId}:`, error);
    return 'failed';
  }

  return 'ok';
}

async function countVotes(outageId: string, kind: 'BACK' | 'STILL_OUT'): Promise<number> {
  const { count, error } = await supabase
    .from('confirmations')
    .select('id', { count: 'exact', head: true })
    .eq('outage_id', outageId)
    .eq('kind', kind);

  if (error) {
    console.error(`Could not count ${kind} votes for ${outageId}:`, error);
    return 0;
  }

  return count ?? 0;
}

export function registerPromptHandlers(bot: Telegraf): void {
  bot.action(/^back:(.+)$/, async (ctx) => {
    const outageId = ctx.match[1];
    if (!outageId) {
      await ctx.answerCbQuery('That button is out of date.');
      return;
    }

    const outcome = await recordConfirmation(outageId, String(ctx.from.id), 'BACK');

    if (outcome === 'unregistered') {
      await ctx.answerCbQuery('Send /start first so I know who you are.');
      return;
    }
    if (outcome === 'failed') {
      await ctx.answerCbQuery('Could not save that — please try again.');
      return;
    }

    const [back, stillOut] = await Promise.all([
      countVotes(outageId, 'BACK'),
      countVotes(outageId, 'STILL_OUT'),
    ]);

    if (back - stillOut >= RESOLVE_NET_BACK_VOTES) {
      const { error } = await supabase
        .from('outages')
        .update({ status: 'RESOLVED', resolved_at: new Date().toISOString() })
        .eq('id', outageId)
        .neq('status', 'RESOLVED');

      if (error) {
        console.error(`Could not resolve outage ${outageId}:`, error);
      } else {
        await ctx.editMessageText('Thanks — enough neighbours agree, so this outage is now closed.');
        await ctx.answerCbQuery('Marked as back on.');
        return;
      }
    }

    await ctx.editMessageText('Thanks for confirming.');
    await ctx.answerCbQuery('Noted.');
  });

  bot.action(/^still:(.+)$/, async (ctx) => {
    const outageId = ctx.match[1];
    if (!outageId) {
      await ctx.answerCbQuery('That button is out of date.');
      return;
    }

    const outcome = await recordConfirmation(outageId, String(ctx.from.id), 'STILL_OUT');

    if (outcome === 'unregistered') {
      await ctx.answerCbQuery('Send /start first so I know who you are.');
      return;
    }
    if (outcome === 'failed') {
      await ctx.answerCbQuery('Could not save that — please try again.');
      return;
    }

    await ctx.editMessageText('Thanks — noted that it is still out.');
    await ctx.answerCbQuery('Noted.');
  });
}
