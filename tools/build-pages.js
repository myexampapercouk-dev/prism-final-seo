// Static site generator for prismworksstudio.co.uk (Hostinger, auto-deployed from GitHub).
// Usage (from the project folder):  node tools/build-pages.js   then   node tools/check-site.js
// Inputs:
//   tools/core/*.html      section HTML for the core pages (home, about-us, services, sectors, contact, 404) + header/footer
//   tools/pages-data.js    service, sector and pricing pages
//   tools/blog-data.js     blog posts; tools/blog-summaries.js their key takeaways
// Outputs: index.html, <slug>/index.html, 404.html, blog/, sitemap.xml, robots.txt, llms.txt, blog/feed.xml, site.webmanifest
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CORE = path.join(__dirname, 'core');
const SITE = {
  name: 'Prism Works Studio',
  url: 'https://prismworksstudio.co.uk',
  email: 'contact@prismworks.studio',
  phone: '+44 7506 909018',
  phoneHref: '+447506909018',
  // WhatsApp number (country code, digits only) for the floating chat button. Must be a WhatsApp-enabled number.
  whatsapp: '447506909018',
  tagline: 'UK-based remote web design, SEO and PPC agency for businesses in the UK, USA, Canada, Europe and the Middle East',
  theme: '#080b0f',
};
// ==== PLACEHOLDER: Google Analytics 4 ====
// Paste the GA4 Measurement ID (looks like G-XXXXXXXXXX) between the quotes, then rebuild.
// Left empty on purpose: no tracking code is output until the owner adds their own ID.
const GA4_ID = 'G-EJGC6KKC23';
// ==== PLACEHOLDER: Google Search Console HTML-tag verification (optional) ====
// Only needed if you verify with the HTML tag method instead of DNS. Paste the content="..." value.
const GSC_VERIFY = '';

const PAGES = require('./pages-data');
const SUMMARIES = require('./blog-summaries');
const POSTS = require('./blog-data').map(p => ({ ...p, takeaways: SUMMARIES[p.slug] || [] })).sort((a, b) => (b.date + b.slug).localeCompare(a.date + a.slug));
// tools/lastmod.json: { "/url/path/": { hash, mod } }. A page's sitemap lastmod only moves when its content hash changes.
const LASTMOD_FILE = path.join(__dirname, 'lastmod.json');
const lastmod = (() => { try { return JSON.parse(fs.readFileSync(LASTMOD_FILE, 'utf8')); } catch (e) { return {}; } })();
const pageHash = {};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = s => String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&pound;/g, '£').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const words = html => plain(html).split(/\s+/).filter(Boolean).length;
const readMins = p => Math.max(1, Math.round(words(p.body) / 220));
// Cache-busting: assets are cached for a year by .htaccess, so links carry a content hash.
const ver = rel => require('crypto').createHash('md5').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex').slice(0, 8);
const V = { css: ver('assets/css/prism-works.css'), site: ver('assets/css/site.css'), js: ver('assets/js/site.js'), chat: ver('assets/js/chat.js') };
const core = n => fs.readFileSync(path.join(CORE, n + '.html'), 'utf8').trim();
const today = new Date().toISOString().slice(0, 10);
const ogFor = p => (fs.existsSync(path.join(ROOT, 'assets', 'og', p + '.png')) ? `/assets/og/${p}.png` : '/assets/og-image.png');

// Markets served (remote, from the UK). Used by the Organization and service-page Service schema.
const AREA = [
  { '@type': 'Country', name: 'United Kingdom' },
  { '@type': 'Country', name: 'United States' },
  { '@type': 'Country', name: 'Canada' },
  { '@type': 'Place', name: 'Europe' },
  { '@type': 'Place', name: 'Middle East' },
];
const ORG = {
  '@type': 'Organization',
  '@id': SITE.url + '/#org',
  name: SITE.name,
  url: SITE.url + '/',
  logo: SITE.url + '/assets/img/logo.png',
  image: SITE.url + '/assets/og-image.png',
  email: SITE.email,
  telephone: SITE.phone,
  description: 'Prism Works Studio is a UK-based remote web design and digital marketing studio working with businesses in the UK, USA, Canada, Europe and the Middle East: web design and development, SEO and GEO, PPC and paid media, digital PR and content, and brand strategy.',
  areaServed: AREA,
  knowsAbout: ['Search engine optimisation', 'Generative engine optimisation', 'Paid media', 'Google Shopping', 'Digital PR', 'Content marketing', 'Shopify development', 'WooCommerce development', 'WordPress development', 'Brand strategy'],
};
const WEBSITE = { '@type': 'WebSite', '@id': SITE.url + '/#website', url: SITE.url + '/', name: SITE.name, publisher: { '@id': SITE.url + '/#org' }, inLanguage: 'en-GB' };

