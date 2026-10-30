// One-off helper: insert contextual links into existing blog posts (tools/blog-data.js).
// Each entry: [source post slug, anchor text that exists exactly once in that post's body, HTML to insert BEFORE the anchor]
// Safe to re-run: skips an insert if the target link already exists in that post.
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'blog-data.js');

const LINKS = [
  // ['post-slug', '<h2>Exact heading in that post</h2>', '<p>Related: <a href="/services/seo-geo/">SEO and GEO services</a>.</p>\n\n'],
];

let src = fs.readFileSync(FILE, 'utf8');
let added = 0, skipped = 0;
const missing = [];
for (let [slug, anchor, insert] of LINKS) {
  const start = src.indexOf(`slug: '${slug}',`);
  if (start < 0) throw new Error(`Post not found: ${slug}`);
  const bodyStart = src.indexOf('body: `', start);
  const bodyEnd = src.indexOf('`,\n  },', bodyStart);
  let body = src.slice(bodyStart, bodyEnd);
  const target = (insert.match(/href="(\/[^"]+)"/) || [])[1];
  if (target && body.includes(`href="${target}"`)) { skipped++; continue; }
  let count = body.split(anchor).length - 1;
  // Fallback for rewritten posts whose heading is gone: put the link just before the FAQs.
  if (count === 0 && body.split('<h2>FAQs</h2>').length === 2) { anchor = '<h2>FAQs</h2>'; count = 1; }
  // A rewritten post may no longer have the heading; report it instead of failing.
  if (count === 0) { missing.push(`${slug} -> ${target}`); continue; }
  if (count !== 1) throw new Error(`Anchor found ${count} times in ${slug}: ${anchor}`);
  body = body.replace(anchor, insert + anchor);
  src = src.slice(0, bodyStart) + body + src.slice(bodyEnd);
  added++;
}
fs.writeFileSync(FILE, src);
console.log(`contextual links added: ${added}, already present: ${skipped}`);
if (missing.length) console.log('anchor heading gone (link not added):\n  ' + missing.join('\n  '));
