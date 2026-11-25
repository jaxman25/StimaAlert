import type { Context } from 'telegraf';
import { supabase } from '../lib/supabase';

export async function handleStart(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);

  // ignoreDuplicates makes this a no-op for a returning user and races safely
  // against two /start messages arriving at once.
  const { error } = await supabase
    .from('users')
    .upsert(
      { telegram_id: telegramId },
      { onConflict: 'telegram_id', ignoreDuplicates: true },
    );

  if (error) {
    console.error(`Failed to save Telegram user ${telegramId}:`, error);
    await ctx.reply('Sorry — I could not save your details. Please try again.');
    return;
  }

  await ctx.reply(
    `Hi ${from.first_name || 'there'} — I'm StimaAlert.\n\n` +
      '/follow <estate> — get a ping when power returns\n' +
      '/status <estate> — check whether power is on right now',
  );
}
