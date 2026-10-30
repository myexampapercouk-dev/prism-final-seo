// Blog posts. Each post is one file in tools/posts/<slug>.js exporting:
// { slug, seoTitle (<= 60), title, description (<= 160), date, updated?, category, related: [money page paths], takeaways: [3], body }
// body: article HTML (<h2>, <h3>, <p>, <ul>, <ol>, <table>, <blockquote>); must end with <h2>FAQs</h2> + 5 x <h3>question</h3><p>answer</p>.
// Add a post: create the file (or apply a draft with docs/agents/apply-drafts.js), then run node tools/build-pages.js
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'posts');
module.exports = fs.readdirSync(DIR).filter(f => f.endsWith('.js')).map(f => require(path.join(DIR, f)))
  .sort((a, b) => (b.date + b.slug).localeCompare(a.date + a.slug));
