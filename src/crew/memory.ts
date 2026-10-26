// The cat's memory: plain markdown notes in an Obsidian vault (or ./out/memory if no vault is set).
// Every launch, pounce and wrapped rug becomes a note you can search, link and graph.
import { mkdirSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.ts';

const FOLDERS = { launch: 'Launches', trade: 'Trades', rug: 'Rugs', crew: 'Crew' } as const;
export type NoteKind = keyof typeof FOLDERS;

export const vaultRoot = () => join(config.obsidianVault || join(config.outDir, 'memory'), 'CrawlCat');

export function remember(kind: NoteKind, title: string, body: string, tags: string[] = []): string {
  const dir = join(vaultRoot(), FOLDERS[kind]);
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString();
  const file = join(dir, `${stamp.slice(0, 19).replace(/[:T]/g, '-')} ${title.replace(/[\\/:*?"<>|]/g, '')}.md`);
  const fm = ['---', `kind: ${kind}`, `at: ${stamp}`, `tags: [crawlcat, ${kind}${tags.length ? ', ' + tags.join(', ') : ''}]`, '---', ''].join('\n');
  writeFileSync(file, `${fm}# ${title}\n\n${body}\n`);
  return file;
}

/** Every ticker the cat already launched or wrapped, so the researcher never repeats one. */
export function knownTickers(): Set<string> {
  const out = new Set<string>();
  for (const f of ['Launches', 'Rugs']) {
    const dir = join(vaultRoot(), f); if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) { const m = name.match(/ ([A-Z0-9]{2,12}) /); if (m) out.add(m[1]); }
  }
  return out;
}
