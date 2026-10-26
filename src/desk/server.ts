// `crawlcat desk`: serves the Yarn Desk terminal on localhost.
// The desk ships with a scripted demo session (the one in the video); the CLI hunt prints the real thing.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { say } from '../log.ts';

export function serveDesk(port = 8808): void {
  const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web', 'desk.html'));
  createServer((req, res) => {
    if (req.url === '/' || req.url?.startsWith('/?')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); return; }
    res.writeHead(404); res.end('meow? (404)');
  }).listen(port, () => say('meow', `yarn desk open on http://localhost:${port}`));
}
