// A Trail is everything the web felt about one mint since it landed:
// the create, every trade after it, and the numbers the paws read from them.
import type { MintEvent, TradeEvent } from './pumpportal.ts';
import { priceSol } from './pumpportal.ts';

export class Trail {
  readonly mint: MintEvent & { receivedAt: number };
  readonly trades: (TradeEvent & { receivedAt: number })[] = [];
  constructor(mint: MintEvent & { receivedAt: number }) { this.mint = mint; }

  add(t: TradeEvent & { receivedAt: number }): void { this.trades.push(t); }
  get dev(): string { return this.mint.traderPublicKey; }
  get ageSeconds(): number { return (Date.now() - this.mint.receivedAt) / 1000; }
  get lastPrice(): number { const t = this.trades.at(-1) ?? this.mint; return priceSol(t); }
  get marketCapSol(): number { return (this.trades.at(-1) ?? this.mint).marketCapSol; }

  /** Tokens bought by non-dev wallets within `windowMs` of the create, as a % of the 1B pump.fun supply. */
  bundlePct(windowMs = 1500, supply = 1_000_000_000): number {
    const t0 = this.mint.receivedAt;
    const early = this.trades.filter(t => t.txType === 'buy' && t.traderPublicKey !== this.dev && t.receivedAt - t0 <= windowMs);
    return early.reduce((s, t) => s + t.tokenAmount, 0) / supply * 100;
  }

  /** Share of SOL volume coming from wallets that both bought and sold in the window (a wash-trading tell). */
  washPct(): number {
    const sides = new Map<string, Set<string>>();
    for (const t of this.trades) { if (!sides.has(t.traderPublicKey)) sides.set(t.traderPublicKey, new Set()); sides.get(t.traderPublicKey)!.add(t.txType); }
    const vol = (t: TradeEvent) => t.solAmount ?? t.tokenAmount * priceSol(t);
    const total = this.trades.reduce((s, t) => s + vol(t), 0);
    if (total === 0) return 0;
    const wash = this.trades.filter(t => sides.get(t.traderPublicKey)!.size > 1).reduce((s, t) => s + vol(t), 0);
    return wash / total * 100;
  }

  /** How much of the dev's initial buy has already been sold, in %. */
  devSoldPct(): number {
    const bought = (this.mint.initialBuy ?? 0) + this.trades.filter(t => t.traderPublicKey === this.dev && t.txType === 'buy').reduce((s, t) => s + t.tokenAmount, 0);
    if (bought <= 0) return 0;
    const sold = this.trades.filter(t => t.traderPublicKey === this.dev && t.txType === 'sell').reduce((s, t) => s + t.tokenAmount, 0);
    return Math.min(100, sold / bought * 100);
  }
}
