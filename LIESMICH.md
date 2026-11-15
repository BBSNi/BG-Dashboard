# BG-Dashboard · Web-App für das Berufliche Gymnasium

Adresse: https://bbsni.github.io/BG-Dashboard/ (GitHub: `BBSNi/BG-Dashboard`).
Der Ordner im Second Brain heißt weiterhin `BG-Portal`, die Datei `config/portal.json` behält ihren Namen.

Entwurf, Stand 15.11.2026. Dashboard für Lernende (nach Einführungs- und Qualifikationsphase) mit vorbereitetem COOLflex-Auftragsplaner,
der erst ab dem COOLflex-Start erscheint (siehe „COOLflex-Schalter“).
Läuft als Webseite und lässt sich auf Handy und Tablet zum Homescreen hinzufügen (Web-App).

---

## Funktionen im Überblick

### Für alle (ohne Passwort)

| Bereich | Adresse | Was man dort sieht |
|---|---|---|
| **Start** | `#start` | Einführungsphase oder Qualifikationsphase wählen, Hinweise, Kacheln für diese Phase („Rechnen“, „Wissen und Regeln“), Links zu IServ, Moodle und Homepage. Ab COOLflex-Start zusätzlich die COOLflex-Woche der eigenen Klasse (Einführungsphase) |
| **Alle Seiten** | `#alle` | Alle Kacheln unabhängig von der Phase (mit Hinweis „Einführungsphase“ bzw. „Qualifikationsphase“) und die Schul-Links |
| **Meine Klasse** (ab COOLflex-Start) | `#klasse` | Aufträge der Woche als Karten (Fach, Sozialform, Abgabe, „noch X Tage“, Fortschritt), „Danach“-Vorschau, Zeitstrahl mit Wochenbelastung; Wochen vor- und zurückblättern |
| Direktlink je Klasse | `#klasse-11a` … `#klasse-11d` | wie oben, Klasse ist schon gewählt – für Links aus der IServ-Klassengruppe |

- **Phasenwahl** auf der Startseite, wird auf dem Gerät gemerkt (frühere Auswahl 11/12/13 wird umgerechnet). Ab COOLflex-Start wählt die Einführungsphase dort zusätzlich die Klasse (11A–11D).
- **Bezeichnungen:** Für Lernende nur „Einführungsphase“ und „Qualifikationsphase“, keine Jahrgangszahlen. Klassennamen (11A …) bleiben, aber **ohne Profilbezeichnung** (die Zuordnung Klasse ↔ Profil kann sich jedes Jahr ändern). Aufträge im Profilfach heißen „Profil“.
- **Logo:** Schullogo der BBS Nienburg (`icons/logo-bbs.png`, auf weißem Schild, auch im Dunkelmodus). Die App-Symbole stammen aus dem App-Symbol der Schulhomepage (180 × 180 Pixel); 192/512 sind daraus hochgerechnet und etwas weich – mit einer Originaldatei des Logos (SVG oder ≥ 512 Pixel) neu erzeugen.
- **Texte ohne direkte Anrede** (wie auf der Homepage, Fassung C).
- **Am Wochenende** zeigt alles schon die kommende Schulwoche.
- **Kacheln** kommen aus `config/portal.json` (siehe unten) – mit Zielgruppe, Phasen und Zeitraum (`sichtbar_ab` / `sichtbar_bis`).

### COOLflex-Schalter

In `config/portal.json` steht `"coolflex": { "sichtbar_ab": "2027-08-19" }` (Platzhalter: erster Schultag 2027/28).

| | vor dem Stichtag | ab dem Stichtag |
|---|---|---|
| Startseite Einführungsphase | nur Kacheln | zusätzlich COOLflex-Woche mit Klassenwahl |
| Navigation | Start · Alle Seiten | Start · Meine Klasse · Alle Seiten · Lehrkräfte |
| `#klasse`, `#klasse-11a` … | leiten zur Startseite | wie beschrieben |
| Lehrkräfte-Bereich | nur über den Direktlink `…/#coolflex` (für das COOL-Team zum Testen) | Link im Fuß und in der Navigation |
| Hinweis „Vorschau ohne Server“ | erscheint nicht | erscheint, wenn kein Server antwortet |

