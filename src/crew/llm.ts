// One small client for every crew member. Two wire formats cover almost every provider:
// OpenAI-compatible chat completions (xAI, OpenRouter, most hosts) and Anthropic Messages.
export interface Seat { name: string; format: 'openai' | 'anthropic'; baseUrl: string; model: string; apiKey: string }

export function seat(role: string, fallbackName: string): Seat | null {
  const k = (s: string) => process.env[`CREW_${role.toUpperCase()}_${s}`] ?? '';
  if (!k('API_KEY')) return null;
  return { name: k('NAME') || fallbackName, format: (k('FORMAT') || 'openai') as Seat['format'], baseUrl: k('BASE_URL'), model: k('MODEL'), apiKey: k('API_KEY') };
}

export async function ask(s: Seat, system: string, user: string, maxTokens = 400): Promise<string> {
  if (s.format === 'anthropic') {
    const res = await fetch(`${s.baseUrl || 'https://api.anthropic.com'}/v1/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': s.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: s.model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    });
    const j = await res.json() as { content?: { text?: string }[]; error?: { message: string } };
    if (!res.ok) throw new Error(`${s.name}: ${j.error?.message ?? res.status}`);
    return (j.content ?? []).map(c => c.text ?? '').join('').trim();
  }
  const res = await fetch(`${s.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${s.apiKey}` },
    body: JSON.stringify({ model: s.model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  const j = await res.json() as { choices?: { message: { content: string } }[]; error?: { message: string } };
  if (!res.ok) throw new Error(`${s.name}: ${j.error?.message ?? res.status}`);
  return (j.choices?.[0]?.message.content ?? '').trim();
}
