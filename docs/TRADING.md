# Trading

## Paper (default)

`crawlcat hunt` keeps a paper bag that starts at `PAPER_START_SOL`. Fills assume half of `SLIPPAGE_PCT`. Prices come from the bonding-curve reserves in each trade event (`vSolInBondingCurve / vTokensInBondingCurve`).

Exit rules, checked on every trade tick:

1. **take-profit**: at `TAKE_PROFIT_X`, sell `TAKE_PROFIT_FRACTION` of the bag (once).
2. **trailing stop**: after take-profit, sell the rest if price falls `TRAILING_STOP_PCT` from its peak.
3. **stop-loss**: before take-profit, sell everything if price is down `STOP_LOSS_PCT` from entry.
4. **max hold**: sell everything after `MAX_HOLD_MINUTES`.

## Live

`LIVE=1` + `--live`. Every paper fill is mirrored through PumpPortal's Lightning trade endpoint (`POST https://pumpportal.fun/api/trade?api-key=...`): buys in SOL, sells as a percent of the bag (`"50%"`, `"100%"`). The wallet tied to your PumpPortal key is the one that trades.

Live mode is implemented but not yet battle-tested on mainnet. Start with `BUY_SOL=0.01`.
