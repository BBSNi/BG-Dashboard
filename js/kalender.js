/* Ansicht „Ferien und Feiertage“: Monatskalender für Niedersachsen (Daten aus js/ferien.js). */
(function () {
  "use strict";
  const { D, H } = BG;
  const FE = BG.ferien;
  const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

  /* Monat als Zahl: Jahr * 12 + Monat (0–11) */
  const heuteMonat = () => { const d = new Date(D.heute() * 864e5); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
  let monat = heuteMonat();

  /* Alle Ferien- und Feiertage als Tageszahlen */
  const ferienTag = new Map();     // Tageszahl → Name der Ferien
  for (const f of FE.FERIEN) for (let n = D.vonText(f.von); n <= D.vonText(f.bis); n++) ferienTag.set(n, f.name);
  const feiertagCache = new Map();
  function feiertagsMap(jahr) {
    if (!feiertagCache.has(jahr)) feiertagCache.set(jahr, new Map(FE.feiertage(jahr).map(f => [D.vonText(f.datum), f.name])));
    return feiertagCache.get(jahr);
  }
  const feiertag = n => feiertagsMap(new Date(n * 864e5).getUTCFullYear()).get(n);

  /* Nächste Ferien ab heute (laufende zählen mit) */
  function naechsteFerien() {
    const heute = D.heute();
    const f = FE.FERIEN.find(x => D.vonText(x.bis) >= heute);
    if (!f) return "";
    const a = D.vonText(f.von), b = D.vonText(f.bis);
    if (a <= heute) return `<b>${H.esc(f.name)}</b> – noch bis ${D.tmj(b)}`;
    const tage = a - heute;
    return `Nächste Ferien: <b>${H.esc(f.name)}</b> ab ${D.wochentagKurz(a)}, ${D.tmj(a)} · in ${tage} ${tage === 1 ? "Tag" : "Tagen"}`;
  }

  function ansicht() {
    const jahr = Math.floor(monat / 12), m = monat % 12;
    const erster = D.vonText(`${jahr}-${String(m + 1).padStart(2, "0")}-01`);
    const tageImMonat = new Date(Date.UTC(jahr, m + 1, 0)).getUTCDate();
    const versatz = (D.wochentag(erster) + 6) % 7;          // Montag = 0
    const heute = D.heute();
    const ab = D.vonText(FE.ABGEDECKT_AB), bis = D.vonText(FE.ABGEDECKT_BIS);

    let zellen = "";
    for (let i = 0; i < versatz; i++) zellen += `<span class="kal-tag leer" aria-hidden="true"></span>`;
    const eintraege = [];
    for (let t = 1; t <= tageImMonat; t++) {
      const n = erster + t - 1, w = D.wochentag(n);
      const fe = ferienTag.get(n), ft = feiertag(n);
      const kl = ["kal-tag"];
      if (w === 0 || w === 6) kl.push("we");
      if (fe) kl.push("ferien");
      if (ft) kl.push("feiertag");
      if (n === heute) kl.push("heute");
      const titel = [ft, fe].filter(Boolean).join(" · ");
      zellen += `<span class="${kl.join(" ")}"${titel ? ` title="${H.esc(titel)}"` : ""}>${t}${titel ? `<span class="sr">, ${H.esc(titel)}</span>` : ""}</span>`;
      if (ft) eintraege.push({ n, text: `<b>${D.tm(n)}</b> ${H.esc(ft)}`, art: "feiertag" });
    }
    /* Ferien, die in diesen Monat fallen (auch angeschnittene) */
    const letzter = erster + tageImMonat - 1;
    for (const f of FE.FERIEN) {
      const a = D.vonText(f.von), b = D.vonText(f.bis);
      if (b < erster || a > letzter) continue;
      eintraege.push({ n: Math.max(a, erster), text: `<b>${a === b ? D.tm(a) : D.tm(a) + " – " + D.tm(b)}</b> ${H.esc(f.name)}`, art: "ferien" });
    }
    eintraege.sort((x, y) => x.n - y.n);
    const ohneDaten = letzter < ab || erster > bis;

    return `<div class="seitenkopf"><div><h1>Ferien und Feiertage</h1><p class="leise">Niedersachsen · ${naechsteFerien() || "Ferientermine folgen"}</p></div></div>
      <section class="karte kalender">
        <div class="kal-kopf">
          <button type="button" class="symbolknopf" data-monat="-1" aria-label="Vorheriger Monat"><svg width="18" height="18"><use href="#i-links"/></svg></button>
          <h2 aria-live="polite">${MONATE[m]} ${jahr}</h2>
          <button type="button" class="symbolknopf" data-monat="1" aria-label="Nächster Monat"><svg width="18" height="18"><use href="#i-rechts"/></svg></button>
        </div>
        <div class="kal-raster" role="grid" aria-label="${MONATE[m]} ${jahr}">
          ${["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(t => `<span class="kal-wt" aria-hidden="true">${t}</span>`).join("")}
          ${zellen}
        </div>
        <div class="kal-legende"><span class="l-ferien">Ferien</span><span class="l-feiertag">Feiertag</span><span class="l-heute">heute</span></div>
        ${monat !== heuteMonat() ? `<button type="button" class="knopf" data-monat="0" style="align-self:center">Zum aktuellen Monat</button>` : ""}
      </section>
      <section class="karte">
        <h2>In diesem Monat</h2>
        ${eintraege.length ? `<ul class="kal-liste">${eintraege.map(e => `<li class="${e.art}">${e.text}</li>`).join("")}</ul>` : `<p class="leerzustand">Keine Ferien und keine Feiertage.</p>`}
        ${ohneDaten ? `<p class="hinweis-klein">Für diesen Zeitraum sind noch keine Ferientermine hinterlegt – angezeigt werden nur die Feiertage.</p>` : ""}
      </section>
      <p class="datenschutz">Quelle der Ferientermine: ${H.esc(FE.QUELLE)}. Feiertage: gesetzliche Feiertage in Niedersachsen. Angaben ohne Gewähr.</p>`;
  }

  /* Blättern */
  document.addEventListener("click", ev => {
    const b = ev.target.closest("[data-monat]"); if (!b) return;
    const s = Number(b.dataset.monat);
    monat = s === 0 ? heuteMonat() : monat + s;
    const ziel = document.getElementById("ansicht"); if (ziel) ziel.innerHTML = ansicht();
  });

  BG.kalender = { ansicht };
})();
