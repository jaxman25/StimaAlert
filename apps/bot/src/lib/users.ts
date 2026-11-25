import { supabase } from './supabase';

export type BotUser = {
  id: string;
  telegram_id: string | null;
  followed_estates: string[] | null;
};

export async function getUserByTelegramId(telegramId: string): Promise<BotUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, telegram_id, followed_estates')
    .eq('telegram_id', telegramId)
    .maybeSingle<BotUser>();

  if (error) {
    console.error(`Failed to load Telegram user ${telegramId}:`, error);
    return null;
  }

  return data;
}

/** Used by commands that should work even if the user never ran /start. */
export async function getOrCreateUser(telegramId: string): Promise<BotUser | null> {
  const existing = await getUserByTelegramId(telegramId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('users')
    .insert({ telegram_id: telegramId })
    .select('id, telegram_id, followed_estates')
    .single<BotUser>();

  if (error) {
    // Someone else inserted the row between the read and the write.
    if (error.code === '23505') return getUserByTelegramId(telegramId);
    console.error(`Failed to create Telegram user ${telegramId}:`, error);
    return null;
  }

  return data;
}
