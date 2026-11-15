<?php
/*
 * COOLflex-Schnittstelle (PHP + SQLite)
 *
 * Lesen ist offen, Schreiben nur nach Anmeldung mit dem Passwort der Lehrkräfte.
 * Aufruf: api.php?aktion=<name>   (GET zum Lesen, POST mit JSON zum Schreiben)
 *
 *   GET  daten                 Aufträge und Einstellungen (öffentlich)
 *   GET  status                Ist diese Sitzung angemeldet? Ist ein Passwort eingerichtet?
 *   POST anmelden              {passwort}
 *   POST abmelden
 *   POST auftrag_speichern     {auftrag}        neu oder ändern
 *   POST auftrag_loeschen      {id}
 *   POST einstellungen         {einstellungen}
 *   POST import                {auftraege: [...]}  fügt fehlende Aufträge hinzu
 *   POST passwort_hash         {passwort}       liefert nur den Hash zum Eintragen in config.php
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const KLASSEN = ['11A', '11B', '11C', '11D'];
const FAECHER = ['P1', 'DE', 'EN', 'BIF', 'BVVW'];
const SOZIALFORMEN = ['', 'A', 'B', 'C'];

function antwort(array $daten, int $status = 200): never {
    http_response_code($status);
    echo json_encode($daten, JSON_UNESCAPED_UNICODE);
    exit;
}
function fehler(string $text, int $status = 400): never {
    antwort(['ok' => false, 'fehler' => $text], $status);
}

/* ---------- Konfiguration ---------- */
$configDatei = __DIR__ . '/config.php';
if (!is_file($configDatei)) {
    fehler('config.php fehlt. Bitte config.beispiel.php als config.php kopieren.', 500);
}
$cfg = require $configDatei;

$istHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

/* ---------- Sitzung ---------- */
session_name('coolflex');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => dirname($_SERVER['SCRIPT_NAME']) . '/',
    'secure' => $istHttps,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();
$angemeldet = !empty($_SESSION['lehrkraft']) && ($_SESSION['bis'] ?? 0) > time();

/* ---------- Datenbank ---------- */
function db(array $cfg): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $pfad = $cfg['datenbank'];
    $ordner = dirname($pfad);
    if (!is_dir($ordner) || !is_writable($ordner)) {
        fehler('Der Datenordner ist nicht beschreibbar: ' . basename($ordner), 500);
    }
    $pdo = new PDO('sqlite:' . $pfad, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA journal_mode = WAL');
    $pdo->exec('CREATE TABLE IF NOT EXISTS auftraege (
        id TEXT PRIMARY KEY,
        klassen TEXT NOT NULL,
        fach TEXT NOT NULL,
        titel TEXT NOT NULL,
        sozialform TEXT NOT NULL DEFAULT \'\',
        start TEXT NOT NULL,
        ende TEXT NOT NULL,
        umfang REAL NOT NULL,
        lehrkraft TEXT NOT NULL DEFAULT \'\',
        notiz TEXT NOT NULL DEFAULT \'\',
        geaendert TEXT NOT NULL
    )');
    $pdo->exec('CREATE TABLE IF NOT EXISTS einstellungen (schluessel TEXT PRIMARY KEY, wert TEXT NOT NULL)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS fehlversuche (adresse TEXT NOT NULL, zeit INTEGER NOT NULL)');
    return $pdo;
}

