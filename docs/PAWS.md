# The eight paws

Every mint that lands on the web gets tapped by all eight paws after `SETTLE_SECONDS` (8 by default), so there is some trading to read. Each paw returns `pass`, `fail` or `unknown`. Network errors become `unknown`, never `pass`.

| # | Paw | Pass | Fail | Unknown |
|---|---|---|---|---|
| 1 | mint auth | `mintAuthority` is `null` | an address can still mint | mint account unreadable |
| 2 | freeze auth | `freezeAuthority` is `null` | an address can freeze holders | mint account unreadable |
| 3 | liquidity | pool is `pump` (liquidity sits in the bonding-curve program) | — | migrated pool: confirm the LP burn on the AMM yourself |
| 4 | bundles | non-dev buys in the first 1.5 s ≤ `MAX_BUNDLE_PCT` of the 1B supply | above it | mint wasn't seen landing |
| 5 | top 10 | 10 largest holders (bonding-curve account excluded) ≤ `MAX_TOP10_PCT` | above it | RPC error |
| 6 | socials | metadata has an `http` link for X, Telegram or a site | none at all | no metadata URI / fetch timed out |
| 7 | wash volume | share of SOL volume from wallets that bought *and* sold ≤ `MAX_WASH_PCT` | above it | fewer than 5 trades |
| 8 | dev wallet | the creator sold ≤ `MAX_DEV_SOLD_PCT` of what they bought | above it | creator unknown |

## Verdicts

- **wrap**: one or more fails. Logged to memory under `Rugs/`, unwatched, never bought.
- **pounce**: zero fails and ≥ 6 passes.
- **watch**: zero fails but < 6 passes. Logged, not bought.

## Honest limits

- "Bundles" is measured by arrival time on the stream, not by slot. It catches the classic block-0 snipe pattern but is an approximation.
- Wash volume is a heuristic. Market makers and bots also trade both sides.
- A coin that passes all eight can still dump. The paws remove the obvious traps, not the risk.
- `crawlcat scan <mint>` on an older token can only run paws 1, 2, 3, 5 and 6 (the rest need launch-time data).
