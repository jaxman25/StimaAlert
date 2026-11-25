import type { Context } from 'telegraf';
import { supabase } from '../lib/supabase';

type OutageRow = {
  type: 'POWER' | 'INTERNET';
  provider: string | null;
  status: 'PENDING' | 'ACTIVE';
  reported_at: string;
};

const normalizeEstate = (value: string): string =>
  value.trim().replace(/\s+/g, ' ');

// ilike treats % and _ as wildcards; a typed "%" should not match every estate.
const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

const argumentAfterCommand = (text: string, command: string): string =>
  text.replace(new RegExp(`^/${command}(@\\w+)?\\s*`, 'i'), '');

export async function handleStatus(ctx: Context): Promise<void> {
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  const estate = normalizeEstate(argumentAfterCommand(text, 'status'));
  if (!estate) {
    await ctx.reply('Which estate? Try /status Rongai.');
    return;
  }

  const { data, error } = await supabase
    .from('outages')
    .select('type, provider, status, reported_at')
    .ilike('estate', escapeLike(estate))
    .in('status', ['ACTIVE', 'PENDING'])
    .order('reported_at', { ascending: false })
    .returns<OutageRow[]>();

  if (error) {
    console.error(`Failed to load outages for "${estate}":`, error);
    await ctx.reply('Sorry — I could not check that estate right now. Please try again.');
    return;
  }

  if (data.length === 0) {
    await ctx.reply(`Power is currently ON in ${estate}.`);
    return;
  }

  const power = data.find((outage) => outage.type === 'POWER');

  if (power) {
    const provider = power.provider ? ` (${power.provider})` : '';
    const since = new Date(power.reported_at).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Nairobi',
    });
    await ctx.reply(`Power is out in ${estate}${provider}, reported at ${since}.`);
    return;
  }

  await ctx.reply(`Internet is down in ${estate}.`);
}
