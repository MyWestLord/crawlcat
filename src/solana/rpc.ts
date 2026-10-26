// A bare JSON-RPC client for the handful of Solana calls the paws need.
import { config } from '../config.ts';

let id = 0;
export async function rpc<T>(method: string, params: unknown[], url = config.rpcUrl): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }) });
    if (res.status === 429) { await new Promise(r => setTimeout(r, 400 * 2 ** attempt)); continue; }
    const body = await res.json() as { result?: T; error?: { message: string } };
    if (body.error) throw new Error(`${method}: ${body.error.message}`);
    return body.result as T;
  }
  throw new Error(`${method}: rate limited by the RPC, try a private endpoint (SOLANA_RPC_URL)`);
}

export interface ParsedMint { mintAuthority: string | null; freezeAuthority: string | null; supply: string; decimals: number }
export async function getMint(mint: string): Promise<ParsedMint | null> {
  const r = await rpc<{ value: { data: { parsed?: { info: ParsedMint } } } | null }>('getAccountInfo', [mint, { encoding: 'jsonParsed' }]);
  return r.value?.data.parsed?.info ?? null;
}

export interface Holder { address: string; owner: string; uiAmount: number }
export async function getLargestHolders(mint: string): Promise<Holder[]> {
  const r = await rpc<{ value: { address: string; uiAmount: number }[] }>('getTokenLargestAccounts', [mint]);
  const accounts = r.value.slice(0, 20);
  if (!accounts.length) return [];
  const infos = await rpc<{ value: ({ data: { parsed?: { info: { owner: string } } } } | null)[] }>('getMultipleAccounts', [accounts.map(a => a.address), { encoding: 'jsonParsed' }]);
  return accounts.map((a, i) => ({ address: a.address, owner: infos.value[i]?.data.parsed?.info.owner ?? '?', uiAmount: a.uiAmount ?? 0 }));
}

export async function getSupply(mint: string): Promise<number> {
  const r = await rpc<{ value: { uiAmount: number } }>('getTokenSupply', [mint]);
  return r.value.uiAmount;
}
