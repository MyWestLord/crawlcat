// The hunt loop: sit on the web, feel every new mint, wait for it to settle, tap the eight paws,
// then pounce, wrap or keep watching. Exits run on every trade tick.
import { config } from '../config.ts';
import { say, color } from '../log.ts';
import { spinWeb, priceSol } from '../feed/pumpportal.ts';
import { Trail } from '../feed/trail.ts';
import { tapAll } from '../paws/checks.ts';
import { decide, pawCard } from '../paws/verdict.ts';
import { PaperBag } from './paper.ts';
import { buySol, sellPct } from './lightning.ts';
import { remember } from '../crew/memory.ts';

export interface HuntOptions { live: boolean; maxMints?: number; verbose?: boolean }

export async function hunt(opts: HuntOptions): Promise<void> {
  const web = spinWeb();
  const bag = new PaperBag();
  const trails = new Map<string, Trail>();
  const prices = new Map<string, number>();
  let seen = 0, wrapped = 0, pounced = 0;
  say('meow', `${opts.live ? color.red('LIVE') : 'paper'} hunt started · ${config.buySol}◎ per pounce · bag ${bag.cash}◎`);

  web.onMint(m => {
    if (opts.maxMints && seen >= opts.maxMints) return;
    seen++;
    const trail = new Trail(m); trails.set(m.mint, trail); web.watch([m.mint]);
    say('feed', `new mint landed: $${m.symbol ?? '?'} ${color.dim(m.mint)}`);
    setTimeout(() => judge(trail).catch(e => say('warn', e.message)), config.settleSeconds * 1000);
  });

  web.onTrade(t => {
    trails.get(t.mint)?.add(t);
    const px = priceSol(t); prices.set(t.mint, px);
    const entry = bag.open.get(t.mint)?.entryPrice;
    for (const f of bag.mark(t.mint, px)) {
      const pnl = entry ? f.sol - f.tokens * entry : 0;
      say('boop', `${f.reason} on $${f.symbol}: sold ${f.tokens.toFixed(0)} for ${f.sol.toFixed(3)}◎`);
      if (opts.live) sellPct(t.mint, f.reason === 'take-profit' ? Math.round(config.takeProfitFraction * 100) : 100).then(sig => say('boop', `live sell ${sig}`)).catch(e => say('warn', e.message));
      remember('trade', `${f.symbol} ${f.reason}`, `sold ${f.tokens.toFixed(0)} $${f.symbol} for ${f.sol.toFixed(4)} SOL (${f.reason}). approx pnl ${pnl.toFixed(4)} SOL`);
    }
  });

  async function judge(trail: Trail) {
    const m = trail.mint;
    const paws = await tapAll({ mint: m.mint, trail, pool: m.pool, bondingCurveKey: m.bondingCurveKey, metadataUri: m.uri });
    const d = decide(paws);
    if (opts.verbose) console.log(pawCard(paws));
    if (d.verdict === 'wrap') { wrapped++; say('hiss', `$${m.symbol}: ${d.line}`); remember('rug', `${m.symbol} wrapped`, `${m.mint}\n\n${pawCard(paws)}`); web.unwatch([m.mint]); return; }
    if (d.verdict === 'watch') { say('sniff', `$${m.symbol}: ${d.line}`); return; }
    const fill = bag.buy(m.mint, m.symbol ?? '?', trail.lastPrice);
    if (!fill) { say('sniff', `$${m.symbol}: clean, but the bag is full`); return; }
    pounced++;
    say('pounce', `$${m.symbol}: ${d.line} → ${fill.sol}◎ in`);
    if (opts.live) buySol(m.mint, fill.sol).then(sig => say('pounce', `live buy ${sig}`)).catch(e => say('warn', e.message));
    remember('trade', `${m.symbol} pounce`, `${m.mint}\nbought ${fill.tokens.toFixed(0)} for ${fill.sol} SOL\n\n${pawCard(paws)}`);
  }

  const timer = setInterval(() => say('meow', `seen ${seen} · wrapped ${wrapped} · pounced ${pounced} · open ${bag.open.size} · bag ${bag.value(prices).toFixed(3)}◎`), 30000);
  process.on('SIGINT', () => { clearInterval(timer); web.close(); say('meow', `nap time. final bag ${bag.value(prices).toFixed(3)}◎ over ${bag.fills.length} fills`); process.exit(0); });
}
