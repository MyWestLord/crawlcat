#!/usr/bin/env node
// crawlcat — one cat, eight legs, a ball of yarn and a pump.fun habit.
import { say, color } from './log.ts';
import { config } from './config.ts';
import { isAddress } from './util/base58.ts';

const [cmd = 'help', ...rest] = process.argv.slice(2);
const flags = new Map<string, string | true>();
const args: string[] = [];
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); flags.set(k, v ?? (rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true)); }
  else args.push(a);
}
const flag = (k: string) => (typeof flags.get(k) === 'string' ? flags.get(k) as string : undefined);
const live = flags.has('live');
if (live && !config.live) { say('warn', 'refusing --live: set LIVE=1 in .env first (see docs/SAFETY.md)'); process.exit(1); }

const BANNER = color.pink(String.raw`
    /\_/\     ${color.bold('CRAWLCAT')}  ·  yarn desk
   ( o.o )    8 legs · 8 paws · 8 checks
  //|_8_|\\   knits memes on pump.fun, trades the rest
 // /   \ \\  ${color.dim(live ? 'LIVE MODE' : 'paper mode')}
`);

async function main() {
  switch (cmd) {
    case 'scan': {
      const mint = args[0];
      if (!mint || !isAddress(mint)) { say('warn', 'usage: crawlcat scan <mint address>'); process.exit(1); }
      const { tapAll } = await import('./paws/checks.ts');
      const { decide, pawCard } = await import('./paws/verdict.ts');
      say('sniff', `tapping ${mint} with all eight paws…`);
      const paws = await tapAll({ mint, pool: flag('pool') ?? 'pump', metadataUri: flag('uri') });
      console.log(pawCard(paws));
      const d = decide(paws);
      say(d.verdict === 'wrap' ? 'hiss' : d.verdict === 'pounce' ? 'pounce' : 'sniff', d.line);
      say('feed', 'tip: bundles, wash volume and the dev wallet need launch-time data. `crawlcat hunt` sees those live.');
      break;
    }
    case 'hunt': {
      console.log(BANNER);
      const { hunt } = await import('./trade/hunt.ts');
      await hunt({ live, maxMints: flag('max') ? Number(flag('max')) : undefined, verbose: flags.has('verbose') });
      break;
    }
    case 'knit':
    case 'launch': {
      console.log(BANNER);
      const { knit } = await import('./launch/knit.ts');
      await knit({ theme: flag('theme') ?? args.join(' '), name: flag('name'), ticker: flag('ticker'), lore: flag('lore'), live, devBuySol: flag('dev-buy') ? Number(flag('dev-buy')) : undefined, twitter: flag('twitter'), telegram: flag('telegram'), website: flag('website') });
      break;
    }
    case 'crew': {
      const { SEATS } = await import('./crew/roles.ts');
      const { seat } = await import('./crew/llm.ts');
      for (const s of SEATS) console.log(`  ${s.who.padEnd(10)} ${s.role.padEnd(11)} ${s.job.padEnd(48)} ${seat(s.role, s.who) ? color.green('connected') : color.dim('offline brain')}`);
      break;
    }
    case 'desk': {
      const { serveDesk } = await import('./desk/server.ts');
      serveDesk(Number(flag('port') ?? 8808));
      break;
    }
    default:
      console.log(BANNER + `
  ${color.bold('crawlcat scan <mint>')}          tap a coin with all 8 paws
  ${color.bold('crawlcat hunt')} [--max N]        sit on the web, judge every new mint, paper-trade the clean ones
  ${color.bold('crawlcat knit')} [theme]          the crew drafts a meme, the cat knits it (dry run)
      --name --ticker --lore             override the crew
      --live --dev-buy 0.5               launch it on pump.fun for real (LIVE=1 only)
  ${color.bold('crawlcat crew')}                  who is sitting at the desk
  ${color.bold('crawlcat desk')} [--port 8808]    open the Yarn Desk terminal
`);
  }
}
main().catch(e => { say('warn', (e as Error).message); process.exit(1); });
