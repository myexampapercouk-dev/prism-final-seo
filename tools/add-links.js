// Helper: insert contextual internal links into existing posts (tools/posts/<slug>.js).
// Each entry: [post slug, text that exists exactly once in that post's body, HTML to insert BEFORE it].
// Safe to re-run: skips an insert if the post already links to the target URL.
// Usage: add entries to LINKS, then  node tools/add-links.js && node tools/build-pages.js && node tools/check-site.js
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'posts');

const LINKS = [
  // ['shopify-vs-woocommerce-uk', '<h2>Switching later</h2>', '<p>Planning ads too? See <a href="/blog/google-shopping-ads-guide-uk/">Google Shopping ads for UK retailers</a>.</p>\n\n'],
];

let added = 0;
for (const [slug, anchor, html] of LINKS) {
  const file = path.join(DIR, slug + '.js');
  if (!fs.existsSync(file)) { console.log(`skip ${slug}: no such post`); continue; }
  let src = fs.readFileSync(file, 'utf8');
  const href = (html.match(/href="([^"]+)"/) || [])[1];
  if (href && src.includes(`href="${href}"`)) { console.log(`skip ${slug}: already links ${href}`); continue; }
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.log(`skip ${slug}: anchor found ${n} times`); continue; }
  src = src.replace(anchor, html + anchor);
  fs.writeFileSync(file, src);
  added++;
  console.log(`linked ${slug} -> ${href}`);
}
console.log(`${added} links added`);
