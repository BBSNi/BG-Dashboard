/* Feste Grunddaten für COOLflex. Hier anpassen, wenn sich Klassen oder Fächer ändern. */
window.BG = window.BG || {};

BG.config = {
  /* Klassen, die am COOLflex-Pool teilnehmen (Einführungsphase).
     Bewusst ohne Profilbezeichnung – die Zuordnung Klasse ↔ Profil kann sich jedes Jahr ändern. */
  klassen: ["11A", "11B", "11C", "11D"],

  /* Fächer, die Stunden in den COOLflex-Pool geben (Stand 12.11.2026: ohne Mathematik) */
  faecher: [
    { id: "P1", name: "Profilfach", farbe: "--f-p1" },
    { id: "DE", name: "Deutsch", farbe: "--f-de" },
    { id: "EN", name: "Englisch", farbe: "--f-en" },
    { id: "BIF", name: "Berufliche Informatik", farbe: "--f-bif" },
    { id: "BVVW", name: "BV/VW", farbe: "--f-bvvw" }
  ],

  sozialformen: { A: "im Team", B: "allein", C: "offen" },

  /* Voreinstellungen, solange auf dem Server nichts anderes gespeichert ist */
  einstellungen: {
    min: 4,
    max: 6,
    maxParallel: 4,
    /* Ferien und unterrichtsfreie Feiertage kommen aus js/ferien.js (dieselben Daten wie der Kalender).
       In der Verwaltung gespeicherte Ferien gehen weiterhin vor. */
    ferien: BG.ferien.freieTageFuerCoolflex()
  },

  /* Adresse der Server-Schnittstelle (relativ zur index.html) */
  api: "api/api.php"
};
