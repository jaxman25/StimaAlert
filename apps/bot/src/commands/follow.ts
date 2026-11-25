import type { Context } from 'telegraf';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/users';

const normalizeEstate = (value: string): string =>
  value.trim().replace(/\s+/g, ' ');

// ctx.payload only exists on Telegraf's narrowed command context, so parse the
// raw message instead of widening the handler's parameter type.
const argumentAfterCommand = (text: string, command: string): string =>
  text.replace(new RegExp(`^/${command}(@\\w+)?\\s*`, 'i'), '');

export async function handleFollow(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  const estate = normalizeEstate(argumentAfterCommand(text, 'follow'));
  if (!estate) {
    await ctx.reply('Which estate? Try /follow Rongai.');
    return;
  }

  const user = await getOrCreateUser(String(from.id));
  if (!user) {
    await ctx.reply('Sorry — I could not update your follow list. Please try again.');
    return;
  }

  const followed = user.followed_estates ?? [];

  if (followed.some((name) => name.toLowerCase() === estate.toLowerCase())) {
    await ctx.reply(`You are already following ${estate}.`);
    return;
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ followed_estates: [...followed, estate] })
    .eq('id', user.id);

  if (updateError) {
    console.error(`Failed to update follow list for ${from.id}:`, updateError);
    await ctx.reply('Sorry — I could not update your follow list. Please try again.');
    return;
  }

  await ctx.reply(`You are now following ${estate}.`);
}