function crumbsLd(trail) {
  return { '@type': 'BreadcrumbList', itemListElement: trail.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE.url + url })) };
}
function faqLd(faqs) {
  return { '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: plain(q), acceptedAnswer: { '@type': 'Answer', text: plain(a) } })) };
}
function crumbsHtml(trail) {
  return `<nav class="pws-crumbs" aria-label="Breadcrumb"><ol>${trail.map(([n, u], i) => i === trail.length - 1 ? `<li aria-current="page">${esc(n)}</li>` : `<li><a href="${u}">${esc(n)}</a></li>`).join('')}</ol></nav>`;
}
function faqHtml(faqs, heading = 'Frequently asked questions') {
  return `<section class="pws-section alt"><div class="pws-wrap"><div class="pws-split"><div><div class="pws-head"><span class="pws-eyebrow">FAQ</span><h2 class="pws-h2">${heading}</h2></div></div><div class="pws-faqs">${faqs.map(([q, a]) => `<details class="pws-faq"><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></div></div></section>`;
}
const waHref = msg => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(msg || 'Hi, I saw your website and would like to talk about a project.')}`;
const WA_BTN = msg => SITE.whatsapp ? `<a class="pws-btn pws-btn-wa" href="${waHref(msg)}" target="_blank" rel="noopener">WhatsApp us</a>` : '';
const ctaHtml = msg => `<section class="pws-section alt"><div class="pws-wrap"><div class="pws-cta"><div><span class="pws-eyebrow">Free consultation</span><h2>Let&rsquo;s Talk About Growing Your Business Online.</h2><p class="pws-lead">Book a free, no-obligation 30-minute discovery call with one of our senior digital strategists.</p></div><div class="pws-cta-row"><a class="pws-btn pws-btn-primary" href="/contact/">Get a Free Consultation</a>${WA_BTN(msg)}<a class="pws-btn pws-btn-ghost" href="/services/">View Services</a></div></div></div></section>`;
const CTA = ctaHtml();

const CONTACT_FORM = `<div class="pws-form" id="enquiry">
<form id="pws-contact-form" class="pws-form-static" method="post" data-endpoint="/api/send-quote.php" novalidate>
<!-- ==== PLACEHOLDER: form endpoint ====
     Contact Form 7 (PHP) does not run on a static site. Put the URL of the owner's form handler
     in data-endpoint above (for example a Formspree/Basin form URL, or a PHP mail script on this
     Hostinger account). While it is empty the form opens the visitor's email app instead. -->
<div class="row"><div><label for="pws-name">Name</label><input id="pws-name" name="name" type="text" autocomplete="name" placeholder="Your name" required></div>
<div><label for="pws-email">Email</label><input id="pws-email" name="email" type="email" autocomplete="email" placeholder="you@company.co.uk" required></div></div>
<div class="row"><div><label for="pws-phone">Phone</label><input id="pws-phone" name="phone" type="tel" autocomplete="tel" placeholder="Your phone number" required></div>
<div><label for="pws-product">What do you need?</label><select id="pws-product" name="service" required><option value="">- Please select -</option><option>Web Designing</option><option>Web Development</option><option>Brand Strategy</option><option>Digital Marketing</option></select></div></div>
<div><label for="pws-message">Message</label><textarea id="pws-message" name="message" rows="4" placeholder="Tell us about your business and goals"></textarea></div>
<input type="text" name="company_website" class="pws-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
<button type="submit" class="pws-btn pws-btn-primary">Submit</button>
<p class="pws-status" role="status" aria-live="polite"></p>
<p class="pws-note">Prefer email, phone or WhatsApp? <a href="mailto:${SITE.email}">${SITE.email}</a> &middot; <a href="tel:${SITE.phoneHref}">${SITE.phone}</a> &middot; <a href="${waHref()}" target="_blank" rel="noopener">WhatsApp us</a></p>
</form></div>`;

function layout({ urlPath, title, description, body, ld = [], og, type = 'website', robots, extraHead = '' }) {
  const canonical = SITE.url + urlPath;
  const graph = { '@context': 'https://schema.org', '@graph': [ORG, WEBSITE, ...ld] };
  const ga = GA4_ID ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA4_ID}');</script>` : '<!-- GA4 placeholder: set GA4_ID in tools/build-pages.js -->';
  const image = SITE.url + (og || '/assets/og-image.png');
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${robots ? `<meta name="robots" content="${robots}">` : `<link rel="canonical" href="${canonical}">`}
${GSC_VERIFY ? `<meta name="google-site-verification" content="${GSC_VERIFY}">` : ''}
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(title)}">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${SITE.theme}">
<link rel="icon" href="/assets/img/site-icon.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/img/site-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="alternate" type="application/rss+xml" title="${SITE.name} blog" href="/blog/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Readex+Pro:wght@400;600&family=Lato:wght@400;700&family=Poppins:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/assets/css/prism-works.css?v=${V.css}">
<link rel="stylesheet" href="/assets/css/site.css?v=${V.site}">
${extraHead}
<script type="application/ld+json">${JSON.stringify(graph)}</script>
${ga}
</head>
<body class="pws">
<a class="pws-skip" href="#main">Skip to content</a>
${core('header')}
<main id="main">
${body}
</main>
${core('footer').replace('</ul></div></div><div class="pws-footer-bottom">', `${SITE.whatsapp ? `<li><span>WhatsApp</span><a href="${waHref()}" target="_blank" rel="noopener">Chat on WhatsApp</a></li>` : ''}</ul></div></div><div class="pws-footer-bottom">`)}
${SITE.whatsapp ? `<a class="wa-float" href="${waHref()}" target="_blank" rel="noopener" aria-label="Ask a question" data-chat data-wa="${waHref()}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg></a>` : ''}
<script src="/assets/js/site.js?v=${V.js}" defer></script>
<script src="/assets/js/chat.js?v=${V.chat}" defer></script>
</body>
</html>
`;
}

function write(rel, html) {
  const file = path.join(ROOT, rel);
  if (rel.endsWith('index.html')) {
    // Hash the page without build-varying parts (asset version hashes, post card grids) for the sitemap lastmod.
    const stable = html.replace(/\?v=[0-9a-f]{8}/g, '').replace(/<div class="pws-grid pws-posts">[\s\S]*?<\/div><\/section>/g, '');
    pageHash['/' + rel.replace(/index\.html$/, '')] = require('crypto').createHash('md5').update(stable).digest('hex');
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}
const sitemap = [];
const llms = { core: [], services: [], sectors: [], posts: [] };
function stamp(urlPath) {
  const prev = lastmod[urlPath], hash = pageHash[urlPath];
  if (!hash) return (prev && prev.mod) || today;
  if (!prev || prev.hash !== hash) lastmod[urlPath] = { hash, mod: today };
  return lastmod[urlPath].mod;
}
function add(urlPath, mod, priority) { sitemap.push({ loc: SITE.url + urlPath, mod: mod || stamp(urlPath), priority }); }

// ---------- core pages ----------
const CORE_PAGES = [
  { slug: '', file: 'home', title: 'Web Design, SEO & PPC Agency | Prism Works Studio', description: 'UK-based remote web design, SEO and PPC agency working with businesses in the UK, USA, Canada, Europe and the Middle East.', crumb: null },
  { slug: 'about-us', file: 'about-us', title: 'About Us | Prism Works Studio', description: 'A results-driven digital marketing and ecommerce agency helping UK businesses build powerful online presences and measurable growth.', crumb: 'About us' },
  { slug: 'services', file: 'services', title: 'Web Design, SEO & PPC Services | Prism Works Studio', description: 'Web design, SEO and GEO, PPC, digital PR and brand strategy from a UK-based remote agency for clients in the UK, USA, Canada, Europe and the Middle East.', crumb: 'Services' },
  { slug: 'sectors', file: 'sectors', title: 'Sectors We Serve | Prism Works Studio', description: 'Digital marketing with deep sector knowledge: healthcare, hospitality, ecommerce, financial advisers, SaaS, B2B and education.', crumb: 'Sectors' },
  { slug: 'contact', file: 'contact', title: 'Contact Us | Prism Works Studio', description: 'Book a free, no-obligation 30-minute discovery call with Prism Works Studio. Email contact@prismworks.studio or call +44 7506 909018.', crumb: 'Contact' },
];
const HOME_FAQS = [];
for (const p of CORE_PAGES) {
  const urlPath = p.slug ? `/${p.slug}/` : '/';
  let body = core(p.file).replace('{{CONTACT_FORM}}', CONTACT_FORM);
  const ld = [{ '@type': p.slug === 'contact' ? 'ContactPage' : p.slug === 'about-us' ? 'AboutPage' : 'WebPage', '@id': SITE.url + urlPath + '#webpage', url: SITE.url + urlPath, name: p.title, description: p.description, isPartOf: { '@id': SITE.url + '/#website' }, about: { '@id': SITE.url + '/#org' }, inLanguage: 'en-GB' }];
  if (p.crumb) {
    const trail = [['Home', '/'], [p.crumb, urlPath]];
    ld.push(crumbsLd(trail));
    body = body.replace('<div class="pws-wrap">', '<div class="pws-wrap">' + crumbsHtml(trail));
  }
  // FAQ schema from the visible <details> FAQs on the page
  const faqs = [...body.matchAll(/<details class="pws-faq"><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/g)].map(m => [m[1], m[2]]);
  if (faqs.length) ld.push(faqLd(faqs));
  if (p.slug === 'services') ld.push({ '@type': 'ItemList', name: 'Services', itemListElement: PAGES.filter(x => x.type === 'service').map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE.url + s.path, name: s.name })) });
  if (p.slug === 'sectors') ld.push({ '@type': 'ItemList', name: 'Sectors', itemListElement: PAGES.filter(x => x.type === 'sector').map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE.url + s.path, name: s.name })) });
  if (p.slug === '') {
    // Latest articles block on the home page
    const latest = POSTS.slice(0, 3).map(cardHtml).join('');
    body = body.replace(/(<section class="pws-section alt"><div class="pws-wrap"><div class="pws-cta">)/, `<section class="pws-section"><div class="pws-wrap"><div class="pws-head"><span class="pws-eyebrow">Insights</span><h2 class="pws-h2">Latest guides</h2></div><div class="pws-grid pws-posts">${latest}</div><div class="pws-cta-row"><a class="pws-btn pws-btn-ghost" href="/blog/">All articles</a></div></div></section>\n$1`);
  }
  write(p.slug ? `${p.slug}/index.html` : 'index.html', layout({ urlPath, title: p.title, description: p.description, body, ld, og: ogFor(p.slug || 'home') }));
  add(urlPath, null, p.slug ? '0.8' : '1.0');
  llms.core.push(`- [${p.crumb || 'Home'}](${SITE.url}${urlPath}): ${p.description}`);
}

// 404
write('404.html', layout({ urlPath: '/404.html', title: 'Page Not Found | Prism Works Studio', description: 'The page you are looking for does not exist or has moved.', body: core('404'), robots: 'noindex' }));

// ---------- service, sector and pricing pages ----------
function cardHtml(post) {
  return `<a class="pws-card pws-post-card" href="/blog/${post.slug}/"><p class="pws-tags">${esc(post.category)} &middot; ${readMins(post)} min read</p><h3>${post.title}</h3><p>${esc(post.description)}</p><span class="pws-more">Read the guide &rarr;</span></a>`;
}
const byPath = Object.fromEntries(PAGES.map(p => [p.path, p]));

// ---------- relevance-based related posts ----------
// Replaces newest-first picks so older posts also get "Keep reading" links. Deterministic: same inputs, same output.
const STOP = new Set('uk a an and the for of to in on with vs how what is are your you do does guide guides best which why when it its from by or at small business businesses agency cost costs'.split(' '));
const tokens = s => new Set(String(s).toLowerCase().split(/[^a-z0-9]+/).filter(t => t && !STOP.has(t)));
const hashNum = s => parseInt(require('crypto').createHash('md5').update(s).digest('hex').slice(0, 8), 16);
const moneyPages = p => (p.related || []).filter(u => u !== '/pricing/');
const POST_TOK = new Map(POSTS.map(p => [p.slug, tokens(p.slug)]));
const bodyLinks = p => new Set([...p.body.matchAll(/href="\/blog\/([^"\/]+)\/"/g)].map(m => m[1]));
const POST_OUT = new Map(POSTS.map(p => [p.slug, bodyLinks(p)]));
const inbound = Object.fromEntries(POSTS.map(p => [p.slug, 0]));
for (const p of POSTS) for (const t of POST_OUT.get(p.slug)) if (t !== p.slug && t in inbound) inbound[t]++;
const picked = Object.fromEntries(POSTS.map(p => [p.slug, 0]));
function relevance(post, c) {
  const a = POST_TOK.get(post.slug), b = POST_TOK.get(c.slug);
  let shared = 0; for (const t of a) if (b.has(t)) shared++;
  const cm = new Set(moneyPages(c));
  const sharedPages = moneyPages(post).filter(u => cm.has(u)).length;
  return { shared, sharedPages, score: 3 * shared + 2 * sharedPages + (c.category === post.category ? 1 : 0) };
}
// Score: shared slug words, shared money pages and category; then favour posts no article links to,
// spread picks across posts and skip ones the body already links. Ties break on a slug hash.
function relatedPostsFor(post, n = 3) {
  const out = POST_OUT.get(post.slug);
  const ranked = POSTS.filter(c => c.slug !== post.slug).map(c => {
    const r = relevance(post, c);
    let score = r.score;
    if (r.shared || r.sharedPages) {
      if (inbound[c.slug] === 0 && (r.shared || r.sharedPages > 1)) score += 3;
      score -= 1.5 * picked[c.slug];
      if (out.has(c.slug)) score -= 3;
    }
    return { c, score, tie: hashNum(post.slug + '|' + c.slug) };
  }).sort((x, y) => y.score - x.score || x.tie - y.tie).slice(0, n).map(x => x.c);
  ranked.forEach(c => picked[c.slug]++);
  return ranked;
}
// Service, sector and pricing pages: pinned featuredPosts first, then the most relevant posts that list the page.
function pagePostsFor(page, n = 3) {
  const pinned = (page.featuredPosts || []).map(s => POSTS.find(p => p.slug === s)).filter(Boolean);
  const pt = tokens(page.path + ' ' + plain(page.name));
  const pool = POSTS.filter(x => !pinned.includes(x) && (x.related || []).includes(page.path)).map(c => {
    let shared = 0; for (const t of POST_TOK.get(c.slug)) if (pt.has(t)) shared++;
    const links = c.body.includes('href="' + page.path + '"') ? 1 : 0;
    return { c, score: 3 * shared + 2 * links + (inbound[c.slug] === 0 ? 2 : 0) - 1.5 * picked[c.slug], tie: hashNum(page.path + '|' + c.slug) };
  }).sort((x, y) => y.score - x.score || x.tie - y.tie).map(x => x.c);
  const res = pinned.concat(pool).slice(0, n);
  res.forEach(c => picked[c.slug]++);
  return res;
}
const GUIDES = require('./pages-guides');
const CHAT = [];
const chatAdd = (faqs, u, t) => faqs.forEach(([q, a]) => CHAT.push({ q: plain(q), a: plain(a), u, t: plain(t) }));

for (const p of PAGES) {
  const parent = p.type === 'service' ? ['Services', '/services/'] : p.type === 'sector' ? ['Sectors', '/sectors/'] : null;
  const trail = [['Home', '/'], ...(parent ? [parent] : []), [p.name, p.path]];
  const relatedPosts = pagePostsFor(p);
  const relatedPages = (p.related || []).map(u => byPath[u]).filter(Boolean);
  let body = `<section class="pws-section pws-page-hero"><div class="pws-wrap">${crumbsHtml(trail)}<span class="pws-eyebrow">${p.eyebrow}</span><h1>${p.h1}</h1><p class="pws-lead">${p.lead}</p><div class="pws-cta-row"><a class="pws-btn pws-btn-primary" href="/contact/">Get a Free Consultation</a>${WA_BTN()}<a class="pws-btn pws-btn-ghost" href="/pricing/">See pricing</a></div></div></section>\n`;
  p.sections.forEach((s, i) => {
    body += `<section class="pws-section${i % 2 ? ' alt' : ''}"><div class="pws-wrap"><div class="pws-head"><span class="pws-eyebrow">${s.eyebrow || p.eyebrow}</span><h2 class="pws-h2">${s.h2}</h2>${s.lead ? `<p class="pws-lead">${s.lead}</p>` : ''}</div>${s.html || ''}</div></section>\n`;
  });
  if (relatedPages.length || relatedPosts.length) {
    body += `<section class="pws-section"><div class="pws-wrap"><div class="pws-head"><span class="pws-eyebrow">Keep reading</span><h2 class="pws-h2">Related services, sectors and guides</h2></div><div class="pws-grid">${relatedPages.map(r => `<a class="pws-card" href="${r.path}"><p class="pws-tags">${r.type === 'service' ? 'Service' : r.type === 'sector' ? 'Sector' : 'Pricing'}</p><h3>${r.name}</h3><p>${esc(r.description)}</p></a>`).join('')}${relatedPosts.map(cardHtml).join('')}</div></div></section>\n`;
  }
  const guide = GUIDES[p.path];
  if (guide && guide.html) body += `<section class="pws-section"><div class="pws-wrap"><article class="pws-article pws-guide">${guide.html.trim()}</article></div></section>\n`;
  const allFaqs = (p.faqs || []).concat((guide && guide.faqs) || []);
  if (allFaqs.length) body += faqHtml(allFaqs) + '\n';
  chatAdd(allFaqs, p.path, p.h1);
  body += CTA;
  const ld = [{ '@type': 'WebPage', '@id': SITE.url + p.path + '#webpage', url: SITE.url + p.path, name: p.seoTitle, description: p.description, isPartOf: { '@id': SITE.url + '/#website' }, inLanguage: 'en-GB' }, crumbsLd(trail)];
  if (p.type === 'service') ld.push({ '@type': 'Service', '@id': SITE.url + p.path + '#service', name: p.name, serviceType: p.serviceType || p.name, description: p.description, url: SITE.url + p.path, provider: { '@id': SITE.url + '/#org' }, areaServed: AREA });
  if (p.type === 'sector') ld.push({ '@type': 'Service', '@id': SITE.url + p.path + '#service', name: p.serviceName, serviceType: 'Digital marketing', audience: { '@type': 'BusinessAudience', name: p.audience }, description: p.description, url: SITE.url + p.path, provider: { '@id': SITE.url + '/#org' }, areaServed: { '@type': 'Country', name: 'United Kingdom' } });
  if (p.type === 'pricing') ld.push({ '@type': 'OfferCatalog', name: 'Prism Works Studio monthly retainers', itemListElement: p.offers.map(([n, price, d]) => ({ '@type': 'Offer', name: n, description: d, price, priceCurrency: 'GBP', priceSpecification: { '@type': 'UnitPriceSpecification', price, priceCurrency: 'GBP', unitText: 'MONTH' }, seller: { '@id': SITE.url + '/#org' } })) });
  if (allFaqs.length) ld.push(faqLd(allFaqs));
  write(p.path.slice(1) + 'index.html', layout({ urlPath: p.path, title: p.seoTitle, description: p.description, body, ld, og: ogFor(p.path.replace(/^\/|\/$/g, '').replace(/\//g, '-')) }));
  add(p.path, p.updated, p.type === 'pricing' ? '0.8' : '0.9');
  (p.type === 'sector' ? llms.sectors : llms.services).push(`- [${plain(p.name)}](${SITE.url}${p.path}): ${p.description}`);
}

// ---------- blog ----------
function faqsFromBody(b) {
  const at = b.indexOf('<h2>FAQs</h2>');
  if (at < 0) return [];
  const part = b.slice(at);
  return [...part.matchAll(/<h3>(.*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map(m => [m[1], m[2]]);
}
const fmtDate = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
for (const post of POSTS) {
  const urlPath = `/blog/${post.slug}/`;
  const trail = [['Home', '/'], ['Blog', '/blog/'], [plain(post.title), urlPath]];
  const faqs = faqsFromBody(post.body);
  chatAdd(faqs, urlPath, post.title);
  const related = (post.related || []).map(u => byPath[u]).filter(Boolean);
  const more = relatedPostsFor(post);
  const body = `<section class="pws-section pws-page-hero pws-article-hero"><div class="pws-wrap">${crumbsHtml(trail)}<span class="pws-eyebrow">${esc(post.category)}</span><h1>${post.title}</h1><p class="pws-lead">${esc(post.description)}</p><p class="pws-meta">By the ${SITE.name} team &middot; <time datetime="${post.updated || post.date}">${post.updated ? 'Updated ' + fmtDate(post.updated) : fmtDate(post.date)}</time> &middot; ${readMins(post)} min read</p></div></section>
<section class="pws-section"><div class="pws-wrap pws-article-wrap"><article class="pws-article">
<div class="pws-takeaways"><h2>Key takeaways</h2><ul>${post.takeaways.map(t => `<li>${t}</li>`).join('')}</ul></div>
${post.body.trim()}
</article>
<aside class="pws-aside">${related.length ? `<div class="pws-box"><h3>How we can help</h3><ul>${related.map(r => `<li><a href="${r.path}">${r.name}</a></li>`).join('')}</ul></div>` : ''}<div class="pws-box"><h3>Talk to us</h3><p>Book a free, no-obligation 30-minute discovery call.</p><a class="pws-btn pws-btn-primary pws-btn-sm" href="/contact/">Get a Free Consultation</a>${WA_BTN(`Hi, I read your article '${plain(post.title)}' and need help`)}</div></aside>
</div></section>
<section class="pws-section alt"><div class="pws-wrap"><div class="pws-head"><span class="pws-eyebrow">More guides</span><h2 class="pws-h2">Keep reading</h2></div><div class="pws-grid pws-posts">${more.map(cardHtml).join('')}</div></div></section>
${ctaHtml(`Hi, I read your article '${plain(post.title)}' and need help`)}`;
  const ld = [{ '@type': 'BlogPosting', '@id': SITE.url + urlPath + '#article', headline: plain(post.title).slice(0, 110), description: post.description, datePublished: post.date, dateModified: post.updated || post.date, mainEntityOfPage: SITE.url + urlPath, url: SITE.url + urlPath, image: SITE.url + ogFor('blog-' + post.slug), inLanguage: 'en-GB', wordCount: words(post.body), articleSection: post.category, author: { '@id': SITE.url + '/#org' }, publisher: { '@id': SITE.url + '/#org' } }, crumbsLd(trail)];
  if (faqs.length) ld.push(faqLd(faqs));
  write(`blog/${post.slug}/index.html`, layout({ urlPath, title: post.seoTitle || plain(post.title), description: post.description, body, ld, og: ogFor('blog-' + post.slug), type: 'article', extraHead: `<meta property="article:published_time" content="${post.date}">\n<meta property="article:modified_time" content="${post.updated || post.date}">` }));
  add(urlPath, post.updated || post.date, '0.7');
  llms.posts.push(`- [${plain(post.title)}](${SITE.url}${urlPath}): ${post.description}`);
}
{
  const urlPath = '/blog/';
  const trail = [['Home', '/'], ['Blog', urlPath]];
  const body = `<section class="pws-section pws-page-hero"><div class="pws-wrap">${crumbsHtml(trail)}<span class="pws-eyebrow">Blog</span><h1>Digital Marketing &amp; Ecommerce Guides for UK Businesses</h1><p class="pws-lead">Practical, plain-English guides on SEO, GEO, paid media, digital PR and building websites and online stores that sell.</p></div></section>
<section class="pws-section"><div class="pws-wrap"><div class="pws-grid pws-posts">${POSTS.map(cardHtml).join('')}</div></div></section>
${CTA}`;
  const ld = [{ '@type': 'Blog', '@id': SITE.url + '/blog/#blog', url: SITE.url + '/blog/', name: `${SITE.name} blog`, publisher: { '@id': SITE.url + '/#org' }, inLanguage: 'en-GB', blogPost: POSTS.map(p => ({ '@type': 'BlogPosting', headline: plain(p.title).slice(0, 110), url: `${SITE.url}/blog/${p.slug}/`, datePublished: p.date })) }, crumbsLd(trail)];
  write('blog/index.html', layout({ urlPath, title: 'Digital Marketing Blog | Prism Works Studio', description: 'Guides for UK businesses on SEO, GEO, paid media, digital PR, Shopify, WooCommerce and WordPress websites, written in plain English.', body, ld, og: ogFor('blog') }));
  add(urlPath, POSTS[0] && (POSTS[0].updated || POSTS[0].date), '0.7');
  const items = POSTS.slice(0, 20).map(p => `<item><title>${esc(plain(p.title))}</title><link>${SITE.url}/blog/${p.slug}/</link><guid>${SITE.url}/blog/${p.slug}/</guid><pubDate>${new Date(p.date + 'T09:00:00Z').toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('\n');
  write('blog/feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${SITE.name} blog</title><link>${SITE.url}/blog/</link><description>Guides for UK businesses on digital marketing and ecommerce.</description><language>en-gb</language>\n${items}\n</channel></rss>\n`);
}

write('assets/chat-index.json', JSON.stringify(CHAT));

// ---------- sitemap, robots, llms, manifest ----------
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map(s => `<url><loc>${s.loc}</loc><lastmod>${s.mod}</lastmod><priority>${s.priority}</priority></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /tools/\nDisallow: /docs/\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
write('llms.txt', `# ${SITE.name}\n\n> ${SITE.name} is a UK-based remote web design and digital marketing studio working with businesses in the UK, USA, Canada, Europe and the Middle East (no offices outside the UK), combining AI-powered strategy with creative execution: web design and development (Shopify, WooCommerce, WordPress), SEO and GEO, PPC and paid media, digital PR and content, and brand strategy. Contact: ${SITE.email}, ${SITE.phone}.\n\nMonthly retainers start at £350 (Launch), £750 (Growth) and £1,500 (Scale) a month; advertising spend is paid separately. Website and ecommerce builds are quoted as separate projects.\n\n## Pages\n${llms.core.join('\n')}\n- [Pricing](${SITE.url}/pricing/): Monthly retainers and one-off project starting prices.\n\n## Services\n${llms.services.filter(l => !l.includes('/pricing/')).join('\n')}\n\n## Sectors\n${llms.sectors.join('\n')}\n\n## Guides\n${llms.posts.join('\n')}\n`);
fs.writeFileSync(LASTMOD_FILE, JSON.stringify(Object.fromEntries(Object.entries(lastmod).sort()), null, 1) + '\n');
write('site.webmanifest', JSON.stringify({ name: SITE.name, short_name: 'Prism Works', start_url: '/', display: 'standalone', background_color: SITE.theme, theme_color: SITE.theme, icons: [{ src: '/assets/img/site-icon.png', sizes: '512x512', type: 'image/png' }] }, null, 2) + '\n');

console.log(`Built ${CORE_PAGES.length} core pages, ${PAGES.length} service/sector/pricing pages, ${POSTS.length} posts, 404, blog index, sitemap (${sitemap.length} URLs).`);