Ohne COOLflex braucht das Dashboard **keinen PHP-Server** – es kann so auf GitHub Pages laufen.
Zum COOLflex-Start: Datum prüfen, Server einrichten (siehe unten) und im Manifest die Kurzbefehle
„Meine Klasse“ und „Lehrkräfte“ wieder ergänzen (`manifest.webmanifest` → `shortcuts`).

### Bereich Lehrkräfte

| Bereich | Adresse | Passwort | Inhalt |
|---|---|---|---|
| **Dashboard** | `#coolflex` | nein | Klassenkacheln der Woche (Stunden, Anzahl, Ampelfarbe), Ampel der nächsten 6 Wochen, automatische Hinweise (zu viel, zu viele parallel, Abgaben, noch Platz) |
| **Ampel** | `#ampel` | nein | Klassen × Wochen (6–26 Wochen), Klick auf ein Feld zeigt die Aufträge dieser Woche und wie viel Platz ist |
| **Fach** | `#fach` | nein | Alle Aufträge eines Fachs über alle Klassen als Zeitstrahl |
| **Aufträge** | `#auftraege` | **ja** | Liste mit Filtern, Eintragen, Bearbeiten, Löschen; beim Eintragen sofortige Vorschau, ob eine Woche zu voll wird |
| **Verwaltung** | `#verwaltung` | **ja** | Zielbereich (Std./Woche), Höchstzahl paralleler Aufträge, Ferien; Export CSV/JSON, Import JSON; Passwort ändern |

**Rechenweg:** Der Umfang eines Auftrags wird gleichmäßig auf seine Schultage verteilt (ohne Wochenenden und Ferien).
Je Klasse und Woche wird summiert. Zielbereich 4–6 Std. (Ø 5), in Wochen mit Ferientagen anteilig.

### Web-App

- iPhone/iPad: Safari → Teilen → „Zum Home-Bildschirm“. Android: Chrome → „App installieren“.
- Startet ohne Adressleiste, mit eigenem Icon, auch **offline** (zuletzt geladene Daten mit „Stand: …“).
- Schul-iPads: Die Schul-IT kann das Icon als „Web-Clip“ an alle Geräte verteilen.

### Drei Betriebsarten (stellt die App selbst fest)

| Modus | Wann | Verhalten |
|---|---|---|
| **Server** | `api/api.php` antwortet | gemeinsame Daten für alle |
| **Offline** | Server war schon erreichbar, gerade nicht | zuletzt geladener Stand, Schreiben gesperrt |
| **Vorschau** | kein Server (Datei lokal, GitHub Pages) | Daten nur im eigenen Browser, jedes Passwort geht, „Beispiele laden“ möglich |

---

## Aufbau der Dateien

```
BG-Portal/
├── index.html             Gerüst, Symbole, Formular-Dialog
├── manifest.webmanifest   Name, Icons, Farben der Web-App
├── sw.js                  Service Worker (offline) – VERSION bei Änderungen erhöhen!
├── css/app.css            Gestaltung (Farben der BBS, hell/dunkel)
├── js/config.js           Klassen (ohne Profilbezeichnung), Pool-Fächer, Voreinstellungen, Ferien
├── js/kern.js             Datum, Berechnung der Wochenbelastung, Hinweise, Beispieldaten
├── js/daten.js            Zugriff auf den Server bzw. Vorschau-Speicher
├── js/ansichten.js        Start, Meine Klasse + Bausteine (Ampel, Zeitstrahl, Karten)
├── js/lehrkraefte.js      Dashboard, Ampel, Fach, Aufträge, Verwaltung, Formular
├── js/app.js              Seitenwechsel, Phasen-/Klassenwahl, COOLflex-Schalter in der Navigation, Meldungen
├── config/portal.json     Kacheln, Hinweise, Fußzeile des Portals
├── api/api.php            Schnittstelle (PHP + SQLite)
├── api/config.beispiel.php Vorlage für api/config.php (Passwort-Hash, Datenbankpfad)
├── api/selbsttest.php     prüft den Server – nach der Einrichtung löschen
├── data/                  Datenbank (per .htaccess gesperrt)
├── fonts/                 Inter und Space Grotesk, lokal (keine Google-Server, SIL Open Font License)
└── icons/                 App-Icons
```

