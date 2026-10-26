// What the cat does after the eight paws come back.
import type { Paw } from './checks.ts';

export type Verdict = 'pounce' | 'wrap' | 'watch';
export interface Decision { verdict: Verdict; passed: number; failed: Paw[]; unknown: number; line: string }

/**
 * One failed paw is enough to wrap a coin in yarn.
 * A pounce needs zero fails and at least `minPass` clean paws; anything in between is watched, not bought.
 */
export function decide(paws: Paw[], minPass = 6): Decision {
  const failed = paws.filter(p => p.result === 'fail');
  const passed = paws.filter(p => p.result === 'pass').length;
  const unknown = paws.filter(p => p.result === 'unknown').length;
  if (failed.length) return { verdict: 'wrap', passed, failed, unknown, line: `HISSS. ${failed.map(f => `${f.name}: ${f.detail}`).join('; ')}` };
  if (passed >= minPass) return { verdict: 'pounce', passed, failed, unknown, line: `MRRP. ${passed}/8 clean${unknown ? `, ${unknown} unknown` : ''}` };
  return { verdict: 'watch', passed, failed, unknown, line: `hmm. only ${passed}/8 clean, ${unknown} unknown. watching, not buying` };
}

export function pawCard(paws: Paw[]): string {
  const icon = { pass: '✓', fail: '✕', unknown: '?' } as const;
  return paws.map(p => `  paw ${p.leg}  ${icon[p.result]}  ${p.name.padEnd(12)} ${p.detail}`).join('\n');
}
