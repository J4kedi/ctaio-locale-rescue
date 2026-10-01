#!/usr/bin/env node
// ctaio-audit.mjs: checks that every hreflang/canonical target on a page resolves,
// and flags placeholder links (href="#") and images without alt.
// Usage: node ctaio-audit.mjs https://ctaio.dev/en/   (Node 18+, no dependencies)
// Exit 1 on a broken target or placeholder link, so it can gate a deploy.
// ponytail: regex over HTML is enough for <link>/<a>/<img> attributes; use a DOM parser if markup gets exotic.
import assert from 'node:assert/strict';

const attrs = (tag) => Object.fromEntries(
  [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map((m) => [m[1].toLowerCase(), m[2] ?? m[3] ?? m[4]]));

export function scan(html, base) {
  const targets = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0]))
    .filter((a) => a.href && (a.hreflang || (a.rel || '').toLowerCase() === 'canonical'))
    .map((a) => ({ label: a.hreflang ? `hreflang ${a.hreflang}` : 'canonical', url: new URL(a.href, base).href }));
  const placeholders = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .filter((m) => attrs(m[1]).href === '#')
    .map((m) => m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '(no text)');
  const imgsWithoutAlt = [...html.matchAll(/<img\b[^>]*>/gi)].filter((m) => !('alt' in attrs(m[0]))).length;
  return { targets, placeholders, imgsWithoutAlt };
}

if (process.argv[2] === '--self-test') {
  const r = scan(`<link rel="alternate" hreflang="fr" href="/fr/"><link href='/x' rel=canonical>
    <a class=b href="#"><span>Spotify</span></a><a href="/ok">ok</a><img src=a.png><img alt="" src=b.png>`, 'https://e.com/en/');
  assert.deepEqual(r.targets, [{ label: 'hreflang fr', url: 'https://e.com/fr/' }, { label: 'canonical', url: 'https://e.com/x' }]);
  assert.deepEqual(r.placeholders, ['Spotify']);
  assert.equal(r.imgsWithoutAlt, 1);
  console.log('self-test ok');
  process.exit(0);
}

const page = process.argv[2] || 'https://ctaio.dev/en/';
const res = await fetch(page);
console.log(`${page} -> ${res.status}`);
if (!res.ok) { console.log('The page itself did not load; fix that (or the bot filter) before trusting the rest.'); process.exit(2); }
const { targets, placeholders, imgsWithoutAlt } = scan(await res.text(), res.url);

let broken = 0;
for (const t of targets) {
  let s;
  try { const r = await fetch(t.url); s = `${r.status}${r.url !== t.url ? ` (redirected to ${new URL(r.url).pathname})` : ''}`; if (!r.ok) broken++; }
  catch (e) { s = `ERR ${e.cause?.code || e.message}`; broken++; }
  console.log(`${s.startsWith('2') ? 'ok  ' : 'FAIL'}  ${t.label.padEnd(16)} ${t.url}  ${s}`);
}
for (const p of placeholders) console.log(`FAIL  link href="#"      "${p}"`);
console.log(`warn  images without alt: ${imgsWithoutAlt}`);
console.log(`${broken} broken target(s), ${placeholders.length} placeholder link(s)`);
process.exitCode = broken || placeholders.length ? 1 : 0;
