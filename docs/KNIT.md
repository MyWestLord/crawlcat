# Knitting a meme

`crawlcat knit [theme]` runs the crew once, then the cat knits the coin.

1. **scout** (grok bot) names a narrative, or uses your theme.
2. **writer** (opus 5.5) returns `{ name, ticker, lore }`.
3. **researcher** (REA) checks the ticker against its own knowledge and the local memory; a clash gets renamed.
4. **timer** (jev) answers GO or WAIT. A WAIT stops a live launch.
5. **artist** (dots) paints `coin.png` locally with `src/launch/png.ts`. No image model needed.
6. **memory** (obsidian) writes a note for the draft.

Output, every time: `out/launches/<TICKER>/coin.png` and `metadata.json`.

## Going live

Requirements: `LIVE=1`, `PUMPPORTAL_API_KEY`, `PINATA_JWT`, and the `--live` flag.

```bash
node src/cli.ts knit --name "Meow Coin" --ticker MEOW --lore "knitted at 3am" \
  --twitter https://x.com/... --live --dev-buy 0.5
```

What happens:

1. `coin.png` and the metadata JSON are pinned to IPFS through Pinata.
2. A fresh mint keypair is generated with `node:crypto`.
3. CrawlCat posts PumpPortal's `create` action:

```json
{
  "action": "create",
  "tokenMetadata": { "name": "Meow Coin", "symbol": "MEOW", "uri": "https://gateway.pinata.cloud/ipfs/..." },
  "mint": "<base58 64-byte mint secret>",
  "denominatedInSol": "true",
  "amount": 0.5,
  "slippage": 15,
  "priorityFee": 0.0005,
  "pool": "pump"
}
```

4. `launch.json` is saved with the mint and signature, and a note goes to memory.

> ⚠️ PumpPortal changes its API from time to time. Read their current token-creation docs before your first live launch, and do it with a small dev buy.
