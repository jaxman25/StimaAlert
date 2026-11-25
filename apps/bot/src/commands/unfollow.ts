import type { Context } from 'telegraf';
import { supabase } from '../lib/supabase';
import { getUserByTelegramId } from '../lib/users';

const normalizeEstate = (value: string): string =>
  value.trim().replace(/\s+/g, ' ');

const argumentAfterCommand = (text: string, command: string): string =>
  text.replace(new RegExp(`^/${command}(@\\w+)?\\s*`, 'i'), '');

export async function handleUnfollow(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  const estate = normalizeEstate(argumentAfterCommand(text, 'unfollow'));
  if (!estate) {
    await ctx.reply('Which estate? Try /unfollow Rongai.');
    return;
  }

  const user = await getUserByTelegramId(String(from.id));
  if (!user) {
    await ctx.reply('You are not following any estates yet. Try /follow Rongai.');
    return;
  }

  const followed = user.followed_estates ?? [];
  const remaining = followed.filter((name) => name.toLowerCase() !== estate.toLowerCase());

  if (remaining.length === followed.length) {
    await ctx.reply(`You are not following ${estate}.`);
    return;
  }

  const { error } = await supabase
    .from('users')
    .update({ followed_estates: remaining })
    .eq('id', user.id);

  if (error) {
    console.error(`Failed to update follow list for ${from.id}:`, error);
    await ctx.reply('Sorry — I could not update your follow list. Please try again.');
    return;
  }

  await ctx.reply(`You are no longer following ${estate}.`);
}
