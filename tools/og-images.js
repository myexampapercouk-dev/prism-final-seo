// Generates a branded 1200x630 social sharing image for every page and post into /assets/og/,
// plus the default /assets/og-image.png. Brand: near-black background, lime accent (#b3ff3a).
// Setup once:  cd tools && npm install
// Run:         node tools/og-images.js   (then node tools/build-pages.js)
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'og');
fs.mkdirSync(OUT, { recursive: true });
const PAGES = require('./pages-data');
const POSTS = require('./blog-data');

const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = s => String(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&rsquo;/g, '’').replace(/&ndash;/g, '–').replace(/&pound;/g, '£');
const wrap = (text, max) => {
  const lines = []; let line = '';
  for (const w of text.split(/\s+/)) {
    if ((line + ' ' + w).trim().length > max) { lines.push(line.trim()); line = w; } else line += ' ' + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.slice(0, 4);
};

function svg(label, title) {
  const lines = wrap(plain(title), 26);
  const size = lines.length > 3 ? 58 : 66;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#080b0f"/>
<polygon points="930,90 1140,520 720,520" fill="none" stroke="#b3ff3a" stroke-width="4" opacity="0.9"/>
<polygon points="930,170 1070,470 790,470" fill="#b3ff3a" opacity="0.10"/>
<rect x="80" y="96" width="44" height="4" fill="#b3ff3a"/>
<text x="140" y="104" font-family="Montserrat, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="5" fill="#b3ff3a">${xml(label.toUpperCase())}</text>
${lines.map((l, i) => `<text x="80" y="${200 + i * (size + 14)}" font-family="Montserrat, Arial, sans-serif" font-size="${size}" font-weight="700" fill="#ffffff">${xml(l)}</text>`).join('\n')}
<text x="80" y="560" font-family="Montserrat, Arial, sans-serif" font-size="28" font-weight="600" fill="#ffffff">Prism Works Studio</text>
<text x="80" y="596" font-family="Arial, sans-serif" font-size="22" fill="#ffffffb3">prismworksstudio.co.uk</text>
</svg>`;
}

const jobs = [
  ['../og-image', 'Digital marketing &amp; ecommerce', 'Strategic Growth Powered by Prism Works Studio'],
  ['home', 'Digital marketing &amp; ecommerce', 'Strategic Growth Powered by Prism Works Studio'],
  ['about-us', 'About us', 'The Digital Agency Built to Grow Your Business'],
  ['services', 'Services', 'SEO, Paid Media, Digital PR, Websites &amp; Brand'],
  ['sectors', 'Sectors', 'Deep Sector Knowledge. Measurable Digital Results.'],
  ['contact', 'Contact', 'Book a Free 30-Minute Discovery Call'],
  ['blog', 'Blog', 'Digital Marketing &amp; Ecommerce Guides for UK Businesses'],
  ...PAGES.map(p => [p.path.replace(/^\/|\/$/g, '').replace(/\//g, '-'), p.type === 'pricing' ? 'Pricing' : p.type === 'sector' ? 'Sector' : 'Service', p.h1]),
  ...POSTS.map(p => ['blog-' + p.slug, p.category, p.title]),
];

(async () => {
  for (const [name, label, title] of jobs) {
    await sharp(Buffer.from(svg(plain(label), title))).png({ compressionLevel: 9 }).toFile(path.join(OUT, name + '.png'));
  }
  console.log(`${jobs.length} images written to assets/og/ (+ assets/og-image.png)`);
})();
