<?php
/**
 * Free SEO audit + lead capture (standalone tool, seo-audit-tool/public).
 *
 * POST: url, name, email, phone (optional), business (optional), consent=1
 * 1. Validates the lead and the URL (http/https only, public IPs only: no SSRF into private networks).
 * 2. Fetches the page, robots.txt and sitemap, and checks up to 15 internal links.
 * 3. Scores ~30 checks into themes (Crawlability, HTTPS & security, On-page, Content,
 *    Internal linking, Markup & social, Mobile & performance), each as error / warning / notice.
 * 4. Emails the lead + summary to the owner, appends it to seo-audit-tool/private/audit-leads.csv
 *    (outside the web root), and returns the JSON report.
 * Speed (Core Web Vitals) is added in the browser from Google PageSpeed Insights.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');
require __DIR__ . '/_mail.php';

function reply($code, $body) {
	// every real submission emails the team, even when the audit itself cannot run
	if (!empty($GLOBALS['pendingLead'])) {
		$l = $GLOBALS['pendingLead'];
		$GLOBALS['pendingLead'] = null;
		$t = "New free SEO audit lead (the audit could not finish)

";
		foreach ([['Name', $l['name']], ['Email', $l['email']], ['Phone', $l['phone']], ['Business', $l['business']], ['Website entered', $l['url']]] as $r) if ($r[1] !== '') $t .= "{$r[0]}: {$r[1]}
";
		$t .= "
What the visitor saw: " . ($body['error'] ?? 'unknown error') . "
Follow up personally: their site may be down, blocking bots or mistyped.
";
		prism_mail('SEO audit lead: ' . $l['name'] . ' (' . $l['url'] . ', audit failed)', $t, $l['email']);
	}
	http_response_code($code);
	echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
	exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
	reply(405, ['ok' => false, 'error' => 'Method not allowed']);
}
if (!function_exists('curl_init')) {
	reply(500, ['ok' => false, 'error' => 'The audit is unavailable right now.']);
}
@set_time_limit(60);

$data = $_POST;
if (!$data && stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
	$data = json_decode(file_get_contents('php://input'), true) ?: [];
}
if (!empty($data['company_website'])) {
	reply(200, ['ok' => false, 'error' => 'Please try again.']); // honeypot
}
$clip = function ($key, $max) use ($data) {
	$v = isset($data[$key]) && is_string($data[$key]) ? trim($data[$key]) : '';
	return mb_substr($v, 0, $max, 'UTF-8');
};
$lead = [
	'name'     => $clip('name', 120),
	'email'    => $clip('email', 160),
	'phone'    => $clip('phone', 40),
	'business' => $clip('business', 120),
	'url'      => $clip('url', 300),
];
if ($lead['name'] === '' || !preg_match('/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/', $lead['email'])) {
	reply(400, ['ok' => false, 'error' => 'Please enter your name and a valid email address.']);
}
if (empty($data['consent'])) {
	reply(400, ['ok' => false, 'error' => 'Please tick the box so we can send you your report.']);
}

// Flood protection: 4 audits per IP per 10 minutes
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/prism-audit-' . md5($ip);
$hits = array_filter(explode(',', (string) @file_get_contents($rateFile)), function ($t) { return $t !== '' && (int) $t > time() - 600; });
if (count($hits) >= 4) {
	reply(429, ['ok' => false, 'error' => 'You have run several audits in a short time. Please try again in 10 minutes.']);
}
$GLOBALS['pendingLead'] = $lead;
$hits[] = time();
@file_put_contents($rateFile, implode(',', $hits));

// ---------- safe fetching ----------
// Use the OS certificate store when PHP has no CA bundle configured (local Windows dev). No effect elsewhere.
function tls_opts() {
	return (!ini_get('curl.cainfo') && defined('CURLSSLOPT_NATIVE_CA') && stripos(PHP_OS, 'WIN') === 0) ? [CURLOPT_SSL_OPTIONS => CURLSSLOPT_NATIVE_CA] : [];
}
function normalise_url($u) {
	$u = trim($u);
	if (!preg_match('#^https?://#i', $u)) {
		$u = 'https://' . $u;
	}
	$p = parse_url($u);
	if (!$p || empty($p['host']) || !in_array(strtolower($p['scheme']), ['http', 'https'], true) || isset($p['user']) || isset($p['pass'])) {
		return null;
	}
	if (isset($p['port']) && !in_array((int) $p['port'], [80, 443], true)) {
		return null;
	}
	$host = strtolower($p['host']);
	if (!preg_match('/^(?=.{1,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/', $host)) {
		return null; // needs a real domain name, not an IP or localhost
	}
	return strtolower($p['scheme']) . '://' . $host . ($p['path'] ?? '/') . (isset($p['query']) ? '?' . $p['query'] : '');
}

/** Resolves a host to one public IP, or null if any address is private/reserved. */
function public_ip($host) {
	$ips = [];
	foreach ((array) @dns_get_record($host, DNS_A | DNS_AAAA) as $r) {
		if (!empty($r['ip'])) $ips[] = $r['ip'];
		if (!empty($r['ipv6'])) $ips[] = $r['ipv6'];
	}
	if (!$ips) {
		$ips = (array) @gethostbynamel($host);
	}
	if (!$ips) {
		return null;
	}
	foreach ($ips as $a) {
		if (!filter_var($a, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
			return null;
		}
	}
	foreach ($ips as $a) {
		if (filter_var($a, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) return $a;
	}
	return $ips[0];
}

/** GET with manual, re-validated redirects. Returns [status, finalUrl, headers(lowercase), body, ms, hops, error]. */
function safe_get($url, $maxBytes = 3000000, $timeout = 12, $headOnly = false) {
	$hops = [];
	$start = microtime(true);
	for ($i = 0; $i < 6; $i++) {
		$p = parse_url($url);
		$host = strtolower($p['host'] ?? '');
		$ip = $host ? public_ip($host) : null;
		if (!$ip) {
			return [0, $url, [], '', 0, $hops, 'blocked'];
		}
		$port = ($p['scheme'] === 'https') ? 443 : 80;
		$headers = [];
		$body = '';
		$ch = curl_init($url);
		curl_setopt_array($ch, tls_opts());
		curl_setopt_array($ch, [
			CURLOPT_RESOLVE        => ["{$host}:{$port}:" . (strpos($ip, ':') !== false ? "[{$ip}]" : $ip)],
			CURLOPT_FOLLOWLOCATION => false,
			CURLOPT_NOBODY         => $headOnly,
			CURLOPT_TIMEOUT        => $timeout,
			CURLOPT_CONNECTTIMEOUT => 6,
			CURLOPT_PROTOCOLS      => CURLPROTO_HTTP | CURLPROTO_HTTPS,
			CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; PrismSEOAudit/1.0; +https://prismworksstudio.co.uk/free-seo-audit/)',
			CURLOPT_ENCODING       => '',
			CURLOPT_HEADERFUNCTION => function ($ch, $h) use (&$headers) {
				$parts = explode(':', $h, 2);
				if (count($parts) === 2) $headers[strtolower(trim($parts[0]))] = trim($parts[1]);
				return strlen($h);
			},
			CURLOPT_WRITEFUNCTION  => function ($ch, $chunk) use (&$body, $maxBytes) {
				$body .= $chunk;
				return strlen($body) > $maxBytes ? 0 : strlen($chunk);
			},
		]);
		curl_exec($ch);
		$code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
		$err = curl_errno($ch);
		curl_close($ch);
		if ($code === 0) {
			return [0, $url, [], '', round((microtime(true) - $start) * 1000), $hops, $err ? 'unreachable' : 'empty'];
		}
		if ($code >= 300 && $code < 400 && !empty($headers['location'])) {
			$next = resolve_url($url, $headers['location']);
			$next = $next ? normalise_url($next) : null;
			if (!$next) {
				return [$code, $url, $headers, '', 0, $hops, 'bad redirect'];
			}
			$hops[] = [$code, $url];
			$url = $next;
			continue;
		}
		return [$code, $url, $headers, $body, round((microtime(true) - $start) * 1000), $hops, null];
	}
	return [0, $url, [], '', 0, $hops, 'too many redirects'];
}

function resolve_url($base, $rel) {
	$rel = trim(html_entity_decode($rel, ENT_QUOTES));
	if ($rel === '' || preg_match('#^(mailto:|tel:|javascript:|data:|\#)#i', $rel)) return null;
	if (preg_match('#^https?://#i', $rel)) return $rel;
	$b = parse_url($base);
	$root = $b['scheme'] . '://' . $b['host'];
	if (strpos($rel, '//') === 0) return $b['scheme'] . ':' . $rel;
	if ($rel[0] === '/') return $root . $rel;
	$dir = preg_replace('#/[^/]*$#', '/', $b['path'] ?? '/');
	return $root . $dir . $rel;
}

$url = normalise_url($lead['url']);
if (!$url) {
	reply(400, ['ok' => false, 'error' => 'Please enter a valid website address, for example yourbusiness.com']);
}

[$status, $final, $hdr, $html, $ms, $hops, $err] = safe_get($url);
if ($err === 'blocked') {
	reply(400, ['ok' => false, 'error' => 'We could not find that website. Please check the address.']);
}
if ($status === 0 || $html === '') {
	reply(422, ['ok' => false, 'error' => 'We could not reach that website. It may be offline or blocking automated checks.']);
}

$fp = parse_url($final);
$origin = $fp['scheme'] . '://' . $fp['host'];
$isHttps = $fp['scheme'] === 'https';

// ---------- parse HTML ----------
libxml_use_internal_errors(true);
$dom = new DOMDocument();
$dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
$xp = new DOMXPath($dom);
$q = function ($expr) use ($xp) { return $xp->query($expr); };
$attr = function ($expr, $name) use ($q) { $n = $q($expr); return $n && $n->length ? trim($n->item(0)->getAttribute($name)) : ''; };
$txt = function ($node) { return trim(preg_replace('/\s+/u', ' ', $node->textContent)); };

$title = ($t = $q('//title')) && $t->length ? $txt($t->item(0)) : '';
$titleCount = $q('//title')->length;
$desc = $attr('//meta[translate(@name,"DESCRIPTION","description")="description"]', 'content');
$descCount = $q('//meta[translate(@name,"DESCRIPTION","description")="description"]')->length;
$robotsMeta = strtolower($attr('//meta[translate(@name,"ROBOTS","robots")="robots"]', 'content') . ' ' . ($hdr['x-robots-tag'] ?? ''));
$canonical = $attr('//link[translate(@rel,"CANONICAL","canonical")="canonical"]', 'href');
$viewport = $attr('//meta[@name="viewport"]', 'content');
$lang = $attr('//html', 'lang');
$charset = $q('//meta[@charset]')->length || stripos($hdr['content-type'] ?? '', 'charset') !== false || $q('//meta[@http-equiv and contains(translate(@content,"CHARSET","charset"),"charset")]')->length;
$h1s = [];
foreach ($q('//h1') as $n) $h1s[] = $txt($n);
$h2Count = $q('//h2')->length;
$imgs = $q('//img');
$imgNoAlt = 0;
$items = [];
$it = function ($id, $v) use (&$items) { $v = trim(preg_replace('/\s+/u', ' ', (string) $v)); if (count($items[$id] ?? []) < 30) $items[$id][] = mb_substr($v, 0, 220); };
$short = function ($u) { $p = parse_url($u); return ($p['path'] ?? '/') . (isset($p['query']) ? '?' . $p['query'] : ''); };
foreach ($imgs as $im) if (!$im->hasAttribute('alt')) { $imgNoAlt++; $it('alt', 'Image: ' . ($im->getAttribute('src') ?: $im->getAttribute('data-src') ?: '(no src)')); }
$favicon = $q('//link[contains(translate(@rel,"ICON","icon"),"icon")]')->length > 0;
$og = ['title' => $attr('//meta[@property="og:title"]', 'content'), 'description' => $attr('//meta[@property="og:description"]', 'content'), 'image' => $attr('//meta[@property="og:image"]', 'content')];
$twitter = $attr('//meta[@name="twitter:card"]', 'content');
$hreflang = $q('//link[@hreflang]')->length;
$schemaTypes = [];
foreach ($q('//script[@type="application/ld+json"]') as $s) {
	$j = json_decode($s->textContent, true);
	if ($j === null) { $schemaTypes[] = '(invalid JSON)'; continue; }
	array_walk_recursive($j, function ($v, $k) use (&$schemaTypes) { if ($k === '@type' && is_string($v)) $schemaTypes[] = $v; });
}
$schemaTypes = array_values(array_unique($schemaTypes));
$microdata = $q('//*[@itemtype]')->length;
$schemaRaw = '';
foreach ($q('//script[@type="application/ld+json"]') as $s) $schemaRaw .= ' ' . $s->textContent;
$orgTypes = ['Organization', 'LocalBusiness', 'ProfessionalService', 'Corporation', 'Store', 'Restaurant', 'MedicalBusiness', 'LegalService', 'HomeAndConstructionBusiness', 'AutomotiveBusiness', 'FinancialService', 'RealEstateAgent', 'Dentist', 'Physician', 'HealthAndBeautyBusiness', 'FoodEstablishment', 'LodgingBusiness', 'SportsActivityLocation', 'EducationalOrganization', 'OnlineStore'];
$hasOrgSchema = (bool) array_intersect($orgTypes, $schemaTypes);

// assets and code (before scripts are stripped)
$hasDoctype = stripos(ltrim($html), '<!doctype html') === 0;
$renderBlocking = 0;
foreach ($q('//head/script[@src]') as $s) {
	if (!$s->hasAttribute('defer') && !$s->hasAttribute('async') && strtolower($s->getAttribute('type')) !== 'module') { $renderBlocking++; $it('render_block', 'Script: ' . $s->getAttribute('src')); }
}
$jsUrls = [];
foreach ($q('//script[@src]') as $s) if ($u = resolve_url($final, $s->getAttribute('src'))) $jsUrls[] = $u;
$cssUrls = [];
foreach ($q('//link[contains(translate(@rel,"STYLESHEET","stylesheet"),"stylesheet")][@href]') as $s) if ($u = resolve_url($final, $s->getAttribute('href'))) $cssUrls[] = $u;
$inlineJs = 0;
foreach ($q('//script[not(@src)]') as $s) if (strtolower($s->getAttribute('type')) !== 'application/ld+json') $inlineJs += strlen($s->textContent);
$inlineCss = 0;
foreach ($q('//style') as $s) $inlineCss += strlen($s->textContent);
$styleAttrs = $q('//*[@style]')->length;
$deprecatedTags = $q('//font|//center|//marquee|//blink|//frameset')->length;
$preconnect = $q('//link[@rel="preconnect" or @rel="dns-prefetch" or @rel="preload"]')->length;
$appleIcon = $q('//link[contains(@rel,"apple-touch-icon")]')->length > 0;
$themeColor = $attr('//meta[@name="theme-color"]', 'content');
$ogExtra = ['url' => $attr('//meta[@property="og:url"]', 'content'), 'type' => $attr('//meta[@property="og:type"]', 'content'), 'site' => $attr('//meta[@property="og:site_name"]', 'content')];
$twImage = $attr('//meta[@name="twitter:image"]', 'content');
$metaKeywords = $q('//meta[translate(@name,"KEYWORDS","keywords")="keywords"]')->length;
$iframesNoTitle = $q('//iframe[not(@title) or normalize-space(@title)=""]')->length;
$mapsEmbed = $q('//iframe[contains(@src,"google.com/maps") or contains(@src,"maps.google")]')->length + $q('//a[contains(@href,"google.com/maps") or contains(@href,"maps.app.goo.gl") or contains(@href,"goo.gl/maps")]')->length;
$telLinks = $q('//a[starts-with(translate(@href,"TEL","tel"),"tel:")]')->length;
$mailLinks = $q('//a[starts-with(translate(@href,"MAILTO","mailto"),"mailto:")]')->length;
$addressEl = $q('//address')->length;
$socialLinks = $q('//a[contains(@href,"facebook.com") or contains(@href,"instagram.com") or contains(@href,"linkedin.com") or contains(@href,"twitter.com") or contains(@href,"x.com/") or contains(@href,"youtube.com") or contains(@href,"tiktok.com")]')->length;

// headings
$levels = [];
$htexts = [];
$emptyHeadings = 0;
$questionHeadings = 0;
foreach ($q('//h1|//h2|//h3|//h4|//h5|//h6') as $h) {
	$levels[] = (int) substr($h->nodeName, 1);
	$ht = $txt($h);
	$htexts[] = $ht;
	if ($ht === '') { $emptyHeadings++; $it('empty_h', '<' . $h->nodeName . '> with class "' . $h->getAttribute('class') . '"'); }
	if (substr($ht, -1) === '?') $questionHeadings++;
}
$skips = 0;
for ($i = 1; $i < count($levels); $i++) if ($levels[$i] > $levels[$i - 1] + 1) { $skips++; $it('hierarchy', "H{$levels[$i-1]} \"" . mb_substr($htexts[$i - 1], 0, 60) . "\" is followed by H{$levels[$i]} \"" . mb_substr($htexts[$i], 0, 60) . '"'); }
foreach ($htexts as $i => $ht) $it('outline', str_repeat('  ', max(0, $levels[$i] - 1)) . "H{$levels[$i]}: " . ($ht === '' ? '(empty)' : $ht));

// images
$imgNoSize = 0; $imgLegacy = 0; $imgNoLazy = 0; $imgLongAlt = 0; $imgGenericName = 0; $imgUrls = [];
$ii = 0;
foreach ($imgs as $im) {
	$ii++;
	$src = $im->getAttribute('src') ?: $im->getAttribute('data-src');
	if (!$im->hasAttribute('width') || !$im->hasAttribute('height')) { $imgNoSize++; $it('img_size', $src); }
	$modern = preg_match('/\.(webp|avif|svg)(\?|$)/i', $src);
	if (!$modern && $im->parentNode && strtolower($im->parentNode->nodeName) === 'picture') {
		foreach ($im->parentNode->getElementsByTagName('source') as $so) if (preg_match('#image/(webp|avif)#', $so->getAttribute('type'))) $modern = true;
	}
	if (!$modern && preg_match('/\.(jpe?g|png|gif|bmp)(\?|$)/i', $src)) { $imgLegacy++; $it('img_format', $src); }
	if ($ii > 3 && strtolower($im->getAttribute('loading')) !== 'lazy') { $imgNoLazy++; $it('img_lazy', $src); }
	if (mb_strlen($im->getAttribute('alt')) > 125) { $imgLongAlt++; $it('img_alt_long', $src . ' (alt is ' . mb_strlen($im->getAttribute('alt')) . ' characters)'); }
	if (preg_match('#/(img|dsc|dscn|image|photo|screenshot|untitled|pxl)[-_ ]?\d+#i', $src)) { $imgGenericName++; $it('img_names', $src); }
	if ($src && ($u = resolve_url($final, $src))) $imgUrls[] = $u;
}
$imgUrls = array_values(array_unique($imgUrls));

// links: anchors, targets, external
$emptyAnchors = 0; $genericAnchors = 0; $unsafeBlank = 0; $httpLinks = 0; $externalUrls = []; $linkTotal = 0;
$generic = ['click here', 'here', 'read more', 'more', 'learn more', 'this', 'link', 'go', 'click', 'details', 'find out more'];
foreach ($q('//a[@href]') as $a) {
	$linkTotal++;
	$label = $txt($a);
	if ($label === '') {
		$label = trim($a->getAttribute('aria-label') . ' ' . $a->getAttribute('title'));
		foreach ($a->getElementsByTagName('img') as $im) $label .= $im->getAttribute('alt');
	}
	$href = trim($a->getAttribute('href'));
	if (trim($label) === '') { $emptyAnchors++; $it('anchors_empty', 'Link to ' . $href); }
	elseif (in_array(strtolower(trim($label, " .!>»→")), $generic, true)) { $genericAnchors++; $it('anchors_generic', '"' . trim($label) . '" links to ' . $href); }
	if (strtolower($a->getAttribute('target')) === '_blank' && !preg_match('/noopener|noreferrer/i', $a->getAttribute('rel'))) { $unsafeBlank++; $it('noopener', $href); }
	if ($isHttps && stripos($href, 'http://') === 0) { $httpLinks++; $it('http_links', $href); }
	$abs = resolve_url($final, $href);
	$h = $abs ? parse_url($abs, PHP_URL_HOST) : null;
	if ($h && preg_replace('/^www\./', '', strtolower($h)) !== preg_replace('/^www\./', '', $fp['host'])) $externalUrls[] = strtok($abs, '#');
}
$externalUrls = array_values(array_unique($externalUrls));

// forms and buttons (accessibility)
$unlabelled = 0;
foreach ($q('//input[not(@type="hidden" or @type="submit" or @type="button" or @type="image" or @type="reset")]|//select|//textarea') as $in) {
	$id = $in->getAttribute('id');
	$ok = $in->getAttribute('aria-label') !== '' || $in->getAttribute('aria-labelledby') !== '' || $in->getAttribute('title') !== '';
	if (!$ok && $id !== '' && $q('//label[@for="' . str_replace('"', '', $id) . '"]')->length) $ok = true;
	for ($p = $in->parentNode; !$ok && $p && $p->nodeType === XML_ELEMENT_NODE; $p = $p->parentNode) if (strtolower($p->nodeName) === 'label') $ok = true;
	if (!$ok) { $unlabelled++; $it('labels', '<' . $in->nodeName . '> name="' . $in->getAttribute('name') . '"' . ($in->getAttribute('placeholder') ? ' placeholder="' . $in->getAttribute('placeholder') . '"' : '')); }
}
$namelessButtons = 0;
foreach ($q('//button') as $b) if ($txt($b) === '' && $b->getAttribute('aria-label') === '' && $b->getAttribute('title') === '') { $namelessButtons++; $it('buttons', '<button> with class "' . $b->getAttribute('class') . '"'); }
foreach ($q('//iframe[not(@title) or normalize-space(@title)=""]') as $f) $it('iframe_title', 'iframe: ' . $f->getAttribute('src'));
$skipLink = $q('//a[starts-with(@href,"#")][contains(translate(.,"SKIP","skip"),"skip")]')->length > 0;

// visible text
foreach ($q('//script|//style|//noscript|//template|//svg') as $n) $n->parentNode->removeChild($n);
$body = $q('//body');
$text = $body->length ? $txt($body->item(0)) : '';
$words = $text === '' ? 0 : count(preg_split('/\s+/u', $text));
$textRatio = strlen($html) ? round(strlen($text) / strlen($html) * 100, 1) : 0;
$sentences = array_filter(preg_split('/[.!?]+\s/u', $text), function ($s) { return str_word_count($s) >= 3; });
$avgSentence = $sentences ? round(array_sum(array_map('str_word_count', $sentences)) / count($sentences), 1) : 0;
$longS = $sentences;
usort($longS, function ($a, $b) { return str_word_count($b) - str_word_count($a); });
foreach (array_slice($longS, 0, 5) as $s) $it('readability', str_word_count($s) . ' words: "' . mb_substr(trim($s), 0, 180) . '..."');
$copyYear = 0;
if (preg_match_all('/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/iu', $text, $cm)) $copyYear = max(array_map('intval', $cm[1]));
$phoneText = preg_match('/(\+\d{1,3}[\s-]?)?\(?\d{2,5}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/', $text);

// links
$internal = [];
$external = 0;
$nofollowInternal = 0;
foreach ($q('//a[@href]') as $a) {
	$abs = resolve_url($final, $a->getAttribute('href'));
	if (!$abs) continue;
	$h = parse_url($abs, PHP_URL_HOST);
	$same = $h && preg_replace('/^www\./', '', strtolower($h)) === preg_replace('/^www\./', '', $fp['host']);
	if ($same) {
		$internal[strtok($abs, '#')] = true;
		if (stripos($a->getAttribute('rel'), 'nofollow') !== false) $nofollowInternal++;
	} else {
		$external++;
	}
}
$internal = array_keys($internal);

// mixed content
$mixed = 0;
if ($isHttps) {
	foreach ($q('//img[@src]|//script[@src]|//link[@rel="stylesheet"][@href]|//iframe[@src]') as $n) {
		$v = $n->getAttribute('src') ?: $n->getAttribute('href');
		if (stripos($v, 'http://') === 0) { $mixed++; $it('mixed', '<' . $n->nodeName . '> ' . $v); }
	}
}

// ---------- side fetches ----------
[$rStatus, , , $robotsTxt] = safe_get($origin . '/robots.txt', 300000, 8);
$robotsOk = $rStatus === 200 && $robotsTxt !== '' && stripos($robotsTxt, '<html') === false;
$blocksAll = false;
if ($robotsOk) {
	$inStar = false;
	$lastWasAgent = false;
	foreach (preg_split('/\r?\n/', $robotsTxt) as $line) {
		$line = trim(preg_replace('/#.*$/', '', $line));
		if (!preg_match('/^([a-z-]+)\s*:\s*(.*)$/i', $line, $m)) continue;
		$k = strtolower($m[1]);
		if ($k === 'user-agent') {
			$inStar = ($lastWasAgent && $inStar) || trim($m[2]) === '*';
			$lastWasAgent = true;
			continue;
		}
		$lastWasAgent = false;
		if ($inStar && $k === 'disallow' && trim($m[2]) === '/') $blocksAll = true;
	}
}
$sitemapUrl = '';
if ($robotsOk && preg_match('/^\s*sitemap:\s*(\S+)/im', $robotsTxt, $m)) $sitemapUrl = $m[1];
$sitemapOk = false;
foreach (array_unique(array_filter([$sitemapUrl ? normalise_url($sitemapUrl) : null, $origin . '/sitemap.xml', $origin . '/sitemap_index.xml'])) as $sm) {
	[$sStatus, , , $sBody] = safe_get($sm, 2000000, 8);
	if ($sStatus === 200 && stripos($sBody, '<urlset') !== false || $sStatus === 200 && stripos($sBody, '<sitemapindex') !== false) { $sitemapOk = $sm; break; }
}
$httpRedirects = null;
if ($isHttps) {
	[$hStatus, $hFinal] = safe_get('http://' . $fp['host'] . '/', 100000, 8, true);
	$httpRedirects = $hStatus > 0 && stripos($hFinal, 'https://') === 0;
}

// broken internal links (up to 15, in parallel, HEAD falling back to GET)
$checked = 0;
$broken = [];
$sample = array_slice(array_values(array_filter($internal, function ($u) use ($final) { return rtrim($u, '/') !== rtrim($final, '/'); })), 0, 15);
if ($sample) {
	$mh = curl_multi_init();
	$handles = [];
	foreach ($sample as $u) {
		$pu = parse_url($u);
		$ipu = !empty($pu['host']) ? public_ip(strtolower($pu['host'])) : null;
		if (!$ipu || !in_array($pu['scheme'] ?? '', ['http', 'https'], true)) continue;
		$port = $pu['scheme'] === 'https' ? 443 : 80;
		$ch = curl_init($u);
		curl_setopt_array($ch, tls_opts());
		curl_setopt_array($ch, [CURLOPT_RESOLVE => [strtolower($pu['host']) . ":{$port}:{$ipu}"], CURLOPT_NOBODY => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => false, CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS, CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; PrismSEOAudit/1.0)']);
		curl_multi_add_handle($mh, $ch);
		$handles[$u] = $ch;
	}
	do { $st = curl_multi_exec($mh, $running); if ($running) curl_multi_select($mh, 1); } while ($running && $st === CURLM_OK);
	foreach ($handles as $u => $ch) {
		$c = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
		if ($c === 405 || $c === 403 || $c === 0) {
			[$c] = safe_get($u, 200000, 8);
		}
		$checked++;
		if ($c >= 400 || $c === 0) $broken[] = ['url' => $u, 'status' => $c];
		curl_multi_remove_handle($mh, $ch);
		curl_close($ch);
	}
	curl_multi_close($mh);
}

// parallel fetch helper: returns [url => [code, headers, body]], no redirects followed
function multi_fetch(array $urls, $head = false, $maxBytes = 1500000, $timeout = 10) {
	$out = [];
	$mh = curl_multi_init();
	$hs = [];
	foreach ($urls as $u) {
		$pu = parse_url($u);
		$host = strtolower($pu['host'] ?? '');
		$ip = $host ? public_ip($host) : null;
		if (!$ip || !in_array($pu['scheme'] ?? '', ['http', 'https'], true)) continue;
		$port = $pu['scheme'] === 'https' ? 443 : 80;
		$ch = curl_init($u);
		$hs[$u] = ['ch' => $ch, 'h' => [], 'b' => ''];
		$ref = &$hs[$u];
		curl_setopt_array($ch, tls_opts());
		curl_setopt_array($ch, [
			CURLOPT_RESOLVE => ["{$host}:{$port}:" . (strpos($ip, ':') !== false ? "[{$ip}]" : $ip)],
			CURLOPT_NOBODY => $head, CURLOPT_FOLLOWLOCATION => false, CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => 5,
			CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS, CURLOPT_ENCODING => '',
			CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; PrismSEOAudit/1.0)',
			CURLOPT_HEADERFUNCTION => function ($c, $line) use (&$ref) { $p = explode(':', $line, 2); if (count($p) === 2) $ref['h'][strtolower(trim($p[0]))] = trim($p[1]); return strlen($line); },
			CURLOPT_WRITEFUNCTION => function ($c, $chunk) use (&$ref, $maxBytes) { $ref['b'] .= $chunk; return strlen($ref['b']) > $maxBytes ? 0 : strlen($chunk); },
		]);
		unset($ref);
		curl_multi_add_handle($mh, $ch);
	}
	do { $st = curl_multi_exec($mh, $running); if ($running) curl_multi_select($mh, 1); } while ($running && $st === CURLM_OK);
	foreach ($hs as $u => $x) {
		$out[$u] = [(int) curl_getinfo($x['ch'], CURLINFO_RESPONSE_CODE), $x['h'], $x['b'], (int) curl_getinfo($x['ch'], CURLINFO_SIZE_DOWNLOAD)];
		curl_multi_remove_handle($mh, $x['ch']);
		curl_close($x['ch']);
	}
	curl_multi_close($mh);
	return $out;
}

function robots_blocks($txt, $agent) {
	$groups = [];
	$cur = [];
	$last = false;
	foreach (preg_split('/\r?\n/', (string) $txt) as $line) {
		$line = trim(preg_replace('/#.*$/', '', $line));
		if (!preg_match('/^([a-z-]+)\s*:\s*(.*)$/i', $line, $m)) continue;
		$k = strtolower($m[1]);
		if ($k === 'user-agent') { if (!$last) $cur = []; $cur[] = strtolower(trim($m[2])); $last = true; continue; }
		$last = false;
		if ($k === 'disallow' && trim($m[2]) === '/') foreach ($cur as $a) $groups[$a] = true;
	}
	return !empty($groups[strtolower($agent)]);
}

// soft 404 test
[$nfStatus] = safe_get($origin . '/prism-audit-missing-' . bin2hex(random_bytes(4)) . '/', 300000, 8);
// www / non-www consolidation
$altHost = strpos($fp['host'], 'www.') === 0 ? substr($fp['host'], 4) : 'www.' . $fp['host'];
[$altStatus, $altFinal] = safe_get($fp['scheme'] . '://' . $altHost . '/', 300000, 8);
$altOk = $altStatus === 0 || strtolower(parse_url($altFinal, PHP_URL_HOST)) === strtolower($fp['host']);
// llms.txt
[$llmStatus, , , $llmBody] = safe_get($origin . '/llms.txt', 200000, 6);
$llmsOk = $llmStatus === 200 && $llmBody !== '' && stripos($llmBody, '<html') === false;
// AI crawlers
$aiBlocked = [];
if ($robotsOk) foreach (['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Bingbot', 'Googlebot'] as $bot) if (robots_blocks($robotsTxt, $bot)) $aiBlocked[] = $bot;
// sitemap detail
$smUrls = 0; $smLastmod = false;
if ($sitemapOk) {
	[, , , $smBody] = safe_get($sitemapOk, 3000000, 10);
	if (stripos($smBody, '<sitemapindex') !== false && preg_match_all('#<loc>\s*([^<\s]+)\s*</loc>#i', $smBody, $cm)) {
		$child = '';
		foreach (array_slice($cm[1], 0, 3) as $cu) { [$cs, , , $cb] = safe_get(html_entity_decode($cu), 3000000, 10); if ($cs === 200) $child .= $cb; }
		$smBody = $child;
	}
	preg_match_all('#<loc>\s*([^<\s]+)\s*</loc>#i', $smBody, $lm);
	$smLocs = array_values(array_unique(array_map('html_entity_decode', $lm[1])));
	$smUrls = count($smLocs);
	$smLastmod = stripos($smBody, '<lastmod>') !== false;
}
$smLocs = $smLocs ?? [];

// crawl up to 12 more internal pages
$crawl = array_slice(array_values(array_filter($internal, function ($u) use ($final) {
	return rtrim($u, '/') !== rtrim($final, '/') && !preg_match('/\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|mp4|mp3)(\?|$)/i', $u) && strpos($u, '?') === false;
})), 0, 12);
// add an even spread of sitemap URLs (same host only) so deeper pages get checked too
$smSame = array_values(array_filter($smLocs, function ($u) use ($fp, $final) { return strtolower((string) parse_url($u, PHP_URL_HOST)) === strtolower($fp['host']) && rtrim($u, '/') !== rtrim($final, '/'); }));
$smSample = [];
if ($smSame) { $step = max(1, (int) floor(count($smSame) / 15)); for ($i = 0; $i < count($smSame) && count($smSample) < 15; $i += $step) $smSample[] = $smSame[$i]; }
$crawl = array_slice(array_values(array_unique(array_merge($crawl, $smSample))), 0, 25);
$smSet = array_flip($smSample);
$smBad = []; $smRedirect = []; $smNoindex = []; $smCanonOther = [];
$normU = function ($u) { return rtrim(strtolower(strtok($u, '#')), '/'); };
$extFrom = [];
foreach ($externalUrls as $eu) $extFrom[$eu] = $final;
$pages = [['kb' => round(strlen($html) / 1024), 'h1text' => $h1s ? $h1s[0] : '', 'out' => array_map($normU, $internal), 'url' => $final, 'title' => $title, 'desc' => $desc, 'h1' => count($h1s), 'words' => $words, 'noindex' => strpos($robotsMeta, 'noindex') !== false, 'canonical' => $canonical]];
$crawlRedirects = [];
$crawlStatus = [];
foreach (multi_fetch($crawl) as $u => [$c, $h, $b, $sz]) {
	$crawlStatus[$u] = [$c, $h['location'] ?? ''];
	$inSm = isset($smSet[$u]);
	if ($inSm && ($c >= 400 || $c === 0)) $smBad[] = $u . ' (status ' . ($c ?: 'no response') . ')';
	if ($c >= 300 && $c < 400) { if ($inSm) $smRedirect[] = $u; else $crawlRedirects[] = $u; continue; }
	if ($c !== 200 || stripos($h['content-type'] ?? 'text/html', 'html') === false || $b === '') continue;
	$d = new DOMDocument();
	$d->loadHTML('<?xml encoding="UTF-8">' . $b, LIBXML_NOWARNING | LIBXML_NOERROR);
	$x = new DOMXPath($d);
	$tn = $x->query('//title');
	$dn = $x->query('//meta[translate(@name,"DESCRIPTION","description")="description"]');
	$rn = $x->query('//meta[translate(@name,"ROBOTS","robots")="robots"]');
	$cn = $x->query('//link[translate(@rel,"CANONICAL","canonical")="canonical"]');
	$out = [];
	foreach ($x->query('//a[@href]') as $a) {
		$abs = resolve_url($u, $a->getAttribute('href'));
		$ah = $abs ? parse_url($abs, PHP_URL_HOST) : null;
		if (!$ah) continue;
		if (preg_replace('/^www./', '', strtolower($ah)) === preg_replace('/^www./', '', $fp['host'])) $out[] = $normU($abs);
		elseif (!isset($extFrom[strtok($abs, '#')])) $extFrom[strtok($abs, '#')] = $u;
	}
	$h1n = $x->query('//h1');
	foreach ($x->query('//script|//style|//noscript|//svg') as $n) $n->parentNode->removeChild($n);
	$bn = $x->query('//body');
	$bt = $bn->length ? trim(preg_replace('/\s+/u', ' ', $bn->item(0)->textContent)) : '';
	$pages[] = [
		'url' => $u,
		'h1text' => $h1n->length ? trim(preg_replace('/s+/u', ' ', $h1n->item(0)->textContent)) : '',
		'out' => array_values(array_unique($out)),
		'kb' => round(strlen($b) / 1024),
		'title' => $tn->length ? trim(preg_replace('/\s+/u', ' ', $tn->item(0)->textContent)) : '',
		'desc' => $dn->length ? trim($dn->item(0)->getAttribute('content')) : '',
		'h1' => $x->query('//h1')->length,
		'words' => $bt === '' ? 0 : count(preg_split('/\s+/u', $bt)),
		'noindex' => $rn->length && stripos($rn->item(0)->getAttribute('content'), 'noindex') !== false,
		'canonical' => $cn->length ? trim($cn->item(0)->getAttribute('href')) : '',
	];
	$lp = end($pages);
	if ($inSm && $lp['noindex']) $smNoindex[] = $u;
	if ($inSm && $lp['canonical'] !== '' && rtrim(resolve_url($u, $lp['canonical']) ?: '', '/') !== rtrim($u, '/')) $smCanonOther[] = $u . ' → ' . $lp['canonical'];
}
$pc = count($pages);
$list = function ($arr) { $arr = array_values($arr); return implode(', ', array_map(function ($u) { return parse_url($u, PHP_URL_PATH) ?: '/'; }, array_slice($arr, 0, 4))) . (count($arr) > 4 ? ' and ' . (count($arr) - 4) . ' more' : ''); };
$pgMissTitle = array_column(array_filter($pages, function ($p) { return $p['title'] === ''; }), 'url');
$pgLongTitle = array_column(array_filter($pages, function ($p) { return mb_strlen($p['title']) > 60; }), 'url');
$pgMissDesc = array_column(array_filter($pages, function ($p) { return $p['desc'] === ''; }), 'url');
$pgBadDesc = array_column(array_filter($pages, function ($p) { $l = mb_strlen($p['desc']); return $l > 0 && ($l < 70 || $l > 160); }), 'url');
$pgNoH1 = array_column(array_filter($pages, function ($p) { return $p['h1'] === 0; }), 'url');
$pgMultiH1 = array_column(array_filter($pages, function ($p) { return $p['h1'] > 1; }), 'url');
$pgThin = array_column(array_filter($pages, function ($p) { return $p['words'] < 300; }), 'url');
$pgNoCanon = array_column(array_filter($pages, function ($p) { return $p['canonical'] === ''; }), 'url');
$pgNoindex = array_column(array_filter($pages, function ($p) { return $p['noindex']; }), 'url');
$dupGroup = function ($key) use ($pages) {
	$seen = [];
	foreach ($pages as $p) if ($p[$key] !== '') $seen[mb_strtolower($p[$key])][] = $p['url'];
	$d = [];
	foreach ($seen as $urls) if (count($urls) > 1) $d = array_merge($d, $urls);
	return $d;
};
$pgDupTitle = $dupGroup('title');
$pgDupDesc = $dupGroup('desc');
$pgH1Title = array_column(array_filter($pages, function ($p) { return $p['h1text'] !== '' && mb_strtolower($p['h1text']) === mb_strtolower($p['title']); }), 'url');
// incoming internal links among the crawled pages
$incoming = [];
foreach ($pages as $p) foreach (array_unique($p['out']) as $o) if ($o !== $normU($p['url'])) $incoming[$o] = ($incoming[$o] ?? 0) + 1;
$pgOneLink = [];
foreach ($pages as $i => $p) { if ($i === 0) continue; $n = $incoming[$normU($p['url'])] ?? 0; if ($n <= 1) $pgOneLink[$p['url']] = $n; }

// external links across all crawled pages (up to 30 unique). 429 = rate limited, not broken.
$extBroken = [];
$extChecked = 0;
foreach (multi_fetch(array_slice(array_keys($extFrom), 0, 30), true, 100000, 8) as $u => [$c]) {
	$extChecked++;
	if ($c === 404 || $c === 410 || $c >= 500) $extBroken[] = $u . ' (status ' . $c . ', linked from ' . (parse_url($extFrom[$u], PHP_URL_PATH) ?: '/') . ')';
}

// assets: CSS/JS minification, caching, image weight
$assetUrls = array_slice(array_merge(array_slice($cssUrls, 0, 3), array_slice($jsUrls, 0, 4)), 0, 7);
$unminified = []; $noCache = []; $assetBytes = 0;
foreach (multi_fetch($assetUrls, false, 1500000) as $u => [$c, $h, $b, $sz]) {
	if ($c !== 200) continue;
	$assetBytes += strlen($b);
	$lines = substr_count($b, "\n") + 1;
	if (strlen($b) > 3000 && strlen($b) / $lines < 120 && !preg_match('/\.min\.(js|css)/i', $u)) $unminified[] = $u;
	if (!preg_match('/max-age=(\d+)/', $h['cache-control'] ?? '', $mm) || (int) $mm[1] < 604800) {
		if (empty($h['expires'])) $noCache[] = $u;
	}
}
$bigImages = [];
foreach (multi_fetch(array_slice($imgUrls, 0, 10), true, 100000, 8) as $u => [$c, $h]) {
	$len = (int) ($h['content-length'] ?? 0);
	if ($c === 200 && $len > 200 * 1024) $bigImages[] = $u . ' (' . round($len / 1024) . ' KB)';
}

// ---------- checks ----------
$checks = [];
// exact items for site-wide and fetched-resource checks
$pageWords = [];
foreach ($pages as $p) $pageWords[$p['url']] = $p;
$fmtPages = function ($urls, $fn) use ($pageWords) { return array_map(function ($u) use ($fn, $pageWords) { return $fn($u, $pageWords[$u] ?? null); }, array_values(array_unique($urls))); };
$items['pg_title'] = $fmtPages($pgMissTitle, function ($u) use ($short) { return $short($u); });
$items['pg_long_title'] = $fmtPages($pgLongTitle, function ($u, $p) use ($short) { return $short($u) . ': "' . $p['title'] . '" (' . mb_strlen($p['title']) . ' chars)'; });
$items['pg_desc'] = $fmtPages($pgMissDesc, function ($u) use ($short) { return $short($u); });
$items['pg_desc_len'] = $fmtPages($pgBadDesc, function ($u, $p) use ($short) { return $short($u) . ': ' . mb_strlen($p['desc']) . ' characters'; });
$items['pg_dup_title'] = $fmtPages($pgDupTitle, function ($u, $p) use ($short) { return $short($u) . ': "' . $p['title'] . '"'; });
$items['pg_dup_desc'] = $fmtPages($pgDupDesc, function ($u, $p) use ($short) { return $short($u) . ': "' . mb_substr($p['desc'], 0, 90) . '..."'; });
$items['pg_h1'] = $fmtPages($pgNoH1, function ($u) use ($short) { return $short($u); });
$items['pg_multi_h1'] = $fmtPages($pgMultiH1, function ($u, $p) use ($short) { return $short($u) . ': ' . $p['h1'] . ' H1 tags'; });
// per-page rows for the Crawled Pages tab
$homeOut = array_flip(array_map($normU, $internal));
$dupT = array_flip($pgDupTitle); $dupD = array_flip($pgDupDesc);
$pageRows = [];
foreach ($pages as $i => $p) {
	$iss = [];
	if ($p['title'] === '') $iss[] = ['error', 'Missing title tag'];
	elseif (mb_strlen($p['title']) > 60) $iss[] = ['notice', 'Title too long (' . mb_strlen($p['title']) . ' chars)'];
	if (isset($dupT[$p['url']])) $iss[] = ['warning', 'Duplicate title'];
	if ($p['desc'] === '') $iss[] = ['warning', 'Missing meta description'];
	elseif (mb_strlen($p['desc']) < 70 || mb_strlen($p['desc']) > 160) $iss[] = ['notice', 'Meta description length (' . mb_strlen($p['desc']) . ' chars)'];
	if (isset($dupD[$p['url']])) $iss[] = ['warning', 'Duplicate meta description'];
	if ($p['h1'] === 0) $iss[] = ['error', 'Missing H1'];
	if ($p['h1'] > 1) $iss[] = ['notice', 'Multiple H1 tags'];
	if ($p['h1text'] !== '' && mb_strtolower($p['h1text']) === mb_strtolower($p['title'])) $iss[] = ['warning', 'Duplicate H1 and title'];
	if ($p['words'] < 300) $iss[] = ['warning', 'Low word count (' . $p['words'] . ')'];
	if ($p['canonical'] === '') $iss[] = ['notice', 'No canonical tag'];
	if ($p['noindex']) $iss[] = ['warning', 'Blocked by noindex'];
	if ($i > 0 && isset($pgOneLink[$p['url']])) $iss[] = ['notice', 'Only ' . $pgOneLink[$p['url']] . ' incoming internal link(s)'];
	$pageRows[] = ['url' => $p['url'], 'status' => 200, 'title' => $p['title'], 'words' => $p['words'], 'kb' => $p['kb'] ?? 0, 'depth' => $i === 0 ? 0 : (isset($homeOut[$normU($p['url'])]) ? 1 : 2), 'incoming' => $i === 0 ? null : ($incoming[$normU($p['url'])] ?? 0), 'issues' => $iss];
}
foreach ($crawlStatus as $u => [$c, $loc]) {
	if ($c === 200) continue;
	$sev = ($c >= 400 || $c === 0) ? 'error' : 'notice';
	$pageRows[] = ['url' => $u, 'status' => $c, 'title' => '', 'words' => 0, 'kb' => 0, 'depth' => isset($homeOut[$normU($u)]) ? 1 : 2, 'incoming' => null, 'issues' => [[$sev, $c >= 300 && $c < 400 ? 'Redirects (' . $c . ') to ' . $loc : 'Returns status ' . ($c ?: 'no response')]]];
}
$items['pg_h1_title'] = $fmtPages($pgH1Title, function ($u, $p) use ($short) { return $short($u) . ': "' . $p['title'] . '"'; });
$items['pg_one_link'] = array_map(function ($u, $n) use ($short) { return $short($u) . ': ' . $n . ' incoming link(s) from the crawled pages'; }, array_keys($pgOneLink), $pgOneLink);
$items['pg_thin'] = $fmtPages($pgThin, function ($u, $p) use ($short) { return $short($u) . ': ' . $p['words'] . ' words'; });
$items['pg_canon'] = $fmtPages($pgNoCanon, function ($u) use ($short) { return $short($u); });
$items['pg_noindex'] = $fmtPages($pgNoindex, function ($u) use ($short) { return $short($u); });
$items['crawl_redirects'] = $crawlRedirects;
$items['ext_broken'] = $extBroken;
$items['broken'] = array_map(function ($b) { return $b['url'] . ' (status ' . ($b['status'] ?: 'no response') . ')'; }, $broken);
$items['minify'] = $unminified;
$items['cache'] = $noCache;
$items['img_weight'] = $bigImages;
$items['crawled'] = array_map(function ($p) use ($short) { return $short($p['url']) . ': ' . $p['words'] . ' words, ' . $p['h1'] . ' H1, title ' . mb_strlen($p['title']) . ' chars, description ' . mb_strlen($p['desc']) . ' chars'; }, $pages);
if ($aiBlocked) $items['ai_bots'] = array_map(function ($b) { return "User-agent: {$b} / Disallow: /"; }, $aiBlocked);
foreach (['strict-transport-security', 'x-content-type-options', 'x-frame-options', 'content-security-policy', 'referrer-policy', 'permissions-policy', 'server', 'x-powered-by', 'cache-control', 'content-encoding'] as $hn) $items['headers'][] = $hn . ': ' . ($hdr[$hn] ?? '(not set)');

$why = [
	'status' => 'If the home page does not return 200, Google may drop it from results entirely.',
	'noindex' => 'A noindex tag tells Google not to show the page at all, so it can never rank or bring leads.',
	'robots' => 'robots.txt is the first file search engines read. Without it they guess what to crawl.',
	'sitemap' => 'A sitemap helps Google find every page, especially new ones and pages with few links.',
	'canonical' => 'Without a canonical tag, URL variations (tracking codes, www, trailing slashes) can split your ranking signals.',
	'soft404' => 'When missing pages return 200, Google wastes crawl time on junk URLs and may treat them as thin content.',
	'www' => 'If both versions load, Google sees two copies of your site and splits links and authority between them.',
	'https' => 'Browsers mark HTTP sites "Not secure", which kills trust and conversions. HTTPS is also a ranking signal.',
	'http_redirect' => 'Without the redirect, old links and typed URLs land on the insecure version.',
	'mixed' => 'Browsers block or warn about insecure files on secure pages, which can break images and layout.',
	'title' => 'The title is the blue headline in Google. It is the strongest on-page ranking signal and decides whether people click.',
	'title_len' => 'Google cuts titles at about 600 pixels, so the end of a long title, often your brand or location, gets hidden.',
	'desc' => 'Without a description Google picks random text from the page, which usually gets fewer clicks.',
	'desc_len' => 'Descriptions that are too short waste space; too long ones get cut off mid-sentence.',
	'h1' => 'The H1 tells visitors and Google what the page is about in one line.',
	'hierarchy' => 'Skipped heading levels confuse screen readers and make the page structure harder for Google to understand.',
	'words' => 'Pages with little text give Google little to rank and visitors little reason to enquire.',
	'words_deep' => 'Top-ranking local and service pages usually cover services, areas, process, proof and FAQs in depth.',
	'readability' => 'Long sentences make visitors skim and leave. Plain, short sentences convert better on mobile.',
	'alt' => 'Alt text is how Google understands images and how blind visitors hear them. Missing alt text is an accessibility failure.',
	'img_size' => 'Images without width and height make the page jump as it loads. Google measures this as Cumulative Layout Shift, a Core Web Vital.',
	'img_format' => 'JPG and PNG files are usually much heavier than WebP or AVIF, which slows mobile loading.',
	'img_weight' => 'Large images are the most common reason a page loads slowly on mobile data.',
	'img_lazy' => 'Loading every image at once delays the first screen. Lazy loading defers images the visitor has not reached.',
	'minify' => 'Unminified code includes spaces and comments that browsers do not need, so every visitor downloads extra data.',
	'cache' => 'Without long cache times, returning visitors re-download the same files on every visit.',
	'render_block' => 'Scripts in the head without defer stop the page from showing anything until they download and run.',
	'ttfb' => 'A slow server delays everything else. Google and visitors both notice.',
	'ttfb_fast' => 'Fast server response is the foundation of a good Largest Contentful Paint score.',
	'broken' => 'Broken links frustrate visitors and waste the link value you pass between pages.',
	'ext_broken' => 'Dead outbound links make a site look neglected to visitors and to quality reviewers.',
	'anchors_empty' => 'Google uses link text to understand the page being linked to. Empty links pass no meaning and fail accessibility checks.',
	'anchors_generic' => '"Click here" tells Google nothing about the target page. Descriptive anchors help those pages rank.',
	'schema' => 'Structured data helps Google understand your business and can unlock rich results like FAQs and breadcrumbs.',
	'org_schema' => 'Organization or LocalBusiness schema is how Google and AI tools confirm who you are, where you are and how to contact you.',
	'sameas' => 'sameAs links connect your website to your social and directory profiles so Google treats them as one trusted brand.',
	'breadcrumb' => 'Breadcrumb schema replaces the long URL in search results with a clean path, which looks more trustworthy.',
	'tel' => 'Most local searches happen on phones. A tap-to-call link removes the friction between finding you and calling you.',
	'address' => 'A visible, marked-up address or service area must match your Google Business Profile to rank in the map pack.',
	'maps' => 'Linking to your Google Business Profile strengthens the connection between your website and your map listing.',
	'hours' => 'Opening hours in schema can appear directly in search and AI answers.',
	'labels' => 'Fields without labels fail accessibility standards and confuse people using screen readers or autofill, which loses enquiries.',
	'buttons' => 'Icon-only buttons with no name are announced as just "button" to screen reader users.',
	'ai_bots' => 'Blocking AI crawlers means ChatGPT, Claude, Perplexity and Google AI answers cannot read or cite your site.',
	'llms' => 'llms.txt is an emerging file that gives AI assistants a clean summary of your business and key pages.',
	'faq' => 'AI answers and Google People Also Ask pull from clear question-and-answer content.',
	'pg_dup_title' => 'Pages with the same title compete against each other, so Google often ranks neither well.',
	'pg_dup_desc' => 'Duplicate descriptions make your pages look identical in search results.',
	'pg_h1_title' => 'When the H1 repeats the title, the page targets fewer search phrases than it could.',
	'pg_one_link' => 'Internal links tell Google which pages matter. Pages with one or no incoming links look unimportant and are crawled less often.',
	'pg_thin' => 'Thin pages rarely rank and can lower how Google rates the quality of the whole site.',
	'pg_noindex' => 'You are linking prominently to pages Google has been told to ignore.',
	'csp' => 'A Content Security Policy limits the damage if a plugin or third-party script is compromised.',
	'server_leak' => 'Showing server software versions helps attackers find known weaknesses.',
	'copyright' => 'An old year in the footer makes visitors wonder if the business is still active.',
	'text_ratio' => 'When code far outweighs content, pages are slower and Google has less text to understand.',
	'sm_bad' => 'Google uses your sitemap as a list of pages worth crawling. Errors in it waste crawl budget and lower trust in the file.',
	'sm_redirect' => 'Redirecting URLs in a sitemap send mixed signals about which URL is the real one.',
	'sm_noindex' => 'Listing pages you have told Google to ignore is a contradiction that Search Console flags.',
	'sm_canon' => 'Listing non-canonical URLs tells Google two different things about the same page.',
	'social' => 'Social profile links help Google connect your brand across the web.',
];
$typeMap = [
	'Crawlability' => 'Technical SEO', 'HTTPS & security' => 'Security & HTTPS', 'On-page SEO' => 'On-page SEO', 'Content' => 'Content SEO',
	'Images' => 'Image SEO', 'Internal linking' => 'Link SEO', 'Links' => 'Link SEO', 'Markup & social' => 'Schema & social SEO',
	'Structured data & social' => 'Schema & social SEO', 'Local SEO' => 'Local SEO', 'Mobile & performance' => 'Mobile & speed SEO',
	'Accessibility' => 'Accessibility & UX', 'AI search readiness' => 'AI search SEO (GEO)',
];
$idType = [
	'pg_title' => 'On-page SEO', 'pg_dup_title' => 'On-page SEO', 'pg_long_title' => 'On-page SEO', 'pg_desc' => 'On-page SEO', 'pg_dup_desc' => 'On-page SEO',
	'pg_desc_len' => 'On-page SEO', 'pg_h1' => 'On-page SEO', 'pg_multi_h1' => 'On-page SEO', 'pg_thin' => 'Content SEO', 'pg_h1_title' => 'On-page SEO', 'pg_one_link' => 'Link SEO', 'pg_canon' => 'Technical SEO',
	'pg_noindex' => 'Technical SEO', 'social' => 'Off-page signals', 'sameas' => 'Off-page signals', 'ext_broken' => 'Off-page signals',
	'entity' => 'Off-page signals', 'og' => 'Schema & social SEO', 'charset' => 'Technical SEO', 'lang' => 'Technical SEO', 'doctype' => 'Technical SEO',
	'deprecated' => 'Technical SEO', 'meta_keywords' => 'On-page SEO', 'viewport' => 'Mobile & speed SEO', 'alt' => 'Image SEO', 'http_links' => 'Security & HTTPS',
];
$add = function ($theme, $id, $severity, $pass, $label, $detail, $fix) use (&$checks, &$items, $why, $typeMap, $idType) {
	$theme = $idType[$id] ?? ($typeMap[$theme] ?? $theme);
	$checks[] = ['theme' => $theme, 'id' => $id, 'severity' => $severity, 'pass' => (bool) $pass, 'label' => $label, 'detail' => $detail, 'fix' => $pass ? '' : $fix, 'why' => $why[$id] ?? '', 'items' => $pass ? [] : array_values($items[$id] ?? [])];
};
$noindex = strpos($robotsMeta, 'noindex') !== false;
$tl = mb_strlen($title);
$dl = mb_strlen($desc);

$add('Crawlability', 'status', 'error', $status >= 200 && $status < 300, 'Page loads successfully', "HTTP status {$status}", 'Your home page should return a 200 status code. Check your hosting and server settings.');
$add('Crawlability', 'noindex', 'error', !$noindex, 'Page can be indexed by Google', $noindex ? 'A noindex tag is blocking this page' : 'No noindex tag found', 'Remove the noindex robots meta tag or X-Robots-Tag header so Google can show this page.');
$add('Crawlability', 'robots', 'warning', $robotsOk, 'robots.txt file found', $robotsOk ? 'robots.txt is present' : 'No robots.txt at ' . $origin . '/robots.txt', 'Add a robots.txt file that allows crawling and lists your sitemap.');
$add('Crawlability', 'robots_block', 'error', !$blocksAll, 'robots.txt does not block the whole site', $blocksAll ? 'robots.txt disallows all crawlers' : 'Crawlers are allowed', 'Remove "Disallow: /" for all user agents, or Google cannot crawl your site.');
$add('Crawlability', 'sitemap', 'warning', (bool) $sitemapOk, 'XML sitemap found', $sitemapOk ? 'Sitemap found at ' . $sitemapOk : 'No XML sitemap found', 'Create an XML sitemap, submit it in Google Search Console and reference it in robots.txt.');
$add('Crawlability', 'canonical', 'warning', $canonical !== '', 'Canonical tag set', $canonical ?: 'No canonical tag', 'Add a self-referencing canonical tag so Google knows the preferred URL for this page.');
$add('Crawlability', 'redirects', 'notice', count($hops) <= 1, 'Short redirect chain', count($hops) . ' redirect(s) before the final page', 'Link straight to the final URL. Long redirect chains waste crawl budget and slow visitors down.');

$add('HTTPS & security', 'https', 'error', $isHttps, 'Site uses HTTPS', $isHttps ? 'Served over HTTPS' : 'Served over insecure HTTP', 'Install an SSL certificate and serve every page over HTTPS. Google treats HTTPS as a ranking signal.');
if ($isHttps) {
	$add('HTTPS & security', 'http_redirect', 'warning', $httpRedirects !== false, 'HTTP redirects to HTTPS', $httpRedirects === false ? 'The HTTP version does not redirect to HTTPS' : 'HTTP redirects to HTTPS', 'Add a permanent 301 redirect from http:// to https:// for every URL.');
	$add('HTTPS & security', 'mixed', 'warning', $mixed === 0, 'No mixed content', $mixed ? "{$mixed} resource(s) loaded over HTTP" : 'All resources load over HTTPS', 'Change images, scripts and stylesheets to load over https://.');
	$add('HTTPS & security', 'hsts', 'notice', !empty($hdr['strict-transport-security']), 'HSTS header set', !empty($hdr['strict-transport-security']) ? 'Strict-Transport-Security is set' : 'No Strict-Transport-Security header', 'Add an HSTS header so browsers always use HTTPS.');
}

$add('On-page SEO', 'title', 'error', $tl > 0, 'Title tag present', $title !== '' ? "\"{$title}\"" : 'No title tag', 'Add a unique title tag with your main keyword and brand.');
if ($tl > 0) $add('On-page SEO', 'title_len', 'warning', $tl >= 30 && $tl <= 60, 'Title length 30 to 60 characters', "{$tl} characters", $tl < 30 ? 'Your title is short. Use more of the space for your main service and location.' : 'Your title may be cut off in Google. Keep it under about 60 characters.');
$add('On-page SEO', 'title_dup', 'notice', $titleCount <= 1, 'Only one title tag', "{$titleCount} title tag(s)", 'Remove the extra title tags so only one remains.');
$add('On-page SEO', 'desc', 'warning', $dl > 0, 'Meta description present', $desc !== '' ? "\"{$desc}\"" : 'No meta description', 'Write a meta description that sells the click: what you offer, where, and why choose you.');
if ($dl > 0) $add('On-page SEO', 'desc_len', 'notice', $dl >= 70 && $dl <= 160, 'Meta description length 70 to 160 characters', "{$dl} characters", $dl < 70 ? 'Expand your description to about 140 to 160 characters.' : 'Shorten your description to under 160 characters so it is not cut off.');
$add('On-page SEO', 'desc_dup', 'notice', $descCount <= 1, 'Only one meta description', "{$descCount} meta description(s)", 'Remove duplicate meta description tags.');
$add('On-page SEO', 'h1', 'error', count($h1s) >= 1, 'H1 heading present', count($h1s) ? '"' . $h1s[0] . '"' : 'No H1 heading', 'Add one H1 that says clearly what the page is about.');
if (count($h1s) > 1) $add('On-page SEO', 'h1_multi', 'notice', false, 'Only one H1 heading', count($h1s) . ' H1 headings', 'Use one H1 and turn the others into H2 subheadings.');
$add('On-page SEO', 'h2', 'notice', $h2Count >= 2, 'Content uses subheadings', "{$h2Count} H2 subheading(s)", 'Break content into sections with H2 subheadings that use the phrases people search for.');
$add('On-page SEO', 'lang', 'notice', $lang !== '', 'Page language declared', $lang ? "lang=\"{$lang}\"" : 'No lang attribute', 'Add a lang attribute to the html tag, for example lang="en-GB".');

$add('Content', 'words', 'warning', $words >= 300, 'Enough content on the page', number_format($words) . ' words', 'Thin pages rarely rank. Add useful content that answers your customers\' questions: aim for at least 300 to 500 words.');
$imgCount = $imgs->length;
$add('Content', 'alt', 'warning', $imgNoAlt === 0, 'Images have alt text', $imgCount ? ($imgCount - $imgNoAlt) . " of {$imgCount} images have alt text" : 'No images found', 'Add descriptive alt text to every image. It helps accessibility and image search.');

$add('Internal linking', 'internal', 'warning', count($internal) >= 5, 'Page links to other pages on the site', count($internal) . ' internal link(s)', 'Link to your key service and product pages so Google can find and understand them.');
$add('Internal linking', 'broken', 'error', !$broken, 'No broken internal links', $checked ? ($broken ? count($broken) . " of {$checked} checked links are broken" : "All {$checked} checked links work") : 'No internal links to check', 'Fix or remove links that lead to error pages.');
$add('Internal linking', 'nofollow', 'notice', $nofollowInternal === 0, 'Internal links are followed', $nofollowInternal ? "{$nofollowInternal} internal nofollow link(s)" : 'No internal nofollow links', 'Remove rel="nofollow" from links to your own pages.');

$add('Markup & social', 'schema', 'warning', $schemaTypes && !in_array('(invalid JSON)', $schemaTypes, true) || $microdata > 0, 'Structured data (schema) found', $schemaTypes ? implode(', ', array_slice($schemaTypes, 0, 8)) : ($microdata ? 'Microdata found' : 'No structured data'), 'Add schema markup (Organization or LocalBusiness, plus Product, Service, FAQ or Article where relevant) to win rich results.');
$add('Markup & social', 'og', 'notice', $og['title'] !== '' && $og['image'] !== '', 'Open Graph tags for social sharing', ($og['title'] ? 'og:title set' : 'og:title missing') . ', ' . ($og['image'] ? 'og:image set' : 'og:image missing'), 'Add og:title, og:description and og:image so links look good when shared.');
$add('Markup & social', 'twitter', 'notice', $twitter !== '', 'Twitter / X card', $twitter ?: 'No twitter:card tag', 'Add a twitter:card meta tag, for example summary_large_image.');
$add('Markup & social', 'favicon', 'notice', $favicon, 'Favicon set', $favicon ? 'Favicon found' : 'No favicon link', 'Add a favicon. It shows next to your site in mobile search results.');
$add('Markup & social', 'charset', 'notice', (bool) $charset, 'Character encoding declared', $charset ? 'Charset declared' : 'No charset', 'Add <meta charset="utf-8"> at the top of the head.');

$add('Mobile & performance', 'viewport', 'error', $viewport !== '', 'Mobile viewport set', $viewport ?: 'No viewport meta tag', 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> so the site works on phones.');
$add('Mobile & performance', 'ttfb', 'warning', $ms <= 1500, 'Fast server response', "{$ms} ms to download the page", 'Your server is slow to respond. Look at hosting, caching and a CDN.');
$sizeKb = round(strlen($html) / 1024);
$add('Mobile & performance', 'size', 'notice', $sizeKb <= 500, 'Reasonable HTML size', "{$sizeKb} KB of HTML", 'Your HTML is heavy. Remove inline code and unused page builder markup.');
$add('Mobile & performance', 'compression', 'notice', !empty($hdr['content-encoding']), 'Compression enabled', $hdr['content-encoding'] ?? 'Not compressed', 'Turn on gzip or Brotli compression on your server.');
$add('Mobile & performance', 'render_block', 'warning', $renderBlocking === 0, 'No render-blocking scripts in the head', $renderBlocking ? "{$renderBlocking} script(s) in the head without defer or async" : 'Head scripts are deferred', 'Add defer or async to scripts in the head so the page can paint before JavaScript loads.');
$add('Mobile & performance', 'js_count', 'notice', count($jsUrls) <= 10, 'Reasonable number of JavaScript files', count($jsUrls) . ' JavaScript file(s)', 'Combine or remove scripts. Each file is another request on slow mobile connections.');
$add('Mobile & performance', 'css_count', 'notice', count($cssUrls) <= 5, 'Reasonable number of CSS files', count($cssUrls) . ' stylesheet(s)', 'Combine stylesheets and remove unused CSS.');
$add('Mobile & performance', 'minify', 'warning', !$unminified, 'CSS and JavaScript are minified', $unminified ? count($unminified) . ' unminified file(s): ' . $list($unminified) : 'Checked files are minified', 'Minify CSS and JavaScript to cut file size and load time.');
$add('Mobile & performance', 'cache', 'warning', !$noCache, 'Browser caching on static files', $noCache ? count($noCache) . ' file(s) with short or no cache time: ' . $list($noCache) : 'Static files are cached for at least a week', 'Set Cache-Control max-age of at least 7 days (ideally 1 year) on CSS, JS and images.');
$add('Mobile & performance', 'inline', 'notice', $inlineJs + $inlineCss <= 50000, 'Little inline code', round(($inlineJs + $inlineCss) / 1024) . ' KB of inline CSS and JavaScript', 'Move large inline code into cached external files.');
$add('Mobile & performance', 'style_attr', 'notice', $styleAttrs <= 30, 'Few inline style attributes', "{$styleAttrs} element(s) with style=\"...\"", 'Move inline styles into your stylesheet. Heavy inline styling is common with page builders and bloats the HTML.');
$add('Mobile & performance', 'preconnect', 'notice', $preconnect > 0, 'Resource hints used', $preconnect ? "{$preconnect} preconnect or preload hint(s)" : 'No preconnect or preload hints', 'Preconnect to font and analytics domains and preload your main image to speed up first paint.');
$add('Mobile & performance', 'doctype', 'notice', $hasDoctype, 'HTML5 doctype declared', $hasDoctype ? '<!DOCTYPE html> found' : 'No HTML5 doctype', 'Start the page with <!DOCTYPE html> so browsers render in standards mode.');
$add('Mobile & performance', 'deprecated', 'notice', $deprecatedTags === 0, 'No deprecated HTML tags', $deprecatedTags ? "{$deprecatedTags} deprecated tag(s) like <font> or <center>" : 'None found', 'Replace deprecated tags with modern HTML and CSS.');
$add('Mobile & performance', 'ttfb_fast', 'notice', $ms <= 600, 'Server responds in under 0.6 seconds', "{$ms} ms", 'Aim for under 600 ms. Use page caching, a faster host or a CDN.');

$add('Images', 'img_size', 'warning', $imgNoSize === 0, 'Images have width and height set', $imgCount ? "{$imgNoSize} of {$imgCount} images have no width/height" : 'No images', 'Set width and height on every image to stop the layout jumping as the page loads (Cumulative Layout Shift).');
$add('Images', 'img_format', 'warning', $imgLegacy === 0, 'Images use modern formats (WebP or AVIF)', $imgCount ? "{$imgLegacy} image(s) in JPG, PNG or GIF" : 'No images', 'Convert images to WebP or AVIF. They are often 30 to 50 percent smaller.');
$add('Images', 'img_lazy', 'notice', $imgNoLazy === 0, 'Below-the-fold images are lazy loaded', $imgNoLazy ? "{$imgNoLazy} image(s) load immediately" : 'Lazy loading in place', 'Add loading="lazy" to images below the first screen.');
$add('Images', 'img_weight', 'warning', !$bigImages, 'No oversized images', $bigImages ? count($bigImages) . ' image(s) over 200 KB: ' . implode(', ', array_slice($bigImages, 0, 3)) : 'Checked images are under 200 KB', 'Resize and compress large images. Heavy images are the most common cause of slow mobile pages.');
$add('Images', 'img_alt_long', 'notice', $imgLongAlt === 0, 'Alt text is concise', $imgLongAlt ? "{$imgLongAlt} alt text(s) over 125 characters" : 'Alt text length is fine', 'Keep alt text short and descriptive. Screen readers cut off very long alt text.');
$add('Images', 'img_names', 'notice', $imgGenericName === 0, 'Image file names are descriptive', $imgGenericName ? "{$imgGenericName} image(s) named like IMG_1234" : 'File names look descriptive', 'Rename images with descriptive words, for example blue-oak-dining-table.webp.');

$add('Crawlability', 'soft404', 'warning', $nfStatus === 404 || $nfStatus === 410, 'Missing pages return a real 404', "A made-up URL returned status {$nfStatus}", 'Make missing pages return a 404 status. Returning 200 creates "soft 404s" that waste crawl budget.');
$add('Crawlability', 'www', 'warning', $altOk, 'www and non-www versions are consolidated', $altOk ? ($altStatus ? "{$altHost} redirects to {$fp['host']}" : "{$altHost} does not resolve") : "{$altHost} loads a separate copy of the site", 'Redirect one version to the other with a 301 so Google sees one site, not two.');
$add('Crawlability', 'canon_self', 'notice', $canonical === '' || rtrim(resolve_url($final, $canonical) ?: '', '/') === rtrim($final, '/'), 'Canonical points to this page', $canonical ?: 'No canonical', 'Your home page canonical points somewhere else. Make it self-referencing unless that is deliberate.');
if ($robotsOk) $add('Crawlability', 'sm_in_robots', 'notice', $sitemapUrl !== '', 'Sitemap listed in robots.txt', $sitemapUrl ?: 'No Sitemap: line in robots.txt', 'Add "Sitemap: https://yourdomain/sitemap.xml" to robots.txt so every search engine finds it.');
if ($sitemapOk) $add('Crawlability', 'sm_lastmod', 'notice', $smLastmod, 'Sitemap has last-modified dates', $smLastmod ? 'lastmod dates found' : 'No lastmod dates', 'Add accurate <lastmod> dates so Google recrawls changed pages faster.');
$add('Crawlability', 'crawl_redirects', 'notice', !$crawlRedirects, 'Internal links point to final URLs', $crawlRedirects ? count($crawlRedirects) . ' internal link(s) redirect: ' . $list($crawlRedirects) : 'No redirecting internal links', 'Update internal links to point straight at the final URL.');
$add('Crawlability', 'meta_keywords', 'notice', $metaKeywords === 0, 'No outdated meta keywords tag', $metaKeywords ? 'Meta keywords tag found' : 'Not used', 'Google ignores meta keywords and it shows competitors your target terms. Remove it.');

$add('HTTPS & security', 'hsts_strong', 'notice', preg_match('/max-age=(\d+)/i', $hdr['strict-transport-security'] ?? '', $hm) && (int) $hm[1] >= 31536000, 'HSTS lasts at least one year', $hdr['strict-transport-security'] ?? 'No HSTS header', 'Set Strict-Transport-Security: max-age=31536000; includeSubDomains.');
$add('HTTPS & security', 'xcto', 'notice', strtolower($hdr['x-content-type-options'] ?? '') === 'nosniff', 'X-Content-Type-Options header set', $hdr['x-content-type-options'] ?? 'Missing', 'Add X-Content-Type-Options: nosniff.');
$add('HTTPS & security', 'xfo', 'notice', !empty($hdr['x-frame-options']) || stripos($hdr['content-security-policy'] ?? '', 'frame-ancestors') !== false, 'Clickjacking protection', $hdr['x-frame-options'] ?? 'No X-Frame-Options or frame-ancestors', 'Add X-Frame-Options: SAMEORIGIN or a CSP frame-ancestors rule.');
$add('HTTPS & security', 'csp', 'notice', !empty($hdr['content-security-policy']), 'Content Security Policy set', !empty($hdr['content-security-policy']) ? 'CSP header found' : 'No Content-Security-Policy header', 'Add a Content-Security-Policy header to reduce the risk of injected scripts.');
$add('HTTPS & security', 'referrer', 'notice', !empty($hdr['referrer-policy']), 'Referrer-Policy header set', $hdr['referrer-policy'] ?? 'Missing', 'Add Referrer-Policy: strict-origin-when-cross-origin.');
$add('HTTPS & security', 'server_leak', 'notice', !preg_match('/\d/', ($hdr['server'] ?? '') . ($hdr['x-powered-by'] ?? '')), 'Server version not exposed', trim(($hdr['server'] ?? '') . ' ' . ($hdr['x-powered-by'] ?? '')) ?: 'Not exposed', 'Hide server and PHP version numbers so attackers cannot target known weaknesses.');
$add('HTTPS & security', 'http_links', 'notice', $httpLinks === 0, 'Links use HTTPS', $httpLinks ? "{$httpLinks} link(s) to http:// URLs" : 'All links use HTTPS', 'Update links to https:// versions.');
$add('HTTPS & security', 'noopener', 'notice', $unsafeBlank === 0, 'New-tab links use rel="noopener"', $unsafeBlank ? "{$unsafeBlank} target=\"_blank\" link(s) without noopener" : 'All new-tab links are safe', 'Add rel="noopener" to links that open in a new tab.');

$add('On-page SEO', 'h1_len', 'notice', !$h1s || mb_strlen($h1s[0]) <= 70, 'H1 is a sensible length', $h1s ? mb_strlen($h1s[0]) . ' characters' : 'No H1', 'Keep the H1 under about 70 characters and lead with the main topic.');
$add('On-page SEO', 'h1_title', 'notice', !$h1s || mb_strtolower($h1s[0]) !== mb_strtolower($title), 'H1 and title are not identical', $h1s && mb_strtolower($h1s[0]) === mb_strtolower($title) ? 'H1 duplicates the title' : 'They differ', 'Use the title and H1 to target related phrases rather than repeating the same text.');
$add('On-page SEO', 'hierarchy', 'notice', $skips === 0, 'Heading levels are in order', $skips ? "{$skips} skipped heading level(s), for example H2 to H4" : 'Heading order is logical', 'Do not skip heading levels. Go H1, H2, H3 in order so Google and screen readers understand the structure.');
$add('On-page SEO', 'empty_h', 'notice', $emptyHeadings === 0, 'No empty headings', $emptyHeadings ? "{$emptyHeadings} empty heading(s)" : 'None', 'Remove empty heading tags or give them text.');
$add('On-page SEO', 'brand_title', 'notice', $title === '' || stripos($title, preg_replace('/\..*$/', '', preg_replace('/^www\./', '', $fp['host']))) !== false || preg_match('/[|\-–:]/u', $title), 'Title includes your brand', $title ?: 'No title', 'Add your brand name to the end of the title, for example "Service in City | Brand".');

$add('Content', 'words_deep', 'notice', $words >= 600, 'In-depth home page content (600+ words)', number_format($words) . ' words', 'Pages that rank well usually explain services, areas served, process, proof and FAQs. Aim for 600+ words.');
$add('Content', 'text_ratio', 'notice', $textRatio >= 10, 'Healthy text-to-HTML ratio', "{$textRatio}% of the page is visible text", 'Your code outweighs your content. Add useful text and trim heavy markup.');
$add('Content', 'readability', 'notice', $avgSentence === 0 || $avgSentence <= 20, 'Easy-to-read sentences', "Average sentence is {$avgSentence} words", 'Shorten sentences to under 20 words on average. Easier copy keeps visitors reading.');
$add('Content', 'copyright', 'notice', $copyYear === 0 || $copyYear >= (int) gmdate('Y') - 1, 'Copyright year is current', $copyYear ? "Footer says {$copyYear}" : 'No copyright year found', 'Update the footer year. An old year makes the business look inactive to visitors.');

$add('Links', 'anchors_empty', 'warning', $emptyAnchors === 0, 'All links have anchor text', $emptyAnchors ? "{$emptyAnchors} link(s) with no text or label" : 'All links are labelled', 'Give every link descriptive text or an aria-label. Google uses anchor text to understand the target page.');
$add('Links', 'anchors_generic', 'notice', $genericAnchors === 0, 'Descriptive anchor text', $genericAnchors ? "{$genericAnchors} link(s) say things like \"click here\" or \"read more\"" : 'No generic anchors', 'Replace "click here" and "read more" with words that describe the page you are linking to.');
$add('Links', 'ext_broken', 'warning', !$extBroken, 'No broken external links', $extChecked ? ($extBroken ? count($extBroken) . " of {$extChecked} checked external links are broken: " . $list($extBroken) : "All {$extChecked} checked external links work") : 'No external links', 'Fix or remove external links that point to dead pages.');
$add('Links', 'too_many', 'notice', $linkTotal <= 150, 'Reasonable number of links', "{$linkTotal} links on the page", 'Trim navigation and footer links so link value flows to your key pages.');
$add('Links', 'social', 'notice', $socialLinks > 0, 'Links to your social profiles', $socialLinks ? "{$socialLinks} social profile link(s)" : 'No social profile links', 'Link to your business social profiles. It helps Google connect your brand entity.');

$add('Structured data & social', 'org_schema', 'warning', $hasOrgSchema, 'Organization or LocalBusiness schema', $hasOrgSchema ? 'Found' : 'Not found', 'Add Organization or LocalBusiness schema with your name, logo, URL, contact details and social profiles.');
$add('Structured data & social', 'sameas', 'notice', stripos($schemaRaw, '"sameAs"') !== false, 'Schema links your profiles (sameAs)', stripos($schemaRaw, '"sameAs"') !== false ? 'sameAs found' : 'No sameAs property', 'Add sameAs links to your social and directory profiles inside your schema.');
$add('Structured data & social', 'breadcrumb', 'notice', in_array('BreadcrumbList', $schemaTypes, true), 'Breadcrumb schema', in_array('BreadcrumbList', $schemaTypes, true) ? 'Found' : 'Not found', 'Add BreadcrumbList schema so Google shows a clean path instead of a long URL.');
$add('Structured data & social', 'og_desc', 'notice', $og['description'] !== '', 'og:description set', $og['description'] ? 'Set' : 'Missing', 'Add an og:description for social shares.');
$add('Structured data & social', 'og_more', 'notice', $ogExtra['url'] !== '' && $ogExtra['type'] !== '' && $ogExtra['site'] !== '', 'og:url, og:type and og:site_name set', implode(', ', array_map(function ($k) use ($ogExtra) { return 'og:' . ($k === 'site' ? 'site_name' : $k) . ($ogExtra[$k] ? ' set' : ' missing'); }, array_keys($ogExtra))), 'Add the missing Open Graph tags.');
$add('Structured data & social', 'tw_image', 'notice', $twImage !== '' || $og['image'] !== '', 'Social share image', $twImage ?: ($og['image'] ?: 'No share image'), 'Add a 1200x630 share image via og:image and twitter:image.');
$add('Structured data & social', 'apple', 'notice', $appleIcon, 'Apple touch icon', $appleIcon ? 'Found' : 'Missing', 'Add an apple-touch-icon so your site looks right when saved to a phone home screen.');

$add('Local SEO', 'tel', 'warning', $telLinks > 0, 'Click-to-call phone link', $telLinks ? "{$telLinks} tel: link(s)" : ($phoneText ? 'A phone number is shown but not clickable' : 'No phone number found'), 'Add a tap-to-call tel: link. Most local searches happen on phones.');
$add('Local SEO', 'address', 'notice', $addressEl > 0 || stripos($schemaRaw, 'PostalAddress') !== false, 'Business address or service area marked up', ($addressEl || stripos($schemaRaw, 'PostalAddress') !== false) ? 'Address found' : 'No address element or PostalAddress schema', 'Show your address or service area and mark it up with PostalAddress schema. It must match your Google Business Profile.');
$add('Local SEO', 'maps', 'notice', $mapsEmbed > 0, 'Google Maps link or embed', $mapsEmbed ? 'Found' : 'No Google Maps link', 'Link to or embed your Google Business Profile map to reinforce your location.');
$add('Local SEO', 'email', 'notice', $mailLinks > 0, 'Email contact link', $mailLinks ? 'Found' : 'No mailto: link', 'Add a visible email contact so visitors who do not want to call can reach you.');
$add('Local SEO', 'hours', 'notice', stripos($schemaRaw, 'openingHours') !== false, 'Opening hours in schema', stripos($schemaRaw, 'openingHours') !== false ? 'Found' : 'No openingHours in schema', 'Add openingHoursSpecification to your LocalBusiness schema.');

$add('Accessibility', 'labels', 'warning', $unlabelled === 0, 'Form fields have labels', $unlabelled ? "{$unlabelled} field(s) without a label" : 'All fields labelled', 'Give every form field a <label>. Placeholders alone fail accessibility checks and cost you enquiries.');
$add('Accessibility', 'buttons', 'warning', $namelessButtons === 0, 'Buttons have accessible names', $namelessButtons ? "{$namelessButtons} button(s) with no text or aria-label" : 'All buttons named', 'Add text or an aria-label to icon-only buttons.');
$add('Accessibility', 'iframe_title', 'notice', $iframesNoTitle === 0, 'Embedded frames have titles', $iframesNoTitle ? "{$iframesNoTitle} iframe(s) without a title" : 'None missing', 'Add a title to every iframe, for example title="Map of our office".');
$add('Accessibility', 'skip', 'notice', $skipLink, 'Skip-to-content link', $skipLink ? 'Found' : 'No skip link', 'Add a "Skip to content" link for keyboard users.');
$add('Accessibility', 'theme_color', 'notice', $themeColor !== '', 'Mobile theme colour set', $themeColor ?: 'Missing', 'Add <meta name="theme-color"> so mobile browsers match your brand.');

$add('AI search readiness', 'ai_bots', 'warning', !$aiBlocked, 'AI and search crawlers are allowed', $aiBlocked ? 'robots.txt blocks: ' . implode(', ', $aiBlocked) : 'No major crawlers blocked', 'Allow GPTBot, ClaudeBot, PerplexityBot and Google-Extended if you want to be cited in AI answers.');
$add('AI search readiness', 'llms', 'notice', $llmsOk, 'llms.txt file', $llmsOk ? 'Found at /llms.txt' : 'No /llms.txt', 'Add an llms.txt file that summarises your business and key pages for AI assistants.');
$add('AI search readiness', 'faq', 'notice', $questionHeadings >= 2 || in_array('FAQPage', $schemaTypes, true), 'Question-and-answer content', $questionHeadings ? "{$questionHeadings} question heading(s)" : 'No question headings', 'Add FAQs that answer real customer questions in the first sentence. AI answers and Google quote this format.');
$add('AI search readiness', 'entity', 'notice', $hasOrgSchema && stripos($schemaRaw, '"sameAs"') !== false, 'Clear brand entity for AI', $hasOrgSchema ? 'Organization schema present, but no sameAs profile links' : 'No Organization schema', 'Describe your business with Organization schema plus sameAs links so AI tools can identify you.');

if ($smSample) {
	$sn = count($smSample);
	$items['sm_bad'] = $smBad; $items['sm_redirect'] = $smRedirect; $items['sm_noindex'] = $smNoindex; $items['sm_canon'] = $smCanonOther;
	$add('Technical SEO', 'sm_bad', 'error', !$smBad, 'Sitemap URLs load correctly', $smBad ? count($smBad) . " of {$sn} sampled sitemap URLs return errors" : "All {$sn} sampled sitemap URLs load", 'Remove dead URLs from the sitemap or restore the pages. A sitemap full of errors makes Google trust it less.');
	$add('Technical SEO', 'sm_redirect', 'warning', !$smRedirect, 'Sitemap lists final URLs only', $smRedirect ? count($smRedirect) . " of {$sn} sampled sitemap URLs redirect" : 'No redirecting URLs', 'List only the final 200 URLs in your sitemap, not URLs that redirect.');
	$add('Technical SEO', 'sm_noindex', 'warning', !$smNoindex, 'No noindex pages in sitemap', $smNoindex ? count($smNoindex) . ' sitemap URL(s) are noindex' : 'None found', 'A sitemap should only list pages you want indexed. Remove noindex pages or remove the tag.');
	$add('Technical SEO', 'sm_canon', 'warning', !$smCanonOther, 'Sitemap URLs are canonical', $smCanonOther ? count($smCanonOther) . ' sitemap URL(s) canonicalise to another page' : 'All sampled URLs are self-canonical', 'Only list canonical URLs in the sitemap. Mixed signals waste crawl budget.');
	$add('Technical SEO', 'sm_size', 'notice', $smUrls <= 50000, 'Sitemap within size limits', "{$smUrls} URLs in sitemap", 'Split sitemaps over 50,000 URLs into a sitemap index.');
}
$scope = "{$pc} page(s) crawled";
$add('Site-wide', 'pg_title', 'error', !$pgMissTitle, 'Every page has a title', $pgMissTitle ? count($pgMissTitle) . " of {$scope} have no title: " . $list($pgMissTitle) : "All {$scope} have titles", 'Add a unique title to every page.');
$add('Site-wide', 'pg_dup_title', 'warning', !$pgDupTitle, 'Page titles are unique', $pgDupTitle ? count($pgDupTitle) . " pages share titles: " . $list($pgDupTitle) : "No duplicate titles across {$scope}", 'Write a unique title for every page. Duplicates compete with each other in Google.');
$add('Site-wide', 'pg_long_title', 'notice', !$pgLongTitle, 'Titles fit in search results', $pgLongTitle ? count($pgLongTitle) . " page(s) have titles over 60 characters: " . $list($pgLongTitle) : 'All titles fit', 'Shorten titles to about 60 characters.');
$add('Site-wide', 'pg_desc', 'warning', !$pgMissDesc, 'Every page has a meta description', $pgMissDesc ? count($pgMissDesc) . " of {$scope} have no description: " . $list($pgMissDesc) : "All {$scope} have descriptions", 'Write a meta description for every page.');
$add('Site-wide', 'pg_dup_desc', 'warning', !$pgDupDesc, 'Meta descriptions are unique', $pgDupDesc ? count($pgDupDesc) . " pages share descriptions: " . $list($pgDupDesc) : 'No duplicates', 'Give every page its own description.');
$add('Site-wide', 'pg_desc_len', 'notice', !$pgBadDesc, 'Descriptions are 70 to 160 characters', $pgBadDesc ? count($pgBadDesc) . " page(s) too short or too long: " . $list($pgBadDesc) : 'All within range', 'Keep descriptions between 70 and 160 characters.');
$add('Site-wide', 'pg_h1', 'error', !$pgNoH1, 'Every page has an H1', $pgNoH1 ? count($pgNoH1) . " page(s) have no H1: " . $list($pgNoH1) : "All {$scope} have an H1", 'Add one clear H1 to every page.');
$add('Site-wide', 'pg_multi_h1', 'notice', !$pgMultiH1, 'One H1 per page', $pgMultiH1 ? count($pgMultiH1) . " page(s) have several H1s: " . $list($pgMultiH1) : 'All pages have one H1', 'Keep one H1 per page.');
$add('Site-wide', 'pg_h1_title', 'warning', !$pgH1Title, 'H1 and title differ on every page', $pgH1Title ? count($pgH1Title) . " page(s) use the same text for H1 and title: " . $list($pgH1Title) : "No duplicates across {$scope}", 'Make the title and H1 different so each targets a related phrase. Identical text wastes a chance to rank for more searches.');
$add('Site-wide', 'pg_one_link', 'notice', !$pgOneLink, 'Pages are well linked internally', $pgOneLink ? count($pgOneLink) . " page(s) have one or no incoming links from the {$scope}: " . $list(array_keys($pgOneLink)) : 'Every crawled page has several incoming links', 'Link to these pages from related pages and service pages. Pages with few internal links get crawled less and rank lower.');
$add('Site-wide', 'pg_thin', 'warning', !$pgThin, 'No thin pages', $pgThin ? count($pgThin) . " page(s) under 300 words: " . $list($pgThin) : "All {$scope} have 300+ words", 'Expand thin pages with useful detail, or merge them into stronger pages.');
$add('Site-wide', 'pg_canon', 'notice', !$pgNoCanon, 'Every page has a canonical tag', $pgNoCanon ? count($pgNoCanon) . " page(s) without canonical: " . $list($pgNoCanon) : 'All set', 'Add a self-referencing canonical to every page.');
$add('Site-wide', 'pg_noindex', 'warning', !$pgNoindex, 'Linked pages can be indexed', $pgNoindex ? count($pgNoindex) . " linked page(s) are noindex: " . $list($pgNoindex) : 'None blocked', 'Check these pages. If they should rank, remove noindex. If not, stop linking to them prominently.');

// ---------- scoring (Semrush-style site health) ----------
$weights = ['error' => 10, 'warning' => 5, 'notice' => 2];
$themes = [];
$total = 0;
$got = 0;
$counts = ['error' => 0, 'warning' => 0, 'notice' => 0, 'passed' => 0];
foreach ($checks as $c) {
	$w = $weights[$c['severity']];
	$total += $w;
	$themes[$c['theme']] = $themes[$c['theme']] ?? ['max' => 0, 'got' => 0, 'issues' => 0];
	$themes[$c['theme']]['max'] += $w;
	if ($c['pass']) {
		$got += $w;
		$themes[$c['theme']]['got'] += $w;
		$counts['passed']++;
	} else {
		$counts[$c['severity']]++;
		$themes[$c['theme']]['issues']++;
	}
}
$score = $total ? (int) round($got / $total * 100) : 0;
$themeOut = [];
foreach ($themes as $name => $t) {
	$themeOut[] = ['name' => $name, 'score' => (int) round($t['got'] / $t['max'] * 100), 'issues' => $t['issues'], 'points' => $t['got'], 'max' => $t['max']];
}

$report = [
	'ok'      => true,
	'url'     => $final,
	'score'   => $score,
	'counts'  => $counts,
	'themes'  => $themeOut,
	'checks'  => $checks,
	'broken'  => array_slice($broken, 0, 10),
	'pages'   => $pageRows,
	'sitemapUrls' => $smUrls,
	'appendix' => [
		['title' => 'Pages crawled (' . count($pages) . ')', 'items' => $items['crawled'] ?? []],
		['title' => 'Home page heading outline', 'items' => $items['outline'] ?? []],
		['title' => 'Server response headers', 'items' => $items['headers'] ?? []],
		['title' => 'Page facts', 'items' => ['Title: ' . ($title ?: '(none)') . ' (' . $tl . ' chars)', 'Description: ' . ($desc ?: '(none)') . ' (' . $dl . ' chars)', 'Words: ' . $words, 'Text-to-HTML: ' . $textRatio . '%', 'HTML size: ' . round(strlen($html) / 1024) . ' KB', 'Response time: ' . $ms . ' ms', 'Images: ' . $imgs->length, 'Links: ' . $linkTotal . ' (' . count($internal) . ' internal, ' . count($externalUrls) . ' external)', 'JS files: ' . count($jsUrls) . ', CSS files: ' . count($cssUrls), 'Schema types: ' . ($schemaTypes ? implode(', ', $schemaTypes) : 'none'), 'Sitemap: ' . ($sitemapOk ? $sitemapOk . ' (' . $smUrls . ' URLs)' : 'not found')]],
	],
	'meta'    => ['title' => $title, 'description' => $desc, 'words' => $words, 'ms' => $ms, 'schema' => $schemaTypes, 'internal' => count($internal), 'external' => $external],
	'date'    => gmdate('c'),
];

// ---------- lead: email + private CSV ----------
$issues = array_filter($checks, function ($c) { return !$c['pass']; });
usort($issues, function ($a, $b) { $o = ['error' => 0, 'warning' => 1, 'notice' => 2]; return $o[$a['severity']] - $o[$b['severity']]; });
$lines = "New free SEO audit lead from prismworksstudio.co.uk\n\n";
foreach ([['Name', $lead['name']], ['Email', $lead['email']], ['Phone', $lead['phone']], ['Business', $lead['business']], ['Website', $final]] as $r) {
	if ($r[1] !== '') $lines .= "{$r[0]}: {$r[1]}\n";
}
$lines .= "\nSite health score: {$score}/100 ({$counts['error']} errors, {$counts['warning']} warnings, {$counts['notice']} notices)\n";
foreach ($themeOut as $t) $lines .= "- {$t['name']}: {$t['score']}%\n";
$lines .= "\nTop issues to talk about on the call:\n";
foreach (array_slice($issues, 0, 10) as $c) $lines .= '- [' . strtoupper($c['severity']) . "] {$c['label']}: {$c['detail']}\n";
$GLOBALS['pendingLead'] = null;
$sent = prism_mail("SEO audit lead: {$lead['name']} ({$fp['host']}, score {$score})", $lines, $lead['email']);

$dir = prism_private_dir();
if (is_dir($dir) && is_writable($dir)) {
	$csv = $dir . '/audit-leads.csv';
	$new = !file_exists($csv);
	if ($fh = @fopen($csv, 'a')) {
		if ($new) fputcsv($fh, ['date', 'name', 'email', 'phone', 'business', 'website', 'score', 'errors', 'warnings', 'notices', 'email_sent']);
		$safe = function ($v) { return preg_match('/^[=+\-@]/', (string) $v) ? "'" . $v : $v; };
		fputcsv($fh, array_map($safe, [gmdate('c'), $lead['name'], $lead['email'], $lead['phone'], $lead['business'], $final, $score, $counts['error'], $counts['warning'], $counts['notice'], $sent ? 'yes' : 'no']));
		fclose($fh);
	}
}
if (!$sent) {
	error_log('prism seo-audit: lead email failed for ' . $lead['email'] . ' ' . $final);
}

reply(200, $report);
