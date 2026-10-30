// Site-wide quality check on the generated HTML: valid JSON-LD, broken internal links, duplicate
// titles/descriptions, h1 count, title/description length, canonical, banned names. Exits 1 on problems.
// Usage: node tools/check-site.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP = ['node_modules', '.git', 'docs', 'tools', '_source-plugin', '.claude'];
const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    if (SKIP.includes(f)) continue;
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.html')) files.push(p);
  }
})(ROOT);

// Names that must never appear on this site (another brand, and a personal name).
// Built from reversed letters so the words themselves are not written in the source.
const rev = s => s.split('').reverse().join('');
const BANNED = new RegExp([rev('esrevmas'), rev('reemas')].join('|'), 'i');
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const problems = [];
const titles = {}, descs = {};
for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  const h = fs.readFileSync(f, 'utf8');
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { problems.push(`invalid JSON-LD: ${rel}`); }
    if (/aggregateRating|"Review"/.test(m[1])) problems.push(`review/rating schema (not allowed): ${rel}`);
  }
  for (const m of h.replace(/<pre>[\s\S]*?<\/pre>/g, '').matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
    const u = m[1];
    const target = u.endsWith('/') ? path.join(ROOT, u, 'index.html') : path.join(ROOT, u);
    if (!fs.existsSync(target)) problems.push(`broken link ${u} in ${rel}`);
  }
  if (BANNED.test(h)) problems.push(`banned name in ${rel}`);
  if (/\.space\b/i.test(h)) problems.push(`other-site domain in ${rel}`);
  const t = decode((h.match(/<title>(.*?)<\/title>/) || [])[1] || '');
  const d = decode((h.match(/<meta name="description" content="(.*?)"/) || [])[1] || '');
  if (!t) problems.push(`missing title: ${rel}`);
  if (t.length > 60) problems.push(`title ${t.length} chars: ${rel}`);
  if (!d || d.length > 160) problems.push(`description ${d.length} chars: ${rel}`);
  if (rel === '404.html') continue;
  if (!/<link rel="canonical" href="https:\/\/prismworksstudio\.co\.uk\//.test(h)) problems.push(`missing canonical: ${rel}`);
  (titles[t] = titles[t] || []).push(rel);
  if (d) (descs[d] = descs[d] || []).push(rel);
  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) problems.push(`${h1} h1 tags: ${rel}`);
}
for (const f of ['llms.txt', 'blog/feed.xml', 'sitemap.xml', 'robots.txt', 'site.webmanifest']) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { problems.push(`missing ${f}`); continue; }
  if (BANNED.test(fs.readFileSync(p, 'utf8'))) problems.push(`banned name in ${f}`);
}
for (const [t, list] of Object.entries(titles)) if (list.length > 1) problems.push(`duplicate title "${t}": ${list.join(', ')}`);
for (const [d, list] of Object.entries(descs)) if (list.length > 1) problems.push(`duplicate description: ${list.join(', ')}`);

console.log(`${files.length} pages checked, ${problems.length} problems`);
problems.slice(0, 40).forEach(p => console.log(' - ' + p));
process.exit(problems.length ? 1 : 0);
