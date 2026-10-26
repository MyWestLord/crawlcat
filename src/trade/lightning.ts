// Live fills through PumpPortal's Lightning trade API (their server signs with the wallet tied to your API key).
// This file is the only place CrawlCat can move real SOL, and it refuses unless LIVE=1 is set.
import { config } from '../config.ts';

export interface TradeRequest {
  action: 'buy' | 'sell'; mint: string; amount: number | string; denominatedInSol: boolean;
  slippage?: number; priorityFee?: number; pool?: 'pump' | 'auto';
}

export function assertLive(): void {
  if (!config.live) throw new Error('live trading is off. Set LIVE=1 in .env and pass --live, after reading docs/SAFETY.md');
  if (!config.pumpPortalKey) throw new Error('PUMPPORTAL_API_KEY is not set');
}

export async function lightningTrade(req: TradeRequest): Promise<string> {
  assertLive();
  const body = {
    action: req.action, mint: req.mint, amount: req.amount,
    denominatedInSol: String(req.denominatedInSol),
    slippage: req.slippage ?? config.slippagePct,
    priorityFee: req.priorityFee ?? config.priorityFeeSol,
    pool: req.pool ?? 'pump',
  };
  const res = await fetch(`${config.tradeUrl}?api-key=${encodeURIComponent(config.pumpPortalKey)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const out = await res.json() as { signature?: string; errors?: unknown[] };
  if (!res.ok || !out.signature || (out.errors && out.errors.length)) throw new Error(`PumpPortal refused the ${req.action}: ${JSON.stringify(out.errors ?? out)}`);
  return out.signature;
}

/** Sell a % of the bag ("50%") or everything ("100%"). */
export const sellPct = (mint: string, pct: number) => lightningTrade({ action: 'sell', mint, amount: `${pct}%`, denominatedInSol: false });
export const buySol = (mint: string, sol: number) => lightningTrade({ action: 'buy', mint, amount: sol, denominatedInSol: true });
