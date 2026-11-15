<?php
/*
 * Konfiguration der COOLflex-Schnittstelle.
 *
 * Auf dem Server diese Datei als "config.php" kopieren und dort anpassen.
 * config.php gehört NICHT ins öffentliche GitHub-Repository (steht in .gitignore).
 */
return [
    // Passwort der Lehrkräfte – nur als Hash, nie im Klartext.
    // Hash erzeugen: Web-App öffnen → "Bereich Lehrkräfte" → "Passwort einrichten",
    // dort das gewünschte Passwort eingeben und den angezeigten Hash hier einfügen.
    'passwort_hash' => '',

    // Speicherort der Datenbank. Am besten außerhalb des öffentlichen Web-Ordners,
    // z. B. '/var/www/daten/coolflex.sqlite'. Der Ordner muss für PHP beschreibbar sein.
    'datenbank' => __DIR__ . '/../data/coolflex.sqlite',

    // Wie lange eine Anmeldung gilt (Sekunden). 8 Stunden = ein Schultag.
    'sitzung_dauer' => 8 * 60 * 60,

    // Schutz vor Ausprobieren: so viele Fehlversuche je Adresse in 15 Minuten.
    'max_fehlversuche' => 8,

    // Nur über HTTPS anmelden lassen (auf dem Server immer true lassen).
    'nur_https' => true,
];