/* ---------- Prüfen der Eingaben ---------- */
function istDatum($s): bool {
    if (!is_string($s) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) return false;
    [$j, $m, $t] = array_map('intval', explode('-', $s));
    return checkdate($m, $t, $j);
}
function text($s, int $max): string {
    $s = is_string($s) ? trim($s) : '';
    $s = preg_replace('/[\x00-\x1F\x7F]/u', '', $s) ?? '';
    return mb_substr($s, 0, $max);
}
function pruefeAuftrag($a): array {
    if (!is_array($a)) fehler('Auftrag fehlt.');
    $id = text($a['id'] ?? '', 60);
    if (!preg_match('/^[A-Za-z0-9_-]{4,60}$/', $id)) fehler('Ungültige Kennung.');
    $klassen = array_values(array_intersect(KLASSEN, is_array($a['klassen'] ?? null) ? $a['klassen'] : []));
    if (!$klassen) fehler('Bitte mindestens eine Klasse wählen.');
    $fach = $a['fach'] ?? '';
    if (!in_array($fach, FAECHER, true)) fehler('Unbekanntes Fach.');
    $titel = text($a['titel'] ?? '', 90);
    if ($titel === '') fehler('Bitte einen Titel eintragen.');
    $soz = $a['sozialform'] ?? '';
    if (!in_array($soz, SOZIALFORMEN, true)) $soz = '';
    if (!istDatum($a['start'] ?? null) || !istDatum($a['ende'] ?? null)) fehler('Start und Ende als Datum angeben.');
    if ($a['ende'] < $a['start']) fehler('Das Ende liegt vor dem Start.');
    $umfang = (float)($a['umfang'] ?? 0);
    if ($umfang <= 0 || $umfang > 60) fehler('Umfang zwischen 0,5 und 60 Stunden.');
    return [
        'id' => $id, 'klassen' => $klassen, 'fach' => $fach, 'titel' => $titel, 'sozialform' => $soz,
        'start' => $a['start'], 'ende' => $a['ende'], 'umfang' => round($umfang, 1),
        'lehrkraft' => mb_strtoupper(text($a['lehrkraft'] ?? '', 8)), 'notiz' => text($a['notiz'] ?? '', 140),
        'geaendert' => gmdate('c'),
    ];
}
function pruefeEinstellungen($e): array {
    if (!is_array($e)) fehler('Einstellungen fehlen.');
    $min = (float)($e['min'] ?? -1); $max = (float)($e['max'] ?? -1); $par = (int)($e['maxParallel'] ?? 0);
    if ($min < 0 || $max <= $min || $max > 40) fehler('Zielbereich prüfen: „bis“ muss größer als „ab“ sein.');
    if ($par < 1 || $par > 20) fehler('Höchstzahl paralleler Aufträge zwischen 1 und 20.');
    $ferien = [];
    foreach (is_array($e['ferien'] ?? null) ? $e['ferien'] : [] as $f) {
        if (!is_array($f) || !istDatum($f['von'] ?? null) || !istDatum($f['bis'] ?? null) || $f['bis'] < $f['von']) continue;
        $ferien[] = ['von' => $f['von'], 'bis' => $f['bis'], 'name' => text($f['name'] ?? 'Ferien', 40) ?: 'Ferien'];
        if (count($ferien) >= 60) break;
    }
    return ['min' => $min, 'max' => $max, 'maxParallel' => $par, 'ferien' => $ferien];
}
function speichereAuftrag(PDO $pdo, array $a): void {
    $st = $pdo->prepare('INSERT INTO auftraege (id, klassen, fach, titel, sozialform, start, ende, umfang, lehrkraft, notiz, geaendert)
        VALUES (:id, :klassen, :fach, :titel, :sozialform, :start, :ende, :umfang, :lehrkraft, :notiz, :geaendert)
        ON CONFLICT(id) DO UPDATE SET klassen = excluded.klassen, fach = excluded.fach, titel = excluded.titel,
        sozialform = excluded.sozialform, start = excluded.start, ende = excluded.ende, umfang = excluded.umfang,
        lehrkraft = excluded.lehrkraft, notiz = excluded.notiz, geaendert = excluded.geaendert');
    $st->execute(array_merge($a, ['klassen' => json_encode($a['klassen'])]));
}

/* ---------- Anfrage verarbeiten ---------- */
$aktion = $_GET['aktion'] ?? '';
$methode = $_SERVER['REQUEST_METHOD'];
$eingabe = [];
if ($methode === 'POST') {
    // Nur JSON annehmen: verhindert, dass fremde Seiten Formulare hierher schicken.
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) fehler('Nur JSON wird angenommen.', 415);
    $roh = file_get_contents('php://input', false, null, 0, 2_000_000);
    $eingabe = json_decode($roh ?: '', true);
    if (!is_array($eingabe)) fehler('Ungültige Anfrage.');
}
$brauchtAnmeldung = function () use (&$angemeldet) {
    if (!$angemeldet) fehler('Bitte zuerst als Lehrkraft anmelden.', 401);
};

