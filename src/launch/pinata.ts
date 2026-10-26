// Metadata hosting for launches: image + JSON pinned to IPFS through Pinata.
// (pump.fun's old /api/ipfs upload endpoint is no longer something to rely on.)
import { config } from '../config.ts';

async function pin(path: string, body: FormData | string, json: boolean): Promise<string> {
  if (!config.pinataJwt) throw new Error('PINATA_JWT is not set: get a free JWT at pinata.cloud to host launch metadata');
  const res = await fetch(`https://api.pinata.cloud/pinning/${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${config.pinataJwt}`, ...(json ? { 'content-type': 'application/json' } : {}) },
    body,
  });
  const j = await res.json() as { IpfsHash?: string; error?: unknown };
  if (!res.ok || !j.IpfsHash) throw new Error(`Pinata ${path} failed: ${JSON.stringify(j.error ?? j)}`);
  return j.IpfsHash;
}

export interface TokenMeta { name: string; symbol: string; description: string; twitter?: string; telegram?: string; website?: string }

export async function hostMetadata(meta: TokenMeta, png: Buffer): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([png], { type: 'image/png' }), `${meta.symbol}.png`);
  const img = await pin('pinFileToIPFS', form, false);
  const doc = { ...meta, image: `https://gateway.pinata.cloud/ipfs/${img}`, showName: true, createdOn: 'crawlcat' };
  const json = await pin('pinJSONToIPFS', JSON.stringify({ pinataContent: doc, pinataMetadata: { name: `${meta.symbol}.json` } }), true);
  return `https://gateway.pinata.cloud/ipfs/${json}`;
}
