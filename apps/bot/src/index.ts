import { Telegraf } from 'telegraf';
import { handleFollow } from './commands/follow';
import { registerReportHandlers, handleReport } from './commands/report';
import { handleStart } from './commands/start';
import { handleStatus } from './commands/status';
import { handleUnfollow } from './commands/unfollow';
import { registerPromptHandlers } from './prompts';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error(
    'TELEGRAM_BOT_TOKEN is missing. Add it to apps/bot/.env — see .env.example.',
  );
  process.exit(1);
}

const bot = new Telegraf(token);

bot.command('start', handleStart);
bot.command('follow', handleFollow);
bot.command('unfollow', handleUnfollow);
bot.command('status', handleStatus);
bot.command('report', handleReport);

registerReportHandlers(bot);
registerPromptHandlers(bot);

bot.help((ctx) =>
  ctx.reply(
    '/follow <estate> — get a ping when power returns\n' +
      '/unfollow <estate> — stop following an estate\n' +
      '/status <estate> — check whether power is on right now\n' +
      '/report — report an outage in an estate you follow',
  ),
);

bot.catch((error, ctx) => {
  console.error(`Update ${ctx.update.update_id} failed:`, error);
});

// Telegraf 4.16 resolves launch() only when polling stops, so the "running"
// message goes in the onLaunch callback rather than in a .then().
bot
  .launch(() => {
    console.log(`StimaAlert bot running as @${bot.botInfo?.username ?? 'unknown'}`);
  })
  .catch((error) => {
    console.error('Failed to start the bot:', error);
    process.exit(1);
  });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => bot.stop(signal));
}
