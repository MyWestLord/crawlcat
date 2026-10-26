// The yarn web: a live line into pump.fun through PumpPortal's public data socket.
// Every new mint "lands on a thread"; trades on mints we care about shake the web.
import { config } from '../config.ts';
import { say } from '../log.ts';

export interface MintEvent {
  signature: string; mint: string; traderPublicKey: string; txType: 'create';
  initialBuy?: number; solAmount?: number; bondingCurveKey?: string;
  vTokensInBondingCurve: number; vSolInBondingCurve: number; marketCapSol: number;
  name?: string; symbol?: string; uri?: string; pool?: string;
}
export interface TradeEvent {
  signature: string; mint: string; traderPublicKey: string; txType: 'buy' | 'sell';
  tokenAmount: number; solAmount?: number; newTokenBalance?: number; bondingCurveKey?: string;
  vTokensInBondingCurve: number; vSolInBondingCurve: number; marketCapSol: number; pool?: string;
}
export type FeedEvent = (MintEvent | TradeEvent) & { receivedAt: number };

export interface Web {
  onMint(fn: (e: MintEvent & { receivedAt: number }) => void): void;
  onTrade(fn: (e: TradeEvent & { receivedAt: number }) => void): void;
  watch(mints: string[]): void;
  unwatch(mints: string[]): void;
  close(): void;
}

/** Price of one token in SOL from the bonding-curve reserves in an event. */
export const priceSol = (e: { vSolInBondingCurve: number; vTokensInBondingCurve: number }) =>
  e.vTokensInBondingCurve > 0 ? e.vSolInBondingCurve / e.vTokensInBondingCurve : 0;

export function spinWeb(url = config.feedUrl): Web {
  const mintFns: ((e: any) => void)[] = [], tradeFns: ((e: any) => void)[] = [];
  const watched = new Set<string>();
  let ws: WebSocket | null = null, closed = false, backoff = 500;

  const send = (o: unknown) => { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(o)); };
  const connect = () => {
    ws = new WebSocket(url);
    ws.addEventListener('open', () => {
      backoff = 500;
      say('feed', `web spun on ${url}`);
      send({ method: 'subscribeNewToken' });
      if (watched.size) send({ method: 'subscribeTokenTrade', keys: [...watched] });
    });
    ws.addEventListener('message', m => {
      let e: any; try { e = JSON.parse(String(m.data)); } catch { return; }
      if (!e || !e.mint || !e.txType) return; // subscription acks and pings
      e.receivedAt = Date.now();
      (e.txType === 'create' ? mintFns : tradeFns).forEach(f => f(e));
    });
    ws.addEventListener('close', () => {
      if (closed) return;
      say('warn', `web snapped, re-spinning in ${backoff}ms`);
      setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 15000);
    });
    ws.addEventListener('error', () => ws?.close());
  };
  connect();

  return {
    onMint: f => mintFns.push(f),
    onTrade: f => tradeFns.push(f),
    watch: m => { const fresh = m.filter(x => !watched.has(x)); fresh.forEach(x => watched.add(x)); if (fresh.length) send({ method: 'subscribeTokenTrade', keys: fresh }); },
    unwatch: m => { m.forEach(x => watched.delete(x)); if (m.length) send({ method: 'unsubscribeTokenTrade', keys: m }); },
    close: () => { closed = true; ws?.close(); },
  };
}
