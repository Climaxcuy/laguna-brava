// Screenshot capture for LAGUNA BRAVA via Chrome DevTools Protocol.
// Launches the VM's Chromium with the Hatch WebGL domain policy switches, intercepts every
// request to the local game server with the Fetch domain and fulfils it from Node (plain
// localhost navigation is blocked by Local Network Access policy in this VM), waits for the
// page to raise window.__shotReady, then saves a JPEG screenshot at a chosen quality.
//
// Usage: node capture/capture.mjs <shot-query> <out.jpg> [quality] [settleMs]
//   e.g. node capture/capture.mjs "?shot=chase&seed=7" capture/round1/1-chase.jpg 90
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { get as httpGet } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const PORT_HTTP = 8931;
const PORT_CDP = 9331 + Math.floor(Math.random() * 400);
const CHROME = '/opt/meta-chromium/chrome';

const query = process.argv[2] ?? '?shot=start&seed=1';
const outPath = resolve(process.argv[3] ?? join(here, 'shot.jpg'));
const quality = Number(process.argv[4] ?? 90);
const settleMs = Number(process.argv[5] ?? 0);

const policyPath = join(here, 'webgl-policy.txt');
const policySha = createHash('sha256').update(readFileSync(policyPath)).digest('hex');

const chrome = spawn(CHROME, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1280,960',
  `--remote-debugging-port=${PORT_CDP}`,
  '--remote-debugging-address=127.0.0.1',
  `--user-data-dir=${join(here, 'profile')}`,
  `--hatch-webgl-allowed-domains-file=${policyPath}`,
  `--hatch-webgl-allowed-domains-sha256=${policySha}`,
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', () => {});

function fetchJson(url) {
  return new Promise((res, rej) => {
    httpGet(url, (r) => {
      let body = '';
      r.on('data', (c) => { body += c; });
      r.on('end', () => { try { res(JSON.parse(body)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}

function fetchBytes(url) {
  return new Promise((res, rej) => {
    httpGet(url, (r) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => res({ status: r.statusCode ?? 200, headers: r.headers, body: Buffer.concat(chunks) }));
    }).on('error', rej);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let version = null;
  for (let i = 0; i < 60 && !version; i += 1) {
    try { version = await fetchJson(`http://127.0.0.1:${PORT_CDP}/json/version`); }
    catch { await sleep(500); }
  }
  if (!version) throw new Error('chrome devtools endpoint never came up');

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let nextId = 0;
  const pending = new Map();
  const handlers = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) rej(new Error(JSON.stringify(msg.error)));
      else res(msg.result);
    } else if (msg.method && handlers.has(msg.method)) {
      for (const fn of handlers.get(msg.method)) fn(msg.params, msg.sessionId);
    }
  };
  function send(method, params = {}, sessionId) {
    const id = ++nextId;
    return new Promise((res, rej) => {
      pending.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  function on(method, fn) {
    if (!handlers.has(method)) handlers.set(method, []);
    handlers.get(method).push(fn);
  }

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const S = sessionId;

  const consoleErrors = [];
  on('Runtime.consoleAPICalled', (p) => {
    if (p.type === 'error' || p.type === 'warning') {
      consoleErrors.push(p.args.map((a) => a.value ?? a.description ?? '').join(' '));
    }
  });
  on('Runtime.exceptionThrown', (p) => {
    consoleErrors.push('EXCEPTION: ' + (p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text ?? ''));
  });

  // Fulfil every request to the local server from Node, bypassing the LNA navigation block.
  on('Fetch.requestPaused', async (p) => {
    try {
      const { status, headers, body } = await fetchBytes(p.request.url);
      const responseHeaders = Object.entries(headers)
        .filter(([k]) => ['content-type', 'cache-control'].includes(k.toLowerCase()))
        .map(([name, value]) => ({ name, value: String(value) }));
      await send('Fetch.fulfillRequest', {
        requestId: p.requestId,
        responseCode: status,
        responseHeaders,
        body: body.toString('base64'),
      }, S);
    } catch {
      await send('Fetch.continueRequest', { requestId: p.requestId }, S).catch(() => {});
    }
  });

  await send('Page.enable', {}, S);
  await send('Runtime.enable', {}, S);
  await send('Fetch.enable', { patterns: [{ urlPattern: `http://127.0.0.1:${PORT_HTTP}/*` }] }, S);
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false }, S);

  const url = `http://127.0.0.1:${PORT_HTTP}/${query}`;
  await send('Page.navigate', { url }, S);

  let ready = false;
  let errors = null;
  for (let i = 0; i < 240 && !ready; i += 1) {
    await sleep(500);
    try {
      const r = await send('Runtime.evaluate', {
        expression: 'JSON.stringify({ready: window.__shotReady === true, errors: window.__errors || null, title: document.title})',
        returnByValue: true,
      }, S);
      const state = JSON.parse(r.result.value);
      if (state.errors) errors = state.errors;
      ready = state.ready;
    } catch { /* page still loading */ }
  }
  if (settleMs > 0) await sleep(settleMs);

  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality, captureBeyondViewport: false }, S);
  mkdirSync(dirname(outPath), { recursive: true });
  const bytes = Buffer.from(shot.data, 'base64');
  writeFileSync(outPath, bytes);
  console.log(JSON.stringify({ out: outPath, bytes: bytes.length, ready, pageErrors: errors, consoleErrors: consoleErrors.slice(0, 5) }));
  ws.close();
}

try {
  await main();
} finally {
  chrome.kill('SIGKILL');
}
