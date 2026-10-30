// Tells Bing, Yandex and other IndexNow search engines about every URL in sitemap.xml.
// Run AFTER deploying, once prismworksstudio.co.uk serves this static site:   node tools/indexnow.js
// Only some pages changed? Pass their paths:   node tools/indexnow.js /blog/some-post/ /services/
// The key file /3d99bd719c262e752782d45c687f20f5.txt (project root) must be reachable on the live site.
const fs = require('fs');
const path = require('path');

const HOST = 'prismworksstudio.co.uk';
const KEY = '3d99bd719c262e752782d45c687f20f5';
const sitemap = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
const args = process.argv.slice(2);
const urlList = args.length
  ? args.map(p => `https://${HOST}${p.startsWith('/') ? p : '/' + p}`)
  : [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);

(async () => {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
  });
  console.log(`Submitted ${urlList.length} URLs -> HTTP ${res.status}`, res.status === 200 || res.status === 202 ? '(accepted)' : await res.text());
})();
