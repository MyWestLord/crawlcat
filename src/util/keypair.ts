// Ed25519 keypairs in the Solana format (64-byte secret = 32-byte seed + 32-byte public key),
// generated with node:crypto so CrawlCat needs no third-party packages.
import { generateKeyPairSync, createPrivateKey, createPublicKey } from 'node:crypto';
import { encode, decode } from './base58.ts';

export interface Keypair { publicKey: string; secretKey: Uint8Array }

export function generate(): Keypair {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const seed = Buffer.from(privateKey.export({ format: 'jwk' }).d as string, 'base64url');
  const pub = Buffer.from(publicKey.export({ format: 'jwk' }).x as string, 'base64url');
  const secretKey = new Uint8Array(64);
  secretKey.set(seed, 0); secretKey.set(pub, 32);
  return { publicKey: encode(pub), secretKey };
}

/** Rebuild a keypair from a base58 64-byte secret (the format Phantom and PumpPortal export). */
export function fromSecret(b58: string): Keypair {
  const secretKey = decode(b58);
  if (secretKey.length !== 64) throw new Error('expected a 64-byte secret key');
  const seed = Buffer.from(secretKey.slice(0, 32));
  const jwk = { kty: 'OKP', crv: 'Ed25519', d: seed.toString('base64url'), x: Buffer.from(secretKey.slice(32)).toString('base64url') };
  const pub = createPublicKey(createPrivateKey({ key: jwk, format: 'jwk' })).export({ format: 'jwk' }).x as string;
  return { publicKey: encode(Buffer.from(pub, 'base64url')), secretKey };
}

export const secretToBase58 = (kp: Keypair): string => encode(kp.secretKey);