Kein Build-Schritt, keine Bibliotheken: reines HTML, CSS, JavaScript und PHP.

---

## Weiterentwickeln

- **Neue Kachel im Portal:** Eintrag in `config/portal.json` → `kacheln`. Felder: `gruppe`, `titel`, `text`, `icon`
  (`rechner`, `karte`, `kalender`, `neu`, `buch`, `ampel`), `url` (leer = „folgt“), `zielgruppe`
  (`lernende`/`lehrkraefte`/`alle`), `phasen` (`"E"` = Einführungsphase, `"Q"` = Qualifikationsphase, beide oder weglassen = alle), optional `neu: true`, `sichtbar_ab` / `sichtbar_bis: "JJJJ-MM-TT"`.
  Neue Symbole: `link`, `alle`. Hinweise (`hinweise`) können ebenfalls `phasen` und `sichtbar_ab` haben.
- **Klassen oder Fächer ändern:** `js/config.js` und die Listen oben in `api/api.php` (`KLASSEN`, `FAECHER`).
- **Neue Ansicht:** Funktion in `ansichten.js` oder `lehrkraefte.js` schreiben, in `app.js` bei `ANSICHTEN` eintragen.
- **Nach jeder Änderung** in `sw.js` die `VERSION` hochzählen, sonst zeigen installierte Apps die alte Fassung.
- **Lokal ausprobieren:** im Ordner `python3 -m http.server 8765` starten, dann `http://localhost:8765` öffnen
  (läuft im Vorschau-Modus, weil Python kein PHP ausführt).

---

## Auf den Schulserver bringen

1. Server mit **PHP ab 8.1**, `pdo_sqlite`, `mbstring` und **https**.
2. Ordner hochladen (ohne `.git`).
3. `api/config.beispiel.php` als `api/config.php` kopieren. Datenbankpfad am besten außerhalb des Web-Ordners.
4. `…/api/selbsttest.php` aufrufen – alles grün? Dann `selbsttest.php` löschen.
5. App öffnen → Lehrkräfte → Aufträge → **Passwort einrichten** → Hash in `config.php` eintragen.
6. In IServ verlinken: `…/#start` für Lernende, `…/#klasse-11b` je Klasse, `…/#coolflex` für das COOL-Team.

Auf einem Server ohne Apache (z. B. nginx) gelten die `.htaccess`-Dateien nicht.
Dann `data/` und `api/config.php` in der Serverkonfiguration sperren.

---

## Datenschutz

- Keine Daten von Lernenden. Gespeichert werden nur Aufträge (Titel, Zeitraum, Umfang, Fach, Klasse) und freiwillig ein Kürzel der Lehrkraft.
- Lesen ist für alle mit dem Link möglich (Auftragstitel sind unkritisch).
- Schriften liegen lokal, es werden keine Google-Server aufgerufen.

---

## Offen / noch zu prüfen

- [ ] `api/api.php` ist **noch nicht auf einem echten PHP-Server getestet** (auf diesem Mac gibt es kein PHP).
- [ ] Offline-Funktion (Service Worker) im Test-Browser nicht prüfbar – auf Handy/Tablet testen.
- [x] Adresse des **Abiturrechners** in `config/portal.json` eintragen (2026-11-15: https://bbsni.github.io/schulrechner/Abitur/).
- [ ] **Starttermin COOLflex** festlegen und `coolflex.sichtbar_ab` anpassen.
- [ ] **Ferientermine** mit dem Kultusministerium abgleichen (Verwaltung bzw. `js/config.js`).
- [ ] Zielgruppe der Seite Fehlzeiten prüfen (teils an Lehrkräfte gerichtet). Oberstufenreform: Kachel am 2026-11-15 entfernt – wird anders veröffentlicht.
- [ ] Welcher Schulserver? Mit der Schul-IT bzw. dem Schulträger klären.
