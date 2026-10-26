// The crew: six seats around the cat. Each seat is a role, and each role can be filled by any model you like.
// With no keys set, every seat falls back to a small offline brain, so `crawlcat knit` always works.
import { ask, seat, type Seat } from './llm.ts';
import { knownTickers, remember } from './memory.ts';
import { say } from '../log.ts';

export const SEATS = [
  { role: 'scout', who: 'grok bot', job: 'reads X 24/7 and names the narrative' },
  { role: 'researcher', who: 'REA', job: 'checks the ticker is free and not a copycat' },
  { role: 'writer', who: 'opus 5.5', job: 'writes the name and the lore' },
  { role: 'timer', who: 'jev', job: 'decides if now is the moment' },
  { role: 'artist', who: 'dots', job: 'draws the coin' },
  { role: 'memory', who: 'obsidian', job: 'keeps every launch, pounce and rug as a note' },
] as const;

export interface Draft { narrative: string; name: string; ticker: string; lore: string; goNow: boolean; why: string; seats: Record<string, string> }

const pickOne = <T,>(a: T[], seed: number) => a[Math.abs(seed) % a.length];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

/** Offline brain: deterministic, cat-themed, never empty. */
function offlineDraft(theme: string): Omit<Draft, 'seats'> {
  const h = hash(theme || String(Date.now()));
  const words = (theme || pickOne(['cat zoomies', 'knitting at 3am', 'toe beans', 'yarn heist', 'laser dot', 'box season'], h)).toLowerCase().split(/\s+/).filter(Boolean);
  const core = words.map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  let ticker = words.map(w => w.replace(/[^a-z0-9]/g, '')).join('').toUpperCase().slice(0, 7) || 'MEOW';
  const used = knownTickers(); let n = 2; const base = ticker;
  while (used.has(ticker)) ticker = (base.slice(0, 6) + n++).slice(0, 8);
  const lore = pickOne([
    `${core}, knitted by a cat with 8 legs at 3am. it purrs when you hold it.`,
    `a cat wove ${core.toLowerCase()} out of yarn and left it on the web. nobody knows why.`,
    `${core}. no roadmap, no team, one cat and a ball of yarn.`,
  ], h);
  return { narrative: words.join(' '), name: core, ticker, lore, goNow: true, why: 'offline mode: no timer seat configured' };
}

async function tryAsk(s: Seat | null, system: string, user: string): Promise<string | null> {
  if (!s) return null;
  try { return await ask(s, system, user); } catch (e) { say('warn', (e as Error).message); return null; }
}

/** Run the whole crew once and return a launch draft. */
export async function draft(theme = ''): Promise<Draft> {
  const base = offlineDraft(theme);
  const seats: Record<string, string> = {};
  const S = Object.fromEntries(SEATS.map(x => [x.role, seat(x.role, x.who)]));

  const narrative = await tryAsk(S.scout, 'You scan crypto Twitter. Reply with one short memeable narrative (max 6 words) that is spreading right now and fits a cute cat brand. No hashtags, no tickers, no tragedies or politics.', theme || 'what are people joking about in the last 6 hours?');
  if (narrative) base.narrative = narrative.replace(/["#$]/g, '').slice(0, 60);
  seats.scout = narrative ? `narrative: ${base.narrative}` : `offline: ${base.narrative}`;

  const writing = await tryAsk(S.writer, 'You name memecoins for CrawlCat, an orange 8-legged cat that knits coins out of yarn. Reply as JSON {"name": "...", "ticker": "...", "lore": "..."}; ticker 3-8 capital letters; lore under 140 chars, playful, no promises of profit.', `Narrative: ${base.narrative}`);
  if (writing) { try { const j = JSON.parse(writing.slice(writing.indexOf('{'), writing.lastIndexOf('}') + 1)); base.name = String(j.name).slice(0, 32); base.ticker = String(j.ticker).replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8); base.lore = String(j.lore).slice(0, 200); } catch { /* keep offline */ } }
  seats.writer = `${base.name} ($${base.ticker})`;

  const used = knownTickers();
  const research = await tryAsk(S.researcher, 'You check memecoin tickers. Reply "FREE" or "TAKEN: <reason>" for whether this ticker is already a known coin or an obvious copycat of one.', `$${base.ticker}`);
  if (used.has(base.ticker) || (research && research.startsWith('TAKEN'))) { base.ticker = (base.ticker.slice(0, 6) + 'CAT').slice(0, 8); seats.researcher = `renamed to $${base.ticker}`; }
  else seats.researcher = research ? `$${base.ticker}: free` : `$${base.ticker}: not in local memory`;

  const timing = await tryAsk(S.timer, 'Reply "GO" or "WAIT: <reason>" for launching a memecoin on this narrative right now. Be strict: wait if the narrative is stale or crowded.', `${base.narrative} / $${base.ticker}`);
  if (timing) { base.goNow = timing.trim().toUpperCase().startsWith('GO'); base.why = timing.trim(); }
  seats.timer = base.goNow ? 'go' : `wait: ${base.why}`;

  seats.artist = 'yarn-ball coin rendered locally';
  seats.memory = remember('crew', `draft ${base.ticker}`, `narrative: ${base.narrative}\nname: ${base.name}\nticker: $${base.ticker}\nlore: ${base.lore}\ntimer: ${seats.timer}`);
  return { ...base, seats };
}
