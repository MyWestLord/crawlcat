# Safety

CrawlCat can spend real SOL. Read this before turning that on.

1. **Paper first.** Run `hunt` in paper mode long enough to see how the paws and exits behave on real flow.
2. **Two locks.** Real money needs `LIVE=1` in `.env` *and* `--live` on the command line. `src/trade/lightning.ts` is the only code path that moves SOL, and it checks both.
3. **Burner wallet.** The PumpPortal Lightning key controls a wallet. Fund it with an amount you can lose today. Never reuse your main wallet.
4. **Keys stay local.** `.env` is git-ignored. Don't paste keys into issues, screenshots or the desk.
5. **The paws are a filter, not a guarantee.** They catch unrevoked authorities, heavy early bundles, concentrated holders, wash volume and dumping devs. They can't catch everything, and most memecoins go to zero anyway.
6. **Launching is publishing.** A coin you launch is public and permanent. Don't launch names that impersonate real people, brands or projects, and don't promise returns in the lore.
7. **Not financial advice.** This is open-source software, provided as is (MIT).
