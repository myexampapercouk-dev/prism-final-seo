// One-off helper: insert contextual links into existing blog posts (tools/blog-data.js).
// Each entry: [source post slug, anchor text that exists exactly once in that post's body, HTML to insert BEFORE the anchor]
// Safe to re-run: skips an insert if the target link already exists in that post.
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'blog-data.js');

const LINKS = [
  // ['post-slug', '<h2>Exact heading in that post</h2>', '<p>Related: <a href="/services/seo-geo/">SEO and GEO services</a>.</p>\n\n'],
  // 2026-11 audit (docs/seo/technical-onpage-audit-2026-11-10.md, section 3): keyword anchors to the service pages.
  // -> /services/seo-geo/
  ['woocommerce-seo-uk', '<h2>Category pages: your biggest opportunity</h2>', '<p>If you would rather hand the settings and ongoing work to a specialist, our <a href="/services/seo-geo/">WooCommerce SEO services</a> cover technical fixes, category pages and content.</p>\n'],
  ['woocommerce-agency-uk', '<h2>How much does a WooCommerce agency cost?</h2>', '<p>A good build makes search easier, but ranking a store is ongoing work. If you need an <a href="/services/seo-geo/">SEO agency</a> as well as a developer, ask how the two will share the plan.</p>\n'],
  ['shopify-agency-uk', '<h2>How to compare Shopify agencies</h2>', '<p>Search visibility should be planned during the build, not after it. See how we approach <a href="/services/seo-geo/">Shopify SEO</a> for category pages, product pages and site structure.</p>\n'],
  ['wordpress-agency-uk', '<h2>How much does a WordPress agency cost in the UK?</h2>', '<p>A fast, well-structured WordPress site gives SEO a head start, but rankings still take ongoing work. If you also need an <a href="/services/seo-geo/">SEO agency</a>, ask how the build and the SEO plan fit together.</p>\n'],
  ['shopify-website-cost-uk', '<h2>One-off costs vs ongoing costs</h2>', '<p>Remember to budget for being found once the store is live. Our <a href="/services/seo-geo/">SEO services</a> run on a monthly retainer, separate from the build.</p>\n'],
  ['wordpress-website-cost-uk', '<h2>Who owns what</h2>', '<p>Remember to budget for being found once the site is live. Our <a href="/services/seo-geo/">SEO services</a> run on a monthly retainer, separate from the build.</p>\n'],
  ['how-to-choose-a-web-designer-uk', '<h2>Comparing proposals fairly</h2>', '<p>Ask who will look after search once the site launches. A web designer and an <a href="/services/seo-geo/">SEO agency</a> do different jobs, and redirects, page structure and content need both.</p>\n'],
  ['digital-marketing-agency-dallas', '<h2>Your website is the foundation</h2>', '<p>For organic search, our <a href="/services/seo-geo/">SEO agency</a> service covers technical fixes, content and visibility in AI answers.</p>\n'],
  // -> /services/paid-media/
  ['digital-marketing-agency-cost-uk', '<h2>Hidden costs to watch for</h2>', '<p>For a closer look at what <a href="/services/paid-media/">paid ads management</a> involves and how ad spend is kept separate from the fee, see our service page.</p>\n'],
  ['marketing-agency-for-startups-uk', '<h2>Common startup marketing mistakes</h2>', '<p>When paid search is the right next step, our <a href="/services/paid-media/">Google Ads management</a> starts with conversion tracking before budgets increase.</p>\n'],
  ['loft-conversion-company-marketing-uk', '<h2>Trust signals for a high-value build</h2>', '<p>Paid search can bring enquiries while organic rankings build. Our <a href="/services/paid-media/">Google Ads management</a> sets up conversion tracking first, so budget goes to the searches that bring real enquiries.</p>\n'],
  ['waste-management-company-marketing-uk', '<h2>Compliance and trust</h2>', '<p>If you want paid search run for you, our <a href="/services/paid-media/">PPC agency</a> service covers tracking, campaign structure and ongoing optimisation.</p>\n'],
  ['dental-marketing-uk', '<h2>Retaining and recalling existing patients</h2>', '<p>If you want help running campaigns within those rules, see our <a href="/services/paid-media/">PPC agency</a> service.</p>\n'],
  ['digital-marketing-agency-dallas', '<h2>How remote digital marketing works</h2>', '<p>For paid search and social, our <a href="/services/paid-media/">PPC agency</a> service sets up tracking before spend scales.</p>\n'],
  // -> /services/website-ecommerce-development/
  ['shopify-draft-orders', '<h2>Discounts and custom pricing</h2>', '<p>If your ordering process needs more than the standard settings, our <a href="/services/website-ecommerce-development/">Shopify development</a> service can help set it up.</p>\n'],
  ['wordpress-plugin-audit', '<h2>Step 1: List every plugin</h2>', '<p>If you would rather have someone else run the audit, our <a href="/services/website-ecommerce-development/">WordPress web design and support</a> service includes plugin reviews and maintenance.</p>\n'],
  ['website-backup-and-recovery-plan', '<h2>Where to keep backups</h2>', '<p>Backups and updates are part of the ongoing <a href="/services/website-ecommerce-development/">website support</a> we offer after a build.</p>\n'],
  ['website-analytics-for-small-business', '<h2>The free Google tools to use</h2>', '<p>When we handle <a href="/services/website-ecommerce-development/">web design and development</a>, key actions and tracking are agreed before launch.</p>\n'],
  ['website-favicon-and-app-icons', '<h2>Which sizes and formats do you need?</h2>', '<p>Icons are a small part of <a href="/services/website-ecommerce-development/">web design</a>, but they are easy to get right when they are planned with the rest of the site.</p>\n'],
  ['wordpress-menus-guide', '<h2>Mobile menus</h2>', '<p>If your navigation needs a rethink rather than a tidy-up, our <a href="/services/website-ecommerce-development/">WordPress web design</a> service plans menus around how visitors look for things.</p>\n'],
  ['shopify-gift-wrapping-and-order-notes', '<h2>Using the cart note for order notes</h2>', '<p>If you want gift options built into the theme properly, they can be scoped as part of a <a href="/services/website-ecommerce-development/">Shopify store build</a>.</p>\n'],
  ['wordpress-revisions-and-autosave', '<h2>Comparing revisions</h2>', '<p>If editing your site feels harder than it should, our <a href="/services/website-ecommerce-development/">WordPress development</a> service includes training so your team can manage content confidently.</p>\n'],
  ['how-to-brief-a-shopify-developer', '<h2>Write acceptance criteria</h2>', '<p>If you want to see how a <a href="/services/website-ecommerce-development/">Shopify web design agency</a> turns a brief into a written scope, see our service page.</p>\n'],
  ['google-ads-agency-new-york', '<h2>Targeting New York carefully</h2>', '<p>Ads only work as well as the page they send people to. Our <a href="/services/website-ecommerce-development/">landing page design</a> builds pages around a single goal.</p>\n'],
  // -> /services/brand-strategy/
  ['bespoke-website-design-agency-uk', '<h2>When bespoke design is worth it</h2>', '<p>Bespoke design works best when the positioning is settled first. Our <a href="/services/brand-strategy/">brand strategy</a> service covers positioning, messaging and visual identity.</p>\n'],
  ['digital-pr-agency-uk', '<h2>How results are judged</h2>', '<p>Stories land more easily when the business is clear about what it stands for. If that needs work first, see our <a href="/services/brand-strategy/">brand positioning</a> service.</p>\n'],
  ['google-shopping-agency-uk', '<h2>Agency, freelancer or in-house management?</h2>', '<p>Shopping ads compete on product and brand. If your brand is hard to tell apart from competitors, our <a href="/services/brand-strategy/">brand strategy agency</a> service can help sharpen it.</p>\n'],
  ['shopify-agency-miami', '<h2>How a remote Shopify project works</h2>', '<p>If the store needs a clearer identity before the build, our <a href="/services/brand-strategy/">brand strategy</a> service can run first.</p>\n'],
  ['wholesale-distributor-marketing-uk', '<h2>Turning visitors into trade accounts</h2>', '<p>Trade buyers compare suppliers quickly, so clear <a href="/services/brand-strategy/">brand positioning</a> helps them see why to choose you.</p>\n'],
  // -> /services/digital-pr-content/
  ['how-much-does-seo-cost-uk', '<h2>Red flags in cheap SEO quotes</h2>', '<p>Authority work is often priced separately from technical SEO. See our <a href="/services/digital-pr-content/">digital PR and link building</a> service for how that work is scoped.</p>\n'],
  ['website-copywriting-uk', '<h2>Calls to action</h2>', '<p>If you would rather have help with the writing, our <a href="/services/digital-pr-content/">content marketing services</a> cover website copy, guides and articles.</p>\n'],
  ['seo-agency-los-angeles', '<h2>Local agency or remote agency: the trade-offs</h2>', '<p>Links and mentions from relevant websites help pages rank and get cited. Our <a href="/services/digital-pr-content/">digital PR</a> service earns them through stories worth covering.</p>\n'],
  ['b2b-marketing-agency-uk', '<h2>How long sales cycles change the marketing plan</h2>', '<p>Content carries most of the weight in a long sales cycle. See how our <a href="/services/digital-pr-content/">content marketing agency</a> service plans articles and guides for each stage.</p>\n'],
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
