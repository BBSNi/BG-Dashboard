<?php
/* Prüft, ob der Server alles mitbringt. Nach der Einrichtung löschen. */
header('Content-Type: text/html; charset=utf-8');
$ok = fn($b) => $b ? '✅' : '❌';
$cfgDa = is_file(__DIR__ . '/config.php');
$cfg = $cfgDa ? require __DIR__ . '/config.php' : [];
$ordner = dirname($cfg['datenbank'] ?? (__DIR__ . '/../data/x'));
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
$tests = [
  'PHP-Version mindestens 8.1 (vorhanden: ' . PHP_VERSION . ')' => version_compare(PHP_VERSION, '8.1', '>='),
  'SQLite für PHP (pdo_sqlite)' => extension_loaded('pdo_sqlite'),
  'Mehrbyte-Texte (mbstring)' => extension_loaded('mbstring'),
  'config.php vorhanden' => $cfgDa,
  'Passwort-Hash in config.php eingetragen' => ($cfg['passwort_hash'] ?? '') !== '',
  'Datenordner beschreibbar' => is_dir($ordner) && is_writable($ordner),
  'Sichere Verbindung (https)' => $https,
];
echo '<!doctype html><meta name="viewport" content="width=device-width"><title>Selbsttest</title><body style="font-family:system-ui;max-width:40rem;margin:2rem auto;padding:0 1rem"><h1>COOLflex – Selbsttest</h1><ul style="list-style:none;padding:0;line-height:2">';
foreach ($tests as $t => $b) echo '<li>' . $ok($b) . ' ' . htmlspecialchars($t) . '</li>';
echo '</ul><p>Wenn alles grün ist: diese Datei (selbsttest.php) vom Server löschen.</p>';
