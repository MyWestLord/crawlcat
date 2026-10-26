// A tiny, colorful logger. Every line is something the cat did.
const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code: number) => (s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
export const color = { pink: c(95), green: c(92), red: c(91), yellow: c(93), blue: c(94), dim: c(2), bold: c(1) };

const stamp = () => new Date().toTimeString().slice(0, 8);
type Tag = 'meow' | 'sniff' | 'pounce' | 'hiss' | 'boop' | 'knit' | 'crew' | 'feed' | 'warn';
const TAG: Record<Tag, (s: string) => string> = {
  meow: color.pink, sniff: color.yellow, pounce: color.green, hiss: color.red,
  boop: color.pink, knit: color.yellow, crew: color.blue, feed: color.dim, warn: color.red,
};

export function say(tag: Tag, msg: string): void {
  if (process.env.CRAWLCAT_QUIET) return;
  console.log(`${color.dim(stamp())} ${TAG[tag](tag.toUpperCase().padEnd(6))} ${msg}`);
}
