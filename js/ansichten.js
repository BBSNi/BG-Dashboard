/* Ansichten für alle: Start (Dashboard) und Meine Klasse. Dazu Bausteine, die auch der Lehrkräfte-Bereich nutzt. */
(function () {
  "use strict";
  const { D, H, F, R } = BG;
  const C = BG.config;
  const Z = BG.zustand = {
    klasse: H.speicher.lesen("bg-klasse", ""),
    woche: D.schulwoche(),            // gewählte Woche (Montag) für Klasse und Dashboard
    ampelStart: D.schulwoche() - 7,   // erste Woche der großen Ampel
    ampelWochen: H.speicher.lesen("bg-ampel-wochen", 12),
    auswahl: null,                          // gewählte Zelle der Ampel {k, mo}
    fach: "DE", filterKlasse: "alle", filterFach: "alle"
  };
  const istCoolKlasse = k => C.klassen.includes(k);

  /* ---------- Bausteine ---------- */
  const B = {
    wochenwahl(mo, id) {
      const heuteMo = D.schulwoche();
      const zusatz = mo === heuteMo ? "diese Woche" : mo === heuteMo + 7 ? "nächste Woche" : mo === heuteMo - 7 ? "letzte Woche" : "";
      return `<div class="wochenwahl" data-wochenwahl="${id}">
        <button type="button" class="symbolknopf" data-woche="-1" aria-label="Woche zurück"><svg width="18" height="18"><use href="#i-links"/></svg></button>
        <span class="label">KW ${D.kw(mo)} · ${D.tm(mo)}–${D.tm(mo + 4)}${zusatz ? ` <span class="leise klein">(${zusatz})</span>` : ""}</span>
        <button type="button" class="symbolknopf" data-woche="1" aria-label="Woche vor"><svg width="18" height="18"><use href="#i-rechts"/></svg></button>
        ${mo !== heuteMo ? `<button type="button" class="knopf leer" data-woche="0">Heute</button>` : ""}
      </div>`;
    },
    klassenwahl(aktiv, attr = "data-klasse") {
      return `<div class="klassenwahl" role="group" aria-label="Klasse">${C.klassen.map(k => `<button type="button" ${attr}="${k}" aria-pressed="${k === aktiv}">${k}</button>`).join("")}</div>`;
    },
    legende() {
      const e = R.einstellungen();
      return `<div class="legende">
        <span><i class="st-wenig"></i>unter ${H.std(e.min)} Std.</span><span><i class="st-ok"></i>${H.std(e.min)}–${H.std(e.max)} Std.</span>
        <span><i class="st-viel"></i>über ${H.std(e.max)} Std.</span><span><i class="st-leer"></i>nichts</span><span><i class="st-ferien" style="border:1px solid var(--linie)"></i>Ferien</span>
        <span><b style="color:var(--st-viel-t)">!</b> mehr als ${e.maxParallel} parallel</span></div>`;
    },
    /* Ampel: Klassen × Wochen */
    ampel(abMo, wochen, { kompakt = false, auswahl = null } = {}) {
      const A = BG.Daten.auftraege, heuteMo = D.schulwoche();
      let h = `<table class="ampel${kompakt ? " kompakt" : ""}"><thead><tr><th class="zeile"></th>`;
      for (let w = 0; w < wochen; w++) { const mo = abMo + w * 7; h += `<th class="${mo === heuteMo ? "jetzt" : ""}"><span class="kw">${kompakt ? "" : "KW "}${D.kw(mo)}</span>${kompakt ? "" : D.tm(mo)}</th>`; }
      h += `</tr></thead><tbody>`;
      for (const k of C.klassen) {
        h += `<tr><th class="zeile" scope="row">${k}</th>`;
        for (let w = 0; w < wochen; w++) {
          const mo = abMo + w * 7, st = R.woche(k, mo, A);
          if (st.status === "ferien") { h += `<td><div class="zelle st-ferien" title="${H.esc(R.ferienName(mo + 1))}"><small>Ferien</small>${kompakt ? "F" : ""}</div></td>`; continue; }
          const gew = auswahl && auswahl.k === k && auswahl.mo === mo;
          const fl = st.anzahl > R.einstellungen().maxParallel ? `<span class="flagge">!</span>` : "";
          const lbl = `${k}, KW ${D.kw(mo)}: ${H.std(st.stunden)} Stunden, ${st.anzahl} Aufträge, ${R.statusText[st.status]}`;
          h += `<td><button type="button" class="zelle st-${st.status}${gew ? " gewaehlt" : ""}" data-zelle="${k}|${mo}" aria-label="${H.esc(lbl)}">${fl}<b>${st.anzahl ? H.std(st.stunden) : "–"}</b><small>${st.anzahl === 1 ? "1 Auftrag" : st.anzahl + " Aufträge"}</small></button></td>`;
        }
        h += `</tr>`;
      }
      return h + `</tbody></table>`;
    },
    /* Liste der Aufträge einer Woche mit Anteil */
    wochenliste(k, mo) {
      const st = R.woche(k, mo, BG.Daten.auftraege);
      if (!st.liste.length) return `<p class="leerzustand">In dieser Woche läuft für ${k} kein Auftrag.</p>`;
      return `<ul class="auftragsliste">${st.liste.sort((x, y) => y.anteil - x.anteil).map(({ a, anteil }) => `<li>${F.chip(a.fach, k)}<span class="t"><strong>${H.esc(a.titel)}</strong> ${F.soz(a.sozialform)} <span class="leise klein">${D.tm(D.vonText(a.start))}–${D.tm(D.vonText(a.ende))}${a.lehrkraft ? " · " + H.esc(a.lehrkraft) : ""}</span></span><span class="r zahl klein">${H.std(anteil)} Std. diese Woche</span></li>`).join("")}</ul>`;
    },
    /* Auftragskarte für Lernende */
    auftragskarte(a, k, bezug) {
      const s = D.vonText(a.start), e = D.vonText(a.ende), rest = e - bezug, zukunft = s > bezug;
      const frist = zukunft ? `startet ${s - bezug === 1 ? "morgen" : D.wochentagKurz(s) + ", " + D.tm(s)}`
        : rest < 0 ? `Abgabe war am ${D.tm(e)}` : rest === 0 ? "Abgabe heute" : rest === 1 ? "Abgabe morgen" : `Abgabe ${D.wochentagKurz(e)}, ${D.tm(e)} · noch ${rest} Tage`;
      const pz = zukunft ? 0 : Math.min(100, Math.max(0, (bezug - s + 1) / (e - s + 1) * 100));
      return `<article class="auftrag"><div class="oben">${F.chip(a.fach, k)} ${F.soz(a.sozialform)}${a.sozialform ? H.esc(C.sozialformen[a.sozialform]) : ""}</div>
        <h3>${H.esc(a.titel)}</h3><span class="frist${!zukunft && rest <= 2 && rest >= 0 ? " bald" : ""}">${frist}</span>
        ${zukunft ? "" : `<div class="fortschritt" aria-hidden="true"><i style="width:${pz}%"></i></div>`}
        <span class="leise klein">ca. ${H.std(Number(a.umfang))} COOL-Stunden insgesamt${a.notiz ? " · " + H.esc(a.notiz) : ""}</span></article>`;
    },
    /* Zeitstrahl. filter(a) wählt Aufträge, klasse bestimmt die Belastungszeile. */
    zeitstrahl({ abMo, wochen, klasse = null, filter = () => true, bearbeitbar = false, beschriftung = null }) {
      const A = BG.Daten.auftraege, r0 = abMo, tage = wochen * 7, r1 = r0 + tage - 1, heute = D.heute(), heuteMo = D.schulwoche();
      const spw = window.matchMedia("(max-width: 640px)").matches ? 70 : 84;
      const pos = n => (n - r0) / tage * 100;
      let fer = "", n = r0;
      while (n <= r1) {
        if (R.istFerien(n) && D.wochentag(n) >= 1 && D.wochentag(n) <= 5) {
          const a = n; while (n <= r1 && (R.istFerien(n) || D.wochentag(n) === 0 || D.wochentag(n) === 6)) n++;
          let b = n - 1; while (b > a && !R.istFerien(b)) b--;
          fer += `<div class="zs-ferien" style="left:${pos(a)}%;width:${(b - a + 1) / tage * 100}%" title="${H.esc(R.ferienName(a))}"></div>`;
        } else n++;
      }
      const heuteLinie = heute >= r0 && heute <= r1 ? `<div class="zs-heute" style="left:${pos(heute) + 50 / tage}%"></div>` : "";
      const spalten = `<div class="zs-spalten">${"<div></div>".repeat(wochen)}</div>`;
      const W = Array.from({ length: wochen }, (_, i) => r0 + i * 7);
      let h = `<div class="zs" style="--innen:${wochen * spw}px"><div class="zs-raster">
        <div class="zs-lab"><span class="eyebrow">Woche</span></div><div class="zs-spur"><div class="zs-wochen">${W.map(mo => `<div class="${mo === heuteMo ? "jetzt" : ""}"><b>KW ${D.kw(mo)}</b><br>${D.tm(mo)}</div>`).join("")}</div></div>`;
      if (klasse) {
        const st = W.map(mo => R.woche(klasse, mo, A));
        const oben = Math.max(R.einstellungen().max * 1.5, ...st.map(s => s.stunden)) || 1;
        h += `<div class="zs-lab" style="flex-direction:column;align-items:flex-start;gap:0"><strong>Belastung</strong><span class="leise klein">Std. pro Woche</span></div><div class="zs-spur last">${spalten}${fer}`;
        st.forEach((s, i) => {
          const k = R.korridor(s.schultage);
          const band = s.schultage ? `<div class="band" style="bottom:${k.min / oben * 60}px;height:${Math.max(2, (k.max - k.min) / oben * 60)}px"></div>` : "";
          const bal = s.stunden > .05 ? `<div class="lbalken ${s.status}" style="height:${s.stunden / oben * 60}px"><span>${H.std(s.stunden)}</span></div>` : "";
          h += `<div class="lspalte" style="left:${i / wochen * 100}%;width:${100 / wochen}%">${band}${bal}</div>`;
        });
        h += `</div>`;
      }
      const zeilen = A.filter(a => (!klasse || a.klassen.includes(klasse)) && filter(a) && D.vonText(a.ende) >= r0 && D.vonText(a.start) <= r1)
        .sort((x, y) => D.vonText(x.start) - D.vonText(y.start) || D.vonText(x.ende) - D.vonText(y.ende));
      if (!zeilen.length) h += `<div class="zs-lab"></div><div class="zs-spur"><p class="leise" style="padding:9px 12px">Keine Aufträge in diesem Zeitraum.</p></div>`;
      for (const a of zeilen) {
        const s = D.vonText(a.start), e = D.vonText(a.ende), von = Math.max(s, r0), bis = Math.min(e, r1), i = R.info(a);
        const k1 = klasse || (a.klassen.length === 1 ? a.klassen[0] : null);
        const tipp = `${F.kurz(a.fach, k1)}: ${a.titel} · ${D.tmj(s)}–${D.tmj(e)} · ${H.std(Number(a.umfang))} Std. gesamt, ca. ${H.std(i.proTag * 5)} Std. pro Woche${a.lehrkraft ? " · " + a.lehrkraft : ""}`;
        const lab = beschriftung ? beschriftung(a) : H.esc(a.titel);
        h += `<div class="zs-lab">${F.chip(a.fach, k1)}<span class="nm" title="${H.esc(a.titel)}">${lab}</span></div>
          <div class="zs-spur">${spalten}${fer}${heuteLinie}<button type="button" class="balken${s < r0 ? " abL" : ""}${e > r1 ? " abR" : ""}${bearbeitbar ? " bearbeitbar" : ""}" style="left:${pos(von)}%;width:${(bis - von + 1) / tage * 100}%;background:var(${F.farbe(a.fach)})" ${bearbeitbar ? `data-bearbeiten="${H.esc(a.id)}"` : "tabindex=\"-1\""} title="${H.esc(tipp)}" aria-label="${H.esc(tipp)}">${F.soz(a.sozialform)}${H.esc(a.titel)} · ${H.std(Number(a.umfang))} Std.</button></div>`;
      }
      return h + `</div></div>`;
    }
  };

  /* ---------- Ansicht: Start (Dashboard) ----------
     Aufbau: Phase wählen → Hinweise → (ab Stichtag) COOLflex-Woche → Kacheln für diese Phase.
     Gespeichert wird "E" (Einführungsphase), "Q" (Qualifikationsphase) oder – für COOLflex – eine Klasse wie "11A".
     Frühere Werte "11", "12", "13" werden umgerechnet. */
  const PHASEN = [{ id: "E", name: "Einführungsphase" }, { id: "Q", name: "Qualifikationsphase" }];
  const phasenName = id => (PHASEN.find(p => p.id === id) || {}).name || "";
  function phaseVon(k) {
    k = String(k || "");
    if (k === "E" || /^11/.test(k)) return "E";
    if (k === "Q" || k === "12" || k === "13") return "Q";
    return null;
  }
  /* Für welche Phasen gilt ein Eintrag? "phasen": ["E"] / ["Q"] / fehlt = beide */
  const phasenVon = x => Array.isArray(x.phasen) && x.phasen.length ? x.phasen : ["E", "Q"];
  function heuteSichtbar(x) {
    const heute = D.heute();
    return (!x.sichtbar_bis || D.vonText(x.sichtbar_bis) >= heute) && (!x.sichtbar_ab || D.vonText(x.sichtbar_ab) <= heute);
  }
  const fuerLernende = x => (x.zielgruppe || "lernende") !== "lehrkraefte";

  function phasenwahl(ph) {
    return `<div class="klassenwahl" role="group" aria-label="Phase">${PHASEN.map(p => `<button type="button" data-phase="${p.id}" aria-pressed="${p.id === ph}">${p.name}</button>`).join("")}</div>`;
  }

  function start() {
    const P = BG.Daten.portal || {}, k = Z.klasse, ph = phaseVon(k), cool = BG.coolflexAktiv();
    const fuerPhase = x => !ph || phasenVon(x).includes(ph);
    let h = `<div class="seitenkopf"><div><h1>${H.esc(P.titel || "Berufliches Gymnasium")}</h1>${P.untertitel ? `<p class="leise">${H.esc(P.untertitel)}</p>` : ""}</div>${phasenwahl(ph)}</div>`;
    for (const hw of (P.hinweise || []).filter(x => heuteSichtbar(x) && fuerPhase(x))) {
      h += `<div class="banner gelb"><span>${H.esc(hw.text)}</span>${hw.url ? `<a href="${H.esc(hw.url)}" target="_blank" rel="noopener">Lesen →</a>` : ""}</div>`;
    }
    if (!ph) {
      h += `<div class="karte"><h2>Willkommen</h2><p>Oben Einführungsphase oder Qualifikationsphase wählen – dann zeigt die Startseite, was dafür gerade wichtig ist. Die Auswahl bleibt auf diesem Gerät gespeichert.</p></div>`;
    }
    if (cool && ph === "E") h += vorschauLeer() + coolflexKarte(k);
    const gruppen = (P.gruppen || []).map(g => ({ ...g, kacheln: (P.kacheln || []).filter(x => x.gruppe === g.id && heuteSichtbar(x) && fuerLernende(x) && fuerPhase(x)) })).filter(g => g.kacheln.length);
    if (gruppen.length) {
      h += `<h2 style="margin-bottom:-6px">${ph ? "Für die " + phasenName(ph) : "Alle Seiten"}</h2>`;
      h += `<div class="raster-2">${gruppen.map(g => `<section class="gruppe"><span class="eyebrow">${H.esc(g.titel)}</span><div class="kacheln" style="grid-template-columns:1fr">${g.kacheln.map(x => kachel(x)).join("")}</div></section>`).join("")}</div>`;
    }
    h += `<footer class="fusszeile">${(P.fusszeile || []).map(f => `<a href="${H.esc(f.url)}" target="_blank" rel="noopener">${H.esc(f.titel)} ↗</a>`).join("")}
      ${cool ? `<a class="rechts" href="#coolflex"><svg width="14" height="14" style="vertical-align:-2px"><use href="#i-schloss"/></svg> Bereich Lehrkräfte</a>` : ""}</footer>`;
    return h;
  }

  /* COOLflex-Woche auf der Startseite (nur Einführungsphase, nur ab Stichtag) */
  function coolflexKarte(k) {
    if (!istCoolKlasse(k)) {
      return `<section class="karte"><div class="karte-kopf"><h2>COOLflex · Einführungsphase</h2></div>
        <p>Für die COOL-Aufträge der Woche die eigene Klasse wählen:</p>${B.klassenwahl("", "data-klasse-setzen")}</section>`;
    }
    const heute = D.heute(), mo = D.schulwoche(), st = R.woche(k, mo, BG.Daten.auftraege);
    const A = BG.Daten.auftraege.filter(a => a.klassen.includes(k));
    const laufend = A.filter(a => D.vonText(a.start) <= heute && D.vonText(a.ende) >= heute).sort((x, y) => D.vonText(x.ende) - D.vonText(y.ende));
    const bald = A.filter(a => D.vonText(a.start) > heute && D.vonText(a.start) <= heute + 7).sort((x, y) => D.vonText(x.start) - D.vonText(y.start));
    const zeigen = laufend.concat(bald).slice(0, 4);
    return `<section class="karte"><div class="karte-kopf"><h2>COOLflex · ${k} · ${mo === D.montag(heute) ? "diese Woche" : "kommende Woche"}</h2>
      <span class="pille st-${st.status}">${st.anzahl ? "ca. " + H.std(st.stunden) + " Std. · " : ""}${R.statusText[st.status]}</span></div>
      ${B.klassenwahl(k, "data-klasse-setzen")}
      ${zeigen.length ? `<div class="karten">${zeigen.map(a => B.auftragskarte(a, k, heute)).join("")}</div>` : `<p class="leerzustand">Gerade läuft kein COOL-Auftrag.</p>`}
      <a href="#klasse" class="knopf" style="align-self:flex-start">Alle Aufträge und Zeitstrahl →</a></section>`;
  }

  /* ---------- Ansicht: Alle Seiten (unabhängig von der Phase) ---------- */
  function alle() {
    const P = BG.Daten.portal || {};
    const gruppen = (P.gruppen || []).map(g => ({ ...g, kacheln: (P.kacheln || []).filter(x => x.gruppe === g.id && heuteSichtbar(x) && fuerLernende(x)) })).filter(g => g.kacheln.length);
    const schule = (P.fusszeile || []).map(f => ({ titel: f.titel, text: f.text || "", url: f.url, icon: "link" }));
    let h = `<div class="seitenkopf"><div><h1>Alle Seiten</h1><p class="leise">Alle Informationen für die Oberstufe – Einführungsphase und Qualifikationsphase.</p></div></div>`;
    h += `<div class="raster-2">${gruppen.map(g => `<section class="gruppe"><span class="eyebrow">${H.esc(g.titel)}</span><div class="kacheln" style="grid-template-columns:1fr">${g.kacheln.map(x => kachel(x, true)).join("")}</div></section>`).join("")}`;
    if (schule.length) h += `<section class="gruppe"><span class="eyebrow">Schule</span><div class="kacheln" style="grid-template-columns:1fr">${schule.map(x => kachel(x)).join("")}</div></section>`;
    return h + `</div>`;
  }

  function phasenText(x) {
    const p = phasenVon(x);
    return p.length === 1 ? " · " + phasenName(p[0]) : "";
  }
  function kachel(x, mitPhase = false) {
    const zusatz = mitPhase ? phasenText(x) : "";
    const innen = `<span class="symbol"><svg><use href="#i-${H.esc(x.icon || "karte")}"/></svg></span><span class="t"><b>${H.esc(x.titel)}${x.neu ? `<span class="marke-neu">neu</span>` : ""}</b><span>${x.url ? H.esc(x.text || "") : "folgt in Kürze"}${H.esc(zusatz)}</span></span>`;
    return x.url ? `<a class="kachel" href="${H.esc(x.url)}" target="_blank" rel="noopener">${innen}</a>` : `<div class="kachel folgt">${innen}</div>`;
  }

  /* Vorschau ohne Server: Jedes Gerät hat eigene Daten. Ist es leer, Beispiele direkt anbieten. */
  function vorschauLeer() {
    if (BG.Daten.modus !== "vorschau" || BG.Daten.auftraege.length) return "";
    return `<div class="banner"><span>Auf diesem Gerät sind noch keine Aufträge gespeichert (Vorschau ohne Server – jedes Gerät hat eigene Daten).</span><button type="button" class="knopf" data-aktion="beispiele">Beispiele laden</button></div>`;
  }

  /* ---------- Ansicht: Meine Klasse ---------- */
  function klasse() {
    let k = Z.klasse;
    if (!istCoolKlasse(k)) {
      return `<div class="seitenkopf"><div><span class="eyebrow">COOLflex</span><h1>Meine Klasse</h1></div></div>
        <div class="karte"><p>Die COOL-Aufträge gibt es für die Einführungsphase. Welche Klasse soll angezeigt werden?</p>${B.klassenwahl("", "data-klasse-setzen")}</div>`;
    }
    const mo = Z.woche, heute = D.heute(), bezug = mo === D.schulwoche() ? Math.max(heute, mo) : mo;
    const A = BG.Daten.auftraege.filter(a => a.klassen.includes(k));
    const st = R.woche(k, mo, BG.Daten.auftraege);
    const laufend = A.filter(a => D.vonText(a.start) <= mo + 4 && D.vonText(a.ende) >= Math.max(bezug, mo)).sort((x, y) => D.vonText(x.ende) - D.vonText(y.ende));
    const bald = A.filter(a => D.vonText(a.start) > mo + 4 && D.vonText(a.start) <= mo + 25).sort((x, y) => D.vonText(x.start) - D.vonText(y.start));
    return `<div class="seitenkopf"><div><span class="eyebrow">COOLflex</span><h1>Klasse ${k}</h1></div>${B.klassenwahl(k, "data-klasse-setzen")}</div>
      ${vorschauLeer()}
      <section class="karte">
        <div class="karte-kopf">${B.wochenwahl(mo, "klasse")}<span class="pille st-${st.status}">${st.anzahl ? "ca. " + H.std(st.stunden) + " Std. · " : ""}${R.statusText[st.status]}</span></div>
        <p class="leise">Geplant sind im Schnitt ${H.std((R.einstellungen().min + R.einstellungen().max) / 2)} COOL-Stunden pro Woche.</p>
        ${laufend.length ? `<div class="karten">${laufend.map(a => B.auftragskarte(a, k, bezug)).join("")}</div>` : `<p class="leerzustand">In dieser Woche läuft kein Auftrag.</p>`}
        ${bald.length ? `<h3>Danach</h3><div class="karten">${bald.map(a => B.auftragskarte(a, k, bezug)).join("")}</div>` : ""}
      </section>
      <section class="karte"><div class="karte-kopf"><h2>Zeitstrahl</h2><span class="leise klein">grünes Band = Zielbereich</span></div>
        <div class="scroll">${B.zeitstrahl({ abMo: mo - 7, wochen: 10, klasse: k })}</div></section>`;
  }

  BG.B = B;
  BG.ansichten = { start, klasse, alle };
})();