try {
    switch ("$methode $aktion") {

        case 'GET daten':
            $pdo = db($cfg);
            $zeilen = $pdo->query('SELECT * FROM auftraege ORDER BY start, ende')->fetchAll();
            foreach ($zeilen as &$z) { $z['klassen'] = json_decode($z['klassen'], true) ?: []; $z['umfang'] = (float)$z['umfang']; }
            $e = $pdo->query("SELECT wert FROM einstellungen WHERE schluessel = 'allgemein'")->fetchColumn();
            antwort(['ok' => true, 'auftraege' => $zeilen, 'einstellungen' => $e ? json_decode($e, true) : null, 'stand' => gmdate('c')]);

        case 'GET status':
            antwort(['ok' => true, 'angemeldet' => $angemeldet, 'passwortEingerichtet' => ($cfg['passwort_hash'] ?? '') !== '', 'https' => $istHttps]);

        case 'POST anmelden':
            if (!empty($cfg['nur_https']) && !$istHttps) fehler('Anmelden geht nur über eine sichere Verbindung (https).', 403);
            if (($cfg['passwort_hash'] ?? '') === '') fehler('Es ist noch kein Passwort eingerichtet (config.php).', 409);
            $pdo = db($cfg);
            $adresse = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? '');
            $pdo->prepare('DELETE FROM fehlversuche WHERE zeit < ?')->execute([time() - 900]);
            $st = $pdo->prepare('SELECT COUNT(*) FROM fehlversuche WHERE adresse = ?'); $st->execute([$adresse]);
            if ((int)$st->fetchColumn() >= (int)$cfg['max_fehlversuche']) fehler('Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.', 429);
            if (!password_verify((string)($eingabe['passwort'] ?? ''), $cfg['passwort_hash'])) {
                $pdo->prepare('INSERT INTO fehlversuche (adresse, zeit) VALUES (?, ?)')->execute([$adresse, time()]);
                usleep(600000);
                fehler('Das Passwort stimmt nicht.', 403);
            }
            session_regenerate_id(true);
            $_SESSION['lehrkraft'] = true;
            $_SESSION['bis'] = time() + (int)$cfg['sitzung_dauer'];
            antwort(['ok' => true, 'angemeldet' => true]);

        case 'POST abmelden':
            $_SESSION = [];
            session_destroy();
            antwort(['ok' => true, 'angemeldet' => false]);

        case 'POST auftrag_speichern':
            $brauchtAnmeldung();
            $a = pruefeAuftrag($eingabe['auftrag'] ?? null);
            speichereAuftrag(db($cfg), $a);
            antwort(['ok' => true, 'auftrag' => $a]);

        case 'POST auftrag_loeschen':
            $brauchtAnmeldung();
            $id = text($eingabe['id'] ?? '', 60);
            db($cfg)->prepare('DELETE FROM auftraege WHERE id = ?')->execute([$id]);
            antwort(['ok' => true]);

        case 'POST einstellungen':
            $brauchtAnmeldung();
            $e = pruefeEinstellungen($eingabe['einstellungen'] ?? null);
            db($cfg)->prepare("INSERT INTO einstellungen (schluessel, wert) VALUES ('allgemein', ?)
                ON CONFLICT(schluessel) DO UPDATE SET wert = excluded.wert")->execute([json_encode($e, JSON_UNESCAPED_UNICODE)]);
            antwort(['ok' => true, 'einstellungen' => $e]);

        case 'POST import':
            $brauchtAnmeldung();
            $liste = is_array($eingabe['auftraege'] ?? null) ? array_slice($eingabe['auftraege'], 0, 500) : [];
            $pdo = db($cfg);
            $vorhanden = array_flip($pdo->query('SELECT id FROM auftraege')->fetchAll(PDO::FETCH_COLUMN));
            $neu = 0;
            $pdo->beginTransaction();
            foreach ($liste as $roh) {
                if (!is_array($roh) || isset($vorhanden[$roh['id'] ?? ''])) continue;
                speichereAuftrag($pdo, pruefeAuftrag($roh));
                $neu++;
            }
            $pdo->commit();
            antwort(['ok' => true, 'neu' => $neu]);

        case 'POST passwort_hash':
            // Erlaubt, solange noch kein Passwort eingerichtet ist, oder für angemeldete Lehrkräfte (Passwort ändern).
            if (($cfg['passwort_hash'] ?? '') !== '' && !$angemeldet) fehler('Bitte zuerst anmelden.', 401);
            $pw = (string)($eingabe['passwort'] ?? '');
            if (mb_strlen($pw) < 10) fehler('Das Passwort braucht mindestens 10 Zeichen.');
            antwort(['ok' => true, 'hash' => password_hash($pw, PASSWORD_DEFAULT)]);

        default:
            fehler('Unbekannte Aktion.', 404);
    }
} catch (Throwable $t) {
    error_log('COOLflex-API: ' . $t->getMessage());
    fehler('Interner Fehler auf dem Server.', 500);
}
