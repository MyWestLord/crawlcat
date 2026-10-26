# The crew

Six seats. Each one reads its config from `CREW_<ROLE>_*`:

| Variable | Meaning |
|---|---|
| `CREW_<ROLE>_API_KEY` | turns the seat on |
| `CREW_<ROLE>_BASE_URL` | e.g. `https://api.x.ai/v1`, `https://openrouter.ai/api/v1` |
| `CREW_<ROLE>_MODEL` | model id at that provider |
| `CREW_<ROLE>_FORMAT` | `openai` (default) or `anthropic` |
| `CREW_<ROLE>_NAME` | display name (defaults: grok bot, REA, opus 5.5, jev, dots, obsidian) |

Roles: `scout`, `researcher`, `writer`, `timer`. The `artist` seat always paints locally and the `memory` seat writes markdown, so neither needs a key.

## Memory

Set `OBSIDIAN_VAULT=/path/to/vault` and every draft, launch, pounce, exit and wrapped rug becomes a note under `CrawlCat/` with front-matter tags, so Obsidian's graph and search just work. Without a vault, notes go to `out/memory/CrawlCat/`.

## Offline brain

With no keys, the crew still works: templates for names and lore, ticker collision checks against memory, and the local artist. It is how `npm test` and the dry run stay deterministic.
