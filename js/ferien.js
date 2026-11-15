/* Ferien und Feiertage in Niedersachsen – eine Quelle für den Kalender und für COOLflex.

   FERIEN: amtliche Termine (erster und letzter Ferientag, jeweils einschließlich).
   Quelle: Kultusministerkonferenz, „Ferien im Schuljahr …“, Stand 09.10.2025 (www.kmk.org/service/ferienregelung.html),
   Zeile Niedersachsen. Neue Schuljahre einfach unten anhängen und ABGEDECKT_BIS anpassen.

   FEIERTAGE: werden berechnet (gesetzliche Feiertage in Niedersachsen, auch Ostern, Himmelfahrt und Pfingsten). */
window.BG = window.BG || {};

(function () {
  "use strict";

  const QUELLE = "Kultusministerkonferenz, Stand 09.10.2025";
  const ABGEDECKT_AB = "2026-09-01";     // davor sind keine Ferien hinterlegt
  const ABGEDECKT_BIS = "2029-08-31";    // danach sind keine Ferien hinterlegt

  const FERIEN = [
    /* Schuljahr 2026/27 */
    { name: "Herbstferien", von: "2026-10-12", bis: "2026-10-24" },
    { name: "Weihnachtsferien", von: "2026-12-23", bis: "2027-01-09" },
    { name: "Halbjahresferien", von: "2027-02-01", bis: "2027-02-02" },
    { name: "Osterferien", von: "2027-03-22", bis: "2027-04-03" },
    { name: "Ferientag nach Himmelfahrt", von: "2027-05-07", bis: "2027-05-07" },
    { name: "Ferientag nach Pfingsten", von: "2027-05-18", bis: "2027-05-18" },
    { name: "Sommerferien", von: "2027-07-08", bis: "2027-08-18" },
    /* Schuljahr 2027/28 */
    { name: "Herbstferien", von: "2027-10-16", bis: "2027-10-30" },
    { name: "Weihnachtsferien", von: "2027-12-23", bis: "2028-01-08" },
    { name: "Halbjahresferien", von: "2028-01-31", bis: "2028-02-01" },
    { name: "Osterferien", von: "2028-04-10", bis: "2028-04-22" },
    { name: "Ferientag nach Himmelfahrt", von: "2028-05-26", bis: "2028-05-26" },
    { name: "Ferientag nach Pfingsten", von: "2028-06-06", bis: "2028-06-06" },
    { name: "Sommerferien", von: "2028-07-20", bis: "2028-08-30" },
    /* Schuljahr 2028/29 */
    { name: "Ferientag (Brückentag)", von: "2028-10-02", bis: "2028-10-02" },
    { name: "Herbstferien", von: "2028-10-23", bis: "2028-11-04" },
    { name: "Weihnachtsferien", von: "2028-12-27", bis: "2029-01-06" },
    { name: "Halbjahresferien", von: "2029-02-01", bis: "2029-02-02" },
    { name: "Osterferien", von: "2029-03-19", bis: "2029-04-03" },
    { name: "Ferientag (Brückentag)", von: "2029-04-30", bis: "2029-04-30" },
    { name: "Ferientag nach Himmelfahrt", von: "2029-05-11", bis: "2029-05-11" },
    { name: "Ferientag nach Pfingsten", von: "2029-05-22", bis: "2029-05-22" },
    { name: "Sommerferien", von: "2029-07-19", bis: "2029-08-29" }
  ];

  const pad = n => String(n).padStart(2, "0");
  const text = (j, m, t) => `${j}-${pad(m)}-${pad(t)}`;

  /* Ostersonntag (Gaußsche Osterformel in der Fassung nach Meeus/Jones/Butcher) */
  function ostern(j) {
    const a = j % 19, b = Math.floor(j / 100), c = j % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(j, monat - 1, tag));
  }
  const plus = (datum, tage) => { const d = new Date(datum); d.setUTCDate(d.getUTCDate() + tage); return d.toISOString().slice(0, 10); };

  /* Gesetzliche Feiertage in Niedersachsen */
  function feiertage(j) {
    const o = ostern(j);
    return [
      { name: "Neujahr", datum: text(j, 1, 1) },
      { name: "Karfreitag", datum: plus(o, -2) },
      { name: "Ostermontag", datum: plus(o, 1) },
      { name: "Tag der Arbeit", datum: text(j, 5, 1) },
      { name: "Christi Himmelfahrt", datum: plus(o, 39) },
      { name: "Pfingstmontag", datum: plus(o, 50) },
      { name: "Tag der Deutschen Einheit", datum: text(j, 10, 3) },
      { name: "Reformationstag", datum: text(j, 10, 31) },
      { name: "1. Weihnachtstag", datum: text(j, 12, 25) },
      { name: "2. Weihnachtstag", datum: text(j, 12, 26) }
    ];
  }

  /* Für COOLflex: Ferien plus Feiertage, die auf einen Wochentag fallen (unterrichtsfrei) */
  function freieTageFuerCoolflex() {
    const liste = FERIEN.map(f => ({ ...f }));
    const von = Number(ABGEDECKT_AB.slice(0, 4)), bis = Number(ABGEDECKT_BIS.slice(0, 4));
    for (let j = von; j <= bis; j++) {
      for (const f of feiertage(j)) {
        const w = new Date(f.datum + "T00:00:00Z").getUTCDay();
        if (w >= 1 && w <= 5 && f.datum >= ABGEDECKT_AB && f.datum <= ABGEDECKT_BIS) liste.push({ name: f.name, von: f.datum, bis: f.datum });
      }
    }
    return liste.sort((a, b) => a.von.localeCompare(b.von));
  }

  BG.ferien = { QUELLE, ABGEDECKT_AB, ABGEDECKT_BIS, FERIEN, ostern, feiertage, freieTageFuerCoolflex };
})();
