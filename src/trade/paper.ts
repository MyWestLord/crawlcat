// The paper bag: positions, exits and PnL, with no real SOL anywhere.
// The same exit rules drive live mode, which only swaps the "fill" step.
import { config } from '../config.ts';

export interface Position {
  mint: string; symbol: string; entryPrice: number; tokens: number; costSol: number;
  peakPrice: number; openedAt: number; tookProfit: boolean; realizedSol: number;
}
export type ExitReason = 'take-profit' | 'trailing-stop' | 'stop-loss' | 'max-hold';
export interface Fill { side: 'buy' | 'sell'; mint: string; symbol: string; sol: number; tokens: number; price: number; reason?: ExitReason; at: number }

export class PaperBag {
  cash: number;
  readonly open = new Map<string, Position>();
  readonly fills: Fill[] = [];
  private rules: typeof config;
  constructor(startSol = config.paperStartSol, rules = config) { this.cash = startSol; this.rules = rules; }

  buy(mint: string, symbol: string, price: number, sol = this.rules.buySol, now = Date.now()): Fill | null {
    if (this.open.has(mint) || this.open.size >= this.rules.maxOpenPositions || sol > this.cash || price <= 0) return null;
    const fillPrice = price * (1 + this.rules.slippagePct / 200); // assume half the allowed slippage
    const tokens = sol / fillPrice;
    this.cash -= sol;
    this.open.set(mint, { mint, symbol, entryPrice: fillPrice, tokens, costSol: sol, peakPrice: fillPrice, openedAt: now, tookProfit: false, realizedSol: 0 });
    const f: Fill = { side: 'buy', mint, symbol, sol, tokens, price: fillPrice, at: now };
    this.fills.push(f); return f;
  }

  /** Feed a new price; returns any exit fills the rules triggered. */
  mark(mint: string, price: number, now = Date.now()): Fill[] {
    const p = this.open.get(mint); if (!p || price <= 0) return [];
    p.peakPrice = Math.max(p.peakPrice, price);
    const out: Fill[] = [];
    const x = price / p.entryPrice;
    if (!p.tookProfit && x >= this.rules.takeProfitX) { out.push(this.sell(p, this.rules.takeProfitFraction, price, 'take-profit', now)); p.tookProfit = true; }
    const drawdown = (1 - price / p.peakPrice) * 100;
    if (p.tookProfit && drawdown >= this.rules.trailingStopPct) out.push(this.sell(p, 1, price, 'trailing-stop', now));
    else if (!p.tookProfit && (1 - x) * 100 >= this.rules.stopLossPct) out.push(this.sell(p, 1, price, 'stop-loss', now));
    else if ((now - p.openedAt) / 60000 >= this.rules.maxHoldMinutes) out.push(this.sell(p, 1, price, 'max-hold', now));
    return out;
  }

  private sell(p: Position, fraction: number, price: number, reason: ExitReason, now: number): Fill {
    const tokens = p.tokens * fraction, sol = tokens * price * (1 - this.rules.slippagePct / 200);
    p.tokens -= tokens; p.realizedSol += sol; this.cash += sol;
    if (fraction >= 1 || p.tokens <= 1e-9) this.open.delete(p.mint);
    const f: Fill = { side: 'sell', mint: p.mint, symbol: p.symbol, sol, tokens, price, reason, at: now };
    this.fills.push(f); return f;
  }

  value(prices: Map<string, number>): number {
    let v = this.cash; for (const p of this.open.values()) v += p.tokens * (prices.get(p.mint) ?? p.entryPrice); return v;
  }
}
