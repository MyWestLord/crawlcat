// Knitting a coin: crew draft → yarn-ball art → metadata → (optionally) a real pump.fun launch.
// Dry run is the default and writes everything to ./out/launches/<TICKER>/ so you can look before you leap.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.ts';
import { say, color } from '../log.ts';
import { draft, type Draft } from '../crew/roles.ts';
import { remember } from '../crew/memory.ts';
import { yarnCoin } from './png.ts';
import { hostMetadata } from './pinata.ts';
import { generate, secretToBase58 } from '../util/keypair.ts';
import { assertLive } from '../trade/lightning.ts';

export interface KnitOptions { theme?: string; name?: string; ticker?: string; lore?: string; live?: boolean; devBuySol?: number; twitter?: string; telegram?: string; website?: string }

export async function knit(o: KnitOptions): Promise<{ draft: Draft; dir: string; mint?: string; signature?: string }> {
  say('knit', 'the crew is drafting…');
  const d = await draft(o.theme ?? '');
  if (o.name) d.name = o.name; if (o.ticker) d.ticker = o.ticker.replace(/^\$/, '').toUpperCase(); if (o.lore) d.lore = o.lore;
  for (const [role, line] of Object.entries(d.seats)) say('crew', `${role.padEnd(10)} ${line}`);

  const dir = join(config.outDir, 'launches', d.ticker); mkdirSync(dir, { recursive: true });
  const png = yarnCoin(d.ticker); writeFileSync(join(dir, 'coin.png'), png);
  const meta = { name: d.name, symbol: d.ticker, description: d.lore, twitter: o.twitter, telegram: o.telegram, website: o.website };
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify(meta, null, 2));
  say('knit', `$${d.ticker} knitted → ${dir}/coin.png`);

  if (!o.live) {
    say('knit', color.yellow('dry run: nothing was launched. Add --live (and LIVE=1) to launch on pump.fun.'));
    remember('launch', `${d.ticker} draft`, `dry run\n\nname: ${d.name}\nlore: ${d.lore}`, ['dry-run']);
    return { draft: d, dir };
  }
  if (!d.goNow) throw new Error(`the timer seat said wait: ${d.why}. Re-run later or pass --force-now`);
  assertLive();
  const uri = await hostMetadata(meta, png);
  const mint = generate();
  const body = {
    action: 'create', tokenMetadata: { name: d.name, symbol: d.ticker, uri },
    mint: secretToBase58(mint), denominatedInSol: 'true', amount: o.devBuySol ?? config.devBuySol,
    slippage: config.slippagePct, priorityFee: config.priorityFeeSol, pool: 'pump',
  };
  const res = await fetch(`${config.tradeUrl}?api-key=${encodeURIComponent(config.pumpPortalKey)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const out = await res.json() as { signature?: string; errors?: unknown[] };
  if (!res.ok || !out.signature) throw new Error(`launch refused: ${JSON.stringify(out.errors ?? out)}`);
  writeFileSync(join(dir, 'launch.json'), JSON.stringify({ mint: mint.publicKey, signature: out.signature, uri, at: new Date().toISOString() }, null, 2));
  say('knit', color.green(`$${d.ticker} is live: https://pump.fun/coin/${mint.publicKey}`));
  remember('launch', `${d.ticker} live`, `mint: ${mint.publicKey}\nsignature: ${out.signature}\nuri: ${uri}\n\n${d.lore}`, ['live']);
  return { draft: d, dir, mint: mint.publicKey, signature: out.signature };
}
