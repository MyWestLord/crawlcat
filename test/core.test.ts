import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encode, decode, isAddress } from '../src/util/base58.ts';
import { generate, fromSecret, secretToBase58 } from '../src/util/keypair.ts';
import { Trail } from '../src/feed/trail.ts';
import { decide } from '../src/paws/verdict.ts';
import type { Paw } from '../src/paws/checks.ts';
import { PaperBag } from '../src/trade/paper.ts';
import { config } from '../src/config.ts';
import { yarnCoin, crc32 } from '../src/launch/png.ts';

test('base58 round-trips and keeps leading zeros', () => {
  const b = new Uint8Array([0, 0, 1, 2, 255, 128, 7]);
  assert.deepEqual(decode(encode(b)), b);
  assert.equal(encode(new Uint8Array([0, 0, 0])), '111');
  assert.equal(encode(new TextEncoder().encode('hello world')), 'StV1DL6CwTryKyV');
});

test('isAddress accepts a real mint and rejects junk', () => {
  assert.ok(isAddress('So11111111111111111111111111111111111111112'));
  assert.ok(!isAddress('not-a-mint'));
  assert.ok(!isAddress('0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl'));
});

test('keypairs are 64-byte Solana secrets that rebuild the same public key', () => {
  const kp = generate();
  assert.equal(kp.secretKey.length, 64);
  assert.ok(isAddress(kp.publicKey));
  assert.equal(fromSecret(secretToBase58(kp)).publicKey, kp.publicKey);
});

const mintEvt = (over = {}) => ({ signature: 's', mint: 'M', traderPublicKey: 'DEV', txType: 'create' as const, initialBuy: 50_000_000, vTokensInBondingCurve: 1_000_000_000, vSolInBondingCurve: 30, marketCapSol: 30, receivedAt: 1_000, ...over });
const trade = (who: string, side: 'buy' | 'sell', tokens: number, sol: number, at: number) => ({ signature: 'x', mint: 'M', traderPublicKey: who, txType: side, tokenAmount: tokens, solAmount: sol, vTokensInBondingCurve: 1e9, vSolInBondingCurve: 30, marketCapSol: 30, receivedAt: at });

test('trail measures early bundles, wash volume and dev selling', () => {
  const t = new Trail(mintEvt());
  t.add(trade('A', 'buy', 150_000_000, 3, 1_400));   // inside 1.5s window → bundle
  t.add(trade('B', 'buy', 100_000_000, 2, 2_700));   // outside the window
  t.add(trade('A', 'sell', 150_000_000, 3, 3_000));  // A traded both sides → wash
  t.add(trade('DEV', 'sell', 25_000_000, 1, 4_000));
  assert.equal(t.bundlePct().toFixed(1), '15.0');
  assert.equal(t.washPct().toFixed(1), (6 / 9 * 100).toFixed(1));
  assert.equal(t.devSoldPct(), 50);
});

const paws = (results: Paw['result'][]): Paw[] => results.map((r, i) => ({ leg: i + 1, name: 'p', result: r, detail: '' }));

test('one failed paw wraps the coin', () => {
  assert.equal(decide(paws(['pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'fail'])).verdict, 'wrap');
});
test('six clean paws and no fails is a pounce', () => {
  assert.equal(decide(paws(['pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'unknown', 'unknown'])).verdict, 'pounce');
});
test('too many unknowns means watch, not buy', () => {
  assert.equal(decide(paws(['pass', 'pass', 'pass', 'unknown', 'unknown', 'unknown', 'unknown', 'pass'])).verdict, 'watch');
});

test('paper bag takes half at 2x, then trails the rest', () => {
  const rules = { ...config, slippagePct: 0, buySol: 1, takeProfitX: 2, takeProfitFraction: .5, trailingStopPct: 25, stopLossPct: 35, maxHoldMinutes: 99, maxOpenPositions: 5 };
  const bag = new PaperBag(10, rules);
  assert.ok(bag.buy('M', 'CAT', 1, 1, 0));
  assert.deepEqual(bag.mark('M', 1.5, 1), []);
  const tp = bag.mark('M', 2, 2);
  assert.equal(tp[0].reason, 'take-profit'); assert.equal(tp[0].sol, 1);
  bag.mark('M', 4, 3);                                   // new peak
  const trail = bag.mark('M', 2.9, 4);                   // −27.5% from peak
  assert.equal(trail[0].reason, 'trailing-stop');
  assert.equal(bag.open.size, 0);
  assert.ok(Math.abs(bag.cash - (9 + 1 + 1.45)) < 1e-9);
});

test('paper bag stops out a loser', () => {
  const bag = new PaperBag(10, { ...config, slippagePct: 0, stopLossPct: 35 });
  bag.buy('M', 'CAT', 1, 1, 0);
  assert.equal(bag.mark('M', .6, 1)[0].reason, 'stop-loss');
});

test('the artist paints a valid PNG', () => {
  const png = yarnCoin('MEOW', 64);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(crc32(Buffer.from('IEND')), 0xae426082);
});
