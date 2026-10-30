module.exports = {
  slug: 'website-redesign-without-losing-rankings',
  seoTitle: 'Website Redesign Without Losing SEO Rankings (UK)',
  title: 'How to Redesign or Migrate a Website Without Losing Your SEO Rankings',
  description: 'A step-by-step plan to redesign or migrate a website without losing SEO rankings: URL mapping, 301 redirects, content, testing and post-launch checks.',
  date: '2026-10-30',
  category: 'SEO',
  related: ['/services/website-ecommerce-development/', '/services/seo-geo/', '/sectors/ecommerce/'],
  takeaways: [
    'Most ranking losses after a redesign come from changed URLs without redirects, removed content and technical mistakes at launch.',
    'Benchmark before you start, map every important old URL to its new home with a 301 redirect, and keep the content that ranks.',
    'Test on staging, launch at a quiet time and monitor Search Console closely for the first weeks after launch.',
  ],
  body: `
<p>You can redesign or migrate a website without losing your search rankings, but only if SEO is part of the plan from the start. Most traffic drops after a redesign are caused by a small number of avoidable mistakes: URLs that change without redirects, content that ranked being removed or rewritten, and technical settings left over from the staging site.</p>
<p>This guide gives you a practical, step-by-step plan for UK businesses moving to a new design, a new platform such as Shopify or WooCommerce, or a new domain.</p>

<h2>Why redesigns lose rankings</h2>
<p>Search engines rank individual pages, not websites as a whole. When a redesign changes those pages, the signals that made them rank can be lost. The most common causes are:</p>
<ul>
<li><strong>Changed URLs without redirects.</strong> Old URLs return a 404 error, and the links and history attached to them are lost.</li>
<li><strong>Removed or thinned content.</strong> A sleek new design with much less text often ranks for far fewer searches.</li>
<li><strong>Lost internal links.</strong> New navigation can bury important pages that used to be linked from the menu.</li>
<li><strong>Technical leftovers.</strong> A "noindex" tag or blocked robots.txt copied from staging can remove the whole site from search.</li>
<li><strong>Slower pages.</strong> Heavier designs with large images and scripts can hurt user experience and Core Web Vitals.</li>
<li><strong>Changed titles and headings</strong> that no longer match what people search for.</li>
</ul>

<h2>Step 1: Benchmark before you change anything</h2>
<p>Record where you are now so you can compare after launch:</p>
<ul>
<li>Export performance data from Google Search Console: top pages and queries, clicks and impressions.</li>
<li>Export landing page data from GA4, including conversions.</li>
<li>Crawl the current site to capture every URL, title, meta description, heading and canonical tag.</li>
<li>List pages with backlinks from other websites, using Search Console's links report or an SEO tool.</li>
</ul>
<p>This becomes your safety net. If something drops, you will know exactly what changed.</p>

<h2>Step 2: Decide what stays, what merges and what goes</h2>
<p>Go through your important pages and decide for each one:</p>
<table>
<thead><tr><th>Decision</th><th>When to use it</th><th>What to do</th></tr></thead>
<tbody>
<tr><td>Keep</td><td>Page ranks, gets traffic or has links</td><td>Keep the URL if possible; keep or improve the content</td></tr>
<tr><td>Move</td><td>Page is needed but the URL must change</td><td>301 redirect the old URL to the new one</td></tr>
<tr><td>Merge</td><td>Several thin pages cover the same topic</td><td>Combine into one stronger page and redirect the others to it</td></tr>
<tr><td>Remove</td><td>Page is outdated, has no traffic and no links</td><td>Redirect to the closest relevant page, or let it return 404/410 if nothing fits</td></tr>
</tbody>
</table>
<p>Keeping URLs the same wherever possible is the single most effective way to protect rankings. If your current URLs are clean and sensible, there is often no need to change them at all.</p>

<h2>Step 3: Build a redirect map</h2>
<p>For every URL that changes, map the old address to the most relevant new one using a <strong>301 (permanent) redirect</strong>. Redirect to the closest equivalent page, not the homepage; mass redirects to the homepage are treated much like missing pages.</p>
<p>Include product, category and blog URLs, PDF files and images that attract traffic, and old URLs that already redirect, so you avoid redirect chains. On platform migrations, remember that URL structures differ: Shopify, for example, uses /products/ and /collections/ paths, which usually means most ecommerce URLs change when moving to it. Our comparison of <a href="/blog/shopify-vs-woocommerce-uk/">Shopify and WooCommerce</a> covers this.</p>

<h2>Step 4: Protect your content and on-page SEO</h2>
<ul>
<li>Carry over page titles, meta descriptions and main headings for ranking pages, improving them rather than replacing them blindly.</li>
<li>Keep the substance of content that ranks. Redesign the layout, but do not cut the text that answers searchers' questions.</li>
<li>Keep structured data (schema) such as Organization, Product, FAQ and Breadcrumb markup, and test it.</li>
<li>Rebuild internal links so important pages are still well linked from navigation and related content.</li>
<li>Keep image alt text and file names where they matter.</li>
</ul>

<h2>Step 5: Test thoroughly on staging</h2>
<p>Build and test the new site on a staging environment that is blocked from search engines. Before launch, check:</p>
<ol>
<li>Every redirect in your map works and goes to the right page in one hop.</li>
<li>Titles, descriptions, headings and canonical tags are correct.</li>
<li>Page speed and Core Web Vitals on mobile.</li>
<li>Forms, checkout and tracking, including GA4 events and ad conversion tags.</li>
<li>The XML sitemap lists the new URLs.</li>
</ol>

<h2>Step 6: Launch carefully</h2>
<ul>
<li>Launch at a quieter time for your business, not just before a peak like Black Friday.</li>
<li>Remove any staging "noindex" tags and robots.txt blocks immediately.</li>
<li>Submit the new XML sitemap in Search Console.</li>
<li>If the domain changes, use Search Console's Change of Address tool.</li>
<li>Crawl the live site straight away to catch broken links and redirect errors.</li>
</ul>

<h2>Step 7: Monitor for the first weeks</h2>
<p>Some fluctuation after launch is normal while search engines process the changes. What matters is the trend. For at least the first four to eight weeks:</p>
<ul>
<li>Check Search Console daily at first for crawl errors, indexing issues and spikes in 404s.</li>
<li>Compare clicks and impressions for key pages and queries with your benchmark.</li>
<li>Watch conversions in GA4, not just traffic.</li>
<li>Fix problems quickly; a missing redirect found in week one does far less damage than one found in month three.</li>
</ul>

<h2>A redesign SEO checklist</h2>
<p>Use this as a quick reference to make sure nothing is missed:</p>
<ul>
<li>Search Console and GA4 benchmarks exported and saved.</li>
<li>Full crawl of the old site saved, including titles, descriptions and canonicals.</li>
<li>Pages with backlinks identified and protected.</li>
<li>Keep, move, merge and remove decisions made for every important page.</li>
<li>Redirect map complete, with no chains or loops.</li>
<li>Content from ranking pages carried over and improved where needed.</li>
<li>Structured data, internal links and alt text checked on staging.</li>
<li>Mobile speed tested on the new templates.</li>
<li>Tracking and conversions tested end to end.</li>
<li>Staging blocks removed and sitemap submitted at launch.</li>
<li>Monitoring plan in place for the first eight weeks.</li>
</ul>

<h2>Who should be involved</h2>
<p>A redesign touches design, development, content and marketing, so it helps to agree responsibilities early. The designer and developer own the templates and the build; someone with SEO experience owns the benchmark, redirect map and post-launch checks; and someone in your business signs off content and is available to answer questions quickly. Problems usually happen in the gaps between these roles, for example when a developer changes URL structures without telling whoever is responsible for redirects. A short shared checklist and a single launch plan avoid most of these gaps.</p>
<p>Timing matters too. Avoid launching just before your busiest season, and leave a buffer after the planned launch date for fixes. A slightly later, well-tested launch is far better than a rushed one that loses rankings at the worst possible moment.</p>

<h2>Platform migrations: extra checks</h2>
<p>Moving between platforms, such as from WooCommerce to Shopify or from a website builder to WordPress, adds work. Product data, customer accounts, reviews and order history need migrating, and URL structures almost always change. Plan the data migration and redirect map together, and test a sample of products, categories and customer journeys end to end. If you are weighing up the cost of a new store, our guide to <a href="/blog/ecommerce-website-cost-uk/">ecommerce website costs</a> includes migration in the budget.</p>

<h2>What if rankings have already dropped?</h2>
<p>If you have already relaunched and traffic has fallen, start with the basics: check for noindex tags, blocked robots.txt, missing redirects and lost pages using your old crawl or the Wayback Machine. Compare your old and new top pages in Search Console. Restoring redirects and important content often recovers much of the lost visibility, although it can take weeks to return.</p>

<h2>How we handle redesigns</h2>
<p>Every redesign and migration we take on through our <a href="/services/website-ecommerce-development/">website and ecommerce development</a> service includes SEO preservation: benchmarking, URL mapping, redirects, content carry-over and post-launch monitoring. Where ongoing optimisation is needed, our <a href="/services/seo-geo/">SEO and GEO service</a> takes over after launch. We work with retailers across the <a href="/sectors/ecommerce/">ecommerce sector</a> and service businesses alike. See our <a href="/pricing/">pricing</a> or <a href="/contact/">book a free discovery call</a> to plan your project.</p>

<h2>FAQs</h2>
<h3>Will redesigning my website affect my SEO?</h3>
<p>It can, positively or negatively. With careful URL mapping, redirects, content carry-over and testing, a redesign can maintain or improve rankings.</p>
<h3>What is a 301 redirect?</h3>
<p>A 301 redirect permanently sends visitors and search engines from an old URL to a new one, passing on most of the old page's ranking signals.</p>
<h3>How long does it take for rankings to recover after a migration?</h3>
<p>Well-planned migrations often settle within a few weeks. If mistakes were made, recovery can take longer once they are fixed.</p>
<h3>Should I keep my URLs the same when redesigning?</h3>
<p>Wherever possible, yes. Keeping URLs unchanged is the simplest way to protect rankings. Change them only when there is a clear benefit.</p>
<h3>Do I need an SEO specialist for a website redesign?</h3>
<p>For any site that gets meaningful search traffic, it is strongly advisable. The cost of planning is small compared with the cost of lost rankings.</p>
`,
};
