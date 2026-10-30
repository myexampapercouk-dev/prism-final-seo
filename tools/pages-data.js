// Service, sector and pricing pages. Add a page here, then run: node tools/build-pages.js
// Fields: type (service|sector|pricing), path, name, seoTitle (<= 60), description (<= 160), eyebrow, h1, lead,
// sections [{ eyebrow?, h2, lead?, html }], faqs [[q, a]], related [paths of other pages].
// Only use facts from the live site / business-info/FACTS.md: no invented results, clients, stats or prices.
const cards = items => `<div class="pws-grid">${items.map(([t, d], i) => `<div class="pws-card"><div class="pws-icon${i % 3 ? ' c' + (i % 3 + 1) : ''}">${String(i + 1).padStart(2, '0')}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>`;
const steps = items => `<div class="pws-steps">${items.map(([t, d]) => `<div class="pws-step"><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>`;
const prose = html => `<div class="pws-prose">${html}</div>`;
const two = (a, b) => `<div class="pws-two"><div class="pws-box"><h3>${a[0]}</h3><ul class="pws-checks">${a[1].map(x => `<li>${x}</li>`).join('')}</ul></div><div class="pws-box"><h3>${b[0]}</h3><ul class="pws-checks">${b[1].map(x => `<li>${x}</li>`).join('')}</ul></div></div>`;
const PRICING_NOTE = prose(`<p>Ongoing work runs on a monthly retainer: <strong>Launch from &pound;350 a month</strong>, <strong>Growth from &pound;750 a month</strong> and <strong>Scale from &pound;1,500 a month</strong>. Website and ecommerce builds are separate projects with their own quote. Advertising spend is always paid separately by you, directly to the platform. See the full breakdown on our <a href="/pricing/">pricing page</a>.</p>`);

const SERVICES = [
  {
    type: 'service', path: '/services/seo-geo/', name: 'SEO &amp; GEO', serviceType: 'Search engine optimisation',
    seoTitle: 'SEO & GEO Agency UK | Prism Works Studio',
    description: 'SEO and generative engine optimisation for UK businesses: technical SEO, ecommerce SEO, content and visibility in Google AI Overviews and ChatGPT.',
    eyebrow: 'SEO &amp; GEO', h1: 'SEO &amp; GEO that builds lasting organic growth',
    lead: 'We build SEO strategies that create lasting organic growth, not quick wins that disappear overnight. Using AI-powered tools, technical analysis and commercial intent research, we help your business rank for the searches that drive revenue, and get cited in AI answers too.',
    sections: [
      { h2: 'What our SEO &amp; GEO service includes', lead: 'Every engagement starts with an audit and a plan. We then work through the fixes and content that will move the needle for your business first.', html: cards([
        ['Technical SEO', 'Audits of site speed, crawlability, indexation, Core Web Vitals, schema markup and site architecture, followed by the fixes that are holding rankings back.'],
        ['AI SEO', 'AI-assisted analysis of search patterns and content gaps, so keyword targeting and content plans are sharper and quicker to produce.'],
        ['GEO (Generative Engine Optimisation)', 'Structuring your content, entities and evidence so ChatGPT, Google AI Overviews and Perplexity can understand your brand and cite it in their answers.'],
        ['Ecommerce SEO', 'Category pages, product listings, faceted navigation and internal linking for Shopify and WooCommerce stores, plus marketplace listings.'],
        ['Local SEO', 'Google Business Profile, consistent business details and location pages for businesses that serve customers in particular towns and cities.'],
        ['International SEO', 'Hreflang, localised keyword research and international site structure, so the right page appears in the right country and language.'],
      ]) },
      { eyebrow: 'How it works', h2: 'Our SEO process', lead: 'SEO compounds over time. A clear process makes sure the effort goes into the pages and fixes that matter most.', html: steps([
        ['1. Audit and research', 'We crawl the site, review Search Console data and research the searches your buyers actually make, including the questions they ask AI assistants.'],
        ['2. Prioritised plan', 'You get a short, prioritised list: technical fixes, pages to improve, new pages to create and links worth earning. Each item has a clear reason.'],
        ['3. Fix and publish', 'We fix technical issues, improve titles, content and internal links, and publish new pages that answer buyer questions properly.'],
        ['4. Measure and refine', 'Monthly reporting focuses on the queries and pages that generate enquiries and sales, not vanity metrics, and the plan is adjusted as data comes in.'],
      ]) },
      { eyebrow: 'SEO vs GEO', h2: 'Why SEO and GEO belong together', html: prose(`<p>Search is no longer only ten blue links. Google AI Overviews, ChatGPT and Perplexity now answer many questions directly, and they draw on the same signals good SEO already builds: clear, well-structured pages, consistent facts about your business, expert content and mentions on trusted websites.</p><p>That is why we treat <strong>generative engine optimisation</strong> as part of SEO rather than a separate product. We make sure your key pages answer questions directly, that your organisation, services and prices are described consistently, and that structured data helps machines understand who you are. Read our guide to <a href="/blog/what-is-generative-engine-optimisation/">what GEO is and how it works</a> for more detail.</p><p>Authority still matters for both. Our <a href="/services/digital-pr-content/">digital PR and content</a> work earns the coverage and links that help pages rank and get cited.</p>`) },
      { eyebrow: 'Pricing', h2: 'What SEO costs', html: PRICING_NOTE + prose(`<p>For a fuller breakdown of how UK SEO is priced and what to expect at each level, see <a href="/blog/how-much-does-seo-cost-uk/">how much SEO costs in the UK</a>.</p>`) },
    ],
    faqs: [
      ['How long does SEO take to work?', 'SEO and paid media campaigns typically begin showing meaningful results within 3&ndash;6 months. Technical fixes can show sooner; competitive terms take longer. We never promise rankings we cannot control.'],
      ['What is GEO?', 'Generative engine optimisation is the work of making your brand visible and cited in AI-generated answers from tools such as ChatGPT, Google AI Overviews and Perplexity.'],
      ['Do you do SEO for Shopify and WooCommerce stores?', 'Yes. Ecommerce SEO covers category and product pages, site architecture, faceted navigation, structured data and speed for Shopify and WooCommerce stores.'],
      ['Will I get reports?', 'Yes. Reporting is included in our retainers and focuses on the searches, pages and enquiries that matter commercially.'],
      ['Can you help after a website redesign lost rankings?', 'Yes. We check redirects, indexation, internal links and content changes to find what was lost and fix it. Planning the migration properly in advance is even better.'],
    ],
    related: ['/services/digital-pr-content/', '/services/website-ecommerce-development/', '/sectors/ecommerce/', '/pricing/'],
  },
  {
    type: 'service', path: '/services/paid-media/', name: 'Paid Media', serviceType: 'Pay-per-click advertising management',
    seoTitle: 'Paid Media & PPC Agency UK | Prism Works Studio',
    description: 'Google Ads, Google Shopping, Meta, TikTok, LinkedIn and YouTube ads managed for UK businesses, with conversion tracking set up before spend scales.',
    eyebrow: 'Paid media', h1: 'Paid media that makes every pound of ad spend work harder',
    lead: 'We manage performance-driven paid media campaigns that put your brand in front of the right audience at the right moment. Whether you want leads, ecommerce sales or brand awareness, we combine smart targeting, compelling creative and rigorous optimisation.',
    sections: [
      { h2: 'Channels we manage', lead: 'We choose channels based on where your buyers are and how they buy, not on a fixed package.', html: cards([
        ['PPC (Google Ads &amp; Microsoft Ads)', 'Search campaigns that capture high-intent traffic: keyword strategy, ad copy, bid management and ongoing optimisation.'],
        ['Google Shopping Ads', 'Product-led campaigns built on a clean Merchant Center feed, so your catalogue appears in front of buyers searching to purchase.'],
        ['Meta Ads (Facebook &amp; Instagram)', 'Paid social with audience segmentation, creative testing and dynamic retargeting for ecommerce and lead generation.'],
        ['TikTok Ads', 'Reach customers where they spend their time, with creative built natively for the platform.'],
        ['LinkedIn Ads', 'Targeted campaigns that reach decision-makers by job title, industry and company size for qualified B2B leads.'],
        ['YouTube Ads', 'Video advertising that builds awareness and drives action, from short bumper ads to longer explainers.'],
      ]) },
      { eyebrow: 'How it works', h2: 'Tracking first, then scale', lead: 'Paid campaigns only improve when the data is right. That is why we add paid campaigns once conversion tracking works.', html: steps([
        ['1. Tracking and audit', 'We check GA4, conversion tags, Merchant Center and offline conversions, and fix gaps before any budget is increased.'],
        ['2. Strategy and structure', 'Campaigns are structured around your margins, products or services and buyer intent, with clear budgets and targets.'],
        ['3. Creative and landing pages', 'Ads and landing pages are built around a single goal. We A/B test messages and designs to improve conversion rates.'],
        ['4. Optimise and report', 'Search terms, audiences, bids and creative are reviewed continuously, and reporting shows cost per lead or return on ad spend in plain English.'],
      ]) },
      { eyebrow: 'Good fit', h2: 'Who paid media suits', html: two(['Works well when', ['You have a clear offer and a working website or store', 'Conversion tracking is in place (or you will let us set it up)', 'You can fund a test budget long enough to learn', 'You want results sooner than SEO alone can deliver']], ['Fix these first', ['A slow or confusing website that does not convert', 'No way to measure leads or sales', 'Unclear margins or pricing', 'Expecting guaranteed results in the first week']]) },
      { eyebrow: 'Pricing', h2: 'What paid media management costs', html: PRICING_NOTE + prose(`<p>Ads management is included in our <a href="/pricing/">Scale retainer</a>. Your advertising spend is paid directly to Google, Meta, TikTok or LinkedIn and is never marked up inside our fee. Retailers should also read our <a href="/blog/google-shopping-ads-guide-uk/">Google Shopping ads guide for UK retailers</a>.</p>`) },
    ],
    faqs: [
      ['Is ad spend included in your fee?', 'No. Advertising spend is paid separately by the client, directly to the ad platform. Our fee covers strategy, set-up and management.'],
      ['Which platform should I start with?', 'For most businesses with existing demand, Google Search or Google Shopping comes first because people are already looking. Meta and TikTok suit products that sell visually; LinkedIn suits B2B.'],
      ['How quickly will paid ads work?', 'Ads can bring traffic from day one, but campaigns need a learning period. Expect the first weeks to be about testing, then steady improvement as data builds.'],
      ['Can you take over my existing Google Ads account?', 'Yes. We start with an audit of tracking, structure and search terms, then fix wasted spend before making bigger changes. You keep ownership of the account.'],
      ['Do you build landing pages for ads?', 'Yes. Landing page design is part of our website service, and pages are built around a single goal and tested to improve conversion rates.'],
    ],
    related: ['/services/seo-geo/', '/services/website-ecommerce-development/', '/sectors/b2b/', '/pricing/'],
  },
  {
    type: 'service', path: '/services/digital-pr-content/', name: 'Digital PR &amp; Content', serviceType: 'Digital PR and content marketing',
    seoTitle: 'Digital PR & Content Marketing UK | Prism Works Studio',
    description: 'Digital PR and content marketing for UK brands: stories that earn coverage and quality backlinks, plus SEO-led articles and buying guides that rank.',
    eyebrow: 'Digital PR &amp; content', h1: 'Digital PR and content that build authority and rank',
    lead: 'We build your brand&rsquo;s authority online through strategic digital PR and content marketing. By earning coverage in quality publications and creating content that educates, engages and converts, we help your business become a trusted voice in its industry.',
    sections: [
      { h2: 'What is included', html: cards([
        ['Digital PR strategy', 'Story ideas built from your data, expertise and products, pitched to the publications, blogs and media outlets your customers read.'],
        ['Content marketing', 'SEO-informed blog articles, buying guides, pillar pages and video scripts that rank, earn links and build lasting trust.'],
        ['Thought leadership', 'Expert commentary and opinion pieces that put your knowledge in front of journalists and decision-makers.'],
        ['Ecommerce content', 'Buying guides, comparison pages and product content that help shoppers choose, and help search engines understand your range.'],
        ['Content refreshes', 'Updating existing pages that have slipped, so they answer today&rsquo;s questions and regain visibility.'],
        ['Content for AI answers', 'Clear, well-structured content with consistent facts that AI assistants can understand and cite.'],
      ]) },
      { eyebrow: 'How it works', h2: 'From idea to coverage', html: steps([
        ['1. Research', 'We look at what your audience searches, what journalists in your sector cover and where competitors earn links.'],
        ['2. Plan', 'A content calendar and PR angles agreed with you, with the number of posts and channels defined up front.'],
        ['3. Create', 'Articles, guides and press materials written in UK English, checked for accuracy and aligned to your brand voice.'],
        ['4. Promote and report', 'Outreach to relevant publications, internal linking from your own site, and reporting on coverage, links and traffic.'],
      ]) },
      { eyebrow: 'Why it matters', h2: 'Content and links are what move rankings', html: prose(`<p>Good technical SEO gets your site ready to rank, but authority decides who wins competitive searches. Quality links and brand mentions from relevant websites are one of the clearest signals of authority, and they also feed the sources AI assistants rely on.</p><p>Our approach is simple: create things worth covering, then tell the right people about them. We do not buy links or use private blog networks. For a practical overview, read our guide to <a href="/blog/digital-pr-link-building-uk/">digital PR for link building in the UK</a>, and see how it connects with <a href="/services/seo-geo/">SEO and GEO</a>.</p>`) },
      { eyebrow: 'Pricing', h2: 'What content and PR cost', html: PRICING_NOTE + prose(`<p>Our retainers include 4, 8 or 12 posts a month depending on the level. Digital PR campaigns are scoped individually.</p>`) },
    ],
    faqs: [
      ['What is the difference between digital PR and traditional PR?', 'Digital PR focuses on online coverage that earns links, mentions and search visibility, and its impact can be measured in rankings and referral traffic.'],
      ['Do you guarantee a number of links?', 'No. Coverage depends on editors and journalists. We never promise results we cannot control, but we do report every piece of coverage and link earned.'],
      ['How many blog posts do I need?', 'Our retainers include 4, 8 or 12 posts a month. Quality and relevance matter more than volume, so we agree the right number for your goals.'],
      ['Who writes the content?', 'Content is researched and written to brief in UK English, and reviewed against your input so facts about your business are accurate.'],
      ['Can you update my old blog posts?', 'Yes. Refreshing posts that already have some visibility is often quicker to pay off than writing new ones.'],
    ],
    related: ['/services/seo-geo/', '/services/brand-strategy/', '/sectors/saas/', '/pricing/'],
  },
  {
    type: 'service', path: '/services/website-ecommerce-development/', name: 'Website &amp; Ecommerce Development', serviceType: 'Website and ecommerce development',
    seoTitle: 'Shopify, WooCommerce & WordPress Development UK',
    description: 'Fast, conversion-focused websites and online stores on Shopify, WooCommerce and WordPress for UK businesses, from new builds to redesigns and migrations.',
    eyebrow: 'Website &amp; ecommerce development', h1: 'Websites and online stores built to convert',
    lead: 'We design and build high-performance websites and ecommerce stores on Shopify, WooCommerce and WordPress. Whether you sell 10 products or 10,000, every build prioritises user experience, mobile performance and a seamless checkout.',
    sections: [
      { h2: 'What we build', html: cards([
        ['Custom website design', 'Brand-led websites designed around your goals and audience, with clear layouts that guide visitors to enquire or buy.'],
        ['Shopify development', 'Store set-up, theme customisation, app integrations, Shopify Plus migrations and ongoing store management.'],
        ['WooCommerce development', 'Stores that combine the flexibility of WordPress with robust ecommerce, from simple shops to multi-variation catalogues.'],
        ['WordPress development', 'Corporate sites, blogs and membership platforms that are fast, secure and easy for your team to manage.'],
        ['Landing page design', 'High-converting pages built around a single goal for ads and campaigns, tested to reduce cost per acquisition.'],
        ['Redesign &amp; migration', 'UX, mobile and speed improvements with SEO preservation, so you do not lose existing rankings or traffic.'],
      ]) },
      { eyebrow: 'Platforms', h2: 'Shopify, WooCommerce or WordPress?', html: `<div class="pws-table-wrap"><table class="pws-table"><thead><tr><th>Platform</th><th>Best for</th><th>Things to know</th></tr></thead><tbody><tr><td>Shopify</td><td>Product brands that want a hosted, low-maintenance store</td><td>Monthly plan and app costs; checkout is handled by Shopify</td></tr><tr><td>WooCommerce</td><td>Sellers who want full control and already use WordPress</td><td>You manage hosting, updates and security (or we do)</td></tr><tr><td>WordPress</td><td>Service businesses, content-led sites and blogs</td><td>Flexible and easy to edit; quality hosting matters</td></tr></tbody></table></div>` + prose(`<p>Still deciding? Read our comparison of <a href="/blog/shopify-vs-woocommerce-uk/">Shopify vs WooCommerce for UK businesses</a>.</p>`) },
      { eyebrow: 'How it works', h2: 'Our build process', lead: 'Our process begins with a discovery call, then moves through research, wireframing, design, development and testing, keeping you involved at every stage.', html: steps([
        ['Research &amp; planning', 'Goals, competitors, audience and the pages or products you need, with integrations and scope defined up front.'],
        ['Concept &amp; design', 'Wireframes and designs for key pages, from home and category pages to product pages and checkout.'],
        ['Testing &amp; quality', 'Performance, accessibility and every step of the purchase journey tested before launch, on mobile and desktop.'],
        ['Help &amp; support', 'Training so you can manage products and content yourself, plus optional maintenance for updates, security and speed.'],
      ]) },
      { eyebrow: 'Pricing &amp; timelines', h2: 'What a website costs and how long it takes', html: prose(`<p>A <strong>small website starts from &pound;1,000&ndash;&pound;2,000</strong> and an <strong>ecommerce site from &pound;1,500&ndash;&pound;3,500</strong>, with product volume and apps scoped separately. A standard website typically takes 3&ndash;5 weeks; ecommerce builds range from 5&ndash;12 weeks depending on catalogue size and custom functionality. See <a href="/pricing/">pricing</a> and our guide to <a href="/blog/ecommerce-website-cost-uk/">ecommerce website costs in the UK</a>.</p>`) },
    ],
    faqs: [
      ['Can I update the website content myself?', 'Yes. We build on user-friendly platforms like Shopify, WooCommerce and WordPress, so you can manage products, update content and run promotions without coding. We also provide training.'],
      ['How long will my project take?', 'A standard website typically takes 3&ndash;5 weeks, while ecommerce builds range from 5&ndash;12 weeks depending on catalogue size and custom functionality.'],
      ['Can you redesign my existing website or store?', 'Yes. We audit your existing site for performance, UX, conversion and SEO issues, then build a new version, with redirects planned to protect rankings.'],
      ['Do you offer maintenance and support?', 'Yes. We offer ongoing maintenance for websites and stores, covering platform updates, security monitoring, performance and support.'],
      ['Do you migrate stores to Shopify?', 'Yes, including Shopify Plus migrations. We move products, customers and content where possible and map redirects from old URLs.'],
    ],
    related: ['/services/seo-geo/', '/services/paid-media/', '/sectors/ecommerce/', '/sectors/hospitality/'],
  },
  {
    type: 'service', path: '/services/brand-strategy/', name: 'Brand Strategy', serviceType: 'Brand strategy',
    seoTitle: 'Brand Strategy Agency UK | Prism Works Studio',
    description: 'Brand strategy for UK businesses: positioning, messaging and visual identity that give your website, ads and content one clear, consistent voice.',
    eyebrow: 'Brand strategy', h1: 'Brand strategy that makes every channel work together',
    lead: 'A clear brand makes every campaign easier. We help you define who you are for, what makes you different and how you sound, then carry that through your website, ads and content.',
    sections: [
      { h2: 'What brand strategy covers', html: cards([
        ['Positioning', 'Who you serve, the problem you solve and why customers should choose you over the alternatives.'],
        ['Messaging', 'Value proposition, key messages and proof points written for your buyers, ready to use on your website and in ads.'],
        ['Tone of voice', 'How your brand sounds, with simple guidelines and examples so everyone writes consistently.'],
        ['Visual identity', 'Logo, colour, typography and brand assets that work on screen, in social feeds and in print.'],
        ['Brand guidelines', 'A practical guide your team and suppliers can follow, not a document that sits in a drawer.'],
        ['Launch and rebrand', 'Rolling a new or refreshed brand out across your website, profiles and marketing without losing search visibility.'],
      ]) },
      { eyebrow: 'How it works', h2: 'Our brand process', html: steps([
        ['1. Discovery', 'Conversations with you and a look at customers, competitors and how people currently describe your business.'],
        ['2. Strategy', 'Positioning and messaging options, discussed and refined with you until they feel right and true.'],
        ['3. Identity', 'Visual concepts developed from the strategy, then applied to real examples such as web pages, ads and social posts.'],
        ['4. Roll-out', 'Guidelines, files and support to apply the brand across your website and marketing.'],
      ]) },
      { eyebrow: 'Why it matters', h2: 'Brand and performance are not opposites', html: prose(`<p>Strong positioning improves performance marketing: ads get clearer, landing pages convert better and content has a consistent point of view. It also helps with search and AI visibility, because a brand described the same way everywhere is easier for people and machines to understand and remember.</p><p>Brand work pairs naturally with <a href="/services/website-ecommerce-development/">website design</a> and <a href="/services/digital-pr-content/">content</a>. If you are choosing a partner for this, our guide on <a href="/blog/how-to-choose-a-digital-marketing-agency-uk/">how to choose a digital marketing agency in the UK</a> may help.</p>`) },
      { eyebrow: 'Pricing', h2: 'What brand strategy costs', html: prose(`<p>Brand strategy is scoped as a project, because the work depends on whether you need positioning only, a full identity or a rebrand roll-out. We agree the scope, deliverables and revisions before starting. Ongoing marketing can then run on one of our <a href="/pricing/">monthly retainers</a>.</p>`) },
    ],
    faqs: [
      ['Do I need brand strategy before a new website?', 'It helps. Even a short positioning and messaging exercise makes the website clearer and faster to build, because the words and priorities are agreed first.'],
      ['Do you design logos?', 'Yes. Visual identity, including logo, colours and typography, is part of brand strategy, developed from the positioning rather than in isolation.'],
      ['Will a rebrand hurt my SEO?', 'It can if domains, URLs or page content change without a plan. We map redirects and keep key content so search visibility carries over.'],
      ['How is brand strategy priced?', 'As a scoped project. We agree deliverables and revisions up front so there are no surprises.'],
      ['Can you work with our existing brand?', 'Yes. Many businesses need a sharper message rather than a new logo, and we will tell you honestly which you need.'],
    ],
    related: ['/services/website-ecommerce-development/', '/services/digital-pr-content/', '/sectors/hospitality/', '/sectors/education/'],
  },
];

// Sector pages
const sector = (o) => ({ type: 'sector', ...o });
const SECTORS = [
  sector({
    path: '/sectors/healthcare/', name: 'Health &amp; Healthcare', serviceName: 'Healthcare digital marketing', audience: 'Healthcare providers, private clinics and health-tech businesses',
    seoTitle: 'Healthcare Digital Marketing UK | Prism Works Studio',
    description: 'Digital marketing for UK private clinics, healthcare providers, wellness brands and health-tech: compliant, credible and conversion-focused.',
    eyebrow: 'Health &amp; healthcare', h1: 'Digital marketing for healthcare providers and private clinics',
    lead: 'Digital marketing for healthcare providers, wellness brands, private clinics and health-tech businesses that is compliant, credible and conversion-focused.',
    sections: [
      { h2: 'What healthcare marketing needs to get right', html: prose(`<p>Patients research carefully before they book. They want to know who will treat them, what a treatment involves, what it costs and whether the clinic is properly registered. Healthcare marketing also sits under rules that most sectors do not face, including the <strong>CAP Code</strong> and ASA guidance on health claims, and, depending on the service, professional body and regulator guidance.</p><p>We plan content and campaigns with those constraints in mind from the start: clear, factual service pages, careful claims and calls to action that respect patient choice.</p>`) },
      { eyebrow: 'Services', h2: 'How we help healthcare businesses', html: cards([
        ['Clinic websites', 'Fast, accessible websites with treatment pages, practitioner profiles and simple booking or enquiry routes.'],
        ['Local SEO', 'Google Business Profile, location pages and treatment content so nearby patients find you when they search.'],
        ['Paid search', 'Google Ads campaigns for high-intent treatment searches, within platform healthcare advertising policies.'],
        ['Content', 'Patient-friendly guides that answer common questions accurately, reviewed by your clinicians.'],
      ]) },
      { eyebrow: 'Approach', h2: 'Credibility first', html: two(['We focus on', ['Accurate, reviewable treatment information', 'Clear pricing information where you choose to publish it', 'Accessibility and mobile speed', 'Trust signals you genuinely hold']], ['We avoid', ['Exaggerated or guaranteed outcomes', 'Fake reviews or invented statistics', 'Pressure tactics in ads', 'Publishing anything without your sign-off']]) },
    ],
    faqs: [
      ['Can you market private clinics within advertising rules?', 'Yes. We write and review healthcare content with the CAP Code and platform healthcare policies in mind, and every claim is signed off by you before publishing.'],
      ['Do you build clinic websites?', 'Yes, on WordPress or another suitable platform, with treatment pages, practitioner profiles and enquiry or booking routes.'],
      ['How do patients find local clinics online?', 'Mostly through Google searches and Maps. Local SEO and a complete Google Business Profile are usually the first priorities.'],
      ['Can you run Google Ads for healthcare?', 'Yes, where the treatment is permitted to advertise. Some healthcare categories need certification or have restrictions, which we check first.'],
      ['Who checks medical accuracy?', 'Your clinicians. We write clear, plain-English content, but medical facts are always reviewed and approved by your team.'],
    ],
    related: ['/services/seo-geo/', '/services/website-ecommerce-development/', '/services/paid-media/', '/sectors/education/'],
  }),
  sector({
    path: '/sectors/hospitality/', name: 'Hospitality', serviceName: 'Hospitality digital marketing', audience: 'Hotels, restaurants, venues and hospitality groups',
    seoTitle: 'Hospitality Digital Marketing UK | Prism Works Studio',
    description: 'Websites, SEO and paid media for UK hotels, restaurants, venues and hospitality groups that want more direct bookings and less reliance on OTAs.',
    eyebrow: 'Hospitality', h1: 'Hospitality marketing that drives direct bookings',
    lead: 'Websites, SEO and paid media for hotels, restaurants, venues and hospitality groups looking to drive direct bookings and reduce reliance on online travel agents.',
    sections: [
      { h2: 'Win more bookings on your own website', html: prose(`<p>Commission paid to booking platforms and delivery apps eats into margins. Every guest who books directly is worth more to you and is easier to bring back. The challenge is that platforms spend heavily to appear first, so your own website has to be quick, clear and easy to book on, especially on a phone.</p><p>We focus on the basics that make the biggest difference: a fast mobile website with a booking button that is always visible, up-to-date menus and room pages, strong Google Business Profile listings and campaigns that target people searching for your type of venue nearby.</p>`) },
      { eyebrow: 'Services', h2: 'How we help hospitality businesses', html: cards([
        ['Hospitality websites', 'Mobile-first sites with booking engine or table reservation integration, menus, rooms, events and private hire pages.'],
        ['Local SEO', 'Google Business Profile, reviews strategy and location content so you appear in local searches and Maps.'],
        ['Paid media', 'Google Ads and Meta campaigns for brand searches, events, seasonal offers and private dining.'],
        ['Social and content', 'Content and social retainers that keep menus, events and offers in front of past and future guests.'],
      ]) },
      { eyebrow: 'Start focused', h2: 'Where we usually start', html: two(['Start with', ['Website improvement and a clear booking path', 'Local SEO and Google Business Profile', 'Social media retainers']], ['Add when needed', ['Paid campaigns, once conversion tracking works', 'Online shop for vouchers or merchandise', 'Simple automations such as booking follow-ups']]) },
    ],
    faqs: [
      ['How can a hotel get more direct bookings?', 'Make booking on your own site fast and obvious on mobile, keep rates competitive with OTAs, bid on your brand name in Google Ads and keep your Google Business Profile complete.'],
      ['Do you work with restaurants?', 'Yes. Restaurants are one of the business types we work with most, from websites and menus to local SEO and social retainers.'],
      ['Can you integrate my booking system?', 'Usually, yes. Most booking and reservation tools offer a widget or link that we integrate cleanly into the website.'],
      ['Is social media included?', 'Social media retainers are one of our core starting services for local businesses.'],
      ['Which retainer suits a single venue?', 'The Launch retainer is designed for small local businesses. See our pricing page for what each level includes.'],
    ],
    related: ['/services/website-ecommerce-development/', '/services/seo-geo/', '/services/paid-media/', '/pricing/'],
  }),
  sector({
    path: '/sectors/ecommerce/', name: 'Ecommerce', serviceName: 'Ecommerce marketing and development', audience: 'Online retailers and ecommerce brands',
    seoTitle: 'Ecommerce Marketing Agency UK | Prism Works Studio',
    description: 'Full-service ecommerce growth for UK online retailers: Shopify and WooCommerce builds, ecommerce SEO, Google Shopping, paid social and conversion optimisation.',
    eyebrow: 'Ecommerce', h1: 'Ecommerce growth from store build to sale',
    lead: 'Full-service ecommerce growth, from Shopify and WooCommerce development to ecommerce SEO, paid ads and conversion rate optimisation.',
    sections: [
      { h2: 'Everything an online store needs to grow', html: cards([
        ['Store builds', 'Shopify and WooCommerce stores with clean product filtering, secure payment gateways and an optimised checkout.'],
        ['Ecommerce SEO', 'Category and product page optimisation, site architecture and structured data so products appear in organic search.'],
        ['Google Shopping', 'Merchant Center feeds and Shopping and Performance Max campaigns for product-level visibility.'],
        ['Paid social', 'Meta and TikTok campaigns, including dynamic product ads and retargeting.'],
        ['Conversion optimisation', 'Testing product pages, delivery messaging and checkout steps to turn more visits into orders.'],
        ['Content', 'Buying guides and product content that help shoppers choose and support SEO.'],
      ]) },
      { eyebrow: 'UK ecommerce', h2: 'Built for UK shoppers', html: prose(`<p>UK shoppers expect clear delivery options and costs, easy returns, and familiar ways to pay such as cards, Apple Pay, Google Pay, PayPal and buy-now-pay-later options like Klarna or Clearpay. Prices should be shown including VAT for consumers, and stores need a clear privacy notice and cookie consent under UK GDPR and PECR.</p><p>We build these into the store and the marketing from day one. Choosing a platform? Compare <a href="/blog/shopify-vs-woocommerce-uk/">Shopify and WooCommerce</a>, and see what a build typically costs in our <a href="/blog/ecommerce-website-cost-uk/">ecommerce website cost guide</a>.</p>`) },
      { eyebrow: 'Pricing', h2: 'Ecommerce pricing', html: PRICING_NOTE },
    ],
    faqs: [
      ['Do you build on Shopify or WooCommerce?', 'Both. We recommend the platform that fits your catalogue, budget and how much control you want.'],
      ['How long does an ecommerce build take?', 'Ecommerce builds range from 5&ndash;12 weeks depending on catalogue size and custom functionality.'],
      ['Can you run Google Shopping for my store?', 'Yes. We set up or audit your Merchant Center feed and manage Shopping and Performance Max campaigns.'],
      ['Do you help with marketplace listings?', 'Our ecommerce SEO covers marketplace listings such as Amazon and eBay as well as your own store.'],
      ['Can you improve my store without rebuilding it?', 'Often, yes. Speed, product page and checkout improvements can make a real difference before a full rebuild is needed.'],
    ],
    related: ['/services/website-ecommerce-development/', '/services/paid-media/', '/services/seo-geo/', '/pricing/'],
  }),
  sector({
    path: '/sectors/financial-advisers/', name: 'Financial Advisers', serviceName: 'Digital marketing for financial advisers', audience: 'IFAs, wealth managers, mortgage brokers and financial services firms',
    seoTitle: 'Marketing for Financial Advisers UK | Prism Works Studio',
    description: 'Digital marketing for UK IFAs, wealth managers and mortgage brokers, planned around FCA financial promotion rules and Consumer Duty to win qualified leads.',
    eyebrow: 'Financial advisers', h1: 'Digital marketing for financial advisers and brokers',
    lead: 'Digital marketing for IFAs, wealth managers, mortgage brokers and financial services businesses seeking qualified leads, planned around FCA rules from the start.',
    sections: [
      { h2: 'Marketing within the rules', html: prose(`<p>Websites, ads, social posts and emails from regulated firms are financial promotions, so they must be fair, clear and not misleading, with appropriate risk warnings and balance. Consumer Duty raises the bar further on how clearly you communicate with customers.</p><p>We write and build with this in mind, and we always route content through your compliance sign-off process before anything is published. We are a marketing agency, not a compliance adviser, so final approval stays with your firm or network.</p><p>For more detail, read our guide to <a href="/blog/fca-compliant-marketing-financial-advisers/">FCA-compliant marketing for financial advisers</a>.</p>`) },
      { eyebrow: 'Services', h2: 'How we help advice firms', html: cards([
        ['Adviser websites', 'Clear service pages, adviser profiles, fee information and enquiry routes, with required disclosures in the right places.'],
        ['Local and niche SEO', 'Content for the specific advice areas and towns you serve, such as pensions, retirement or protection.'],
        ['LinkedIn and Google Ads', 'Campaigns for qualified enquiries, built with platform financial services policies in mind.'],
        ['Content', 'Plain-English guides that explain topics without giving personal advice.'],
      ]) },
    ],
    faqs: [
      ['Is our website a financial promotion?', 'Generally, marketing content from regulated firms is treated as a financial promotion. Your compliance team or network should approve it; we prepare content to make that process straightforward.'],
      ['Can you guarantee FCA compliance?', 'No marketing agency can. We write carefully and follow your compliance process, but sign-off is always your firm&rsquo;s responsibility.'],
      ['Which channels work for IFAs?', 'Search (for people actively looking for advice), LinkedIn (for professional audiences) and referrals supported by a credible website usually work best.'],
      ['Do you work with mortgage brokers?', 'Yes. Mortgage brokers, IFAs and wealth managers are all part of this sector.'],
      ['Can you write blog content for us?', 'Yes. Educational content works well for advice firms, as long as it informs rather than gives personal recommendations.'],
    ],
    related: ['/services/seo-geo/', '/services/paid-media/', '/services/digital-pr-content/', '/sectors/b2b/'],
  }),
  sector({
    path: '/sectors/saas/', name: 'SaaS Companies', serviceName: 'SaaS marketing', audience: 'B2B and B2C SaaS businesses',
    seoTitle: 'SaaS Marketing Agency UK | Prism Works Studio',
    description: 'Demand generation, SEO, content and paid media for UK B2B and B2C SaaS businesses focused on trial sign-ups, demos and MRR growth.',
    eyebrow: 'SaaS', h1: 'SaaS marketing focused on trials, demos and MRR',
    lead: 'Demand generation, content marketing, SEO and paid media for B2B and B2C SaaS businesses focused on trial sign-ups, demos and recurring revenue growth.',
    sections: [
      { h2: 'Growth channels for software businesses', html: cards([
        ['SEO and GEO', 'Product, feature, use-case and comparison pages that rank in Google and get cited in AI answers when buyers research tools.'],
        ['Content marketing', 'Guides, templates and thought leadership that build trust and earn links in your category.'],
        ['Paid acquisition', 'Google Ads for high-intent searches and LinkedIn Ads for decision-makers, measured against trials and demos.'],
        ['Conversion', 'Pricing pages, sign-up flows and demo booking pages tested to turn visits into pipeline.'],
      ]) },
      { eyebrow: 'Measurement', h2: 'Measure what matters', html: prose(`<p>Traffic is not the goal; trials, demos and paying customers are. We set up GA4 and conversion tracking around sign-ups and demo requests, and, where your CRM allows, pass outcomes back so campaigns can optimise for revenue rather than clicks.</p><p>Software buyers increasingly ask AI assistants for tool recommendations, so clear comparison and use-case content matters more than ever. See our guide to <a href="/blog/what-is-generative-engine-optimisation/">generative engine optimisation</a> and how we approach <a href="/services/seo-geo/">SEO and GEO</a>.</p>`) },
    ],
    faqs: [
      ['Do you work with early-stage SaaS?', 'Yes. Early-stage companies often benefit most from focused SEO and content around specific use cases before scaling paid acquisition.'],
      ['Can you write comparison pages?', 'Yes, written factually and fairly. Comparison and alternatives pages are often among the highest-intent pages a SaaS site has.'],
      ['Which ad platforms suit SaaS?', 'Google Search for active demand and LinkedIn for B2B decision-makers are the usual starting points; Meta can work for B2C products.'],
      ['How do you report results?', 'Around trials, demos and pipeline wherever tracking allows, alongside rankings and traffic.'],
      ['Do you build SaaS marketing websites?', 'Yes, typically on WordPress, with fast pages, clear pricing and easy demo or trial sign-up.'],
    ],
    related: ['/services/seo-geo/', '/services/digital-pr-content/', '/services/paid-media/', '/sectors/b2b/'],
  }),
  sector({
    path: '/sectors/b2b/', name: 'B2B', serviceName: 'B2B lead generation', audience: 'B2B companies targeting business decision-makers',
    seoTitle: 'B2B Lead Generation & Marketing UK | Prism Works Studio',
    description: 'Lead generation, LinkedIn marketing, SEO and account-based marketing for UK B2B companies that need qualified enquiries from business decision-makers.',
    eyebrow: 'B2B', h1: 'B2B marketing that generates qualified leads',
    lead: 'Lead generation, LinkedIn marketing, SEO and account-based marketing strategies for B2B companies targeting business decision-makers.',
    sections: [
      { h2: 'Reach the people who sign off', html: prose(`<p>B2B buying involves several people and a longer sales cycle. Buyers research independently, compare suppliers and often decide on a shortlist before speaking to sales. Your website and content need to answer their questions early, and your campaigns need to reach the right job titles in the right companies.</p><p>We combine search, LinkedIn and content so you are visible both when buyers are actively searching and while they are still building a shortlist. See our guide to <a href="/blog/linkedin-ads-b2b-lead-generation-uk/">LinkedIn Ads for B2B lead generation</a>.</p>`) },
      { eyebrow: 'Services', h2: 'How we help B2B companies', html: cards([
        ['B2B SEO', 'Service, industry and problem-led pages that rank for the searches your buyers make.'],
        ['LinkedIn marketing', 'LinkedIn Ads and company content targeted by job title, industry and company size.'],
        ['Account-based marketing', 'Focused campaigns for a defined list of target accounts, aligned with your sales team.'],
        ['Lead capture', 'Landing pages, forms and CRM integration so every enquiry is tracked and followed up.'],
      ]) },
    ],
    faqs: [
      ['Is LinkedIn worth it for B2B?', 'For many B2B offers, yes, because of its job-title and company targeting. Costs per click are higher, so offers and landing pages must be strong.'],
      ['How long is a B2B SEO campaign?', 'SEO typically begins showing meaningful results within 3&ndash;6 months, and B2B sales cycles add time before revenue shows.'],
      ['Can you connect forms to our CRM?', 'Yes, in most cases, so leads are recorded and attributed to their source.'],
      ['What is account-based marketing?', 'A focused approach that targets a defined list of companies with tailored campaigns, rather than a broad audience.'],
      ['Do you write B2B content?', 'Yes: service pages, guides, case studies (with your client&rsquo;s permission) and thought leadership.'],
    ],
    related: ['/services/paid-media/', '/services/seo-geo/', '/services/digital-pr-content/', '/sectors/saas/'],
  }),
  sector({
    path: '/sectors/education/', name: 'Education &amp; Training', serviceName: 'Education marketing', audience: 'Training providers, e-learning platforms and education organisations',
    seoTitle: 'Education & Training Marketing UK | Prism Works Studio',
    description: 'Digital marketing for UK training providers, e-learning platforms, universities and professional development organisations seeking course enrolments.',
    eyebrow: 'Education &amp; training', h1: 'Education marketing that fills courses',
    lead: 'Digital marketing for training providers, e-learning platforms, universities and professional development organisations seeking course enrolments.',
    sections: [
      { h2: 'From course search to enrolment', html: prose(`<p>Learners compare courses on outcomes, format, dates, price and accreditation. Course pages that answer those questions clearly, and make it easy to enquire or book, convert better than a general prospectus. Many searches are very specific, such as a qualification name plus a location or &ldquo;online&rdquo;, which makes SEO and paid search a natural fit.</p><p>We build course pages with structured information, run search and social campaigns around intake dates, and track enquiries and enrolments back to the channel that produced them.</p>`) },
      { eyebrow: 'Services', h2: 'How we help education providers', html: cards([
        ['Course pages and websites', 'Clear course pages with dates, format, price, entry requirements and enquiry or booking routes.'],
        ['SEO', 'Content for qualification, subject and location searches, plus structured data for courses where appropriate.'],
        ['Paid search and social', 'Campaigns timed around intakes and enrolment windows, with tracking to enrolment.'],
        ['E-learning stores', 'Selling courses online through WooCommerce or another suitable platform.'],
      ]) },
    ],
    faqs: [
      ['Can you market accredited courses?', 'Yes. We describe accreditations accurately and only as you hold them.'],
      ['Do you build sites to sell online courses?', 'Yes, using WordPress with WooCommerce or a learning platform integration, depending on your needs.'],
      ['When should course campaigns start?', 'Ahead of each intake, giving enough time for research and enquiries; we plan timing around your calendar.'],
      ['Do you work with universities?', 'Our sector focus includes universities, training providers, e-learning platforms and professional development organisations.'],
      ['How do you measure success?', 'By enquiries and enrolments wherever tracking allows, not just traffic.'],
    ],
    related: ['/services/seo-geo/', '/services/paid-media/', '/services/website-ecommerce-development/', '/sectors/healthcare/'],
  }),
];

const PRICING = {
  type: 'pricing', path: '/pricing/', name: 'Pricing',
  seoTitle: 'Digital Marketing Pricing & Retainers | Prism Works Studio',
  description: 'Clear starting prices: Launch retainer from £350/month, Growth from £750/month, Scale from £1,500/month, plus website and ecommerce project costs.',
  eyebrow: 'Packages &amp; pricing', h1: 'Clear packages. Honest starting prices.',
  lead: 'Starting prices to help you plan. Final prices reflect scope, hours, complexity and the outcome you are after.',
  offers: [['Launch retainer', '350', 'Best for small local businesses: 4 posts a month, basic local SEO, monthly report'], ['Growth retainer', '750', 'Best for established SMEs: 8 posts a month, SEO, tracking set-up, regular review'], ['Scale retainer', '1500', 'Best for growing businesses: 12 posts a month, SEO, ads management, reporting']],
  sections: [
    { eyebrow: 'Monthly retainers', h2: 'Monthly retainers', html: `<div class="pws-plans"><div class="pws-plan"><h3>Launch retainer</h3><p class="pws-for">Best for small local businesses</p><div class="pws-price"><span>&pound;</span>350<small>/month</small></div><ul><li>4 posts a month</li><li>Basic local SEO</li><li>Monthly report</li></ul><a class="pws-btn pws-btn-ghost" href="/contact/">Choose Launch retainer</a></div><div class="pws-plan featured"><span class="pws-plan-tag">Most popular</span><h3>Growth retainer</h3><p class="pws-for">Best for established SMEs</p><div class="pws-price"><span>&pound;</span>750<small>/month</small></div><ul><li>8 posts a month</li><li>SEO</li><li>Tracking set-up</li><li>Regular review</li></ul><a class="pws-btn pws-btn-primary" href="/contact/">Choose Growth retainer</a></div><div class="pws-plan"><h3>Scale retainer</h3><p class="pws-for">Best for growing businesses</p><div class="pws-price"><span>&pound;</span>1,500<small>/month</small></div><ul><li>12 posts a month</li><li>SEO</li><li>Ads management</li><li>Reporting</li></ul><a class="pws-btn pws-btn-ghost" href="/contact/">Choose Scale retainer</a></div></div><p class="pws-note">Retainers are billed in advance. Post counts, channels, revisions and response times are defined in your agreement.</p>` },
    { eyebrow: 'One-off projects', h2: 'One-off projects', html: `<div class="pws-table-wrap"><table class="pws-table"><thead><tr><th>Project</th><th>Starting price</th><th>Best for</th><th>Scope guardrail</th></tr></thead><tbody><tr><td>Small website</td><td class="p">&pound;1,000&ndash;&pound;2,000</td><td>Service business</td><td>Define pages, revisions and integrations</td></tr><tr><td>E-commerce site</td><td class="p">&pound;1,500&ndash;&pound;3,500</td><td>Online seller</td><td>Product volume and apps scoped separately</td></tr><tr><td>Automation project</td><td class="p">Quote by scope</td><td>Manual workflow pain</td><td>Document requirements, test and hand over</td></tr></tbody></table></div>` + prose(`<p>Not sure which project you need? Read <a href="/blog/ecommerce-website-cost-uk/">how much an ecommerce website costs in the UK</a> or explore <a href="/services/website-ecommerce-development/">website and ecommerce development</a>.</p>`) },
    { eyebrow: 'Package guardrails', h2: 'Package guardrails', html: `<div class="pws-rules"><div><span>01</span><p>Advertising spend is paid separately by the client.</p></div><div><span>02</span><p>We define post count, channels, revisions and response times up front.</p></div><div><span>03</span><p>Website builds and major technical work are separate projects.</p></div><div><span>04</span><p>Deposits are collected for projects; retainers are billed in advance.</p></div><div><span>05</span><p>We never promise rankings, sales or results we cannot control.</p></div></div>` },
  ],
  faqs: [
    ['How much does a digital marketing retainer cost?', 'Our retainers start at &pound;350 a month (Launch), &pound;750 a month (Growth) and &pound;1,500 a month (Scale). Final prices reflect scope and complexity.'],
    ['Is advertising spend included?', 'No. Advertising spend is paid separately by the client, directly to the ad platforms.'],
    ['How much does a website cost?', 'A small website starts from &pound;1,000&ndash;&pound;2,000 and an ecommerce site from &pound;1,500&ndash;&pound;3,500, with product volume and apps scoped separately.'],
    ['How is payment taken?', 'Deposits are collected for projects; retainers are billed in advance.'],
    ['Do you guarantee results?', 'No. We never promise rankings, sales or results we cannot control. We do commit to clear scope, reporting and regular reviews.'],
  ],
  related: ['/services/seo-geo/', '/services/paid-media/', '/services/website-ecommerce-development/', '/services/digital-pr-content/'],
};

module.exports = [...SERVICES, ...SECTORS, PRICING];
