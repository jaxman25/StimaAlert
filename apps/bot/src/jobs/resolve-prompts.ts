import { Telegraf } from 'telegraf';
import { runResolutionPrompts } from '../prompts';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is missing — see apps/bot/.env.example.');
  process.exit(1);
}

const dryRun = process.env.DRY_RUN === '1';
const bot = new Telegraf(token);

runResolutionPrompts(bot, { dryRun })
  .then((result) => {
    console.log(
      `${dryRun ? '[dry-run] ' : ''}prompted for ${result.asked} outage(s), ` +
        `sent ${result.sent} message(s), resolved ${result.timedOut} by timeout.`,
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error('resolve-prompts failed:', error);
    process.exit(1);
  });
