// Everything CrawlCat reads from the environment lives here, with safe defaults.
// Paper mode is the default. Nothing touches real SOL unless LIVE=1 *and* --live is passed.
import { existsSync, readFileSync } from 'node:fs';

function loadDotEnv(path = '.env'): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const v = m[2].replace(/^["']|["']$/g, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
loadDotEnv();

const num = (k: string, d: number) => (process.env[k] !== undefined && process.env[k] !== '' ? Number(process.env[k]) : d);
const str = (k: string, d = '') => process.env[k] ?? d;

export const config = {
  rpcUrl: str('SOLANA_RPC_URL', 'https://api.mainnet-beta.solana.com'),
  feedUrl: str('PUMPPORTAL_WS', 'wss://pumpportal.fun/api/data'),
  tradeUrl: str('PUMPPORTAL_TRADE_URL', 'https://pumpportal.fun/api/trade'),
  pumpPortalKey: str('PUMPPORTAL_API_KEY'),
  live: str('LIVE') === '1',

  // paws (safety thresholds)
  settleSeconds: num('SETTLE_SECONDS', 8),
  maxTop10Pct: num('MAX_TOP10_PCT', 30),
  maxBundlePct: num('MAX_BUNDLE_PCT', 20),
  maxWashPct: num('MAX_WASH_PCT', 50),
  maxDevSoldPct: num('MAX_DEV_SOLD_PCT', 20),

  // trading
  buySol: num('BUY_SOL', 0.1),
  slippagePct: num('SLIPPAGE_PCT', 15),
  priorityFeeSol: num('PRIORITY_FEE_SOL', 0.0005),
  takeProfitX: num('TAKE_PROFIT_X', 2),
  takeProfitFraction: num('TAKE_PROFIT_FRACTION', 0.5),
  trailingStopPct: num('TRAILING_STOP_PCT', 25),
  stopLossPct: num('STOP_LOSS_PCT', 35),
  maxHoldMinutes: num('MAX_HOLD_MINUTES', 15),
  maxOpenPositions: num('MAX_OPEN_POSITIONS', 5),
  paperStartSol: num('PAPER_START_SOL', 10),

  // launch
  pinataJwt: str('PINATA_JWT'),
  devBuySol: num('DEV_BUY_SOL', 0.5),
  outDir: str('CRAWLCAT_OUT', 'out'),

  // crew + memory
  obsidianVault: str('OBSIDIAN_VAULT'),
};
export type Config = typeof config;
