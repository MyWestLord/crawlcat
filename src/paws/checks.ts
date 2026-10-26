// Eight legs, eight paws, eight checks. Each paw taps the coin once and reports back.
// A paw that cannot tell says "unknown" instead of guessing.
import { config } from '../config.ts';
import { getMint, getLargestHolders, getSupply } from '../solana/rpc.ts';
import type { Trail } from '../feed/trail.ts';

export type PawResult = 'pass' | 'fail' | 'unknown';
export interface Paw { leg: number; name: string; result: PawResult; detail: string }

export const PAWS = ['mint auth', 'freeze auth', 'liquidity', 'bundles', 'top 10', 'socials', 'wash volume', 'dev wallet'] as const;

const paw = (leg: number, result: PawResult, detail: string): Paw => ({ leg, name: PAWS[leg - 1], result, detail });

export interface Sources {
  mint: string;
  trail?: Trail;                                         // live feed data, when we caught the mint landing
  pool?: string;                                         // 'pump' while on the bonding curve
  bondingCurveKey?: string;
  metadataUri?: string;
}

/** Tap all eight paws. Network failures turn into "unknown", never into a pass. */
export async function tapAll(src: Sources, t = config): Promise<Paw[]> {
  const out: Paw[] = [];
  const safe = async (leg: number, fn: () => Promise<Paw>) => { try { out.push(await fn()); } catch (e) { out.push(paw(leg, 'unknown', `could not check: ${(e as Error).message}`)); } };

  const mintInfo = await getMint(src.mint).catch(() => null);
  await safe(1, async () => !mintInfo ? paw(1, 'unknown', 'mint account not readable') : mintInfo.mintAuthority === null ? paw(1, 'pass', 'revoked') : paw(1, 'fail', `still live: ${mintInfo.mintAuthority.slice(0, 6)}…`));
  await safe(2, async () => !mintInfo ? paw(2, 'unknown', 'mint account not readable') : mintInfo.freezeAuthority === null ? paw(2, 'pass', 'revoked') : paw(2, 'fail', 'freeze authority active'));
  await safe(3, async () => {
    const pool = src.pool ?? src.trail?.mint.pool;
    if (pool === 'pump') return paw(3, 'pass', 'liquidity sits in the bonding curve program, nobody can pull it');
    return paw(3, 'unknown', 'migrated pool: verify the LP burn on the AMM yourself');
  });
  await safe(4, async () => {
    if (!src.trail) return paw(4, 'unknown', 'not seen at launch, no early-buy data');
    const p = src.trail.bundlePct();
    return paw(4, p > t.maxBundlePct ? 'fail' : 'pass', `${p.toFixed(1)}% bought by other wallets in the first 1.5s`);
  });
  await safe(5, async () => {
    const [holders, supply] = await Promise.all([getLargestHolders(src.mint), getSupply(src.mint)]);
    const curve = src.bondingCurveKey ?? src.trail?.mint.bondingCurveKey;
    const real = holders.filter(h => h.owner !== curve).slice(0, 10);
    const pct = real.reduce((s, h) => s + h.uiAmount, 0) / (supply || 1) * 100;
    return paw(5, pct > t.maxTop10Pct ? 'fail' : 'pass', `top 10 wallets hold ${pct.toFixed(1)}% (curve excluded)`);
  });
  await safe(6, async () => {
    const uri = src.metadataUri ?? src.trail?.mint.uri;
    if (!uri) return paw(6, 'unknown', 'no metadata uri');
    const res = await fetch(uri.replace('ipfs://', 'https://ipfs.io/ipfs/'), { signal: AbortSignal.timeout(4000) });
    const meta = await res.json() as Record<string, string>;
    const links = ['twitter', 'telegram', 'website'].filter(k => typeof meta[k] === 'string' && meta[k].startsWith('http'));
    return paw(6, links.length ? 'pass' : 'fail', links.length ? links.join(' + ') : 'no socials at all');
  });
  await safe(7, async () => {
    if (!src.trail || src.trail.trades.length < 5) return paw(7, 'unknown', 'too few trades to judge');
    const w = src.trail.washPct();
    return paw(7, w > t.maxWashPct ? 'fail' : 'pass', `${w.toFixed(0)}% of volume from wallets trading both sides`);
  });
  await safe(8, async () => {
    if (!src.trail) return paw(8, 'unknown', 'dev not identified');
    const s = src.trail.devSoldPct();
    return paw(8, s > t.maxDevSoldPct ? 'fail' : 'pass', s > 0 ? `dev sold ${s.toFixed(0)}% of their bag` : 'dev still holding');
  });
  return out.sort((a, b) => a.leg - b.leg);
}
