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
    ferien: [
      { von: "2026-12-23", bis: "2027-01-09", name: "Weihnachtsferien" },
      { von: "2027-02-01", bis: "2027-02-02", name: "Halbjahresferien" },
      { von: "2027-03-22", bis: "2027-04-03", name: "Osterferien" },
      { von: "2027-05-06", bis: "2027-05-06", name: "Christi Himmelfahrt" },
      { von: "2027-05-17", bis: "2027-05-17", name: "Pfingstmontag" },
      { von: "2027-07-08", bis: "2027-08-18", name: "Sommerferien" },
      { von: "2027-10-16", bis: "2027-10-30", name: "Herbstferien" },
      { von: "2027-12-23", bis: "2028-01-08", name: "Weihnachtsferien" }
    ]
  },

  /* Adresse der Server-Schnittstelle (relativ zur index.html) */
  api: "api/api.php"
};
