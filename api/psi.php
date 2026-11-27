<?php
/**
 * PageSpeed Insights proxy for the free SEO audit (/free-seo-audit/).
 * Keeps the Google API key out of the website code: the key lives in the private config
 * OUTSIDE public_html, the same file the contact form uses:
 *   /home/<hostinger-user>/prism-private/mail-config.php  ->  return [ ..., 'psi_key' => 'AIza...' ];
 * Without a key it still works, using Google's small shared keyless quota.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');
require __DIR__ . '/_mail.php';

$url = isset($_GET['url']) && is_string($_GET['url']) ? trim($_GET['url']) : '';
if ($url === '' || strlen($url) > 300 || !preg_match('#^https?://[a-z0-9.-]+\.[a-z]{2,}(/[^\s]*)?$#i', $url)) {
	http_response_code(400);
	echo '{"error":"bad url"}';
	exit;
}

// 6 speed tests per IP per 10 minutes
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/prism-psi-' . md5($ip);
$hits = array_filter(explode(',', (string) @file_get_contents($rateFile)), function ($t) { return $t !== '' && (int) $t > time() - 600; });
if (count($hits) >= 6) {
	http_response_code(429);
	echo '{"error":"rate limited"}';
	exit;
}
$hits[] = time();
@file_put_contents($rateFile, implode(',', $hits));

$cfg = prism_mail_config();
// Key is restricted in Google Cloud to the PageSpeed Insights API and prismworksstudio.co.uk referrers.
$key = isset($cfg['psi_key']) && is_string($cfg['psi_key']) ? $cfg['psi_key'] : 'AIzaSyC0BLwrcwQuRBXFFOH4bFdpKoG_TFz5f6k';
$api = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed?strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo&url=' . rawurlencode($url) . ($key !== '' ? '&key=' . rawurlencode($key) : '');

@set_time_limit(100);
$ch = curl_init($api);
$opts = [
	CURLOPT_RETURNTRANSFER => true,
	CURLOPT_TIMEOUT        => 90,
	CURLOPT_CONNECTTIMEOUT => 10,
	CURLOPT_ENCODING       => '',
	// the key is restricted to prismworksstudio.co.uk referrers
	CURLOPT_HTTPHEADER     => ['Referer: https://prismworksstudio.co.uk/free-seo-audit/'],
];
if (stripos(PHP_OS, 'WIN') === 0 && !ini_get('curl.cainfo') && defined('CURLSSLOPT_NATIVE_CA')) {
	$opts[CURLOPT_SSL_OPTIONS] = CURLSSLOPT_NATIVE_CA;
}
curl_setopt_array($ch, $opts);
$body = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);

if ($code !== 200 || !$body) {
	http_response_code(502);
	echo '{"error":"pagespeed unavailable"}';
	exit;
}
// return only what the report uses, to keep the response small
$d = json_decode($body, true);
$lr = $d['lighthouseResult'] ?? [];
$out = ['lighthouseResult' => ['categories' => [], 'audits' => []]];
foreach ($lr['categories'] ?? [] as $k => $c) $out['lighthouseResult']['categories'][$k] = ['score' => $c['score'] ?? null];
foreach (['largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index', 'first-contentful-paint'] as $a) {
	if (isset($lr['audits'][$a])) $out['lighthouseResult']['audits'][$a] = ['score' => $lr['audits'][$a]['score'] ?? null, 'displayValue' => $lr['audits'][$a]['displayValue'] ?? ''];
}
echo json_encode($out, JSON_UNESCAPED_SLASHES);
