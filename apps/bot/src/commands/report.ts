import { Markup, type Context, type Telegraf } from 'telegraf';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/users';

const TYPE_LABEL = {
  POWER: 'Power',
  INTERNET: 'Internet',
} as const;

type ReportType = keyof typeof TYPE_LABEL;

export async function handleReport(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const user = await getOrCreateUser(String(from.id));
  if (!user) {
    await ctx.reply('Sorry — I could not load your details. Please try again.');
    return;
  }

  const estates = user.followed_estates ?? [];
  if (estates.length === 0) {
    await ctx.reply('Follow an estate first, then report from here: /follow Rongai');
    return;
  }

  const rows = estates.map((estate) => [
    Markup.button.callback(`⚡ Power out — ${estate}`, `report:POWER:${estate}`),
    Markup.button.callback(`📶 Internet out — ${estate}`, `report:INTERNET:${estate}`),
  ]);

  await ctx.reply('What is down, and where?', Markup.inlineKeyboard(rows));
}

export function registerReportHandlers(bot: Telegraf): void {
  bot.action(/^report:(POWER|INTERNET):(.+)$/, async (ctx) => {
    const from = ctx.from;
    const type = ctx.match[1] as ReportType | undefined;
    const estate = ctx.match[2];

    if (!type || !estate) {
      await ctx.answerCbQuery('That button is out of date.');
      return;
    }

    const user = await getOrCreateUser(String(from.id));
    if (!user) {
      await ctx.answerCbQuery('Could not load your details.');
      return;
    }

    const { error } = await supabase.from('outages').insert({
      type,
      estate,
      status: 'PENDING',
      reported_by: user.id,
    });

    if (error) {
      console.error(`Failed to insert ${type} report for ${estate}:`, error);
      await ctx.answerCbQuery('Could not save the report.');
      return;
    }

    await ctx.answerCbQuery('Report received. Thank you!');
    await ctx.editMessageText(
      `${TYPE_LABEL[type]} outage reported in ${estate}. ` +
        'It shows on the map once neighbours confirm it.',
    );
  });
}
