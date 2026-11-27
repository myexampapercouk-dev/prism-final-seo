<?php
/**
 * Shared mail helper for the site's PHP endpoints. Defines functions only; requesting it directly does nothing.
 *
 * Credentials are NEVER in this file or the repo. They come from the same optional private file as
 * the website, kept OUTSIDE the web root: /home/<hostinger-user>/prism-private/mail-config.php (same file the contact form uses)
 * Without it, mail goes to the public business address through PHP mail().
 */

if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
	http_response_code(404);
	exit;
}

function prism_private_dir() {
	return dirname(__DIR__, 2) . '/prism-private'; // outside public_html, shared with send-quote.php
}

function prism_mail_config() {
	$file = prism_private_dir() . '/mail-config.php';
	$cfg = is_readable($file) ? (include $file) : [];
	if (!is_array($cfg)) {
		$cfg = [];
	}
	if (empty($cfg['mail_to'])) {
		$cfg['mail_to'] = 'contact@prismworks.studio';
	}
	return $cfg;
}

/** Sends a plain-text email to the site owner. Returns true on success. */
function prism_mail($subject, $text, $replyTo = '') {
	$cfg = prism_mail_config();
	$subject = trim(preg_replace('/[\r\n]+/', ' ', $subject));
	$replyTo = preg_match('/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/', $replyTo) ? $replyTo : '';
	$to = $cfg['mail_to'];
	if (!empty($cfg['smtp_user']) && !empty($cfg['smtp_pass'])) {
		return prism_smtp_send(
			$cfg['smtp_host'] ?? 'smtp.gmail.com',
			(int) ($cfg['smtp_port'] ?? 465),
			$cfg['smtp_user'],
			preg_replace('/\s+/', '', $cfg['smtp_pass']),
			$cfg['smtp_user'],
			$to,
			$subject,
			$text,
			$replyTo
		);
	}
	$host = preg_replace('/^www\./', '', $_SERVER['HTTP_HOST'] ?? 'prismworksstudio.co.uk');
	$host = preg_replace('/:\d+$/', '', $host);
	$from = 'website@' . preg_replace('/[^a-z0-9.-]/i', '', $host);
	$headers = "From: Prism Works Studio Website <{$from}>\r\nContent-Type: text/plain; charset=UTF-8\r\n" . ($replyTo ? "Reply-To: {$replyTo}\r\n" : '');
	return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $text, $headers, '-f' . $from);
}

/** Minimal SMTP client over implicit TLS (port 465) with AUTH LOGIN. */
function prism_smtp_send($host, $port, $user, $pass, $from, $to, $subject, $text, $replyTo) {
	$sock = @stream_socket_client("ssl://{$host}:{$port}", $errno, $errstr, 15);
	if (!$sock) {
		error_log("prism mail: SMTP connect failed: {$errstr}");
		return false;
	}
	stream_set_timeout($sock, 15);
	$read = function () use ($sock) {
		$out = '';
		while (($line = fgets($sock, 515)) !== false) {
			$out .= $line;
			if (strlen($line) < 4 || $line[3] !== '-') {
				break;
			}
		}
		return $out;
	};
	$cmd = function ($line, $expect) use ($sock, $read) {
		if ($line !== null) {
			fwrite($sock, $line . "\r\n");
		}
		$resp = $read();
		if (strpos($resp, (string) $expect) !== 0) {
			error_log('prism mail: SMTP unexpected reply: ' . trim($resp));
			return false;
		}
		return true;
	};
	$domain = preg_replace('/^.*@/', '', $from);
	$headers = 'Date: ' . date('r') . "\r\nFrom: Prism Works Studio Website <{$from}>\r\nTo: <{$to}>\r\n" .
		($replyTo ? "Reply-To: <{$replyTo}>\r\n" : '') .
		'Subject: =?UTF-8?B?' . base64_encode($subject) . "?=\r\nMessage-ID: <" . bin2hex(random_bytes(12)) . "@{$domain}>\r\nMIME-Version: 1.0\r\n" .
		"Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n";
	$ok = $cmd(null, 220)
		&& $cmd('EHLO ' . $domain, 250)
		&& $cmd('AUTH LOGIN', 334)
		&& $cmd(base64_encode($user), 334)
		&& $cmd(base64_encode($pass), 235)
		&& $cmd("MAIL FROM:<{$from}>", 250)
		&& $cmd("RCPT TO:<{$to}>", 250)
		&& $cmd('DATA', 354)
		&& $cmd($headers . "\r\n" . chunk_split(base64_encode($text)) . "\r\n.", 250);
	fwrite($sock, "QUIT\r\n");
	fclose($sock);
	return $ok;
}
